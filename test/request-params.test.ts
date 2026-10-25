import 'mocha';
import { expect } from 'chai';
import { FakeX } from './fake-x';

describe('URL parameters (offline: a fake X answers)', () => {
  let x: FakeX;

  before(async () => {
    x = await FakeX.start();
  });

  after(() => x.close());

  beforeEach(() => x.reset());

  it('Should encode URL parameters, so that an ID cannot change the endpoint', async () => {
    // Resolves: the OAuth signature is checked by the fake X
    await x.client().v2.unlike('12', '../../../tweets/999');

    expect(x.requests.map(({ method, url }) => `${method} ${url.pathname}`)).to.deep.equal(['DELETE /2/users/12/likes/..%2F..%2F..%2Ftweets%2F999']);
  });

  it('Should refuse . and .. as URL parameters', async () => {
    for (const id of ['.', '..']) {
      const error = await x.client().v2.removeListMember('3', id).then(() => null, (e: Error) => e);
      expect(error?.message).to.equal(`Invalid value for URL parameter user_id: ${id}`);
    }

    expect(x.requests).to.have.length(0);
  });
});
