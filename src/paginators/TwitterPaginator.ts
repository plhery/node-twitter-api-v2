import { TwitterRateLimit, TwitterResponse } from '../types';
import TwitterApiSubClient from '../client.subclient';
import type { TRequestQuery } from '../types/request-maker.mixin.types';

export interface ITwitterPaginatorArgs<TApiResult, TApiParams, TParams> {
  realData: TApiResult;
  rateLimit: TwitterRateLimit;
  instance: TwitterApiSubClient;
  queryParams: Partial<TApiParams>;
  sharedParams?: TParams;
}

/** TwitterPaginator: able to get consume data from initial request, then fetch next data sequentially. */
export abstract class TwitterPaginator<TApiResult, TApiParams extends object, TItem, TParams = any> {
  protected _realData: TApiResult;
  protected _rateLimit: TwitterRateLimit;
  protected _instance: TwitterApiSubClient;
  protected _queryParams: Partial<TApiParams>;
  protected _maxResultsWhenFetchLast = 100;
  /** information unrelated to response data/query params that will be shared between paginator instances */
  protected _sharedParams: TParams;

  protected abstract _endpoint: string;

  // noinspection TypeScriptAbstractClassConstructorCanBeMadeProtected
  constructor({ realData, rateLimit, instance, queryParams, sharedParams }: ITwitterPaginatorArgs<TApiResult, TApiParams, TParams>) {
    this._realData = realData;
    this._rateLimit = rateLimit;
    this._instance = instance;
    this._queryParams = queryParams;
    this._sharedParams = sharedParams!;
  }

  protected get _isRateLimitOk() {
    if (!this._rateLimit) {
      return true;
    }

    const resetDate = this._rateLimit.reset * 1000;

    if (resetDate < Date.now()) {
      return true;
    }
    return this._rateLimit.remaining > 0;
  }

  protected makeRequest(queryParams: Partial<TApiParams>) {
    return this._instance.get<TApiResult>(
      this.getEndpoint(),
      queryParams as TRequestQuery,
      { fullResponse: true, params: this._sharedParams as any as TRequestQuery },
    );
  }

  protected makeNewInstanceFromResult(result: TwitterResponse<TApiResult>, queryParams: Partial<TApiParams>): this {
    // Construct a subclass
    return new (this.constructor as any)({
      realData: result.data,
      rateLimit: result.rateLimit!,
      instance: this._instance,
      queryParams,
      sharedParams: this._sharedParams,
    }) as any;
  }

  protected getEndpoint() {
    return this._endpoint;
  }

  protected injectQueryParams(maxResults?: number) {
    return {
      ...(maxResults ? { max_results: maxResults } : {}),
      ...this._queryParams,
    };
  }

  protected abstract refreshInstanceFromResult(result: TwitterResponse<TApiResult>, isNextPage: boolean): any;

  protected abstract getNextQueryParams(maxResults?: number): Partial<TApiParams>;

  /* Fetch last needed methods */
  protected abstract getPageLengthFromRequest(result: TwitterResponse<TApiResult>): number;

  protected abstract isFetchLastOver(result: TwitterResponse<TApiResult>): boolean;

  protected abstract canFetchNextPage(result: TApiResult): boolean;

  /** `false` when there is nothing after the current page: the next request would only fetch the first page again. */
  protected canRequestNextPage() {
    return this.canFetchNextPage(this._realData);
  }

  /** The current page without its items, that `.next()` gives when there is nothing after it. */
  protected getEmptyPage(): TApiResult {
    if (Array.isArray(this._realData)) {
      return [] as any;
    }

    // Keep the other fields, such as the cursor that marks the end
    const page: any = { ...this._realData };
    for (const key of Object.keys(page)) {
      if (Array.isArray(page[key])) {
        page[key] = [];
      }
    }
    return page;
  }

  /* Iterator methods */
  protected abstract getItemArray(): TItem[];

  /* ---------------------- */
  /* Real paginator methods */
  /* ---------------------- */

  /**
   * Next page.
   * An empty page if there is no next page.
   */
  async next(maxResults?: number) {
    const queryParams = this.getNextQueryParams(maxResults);

    if (!this.canRequestNextPage()) {
      return this.makeNewInstanceFromResult({ data: this.getEmptyPage(), headers: {}, rateLimit: this._rateLimit }, queryParams);
    }

    const result = await this.makeRequest(queryParams);
    return this.makeNewInstanceFromResult(result, queryParams);
  }

