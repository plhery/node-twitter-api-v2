import 'mocha';
import { expect } from 'chai';
import { PassThrough } from 'stream';
import { gzipSync } from 'zlib';
import { ApiPartialResponseError } from '../src';
import RequestHandlerHelper from '../src/client-mixins/request-handler.helper';

describe('Request handler response decompression (offline: no network or credentials needed)', () => {
  const json = { data: { id: '1', text: 'x'.repeat(2000) } };

  /** Hand a fake response to the handler, as `https.request` would on its 'response' event. */
  function handleResponse(contentEncoding: string) {
    const helper = new RequestHandlerHelper<any>({ url: new URL('https://api.x.com/2/tweets'), options: {}, compression: true });
    const res = Object.assign(new PassThrough(), {
      headers: { 'content-type': 'application/json', 'content-encoding': contentEncoding },
      statusCode: 200,
      complete: false,
    });
    const response = new Promise((resolve, reject) => (helper as any).classicResponseHandler(resolve, reject, res));

    return { res, response };
  }

  it('Should decompress a gzip response', async () => {
    const { res, response } = handleResponse('gzip');
    res.complete = true;
    res.end(gzipSync(JSON.stringify(json)));

    expect(await response).to.deep.include({ data: json });
  });

  it('Should reject, not hang, when the body does not match its content-encoding', async () => {
    const { res, response } = handleResponse('gzip');
    res.complete = true;
    res.end(JSON.stringify(json));

    const error = await response.then(() => null, (e: Error) => e);
    expect(error).to.be.instanceOf(ApiPartialResponseError);
    expect(error!.message).to.include('parse error');
  });

  it('Should reject, not hang, when a compressed response is cut midway', async () => {
    const { res, response } = handleResponse('gzip');
    const body = gzipSync(JSON.stringify(json));
    res.write(body.subarray(0, body.length / 2));
    res.destroy();

    const error = await response.then(() => null, (e: Error) => e);
    expect(error).to.be.instanceOf(ApiPartialResponseError);
    expect(error!.message).to.include('connection abruptly closed');
  });
});
