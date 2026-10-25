import { TwitterResponse, UserSearchV2Params, UserSearchV2Result, UserV2, UserV2TimelineParams, UserV2TimelineResult } from '../types';
import { TimelineV2Paginator, TwitterV2Paginator } from './v2.paginator';

/** A generic PreviousableTwitterPaginator able to consume UserV2 timelines. */
abstract class UserTimelineV2Paginator<
  TResult extends UserV2TimelineResult,
  TParams extends UserV2TimelineParams,
  TShared = any,
> extends TimelineV2Paginator<TResult, TParams, UserV2, TShared> {
  protected getItemArray() {
    return this.users;
  }

  /**
   * Users returned by paginator.
   */
  get users() {
    return this._realData.data ?? [];
  }

  get meta() {
    return super.meta as TResult['meta'];
  }
}

export class UserBlockingUsersV2Paginator extends UserTimelineV2Paginator<UserV2TimelineResult, UserV2TimelineParams, { id: string }> {
  protected _endpoint = 'users/:id/blocking';
}

export class UserMutingUsersV2Paginator extends UserTimelineV2Paginator<UserV2TimelineResult, UserV2TimelineParams, { id: string }> {
  protected _endpoint = 'users/:id/muting';
}

export class UserFollowersV2Paginator extends UserTimelineV2Paginator<UserV2TimelineResult, UserV2TimelineParams, { id: string }> {
  protected _endpoint = 'users/:id/followers';
}

export class UserFollowingV2Paginator extends UserTimelineV2Paginator<UserV2TimelineResult, UserV2TimelineParams, { id: string }> {
  protected _endpoint = 'users/:id/following';
}

export class UserListMembersV2Paginator extends UserTimelineV2Paginator<UserV2TimelineResult, UserV2TimelineParams, { id: string }> {
  protected _endpoint = 'lists/:id/members';
}

export class UserListFollowersV2Paginator extends UserTimelineV2Paginator<UserV2TimelineResult, UserV2TimelineParams, { id: string }> {
  protected _endpoint = 'lists/:id/followers';
}

export class TweetLikingUsersV2Paginator extends UserTimelineV2Paginator<UserV2TimelineResult, UserV2TimelineParams, { id: string }> {
  protected _endpoint = 'tweets/:id/liking_users';
}

export class TweetRetweetersUsersV2Paginator extends UserTimelineV2Paginator<UserV2TimelineResult, UserV2TimelineParams, { id: string }> {
  protected _endpoint = 'tweets/:id/retweeted_by';
}

/** Users search pages with `next_token` instead of `pagination_token`, and its meta has no `result_count`. */
export class UserSearchV2Paginator extends TwitterV2Paginator<UserSearchV2Result, UserSearchV2Params, UserV2> {
  protected _endpoint = 'users/search';

  protected refreshInstanceFromResult(response: TwitterResponse<UserSearchV2Result>, isNextPage: boolean) {
    const result = response.data;
    const resultData = result.data ?? [];
    this._rateLimit = response.rateLimit!;

    if (!this._realData.data) {
      this._realData.data = [];
    }
    if (!this._realData.meta) {
      this._realData.meta = {};
    }

    if (isNextPage) {
      this._realData.meta.next_token = result.meta?.next_token;
      this._realData.data.push(...resultData);
    }
    else {
      // An empty response (nothing new) has no previous_token: keep the current one.
      this._realData.meta.previous_token = result.meta?.previous_token ?? this._realData.meta.previous_token;
      this._realData.data.unshift(...resultData);
    }

    this.updateIncludes(result);
  }

  protected getNextQueryParams(maxResults?: number) {
    this.assertUsable();

    return {
      ...this.injectQueryParams(maxResults),
      next_token: this._realData.meta?.next_token,
    };
  }

  protected getPreviousQueryParams(maxResults?: number) {
    this.assertUsable();

    // users/search has no previous_token parameter, both tokens go in next_token
    return {
      ...this.injectQueryParams(maxResults),
      next_token: this._realData.meta?.previous_token,
    };
  }

  protected getPageLengthFromRequest(result: TwitterResponse<UserSearchV2Result>) {
    return result.data.data?.length ?? 0;
  }

  protected isFetchLastOver(result: TwitterResponse<UserSearchV2Result>) {
    return !result.data.data?.length || !this.canFetchNextPage(result.data);
  }

  protected canFetchNextPage(result: UserSearchV2Result) {
    return !!result.meta?.next_token;
  }

  protected getItemArray() {
    return this.users;
  }

  /**
   * Users returned by paginator.
   */
  get users() {
    return this._realData.data ?? [];
  }

  get meta() {
    return super.meta as UserSearchV2Result['meta'];
  }
}
