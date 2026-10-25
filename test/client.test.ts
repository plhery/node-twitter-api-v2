import 'mocha';
import { expect } from 'chai';
import { ApiResponseError, TwitterApiv2 } from '../src';
import { FakeX } from './fake-x';

const me = { id: '12', name: 'Jack', username: 'jack' };

describe('Client (offline: a fake X answers)', () => {
  let x: FakeX;

  before(async () => {
    x = await FakeX.start();
  });

  after(() => x.close());

  beforeEach(() => x.reset());

  describe('Current user cache', () => {
    it('Should cache the current user, with one request for two calls', async () => {
      x.on('GET', '/2/users/me', { body: { data: me } });
      const client = x.client();

      expect(await client.currentUserV2()).to.deep.equal({ data: me });
      expect(await client.currentUserV2()).to.deep.equal({ data: me });
      expect(x.requests).to.have.length(1);
    });

    it('Should not cache a failure, so that the next call retries', async () => {
      x.on('GET', '/2/users/me', { status: 503, body: { title: 'Service Unavailable', type: 'about:blank', status: 503, detail: 'Service Unavailable' } });
      const client = x.client();

      const error = await client.v2.bookmark('20').then(() => null, (e: Error) => e);
      expect(error).to.be.instanceOf(ApiResponseError);
      expect((error as ApiResponseError).code).to.equal(503);

      x.on('GET', '/2/users/me', { body: { data: me } });
      await client.v2.bookmark('20');

      expect(x.requests.map(({ method, url }) => `${method} ${url.pathname}`)).to.deep.equal([
        'GET /2/users/me',
        'GET /2/users/me',
        'POST /2/users/12/bookmarks',
      ]);
    });
  });

  it('cloneWithPrefix() should send the requests of the clone to the new prefix', async () => {
    x.on('GET', '/2/users/me', { body: { data: me } });
    const client = x.client();

    const clone = client.v2.cloneWithPrefix('https://api.twitter.com/2/');
    expect(clone).to.be.instanceOf(TwitterApiv2);

    await clone.me();
    await client.v2.me();

    expect(x.requests.map(({ url }) => url.href)).to.deep.equal([
      'https://api.twitter.com/2/users/me',
      'https://api.x.com/2/users/me',
    ]);
  });
});
