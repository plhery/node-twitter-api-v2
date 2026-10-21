import 'mocha';
import { expect } from 'chai';
import { EventEmitter } from 'events';
import { PassThrough } from 'stream';
import { TweetStream, ETwitterStreamEvent } from '../src';

describe('Tweet stream chunk decoding (offline: no network or credentials needed)', () => {
  /** Build a stream bound to a fake connection; chunks are injected with `res.emit('data', chunk)` to control chunk boundaries exactly. */
  function makeFakeStream() {
    const req = Object.assign(new EventEmitter(), { destroy() { /* noop */ }, aborted: false });
    const res = new PassThrough();
    const stream = new TweetStream(
      { url: new URL('https://api.x.com/2/tweets/sample/stream'), options: {} } as any,
      { req: req as any, res, originalResponse: {} as any },
    );

    const texts: string[] = [];
    const parseErrors: Error[] = [];
    let keepAlives = 0;
    stream.on(ETwitterStreamEvent.Data, (data: any) => texts.push(data.data.text));
    stream.on(ETwitterStreamEvent.TweetParseError, (error: Error) => parseErrors.push(error));
    stream.on(ETwitterStreamEvent.DataKeepAlive, () => keepAlives++);

    return { stream, res, texts, parseErrors, keepAlives: () => keepAlives };
  }

  function makePayload(text: string) {
    return Buffer.from(JSON.stringify({ data: { id: '1', text } }) + '\r\n', 'utf8');
  }

  it('Should keep a 4-byte character (emoji) split across two chunks', () => {
    const { stream, res, texts, parseErrors } = makeFakeStream();
    const text = 'café \u{1F600} ok';
    const payload = makePayload(text);
    // Cut in the middle of the 4-byte emoji
    const cut = payload.indexOf(Buffer.from('\u{1F600}', 'utf8')) + 2;

    res.emit('data', payload.subarray(0, cut));
    res.emit('data', payload.subarray(cut));
    stream.destroy();

    expect(parseErrors).to.have.length(0);
    expect(texts).to.deep.equal([text]);
  });

  it('Should keep a 2-byte character split across two chunks', () => {
    const { stream, res, texts, parseErrors } = makeFakeStream();
    const text = 'café ok';
    const payload = makePayload(text);
    // Cut between the two bytes of "é"
    const cut = payload.indexOf(Buffer.from('é', 'utf8')) + 1;

    res.emit('data', payload.subarray(0, cut));
    res.emit('data', payload.subarray(cut));
    stream.destroy();

    expect(parseErrors).to.have.length(0);
    expect(texts).to.deep.equal([text]);
  });

  it('Should decode a payload received one byte per chunk', () => {
    const { stream, res, texts, parseErrors } = makeFakeStream();
    const text = 'café \u{1F600} 日本語 ok';
    const payload = makePayload(text);

    for (let i = 0; i < payload.length; i++) {
      res.emit('data', payload.subarray(i, i + 1));
    }
    stream.destroy();

    expect(parseErrors).to.have.length(0);
    expect(texts).to.deep.equal([text]);
  });

  it('Should still handle string chunks (response with an encoding already set)', () => {
    const { stream, res, texts, parseErrors } = makeFakeStream();
    const text = 'café \u{1F600} ok';

    res.emit('data', makePayload(text).toString('utf8'));
    stream.destroy();

    expect(parseErrors).to.have.length(0);
    expect(texts).to.deep.equal([text]);
  });

  it('Should still emit a keep alive event for a lone CRLF chunk, without emitting data', () => {
    const { stream, res, texts, parseErrors, keepAlives } = makeFakeStream();

    res.emit('data', Buffer.from('\r\n', 'utf8'));
    stream.destroy();

    expect(parseErrors).to.have.length(0);
    expect(texts).to.have.length(0);
    expect(keepAlives()).to.equal(1);
  });
});
