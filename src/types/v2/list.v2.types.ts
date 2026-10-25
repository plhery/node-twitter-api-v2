import type { TypeOrArrayOf } from '../shared.types';
import type { DataAndIncludeV2, DataMetaAndIncludeV2, DataV2, PaginableCountMetaV2 } from './shared.v2.types';
import type { TTweetv2UserField } from './tweet.v2.types';
import type { UserV2 } from './user.v2.types';

export type TListV2Field = 'created_at' | 'follower_count' | 'member_count' | 'private' | 'description' | 'owner_id';
export type TListV2Expansion = 'owner_id';
export type TListV2Includes = { users?: UserV2[] };

export interface ListV2 {
  id: string;
  name: string;
  created_at?: string;
  private?: boolean;
  follower_count?: number;
  member_count?: number;
  owner_id?: string;
  description?: string;
}

export interface ListCreateV2Params {
  name: string;
  description?: string;
  private?: boolean;
}

export interface GetListV2Params {
  expansions: TypeOrArrayOf<TListV2Expansion> | string;
  'list.fields': TypeOrArrayOf<TListV2Field> | string;
  'user.fields': TypeOrArrayOf<TTweetv2UserField> | string;
}

export interface GetListTimelineV2Params extends Partial<GetListV2Params> {
  max_results?: number;
  pagination_token?: string;
}

export type ListGetV2Result = DataAndIncludeV2<ListV2, TListV2Includes>;

export type ListTimelineV2Result = DataMetaAndIncludeV2<ListV2[], PaginableCountMetaV2, TListV2Includes>

export type ListCreateV2Result = DataV2<{ id: string, name: string }>;

export type ListUpdateV2Params = Omit<ListCreateV2Params, 'name'> & { name?: string };

export type ListUpdateV2Result = DataV2<{ updated: true }>;

export type ListDeleteV2Result = DataV2<{ deleted: true }>;

export type ListMemberV2Result = DataV2<{ is_member: boolean }>;

export type ListFollowV2Result = DataV2<{ following: boolean }>;

export type ListPinV2Result = DataV2<{ pinned: boolean }>;

export type ListPinnedV2Result = DataMetaAndIncludeV2<ListV2[], { result_count: number }, TListV2Includes>;
