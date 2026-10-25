import TwitterApiSubClient from '../client.subclient';
import { API_V1_1_PREFIX, API_V1_1_STREAM_PREFIX, API_V1_1_UPLOAD_PREFIX } from '../globals';
import { arrayWrap } from '../helpers';
import TwitterApiv1 from '../v1/client.v1';
import {
  FilterStreamV1Params,
  SampleStreamV1Params,
  UserV1,
  VerifyCredentialsV1Params,
  AppRateLimitV1Result,
  TAppRateLimitResourceV1,
  HelpLanguageV1Result,
  ReverseGeoCodeV1Params,
  ReverseGeoCodeV1Result,
  PlaceV1,
  SearchGeoV1Params,
  SearchGeoV1Result,
  TrendMatchV1,
  TrendsPlaceV1Params,
  TrendLocationV1,
  TweetV1TimelineParams,
  TweetV1TimelineResult,
  TweetV1UserTimelineParams,
  TweetV1,
  MediaStatusV1Result,
  OembedTweetV1Params,
  OembedTweetV1Result,
  MuteUserListV1Result,
  MuteUserListV1Params,
  MuteUserIdsV1Result,
  MuteUserIdsV1Params,
  UserFollowerIdsV1Params,
  UserFollowerIdsV1Result,
  UserFollowingsIdsV1Params,
  UserFollowingIdsV1Result,
  UserFriendListV1Params,
  UserFriendListV1Result,
  UserFollowerListV1Params,
  UserFollowerListV1Result,
  UserSearchV1Params,
  AccountSettingsV1,
  ProfileBannerSizeV1,
  ProfileBannerSizeV1Params,
  FriendshipLookupV1Params,
  FriendshipLookupV1,
  FriendshipShowV1Params,
  FriendshipV1,
  FriendshipsIncomingV1Params,
  FriendshipsIncomingV1Result,
  UserShowV1Params,
  UserLookupV1Params,
  TweetShowV1Params,
  TweetLookupV1Params,
  TweetLookupNoMapV1Params,
  TweetLookupMapV1Params,
  TweetLookupMapV1Result,
  ListListsV1Params,
  ListV1,
  ListMembersV1Params,
  DoubleEndedUsersCursorV1Result,
  ListMemberShowV1Params,
  ListMembershipsV1Params,
  DoubleEndedListsCursorV1Result,
  ListOwnershipsV1Params,
  GetListV1Params,
  ListStatusesV1Params,
  ListSubscriptionsV1Params,
} from '../types';
import { HomeTimelineV1Paginator, ListTimelineV1Paginator, MentionTimelineV1Paginator, UserFavoritesV1Paginator, UserTimelineV1Paginator } from '../paginators/tweet.paginator.v1';
import { MuteUserIdsV1Paginator, MuteUserListV1Paginator } from '../paginators/mutes.paginator.v1';
import { UserFollowerIdsV1Paginator, UserFollowerListV1Paginator } from '../paginators/followers.paginator.v1';
import { UserFollowersIdsV1Paginator, UserFriendListV1Paginator } from '../paginators/friends.paginator.v1';
import { FriendshipsIncomingV1Paginator, FriendshipsOutgoingV1Paginator, UserSearchV1Paginator } from '../paginators/user.paginator.v1';
import { ListMembershipsV1Paginator, ListMembersV1Paginator, ListOwnershipsV1Paginator, ListSubscribersV1Paginator, ListSubscriptionsV1Paginator } from '../paginators/list.paginator.v1';
import TweetStream from '../stream/TweetStream';
import { PromiseOrType } from '../types/shared.types';

/**
 * Base Twitter v1 client with only read right.
 */
export default class TwitterApiv1ReadOnly extends TwitterApiSubClient {
  protected _prefix = API_V1_1_PREFIX;

  /* Tweets */

  /**
   * Returns a single Tweet, specified by the id parameter. The Tweet's author will also be embedded within the Tweet.
   * https://developer.x.com/en/docs/twitter-api/v1/tweets/post-and-engage/api-reference/get-statuses-show-id
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.singleTweet()` instead.
   */
  public singleTweet(tweetId: string, options: Partial<TweetShowV1Params> = {}) {
    return this.get<TweetV1>('statuses/show.json', { tweet_mode: 'extended', id: tweetId, ...options });
  }

