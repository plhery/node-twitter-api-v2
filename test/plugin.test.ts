import 'mocha';
import { expect } from 'chai';
import type {
  ITwitterApiClientPlugin,
  TwitterResponse,
  ITwitterApiBeforeRequestConfigHookArgs,
  ITwitterApiAfterRequestHookArgs,
  ITwitterApiAfterOAuth1RequestTokenHookArgs,
} from '../src';
import { TwitterApi } from '../src';
import { FakeX } from './fake-x';

const consumerKeys = { appKey: FakeX.userKeys.appKey, appSecret: FakeX.userKeys.appSecret };

class SimpleCacheTestPlugin implements ITwitterApiClientPlugin {
  protected cache: { [urlHash: string]: TwitterResponse<any> } = {};

  onBeforeRequestConfig(args: ITwitterApiBeforeRequestConfigHookArgs) {
    const hash = this.getHashFromRequest(args);
    return this.cache[hash];
  }

  onAfterRequest(args: ITwitterApiAfterRequestHookArgs) {
    const hash = this.getHashFromRequest(args);
    this.cache[hash] = args.response;
  }

  protected getHashFromRequest({ url, params }: ITwitterApiBeforeRequestConfigHookArgs) {
    const strQuery = JSON.stringify(params.query ?? {});
    const strParams = JSON.stringify(params.params ?? {});

    return params.method.toUpperCase() + ' ' + url.toString() + '|' + strQuery + '|' + strParams;
  }
}

class SimpleOAuthStepHelperPlugin implements ITwitterApiClientPlugin {
  protected cache: { [oauthToken: string]: string } = {};

  onOAuth1RequestToken(args: ITwitterApiAfterOAuth1RequestTokenHookArgs) {
    this.cache[args.oauthResult.oauth_token] = args.oauthResult.oauth_token_secret;
  }

  login(oauthToken: string, oauthVerifier: string) {
    if (!oauthVerifier || !this.isOAuthTokenValid(oauthToken)) {
      throw new Error('Invalid or expired token.');
    }

    const client = new TwitterApi({
      ...consumerKeys,
      accessToken: oauthToken,
      accessSecret: this.cache[oauthToken],
    });

    return client.login(oauthVerifier);
  }

  isOAuthTokenValid(oauthToken: string) {
    return !!this.cache[oauthToken];
  }
}

describe('Plugin API (offline: a fake X answers)', () => {
  let x: FakeX;

  before(async () => {
    x = await FakeX.start();
  });

  after(() => x.close());

  beforeEach(() => x.reset());

  it('Cache a single request with a plugin', async () => {
    const client = x.client(FakeX.userKeys, { plugins: [new SimpleCacheTestPlugin()] });

    const user = await client.v1.verifyCredentials();
    const anotherRequest = await client.v1.verifyCredentials();

    expect(user).to.equal(anotherRequest);
    expect(x.requests).to.have.length(1);
  });

  it('Remember OAuth token secret between step 1 and 2 of authentication', async () => {
    x.on('POST', '/oauth/request_token', { body: 'oauth_token=request-token&oauth_token_secret=request-secret&oauth_callback_confirmed=true' });
    const client = x.client(consumerKeys, { plugins: [new SimpleOAuthStepHelperPlugin()] });

    const { oauth_token } = await client.generateAuthLink('oob');

    // Is oauth token registered in cache?
    const loginPlugin = client.getPluginOfType(SimpleOAuthStepHelperPlugin)!;
    expect(loginPlugin.isOAuthTokenValid(oauth_token)).to.equal(true);

    // Must login through
    // const { client: loggedClient, accessToken, accessSecret } = await loginPlugin.login(oauth_token, 'xxxxxxxx');
    // - Save accessToken, accessSecret to persistent storage
  });
});
