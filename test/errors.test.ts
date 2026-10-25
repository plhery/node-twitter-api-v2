import 'mocha';
import { expect } from 'chai';
import { ApiResponseError, EApiV1ErrorCode, EApiV2ErrorCode, TwitterApi } from '../src';
import { FakeX, FakeXReply } from './fake-x';

describe('Error responses of X (offline: a fake X answers)', () => {
  let x: FakeX;

  before(async () => {
    x = await FakeX.start();
  });

  after(() => x.close());

  beforeEach(() => x.reset());

  async function errorOf(reply: FakeXReply) {
    x.on('GET', '/2/tweets', reply);
    const error = await x.client().v2.tweets(['20', '21']).then(() => null, (e: Error) => e);

    expect(error).to.be.instanceOf(ApiResponseError);
    return error as ApiResponseError;
  }

  it('Should reject with the status, body and headers of the response', async () => {
    const body = { title: 'Forbidden', type: 'about:blank', status: 403, detail: 'You are not permitted to perform this action.' };
    const error = await errorOf({ status: 403, body });

    expect(error).to.deep.include({ code: 403, data: body, isAuthError: false, rateLimitError: false });
    expect(error.headers['content-type']).to.equal('application/json; charset=utf-8');
    expect(error.message).to.equal('Request failed with code 403 - Forbidden: You are not permitted to perform this action.');
  });

  it('Should explain and match v2 problem types, whatever the host X gives them on', async () => {
    const forbidden = await errorOf({
      status: 403,
      body: { title: 'Client Forbidden', detail: 'This request must be made using an approved developer account that is enrolled in the requested endpoint.', reason: 'client-not-enrolled', type: 'https://api.twitter.com/2/problems/client-forbidden' },
    });
    expect(forbidden.message).to.equal('Request failed with code 403 - Client Forbidden: This request must be made using an approved developer account that is enrolled in the requested endpoint. (see https://api.twitter.com/2/problems/client-forbidden)');
    expect(forbidden.hasErrorCode(EApiV2ErrorCode.ClientForbidden)).to.equal(true);
    expect(forbidden.hasErrorCode(EApiV2ErrorCode.InvalidRequest, EApiV2ErrorCode.ResourceNotFound)).to.equal(false);
    expect(forbidden.hasErrorCode(EApiV1ErrorCode.AuthenticationFail)).to.equal(false);

    // A type given only in the errors array
    const disconnected = await errorOf({
      status: 400,
      body: { errors: [{ title: 'operational-disconnect', detail: 'This stream has been disconnected upstream for operational reasons.', type: 'https://api.x.com/2/problems/operational-disconnect' }] },
    });
    expect(disconnected.hasErrorCode(EApiV2ErrorCode.TwitterDisconnectedYou)).to.equal(true);
  });

  it('Should flag authentication errors', async () => {
    const error = await errorOf({ status: 401, body: { title: 'Unauthorized', type: 'about:blank', status: 401, detail: 'Unauthorized' } });

    expect(error.isAuthError).to.equal(true);
    expect(error.message).to.equal('Request failed with code 401 - Unauthorized');
  });

  it('Should flag rate limit errors, with the limit and its reset time', async () => {
    const error = await errorOf({
      status: 429,
      headers: { 'x-rate-limit-limit': '300', 'x-rate-limit-remaining': '0', 'x-rate-limit-reset': '1800000000' },
      body: { title: 'Too Many Requests', type: 'about:blank', status: 429, detail: 'Too Many Requests' },
    });

    expect(error.rateLimitError).to.equal(true);
    expect(error.rateLimit).to.deep.equal({ limit: 300, remaining: 0, reset: 1800000000 });
  });

  it('Should list v1.1 errors and match their codes', async () => {
    const error = await errorOf({ status: 403, body: { errors: [{ code: 187, message: 'Status is a duplicate.' }] } });

    expect(error.errors).to.deep.equal([{ code: 187, message: 'Status is a duplicate.' }]);
    expect(error.hasErrorCode(EApiV1ErrorCode.DuplicatedTweet)).to.equal(true);
    expect(error.message).to.include('Status is a duplicate. (Twitter code 187)');
  });

  it('Should list v2 errors and explain them in the message', async () => {
    const errors = [{ parameters: { ids: ['x'] }, message: 'The `ids` query parameter value [x] is not valid' }];
    const error = await errorOf({
      status: 400,
      body: { errors, title: 'Invalid Request', detail: 'One or more parameters to your request was invalid.', type: 'https://api.x.com/2/problems/invalid-request' },
    });

    expect(error.errors).to.deep.equal(errors);
    expect(error.message).to.include('Invalid Request: One or more parameters to your request was invalid.');
    expect(error.hasErrorCode(EApiV2ErrorCode.InvalidRequest)).to.equal(true);
    expect(error.hasErrorCode('https://api.twitter.com/2/problems/invalid-request')).to.equal(true);
  });

  it('Should keep a body that is not JSON', async () => {
    const error = await errorOf({ status: 503, headers: { 'content-type': 'text/html' }, body: '<html>Over capacity</html>' });

    expect(error).to.deep.include({ code: 503, data: '<html>Over capacity</html>' });
    expect(TwitterApi.getErrors(error)).to.deep.equal([]);
  });

  it('Should give no errors for an empty body', async () => {
    const error = await errorOf({ status: 503, headers: { 'content-type': 'application/problem+json' }, body: '' });

    expect(error).to.deep.include({ code: 503, data: undefined, message: 'Request failed with code 503' });
    expect(TwitterApi.getErrors(error)).to.deep.equal([]);
    expect(TwitterApi.getErrors(null)).to.deep.equal([]);
  });

  it('Should resolve with the errors of a partly successful response', async () => {
    const body = {
      data: [{ id: '20', text: 'hello' }],
      errors: [{ resource_id: '21', title: 'Not Found Error', type: 'https://api.x.com/2/problems/resource-not-found', detail: 'Could not find tweet with ids: [21].' }],
    };
    x.on('GET', '/2/tweets', { body });

    expect(await x.client().v2.tweets(['20', '21'])).to.deep.equal(body);
  });
});
