# Authentication

This part will guide you through the multiple steps of Twitter API authentication process
inside `twitter-api-v2` package.

Please first see the [Basics](./basics.md) to know how to create a client with your application keys.

## Which credentials to use

Your app's credentials are in the [X Developer Console](https://console.x.com), under "Keys and tokens".
Which ones you need depends on what you want to do:

| You want to | Use | Client |
| --- | --- | --- |
| Read public data (search, users, timelines), use the filtered stream | App-only auth: the app's **Bearer Token** | `new TwitterApi(BEARER_TOKEN)` |
| Act as your own account (a personal bot, your own automation) | OAuth 1.0a: the **API Key & Secret**, plus the **Access Token & Secret** generated in the console | `new TwitterApi({ appKey, appSecret, accessToken, accessSecret })` |
| Act on behalf of other users | [OAuth 2.0 with scopes](#oauth2-user-wide-authentication-flow) (recommended by X), or the [3-legged OAuth 1.0a flow](#user-wide-authentication-flow) | `new TwitterApi(USER_ACCESS_TOKEN)`, or the 4 OAuth 1.0a keys |
| Use the [Ads API](./ads.md) | OAuth 1.0a | `new TwitterApi({ appKey, appSecret, accessToken, accessSecret })` |

How the console names map to the client fields:
- API Key and API Key Secret (also called consumer key and secret): `appKey` and `appSecret`
- Access Token and Access Token Secret: `accessToken` and `accessSecret`. The ones generated in the console belong to the account that owns the app.
- Bearer Token: the string given to `new TwitterApi()`
- Client ID and Client Secret: `clientId` and `clientSecret`. They are only used to run the OAuth 2.0 flow and refresh its tokens, they can't call the API by themselves.

What often goes wrong:
- **The bearer token is read-only.** It identifies your app, not a user, so it can't post, like, send DMs or call `v2.me()`:
  X answers with a 403 "Authenticating with OAuth 2.0 Application-Only is forbidden for this endpoint".
  An OAuth 2.0 *user* access token is also given to `new TwitterApi()` as a string, but it acts as that user.
- **Writing with OAuth 1.0a needs "Read and write" app permissions.** Set them in your app's user authentication settings,
  then regenerate the access token and secret: tokens keep the permissions they were created with.
- **OAuth 2.0 tokens only get the scopes you asked for.** Most endpoints need `tweet.read` and `users.read`, posting needs `tweet.write` too,
  uploading media needs `media.write`, and you need `offline.access` to get a refresh token.
  X lists the scopes of every endpoint in its [authentication mapping](https://docs.x.com/fundamentals/authentication/guides/v2-authentication-mapping).
  To add a scope, send the user through the flow again.
- **Some endpoints only accept one kind of auth.** For example, the filtered stream only works with the bearer token,
  so a bot that streams tweets and replies to them needs two clients (see [this example](./examples.md#stream-tweets-in-real-time)).

If you get a 401 or 403 anyway, see [common errors](./errors.md#common-errors).

## Authentication flows

The rest of this page explains each flow:

- User authentication (3-legged OAuth 1.0a flow, see [User-wide authentication flow](#user-wide-authentication-flow))
- App-only authentication (Bearer token, see [Application-only authentication flow](#application-only-authentication-flow))
- Basic authentication (couple of username+password, see [Basic authentication flow](#basic-authentication-flow))
- User authentication, but with fine-grained scopes (3-legged OAuth 2 flow, see [User-wide authentication flow for OAuth2](#oauth2-user-wide-authentication-flow))

**Note**: You can find a [project real-life example of a 3-legged auth flow here](https://github.com/alkihis/twitter-api-v2-user-oauth-flow-example).

## User-wide authentication flow

Many endpoints on the Twitter developer platform use the OAuth 1.0a method to act on behalf of a Twitter account.
For example, if you have a Twitter developer app, you can make API requests on behalf of any Twitter account as long as that user authenticates your app.

This method is **fairly the most complex** of authentication flow options.
X now recommends [OAuth 2.0](#oauth2-user-wide-authentication-flow) to act on behalf of users, but OAuth 1.0a still works with v2 endpoints, and the Ads API only accepts OAuth 1.0a.

**Note**: If you only need to act as your own account, you don't need this flow: generate the access token and secret in the Developer Console.

It is named "3-legged" because it is split in 3 parts:
1. You (the app/server) generate a auth link that is clickable by a external user, and gives you *temporary* access tokens
2. The user clicks on the link, approves the application, it gives you a verifier token
3. You use the *temporary* access tokens and verifier token to obtain **user-specific** *persistent* access tokens

**NOTE**
> - If you're building a server that serves content for users,
>   you need to "remember" (store) some data between the first two steps,
>   so be sure you have a available session-like store (file/memory/Redis/...) to share data across same-user requests.
> - Between steps 1 & 2, users are redirected to official Twitter website. That means you need to have ***either***:
>   - A dedicated page in your website meant to "welcome back" users that have been sent to Twitter (this is called **oauth callback**)
>   - A dedicated input field where users can input a *PIN code* when they accepted you app on Twitter

### Create the auth link

You need to have a client instantiated with your **consumer keys** from Twitter.
```ts
const client = new TwitterApi({ appKey: CONSUMER_KEY, appSecret: CONSUMER_SECRET });
```

To create the authentication link, use `client.generateAuthLink()` method.
**If you choose to redirect users to your website after authentication, you need to provide a callback URL here.**
It must be one of the callback URLs registered in your app's user authentication settings. Use `'oob'` instead for the PIN flow.
```ts
const authLink = await client.generateAuthLink(CALLBACK_URL);

// By default, oauth/authenticate are used for auth links, you can change with linkMode
// property in second parameter to 'authorize' to use oauth/authorize
const authLink = await client.generateAuthLink(CALLBACK_URL, { linkMode: 'authorize' });

// Use URL generated
const ... = authLink.url;
```

**IMPORTANT**: You need to store `authLink.oauth_token` and `authLink.oauth_token_secret` somewhere,
because you will need them for step 2.

### Collect temporary access tokens and get persistent tokens

#### Case 1: User has been redirected to your callback URL
When Twitter redirects to your page, it provides two query string parameters: `oauth_token` and `oauth_verifier`.

**NOTE**: If the user refuses app access, `oauth_verifier` will not be provided.

You need to extract those tokens, find the linked `oauth_token_secret` from given `oauth_token` (using your session store!),
then ask for persistent tokens.

Create a client with these tokens as access token, then call `client.login(oauth_verifier)` to create a logged client.

An example flow will be written here using the **express** framework, feel free to adapt to your case.

```ts
app.get('/callback', (req, res) => {
  // Extract tokens from query string
  const { oauth_token, oauth_verifier } = req.query;
  // Get the saved oauth_token_secret from session
  const { oauth_token_secret } = req.session;

  if (!oauth_token || !oauth_verifier || !oauth_token_secret) {
    return res.status(400).send('You denied the app or your session expired!');
  }

  // Obtain the persistent tokens
  // Create a client from temporary tokens
  const client = new TwitterApi({
    appKey: CONSUMER_KEY,
    appSecret: CONSUMER_SECRET,
    accessToken: oauth_token,
    accessSecret: oauth_token_secret,
  });

  client.login(oauth_verifier)
    .then(({ client: loggedClient, accessToken, accessSecret }) => {
      // loggedClient is an authenticated client in behalf of some user
      // Store accessToken & accessSecret somewhere
    })
    .catch(() => res.status(403).send('Invalid verifier or access tokens!'));
});
```

#### Case 2: You choose to use a PIN

You need to extract the given PIN and use it as `oauth_verifier`.

Create a client with previously obtain tokens (during link generation step) as access token,
then call `client.login(given_pin)` to create a logged client.

```ts
// Obtain the persistent tokens
// Create a client from temporary tokens
const client = new TwitterApi({
  appKey: CONSUMER_KEY,
  appSecret: CONSUMER_SECRET,
  accessToken: oauth_token, // oauth token from previous step (link generation)
  accessSecret: oauth_token_secret, // oauth token secret from previous step (link generation)
});

// Give the PIN to client.login()
const { client: loggedClient, accessToken, accessSecret } = await client.login(GIVEN_USER_PIN);
// loggedClient is an authenticated client in behalf of some user
// Store accessToken & accessSecret somewhere
```

### Finally, get the full logged user object

You can use the method `.currentUserV2()` on your client.

This a shortcut to `.v2.me()` with a **cache that store user to avoid multiple API calls**.
Its returns a `UserV2Result` object.

## Application-only authentication flow

App-only flow use a single OAuth 2.0 Bearer Token that authenticates requests on behalf of your developer App.
As this method is specific to the App, it does not involve any users.
This method is typically for developers that need read-only access to public information.

You can instantiate a Twitter API client with two ways:
- If you already know your Bearer token (you can obtain it in the developer portal), you can use it directly in the constructor as a `string`:
```ts
const client = new TwitterApi(MY_BEARER_TOKEN);
```
- Otherwise, if you've stored your consumers (key & secret, the same needed for OAuth 1.0a flow), you can use them to obtain a fresh Bearer token:
```ts
const consumerClient = new TwitterApi({ appKey: CONSUMER_KEY, appSecret: CONSUMER_SECRET });
// Obtain app-only client
const client = await consumerClient.appLogin();
```

## Basic authentication flow

Mainly for **Twitter enterprise APIs**, that require the use of HTTP Basic Authentication.
You must pass a valid email address and password combination for each request.
The email and password combination are the same ones that you will use to access the enterprise API console, and can be edited from within this console.

Use this combination to create your Twitter API client:
```ts
const client = new TwitterApi({ username: MY_USERNAME, password: MY_PASSWORD });
```

## OAuth2 user-wide authentication flow

OAuth2 user-context is the method X recommends to act on behalf of users. It only works with **v2 of Twitter API**.
This process is very similar of one used in OAuth 1.0a, so it's recommended to read it first to understand what's happening below.

The main advantage of this method is that you can **explicitly specify which part of data you'll need from the Twitter user's account**.
These parts are called **scopes**.

This authentication is split into 3 parts:
1. You (the app/server) generate a auth link with your client ID that is clickable by an external user
2. The user clicks on the link, approves the application, it gives you a client code
3. You use a code verifier generated at the first step along the client code to obtain **user-specific** access token; this token has a dedicated lifetime that can be extended with refresh tokens

**NOTE**
> - If you're building a server that serves content for users,
>   you need to "remember" (store) some data between the first two steps,
>   so be sure you have a available session-like store (file/memory/Redis/...) to share data across same-user requests.
> - Between steps 1 & 2, users are redirected to official Twitter website. That means you need to have a dedicated page in your website meant to "welcome back" users that have been sent to Twitter (this is called **oauth callback**)

### Create the auth link

You need to have a client instantiated with your **client keys** from Twitter.
If you've declared app as "public" app (Native App or Single page App), you only need your **client ID**,
if you've declared app as "confidential" app (Web App, Automated App or Bot), you will need **client ID and client secret**.

```ts
const client = new TwitterApi({ clientId: CLIENT_ID, clientSecret: CLIENT_SECRET });
```

To create the authentication link, use `client.generateOAuth2AuthLink()` method.
**You need to provide a callback URL here.** It must exactly match one of the callback URLs registered in your app's user authentication settings.
```ts
// Ask for every scope your app needs: 'tweet.write' to post, 'media.write' to upload media, etc.
// Don't forget to specify 'offline.access' in scope list if you want to refresh your token later
// Include 'users.email' if you need to access user's email address
const { url, codeVerifier, state } = client.generateOAuth2AuthLink(CALLBACK_URL, { scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'] });

// Redirect your user to {url}, store {state} and {codeVerifier} into a DB/Redis/memory after user redirection
```

**IMPORTANT**: You need to store `state` and `codeVerifier` somewhere,
because you will need them for step 2.

### Collect returned auth codes and get access token

When Twitter redirects to your page, it provides two query string parameters: `code` and `state`.

**NOTE**: If the user refuses app access, `code` will not be provided.

You need to extract those tokens, find the linked `codeVerifier` from given `state` (using your session store!), then ask for access token.

Create a client with your **client ID** (and the **client secret** if it's needed), like at step 1.

An example flow will be written here using the **express** framework, feel free to adapt to your case.

```ts
app.get('/callback', (req, res) => {
  // Extract state and code from query string
  const { state, code } = req.query;
  // Get the saved codeVerifier from session
  const { codeVerifier, state: sessionState } = req.session;

  if (!codeVerifier || !state || !sessionState || !code) {
    return res.status(400).send('You denied the app or your session expired!');
  }
  if (state !== sessionState) {
    return res.status(400).send('Stored tokens didnt match!');
  }

  // Obtain access token
  const client = new TwitterApi({ clientId: CLIENT_ID, clientSecret: CLIENT_SECRET });

  client.loginWithOAuth2({ code, codeVerifier, redirectUri: CALLBACK_URL })
    .then(async ({ client: loggedClient, accessToken, refreshToken, expiresIn }) => {
      // {loggedClient} is an authenticated client in behalf of some user
      // Store {accessToken} somewhere, it will be valid until {expiresIn} is hit.
      // If you want to refresh your token later, store {refreshToken} (it is present if 'offline.access' has been given as scope)

      // Example request
      const { data: userObject } = await loggedClient.v2.me();
    })
    .catch(() => res.status(403).send('Invalid verifier or access tokens!'));
});
```

### Use your access token

The `.loginWithOAuth2()` method already returns a logged client, but if you want to create an instance by yourself with an access token (for example to make a request from a saved access token), use it as a **Bearer token**.

```ts
const client = new TwitterApi('<YOUR-ACCESS-TOKEN>');
```

Access tokens expire after two hours (`expiresIn` is in seconds). To keep acting for the user, refresh them as shown below.

### Optional: refresh the token later

If you choose to include `'offline.access'` as scope, you can store and re-use later `refreshToken` when `expiresIn` time kicks in.

```ts
const client = new TwitterApi({ clientId: '<YOUR-CLIENT-ID>', clientSecret: '<YOUR-CLIENT-SECRET>' });

// Obtain the {refreshToken} from your DB/store
const { client: refreshedClient, accessToken, refreshToken: newRefreshToken } = await client.refreshOAuth2Token(refreshToken);

// Store refreshed {accessToken} and {newRefreshToken} to replace the old ones

// Example request
await refreshedClient.v2.me();
```

### Optional: migrate OAuth 1.0a users to OAuth 2.0

Users who authorized your app with OAuth 1.0a can get OAuth 2.0 tokens without logging in again.
`.exchangeOAuth1Token()` trades their access token and secret for an OAuth 2.0 access token and refresh token, with the scopes that match their OAuth 1.0a permissions ([X docs](https://docs.x.com/fundamentals/authentication/oauth-2-0/oauth-1-0a-token-exchange)).

Create the client with your OAuth 2.0 client ID, plus the client secret for a confidential client.

```ts
const client = new TwitterApi({ clientId: '<YOUR-CLIENT-ID>', clientSecret: '<YOUR-CLIENT-SECRET>' });

// Obtain the {accessToken} and {accessSecret} of the user from your DB/store
const { client: oauth2Client, accessToken: newAccessToken, refreshToken } = await client.exchangeOAuth1Token({ accessToken, accessSecret });

// Store {newAccessToken} and {refreshToken}, then refresh them with .refreshOAuth2Token()
await oauth2Client.v2.me();
```

Exchanging the same OAuth 1.0a token again gives a new token pair and invalidates the previous one.

### Troubleshooting the OAuth2 flow

If the authorization page shows an error, or `.loginWithOAuth2()` fails with "Value passed for the authorization code was invalid":
- **Exchange each code only once.** A code works once, and only for 30 seconds. If your callback runs twice, the second exchange fails:
  React StrictMode runs effects twice in development, and reloading the callback page sends the same code again.
  Exchange the code on your server, once, and store the tokens.
- **Use the `codeVerifier` and `state` of the link the user clicked.** They come from the same `.generateOAuth2AuthLink()` call as its `url`.
  Generating a new link (on every page render, for example) gives a new `codeVerifier`, which won't work with the code of the previous link.
- **Use the same callback URL everywhere.** The `redirectUri` given to `.loginWithOAuth2()` must be the one given to `.generateOAuth2AuthLink()`,
  and both must exactly match a callback URL of your app, scheme, port, path and trailing slash included.
- **Redirect the browser to `url`, don't `fetch()` it.** It's a page where the user approves your app.