  /**
   * Returns fully-hydrated Tweet objects for up to 100 Tweets per request.
   * https://developer.x.com/en/docs/twitter-api/v1/tweets/post-and-engage/api-reference/get-statuses-lookup
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.tweets()` instead.
   */
  public tweets(ids: string | string[], options?: TweetLookupNoMapV1Params): Promise<TweetV1[]>;
  /** @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.tweets()` instead. */
  public tweets(ids: string | string[], options: TweetLookupMapV1Params): Promise<TweetLookupMapV1Result>;
  public tweets(ids: string | string[], options: Partial<TweetLookupV1Params> = {}) {
    return this.post<TweetV1[] | TweetLookupMapV1Result>('statuses/lookup.json', { tweet_mode: 'extended', id: ids, ...options });
  }

  /**
   * Returns a single Tweet, specified by either a Tweet web URL or the Tweet ID, in an oEmbed-compatible format.
   * The returned HTML snippet will be automatically recognized as an Embedded Tweet when Twitter's widget JavaScript is included on the page.
   * https://developer.x.com/en/docs/twitter-api/v1/tweets/post-and-engage/api-reference/get-statuses-oembed
   */
  public oembedTweet(tweetId: string, options: Partial<OembedTweetV1Params> = {}) {
    return this.get<OembedTweetV1Result>(
      'oembed',
      {
        url: `https://x.com/i/statuses/${tweetId}`,
        ...options,
      },
      { prefix: 'https://publish.x.com/' },
    );
  }

  /* Tweets timelines */

  /**
   * Returns a collection of the most recent Tweets and Retweets posted by the authenticating user and the users they follow.
   * The home timeline is central to how most users interact with the Twitter service.
   * https://developer.x.com/en/docs/twitter-api/v1/tweets/timelines/api-reference/get-statuses-home_timeline
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.homeTimeline()` instead.
   */
  public async homeTimeline(options: Partial<TweetV1TimelineParams> = {}) {
    const queryParams: Partial<TweetV1TimelineParams> = {
      tweet_mode: 'extended',
      ...options,
    };
    const initialRq = await this.get<TweetV1TimelineResult>('statuses/home_timeline.json', queryParams, { fullResponse: true });

    return new HomeTimelineV1Paginator({
      realData: initialRq.data,
      rateLimit: initialRq.rateLimit!,
      instance: this,
      queryParams,
    });
  }

  /**
   * Returns the 20 most recent mentions (Tweets containing a users's @screen_name) for the authenticating user.
   * The timeline returned is the equivalent of the one seen when you view your mentions on x.com.
   * https://developer.x.com/en/docs/twitter-api/v1/tweets/timelines/api-reference/get-statuses-mentions_timeline
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.userMentionTimeline()` instead.
   */
  public async mentionTimeline(options: Partial<TweetV1TimelineParams> = {}) {
    const queryParams: Partial<TweetV1TimelineParams> = {
      tweet_mode: 'extended',
      ...options,
    };
    const initialRq = await this.get<TweetV1TimelineResult>('statuses/mentions_timeline.json', queryParams, { fullResponse: true });

    return new MentionTimelineV1Paginator({
      realData: initialRq.data,
      rateLimit: initialRq.rateLimit!,
      instance: this,
      queryParams,
    });
  }

  /**
   * Returns a collection of the most recent Tweets posted by the user indicated by the user_id parameters.
   * User timelines belonging to protected users may only be requested when the authenticated user either "owns" the timeline or is an approved follower of the owner.
   * https://developer.x.com/en/docs/twitter-api/v1/tweets/timelines/api-reference/get-statuses-user_timeline
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.userTimeline()` instead.
   */
  public async userTimeline(userId: string, options: Partial<TweetV1UserTimelineParams> = {}) {
    const queryParams: Partial<TweetV1UserTimelineParams> = {
      tweet_mode: 'extended',
      user_id: userId,
      ...options,
    };
    const initialRq = await this.get<TweetV1TimelineResult>('statuses/user_timeline.json', queryParams, { fullResponse: true });

    return new UserTimelineV1Paginator({
      realData: initialRq.data,
      rateLimit: initialRq.rateLimit!,
      instance: this,
      queryParams,
    });
  }

