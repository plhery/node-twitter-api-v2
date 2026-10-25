import type { IClientSettings, ITwitterApiClientPlugin, TwitterApiBasicAuth, TwitterApiOAuth2Init, TwitterApiTokens, TwitterRateLimit, TwitterResponse, UserV1, UserV2Result } from './types';
import { ClientRequestMaker } from './client-mixins/request-maker.mixin';
import TweetStream from './stream/TweetStream';
import { sharedPromise, SharedPromise } from './helpers';
import { API_V1_1_PREFIX, API_V2_PREFIX } from './globals';
import type { TAcceptedInitToken, TCustomizableRequestArgs, TRequestBody, TRequestQuery } from './types/request-maker.mixin.types';

export type TGetClientRequestArgs = TCustomizableRequestArgs & {
  prefix?: string;
  fullResponse?: boolean;
};

type TGetClientRequestArgsFullResponse = TClientRequestArgs & { fullResponse: true };
type TGetClientRequestArgsDataResponse = TClientRequestArgs & { fullResponse?: false };

export type TClientRequestArgs = TCustomizableRequestArgs & {
  prefix?: string;
  fullResponse?: boolean;
  query?: TRequestQuery;
};

type TClientRequestArgsFullResponse = TClientRequestArgs & { fullResponse: true };
type TClientRequestArgsDataResponse = TClientRequestArgs & { fullResponse?: false };

export type TStreamClientRequestArgs = TCustomizableRequestArgs & {
  prefix?: string;
  query?: TRequestQuery;
  payloadIsError?: (data: any) => boolean;
  /**
   * Choose to make or not initial connection.
   * Method `.connect` must be called on returned `TweetStream` object
   * to start stream if `autoConnect` is set to `false`.
   * Defaults to `true`.
   */
  autoConnect?: boolean;
};

export type TStreamClientRequestArgsWithAutoConnect = TStreamClientRequestArgs & { autoConnect?: true };
export type TStreamClientRequestArgsWithoutAutoConnect = TStreamClientRequestArgs & { autoConnect: false };

/**
 * Base class for Twitter instances
 */
export default abstract class TwitterApiBase {
  protected _prefix: string | undefined;
  protected _currentUser: SharedPromise<UserV1> | null = null;
  protected _currentUserV2: SharedPromise<UserV2Result> | null = null;
  protected _requestMaker: ClientRequestMaker;

  /**
   * Create a new TwitterApi object without authentication.
   */
  constructor(_?: undefined, settings?: Partial<IClientSettings>);
  /**
   * Create a new TwitterApi object with OAuth 2.0 Bearer authentication.
   */
  constructor(bearerToken: string, settings?: Partial<IClientSettings>);
  /**
   * Create a new TwitterApi object with three-legged OAuth 1.0a authentication.
   */
  constructor(tokens: TwitterApiTokens, settings?: Partial<IClientSettings>);
  /**
   * Create a new TwitterApi object with only client ID needed for OAuth2 user-flow.
   */
  constructor(oauth2Init: TwitterApiOAuth2Init, settings?: Partial<IClientSettings>);
  /**
   * Create a new TwitterApi object with Basic HTTP authentication.
   */
  constructor(credentials: TwitterApiBasicAuth, settings?: Partial<IClientSettings>);
  /**
   * Create a clone of {instance}.
   */
  constructor(instance: TwitterApiBase, settings?: Partial<IClientSettings>);

  public constructor(
    token?: TAcceptedInitToken | TwitterApiBase,
    settings: Partial<IClientSettings> = {},
  ) {
    if (token instanceof TwitterApiBase) {
      this._requestMaker = token._requestMaker;
    }
    else {
      this._requestMaker = new ClientRequestMaker(settings);
      this._requestMaker.initializeToken(token);
    }
  }

  /* Prefix/Token handling */

  protected setPrefix(prefix: string | undefined) {
    this._prefix = prefix;
  }

  public cloneWithPrefix(prefix: string): this {
    const clone = new (this.constructor as any)(this);
    (clone as TwitterApiBase).setPrefix(prefix);

    return clone;
  }

  public getActiveTokens() {
    return this._requestMaker.getActiveTokens();
  }

  /* Rate limit cache / Plugins */

  public getPlugins() {
    return this._requestMaker.getPlugins();
  }

