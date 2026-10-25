import type { TwitterResponse } from '../types';
import type { DataMetaAndIncludeV2 } from '../types/v2/shared.v2.types';
import { TwitterV2IncludesHelper } from '../v2/includes.v2.helper';
import { PreviousableTwitterPaginator } from './TwitterPaginator';

/** A generic PreviousableTwitterPaginator with common v2 helper methods. */
export abstract class TwitterV2Paginator<
  TResult extends DataMetaAndIncludeV2<any, any, any>,
  TParams extends object,
  TItem,
  TShared = any,
> extends PreviousableTwitterPaginator<TResult, TParams, TItem, TShared> {
  protected _includesInstance?: TwitterV2IncludesHelper;

  protected updateIncludes(data: TResult) {
    // Update errors
    if (data.errors) {
      if (!this._realData.errors) {
        this._realData.errors = [];
      }
      this._realData.errors = [...this._realData.errors, ...data.errors];
    }

    // Update includes
    if (!data.includes) {
      return;
    }
    if (!this._realData.includes) {
      this._realData.includes = {};
    }

    const includesRealData = this._realData.includes;

    for (const [includeKey, includeArray] of Object.entries(data.includes) as [keyof any, any[]][]) {
      const currentArray: any[] = includesRealData[includeKey] ?? [];
      // Several pages can include the same user, tweet or media: keep only its first copy
      const knownKeys = new Set(currentArray.map(item => item.media_key ?? item.id));

      includesRealData[includeKey] = [
        ...currentArray,
        ...includeArray.filter(item => {
          const key = item.media_key ?? item.id;
          if (key !== undefined && knownKeys.has(key)) {
            return false;
          }
          knownKeys.add(key);
          return true;
        }),
      ];
    }
  }

  protected getEmptyPage() {
    // What X sends when there is nothing more
    return { meta: { result_count: 0 } } as TResult;
  }

  /** Throw if the current paginator is not usable. */
  protected assertUsable() {
    if (this.unusable) {
      throw new Error(
        'Unable to use this paginator to fetch more data, as it does not contain any metadata.' +
          ' Check .errors property for more details.',
      );
    }
  }

  get meta() {
    return this._realData.meta;
  }

  get includes() {
    if (!this._realData?.includes) {
      return new TwitterV2IncludesHelper(this._realData);
    }
    if (this._includesInstance) {
      return this._includesInstance;
    }
    return this._includesInstance = new TwitterV2IncludesHelper(this._realData);
  }

  get errors() {
    return this._realData.errors ?? [];
  }

  /** `true` if this paginator only contains error payload and no metadata found to consume data. */
  get unusable() {
    return this.errors.length > 0 && !this._realData.meta && !this._realData.data;
  }
}

/** A generic TwitterV2Paginator able to consume v2 timelines that use max_results and pagination tokens. */
export abstract class TimelineV2Paginator<
  TResult extends DataMetaAndIncludeV2<any, any, any>,
  TParams extends { max_results?: number, pagination_token?: string },
  TItem,
  TShared = any,
> extends TwitterV2Paginator<TResult, TParams, TItem, TShared> {
  protected refreshInstanceFromResult(response: TwitterResponse<TResult>, isNextPage: boolean) {
    const result = response.data;
    const resultData = result.data ?? [];
    this._rateLimit = response.rateLimit!;

    if (!this._realData.data) {
      this._realData.data = [];
    }

    if (isNextPage) {
      this._realData.meta.result_count += result.meta.result_count;
      this._realData.meta.next_token = result.meta.next_token;
      this._realData.data.push(...resultData);
    }
    else {
      this._realData.meta.result_count += result.meta.result_count;
      // An empty response (nothing new) has no previous_token: keep the current one.
      this._realData.meta.previous_token = result.meta.previous_token ?? this._realData.meta.previous_token;
      this._realData.data.unshift(...resultData);
    }

    this.updateIncludes(result);
  }

  protected getNextQueryParams(maxResults?: number) {
    this.assertUsable();

    return {
      ...this.injectQueryParams(maxResults),
      pagination_token: this._realData.meta.next_token,
    };
  }

  protected getPreviousQueryParams(maxResults?: number) {
    this.assertUsable();

    return {
      ...this.injectQueryParams(maxResults),
      pagination_token: this._realData.meta.previous_token,
    };
  }

  protected getPageLengthFromRequest(result: TwitterResponse<TResult>) {
    return result.data.data?.length ?? 0;
  }

  protected isFetchLastOver(result: TwitterResponse<TResult>) {
    return !result.data.data?.length || !this.canFetchNextPage(result.data);
  }

  protected canFetchNextPage(result: TResult) {
    return !!result.meta?.next_token;
  }
}