  /**
   * Returns a collection of the most recent Tweets posted by the user indicated by the screen_name parameters.
   * User timelines belonging to protected users may only be requested when the authenticated user either "owns" the timeline or is an approved follower of the owner.
   * https://developer.x.com/en/docs/twitter-api/v1/tweets/timelines/api-reference/get-statuses-user_timeline
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.userByUsername()` then `v2.userTimeline()` instead.
   */
  public async userTimelineByUsername(username: string, options: Partial<TweetV1UserTimelineParams> = {}) {
    const queryParams: Partial<TweetV1UserTimelineParams> = {
      tweet_mode: 'extended',
      screen_name: username,
      ...options,
    };
    const initialRq = await this.get<TweetV1TimelineResult>('statuses/user_timeline.json', queryParams, { fullResponse: true });

    return new UserTimelineV1Paginator({
      realData: initialRq.data,
      rateLimit: initialRq.rateLimit!,
      instance: this,
      queryParams,
    });
  }

  /**
   * Returns the most recent Tweets liked by the authenticating or specified user, 20 tweets by default.
   * Note: favorites are now known as likes.
   * https://developer.x.com/en/docs/twitter-api/v1/tweets/post-and-engage/api-reference/get-favorites-list
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.userLikedTweets()` instead.
   */
  public async favoriteTimeline(userId: string, options: Partial<TweetV1UserTimelineParams> = {}) {
    const queryParams: Partial<TweetV1UserTimelineParams> = {
      tweet_mode: 'extended',
      user_id: userId,
      ...options,
    };
    const initialRq = await this.get<TweetV1TimelineResult>('favorites/list.json', queryParams, { fullResponse: true });

    return new UserFavoritesV1Paginator({
      realData: initialRq.data,
      rateLimit: initialRq.rateLimit!,
      instance: this,
      queryParams,
    });
  }

  /**
   * Returns the most recent Tweets liked by the authenticating or specified user, 20 tweets by default.
   * Note: favorites are now known as likes.
   * https://developer.x.com/en/docs/twitter-api/v1/tweets/post-and-engage/api-reference/get-favorites-list
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.userByUsername()` then `v2.userLikedTweets()` instead.
   */
  public async favoriteTimelineByUsername(username: string, options: Partial<TweetV1UserTimelineParams> = {}) {
    const queryParams: Partial<TweetV1UserTimelineParams> = {
      tweet_mode: 'extended',
      screen_name: username,
      ...options,
    };
    const initialRq = await this.get<TweetV1TimelineResult>('favorites/list.json', queryParams, { fullResponse: true });

    return new UserFavoritesV1Paginator({
      realData: initialRq.data,
      rateLimit: initialRq.rateLimit!,
      instance: this,
      queryParams,
    });
  }

  /* Users */

  /**
   * Returns a variety of information about the user specified by the required user_id or screen_name parameter.
   * The author's most recent Tweet will be returned inline when possible.
   * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/follow-search-get-users/api-reference/get-users-show
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.user()` or `v2.userByUsername()` instead.
   */
  public user(user: UserShowV1Params) {
    return this.get<UserV1>('users/show.json', { tweet_mode: 'extended', ...user });
  }

  /**
   * Returns fully-hydrated user objects for up to 100 users per request,
   * as specified by comma-separated values passed to the user_id and/or screen_name parameters.
   * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/follow-search-get-users/api-reference/get-users-lookup
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.users()` or `v2.usersByUsernames()` instead.
   */
  public users(query: UserLookupV1Params) {
    return this.get<UserV1[]>('users/lookup.json', { tweet_mode: 'extended', ...query });
  }

  /**
   * Returns an HTTP 200 OK response code and a representation of the requesting user if authentication was successful;
   * returns a 401 status code and an error message if not.
   * Use this method to test if supplied user credentials are valid.
   * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/manage-account-settings/api-reference/get-account-verify_credentials
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.me()` instead.
   */
  public verifyCredentials(options: Partial<VerifyCredentialsV1Params> = {}) {
    return this.get<UserV1>('account/verify_credentials.json', options);
  }

