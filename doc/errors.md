# Error handling

When a request fails, you can catch a `ApiRequestError`, a `ApiPartialResponseError` or a `ApiResponseError` object (all instances of `Error`), that contain useful information about whats happening.

- An `ApiRequestError` happens when the request **failed to sent** (network error, bad URL...).
- An `ApiPartialResponseError` happens the response has been partially sent, but the connection is closed (by you, the OS or Twitter), or when the response body can't be parsed or decompressed.
- An `ApiResponseError` happens when **Twitter replies with an error**.

Some properties are common for both objects:
- `error` is `true`
- `type` contains either `ETwitterApiError.Request`,  `ETwitterApiError.PartialResponse` or `ETwitterApiError.Response` (depending of error)
- `request` containing node's raw `ClientRequest` instance

## Specific properties of `ApiRequestError`
- `requestError`, an instance of `Error` that has been thrown through `request.on('error')` handler

## Specific properties of `ApiPartialResponseError`
- `responseError`, an instance of `Error` that has been thrown by `response.on('error')` or by the tentative of parsing the response body, or that tells that the connection was closed before the end of the response
- `response`, containing raw node's `IncomingMessage` instance
- `rawContent`, containing all the chunks received from distant server

## Specific properties of `ApiResponseError`
- `data`, containing parsed Twitter response data (type of `TwitterApiErrorData`)
- `code` is a `number` containing the HTTP error code (`401`, `404`, ...)
- `response`, containing raw node's `IncomingMessage` instance
- `headers`, containing `IncomingHttpHeaders`
- `rateLimit` (can be undefined or `TwitterRateLimit`), containing parsed rate limit headers (if any)
- (getter) `errors`, direct access of parsed Twitter errors (`(ErrorV1 | ErrorV2)[]` or `undefined`)
- (getter) `rateLimitError`, `true` if this error is fired because a rate limit has been hit
- (getter) `isAuthError`, `true` if this error is fired because logged user cannot do this action (invalid token, invalid app rights...)

## Specific methods of `ApiResponseError`
- `hasErrorCode(code: number | EApiV1ErrorCode | EApiV2ErrorCode)`: Tells if given Twitter error code is present in error response. v2 problem types are compared by their last part (like `invalid-request`), so the `https://api.twitter.com/2/problems/…` and `https://api.x.com/2/problems/…` forms match each other

## Compression

