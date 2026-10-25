import {
  Tweetv2SearchParams,
  Tweetv2SearchResult,
  TwitterResponse,
  TweetV2,
  Tweetv2TimelineResult,
  TweetV2TimelineParams,
  TweetV2PaginableTimelineResult,
  TweetV2UserTimelineParams,
  Tweetv2ListResult,
  TweetV2PaginableListParams,
  TweetV2PaginableTimelineParams,
  TweetV2HomeTimelineParams,
} from '../types';
import { TimelineV2Paginator, TwitterV2Paginator } from './v2.paginator';

/** A generic PreviousableTwitterPaginator able to consume TweetV2 timelines with since_id, until_id and next_token (when available). */
abstract class TweetTimelineV2Paginator<
  TResult extends Tweetv2TimelineResult,
  TParams extends TweetV2TimelineParams,
  TShared = any,
> extends TwitterV2Paginator<TResult, TParams, TweetV2, TShared> {
  protected refreshInstanceFromResult(response: TwitterResponse<TResult>, isNextPage: boolean) {
    const result = response.data;
    const resultData = result.data ?? [];
    this._rateLimit = response.rateLimit!;

    if (!this._realData.data) {
      this._realData.data = [];
    }

    if (isNextPage) {
      // An empty response (end of results) has no oldest_id: keep the current one, it is the until_id used when there is no next_token.
      this._realData.meta.oldest_id = result.meta.oldest_id ?? this._realData.meta.oldest_id;
      this._realData.meta.result_count += result.meta.result_count;
      this._realData.meta.next_token = result.meta.next_token;
      this._realData.data.push(...resultData);
    }
    else {
      // An empty response (nothing new) has no newest_id: keep the current one, it is the since_id of the next poll.
      this._realData.meta.newest_id = result.meta.newest_id ?? this._realData.meta.newest_id;
      this._realData.meta.result_count += result.meta.result_count;
      this._realData.data.unshift(...resultData);
    }

    this.updateIncludes(result);
  }

  protected getNextQueryParams(maxResults?: number) {
    this.assertUsable();

    const params: Partial<TParams> = { ...this.injectQueryParams(maxResults) };

    if (this._realData.meta.next_token) {
      params.next_token = this._realData.meta.next_token;
    } else {
      if (params.start_time) {
        // until_id and start_time are forbidden together for some reason, so convert start_time to a since_id.
        params.since_id = this.dateStringToSnowflakeId(params.start_time as string);
        delete params.start_time;
      }
      if (params.end_time) {
        // until_id overrides end_time, so delete it
        delete params.end_time;
      }

      params.until_id = this._realData.meta.oldest_id;
    }

    return params;
  }

  protected getPreviousQueryParams(maxResults?: number) {
    this.assertUsable();

    return {
      ...this.injectQueryParams(maxResults),
      since_id: this._realData.meta.newest_id,
    } as Partial<TParams>;
  }

  protected getPageLengthFromRequest(result: TwitterResponse<TResult>) {
    return result.data.data?.length ?? 0;
  }

  protected isFetchLastOver(result: TwitterResponse<TResult>) {
    return !result.data.data?.length || !this.canFetchNextPage(result.data);
  }

  protected canFetchNextPage(result: TResult) {
    return !!result.meta.next_token;
  }

  protected getItemArray() {
    return this.tweets;
  }

  protected dateStringToSnowflakeId(dateStr: string) {
    const TWITTER_START_EPOCH = BigInt('1288834974657');
    const date = new Date(dateStr);

    if (isNaN(date.valueOf())) {
      throw new Error('Unable to convert start_time/end_time to a valid date. A ISO 8601 DateTime is excepted, please check your input.');
    }

    const dateTimestamp = BigInt(date.valueOf());
    return ((dateTimestamp - TWITTER_START_EPOCH) << BigInt('22')).toString();
  }

  /**
   * Tweets returned by paginator.
   */
  get tweets() {
    return this._realData.data ?? [];
  }

  get meta() {
    return super.meta as TResult['meta'];
  }
}

/** A generic PreviousableTwitterPaginator able to consume TweetV2 timelines with pagination_tokens. */
abstract class TweetPaginableTimelineV2Paginator<
  TResult extends TweetV2PaginableTimelineResult,
  TParams extends TweetV2PaginableTimelineParams,
  TShared = any,
