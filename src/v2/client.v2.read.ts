import TwitterApiSubClient from '../client.subclient';
import { API_V2_PREFIX } from '../globals';
import {
  Tweetv2FieldsParams,
  Tweetv2SearchParams, Tweetv2SearchResult, UserV2Result,
  UsersV2Result, UsersV2Params, StreamingV2GetRulesParams,
  StreamingV2GetRulesResult, TweetV2LookupResult,
  TweetV2UserTimelineParams,
  TweetV2UserTimelineResult,
  StreamingV2AddRulesParams,
  StreamingV2DeleteRulesParams,
  StreamingV2UpdateRulesParams,
  StreamingV2UpdateRulesQuery,
  StreamingV2UpdateRulesDeleteResult,
  StreamingV2UpdateRulesAddResult,
  StreamingV2UpdateRulesResult,
  TweetV2SingleResult,
  TweetV2PaginableTimelineParams,
  TweetV2QuoteTweetsParams,
  TweetV2CountResult,
  TweetV2CountParams,
  TweetV2CountAllResult,
  TweetV2CountAllParams,
  TweetV2RetweetedByResult,
  TweetV2LikedByResult,
  UserV2TimelineParams,
  UserV2TimelineResult,
  FollowersV2ParamsWithPaginator,
  FollowersV2Params,
  FollowersV2ParamsWithoutPaginator,
  TweetSearchV2StreamParams,
  TweetV2SingleStreamResult,
  TweetV2PaginableListParams,
  Tweetv2ListResult,
  SpaceV2FieldsParams,
  SpaceV2LookupResult,
  SpaceV2CreatorLookupParams,
  SpaceV2SearchParams,
  SpaceV2SingleResult,
  BatchComplianceSearchV2Params,
  BatchComplianceListV2Result,
  BatchComplianceV2Result,
  BatchComplianceV2Params,
  BatchComplianceV2JobResult,
  BatchComplianceJobV2,
  GetListV2Params,
  ListGetV2Result,
  GetListTimelineV2Params,
  ListTimelineV2Result,
  TweetRetweetedOrLikedByV2Params,
  TweetRetweetedOrLikedByV2ParamsWithPaginator,
  TweetRetweetedOrLikedByV2ParamsWithoutPaginator,
  SpaceV2BuyersParams,
  SpaceV2BuyersResult,
  TweetV2PaginableTimelineResult,
  TweetV2HomeTimelineParams,
  TweetV2HomeTimelineResult,
  TweetUsageV2Params,
  TweetV2UsageResult,
  CommunityV2Result,
  CommunitiesV2Result,
  CommunityByIDV2Params,
  CommunitySearchV2Params,
} from '../types';
import {
  TweetSearchAllV2Paginator,
  TweetSearchRecentV2Paginator,
  TweetUserMentionTimelineV2Paginator,
  TweetUserTimelineV2Paginator,
  TweetV2UserLikedTweetsPaginator,
  UserOwnedListsV2Paginator,
  UserListMembershipsV2Paginator,
  UserListFollowedV2Paginator,
  TweetV2ListTweetsPaginator,
  TweetBookmarksTimelineV2Paginator,
  QuotedTweetsTimelineV2Paginator,
  TweetHomeTimelineV2Paginator,
} from '../paginators';
import TwitterApiv2LabsReadOnly from '../v2-labs/client.v2.labs.read';
import { TweetLikingUsersV2Paginator, TweetRetweetersUsersV2Paginator, UserBlockingUsersV2Paginator, UserFollowersV2Paginator, UserFollowingV2Paginator, UserListFollowersV2Paginator, UserListMembersV2Paginator, UserMutingUsersV2Paginator } from '../paginators/user.paginator.v2';
import { isTweetStreamV2ErrorPayload } from '../helpers';
import TweetStream from '../stream/TweetStream';
import { PromiseOrType } from '../types/shared.types';
import { GetDMEventV2Params, GetDMEventV2Result } from '../types/v2/dm.v2.types';
import { ConversationDMTimelineV2Paginator, FullDMTimelineV2Paginator, OneToOneDMTimelineV2Paginator } from '../paginators/dm.paginator.v2';

/**
 * Base Twitter v2 client with only read right.
 */
export default class TwitterApiv2ReadOnly extends TwitterApiSubClient {
  protected _prefix = API_V2_PREFIX;
  protected _labs?: TwitterApiv2LabsReadOnly;

  /* Sub-clients */

  /**
   * Get a client for v2 labs endpoints.
   *
   * @deprecated X retired the Labs endpoints in 2020.
   */
  public get labs() {
    if (this._labs) return this._labs;

    return this._labs = new TwitterApiv2LabsReadOnly(this);
  }

  /* Tweets */