  /**
   * Returns an array of user objects the authenticating user has muted.
   * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/mute-block-report-users/api-reference/get-mutes-users-list
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.userMutingUsers()` instead.
   */
  public async listMutedUsers(options: Partial<MuteUserListV1Params> = {}) {
    const queryParams: Partial<MuteUserListV1Params> = {
      tweet_mode: 'extended',
      ...options,
    };
    const initialRq = await this.get<MuteUserListV1Result>('mutes/users/list.json', queryParams, { fullResponse: true });

    return new MuteUserListV1Paginator({
      realData: initialRq.data,
      rateLimit: initialRq.rateLimit!,
      instance: this,
      queryParams,
    });
  }

  /**
   * Returns an array of numeric user ids the authenticating user has muted.
   * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/mute-block-report-users/api-reference/get-mutes-users-ids
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.userMutingUsers()` instead.
   */
  public async listMutedUserIds(options: Partial<MuteUserIdsV1Params> = {}) {
    const queryParams: Partial<MuteUserIdsV1Params> = {
      stringify_ids: true,
      ...options,
    };
    const initialRq = await this.get<MuteUserIdsV1Result>('mutes/users/ids.json', queryParams, { fullResponse: true });

    return new MuteUserIdsV1Paginator({
      realData: initialRq.data,
      rateLimit: initialRq.rateLimit!,
      instance: this,
      queryParams,
    });
  }

  /**
   * Returns an array of user objects of friends of the specified user.
   * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/follow-search-get-users/api-reference/get-friends-list
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.following()` instead.
   */
   public async userFriendList(options: Partial<UserFriendListV1Params> = {}) {
    const queryParams: Partial<UserFriendListV1Params> = {
      ...options,
    };
    const initialRq = await this.get<UserFriendListV1Result>('friends/list.json', queryParams, { fullResponse: true });

    return new UserFriendListV1Paginator({
      realData: initialRq.data,
      rateLimit: initialRq.rateLimit!,
      instance: this,
      queryParams,
    });
  }

  /**
   * Returns an array of user objects of followers of the specified user.
   * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/follow-search-get-users/api-reference/get-followers-list
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.followers()` instead.
   */
   public async userFollowerList(options: Partial<UserFollowerListV1Params> = {}) {
    const queryParams: Partial<UserFollowerListV1Params> = {
      ...options,
    };
    const initialRq = await this.get<UserFollowerListV1Result>('followers/list.json', queryParams, { fullResponse: true });

    return new UserFollowerListV1Paginator({
      realData: initialRq.data,
      rateLimit: initialRq.rateLimit!,
      instance: this,
      queryParams,
    });
  }

  /**
   * Returns an array of numeric user ids of followers of the specified user.
   * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/follow-search-get-users/api-reference/get-followers-ids
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.followers()` instead.
   */
  public async userFollowerIds(options: Partial<UserFollowerIdsV1Params> = {}) {
    const queryParams: Partial<UserFollowerIdsV1Params> = {
      stringify_ids: true,
      ...options,
    };
    const initialRq = await this.get<UserFollowerIdsV1Result>('followers/ids.json', queryParams, { fullResponse: true });

    return new UserFollowerIdsV1Paginator({
      realData: initialRq.data,
      rateLimit: initialRq.rateLimit!,
      instance: this,
      queryParams,
    });
  }

  /**
   * Returns an array of numeric user ids of friends of the specified user.
   * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/follow-search-get-users/api-reference/get-friends-ids
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.following()` instead.
   */
  public async userFollowingIds(options: Partial<UserFollowingsIdsV1Params> = {}) {
    const queryParams: Partial<UserFollowingsIdsV1Params> = {
      stringify_ids: true,
      ...options,
    };
    const initialRq = await this.get<UserFollowingIdsV1Result>('friends/ids.json', queryParams, { fullResponse: true });

    return new UserFollowersIdsV1Paginator({
      realData: initialRq.data,
      rateLimit: initialRq.rateLimit!,
      instance: this,
      queryParams,
    });
  }

  /**
   * Provides a simple, relevance-based search interface to public user accounts on Twitter.
   * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/follow-search-get-users/api-reference/get-users-search
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.searchUsers()` instead.
   */
  public async searchUsers(query: string, options: Partial<UserSearchV1Params> = {}) {
    const queryParams: Partial<UserSearchV1Params> = {
      q: query,
      tweet_mode: 'extended',
      page: 1,
      ...options,
    };
    const initialRq = await this.get<UserV1[]>('users/search.json', queryParams, { fullResponse: true });

    return new UserSearchV1Paginator({
      realData: initialRq.data,
      rateLimit: initialRq.rateLimit!,
      instance: this,
      queryParams,
    });
  }

