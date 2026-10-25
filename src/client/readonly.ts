import type TwitterApi from '.';
import TwitterApiBase from '../client.base';
import {
  AccessOAuth2TokenArgs,
  AccessOAuth2TokenResult,
  AccessTokenResult,
  BearerTokenResult, BuildOAuth2RequestLinkArgs, IOAuth2RequestTokenResult, IParsedOAuth2TokenResult, LoginResult,
  RequestTokenArgs,
  RequestTokenResult,
  TOAuth2Scope,
  Tweetv2SearchParams,
} from '../types';
import TwitterApiv1ReadOnly from '../v1/client.v1.read';
import TwitterApiv2ReadOnly from '../v2/client.v2.read';
import { OAuth2Helper } from '../client-mixins/oauth2.helper';
import RequestParamHelpers from '../client-mixins/request-param.helper';
import { TwitterApiV2Settings } from '../settings';

/**
 * Twitter v1.1 and v2 API client.
 */
export default class TwitterApiReadOnly extends TwitterApiBase {
  protected _v1?: TwitterApiv1ReadOnly;
  protected _v2?: TwitterApiv2ReadOnly;

  /* Direct access to subclients */

  /**
   * Client for the v1.1 API. X no longer serves most v1.1 endpoints, so most of its methods are deprecated: prefer `v2`.
   */
  public get v1() {
    if (this._v1) return this._v1;

    return this._v1 = new TwitterApiv1ReadOnly(this);
  }

  public get v2() {
    if (this._v2) return this._v2;

    return this._v2 = new TwitterApiv2ReadOnly(this);
  }

  /**
   * Fetch and cache current user.
   * This method can only be called with a OAuth 1.0a user authentication.
   *
   * You can use this method to test if authentication was successful.
   * Next calls to this methods will use the cached user, unless `forceFetch: true` is given.
   *
   * @deprecated Calls the v1.1 `account/verify_credentials` endpoint, which new X API apps can't use. Use `currentUserV2()` instead.
   */
  public async currentUser(forceFetch = false) {
    return await this.getCurrentUserObject(forceFetch);
  }

  /**
   * Fetch and cache current user.
   * This method can only be called with a OAuth 1.0a or OAuth2 user authentication.
   *
   * This can only be the slimest available `UserV2` object, with only id, name and username properties defined.
   * To get a customized `UserV2Result`, use `.v2.me()`
   *
   * You can use this method to test if authentication was successful.
   * Next calls to this methods will use the cached user, unless `forceFetch: true` is given.
   *
   * OAuth2 scopes: `tweet.read` & `users.read`
   */
  public async currentUserV2(forceFetch = false) {
    return await this.getCurrentUserV2Object(forceFetch);
  }

  /* Shortcuts to endpoints */

  public search(what: string, options?: Partial<Tweetv2SearchParams>) {
    return this.v2.search(what, options);
  }

  /* Authentication */

  /**
   * Generate the OAuth request token link for user-based OAuth 1.0 auth.
   *
   * ```ts
   * // Instantiate TwitterApi with consumer keys
   * const client = new TwitterApi({ appKey: 'consumer_key', appSecret: 'consumer_secret' });
   *
   * const tokenRequest = await client.generateAuthLink('oob-or-your-callback-url');
   * // redirect end-user to tokenRequest.url
   *
   * // Save tokenRequest.oauth_token_secret somewhere, it will be needed for next auth step.
   * ```
   */
  public async generateAuthLink(
    oauth_callback = 'oob',
    {
      authAccessType,
      linkMode = 'authenticate',
      forceLogin,
      screenName,
    }: Partial<RequestTokenArgs> = {}
  ) {
    const oauthResult = await this.post<RequestTokenResult>(
      'https://api.x.com/oauth/request_token',
      { oauth_callback, x_auth_access_type: authAccessType }
    );
    let url = `https://api.x.com/oauth/${linkMode}?oauth_token=${encodeURIComponent(oauthResult.oauth_token)}`;

    if (forceLogin !== undefined) {
      url += `&force_login=${encodeURIComponent(forceLogin)}`;
    }
    if (screenName !== undefined) {
      url += `&screen_name=${encodeURIComponent(screenName)}`;
    }

    if (this._requestMaker.hasPlugins()) {
      await this._requestMaker.applyPluginMethod('onOAuth1RequestToken', {
        client: this._requestMaker,
        url,
        oauthResult,
      });
    }

    return {
      url,
      ...oauthResult,
    };
  }