  /**
   * The recent search endpoint returns Tweets from the last seven days that match a search query.
   * https://developer.x.com/en/docs/twitter-api/tweets/search/api-reference/get-tweets-search-recent
   */
  public async search(options: Tweetv2SearchParams): Promise<TweetSearchRecentV2Paginator>;
  public async search(query: string, options?: Partial<Tweetv2SearchParams>): Promise<TweetSearchRecentV2Paginator>
  public async search(queryOrOptions: string | Tweetv2SearchParams, options: Partial<Tweetv2SearchParams> = {}) {
    const queryParams = typeof queryOrOptions === 'string' ?
      { ...options, query: queryOrOptions } :
      { ...queryOrOptions };
    const initialRq = await this.get<Tweetv2SearchResult>('tweets/search/recent', queryParams, { fullResponse: true });

    return new TweetSearchRecentV2Paginator({
      realData: initialRq.data,
      rateLimit: initialRq.rateLimit!,
      instance: this,
      queryParams,
    });
  }

  /**
   * The full-archive search endpoint returns the complete history of public Tweets matching a search query;
   * since the first Tweet was created March 26, 2006.
   *
   * This endpoint is only available to those users who have been approved for the Academic Research product track.
   * https://developer.x.com/en/docs/twitter-api/tweets/search/api-reference/get-tweets-search-all
   */
  public async searchAll(query: string, options: Partial<Tweetv2SearchParams> = {}) {
    const queryParams = { ...options, query };
    const initialRq = await this.get<Tweetv2SearchResult>('tweets/search/all', queryParams, { fullResponse: true });

    return new TweetSearchAllV2Paginator({
      realData: initialRq.data,
      rateLimit: initialRq.rateLimit!,
      instance: this,
      queryParams,
    });
  }

  /**
   * Returns a variety of information about a single Tweet specified by the requested ID.
   * https://developer.x.com/en/docs/twitter-api/tweets/lookup/api-reference/get-tweets-id
   *
   * OAuth2 scope: `users.read`, `tweet.read`
   */
  public singleTweet(tweetId: string, options: Partial<Tweetv2FieldsParams> = {}) {
    return this.get<TweetV2SingleResult>('tweets/:id', options, { params: { id: tweetId } });
  }

  /**
   * Returns a variety of information about tweets specified by list of IDs.
   * https://developer.x.com/en/docs/twitter-api/tweets/lookup/api-reference/get-tweets
   *
   * OAuth2 scope: `users.read`, `tweet.read`
   */
  public tweets(tweetIds: string | string[], options: Partial<Tweetv2FieldsParams> = {}) {
    return this.get<TweetV2LookupResult>('tweets', { ids: tweetIds, ...options });
  }

  /**
   * The recent Tweet counts endpoint returns count of Tweets from the last seven days that match a search query.
   * OAuth2 Bearer auth only.
   * https://developer.x.com/en/docs/twitter-api/tweets/counts/api-reference/get-tweets-counts-recent
   */
  public tweetCountRecent(query: string, options: Partial<TweetV2CountParams> = {}) {
    return this.get<TweetV2CountResult>('tweets/counts/recent', { query, ...options });
  }

  /**
   * This endpoint is only available to those users who have been approved for the Academic Research product track.
   * The full-archive search endpoint returns the complete history of public Tweets matching a search query;
   * since the first Tweet was created March 26, 2006.
   * OAuth2 Bearer auth only.
   * **This endpoint has pagination, yet it is not supported by bundled paginators. Use `next_token` to fetch next page.**
   * https://developer.x.com/en/docs/twitter-api/tweets/counts/api-reference/get-tweets-counts-all
   */
  public tweetCountAll(query: string, options: Partial<TweetV2CountAllParams> = {}) {
    return this.get<TweetV2CountAllResult>('tweets/counts/all', { query, ...options });
  }

  /**
   * Allows you to get information about who has Retweeted a Tweet.
   * https://developer.x.com/en/docs/twitter-api/tweets/retweets/api-reference/get-tweets-id-retweeted_by
   */
  public tweetRetweetedBy(tweetId: string, options?: Partial<TweetRetweetedOrLikedByV2ParamsWithoutPaginator>): Promise<TweetV2RetweetedByResult>;
  public tweetRetweetedBy(tweetId: string, options: TweetRetweetedOrLikedByV2ParamsWithPaginator): Promise<TweetRetweetersUsersV2Paginator>;
  public async tweetRetweetedBy(tweetId: string, options: TweetRetweetedOrLikedByV2Params = {}) {
    const { asPaginator, ...parameters } = options;
    const initialRq = await this.get<TweetV2RetweetedByResult>('tweets/:id/retweeted_by', parameters as any, {
      fullResponse: true,
      params: { id: tweetId },
    });

    if (!asPaginator) {
      return initialRq.data;
    }

    return new TweetRetweetersUsersV2Paginator({
      realData: initialRq.data,
      rateLimit: initialRq.rateLimit!,
      instance: this,
      queryParams: parameters,
      sharedParams: { id: tweetId },
    });
  }