  /* Friendship API */

  /**
   * Returns detailed information about the relationship between two arbitrary users.
   * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/follow-search-get-users/api-reference/get-friendships-show
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
   */
  public friendship(sources: FriendshipShowV1Params) {
    return this.get<FriendshipV1>('friendships/show.json', sources as Partial<FriendshipShowV1Params>);
  }

  /**
   * Returns the relationships of the authenticating user to the comma-separated list of up to 100 screen_names or user_ids provided.
   * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/follow-search-get-users/api-reference/get-friendships-lookup
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
   */
  public friendships(friendships: FriendshipLookupV1Params) {
    return this.get<FriendshipLookupV1[]>('friendships/lookup.json', friendships as Partial<FriendshipLookupV1Params>);
  }

  /**
   * Returns a collection of user_ids that the currently authenticated user does not want to receive retweets from.
   * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/follow-search-get-users/api-reference/get-friendships-no_retweets-ids
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
   */
  public friendshipsNoRetweets() {
    return this.get<string[]>('friendships/no_retweets/ids.json', { stringify_ids: true });
  }

  /**
   * Returns a collection of numeric IDs for every user who has a pending request to follow the authenticating user.
   * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/follow-search-get-users/api-reference/get-friendships-incoming
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
   */
  public async friendshipsIncoming(options: Partial<FriendshipsIncomingV1Params> = {}) {
    const queryParams: Partial<FriendshipsIncomingV1Params> = {
      stringify_ids: true,
      ...options,
    };
    const initialRq = await this.get<FriendshipsIncomingV1Result>('friendships/incoming.json', queryParams, { fullResponse: true });

    return new FriendshipsIncomingV1Paginator({
      realData: initialRq.data,
      rateLimit: initialRq.rateLimit!,
      instance: this,
      queryParams,
    });
  }

  /**
   * Returns a collection of numeric IDs for every protected user for whom the authenticating user has a pending follow request.
   * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/follow-search-get-users/api-reference/get-friendships-outgoing
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
   */
  public async friendshipsOutgoing(options: Partial<FriendshipsIncomingV1Params> = {}) {
    const queryParams: Partial<FriendshipsIncomingV1Params> = {
      stringify_ids: true,
      ...options,
    };
    const initialRq = await this.get<FriendshipsIncomingV1Result>('friendships/outgoing.json', queryParams, { fullResponse: true });

    return new FriendshipsOutgoingV1Paginator({
      realData: initialRq.data,
      rateLimit: initialRq.rateLimit!,
      instance: this,
      queryParams,
    });
  }

  /* Account/user API */

  /**
   * Get current account settings for authenticating user.
   * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/manage-account-settings/api-reference/get-account-settings
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
   */
  public accountSettings() {
    return this.get<AccountSettingsV1>('account/settings.json');
  }

  /**
   * Returns a map of the available size variations of the specified user's profile banner.
   * If the user has not uploaded a profile banner, a HTTP 404 will be served instead.
   * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/manage-account-settings/api-reference/get-users-profile_banner
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
   */
  public userProfileBannerSizes(params: ProfileBannerSizeV1Params) {
    return this.get<ProfileBannerSizeV1>('users/profile_banner.json', params);
  }

  /* Lists */

  /**
   * Returns the specified list. Private lists will only be shown if the authenticated user owns the specified list.
   * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/create-manage-lists/api-reference/get-lists-show
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.list()` instead.
   */
  public list(options: GetListV1Params) {
    return this.get<ListV1>('lists/show.json', { tweet_mode: 'extended', ...options });
  }

  /**
   * Returns all lists the authenticating or specified user subscribes to, including their own.
   * If no user is given, the authenticating user is used.
   * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/create-manage-lists/api-reference/get-lists-list
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.listsOwned()` or `v2.listFollowed()` instead.
   */
  public lists(options: ListListsV1Params = {}) {
    return this.get<ListV1[]>('lists/list.json', { tweet_mode: 'extended', ...options });
  }