  /**
   * Obtain access to user-based OAuth 1.0 auth.
   *
   * After user is redirect from your callback, use obtained oauth_token and oauth_verifier to
   * instantiate the new TwitterApi instance.
   *
   * ```ts
   * // Use the saved oauth_token_secret associated to oauth_token returned by callback
   * const requestClient = new TwitterApi({
   *  appKey: 'consumer_key',
   *  appSecret: 'consumer_secret',
   *  accessToken: 'oauth_token',
   *  accessSecret: 'oauth_token_secret'
   * });
   *
   * // Use oauth_verifier obtained from callback request
   * const { client: userClient } = await requestClient.login('oauth_verifier');
   *
   * // {userClient} is a valid {TwitterApi} object you can use for future requests
   * ```
   */
  public async login(oauth_verifier: string): Promise<LoginResult> {
    const tokens = this.getActiveTokens();
    if (tokens.type !== 'oauth-1.0a')
      throw new Error('You must setup TwitterApi instance with consumer keys to accept OAuth 1.0 login');

    const oauth_result = await this.post<AccessTokenResult>(
      'https://api.x.com/oauth/access_token',
      { oauth_token: tokens.accessToken, oauth_verifier }
    );

    const client = new (this.constructor as typeof TwitterApi)({
      appKey: tokens.appKey,
      appSecret: tokens.appSecret,
      accessToken: oauth_result.oauth_token,
      accessSecret: oauth_result.oauth_token_secret,
    }, this._requestMaker.clientSettings);

    return {
      accessToken: oauth_result.oauth_token,
      accessSecret: oauth_result.oauth_token_secret,
      userId: oauth_result.user_id,
      screenName: oauth_result.screen_name,
      client,
    };
  }

  /**
   * Enable application-only authentication.
   *
   * To make the request, instantiate TwitterApi with consumer and secret.
   *
   * ```ts
   * const requestClient = new TwitterApi({ appKey: 'consumer', appSecret: 'secret' });
   * const appClient = await requestClient.appLogin();
   *
   * // Use {appClient} to make requests
   * ```
   */
  public async appLogin() {
    const tokens = this.getActiveTokens();
    if (tokens.type !== 'oauth-1.0a')
      throw new Error('You must setup TwitterApi instance with consumer keys to accept app-only login');

    // Create a client with Basic authentication
    const basicClient = new (this.constructor as typeof TwitterApi)({ username: tokens.appKey, password: tokens.appSecret }, this._requestMaker.clientSettings);
    const res = await basicClient.post<BearerTokenResult>('https://api.x.com/oauth2/token', { grant_type: 'client_credentials' });

    // New object with Bearer token
    return new (this.constructor as typeof TwitterApi)(res.access_token, this._requestMaker.clientSettings);
  }

  /* OAuth 2 user authentication */

  /**
   * Generate the OAuth request token link for user-based OAuth 2.0 auth.
   *
   * - **You can only use v2 API endpoints with this authentication method.**
   * - **You need to specify which scope you want to have when you create your auth link. Make sure it matches your needs.**
   *
   * See https://developer.x.com/en/docs/authentication/oauth-2-0/user-access-token for details.
   *
   * ```ts
   * // Instantiate TwitterApi with client ID
   * const client = new TwitterApi({ clientId: 'yourClientId' });
   *
   * // Generate a link to callback URL that will gives a token with tweet+user read access
   * const link = client.generateOAuth2AuthLink('your-callback-url', { scope: ['tweet.read', 'users.read'] });
   *
   * // Extract props from generate link
   * const { url, state, codeVerifier } = link;
   *
   * // redirect end-user to url
   * // Save `state` and `codeVerifier` somewhere, it will be needed for next auth step.
   * ```
   */
  generateOAuth2AuthLink(redirectUri: string, options: Partial<BuildOAuth2RequestLinkArgs> = {}): IOAuth2RequestTokenResult {
    if (!this._requestMaker.clientId) {
      throw new Error(
        'Twitter API instance is not initialized with client ID. You can find your client ID in Twitter Developer Portal. ' +
        'Please build an instance with: new TwitterApi({ clientId: \'<yourClientId>\' })',
      );
    }

    const state = options.state ?? OAuth2Helper.generateRandomString(32);
    const codeVerifier = OAuth2Helper.getCodeVerifier();
    const codeChallenge = OAuth2Helper.getCodeChallengeFromVerifier(codeVerifier);
    const rawScope = options.scope ?? '';
    const scope = Array.isArray(rawScope) ? rawScope.join(' ') : rawScope;

    const url = new URL('https://x.com/i/oauth2/authorize');
    const query = {
      response_type: 'code',
      client_id: this._requestMaker.clientId,
      redirect_uri: redirectUri,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 's256',
      scope,
    };

    RequestParamHelpers.addQueryParamsToUrl(url, query);

    const result: IOAuth2RequestTokenResult = {
      url: url.toString(),
      state,
      codeVerifier,
      codeChallenge,
    };

    if (this._requestMaker.hasPlugins()) {
      // This method is sync, so it can't wait for the hooks: log their errors instead of leaving an unhandled rejection
      this._requestMaker.applyPluginMethod('onOAuth2RequestToken', {
        client: this._requestMaker,
        result,
        redirectUri,
      }).catch(error => TwitterApiV2Settings.logger.log('onOAuth2RequestToken plugin hook failed:', error));
    }

    return result;
  }

