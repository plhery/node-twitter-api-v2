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
});
