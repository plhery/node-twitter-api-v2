import 'mocha';
import { expect } from 'chai';
import { getRequestClient } from '../../src/test/utils';

// OAuth 1.0a
const clientWithoutUser = getRequestClient();

describe('Authentication API', () => {
  it('.generateAuthLink - Create a auth link', async () => {
    const tokens = await clientWithoutUser.generateAuthLink('oob');

    expect(tokens.oauth_token).to.be.a('string');
    expect(tokens.oauth_token_secret).to.be.a('string');
    expect(tokens.oauth_callback_confirmed).to.be.equal('true');
    expect(tokens.url).to.be.a('string');
  }).timeout(1000 * 120);
});