  /**
   * Next page, but store it in current instance.
   * Does nothing if there is no next page.
   */
  async fetchNext(maxResults?: number) {
    const queryParams = this.getNextQueryParams(maxResults);

    if (!this.canRequestNextPage()) {
      return this;
    }

    const result = await this.makeRequest(queryParams);

    // Await in case of async sub-methods
    await this.refreshInstanceFromResult(result, true);

    return this;
  }

  /**
   * Fetch up to {count} items after current page,
   * as long as rate limit is not hit and Twitter has some results
   */
  async fetchLast(count = Infinity) {
    let queryParams = this.getNextQueryParams(this._maxResultsWhenFetchLast);

    let resultCount = 0;

    // Break at rate limit limit, or when there is no next page
    while (resultCount < count && this._isRateLimitOk && this.canRequestNextPage()) {
      const response = await this.makeRequest(queryParams);
      await this.refreshInstanceFromResult(response, true);

      resultCount += this.getPageLengthFromRequest(response);

      if (this.isFetchLastOver(response)) {
        break;
      }

      queryParams = this.getNextQueryParams(this._maxResultsWhenFetchLast);
    }

    return this;
  }

  get rateLimit() {
    return { ...this._rateLimit ?? {} };
  }

  /** Get raw data returned by Twitter API. */
  get data() {
    return this._realData;
  }

  get done() {
    return !this.canFetchNextPage(this._realData);
  }

  /**
   * Iterate over currently fetched items.
   */
  *[Symbol.iterator](): Generator<TItem, void, undefined> {
    yield* this.getItemArray();
  }

  /**
   * Iterate over items "indefinitely" (until rate limit is hit / they're no more items available)
   * This will **mutate the current instance** and fill data, metas, etc. inside this instance.
   *
   * If you need to handle concurrent requests, or you need to rely on immutability, please use `.fetchAndIterate()` instead.
   */
  async *[Symbol.asyncIterator](): AsyncGenerator<TItem, void, undefined> {
    yield* this.getItemArray();
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let paginator = this;
    let canFetchNextPage = this.canFetchNextPage(this._realData);

    while (canFetchNextPage && this._isRateLimitOk && paginator.getItemArray().length > 0) {
      const next = await paginator.next(this._maxResultsWhenFetchLast);

      // Store data into current instance [needed to access includes and meta]
      this.refreshInstanceFromResult({ data: next._realData, headers: {}, rateLimit: next._rateLimit }, true);

      canFetchNextPage = this.canFetchNextPage(next._realData);
      const items = next.getItemArray();
      yield* items;

      paginator = next;
    }
  }

  /**
   * Iterate over items "indefinitely" without modifying the current instance (until rate limit is hit / they're no more items available)
   *
   * This will **NOT** mutate the current instance, meaning that current instance will not inherit from `includes` and `meta` (v2 API only).
   * Use `Symbol.asyncIterator` (`for-await of`) to directly access items with current instance mutation.
   */
  async *fetchAndIterate(): AsyncGenerator<[TItem, this], void, undefined> {
    for (const item of this.getItemArray()) {
      yield [item, this];
    }

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let paginator = this;
    let canFetchNextPage = this.canFetchNextPage(this._realData);

    while (canFetchNextPage && this._isRateLimitOk && paginator.getItemArray().length > 0) {
      const next = await paginator.next(this._maxResultsWhenFetchLast);

      // Store data into current instance [needed to access includes and meta]
      this.refreshInstanceFromResult({ data: next._realData, headers: {}, rateLimit: next._rateLimit }, true);

      canFetchNextPage = this.canFetchNextPage(next._realData);
      for (const item of next.getItemArray()) {
        yield [item, next];
      }

      this._rateLimit = next._rateLimit;
      paginator = next;
    }
  }
}

/** PreviousableTwitterPaginator: a TwitterPaginator able to get consume data from both side, next and previous. */
export abstract class PreviousableTwitterPaginator<TApiResult, TApiParams extends object, TItem, TParams = any>
  extends TwitterPaginator<TApiResult, TApiParams, TItem, TParams>
{
  protected abstract getPreviousQueryParams(maxResults?: number): Partial<TApiParams>;

  /**
   * Previous page (new tweets)
   */
  async previous(maxResults?: number) {
    const queryParams = this.getPreviousQueryParams(maxResults);
    const result = await this.makeRequest(queryParams);
    return this.makeNewInstanceFromResult(result, queryParams);
  }

  /**
   * Previous page, but in current instance.
   */
  async fetchPrevious(maxResults?: number) {
    const queryParams = this.getPreviousQueryParams(maxResults);
    const result = await this.makeRequest(queryParams);

    await this.refreshInstanceFromResult(result, false);

    return this;
  }
}

export default TwitterPaginator;