  /**
   * Allows you to get information about who has Liked a Tweet.
   * https://developer.x.com/en/docs/twitter-api/tweets/likes/api-reference/get-tweets-id-liking_users
   */
  public tweetLikedBy(tweetId: string, options?: Partial<TweetRetweetedOrLikedByV2ParamsWithoutPaginator>): Promise<TweetV2LikedByResult>;
  public tweetLikedBy(tweetId: string, options: TweetRetweetedOrLikedByV2ParamsWithPaginator): Promise<TweetLikingUsersV2Paginator>;
  public async tweetLikedBy(tweetId: string, options: TweetRetweetedOrLikedByV2Params = {}) {
    const { asPaginator, ...parameters } = options;
    const initialRq = await this.get<TweetV2LikedByResult>('tweets/:id/liking_users', parameters as any, {
      fullResponse: true,
      params: { id: tweetId },
    });

    if (!asPaginator) {
      return initialRq.data;
    }

    return new TweetLikingUsersV2Paginator({
      realData: initialRq.data,
      rateLimit: initialRq.rateLimit!,
      instance: this,
      queryParams: parameters,
      sharedParams: { id: tweetId },
    });
  }

  /**
   * Allows you to retrieve a collection of the most recent Tweets and Retweets posted by you and users you follow, also known as home timeline.
   * This endpoint returns up to the last 3200 Tweets.
   * https://developer.x.com/en/docs/twitter-api/tweets/timelines/api-reference/get-users-id-reverse-chronological
   *
   * OAuth 2 scopes: `tweet.read` `users.read`
   */
  public async homeTimeline(options: Partial<TweetV2HomeTimelineParams> = {}) {
    const meUser = await this.getCurrentUserV2Object();

    const initialRq = await this.get<TweetV2HomeTimelineResult>('users/:id/timelines/reverse_chronological', options, {
      fullResponse: true,
      params: { id: meUser.data.id },
    });

    return new TweetHomeTimelineV2Paginator({
      realData: initialRq.data,
      rateLimit: initialRq.rateLimit!,
      instance: this,
      queryParams: options,
      sharedParams: { id: meUser.data.id },
    });
  }

  /**
   * Returns Tweets composed by a single user, specified by the requested user ID.
   * By default, the most recent ten Tweets are returned per request.
   * Using pagination, the most recent 3,200 Tweets can be retrieved.
   * https://developer.x.com/en/docs/twitter-api/tweets/timelines/api-reference/get-users-id-tweets
   */
  public async userTimeline(userId: string, options: Partial<TweetV2UserTimelineParams> = {}) {
    const initialRq = await this.get<TweetV2UserTimelineResult>('users/:id/tweets', options, {
      fullResponse: true,
      params: { id: userId },
    });

    return new TweetUserTimelineV2Paginator({
      realData: initialRq.data,
      rateLimit: initialRq.rateLimit!,
      instance: this,
      queryParams: options,
      sharedParams: { id: userId },
    });
  }

  /**
   * Returns Tweets mentioning a single user specified by the requested user ID.
   * By default, the most recent ten Tweets are returned per request.
   * Using pagination, up to the most recent 800 Tweets can be retrieved.
   * https://developer.x.com/en/docs/twitter-api/tweets/timelines/api-reference/get-users-id-mentions
   */
  public async userMentionTimeline(userId: string, options: Partial<TweetV2PaginableTimelineParams> = {}) {
    const initialRq = await this.get<TweetV2UserTimelineResult>('users/:id/mentions', options, {
      fullResponse: true,
      params: { id: userId },
    });

    return new TweetUserMentionTimelineV2Paginator({
      realData: initialRq.data,
      rateLimit: initialRq.rateLimit!,
      instance: this,
      queryParams: options,
      sharedParams: { id: userId },
    });
  }

  /**
   * Returns Quote Tweets for a Tweet specified by the requested Tweet ID.
   * https://developer.x.com/en/docs/twitter-api/tweets/quote-tweets/api-reference/get-tweets-id-quote_tweets
   *
   * OAuth2 scopes: `users.read` `tweet.read`
   */
  public async quotes(tweetId: string, options: Partial<TweetV2QuoteTweetsParams> = {}) {
    const initialRq = await this.get<TweetV2PaginableTimelineResult>('tweets/:id/quote_tweets', options, {
      fullResponse: true,
      params: { id: tweetId },
    });

    return new QuotedTweetsTimelineV2Paginator({
      realData: initialRq.data,
      rateLimit: initialRq.rateLimit!,
      instance: this,
      queryParams: options,
      sharedParams: { id: tweetId },
    });
  }

  /* Bookmarks */

  /**
   * Allows you to get information about a authenticated user’s 800 most recent bookmarked Tweets.
   * https://developer.x.com/en/docs/twitter-api/tweets/bookmarks/api-reference/get-users-id-bookmarks
   *
   * OAuth2 scopes: `users.read` `tweet.read` `bookmark.read`
   */
  public async bookmarks(options: Partial<TweetV2PaginableTimelineParams> = {}) {
    const user = await this.getCurrentUserV2Object();
    const initialRq = await this.get<TweetV2PaginableTimelineResult>('users/:id/bookmarks', options, {
      fullResponse: true,
      params: { id: user.data.id },
    });

    return new TweetBookmarksTimelineV2Paginator({
      realData: initialRq.data,
      rateLimit: initialRq.rateLimit!,
      instance: this,
      queryParams: options,
      sharedParams: { id: user.data.id },
    });
  }

