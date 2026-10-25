import 'mocha';
import { expect } from 'chai';
import * as http from 'http';
import * as net from 'net';
import { ApiPartialResponseError, ApiRequestError } from '../src';
import RequestHandlerHelper from '../src/client-mixins/request-handler.helper';

describe('Request handler with a local keep-alive server (offline: no network or credentials needed)', () => {
  let mode: 'ok' | 'drop' | 'cut' | 'hang' = 'ok';
  let connections = 0;

  const server = http.createServer((req, res) => {
    if (mode === 'ok') {
      res.setHeader('content-type', 'application/json');
      res.end('{"data":{"id":"1"}}');
    } else if (mode === 'drop') {
      req.socket.destroy();
    } else if (mode === 'cut') {
      res.setHeader('content-type', 'application/json');
      res.write('{"data":');
      setTimeout(() => req.socket.destroy(), 10);
    }
    // 'hang': never answer
  }).on('connection', () => connections++);

  // Plain HTTP spares the test a TLS certificate: https.request accepts it through an http.Agent
  const agent = new http.Agent({ keepAlive: true, maxSockets: 1 });

  function request(options: { timeout?: number } = {}) {
    const { port } = server.address() as net.AddressInfo;
    const helper = new RequestHandlerHelper<any>({ url: new URL(`http://127.0.0.1:${port}/2/tweets`), options: { agent, ...options }, compression: true });

    return helper.makeRequest();
  }

  before(done => {
    server.listen(0, '127.0.0.1', done);
  });

  after(() => {
    agent.destroy();
    server.closeAllConnections();
    server.close();
  });

  beforeEach(() => {
    mode = 'ok';
    connections = 0;
  });

  it('Should reuse a single socket without piling up listeners on it', async () => {
    const closeListeners: number[] = [];

    for (let i = 0; i < 15; i++) {
      expect(await request()).to.deep.include({ data: { data: { id: '1' } } });

      const [socket] = Object.values(agent.freeSockets).flat();
      closeListeners.push(socket!.listenerCount('close'));
    }

    expect(connections).to.equal(1);
    expect(new Set(closeListeners).size).to.equal(1);
  });

  it('Should reject when the server closes the connection before answering', async () => {
    mode = 'drop';

    const error = await request().then(() => null, (e: Error) => e);
    expect(error).to.be.instanceOf(ApiRequestError);
  });

  it('Should reject when the response is cut midway', async () => {
    mode = 'cut';

    const error = await request().then(() => null, (e: Error) => e);
    expect(error).to.be.instanceOf(ApiPartialResponseError);
  });

  it('Should reject on timeout, then keep working', async () => {
    mode = 'hang';

    const error = await request({ timeout: 100 }).then(() => null, (e: Error) => e);
    expect(error).to.be.instanceOf(ApiRequestError);

    mode = 'ok';
    expect(await request()).to.deep.include({ data: { data: { id: '1' } } });
  });
});
