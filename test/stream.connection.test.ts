import 'mocha';
import { expect } from 'chai';
import { once } from 'events';
import * as http from 'http';
import { ETwitterStreamEvent } from '../src';
import { FakeX } from './fake-x';

describe('Stream connection (offline: a fake X answers)', () => {
  let x: FakeX;
  /** Responses of the stream connections, to send tweets or close them */
  let connections: http.ServerResponse[];

  const tweet = (id: string) => JSON.stringify({ data: { id, text: `Tweet ${id}` }, matching_rules: [{ id: '1', tag: 'cats' }] }) + '\r\n';

  before(async () => {
    x = await FakeX.start();
  });

  after(() => x.close());

  beforeEach(() => {
    x.reset();
    connections = [];
    x.on('GET', '/2/tweets/search/stream', res => {
      res.writeHead(200, { 'content-type': 'application/json' });
      // Keep-alive signal
      res.write('\r\n');
      connections.push(res);
    });
  });

  it('Should emit the tweets, then disconnect when closed', async () => {
    const stream = await x.client('bearer-token').v2.searchStream({ 'tweet.fields': ['created_at'] });
    const ids: string[] = [];
    stream.on(ETwitterStreamEvent.Data, ({ data }) => ids.push(data.id));

    for (const id of ['1', '2']) {
      connections[0].write(tweet(id));
      await once(stream, ETwitterStreamEvent.Data);
    }

    const closed = once(stream, ETwitterStreamEvent.ConnectionClosed);
    stream.close();
    await closed;
    await once(connections[0], 'close');

    expect(ids).to.deep.equal(['1', '2']);
    expect(x.requests.map(({ url }) => url.href)).to.deep.equal(['https://api.x.com/2/tweets/search/stream?tweet.fields=created_at']);
  });

  it('Should emit a close event when X ends the stream', async () => {
    const stream = await x.client('bearer-token').v2.searchStream();

    connections[0].end();
    await once(stream, ETwitterStreamEvent.ConnectionClosed);

    expect(x.requests).to.have.length(1);
  });

  it('Should reconnect and keep emitting tweets when X ends the stream, with autoReconnect', async () => {
    const stream = x.client('bearer-token').v2.searchStream({ autoConnect: false });
    await stream.connect({ autoReconnect: true });
    const ids: string[] = [];
    stream.on(ETwitterStreamEvent.Data, ({ data }) => ids.push(data.id));

    connections[0].write(tweet('1'));
    await once(stream, ETwitterStreamEvent.Data);

    connections[0].end();
    await once(stream, ETwitterStreamEvent.Reconnected);

    connections[1].write(tweet('2'));
    await once(stream, ETwitterStreamEvent.Data);
    stream.close();

    expect(ids).to.deep.equal(['1', '2']);
    expect(x.requests).to.have.length(2);
  });

  it('Should not reconnect when closed while a reconnection is pending', async () => {
    const stream = x.client('bearer-token').v2.searchStream({ autoConnect: false });
    await stream.connect({ autoReconnect: true });
    // X is slow to answer the reconnection
    const reconnection = new Promise<http.ServerResponse>(resolve => x.on('GET', '/2/tweets/search/stream', resolve));

    connections[0].end();
    const res = await reconnection;
    stream.close();

    const reconnected = once(stream, ETwitterStreamEvent.Reconnected).then(() => 'reconnected');
    const dropped = once(res, 'close').then(() => 'dropped');
    res.writeHead(200, { 'content-type': 'application/json' });
    res.write(tweet('1'));

    expect(await Promise.race([reconnected, dropped])).to.equal('dropped');
    expect(x.requests).to.have.length(2);
  });

  it('Should not retry when closed while a failing reconnection is pending', async () => {
    const stream = x.client('bearer-token').v2.searchStream({ autoConnect: false });
    await stream.connect({ autoReconnect: true, nextRetryTimeout: () => 10 });
    const reconnection = new Promise<http.ServerResponse>(resolve => x.on('GET', '/2/tweets/search/stream', resolve));
    const reconnectErrors: number[] = [];
    stream.on(ETwitterStreamEvent.ReconnectError, tries => reconnectErrors.push(tries));

    connections[0].end();
    const res = await reconnection;
    stream.close();
    res.writeHead(503, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ title: 'Service Unavailable', detail: 'Service Unavailable', type: 'about:blank', status: 503 }));

    // Long enough for a retry to reach X
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(x.requests).to.have.length(2);
    expect(reconnectErrors).to.deep.equal([]);
  });

  it('Should yield queued tweets right away in a for await loop, and go on after a reconnection with autoReconnect', async () => {
    const stream = x.client('bearer-token').v2.searchStream({ autoConnect: false });
    await stream.connect({ autoReconnect: true });
    const ids: string[] = [];

    connections[0].write(tweet('1'));
    for await (const { data } of stream) {
      ids.push(data.id);

      if (data.id === '1') {
        // Tweet 2 arrives while the loop is busy: it must not wait for another tweet
        connections[0].write(tweet('2'));
        await once(stream, ETwitterStreamEvent.Data);
      } else if (data.id === '2') {
        connections[0].end();
        await once(stream, ETwitterStreamEvent.Reconnected);
        connections[1].write(tweet('3'));
      } else {
        stream.close();
      }
    }

    expect(ids).to.deep.equal(['1', '2', '3']);
    expect(x.requests).to.have.length(2);
  });

  it('Should yield queued tweets before throwing the connection error in a for await loop, without autoReconnect', async () => {
    const stream = await x.client('bearer-token').v2.searchStream();
    const ids: string[] = [];
    let error: Error | undefined;

    connections[0].write(tweet('1'));
    try {
      for await (const { data } of stream) {
        ids.push(data.id);

        if (data.id === '1') {
          // Tweet 2 arrives, then X ends the stream, while the loop is busy
          connections[0].end(tweet('2'));
          await once(stream, ETwitterStreamEvent.ConnectionClosed);
        }
      }
    } catch (e) {
      error = e as Error;
    }

    expect(ids).to.deep.equal(['1', '2']);
    expect(error?.message).to.equal('Connection closed by Twitter.');
  });

  it('Should end a for await loop when the stream is closed or destroyed', async () => {
    const closedStream = await x.client('bearer-token').v2.searchStream();
    closedStream.close();
    for await (const _tweet of closedStream) {
      expect.fail('A closed stream has no tweets');
    }

    const destroyedStream = await x.client('bearer-token').v2.searchStream();
    const loop = (async () => {
      for await (const _tweet of destroyedStream) {
        expect.fail('No tweet was sent');
      }
    })();
    destroyedStream.destroy();
    await loop;
  });
});