  /* Users */

  /**
   * Returns information about an authorized user.
   * https://developer.x.com/en/docs/twitter-api/users/lookup/api-reference/get-users-me
   *
   * OAuth2 scopes: `tweet.read` & `users.read`
   */
  public me(options: Partial<UsersV2Params> = {}) {
    return this.get<UserV2Result>('users/me', options);
  }

  /**
   * Returns a variety of information about a single user specified by the requested ID.
   * https://developer.x.com/en/docs/twitter-api/users/lookup/api-reference/get-users-id
   */
  public user(userId: string, options: Partial<UsersV2Params> = {}) {
    return this.get<UserV2Result>('users/:id', options, { params: { id: userId } });
  }

  /**
   * Returns a variety of information about one or more users specified by the requested IDs.
   * https://developer.x.com/en/docs/twitter-api/users/lookup/api-reference/get-users
   */
  public users(userIds: string | string[], options: Partial<UsersV2Params> = {}) {
    const ids = Array.isArray(userIds) ? userIds.join(',') : userIds;
    return this.get<UsersV2Result>('users', { ...options, ids });
  }

  /**
   * Returns a variety of information about a single user specified by their username.
   * https://developer.x.com/en/docs/twitter-api/users/lookup/api-reference/get-users-by-username-username
   */
  public userByUsername(username: string, options: Partial<UsersV2Params> = {}) {
    return this.get<UserV2Result>('users/by/username/:username', options, { params: { username } });
  }

  /**
   * Returns a variety of information about one or more users specified by their usernames.
   * https://developer.x.com/en/docs/twitter-api/users/lookup/api-reference/get-users-by
   *
   * OAuth2 scope: `users.read`, `tweet.read`
   */
  public usersByUsernames(usernames: string | string[], options: Partial<UsersV2Params> = {}) {
    usernames = Array.isArray(usernames) ? usernames.join(',') : usernames;
    return this.get<UsersV2Result>('users/by', { ...options, usernames });
  }

  /**
   * Returns a list of users who are followers of the specified user ID.
   * https://developer.x.com/en/docs/twitter-api/users/follows/api-reference/get-users-id-followers
   */
  public followers(userId: string, options?: Partial<FollowersV2ParamsWithoutPaginator>): Promise<UserV2TimelineResult>;
  public followers(userId: string, options: FollowersV2ParamsWithPaginator): Promise<UserFollowersV2Paginator>;
  public async followers(userId: string, options: FollowersV2Params = {}) {
    const { asPaginator, ...parameters } = options;
    const params = { id: userId };

    if (!asPaginator) {
      return this.get<UserV2TimelineResult>('users/:id/followers', parameters as Partial<UserV2TimelineParams>, { params });
    }

    const initialRq = await this.get<UserV2TimelineResult>('users/:id/followers', parameters as Partial<UserV2TimelineParams>, { fullResponse: true, params });

    return new UserFollowersV2Paginator({
      realData: initialRq.data,
      rateLimit: initialRq.rateLimit!,
      instance: this,
      queryParams: parameters as Partial<UserV2TimelineParams>,
      sharedParams: params,
    });
  }

  /**
   * Returns a list of users the specified user ID is following.
   * https://developer.x.com/en/docs/twitter-api/users/follows/api-reference/get-users-id-following
   *
   * OAuth2 scope: `follows.read`
   */
  public following(userId: string, options?: Partial<FollowersV2ParamsWithoutPaginator>): Promise<UserV2TimelineResult>;
  public following(userId: string, options: FollowersV2ParamsWithPaginator): Promise<UserFollowingV2Paginator>;
  public async following(userId: string, options: FollowersV2Params = {}) {
    const { asPaginator, ...parameters } = options;
    const params = { id: userId };

    if (!asPaginator) {
      return this.get<UserV2TimelineResult>('users/:id/following', parameters as Partial<UserV2TimelineParams>, { params });
    }

    const initialRq = await this.get<UserV2TimelineResult>('users/:id/following', parameters as Partial<UserV2TimelineParams>, { fullResponse: true, params });

    return new UserFollowingV2Paginator({
      realData: initialRq.data,
      rateLimit: initialRq.rateLimit!,
      instance: this,
      queryParams: parameters as Partial<UserV2TimelineParams>,
      sharedParams: params,
    });
  }

