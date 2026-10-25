import type { TypeOrArrayOf } from '../shared.types';
import type { DataV2 } from './shared.v2.types';

// - Trends by WOEID -

export interface TrendV2 {
  trend_name?: string;
  tweet_count?: number;
}

export type TTrendV2Field = keyof TrendV2;

export interface TrendsByWoeidV2Params {
  /** Min 1, max 50, default 20. */
  max_trends?: number;
  'trend.fields'?: TypeOrArrayOf<TTrendV2Field> | string;
}

export type TrendsByWoeidV2Result = DataV2<TrendV2[]>;

// - Personalized trends -

export interface PersonalizedTrendV2 {
  trend_name?: string;
  category?: string;
  /** A string, unlike `TrendV2.tweet_count` */
  post_count?: string;
  trending_since?: string;
}

export type TPersonalizedTrendV2Field = keyof PersonalizedTrendV2;

export interface PersonalizedTrendsV2Params {
  'personalized_trend.fields'?: TypeOrArrayOf<TPersonalizedTrendV2Field> | string;
}

export type PersonalizedTrendsV2Result = DataV2<PersonalizedTrendV2[]>;
