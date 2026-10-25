import type TwitterApi from '../client';
import { TypeOrArrayOf } from './shared.types';

export type TOAuth2Scope = 'tweet.read' | 'tweet.write' | 'tweet.moderate.write' | 'users.read' | 'users.email' | 'follows.read' | 'follows.write'
 | 'offline.access' | 'space.read' | 'mute.read' | 'mute.write' | 'like.read' | 'like.write' | 'list.read' | 'list.write'
 | 'block.read' | 'block.write' | 'bookmark.read' | 'bookmark.write' | 'dm.read' | 'dm.write' | 'media.write'
 | 'timeline.read' | 'broadcast.read' | 'broadcast.write' | 'ads.read' | 'ads.write';

export interface BuildOAuth2RequestLinkArgs {
  scope?: TypeOrArrayOf<TOAuth2Scope> | TypeOrArrayOf<string>;
  state?: string;
}

export interface AccessOAuth2TokenArgs {
  /** The same URI given to generate link at previous step. */
  redirectUri: string;
  /** The code obtained in link generation step. */
  codeVerifier: string;
  /** The code given by Twitter in query string, after redirection to your callback URL. */
  code: string;
}

export interface AccessOAuth2TokenResult {
  token_type: 'bearer';
  expires_in: number;
  access_token: string;
  scope: string;
  refresh_token?: string;
}

export interface RequestTokenArgs {
  authAccessType: 'read' | 'write';
  linkMode: 'authenticate' | 'authorize';
  forceLogin: boolean;
  screenName: string;
}

export interface RequestTokenResult {
  oauth_token: string;
  oauth_token_secret: string;
  oauth_callback_confirmed: 'true';
}

export interface IOAuth2RequestTokenResult {
  url: string;
  state: string;
  codeVerifier: string;
  codeChallenge: string;
}

export interface AccessTokenResult {
  oauth_token: string;
  oauth_token_secret: string;
  user_id: string;
  screen_name: string;
}

export interface BearerTokenResult {
  token_type: 'bearer';
  access_token: string;
}

export interface LoginResult {
  userId: string;
  screenName: string;
  accessToken: string;
  accessSecret: string;
  client: TwitterApi;
}

export interface IParsedOAuth2TokenResult {
  client: TwitterApi;
  expiresIn: number;
  accessToken: string;
  scope: TOAuth2Scope[];
  refreshToken?: string;
}