  /**
   * Allows you to get information about a user’s liked Tweets.
   * https://developer.x.com/en/docs/twitter-api/tweets/likes/api-reference/get-users-id-liked_tweets
   */
  public async userLikedTweets(userId: string, options: Partial<TweetV2PaginableListParams> = {}) {
    const params = { id: userId };
    const initialRq = await this.get<Tweetv2ListResult>('users/:id/liked_tweets', options, { fullResponse: true, params });

    return new TweetV2UserLikedTweetsPaginator({
      realData: initialRq.data,
      rateLimit: initialRq.rateLimit!,
      instance: this,
      queryParams: { ...options },
      sharedParams: params,
    });
  }

  /**
   * Returns a list of users who are blocked by the authenticating user.
   * https://developer.x.com/en/docs/twitter-api/users/blocks/api-reference/get-users-blocking
   */
  public async userBlockingUsers(userId: string, options: Partial<UserV2TimelineParams> = {}) {
    const params = { id: userId };
    const initialRq = await this.get<UserV2TimelineResult>('users/:id/blocking', options, { fullResponse: true, params });

    return new UserBlockingUsersV2Paginator({
      realData: initialRq.data,
      rateLimit: initialRq.rateLimit!,
      instance: this,
      queryParams: { ...options },
      sharedParams: params,
    });
  }

  /**
   * Returns a list of users who are muted by the authenticating user.
   * https://developer.x.com/en/docs/twitter-api/users/mutes/api-reference/get-users-muting
   */
  public async userMutingUsers(userId: string, options: Partial<UserV2TimelineParams> = {}) {
    const params = { id: userId };
    const initialRq = await this.get<UserV2TimelineResult>('users/:id/muting', options, { fullResponse: true, params });

    return new UserMutingUsersV2Paginator({
      realData: initialRq.data,
      rateLimit: initialRq.rateLimit!,
      instance: this,
      queryParams: { ...options },
      sharedParams: params,
    });
  }

  /* Lists */

  /**
   * Returns the details of a specified List.
   * https://developer.x.com/en/docs/twitter-api/lists/list-lookup/api-reference/get-lists-id
   */
  public list(id: string, options: Partial<GetListV2Params> = {}) {
    return this.get<ListGetV2Result>('lists/:id', options, { params: { id } });
  }

  /**
   * Returns all Lists owned by the specified user.
   * https://developer.x.com/en/docs/twitter-api/lists/list-lookup/api-reference/get-users-id-owned_lists
   */
  public async listsOwned(userId: string, options: Partial<GetListTimelineV2Params> = {}) {
    const params = { id: userId };
    const initialRq = await this.get<ListTimelineV2Result>('users/:id/owned_lists', options, { fullResponse: true, params });

    return new UserOwnedListsV2Paginator({
      realData: initialRq.data,
      rateLimit: initialRq.rateLimit!,
      instance: this,
      queryParams: { ...options },
      sharedParams: params,
    });
  }

  /**
   * Returns all Lists a specified user is a member of.
   * https://developer.x.com/en/docs/twitter-api/lists/list-members/api-reference/get-users-id-list_memberships
   */
  public async listMemberships(userId: string, options: Partial<GetListTimelineV2Params> = {}) {
    const params = { id: userId };
    const initialRq = await this.get<ListTimelineV2Result>('users/:id/list_memberships', options, { fullResponse: true, params });

    return new UserListMembershipsV2Paginator({
      realData: initialRq.data,
      rateLimit: initialRq.rateLimit!,
      instance: this,
      queryParams: { ...options },
      sharedParams: params,
    });
  }

  /**
   * Returns all Lists a specified user follows.
   * https://developer.x.com/en/docs/twitter-api/lists/list-follows/api-reference/get-users-id-followed_lists
   */
  public async listFollowed(userId: string, options: Partial<GetListTimelineV2Params> = {}) {
    const params = { id: userId };
    const initialRq = await this.get<ListTimelineV2Result>('users/:id/followed_lists', options, { fullResponse: true, params });

    return new UserListFollowedV2Paginator({
      realData: initialRq.data,
      rateLimit: initialRq.rateLimit!,
      instance: this,
      queryParams: { ...options },
      sharedParams: params,
    });
  }

  /**
   * Returns a list of Tweets from the specified List.
   * https://developer.x.com/en/docs/twitter-api/lists/list-tweets/api-reference/get-lists-id-tweets
   */
  public async listTweets(listId: string, options: Partial<TweetV2PaginableListParams> = {}) {
    const params = { id: listId };
    const initialRq = await this.get<Tweetv2ListResult>('lists/:id/tweets', options, { fullResponse: true, params });

    return new TweetV2ListTweetsPaginator({
      realData: initialRq.data,
      rateLimit: initialRq.rateLimit!,
      instance: this,
      queryParams: { ...options },
      sharedParams: params,
    });
  }

  /**
   * Returns a list of users who are members of the specified List.
   * https://developer.x.com/en/docs/twitter-api/lists/list-members/api-reference/get-lists-id-members
   */
  public async listMembers(listId: string, options: Partial<UserV2TimelineParams> = {}) {
    const params = { id: listId };
    const initialRq = await this.get<UserV2TimelineResult>('lists/:id/members', options, { fullResponse: true, params });

    return new UserListMembersV2Paginator({
      realData: initialRq.data,
      rateLimit: initialRq.rateLimit!,
      instance: this,
      queryParams: { ...options },
      sharedParams: params,
    });
  }

