# Examples

Those examples use the v2 API: X no longer serves most v1.1 endpoints.

Presented examples are **not exhaustive**. Every endpoint wrappers are available in [the v1.1 comprehensive documentation](./v1.md), [the v2 comprehensive documentation](./v2.md) and [the stream-related comprehensive documentation](./streaming.md).

All the used entities (classes, interfaces, enums...) are imported from `twitter-api-v2` package.

All returned types and parameters only reflect available data on Twitter API documentation.
For each implemented endpoint, you have a link to documentation available in JSDoc comment.

**Note:** Top-level use of `await` is not available in most of Node.js usage. You might need to wrap `await`s into async functions. See [MDN related documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function).

<!-- vscode-markdown-toc -->
* [Create a client](#create-a-client)
	* [With user credentials (act as a logged user)](#with-user-credentials-act-as-a-logged-user)
	* [With app-only credentials](#with-app-only-credentials)
	* [Select the right level of your client](#select-the-right-level-of-your-client)
* [Tweets](#tweets)
	* [Fetch and navigate through home timeline](#fetch-and-navigate-through-home-timeline)
	* [Fetch and navigate through a user timeline](#fetch-and-navigate-through-a-user-timeline)
	* [Post a new tweet with multiple images](#post-a-new-tweet-with-multiple-images)
	* [Reply to a tweet with a video](#reply-to-a-tweet-with-a-video)
	* [Stream tweets in real time](#stream-tweets-in-real-time)
* [Direct messages](#direct-messages)
	* [Send a direct message with an image](#send-a-direct-message-with-an-image)
* [Auth flow](#auth-flow)
	* [Generate a auth link and get access tokens (OAuth 1.0a)](#generate-a-auth-link-and-get-access-tokens-oauth-10a)
	* [Generate a auth link and get access tokens (OAuth 2)](#generate-a-auth-link-and-get-access-tokens-oauth-2)
* [HTTP wrappers](#http-wrappers)
	* [Make a GET HTTP request to a Twitter endpoint](#make-a-get-http-request-to-a-twitter-endpoint)
	* [Build a POST query with a custom body](#build-a-post-query-with-a-custom-body)

<!-- vscode-markdown-toc-config
	numbering=false
	autoSave=true
	/vscode-markdown-toc-config -->
<!-- /vscode-markdown-toc -->

## Create a client

### With user credentials (act as a logged user)

This kind of auth is needed for endpoint mentioned with `"OAuth 1.0a User context"` or `"OAuth 2.0 Authorization Code with PKCE"` in Twitter documentation.
Usually, this is used to act on behalf of a user.

Access token and access secret are obtained through [the 3-legged auth flow](./auth.md).

- OAuth 1.0a User context (the most common, supports API v1.1 & v2)

This authentication method requires to use a couple of 4 keys, 2 are your app keys and 2 are obtained with the 3-legged auth flow.
```ts
const client = new TwitterApi({
  appKey: '<YOUR-TWITTER-APP-TOKEN>',
  appSecret: '<YOUR-TWITTER-APP-SECRET>',
  accessToken: '<YOUR-TWITTER-ACCESS-TOKEN>',
  accessSecret: '<YOUR-TWITTER-ACCESS-SECRET>',
});
// NOTE: accessToken and accessSecret are not required if you want to generate OAuth login links.
```

- OAuth 2.0 Authorization Code with PKCE (fine-grained scopes, API v2 only)

This authentication method only requires to use the obtained **access token** with the 3-legged OAuth2 auth flow.
```ts
const client = new TwitterApi('<YOUR-ACCESS-TOKEN>');
```

If your access token is no longer valid, but you have a refresh token (you've specified `offline.access` in scope array), you can ask for a new access token with your client keys:
```ts
const client = new TwitterApi({ clientId: '<YOUR-CLIENT-ID>', clientSecret: '<YOUR-CLIENT-SECRET>' });
const { client: refreshedClient, accessToken, refreshToken } = await client.refreshOAuth2Token('<YOUR-REFRESH-TOKEN>');

// Use {refreshedClient}, and save {accessToken} and {refreshToken} in your storage to use them later
```

### With app-only credentials

This kind of auth is accepted on Twitter endpoints with `"OAuth 2.0 Bearer token"` (or Application context) mentioned in documentation.

```ts
const client = new TwitterApi('<YOUR-TWITTER-BEARER-TOKEN>');
```

### Select the right level of your client

Twitter API v2 let you customize the right-level of your client. This should match your app-level defined in Twitter Apps portal.
This doesn't enforce anything at request level, but it will filter listed endpoint wrappers by your IDE through code suggestions.

> Note: If you use OAuth2 user-context, those levels don't match with the available scopes. Just use the classic client in this case.

```ts
// By default, client are created with the max right-level (Read+Write+DMs)
const client = new TwitterApi('<YOUR-TWITTER-BEARER-TOKEN>');

// Read+Write level
const rwClient = client.readWrite;

// Read-only level
const roClient = client.readOnly;
```

## Tweets

### Fetch and navigate through home timeline

Download tweets of home timeline and consume them with a paginator.

```ts
const homeTimeline = await client.v2.homeTimeline();

// Current page is in homeTimeline.tweets
console.log(homeTimeline.tweets.length, 'fetched.');

const nextHomePage = await homeTimeline.next();
console.log('Fetched tweet IDs in next page:', nextHomePage.tweets.map(tweet => tweet.id));
```

### Fetch and navigate through a user timeline

Download tweets of user timeline using v2 API and consume them with a paginator.

This example uses the `TwitterV2IncludesHelper`, [learn more about it here](./helpers.md#helpers-for-includes-of-v2-api-responses).

```ts
const jackTimeline = await client.v2.userTimeline('12', {
  expansions: ['attachments.media_keys', 'attachments.poll_ids', 'referenced_tweets.id'],
  'media.fields': ['url'],
});

// jackTimeline.includes contains a TwitterV2IncludesHelper instance
for await (const tweet of jackTimeline) {
  const medias = jackTimeline.includes.medias(tweet);
  const poll = jackTimeline.includes.poll(tweet);

  if (medias.length) {
    console.log('This tweet contains medias! URLs:', medias.map(m => m.url));
  }
  if (poll) {
    console.log('This tweet contains a poll! Options:', poll.options.map(opt => opt.label));
  }
}
```

### Post a new tweet with multiple images

```ts
// First, post all your images to Twitter
const mediaIds = await Promise.all([
  // file path
  client.v2.uploadMedia('./my-image.jpg', { media_type: 'image/jpeg' }),
  // from a buffer, for example obtained with an image modifier package
  client.v2.uploadMedia(Buffer.from(rotatedImage), { media_type: 'image/png' }),
]);

// mediaIds is a string[], can be given to .tweet
await client.v2.tweet({
  text: 'My tweet text with two images!',
  media: { media_ids: mediaIds }
});
```

### Reply to a tweet with a video

```ts
// The file is read and uploaded chunk by chunk
const mediaIdVideo = await client.v2.uploadMedia('./test-video.mp4', { media_type: 'video/mp4' });

await client.v2.reply('Look at my video!', tweetIdToReply, { media: { media_ids: [mediaIdVideo] } });
```

### Stream tweets in real time

Listen for a bunch of words using v2 stream filter API.

```ts
// Filtered stream endpoints need app-only auth (Bearer token), while replying needs a user context
const appClient = new TwitterApi('<YOUR-BEARER-TOKEN>');
const userClient = new TwitterApi({ appKey, appSecret, accessToken, accessSecret });
const { data: meAsUser } = await userClient.currentUserV2();

// Get and delete old rules if needed
const rules = await appClient.v2.streamRules();
if (rules.data?.length) {
  await appClient.v2.updateStreamRules({
    delete: { ids: rules.data.map(rule => rule.id) },
  });
}

// Add our rules
await appClient.v2.updateStreamRules({
  add: [{ value: 'JavaScript' }, { value: 'NodeJS' }],
});

const stream = await appClient.v2.searchStream({
  'tweet.fields': ['referenced_tweets', 'author_id'],
  expansions: ['referenced_tweets.id'],
});
// Enable auto reconnect
stream.autoReconnect = true;

stream.on(ETwitterStreamEvent.Data, async tweet => {
  // Ignore RTs or self-sent tweets
  const isARt = tweet.data.referenced_tweets?.some(tweet => tweet.type === 'retweeted') ?? false;
  if (isARt || tweet.data.author_id === meAsUser.id) {
    return;
  }

  // Reply to tweet
  await userClient.v2.reply('Did you talk about JavaScript? love it!', tweet.data.id);
});
```

## Direct messages

### Send a direct message with an image

```ts
const imgMediaId = await client.v2.uploadMedia('./test-image.jpg', { media_type: 'image/jpeg', media_category: 'dm_image' });

await client.v2.sendDmToParticipant('12', {
  text: 'Hello, have a great day :)',
  attachments: [{ media_id: imgMediaId }],
});
```

## Auth flow

You can see a [real-life example of a 3-legged auth flow here](https://github.com/alkihis/twitter-api-v2-user-oauth-flow-example).

See also [authentication documentation](./auth.md) for examples and explanations about Twitter auth flow.

### Generate a auth link and get access tokens (OAuth 1.0a)

```ts
// Create a partial client for auth links
const client = new TwitterApi({ appKey: '<YOUR-TWITTER-APP-TOKEN>', appSecret: '<YOUR-TWITTER-APP-SECRET>' });
const authLink = await client.generateAuthLink('oob');
// Redirect your client to authLink.url
console.log('Please go to', authLink.url);

// ... user redirected to https://your-website.com?oauth_token=XXX&oauth_verifier=XXX after user app validation
// Create a temporary client with previous-step tokens
const connecterClient = new TwitterApi({
  appKey: '<YOUR-TWITTER-APP-TOKEN>',
  appSecret: '<YOUR-TWITTER-APP-SECRET>',
  accessToken: authLink.oauth_token,
  accessSecret: authLink.oauth_token_secret,
});
// Validate verifier to get definitive access token & secret
const { accessToken, accessSecret } = await connecterClient.login('<THE_OAUTH_VERIFIER>');

console.log('Access token and secret for logged client:', accessToken, accessSecret);
```

### Generate a auth link and get access tokens (OAuth 2)

```ts
// Create a partial client for auth links
const client = new TwitterApi({ clientId: '<YOUR-CLIENT-ID>', clientSecret: '<YOUR-CLIENT-SECRET>' });
const { url, codeVerifier, state } = client.generateOAuth2AuthLink('<CALLBACK_URL>', { scope: ['tweet.read', 'users.read', 'offline.access'] });
// Redirect your client to {url}
console.log('Please go to', url);

// ... user redirected to https://your-website.com?code=XXX&state=XXX after user app validation
// Validate code to get access token
const { client: loggedClient, accessToken, refreshToken } = await client.loginWithOAuth2({ code, codeVerifier, redirectUri: '<CALLBACK_URL>' });

console.log('Access token for logged client:', accessToken);
console.log('Refresh token to store for client:', refreshToken);
```

## HTTP wrappers

You can directly use HTTP wrappers to make custom requests.
Requests under `.v1` are prefixed with `https://api.x.com/1.1/`, and under `.v2` are prefixed with `https://api.x.com/2/`.

It means that if you need to use a different domain, for example `https://publish.x.com/`, you **must specify it manually** (see below).

### Make a GET HTTP request to a Twitter endpoint

```ts
// With default prefix
const result = await client.v2.get('tweets/search/recent', { query: 'nodeJS', max_results: 100 });
console.log(result.data); // TweetV2[]

// With custom prefix
const embed = await client.v2.get<OembedTweetV1Result>(
  'oembed',
  { url: 'https://x.com/i/statuses/20' },
  { prefix: 'https://publish.x.com/' },
);
console.log('Embed HTML:', embed.html);
```

### Build a POST query with a custom body

By default, `twitter-api-v2` tries to auto-detect the body format needed for the desired endpoint.
But if this doesn't work (fe Twitter error of invalid body format), you can build a request with a fixed body format.

`forceBodyMode` property accepts:
- `url` for URL-encoded bodies (OAuth and v1.1 endpoints)
- `form-data` for multipart/form-data encoded bodies (endpoints with file upload)
- `json` for JSON-encoded bodies (v2 endpoints)
- `raw` if you've already encoded the body (the body **must be a `Buffer`**)

```ts
// Manually upload a media chunk
await client.v2.post(
  'media/upload/20/append',
  { segment_index: 0, media: fs.readFileSync('./media.jpg') },
  { forceBodyMode: 'form-data' },
);
```
