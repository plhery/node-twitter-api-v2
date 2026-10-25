import { TypeOrArrayOf } from '../shared.types';
import { CashtagEntity, HashtagEntity, MentionEntity, UrlEntity } from '../entities.types';
import { TTweetv2MediaField, TTweetv2TweetField, TTweetv2UserField } from './tweet.v2.types';
import { ApiV2Includes, ReferencedTweetV2 } from './tweet.definition.v2';
import { DataAndIncludeV2, DataMetaAndIncludeV2, DataV2, PaginableCountMetaV2 } from './shared.v2.types';

export type TDMEventV2EventType = 'MessageCreate' | 'ParticipantsJoin' | 'ParticipantsLeave';

// Types

export interface DMEventAttachmentV2 {
  media_keys?: string[];
  card_ids?: string[];
}

export interface BaseDMEventV2 {
  id: string;
  created_at?: string;
  sender_id?: string;
  dm_conversation_id?: string;
  attachments?: DMEventAttachmentV2;
  referenced_tweets?: ReferencedTweetV2[];
  participant_ids?: string[];
  entities?: {
    urls?: UrlEntity[];
    hashtags?: HashtagEntity[];
    cashtags?: CashtagEntity[];
    mentions?: MentionEntity[];
  };
}

export type DMEventV2 =
  | ({
      event_type: 'MessageCreate';
      text: string;
    } & BaseDMEventV2)
  | ({
      event_type: Extract<TDMEventV2EventType, 'ParticipantsJoin' | 'ParticipantsLeave'>;
    } & BaseDMEventV2);

export type TDMEventV2Field = keyof BaseDMEventV2 | 'event_type' | 'text';
export type TDMEventV2Expansion = 'attachments.media_keys' | 'referenced_tweets.id' | 'sender_id' | 'participant_ids';

// GET /2/dm_events

export interface GetDMEventV2Params {
  'dm_event.fields'?: TypeOrArrayOf<TDMEventV2Field> | string;
  event_types?: TypeOrArrayOf<TDMEventV2EventType> | string;
  expansions?: TypeOrArrayOf<TDMEventV2Expansion> | string;
  max_results?: number;
  'media.fields'?: TypeOrArrayOf<TTweetv2MediaField> | string;
  pagination_token?: string;
  'tweet.fields'?: TypeOrArrayOf<TTweetv2TweetField> | string;
  'user.fields'?: TypeOrArrayOf<TTweetv2UserField> | string;
}

export type GetDMEventV2Result = DataMetaAndIncludeV2<DMEventV2[], PaginableCountMetaV2, ApiV2Includes>;

// POST dm_conversations/:dm_conversation_id/messages

export interface PostDMInConversationParams {
    attachments?: [{ media_id: string }];
    text?: string;
}

// POST dm_conversations

export interface CreateDMConversationParams {
    conversation_type: 'Group';
    participant_ids: string[];
    message: PostDMInConversationParams;
}

export interface PostDMInConversationResult {
    dm_conversation_id: string;
    dm_event_id: string;
}

// GET /2/dm_events/:event_id

export type GetDMEventByIdV2Params = Pick<GetDMEventV2Params, 'dm_event.fields' | 'expansions' | 'media.fields' | 'tweet.fields' | 'user.fields'>;

export type GetDMEventByIdV2Result = DataAndIncludeV2<DMEventV2, ApiV2Includes>;

// DELETE /2/dm_events/:event_id

export type DeleteDMEventV2Result = DataV2<{ deleted: boolean }>;
