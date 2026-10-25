import type { TwitterRateLimit, TwitterResponse } from '../types';
import type { ClientRequest, IncomingMessage, IncomingHttpHeaders } from 'http';

export interface ErrorV1 {
  code: number;
  message: string;
}

/** Errors included in response payload with a OK HTTP status (code ~= 200) */
export interface InlineErrorV2 {
  value?: string;
  detail: string;
  title: string;
  resource_type?: string;
  parameter?: string;
  resource_id?: string;
  reason?: string;
  type: string;
}

/** Error payload thrown when HTTP code is not OK */
export interface ErrorV2 {
  detail: string;
  title: string;
  type: string;
  errors: {
    message: string;
    parameters?: { [parameterName: string]: string[] };
  }[];
}

export type TRequestError = TwitterApiRequestError | TwitterApiError;

export interface TwitterErrorPayload<T = any> {
  request: ClientRequest;
  rawResponse?: IncomingMessage;
  response?: TwitterResponse<T>;
  error?: Error;
}

export interface TwitterApiErrorData {
  errors?: (ErrorV1 | ErrorV2)[];
  error?: string;
  title?: string;
  detail?: string;
  type?: string;
}

export enum ETwitterApiError {
  Request = 'request',
  PartialResponse = 'partial-response',
  Response = 'response',
}

/* OLD ERRORS INTERFACES */

export interface TwitterApiRequestError {
  type: ETwitterApiError.Request;
  error: true;
  readonly requestError: Error;
}

export interface TwitterApiError extends TwitterResponse<TwitterApiErrorData> {
  type: ETwitterApiError.Response;
  error: true;
  /** HTTP status code */
  code: number;
}

/* ERRORS INSTANCES */

abstract class ApiError extends Error {
  abstract type: ETwitterApiError.Request | ETwitterApiError.Response | ETwitterApiError.PartialResponse;
  abstract request: ClientRequest;
  error = true as const;
}

interface IBuildApiRequestError {
  readonly request: ClientRequest;
  error: Error;
}

export class ApiRequestError extends ApiError implements TwitterApiRequestError {
  protected _options: any;

  type = ETwitterApiError.Request as const;

  constructor(message: string, options: IBuildApiRequestError) {
    super(message);

    Error.captureStackTrace(this, this.constructor);

    // Do not show on Node stack trace
    Object.defineProperty(this, '_options', { value: options });
  }

  get request(): ClientRequest {
    return this._options.request;
  }

  get requestError(): Error {
    return this._options.error;
  }

  toJSON() {
    return {
      type: this.type,
      error: this.requestError,
    };
  }
}

interface IBuildApiPartialRequestError {
  readonly request: ClientRequest;
  readonly response: IncomingMessage;
  readonly rawContent: string;
  responseError: Error;
}

export class ApiPartialResponseError extends ApiError implements IBuildApiPartialRequestError {
  protected _options: any;

  type = ETwitterApiError.PartialResponse as const;

  constructor(message: string, options: IBuildApiPartialRequestError) {
    super(message);

    Error.captureStackTrace(this, this.constructor);

    // Do not show on Node stack trace
    Object.defineProperty(this, '_options', { value: options });
  }

  get request(): ClientRequest {
    return this._options.request;
  }

  get response(): IncomingMessage {
    return this._options.response;
  }

  get responseError(): Error {
    return this._options.responseError;
  }

  get rawContent(): string {
    return this._options.rawContent;
  }

  toJSON() {
    return {
      type: this.type,
      error: this.responseError,
    };
  }
}

interface IBuildApiResponseError {
  code: number;
  request: ClientRequest;
  response: IncomingMessage;
  headers: IncomingHttpHeaders;
  data: TwitterApiErrorData;
  rateLimit?: TwitterRateLimit;
}

