import 'mocha';
import { expect } from 'chai';
import { TwitterApi } from '../../src';
import { getOAuth2UserClient } from '../../src/test/utils';

let oauth2Client: TwitterApi;

describe('OAuth 2.0 User-Context v2 API Tests', () => {
  before(async () => {
    try {
      oauth2Client = getOAuth2UserClient();
    } catch (error) {
      console.warn('OAuth 2.0 tests skipped: Missing OAUTH2_ACCESS_TOKEN environment variable');
      console.warn('Run setup-oauth2.mjs to set up the OAuth 2.0 flow');
      return;
    }
  });

  it('should get current user with email access', async function () {
    if (!oauth2Client) {
      this.skip();
    }

    const user = await oauth2Client.v2.me({
      'user.fields': [
        'id',
        'username',
        'name',
        'verified',
        'verified_type',
        'created_at',
        'description',
        'public_metrics',
        'profile_image_url',
        'confirmed_email',
      ],
    });

    expect(user.data).to.be.an('object');
    expect(user.data.id).to.be.a('string');
    expect(user.data.username).to.be.a('string');
    expect(user.data.name).to.be.a('string');

    if (user.data.verified !== undefined) {
      expect(user.data.verified).to.be.a('boolean');
    }

    if (user.data.verified_type !== undefined) {
      expect(['blue', 'business', 'government', 'none']).to.include(user.data.verified_type);
    }

    if (user.data.confirmed_email !== undefined) {
      expect(user.data.confirmed_email).to.be.a('string');
    }
  });
});