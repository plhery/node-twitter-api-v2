import type { UserV2 } from './user.v2.types';
import type { CommunityV2 } from './community.v2.types';

export interface PlaceV2 {
  full_name: string;
  id: string;
  contained_within?: string[];
  country?: string;
  country_code?: string;
  geo?: {
    type: string;
    bbox: number[];
    properties: any;
  };
  name?: string;
  place_type?: string;
}

export interface PlaybackCountV2 {
  playback_0_count: number;
  playback_25_count: number;
  playback_50_count: number;
  playback_75_count: number;
  playback_100_count: number;
}

export type OrganicMetricV2 = PlaybackCountV2 & { view_count: number };

export interface MediaVariantsV2 {
  bit_rate?: number;
  content_type: 'video/mp4' | 'application/x-mpegURL' | string;
  url: string
}

export interface MediaObjectV2 {
  media_key: string;
  type: 'video' | 'animated_gif' | 'photo' | string;
  duration_ms?: number;
  height?: number;
  width?: number;
  url?: string;
  preview_image_url?: string;
  alt_text?: string;
  non_public_metrics?: PlaybackCountV2;
  organic_metrics?: OrganicMetricV2;
  promoted_metrics?: OrganicMetricV2;
  public_metrics?: { view_count: number };
  variants?: MediaVariantsV2[];
}

export interface PollV2 {
  id: string;
  options: { position: number; label: string; votes: number; }[];
  duration_minutes?: number;
  end_datetime?: string;
  voting_status?: string;
}

export interface ReferencedTweetV2 {
  type: 'retweeted' | 'quoted' | 'replied_to';
  id: string;
}

export interface TweetAttachmentV2 {
  media_keys?: string[];
  poll_ids?: string[];
  media_source_tweet_id?: string[];
}

export interface TweetGeoV2 {
  coordinates: {
    type: string;
    coordinates: [number, number] | null;
  };
  place_id: string;
}

interface TweetContextAnnotationItemV2 {
  id: string;
  name: string;
  description?: string;
}

export type TweetContextAnnotationDomainV2 = TweetContextAnnotationItemV2;
export type TweetContextAnnotationEntityV2 = TweetContextAnnotationItemV2;

export interface TweetContextAnnotationV2 {
  domain: TweetContextAnnotationDomainV2;
  entity: TweetContextAnnotationEntityV2;
}

export interface TweetEntityAnnotationsV2 {
  start: number;
  end: number;
  probability: number;
  type: string;
  normalized_text: string;
}

export interface TweetEntityUrlV2 {
  start: number;
  end: number;
  url: string;
  expanded_url: string;
  display_url: string;
  unwound_url: string;
  title?: string;
  description?: string;
  status?: string;
  images?: TweetEntityUrlImageV2[];
  media_key?: string;
}

export interface TweetEntityUrlImageV2 {
  url: string;
  width: number;
  height: number;
}

export interface TweetEntityHashtagV2 {
  start: number;
  end: number;
  tag: string;
}

export interface TweetEntityMentionV2 {
  start: number;
  end: number;
  username: string;
  id: string;
}

export interface TweetEntitiesV2 {
  annotations: TweetEntityAnnotationsV2[];
  urls: TweetEntityUrlV2[];
  hashtags: TweetEntityHashtagV2[];
  cashtags: TweetEntityHashtagV2[];
  mentions: TweetEntityMentionV2[];
}

export interface TweetWithheldInfoV2 {
  copyright: boolean;
  country_codes: string[];
  scope: 'tweet' | 'user';
}

export interface TweetPublicMetricsV2 {
  retweet_count: number;
  reply_count: number;
  like_count: number;
  quote_count: number;
  impression_count: number;
  bookmark_count?: number;
}

export interface TweetNonPublicMetricsV2 {
  impression_count: number;
  url_link_clicks: number;
  user_profile_clicks: number;
}

export interface TweetOrganicMetricsV2 {
  impression_count: number;
  url_link_clicks: number;
  user_profile_clicks: number;
  retweet_count: number;
  reply_count: number;
  like_count: number;
}

export type TweetPromotedMetricsV2 = TweetOrganicMetricsV2;

export interface EditControlsV2 {
  editable_until: string;
  edits_remaining: number;
  is_edit_eligible: boolean;
}

export interface NoteTweetV2 {
  text: string;
  entities?: NoteTweetEntitiesV2;
}

export type NoteTweetEntitiesV2 = Omit<TweetEntitiesV2, 'annotations'>;

export type TTweetReplySettingsV2 = 'mentionedUsers' | 'following' | 'everyone';

export interface TweetArticleV2 {
  cover_media?: MediaObjectV2;
  media_entities?: MediaObjectV2[];
}

export interface SendTweetV2Params {
  direct_message_deep_link?: string;
  for_super_followers_only?: 'True' | 'False';
  geo?: {
    place_id: string;
  };
  media?: {
    media_ids?:
    | [string]
    | [string, string]
    | [string, string, string]
    | [string, string, string, string];
    tagged_user_ids?: string[];
  };
  poll?: {
    duration_minutes: number;
    options: string[];
  };
  quote_tweet_id?: string;
  reply?: {
    exclude_reply_user_ids?: string[];
    in_reply_to_tweet_id: string;
  };
  reply_settings?: TTweetReplySettingsV2 | string;
  text?: string;
  community_id?: string;
  share_with_followers?: boolean;
}

//// FINALLY, TweetV2
export interface TweetV2 {
  id: string;
  text: string;
  edit_history_tweet_ids: string[];
  created_at?: string;
  author_id?: string;
  conversation_id?: string;
  in_reply_to_user_id?: string;
  referenced_tweets?: ReferencedTweetV2[];
  attachments?: TweetAttachmentV2;
  geo?: TweetGeoV2;
  context_annotations?: TweetContextAnnotationV2[];
  entities?: TweetEntitiesV2;
  withheld?: TweetWithheldInfoV2;
  public_metrics?: TweetPublicMetricsV2;
  non_public_metrics?: TweetNonPublicMetricsV2;
  organic_metrics?: TweetOrganicMetricsV2;
  promoted_metrics?: TweetPromotedMetricsV2;
  edit_controls?: EditControlsV2;
  possibly_sensitive?: boolean;
  lang?: string;
  reply_settings?: 'everyone' | 'mentionedUsers' | 'following';
  source?: string;
  note_tweet?: NoteTweetV2;
  community_id?: string;
  article?: TweetArticleV2;
}

export interface ApiV2Includes {
  tweets?: TweetV2[];
  users?: UserV2[];
  places?: PlaceV2[];
  media?: MediaObjectV2[];
  polls?: PollV2[];
  communities?: CommunityV2[];
}