  /**
   * Obtain access to user-based OAuth 2.0 auth.
   *
   * After user is redirect from your callback, use obtained code to
   * instantiate the new TwitterApi instance.
   *
   * You need to obtain `codeVerifier` from a call to `.generateOAuth2AuthLink`.
   *
   * ```ts
   * // Use the saved codeVerifier associated to state (present in query string of callback)
   * const requestClient = new TwitterApi({ clientId: 'yourClientId' });
   *
   * const { client: userClient, refreshToken } = await requestClient.loginWithOAuth2({
   *  code: 'codeFromQueryString',
   *  // the same URL given to generateOAuth2AuthLink
   *  redirectUri,
   *  // the verifier returned by generateOAuth2AuthLink
   *  codeVerifier,
   * });
   *
   * // {userClient} is a valid {TwitterApi} object you can use for future requests
   * // {refreshToken} is defined if 'offline.access' is in scope.
   * ```
   */
  async loginWithOAuth2({ code, codeVerifier, redirectUri }: AccessOAuth2TokenArgs) {
    if (!this._requestMaker.clientId) {
      throw new Error(
        'Twitter API instance is not initialized with client ID. ' +
        'Please build an instance with: new TwitterApi({ clientId: \'<yourClientId>\' })',
      );
    }

    const accessTokenResult = await this.post<AccessOAuth2TokenResult>('https://api.x.com/2/oauth2/token', {
      code,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      client_id: this._requestMaker.clientId,
      client_secret: this._requestMaker.clientSecret,
    });

    return this.parseOAuth2AccessTokenResult(accessTokenResult);
  }

  /**
   * Obtain a new access token to user-based OAuth 2.0 auth from a refresh token.
   *
   * ```ts
   * const requestClient = new TwitterApi({ clientId: 'yourClientId' });
   *
   * const { client: userClient } = await requestClient.refreshOAuth2Token('refreshToken');
   * // {userClient} is a valid {TwitterApi} object you can use for future requests
   * ```
   */
  async refreshOAuth2Token(refreshToken: string) {
    if (!this._requestMaker.clientId) {
      throw new Error(
        'Twitter API instance is not initialized with client ID. ' +
        'Please build an instance with: new TwitterApi({ clientId: \'<yourClientId>\' })',
      );
    }

    const accessTokenResult = await this.post<AccessOAuth2TokenResult>('https://api.x.com/2/oauth2/token', {
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      client_id: this._requestMaker.clientId,
      client_secret: this._requestMaker.clientSecret,
    });

    return this.parseOAuth2AccessTokenResult(accessTokenResult);
  }

  /**
   * Revoke a single user-based OAuth 2.0 token.
   *
   * You must specify its source, access token (directly after login)
   * or refresh token (if you've called `.refreshOAuth2Token` before).
   */
  async revokeOAuth2Token(token: string, tokenType: 'access_token' | 'refresh_token' = 'access_token') {
    if (!this._requestMaker.clientId) {
      throw new Error(
        'Twitter API instance is not initialized with client ID. ' +
        'Please build an instance with: new TwitterApi({ clientId: \'<yourClientId>\' })',
      );
    }

    return await this.post<void>('https://api.x.com/2/oauth2/revoke', {
      client_id: this._requestMaker.clientId,
      client_secret: this._requestMaker.clientSecret,
      token,
      token_type_hint: tokenType,
    });
  }

  protected parseOAuth2AccessTokenResult(result: AccessOAuth2TokenResult): IParsedOAuth2TokenResult {
    const client = new (this.constructor as typeof TwitterApi)(result.access_token, this._requestMaker.clientSettings);
    const scope = result.scope.split(' ').filter(e => e) as TOAuth2Scope[];

    return {
      client,
      expiresIn: result.expires_in,
      accessToken: result.access_token,
      scope,
      refreshToken: result.refresh_token,
    };
  }
}
