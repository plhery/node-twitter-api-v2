// ---------------
// -- Streaming --
// ---------------

// -- Get stream rules --

import { DataAndMetaV2, DataV2, MetaV2, PaginableCountMetaV2, SentMeta } from './shared.v2.types';
import type { NumberString, TypeOrArrayOf } from '../shared.types';

export interface StreamingV2GetRulesParams {
  /** Comma-separated list of rule IDs. If omitted, all rules are returned. */
  ids?: string;
  /** Maximum number of rules to return. Min 1, max 1000, default 1000. */
  max_results?: number;
  /** Token to retrieve the next page of results. */
  pagination_token?: string;
}

export interface StreamingV2Rule {
  /** Unique identifier of this rule. */
  id: string;
  /** The rule text as submitted when creating the rule. */
  value: string;
  /** The tag label as defined when creating the rule. */
  tag?: string;
}

export type StreamingV2GetRulesResult = DataAndMetaV2<StreamingV2Rule[], PaginableCountMetaV2>;

// -- Add / delete stream rules --

export interface StreamingV2AddRulesParams {
  /** Specifies the operation you want to perform on the rules. */
  add: {
    /**
     * The tag label.
     * This is a free-form text you can use to identify the rules that matched a specific Tweet in the streaming response.
     * Tags can be the same across rules.
     */
    tag?: string;
    /**
     * The rule text.
     * If you are using a Standard Project at the Basic access level,
     * you can use the basic set of operators, can submit up to 25 concurrent rules, and can submit rules up to 512 characters long.
     * If you are using an Academic Research Project at the Basic access level,
     * you can use all available operators, can submit up to 1,000 concurrent rules, and can submit rules up to 1,024 characters long.
     */
    value: string;
  }[];
}

export interface StreamingV2DeleteRulesParams {
  /** Specifies the operation you want to perform on the rules. */
  delete: {
    /** Array of rule IDs, each one representing a rule already active in your stream. IDs must be submitted as strings. */
    ids?: string[];
    /** Array of rule values (the rule text), to delete rules by value instead of ID. */
    values?: string[];
  };
}

/** Empty body used when deleting all rules through the `delete_all` query parameter. */
export type StreamingV2DeleteAllRulesParams = Record<string, never>;

export type StreamingV2UpdateRulesParams =
  | StreamingV2AddRulesParams
  | StreamingV2DeleteRulesParams
  | StreamingV2DeleteAllRulesParams;

export interface StreamingV2UpdateRulesQuery {
  /**
   * Set to true to test a the syntax of your rule without submitting it.
   * This is useful if you want to check the syntax of a rule before removing one or more of your existing rules.
   */
  dry_run: boolean;
  /**
   * Delete all of the rules associated with this client app. It should be specified with no other parameters.
   * Once deleted, rules cannot be recovered.
   */
  delete_all?: boolean;
}

export type StreamingV2UpdateRulesAddResult = DataAndMetaV2<StreamingV2Rule[], {
  /** The time when the request body was returned. */
  sent: string;
  summary: {
    created: number;
    not_created: number;
  };
}>;

export type StreamingV2UpdateRulesDeleteResult = MetaV2<SentMeta & {
  summary: {
    deleted: number;
    not_deleted: number;
  };
}>;

export type StreamingV2UpdateRulesResult = StreamingV2UpdateRulesAddResult | StreamingV2UpdateRulesDeleteResult;

// -- Stream rule counts --

export interface StreamingV2RuleCount {
  client_app_id?: string;
  rule_count: number;
}

export interface StreamingV2RuleCounts {
  // X's OpenAPI spec types these three as strings, while its own SDK expects numbers
  /** Maximum number of rules per client app. */
  cap_per_client_app: NumberString;
  /** Maximum number of rules across the project. */
  cap_per_project: NumberString;
  /** Number of rules of every client app of the project. */
  project_rules_count: NumberString;
  /** Rule count of the calling client app. */
  client_app_rules_count: StreamingV2RuleCount;
  /** Rule count of each client app of the project. */
  all_project_client_apps?: StreamingV2RuleCount[];
}

export interface StreamingV2RuleCountsParams {
  'rules_count.fields'?: TypeOrArrayOf<keyof StreamingV2RuleCounts> | string;
}

export type StreamingV2RuleCountsResult = DataV2<StreamingV2RuleCounts>;

// -- Stream connections --

export type TStreamingV2ConnectionEndpoint = 'filtered_stream' | 'sample_stream' | 'sample10_stream' | 'firehose_stream'
  | 'tweets_compliance_stream' | 'users_compliance_stream' | 'tweet_label_stream'
  | 'firehose_stream_lang_en' | 'firehose_stream_lang_ja' | 'firehose_stream_lang_ko' | 'firehose_stream_lang_pt'
  | 'likes_firehose_stream' | 'likes_sample10_stream' | 'likes_compliance_stream';

export interface StreamingV2Connection {
  id?: string;
  endpoint_name?: string;
  client_ip?: string;
  /** ISO date string */
  connected_at?: string;
  /** ISO date string */
  disconnected_at?: string;
  disconnect_reason?: string;
}

export interface StreamingV2ConnectionsParams {
  /** Defaults to `active`. */
  status?: 'active' | 'inactive' | 'all';
  endpoints?: TypeOrArrayOf<TStreamingV2ConnectionEndpoint> | string;
  /** Min 1, max 100, default 10. */
  max_results?: number;
  pagination_token?: string;
  'connection.fields'?: TypeOrArrayOf<keyof StreamingV2Connection> | string;
}

export type StreamingV2ConnectionsResult = DataAndMetaV2<StreamingV2Connection[], {
  result_count?: number;
  next_token?: string;
}>;

export type StreamingV2TerminateConnectionsResult = DataV2<{
  successful_kills: number;
  failed_kills: number;
  results?: {
    uuid: string;
    success: boolean;
    error_message?: string;
  }[];
}>;