> extends TimelineV2Paginator<TResult, TParams, TweetV2, TShared> {
  protected refreshInstanceFromResult(response: TwitterResponse<TResult>, isNextPage: boolean) {
    super.refreshInstanceFromResult(response, isNextPage);

    const result = response.data;

    if (isNextPage) {
      // An empty response (end of results) has no oldest_id: keep the current one.
      this._realData.meta.oldest_id = result.meta.oldest_id ?? this._realData.meta.oldest_id;
    }
    else {
      // An empty response (nothing new) has no newest_id: keep the current one.
      this._realData.meta.newest_id = result.meta.newest_id ?? this._realData.meta.newest_id;
    }
  }

  protected getItemArray() {
    return this.tweets;
  }

  /**
   * Tweets returned by paginator.
   */
  get tweets() {
    return this._realData.data ?? [];
  }

  get meta() {
    return super.meta as TResult['meta'];
  }
}

// ----------------
// - Tweet search -
// ----------------

export class TweetSearchRecentV2Paginator extends TweetTimelineV2Paginator<Tweetv2SearchResult, Tweetv2SearchParams> {
  protected _endpoint = 'tweets/search/recent';
}

export class TweetSearchAllV2Paginator extends TweetTimelineV2Paginator<Tweetv2SearchResult, Tweetv2SearchParams> {
  protected _endpoint = 'tweets/search/all';
}

export class QuotedTweetsTimelineV2Paginator
  extends TweetPaginableTimelineV2Paginator<TweetV2PaginableTimelineResult, TweetV2PaginableTimelineParams, { id: string }>
{
  protected _endpoint = 'tweets/:id/quote_tweets';
}

// -----------------
// - Home timeline -
// -----------------

export class TweetHomeTimelineV2Paginator
  extends TweetPaginableTimelineV2Paginator<TweetV2PaginableTimelineResult, TweetV2HomeTimelineParams, { id: string }>
{
  protected _endpoint = 'users/:id/timelines/reverse_chronological';
}

// -----------------
// - User timeline -
// -----------------

type TUserTimelinePaginatorShared = { id: string };

export class TweetUserTimelineV2Paginator
  extends TweetPaginableTimelineV2Paginator<TweetV2PaginableTimelineResult, TweetV2UserTimelineParams, TUserTimelinePaginatorShared>
{
  protected _endpoint = 'users/:id/tweets';
}

export class TweetUserMentionTimelineV2Paginator
  extends TweetPaginableTimelineV2Paginator<TweetV2PaginableTimelineResult, TweetV2PaginableTimelineParams, TUserTimelinePaginatorShared>
{
  protected _endpoint = 'users/:id/mentions';
}

// -------------
// - Bookmarks -
// -------------

export class TweetBookmarksTimelineV2Paginator
  extends TweetPaginableTimelineV2Paginator<TweetV2PaginableTimelineResult, TweetV2PaginableTimelineParams, { id: string }>
{
  protected _endpoint = 'users/:id/bookmarks';
}

// ---------------------------------------------------------------------------------
// - Tweet lists (consume tweets with pagination tokens instead of since/until id) -
// ---------------------------------------------------------------------------------

/** A generic TwitterPaginator able to consume TweetV2 timelines. */
abstract class TweetListV2Paginator<
  TResult extends Tweetv2ListResult,
  TParams extends TweetV2PaginableListParams,
  TShared = any,
> extends TimelineV2Paginator<TResult, TParams, TweetV2, TShared> {
  /**
   * Tweets returned by paginator.
   */
  get tweets() {
    return this._realData.data ?? [];
  }

  get meta() {
    return super.meta as TResult['meta'];
  }

  protected getItemArray() {
    return this.tweets;
  }
}

export class TweetV2UserLikedTweetsPaginator
  extends TweetListV2Paginator<Tweetv2ListResult, TweetV2PaginableListParams, TUserTimelinePaginatorShared>
{
  protected _endpoint = 'users/:id/liked_tweets';
}

export class TweetV2ListTweetsPaginator
  extends TweetListV2Paginator<Tweetv2ListResult, TweetV2PaginableListParams, TUserTimelinePaginatorShared>
{
  protected _endpoint = 'lists/:id/tweets';
}
