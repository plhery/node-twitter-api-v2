import TwitterPaginator from './TwitterPaginator';
import {
  FriendshipsIncomingV1Params,
  FriendshipsIncomingV1Result,
  TwitterResponse,
  UserSearchV1Params,
  UserV1,
} from '../types';
import { CursoredV1Paginator } from './paginator.v1';

/** A generic TwitterPaginator able to consume TweetV1 timelines. */
export class UserSearchV1Paginator extends TwitterPaginator<UserV1[], UserSearchV1Params, UserV1> {
  _endpoint = 'users/search.json';

  protected refreshInstanceFromResult(response: TwitterResponse<UserV1[]>, isNextPage: true) {
    const result = response.data;
    this._rateLimit = response.rateLimit!;

    if (isNextPage) {
      this._realData.push(...result);
      // Remember the page just stored, so the next fetchNext() asks for the one after it
      this._queryParams = { ...this._queryParams, page: Number(this._queryParams.page ?? '1') + 1 };
    }
  }

  protected getNextQueryParams(maxResults?: number) {
    const previousPage = Number(this._queryParams.page ?? '1');

    return {
      ...this._queryParams,
      page: previousPage + 1,
      ...maxResults ? { count: maxResults } : {},
    };
  }

  protected getPageLengthFromRequest(result: TwitterResponse<UserV1[]>) {
    return result.data.length;
  }

  protected isFetchLastOver(result: TwitterResponse<UserV1[]>) {
    return !result.data.length;
  }

  protected canFetchNextPage(result: UserV1[]) {
    return result.length > 0;
  }

  protected getItemArray() {
    return this.users;
  }

  /**
   * Users returned by paginator.
   */
  get users() {
    return this._realData;
  }
}

export class FriendshipsIncomingV1Paginator extends CursoredV1Paginator<FriendshipsIncomingV1Result, FriendshipsIncomingV1Params, string> {
  protected _endpoint = 'friendships/incoming.json';
  protected _maxResultsWhenFetchLast = 5000;

  protected refreshInstanceFromResult(response: TwitterResponse<FriendshipsIncomingV1Result>, isNextPage: true) {
    const result = response.data;
    this._rateLimit = response.rateLimit!;

    if (isNextPage) {
      this._realData.ids.push(...result.ids);
      this._realData.next_cursor = result.next_cursor;
    }
  }

  protected getPageLengthFromRequest(result: TwitterResponse<FriendshipsIncomingV1Result>) {
    return result.data.ids.length;
  }

  protected getItemArray() {
    return this.ids;
  }

  /**
   * Users IDs returned by paginator.
   */
  get ids() {
    return this._realData.ids;
  }
}

export class FriendshipsOutgoingV1Paginator extends FriendshipsIncomingV1Paginator {
  protected _endpoint = 'friendships/outgoing.json';
}