  /**
   * Returns the members of the specified list. Private list members will only be shown if the authenticated user owns the specified list.
   * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/create-manage-lists/api-reference/get-lists-members
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.listMembers()` instead.
   */
  public async listMembers(options: Partial<ListMembersV1Params> = {}) {
    const queryParams: Partial<ListMembersV1Params> = {
      tweet_mode: 'extended',
      ...options,
    };
    const initialRq = await this.get<DoubleEndedUsersCursorV1Result>('lists/members.json', queryParams, { fullResponse: true });

    return new ListMembersV1Paginator({
      realData: initialRq.data,
      rateLimit: initialRq.rateLimit!,
      instance: this,
      queryParams,
    });
  }

  /**
   * Check if the specified user is a member of the specified list.
   * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/create-manage-lists/api-reference/get-lists-members-show
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
   */
  public listGetMember(options: ListMemberShowV1Params) {
    return this.get<UserV1>('lists/members/show.json', { tweet_mode: 'extended', ...options });
  }

  /**
   * Returns the lists the specified user has been added to.
   * If user_id or screen_name are not provided, the memberships for the authenticating user are returned.
   * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/create-manage-lists/api-reference/get-lists-memberships
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.listMemberships()` instead.
   */
  public async listMemberships(options: Partial<ListMembershipsV1Params> = {}) {
    const queryParams: Partial<ListMembershipsV1Params> = {
      tweet_mode: 'extended',
      ...options,
    };
    const initialRq = await this.get<DoubleEndedListsCursorV1Result>('lists/memberships.json', queryParams, { fullResponse: true });

    return new ListMembershipsV1Paginator({
      realData: initialRq.data,
      rateLimit: initialRq.rateLimit!,
      instance: this,
      queryParams,
    });
  }

  /**
   * Returns the lists owned by the specified Twitter user. Private lists will only be shown if the authenticated user is also the owner of the lists.
   * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/create-manage-lists/api-reference/get-lists-ownerships
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.listsOwned()` instead.
   */
  public async listOwnerships(options: Partial<ListOwnershipsV1Params> = {}) {
    const queryParams: Partial<ListOwnershipsV1Params> = {
      tweet_mode: 'extended',
      ...options,
    };
    const initialRq = await this.get<DoubleEndedListsCursorV1Result>('lists/ownerships.json', queryParams, { fullResponse: true });

    return new ListOwnershipsV1Paginator({
      realData: initialRq.data,
      rateLimit: initialRq.rateLimit!,
      instance: this,
      queryParams,
    });
  }

  /**
   * Returns a timeline of tweets authored by members of the specified list. Retweets are included by default.
   * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/create-manage-lists/api-reference/get-lists-statuses
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.listTweets()` instead.
   */
  public async listStatuses(options: Partial<ListStatusesV1Params>) {
    const queryParams: Partial<ListStatusesV1Params> = {
      tweet_mode: 'extended',
      ...options,
    };
    const initialRq = await this.get<TweetV1TimelineResult>('lists/statuses.json', queryParams, { fullResponse: true });

    return new ListTimelineV1Paginator({
      realData: initialRq.data,
      rateLimit: initialRq.rateLimit!,
      instance: this,
      queryParams,
    });
  }

  /**
   * Returns the subscribers of the specified list. Private list subscribers will only be shown if the authenticated user owns the specified list.
   * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/create-manage-lists/api-reference/get-lists-subscribers
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.listFollowers()` instead.
   */
  public async listSubscribers(options: Partial<ListMembersV1Params> = {}) {
    const queryParams: Partial<ListMembersV1Params> = {
      tweet_mode: 'extended',
      ...options,
    };
    const initialRq = await this.get<DoubleEndedUsersCursorV1Result>('lists/subscribers.json', queryParams, { fullResponse: true });

    return new ListSubscribersV1Paginator({
      realData: initialRq.data,
      rateLimit: initialRq.rateLimit!,
      instance: this,
      queryParams,
    });
  }

  /**
   * Check if the specified user is a subscriber of the specified list. Returns the user if they are a subscriber.
   * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/create-manage-lists/api-reference/get-lists-subscribers-show
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
   */
  public listGetSubscriber(options: ListMemberShowV1Params) {
    return this.get<UserV1>('lists/subscribers/show.json', { tweet_mode: 'extended', ...options });
  }