  /**
   * Returns a list of users who are followers of the specified List.
   * https://developer.x.com/en/docs/twitter-api/lists/list-follows/api-reference/get-lists-id-followers
   */
  public async listFollowers(listId: string, options: Partial<UserV2TimelineParams> = {}) {
    const params = { id: listId };
    const initialRq = await this.get<UserV2TimelineResult>('lists/:id/followers', options, { fullResponse: true, params });

    return new UserListFollowersV2Paginator({
      realData: initialRq.data,
      rateLimit: initialRq.rateLimit!,
      instance: this,
      queryParams: { ...options },
      sharedParams: params,
    });
  }

  /* Direct messages */

  /**
   * Returns a list of Direct Messages for the authenticated user, both sent and received.
   * Direct Message events are returned in reverse chronological order.
   * Supports retrieving events from the previous 30 days.
   *
   * OAuth 2 scopes: `dm.read`, `tweet.read`, `user.read`
   *
   * https://developer.x.com/en/docs/twitter-api/direct-messages/lookup/api-reference/get-dm_events
   */
  public async listDmEvents(options: Partial<GetDMEventV2Params> = {}) {
    const initialRq = await this.get<GetDMEventV2Result>('dm_events', options, { fullResponse: true });

    return new FullDMTimelineV2Paginator({
      realData: initialRq.data,
      rateLimit: initialRq.rateLimit!,
      instance: this,
      queryParams: { ...options },
    });
  }

  /**
   * Returns a list of Direct Messages (DM) events within a 1-1 conversation with the user specified in the participant_id path parameter.
   * Messages are returned in reverse chronological order.
   *
   * OAuth 2 scopes: `dm.read`, `tweet.read`, `user.read`
   *
   * https://developer.x.com/en/docs/twitter-api/direct-messages/lookup/api-reference/get-dm_conversations-dm_conversation_id-dm_events
   */
  public async listDmEventsWithParticipant(participantId: string, options: Partial<GetDMEventV2Params> = {}) {
    const params = { participant_id: participantId };
    const initialRq = await this.get<GetDMEventV2Result>('dm_conversations/with/:participant_id/dm_events', options, { fullResponse: true, params });

    return new OneToOneDMTimelineV2Paginator({
      realData: initialRq.data,
      rateLimit: initialRq.rateLimit!,
      instance: this,
      queryParams: { ...options },
      sharedParams: params,
    });
  }

  /**
   * Returns a list of Direct Messages within a conversation specified in the dm_conversation_id path parameter.
   * Messages are returned in reverse chronological order.
   *
   * OAuth 2 scopes: `dm.read`, `tweet.read`, `user.read`
   *
   * https://developer.x.com/en/docs/twitter-api/direct-messages/lookup/api-reference/get-dm_conversations-dm_conversation_id-dm_events
   */
  public async listDmEventsOfConversation(dmConversationId: string, options: Partial<GetDMEventV2Params> = {}) {
    const params = { dm_conversation_id: dmConversationId };
    const initialRq = await this.get<GetDMEventV2Result>('dm_conversations/:dm_conversation_id/dm_events', options, { fullResponse: true, params });

    return new ConversationDMTimelineV2Paginator({
      realData: initialRq.data,
      rateLimit: initialRq.rateLimit!,
      instance: this,
      queryParams: { ...options },
      sharedParams: params,
    });
  }

  /* Spaces */

  /**
   * Get a single space by ID.
   * https://developer.x.com/en/docs/twitter-api/spaces/lookup/api-reference/get-spaces-id
   *
   * OAuth2 scopes: `tweet.read`, `users.read`, `space.read`.
   */
  public space(spaceId: string, options: Partial<SpaceV2FieldsParams> = {}) {
    return this.get<SpaceV2SingleResult>('spaces/:id', options, { params: { id: spaceId } });
  }

  /**
   * Get spaces using their IDs.
   * https://developer.x.com/en/docs/twitter-api/spaces/lookup/api-reference/get-spaces
   *
   * OAuth2 scopes: `tweet.read`, `users.read`, `space.read`.
   */
  public spaces(spaceIds: string | string[], options: Partial<SpaceV2FieldsParams> = {}) {
    return this.get<SpaceV2LookupResult>('spaces', { ids: spaceIds, ...options });
  }

  /**
   * Get spaces using their creator user ID(s). (no pagination available)
   * https://developer.x.com/en/docs/twitter-api/spaces/lookup/api-reference/get-spaces-by-creator-ids
   *
   * OAuth2 scopes: `tweet.read`, `users.read`, `space.read`.
   */
  public spacesByCreators(creatorIds: string | string[], options: Partial<SpaceV2CreatorLookupParams> = {}) {
    return this.get<SpaceV2LookupResult>('spaces/by/creator_ids', { user_ids: creatorIds, ...options });
  }