/** Last part of a v2 problem type, like `invalid-request`, the same on the api.twitter.com and api.x.com hosts */
function getProblemName(type: unknown) {
  return typeof type === 'string' ? type.split(/[/#]/).pop() : undefined;
}

export class ApiResponseError extends ApiError implements TwitterApiError, IBuildApiResponseError {
  protected _options: any;

  type = ETwitterApiError.Response as const;
  /** HTTP error code */
  code: number;
  headers: IncomingHttpHeaders;
  data: TwitterApiErrorData;
  rateLimit?: TwitterRateLimit;

  constructor(message: string, options: IBuildApiResponseError) {
    super(message);

    Error.captureStackTrace(this, this.constructor);

    // Do not show on Node stack trace
    Object.defineProperty(this, '_options', { value: options });

    this.code = options.code;
    this.headers = options.headers;
    this.rateLimit = options.rateLimit;

    // Fix bad error data payload on some v1 endpoints (see https://github.com/PLhery/node-twitter-api-v2/issues/342)
    if (options.data && typeof options.data === 'object' && 'error' in options.data && !options.data.errors) {
      const data = { ...options.data };

      data.errors = [{
        code: EApiV1ErrorCode.InternalError,
        message: data.error!,
      }];
      this.data = data;
    } else {
      this.data = options.data;
    }
  }

  get request(): ClientRequest {
    return this._options.request;
  }

  get response(): IncomingMessage {
    return this._options.response;
  }

  /** Check for presence of one of given v1/v2 error codes. */
  hasErrorCode(...codes: (EApiV1ErrorCode | number)[] | (EApiV2ErrorCode | string)[]) {
    const errors = this.errors;

    // v1 errors
    if (errors?.length && 'code' in errors[0]) {
      const v1errors = errors as ErrorV1[];
      return v1errors.some(error => (codes as number[]).includes(error.code));
    }

    // v2 errors: X gives a problem type to the whole error, to the items of its errors array, or to both
    const v2errors = [this.data, ...(errors ?? [])] as Partial<ErrorV2>[];
    const problems = (codes as string[]).map(getProblemName);

    return v2errors.some(error => {
      const problem = getProblemName(error?.type);
      return problem !== undefined && problems.includes(problem);
    });
  }

  get errors(): (ErrorV1 | ErrorV2)[] | undefined {
    return this.data?.errors;
  }

  get rateLimitError() {
    return this.code === 420 || this.code === 429;
  }

  get isAuthError() {
    if (this.code === 401) {
      return true;
    }

    return this.hasErrorCode(
      EApiV1ErrorCode.AuthTimestampInvalid,
      EApiV1ErrorCode.AuthenticationFail,
      EApiV1ErrorCode.BadAuthenticationData,
      EApiV1ErrorCode.InvalidOrExpiredToken,
    );
  }

  toJSON() {
    return {
      type: this.type,
      code: this.code,
      error: this.data,
      rateLimit: this.rateLimit,
      headers: this.headers,
    };
  }
}

export enum EApiV1ErrorCode {
  // Location errors
  InvalidCoordinates = 3,
  NoLocationFound = 13,

  // Authentication failures
  AuthenticationFail = 32,
  InvalidOrExpiredToken = 89,
  UnableToVerifyCredentials = 99,
  AuthTimestampInvalid = 135,
  BadAuthenticationData = 215,

  // Resources not found or visible
  NoUserMatch = 17,
  UserNotFound = 50,
  ResourceNotFound = 34,
  TweetNotFound = 144,
  TweetNotVisible = 179,
  NotAllowedResource = 220,
  MediaIdNotFound = 325,
  TweetNoLongerAvailable = 421,
  TweetViolatedRules = 422,

  // Account errors
  TargetUserSuspended = 63,
  YouAreSuspended = 64,
  AccountUpdateFailed = 120,
  NoSelfSpamReport = 36,
  NoSelfMute = 271,
  AccountLocked = 326,

  // Application live errors / Twitter errors
  RateLimitExceeded = 88,
  NoDMRightForApp = 93,
  OverCapacity = 130,
  InternalError = 131,
  TooManyFollowings = 161,
  TweetLimitExceeded = 185,
  DuplicatedTweet = 187,
  TooManySpamReports = 205,
  RequestLooksLikeSpam = 226,
  NoWriteRightForApp = 261,
  TweetActionsDisabled = 425,
  TweetRepliesRestricted = 433,

  // Invalid request parameters
  NamedParameterMissing = 38,
  InvalidAttachmentUrl = 44,
  TweetTextTooLong = 186,
  MissingUrlParameter = 195,
  NoMultipleGifs = 323,
  InvalidMediaIds = 324,
  InvalidUrl = 407,
  TooManyTweetAttachments = 386,

  // Already sent/deleted item
  StatusAlreadyFavorited = 139,
  FollowRequestAlreadySent = 160,
  CannotUnmuteANonMutedAccount = 272,
  TweetAlreadyRetweeted = 327,
  ReplyToDeletedTweet = 385,

  // DM Errors
  DMReceiverNotFollowingYou = 150,
  UnableToSendDM = 151,
  MustAllowDMFromAnyone = 214,
  CannotSendDMToThisUser = 349,
  DMTextTooLong = 354,

  // Application misconfiguration
  SubscriptionAlreadyExists = 355,
  CallbackUrlNotApproved = 415,
  SuspendedApplication = 416,
  OobOauthIsNotAllowed = 417,
}

/**
 * Problem types of v2 errors, as given by X in the `type` of an error.
 *
 * X has given them on several hosts (api.twitter.com, api.x.com), so `hasErrorCode` only compares their last part.
 */
export enum EApiV2ErrorCode {
  // Request errors
  InvalidRequest = 'https://api.x.com/2/problems/invalid-request',
  ClientForbidden = 'https://api.x.com/2/problems/client-forbidden',
  UnsupportedAuthentication = 'https://api.x.com/2/problems/unsupported-authentication',

  // Stream rules errors
  InvalidRules = 'https://api.x.com/2/problems/invalid-rules',
  TooManyRules = 'https://api.x.com/2/problems/rule-cap',
  RuleTooLong = 'https://api.x.com/2/problems/rule-length',
  DuplicatedRules = 'https://api.x.com/2/problems/duplicate-rules',

  // Twitter errors
  RateLimitExceeded = 'https://api.x.com/2/problems/rate-limit-exceeded',
  UsageCapped = 'https://api.x.com/2/problems/usage-capped',
  InternalError = 'https://api.x.com/2/problems/internal-error',
  ConnectionError = 'https://api.x.com/2/problems/streaming-connection',
  ClientDisconnected = 'https://api.x.com/2/problems/client-disconnected',
  TwitterDisconnectedYou = 'https://api.x.com/2/problems/operational-disconnect',

  // Resource errors
  ResourceNotFound = 'https://api.x.com/2/problems/resource-not-found',
  ResourceUnauthorized = 'https://api.x.com/2/problems/not-authorized-for-resource',
  ResourceUnavailable = 'https://api.x.com/2/problems/resource-unavailable',
  DisallowedResource = 'https://api.x.com/2/problems/disallowed-resource',
  RecipientNotMessageable = 'https://api.x.com/2/problems/recipient-not-messageable',

  // Field errors
  FieldUnauthorized = 'https://api.x.com/2/problems/field-unauthorized',
  NotAuthorizedForField = 'https://api.x.com/2/problems/not-authorized-for-field',
  FieldHydrationFailure = 'https://api.x.com/2/problems/field-hydration-failure',
}