  /**
   * Obtain a collection of the lists the specified user is subscribed to, 20 lists per page by default.
   * Does not include the user's own lists.
   * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/create-manage-lists/api-reference/get-lists-subscriptions
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.listFollowed()` instead.
   */
  public async listSubscriptions(options: Partial<ListSubscriptionsV1Params> = {}) {
    const queryParams: Partial<ListSubscriptionsV1Params> = {
      tweet_mode: 'extended',
      ...options,
    };
    const initialRq = await this.get<DoubleEndedListsCursorV1Result>('lists/subscriptions.json', queryParams, { fullResponse: true });

    return new ListSubscriptionsV1Paginator({
      realData: initialRq.data,
      rateLimit: initialRq.rateLimit!,
      instance: this,
      queryParams,
    });
  }

  /* Media upload API */

  /**
   * The STATUS command (this method) is used to periodically poll for updates of media processing operation.
   * After the STATUS command response returns succeeded, you can move on to the next step which is usually create Tweet with media_id.
   * https://developer.x.com/en/docs/twitter-api/v1/media/upload-media/api-reference/get-media-upload-status
   *
   * @deprecated v1.1 media endpoint, sunset by X in June 2025. `v2.uploadMedia()` waits for the media processing itself.
   */
  public mediaInfo(mediaId: string) {
    return this.get<MediaStatusV1Result>(
      'media/upload.json',
      {
        command: 'STATUS',
        media_id: mediaId,
      },
      { prefix: API_V1_1_UPLOAD_PREFIX },
    );
  }

  /* Streaming API */

  /**
   * Returns public statuses that match one or more filter predicates.
   * Multiple parameters may be specified which allows most clients to use a single connection to the Streaming API.
   * https://developer.x.com/en/docs/twitter-api/v1/tweets/filter-realtime/api-reference/post-statuses-filter
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.searchStream()` instead.
   */
  public filterStream(params?: Partial<FilterStreamV1Params> & { autoConnect?: true }): Promise<TweetStream<TweetV1>>;
  /** @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.searchStream()` instead. */
  public filterStream(params: Partial<FilterStreamV1Params> & { autoConnect: false }): TweetStream<TweetV1>;
  /** @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.searchStream()` instead. */
  public filterStream(params?: Partial<FilterStreamV1Params> & { autoConnect?: boolean }): PromiseOrType<TweetStream<TweetV1>>;

  public filterStream({ autoConnect, ...params }: Partial<FilterStreamV1Params> & { autoConnect?: boolean } = {}) {
    const parameters: Record<string, string> = {};

    for (const [key, value] of Object.entries(params)) {
      if (key === 'follow' || key === 'track') {
        parameters[key] = value.toString();
      }
      else if (key === 'locations') {
        const locations = value as FilterStreamV1Params['locations'];
        parameters.locations = arrayWrap(locations).map(loc => `${loc.lng},${loc.lat}`).join(',');
      }
      else {
        parameters[key] = value;
      }
    }

    const streamClient = this.stream;
    return streamClient.postStream<TweetV1>('statuses/filter.json', parameters, { autoConnect });
  }

  /**
   * Returns a small random sample of all public statuses.
   * The Tweets returned by the default access level are the same, so if two different clients connect to this endpoint, they will see the same Tweets.
   * https://developer.x.com/en/docs/twitter-api/v1/tweets/sample-realtime/api-reference/get-statuses-sample
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.sampleStream()` instead (Enterprise plans only).
   */
  public sampleStream(params?: Partial<SampleStreamV1Params> & { autoConnect?: true }): Promise<TweetStream<TweetV1>>;
  /** @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.sampleStream()` instead (Enterprise plans only). */
  public sampleStream(params: Partial<SampleStreamV1Params> & { autoConnect: false }): TweetStream<TweetV1>;
  /** @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.sampleStream()` instead (Enterprise plans only). */
  public sampleStream(params?: Partial<SampleStreamV1Params> & { autoConnect?: boolean }): PromiseOrType<TweetStream<TweetV1>>;

  public sampleStream({ autoConnect, ...params }: Partial<SampleStreamV1Params> & { autoConnect?: boolean } = {}) {
    const streamClient = this.stream;
    return streamClient.getStream<TweetV1>('statuses/sample.json', params, { autoConnect });
  }