  /**
   * Search through spaces using multiple params. (no pagination available)
   * https://developer.x.com/en/docs/twitter-api/spaces/search/api-reference/get-spaces-search
   */
  public searchSpaces(options: SpaceV2SearchParams) {
    return this.get<SpaceV2LookupResult>('spaces/search', options as Partial<SpaceV2SearchParams>);
  }

   /**
   * Returns a list of user who purchased a ticket to the requested Space.
   * You must authenticate the request using the Access Token of the creator of the requested Space.
   *
   * **OAuth 2.0 Access Token required**
   *
   * https://developer.x.com/en/docs/twitter-api/spaces/lookup/api-reference/get-spaces-id-buyers
   *
   * OAuth2 scopes: `tweet.read`, `users.read`, `space.read`.
   */
  public spaceBuyers(spaceId: string, options: Partial<SpaceV2BuyersParams> = {}) {
    return this.get<SpaceV2BuyersResult>('spaces/:id/buyers', options, { params: { id: spaceId } });
  }

  /**
   * Returns Tweets shared in the requested Spaces.
   * https://developer.x.com/en/docs/twitter-api/spaces/lookup/api-reference/get-spaces-id-tweets
   *
   * OAuth2 scope: `users.read`, `tweet.read`, `space.read`
   */
  public spaceTweets(spaceId: string, options: Partial<Tweetv2FieldsParams> = {}) {
    return this.get<TweetV2LookupResult>('spaces/:id/tweets', options, { params: { id: spaceId } });
  }

  /* Streaming API */

  /**
   * Streams Tweets in real-time based on a specific set of filter rules.
   * https://developer.x.com/en/docs/twitter-api/tweets/filtered-stream/api-reference/get-tweets-search-stream
   */
  public searchStream(options?: Partial<TweetSearchV2StreamParams> & { autoConnect?: true }): Promise<TweetStream<TweetV2SingleStreamResult>>;
  public searchStream(options: Partial<TweetSearchV2StreamParams> & { autoConnect: false }): TweetStream<TweetV2SingleStreamResult>;
  public searchStream(options?: Partial<TweetSearchV2StreamParams> & { autoConnect?: boolean }): PromiseOrType<TweetStream<TweetV2SingleStreamResult>>;

  public searchStream({ autoConnect, ...options }: Partial<TweetSearchV2StreamParams> & { autoConnect?: boolean } = {}) {
    return this.getStream<TweetV2SingleStreamResult>('tweets/search/stream', options as any, { payloadIsError: isTweetStreamV2ErrorPayload, autoConnect });
  }

  /**
   * Return a list of rules currently active on the streaming endpoint, either as a list or individually.
   * https://developer.x.com/en/docs/twitter-api/tweets/filtered-stream/api-reference/get-tweets-search-stream-rules
   */
  public streamRules(options: Partial<StreamingV2GetRulesParams> = {}) {
    return this.get<StreamingV2GetRulesResult>('tweets/search/stream/rules', options);
  }

  /**
   * Add or delete rules to your stream.
   * To create one or more rules, submit an add JSON body with an array of rules and operators.
   * Similarly, to delete one or more rules, submit a delete JSON body with an array of list of existing rule IDs.
   * https://developer.x.com/en/docs/twitter-api/tweets/filtered-stream/api-reference/post-tweets-search-stream-rules
   */
  public updateStreamRules(options: StreamingV2AddRulesParams, query?: Partial<StreamingV2UpdateRulesQuery>): Promise<StreamingV2UpdateRulesAddResult>;
  public updateStreamRules(options: StreamingV2DeleteRulesParams, query?: Partial<StreamingV2UpdateRulesQuery>): Promise<StreamingV2UpdateRulesDeleteResult>;
  public updateStreamRules(options: StreamingV2UpdateRulesParams, query: Partial<StreamingV2UpdateRulesQuery> = {}) {
    return this.post<StreamingV2UpdateRulesResult>(
      'tweets/search/stream/rules',
      options,
      { query },
    );
  }

  /**
   * Streams about 1% of all Tweets in real-time.
   * https://developer.x.com/en/docs/twitter-api/tweets/volume-streams/api-reference/get-tweets-sample-stream
   *
   * **Note**: X only allows this on Enterprise plans.
   */
  public sampleStream(options?: Partial<Tweetv2FieldsParams> & { autoConnect?: true }): Promise<TweetStream<TweetV2SingleResult>>;
  public sampleStream(options: Partial<Tweetv2FieldsParams> & { autoConnect: false }): TweetStream<TweetV2SingleResult>;
  public sampleStream(options?: Partial<Tweetv2FieldsParams> & { autoConnect?: boolean }): PromiseOrType<TweetStream<TweetV2SingleResult>>;

  public sampleStream({ autoConnect, ...options }: Partial<Tweetv2FieldsParams> & { autoConnect?: boolean } = {}) {
    return this.getStream<TweetV2SingleResult>('tweets/sample/stream', options as any, { payloadIsError: isTweetStreamV2ErrorPayload, autoConnect });
  }