  public getPluginOfType<T extends ITwitterApiClientPlugin>(type: { new(...args: any[]): T }): T | undefined {
    return this.getPlugins().find(plugin => plugin instanceof type) as T | undefined;
  }

  /**
   * @deprecated - Migrate to plugin `@twitter-api-v2/plugin-rate-limit`
   *
   * Tells if you hit the Twitter rate limit for {endpoint}.
   * (local data only, this should not ask anything to Twitter)
   */
  public hasHitRateLimit(endpoint: string) {
    if (this.isRateLimitStatusObsolete(endpoint)) {
      return false;
    }
    return this.getLastRateLimitStatus(endpoint)?.remaining === 0;
  }

  /**
   * @deprecated - Migrate to plugin `@twitter-api-v2/plugin-rate-limit`
   *
   * Tells if you hit the returned Twitter rate limit for {endpoint} has expired.
   * If client has no saved rate limit data for {endpoint}, this will gives you `true`.
   */
  public isRateLimitStatusObsolete(endpoint: string) {
    const rateLimit = this.getLastRateLimitStatus(endpoint);

    if (rateLimit === undefined) {
      return true;
    }
    // Timestamps are exprimed in seconds, JS works with ms
    return (rateLimit.reset * 1000) < Date.now();
  }

  /**
   * @deprecated - Migrate to plugin `@twitter-api-v2/plugin-rate-limit`
   *
   * Get the last obtained Twitter rate limit information for {endpoint}.
   * (local data only, this should not ask anything to Twitter)
   */
  public getLastRateLimitStatus(endpoint: string): TwitterRateLimit | undefined {
    const endpointWithPrefix = endpoint.match(/^https?:\/\//) ? endpoint : (this._prefix + endpoint);
    return this._requestMaker.getRateLimits()[endpointWithPrefix];
  }

  /* Current user cache */

  /** Get cached current user. */
  protected getCurrentUserObject(forceFetch = false) {
    if (!forceFetch && this._currentUser) {
      if (this._currentUser.value) {
        return Promise.resolve(this._currentUser.value);
      }
      return this._currentUser.promise;
    }

    const currentUser = this._currentUser = sharedPromise(() => this.get<UserV1>(
      'account/verify_credentials.json',
      { tweet_mode: 'extended' },
      { prefix: API_V1_1_PREFIX },
    ));
    // Don't cache a failure, so that the next call retries
    currentUser.promise.catch(() => {
      if (this._currentUser === currentUser) {
        this._currentUser = null;
      }
    });

    return currentUser.promise;
  }

  /**
   * Get cached current user from v2 API.
   * This can only be the slimest available `UserV2` object, with only `id`, `name` and `username` properties defined.
   *
   * To get a customized `UserV2Result`, use `.v2.me()`
   *
   * OAuth2 scopes: `tweet.read` & `users.read`
   */
  protected getCurrentUserV2Object(forceFetch = false) {
    if (!forceFetch && this._currentUserV2) {
      if (this._currentUserV2.value) {
        return Promise.resolve(this._currentUserV2.value);
      }
      return this._currentUserV2.promise;
    }

    const currentUser = this._currentUserV2 = sharedPromise(() => this.get<UserV2Result>('users/me', undefined, { prefix: API_V2_PREFIX }));
    // Don't cache a failure, so that the next call retries
    currentUser.promise.catch(() => {
      if (this._currentUserV2 === currentUser) {
        this._currentUserV2 = null;
      }
    });

    return currentUser.promise;
  }

  /* Direct HTTP methods */

  async get<T = any>(url: string, query?: TRequestQuery, args?: TGetClientRequestArgsDataResponse) : Promise<T>;
  async get<T = any>(url: string, query?: TRequestQuery, args?: TGetClientRequestArgsFullResponse) : Promise<TwitterResponse<T>>;

  public async get<T = any>(
    url: string,
    query: TRequestQuery = {},
    { fullResponse, prefix = this._prefix, ...rest }: TGetClientRequestArgs = {},
  ) : Promise<T | TwitterResponse<T>> {
    if (prefix)
      url = prefix + url;

    const resp = await this._requestMaker.send<T>({
      url,
      method: 'GET',
      query,
      ...rest,
    });

    return fullResponse ? resp : resp.data;
  }

  async delete<T = any>(url: string, query?: TRequestQuery, args?: TGetClientRequestArgsDataResponse) : Promise<T>;
  async delete<T = any>(url: string, query?: TRequestQuery, args?: TGetClientRequestArgsFullResponse) : Promise<TwitterResponse<T>>;

  public async delete<T = any>(
    url: string,
    query: TRequestQuery = {},
    { fullResponse, prefix = this._prefix, ...rest }: TGetClientRequestArgs = {},
  ) : Promise<T | TwitterResponse<T>> {
    if (prefix)
      url = prefix + url;

    const resp = await this._requestMaker.send<T>({
      url,
      method: 'DELETE',
      query,
      ...rest,
    });

    return fullResponse ? resp : resp.data;
  }

  async post<T = any>(url: string, body?: TRequestBody, args?: TClientRequestArgsDataResponse) : Promise<T>;
  async post<T = any>(url: string, body?: TRequestBody, args?: TClientRequestArgsFullResponse) : Promise<TwitterResponse<T>>;

  public async post<T = any>(url: string, body?: TRequestBody, { fullResponse, prefix = this._prefix, ...rest }: TClientRequestArgs = {}) : Promise<T | TwitterResponse<T>> {
    if (prefix)
      url = prefix + url;

    const resp = await this._requestMaker.send<T>({
      url,
      method: 'POST',
      body,
      ...rest,
    });

    return fullResponse ? resp : resp.data;
  }

  async put<T = any>(url: string, body?: TRequestBody, args?: TClientRequestArgsDataResponse) : Promise<T>;
  async put<T = any>(url: string, body?: TRequestBody, args?: TClientRequestArgsFullResponse) : Promise<TwitterResponse<T>>;

  public async put<T = any>(url: string, body: TRequestBody, { fullResponse, prefix = this._prefix, ...rest }: TClientRequestArgs = {}) : Promise<T | TwitterResponse<T>> {
    if (prefix)
      url = prefix + url;

    const resp = await this._requestMaker.send<T>({
      url,
      method: 'PUT',
      body,
      ...rest,
    });

    return fullResponse ? resp : resp.data;
  }

  async patch<T = any>(url: string, body?: TRequestBody, args?: TClientRequestArgsDataResponse) : Promise<T>;
  async patch<T = any>(url: string, body?: TRequestBody, args?: TClientRequestArgsFullResponse) : Promise<TwitterResponse<T>>;

  public async patch<T = any>(url: string, body?: TRequestBody, { fullResponse, prefix = this._prefix, ...rest }: TClientRequestArgs = {}) : Promise<T | TwitterResponse<T>> {
    if (prefix)
      url = prefix + url;

    const resp = await this._requestMaker.send<T>({
      url,
      method: 'PATCH',
      body,
      ...rest,
    });

    return fullResponse ? resp : resp.data;
  }


  /** Stream request helpers */

  getStream<T = any>(url: string, query: TRequestQuery | undefined, options: TStreamClientRequestArgsWithoutAutoConnect) : TweetStream<T>;
  getStream<T = any>(url: string, query?: TRequestQuery, options?: TStreamClientRequestArgsWithAutoConnect) : Promise<TweetStream<T>>;
  getStream<T = any>(url: string, query?: TRequestQuery, options?: TStreamClientRequestArgs) : Promise<TweetStream<T>> | TweetStream<T>;

  public getStream<T = any>(url: string, query?: TRequestQuery, { prefix = this._prefix, ...rest }: TStreamClientRequestArgs = {}) : Promise<TweetStream<T>> | TweetStream<T> {
    return this._requestMaker.sendStream<T>({
      url: prefix ? prefix + url : url,
      method: 'GET',
      query,
      ...rest,
    });
  }

  postStream<T = any>(url: string, body: TRequestBody | undefined, options: TStreamClientRequestArgsWithoutAutoConnect) : TweetStream<T>;
  postStream<T = any>(url: string, body?: TRequestBody, options?: TStreamClientRequestArgsWithAutoConnect) : Promise<TweetStream<T>>;
  postStream<T = any>(url: string, body?: TRequestBody, options?: TStreamClientRequestArgs) : Promise<TweetStream<T>> | TweetStream<T>;

  public postStream<T = any>(url: string, body?: TRequestBody, { prefix = this._prefix, ...rest }: TStreamClientRequestArgs = {}) : Promise<TweetStream<T>> | TweetStream<T> {
    return this._requestMaker.sendStream<T>({
      url: prefix ? prefix + url : url,
      method: 'POST',
      body,
      ...rest,
    });
  }
}