  /**
   * Create a client that is prefixed with `https//stream.x.com` instead of classic API URL.
   *
   * @deprecated The v1.1 streaming endpoints are no longer available on most X API plans. Use the v2 streams instead, like `v2.searchStream()`.
   */
  public get stream(): this {
    const copiedClient = new TwitterApiv1(this);
    copiedClient.setPrefix(API_V1_1_STREAM_PREFIX);

    return copiedClient as any;
  }

  /* Trends API */

  /**
   * Returns the top 50 trending topics for a specific id, if trending information is available for it.
   * Note: The id parameter for this endpoint is the "where on earth identifier" or WOEID, which is a legacy identifier created by Yahoo and has been deprecated.
   * https://developer.x.com/en/docs/twitter-api/v1/trends/trends-for-location/api-reference/get-trends-place
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.trendsByWoeid()` instead.
   */
  public trendsByPlace(woeId: string | number, options: Partial<TrendsPlaceV1Params> = {}) {
    return this.get<TrendMatchV1[]>('trends/place.json', { id: woeId, ...options });
  }

  /**
   * Returns the locations that Twitter has trending topic information for.
   * The response is an array of "locations" that encode the location's WOEID
   * and some other human-readable information such as a canonical name and country the location belongs in.
   * https://developer.x.com/en/docs/twitter-api/v1/trends/locations-with-trending-topics/api-reference/get-trends-available
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
   */
  public trendsAvailable() {
    return this.get<TrendLocationV1[]>('trends/available.json');
  }

  /**
   * Returns the locations that Twitter has trending topic information for, closest to a specified location.
   * https://developer.x.com/en/docs/twitter-api/v1/trends/locations-with-trending-topics/api-reference/get-trends-closest
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
   */
  public trendsClosest(lat: number, long: number) {
    return this.get<TrendLocationV1[]>('trends/closest.json', { lat, long });
  }

  /* Geo API */

  /**
   * Returns all the information about a known place.
   * https://developer.x.com/en/docs/twitter-api/v1/geo/place-information/api-reference/get-geo-id-place_id
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
   */
  public geoPlace(placeId: string) {
    return this.get<PlaceV1>('geo/id/:place_id.json', undefined, { params: { place_id: placeId } });
  }

  /**
   * Search for places that can be attached to a Tweet via POST statuses/update.
   * This request will return a list of all the valid places that can be used as the place_id when updating a status.
   * https://developer.x.com/en/docs/twitter-api/v1/geo/places-near-location/api-reference/get-geo-search
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
   */
  public geoSearch(options: Partial<SearchGeoV1Params>) {
    return this.get<SearchGeoV1Result>('geo/search.json', options);
  }

  /**
   * Given a latitude and a longitude, searches for up to 20 places that can be used as a place_id when updating a status.
   * This request is an informative call and will deliver generalized results about geography.
   * https://developer.x.com/en/docs/twitter-api/v1/geo/places-near-location/api-reference/get-geo-reverse_geocode
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
   */
  public geoReverseGeoCode(options: ReverseGeoCodeV1Params) {
    return this.get<ReverseGeoCodeV1Result>('geo/reverse_geocode.json', options as Partial<ReverseGeoCodeV1Params>);
  }

  /* Developer utilities */

  /**
   * Returns the current rate limits for methods belonging to the specified resource families.
   * Each API resource belongs to a "resource family" which is indicated in its method documentation.
   * The method's resource family can be determined from the first component of the path after the resource version.
   * https://developer.x.com/en/docs/twitter-api/v1/developer-utilities/rate-limit-status/api-reference/get-application-rate_limit_status
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
   */
  public rateLimitStatuses(...resources: TAppRateLimitResourceV1[]) {
    return this.get<AppRateLimitV1Result>('application/rate_limit_status.json', { resources });
  }

  /**
   * Returns the list of languages supported by Twitter along with the language code supported by Twitter.
   * https://developer.x.com/en/docs/twitter-api/v1/developer-utilities/supported-languages/api-reference/get-help-languages
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
   */
  public supportedLanguages() {
    return this.get<HelpLanguageV1Result[]>('help/languages.json');
  }
}