  /**
   * Streams about 10% of all Tweets in real-time.
   * https://developer.x.com/en/docs/twitter-api/tweets/volume-streams/api-reference/get-tweets-sample10-stream
   *
   * **Note**: X only allows this on Enterprise plans.
   */
  public sample10Stream(options?: Partial<Tweetv2FieldsParams> & { autoConnect?: true }): Promise<TweetStream<TweetV2SingleResult>>;
  public sample10Stream(options: Partial<Tweetv2FieldsParams> & { autoConnect: false }): TweetStream<TweetV2SingleResult>;
  public sample10Stream(options?: Partial<Tweetv2FieldsParams> & { autoConnect?: boolean }): PromiseOrType<TweetStream<TweetV2SingleResult>>;

  public sample10Stream({ autoConnect, ...options }: Partial<Tweetv2FieldsParams> & { autoConnect?: boolean } = {}) {
    return this.getStream<TweetV2SingleResult>('tweets/sample10/stream', options as any, { payloadIsError: isTweetStreamV2ErrorPayload, autoConnect });
  }

  /* Batch compliance */

  /**
   * Returns a list of recent compliance jobs.
   * https://developer.x.com/en/docs/twitter-api/compliance/batch-compliance/api-reference/get-compliance-jobs
   */
  public complianceJobs(options: BatchComplianceSearchV2Params) {
    return this.get<BatchComplianceListV2Result>('compliance/jobs', options as Partial<BatchComplianceSearchV2Params>);
  }

  /**
   * Get a single compliance job with the specified ID.
   * https://developer.x.com/en/docs/twitter-api/compliance/batch-compliance/api-reference/get-compliance-jobs-id
   */
  public complianceJob(jobId: string) {
    return this.get<BatchComplianceV2Result>('compliance/jobs/:id', undefined, { params: { id: jobId } });
  }

  /**
   * Creates a new compliance job for Tweet IDs or user IDs, send your file, await result and parse it into an array.
   * You can run one batch job at a time. Returns the created job, but **not the job result!**.
   *
   * You can obtain the result (**after job is completed**) with `.complianceJobResult`.
   * https://developer.x.com/en/docs/twitter-api/compliance/batch-compliance/api-reference/post-compliance-jobs
   */
  public async sendComplianceJob(jobParams: BatchComplianceV2Params) {
    const job = await this.post<BatchComplianceV2Result>('compliance/jobs', { type: jobParams.type, name: jobParams.name });

    // Send the IDs
    const rawIdsBody = jobParams.ids instanceof Buffer ? jobParams.ids : Buffer.from(jobParams.ids.join('\n'));
    // Upload the IDs
    await this.put<void>(job.data.upload_url, rawIdsBody, {
      forceBodyMode: 'raw',
      enableAuth: false,
      headers: { 'Content-Type': 'text/plain' },
      prefix: '',
    });

    return job;
  }

  /**
   * Get the result of a running or completed job, obtained through `.complianceJob`, `.complianceJobs` or `.sendComplianceJob`.
   * If job is still running (`in_progress`), it will await until job is completed. **This could be quite long!**
   * https://developer.x.com/en/docs/twitter-api/compliance/batch-compliance/api-reference/post-compliance-jobs
   */
  public async complianceJobResult(job: BatchComplianceJobV2) {
    let runningJob = job;
    while (runningJob.status !== 'complete') {
      if (runningJob.status === 'expired' || runningJob.status === 'failed') {
        throw new Error('Job failed to be completed.');
      }

      await new Promise(resolve => setTimeout(resolve, 3500));
      runningJob = (await this.complianceJob(job.id)).data;
    }

    // Download and parse result
    const result = await this.get<string>(job.download_url, undefined, {
      enableAuth: false,
      prefix: '',
    });

    return result
      .trim()
      .split('\n')
      .filter(line => line)
      .map(line => JSON.parse(line)) as BatchComplianceV2JobResult[];
  }

  /* Usage */

  /**
   * Allows you to retrieve your project usage.
   *
   * https://developer.x.com/en/docs/x-api/usage/tweets/introduction
   */
  public async usage(options: Partial<TweetUsageV2Params> = {}) {
    return this.get<TweetV2UsageResult>('usage/tweets', options);
  }

  /**
   * Returns a variety of information about a single Community specified by ID.
   * https://docs.x.com/x-api/communities/communities-lookup-by-community-id
   */
  public community(communityId: string, options: Partial<CommunityByIDV2Params> = {}) {
    return this.get<CommunityV2Result>('communities/:id', options, { params: { id: communityId } });
  }

  /**
   * Search for Communities based on keywords.
   * https://docs.x.com/x-api/communities/search-communities
   */
  public searchCommunities(query: string, options: Partial<CommunitySearchV2Params> = {}) {
    return this.get<CommunitiesV2Result>('communities/search', { query, ...options });
  }
}