Requests (that aren't used for streaming) natively support `gzip`/`deflate` compression.
If it causes issues, you can force compression to be disabled:

```ts
const client = new TwitterApi(tokens, { compression: false });
```

## Advanced: Debug a single request

If you want to debug a single request made through direct HTTP handlers `.get`/`.post`/`.delete`,
you can use an additional property named `requestEventDebugHandler`.

```ts
client.v2.get(
  'tweets/search/recent',
  { query: 'nodeJS', max_results: 100 },
  { requestEventDebugHandler: (eventType, data) => console.log('Event', eventType, 'with data', data) },
)
```

It takes a function of type `(event: TRequestDebuggerHandlerEvent, data?: any) => void` where available events are:
```ts
type TRequestDebuggerHandlerEvent = 'abort' | 'socket' | 'socket-error' | 'socket-connect'
  | 'socket-close' | 'socket-end' | 'socket-lookup' | 'socket-timeout' | 'request-error'
  | 'response' | 'response-aborted' | 'response-error' | 'response-close' | 'response-end';
```

`data` parameter associated to events:
- `abort`: None / `abort` event of `request`
- `socket`: `{ socket: Socket }` / `request.socket` object, when it is available through `request.on('socket')`
- `socket-error`: `{ socket: Socket, error: Error }` / `error` event of `request.socket`
- `socket-connect`: `{ socket: Socket }` / `connect` event of `request.socket`
- `socket-close`: `{ socket: Socket, withError: boolean }` / `close` event of `request.socket`
- `socket-end`: `{ socket: Socket }` / `end` event of `request.socket`
- `socket-lookup`: `{ socket: Socket, data: [err: Error?, address: string, family: string | number, host: string] }` / `lookup` event of `request.socket`
- `socket-timeout`: `{ socket: Socket }` / `timeout` event of `request.socket`
- `request-error`: `{ requestError: Error }` / `error` event of `request`
- `response`: `{ res: IncomingMessage }` / `response` object, when it is available through `request.on('response')`
- `response-aborted`: `{ error?: Error }` / `aborted` event of `response`
- `response-error`: `{ error: Error }` / `error` event of `response`
- `response-close`: `{ data: string }` (raw response data) / `close` event of `response`
- `response-end`: None / `end` event of `response`

## Advanced: Debug all made requests

If you keep obtaining errors and you don't know how to obtain the response data, or you want to see exactly what have been sent to Twitter,
you can enable the debug mode:
```ts
import { TwitterApiV2Settings } from 'twitter-api-v2';

TwitterApiV2Settings.debug = true;
```

By default, **all requests and responses** will be printed to console.

You can customize the output by implementing your own debug logger:
```ts
// Here's the default logger:
TwitterApiV2Settings.logger = {
  log: (msg, payload) => console.log(msg, payload),
};

// .logger follows this interface:
interface ITwitterApiV2SettingsLogger {
  log(message: string, payload?: any): void;
}

// An example for a file logger
import * as fs from 'fs';
import * as util from 'util';

const destination = fs.createWriteStream('requests.log', { flags: 'a' });

TwitterApiV2Settings.logger = {
  log: (msg, payload) => {
    if (payload) {
      const strPayload = util.inspect(payload);
      destination.write(msg + ' ' + strPayload);
    } else {
      destination.write(msg);
    }
  },
};
```

## Common errors

X explains why a request failed in the response body, which you find in `error.data`.
The error message doesn't always include it, so log `error.data` first:

```ts
import { ApiResponseError } from 'twitter-api-v2';

try {
  await client.v2.tweet('Hello!');
} catch (error) {
  if (error instanceof ApiResponseError) {
    console.log(error.code, error.data);
  }
}
```

### 401 Unauthorized

X doesn't accept your credentials:
- A key or token is wrong or empty. Check that your environment variables are loaded.
- You regenerated your keys or tokens in the Developer Console, which revokes the old ones.
- Your OAuth 2.0 user access token expired (they last two hours): [refresh it](./auth.md#optional-refresh-the-token-later).

### 402 Payment Required

Your account ran out of credits. X doesn't document this code yet, but pay-per-use accounts get it when their credit balance is used up:
requests fail until you add credits in the Developer Console. See [X pricing](https://docs.x.com/x-api/getting-started/pricing).

### 403 Forbidden

Your credentials are valid, but they don't allow this request. `error.data.detail` usually tells you why:
- **"Authenticating with OAuth 2.0 Application-Only is forbidden for this endpoint"**: you used the bearer token (or `.appLogin()`) for an endpoint that acts as a user, like posting or `v2.me()`.
  Use OAuth 1.0a user keys or an OAuth 2.0 user token, see [which credentials to use](./auth.md#which-credentials-to-use).
- **"Authenticating with Unknown is forbidden for this endpoint"**: X couldn't use the credentials you sent.
  Check that none of them is empty, then regenerate the access token and secret in the Developer Console.
- **"Your client app is not configured with the appropriate oauth1 app permissions for this endpoint"**: your app is read-only.
  Set it to "Read and write" in its user authentication settings, then regenerate the access token and secret.
- **A plain "Forbidden" with an OAuth 2.0 user token**: the token misses a scope this endpoint needs, like `tweet.write`, `media.write` or `dm.write`.
  Add it to your scopes, and send the user through the auth flow again.
- **"client-not-enrolled"**, or a message saying your app must be attached to a Project: create your app inside a Project in the Developer Console,
  and check that your access includes this endpoint.
- **"You currently have access to a subset of X API v2 endpoints..." (code 453)**: you called a v1.1 endpoint your access doesn't include. Use the v2 method instead.

### Requests X no longer allows

Some requests fail even with the right credentials and scopes, because X restricted them on self-serve (pay-per-use) plans:
- Since February 23, 2026, you can only reply to a tweet when its author summoned you, by mentioning your account or quoting one of your posts.
- Since April 20, 2026, following, liking and quoting are removed from self-serve plans.

Enterprise plans are not affected. See the [X changelog](https://docs.x.com/changelog).

### 429 Too Many Requests

You hit a rate limit, or a usage cap like the monthly cap of post reads.
`error.rateLimitError` is `true`, and `error.rateLimit` tells you when the limit resets, see [rate limiting](./rate-limiting.md).
If `error.rateLimit.day` or `error.rateLimit.userDay` has `remaining: 0`, you hit a 24-hour limit.
