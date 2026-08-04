import 'mocha';
import { expect } from 'chai';
import { TwitterApi } from '../src';
import { OAuth1Helper } from '../src/client-mixins/oauth1.helper';

describe('OAuth helpers', () => {
  let originalMathRandom: typeof Math.random;

  beforeEach(() => {
    originalMathRandom = Math.random;
    Math.random = () => {
      throw new Error('Math.random() must not be used for OAuth values');
    };
  });

  afterEach(() => {
    Math.random = originalMathRandom;
  });

  it('generates the OAuth 1.0a nonce with a cryptographically secure source', () => {
    const helper = new OAuth1Helper({
      consumerKeys: {
        key: 'consumer-key',
        secret: 'consumer-secret',
      },
    });

    const authInfo = helper.authorize({
      method: 'GET',
      url: 'https://api.x.com/2/users/me',
    });

    expect(authInfo.oauth_nonce).to.have.length(32);
    expect(authInfo.oauth_nonce).to.match(/^[A-Za-z0-9_-]+$/);
  });

  it('generates OAuth 2.0 state and PKCE values with a cryptographically secure source', () => {
    const client = new TwitterApi({ clientId: 'client-id' });
    const result = client.generateOAuth2AuthLink('https://example.com/callback');

    expect(result.state).to.have.length(32);
    expect(result.codeVerifier).to.have.length(128);
    expect(result.state).to.match(/^[A-Za-z0-9_-]+$/);
    expect(result.codeVerifier).to.match(/^[A-Za-z0-9_-]+$/);
    expect(result.codeChallenge).to.match(/^[A-Za-z0-9_-]{43}$/);
  });
});
