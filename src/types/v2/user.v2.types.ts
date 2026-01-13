// Users
import type { CashtagEntity, HashtagEntity, MentionEntity, UrlEntity } from '../entities.types';
import type { ApiV2Includes } from './tweet.definition.v2';
import type { DataAndIncludeV2, DataMetaAndIncludeV2, DataV2 } from './shared.v2.types';
import type { TTweetv2MediaField, TTweetv2PlaceField, TTweetv2PollField, TTweetv2TweetField, TTweetv2UserField } from './tweet.v2.types';
import type { TypeOrArrayOf } from '../shared.types';
import { PaginableCountMetaV2 } from './shared.v2.types';

export type TUserV2Expansion = 'pinned_tweet_id';

/** Connection status types for relationship between users */
export type TConnectionStatusV2 =
  | 'follow_request_received'
  | 'follow_request_sent'
  | 'blocking'
  | 'followed_by'
  | 'following'
  | 'muting';

// - Params -

export interface UsersV2Params {
  expansions: TypeOrArrayOf<TUserV2Expansion>;
  'media.fields': TypeOrArrayOf<TTweetv2MediaField> | string;
  'place.fields': TypeOrArrayOf<TTweetv2PlaceField> | string;
  'poll.fields': TypeOrArrayOf<TTweetv2PollField> | string;
  'tweet.fields': TypeOrArrayOf<TTweetv2TweetField> | string;
  'user.fields': TypeOrArrayOf<TTweetv2UserField> | string;
}

export interface UserV2TimelineParams {
  expansions?: TypeOrArrayOf<TUserV2Expansion>;
  'media.fields'?: TypeOrArrayOf<TTweetv2MediaField> | string;
  'place.fields'?: TypeOrArrayOf<TTweetv2PlaceField> | string;
  'poll.fields'?: TypeOrArrayOf<TTweetv2PollField> | string;
  'tweet.fields'?: TypeOrArrayOf<TTweetv2TweetField> | string;
  'user.fields'?: TypeOrArrayOf<TTweetv2UserField> | string;
  max_results?: number;
  pagination_token?: string;
}

export interface TweetRetweetedOrLikedByV2Params extends UserV2TimelineParams {
  asPaginator?: boolean;
}

export interface TweetRetweetedOrLikedByV2ParamsWithoutPaginator extends TweetRetweetedOrLikedByV2Params {
  asPaginator?: false;
}

export interface TweetRetweetedOrLikedByV2ParamsWithPaginator extends TweetRetweetedOrLikedByV2Params {
  asPaginator: true;
}

export interface FollowersV2Params extends UserV2TimelineParams {
  asPaginator?: boolean;
}

export interface FollowersV2ParamsWithoutPaginator extends FollowersV2Params {
  asPaginator?: false;
}

// Polymorphism for { asPaginator: true } prop
export interface FollowersV2ParamsWithPaginator extends FollowersV2Params {
  asPaginator: true;
}

// - Results -

export type UserV2Result = DataAndIncludeV2<UserV2, ApiV2Includes>;
export type UsersV2Result = DataAndIncludeV2<UserV2[], ApiV2Includes>;

export type UserV2FollowResult = DataV2<{
  following: boolean;
  pending_follow: boolean;
}>;

export type UserV2UnfollowResult = DataV2<{
  following: boolean;
}>;

export type UserV2BlockResult = DataV2<{
  blocking: boolean;
}>;

export type UserV2MuteResult = DataV2<{
  muting: boolean;
}>;

export type UserV2TimelineResult = DataMetaAndIncludeV2<UserV2[], PaginableCountMetaV2, ApiV2Includes>;

/** @deprecated Use {UserV2TimelineResult} instead. */
export type FollowersV2Result = UserV2TimelineResult;

// - Entities -

export interface UserV2 {
  id: string;
  name: string;
  username: string;
  created_at?: string; // ISO 8601 date
  protected?: boolean;
  withheld?: {
    country_codes?: string[];
    scope?: 'user';
  }
  location?: string;
  url?: string;
  description?: string;
  verified?: boolean;
  verified_type?: 'none' | 'blue' | 'business' | 'government';
  confirmed_email?: string;
  entities?: {
    url?: { urls: UrlEntity[] };
    description: {
      urls?: UrlEntity[];
      hashtags?: HashtagEntity[];
      cashtags?: CashtagEntity[];
      mentions?: MentionEntity[];
    }
  }
  profile_image_url?: string;
  profile_banner_url?: string;
  public_metrics?: {
    followers_count?: number;
    following_count?: number;
    tweet_count?: number;
    listed_count?: number;
    like_count?: number;
    media_count?: number;
  }
  pinned_tweet_id?: string;
  connection_status?: TConnectionStatusV2[];
  most_recent_tweet_id?: string;
  affiliation?: {
    badge_url?: string;
    description?: string;
    url?: string;
    user_id?: string[];
  };
  is_identity_verified?: boolean;
  parody?: boolean;
  receives_your_dm?: boolean;
  subscription?: boolean;
  subscription_type?: 'Basic' | 'Premium' | 'PremiumPlus' | 'None';
  verified_followers_count?: number;
}
