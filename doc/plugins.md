# Plugins for `twitter-api-v2`

Since version `1.11.0`, library supports plugins.
Plugins are objects exposing specific functions, called by the library at specific times.

## Using plugins

Import your plugin, instantiate them (if needed), and give them in the `plugins` array of client settings.

```ts
import { TwitterApi } from 'twitter-api-v2'
import { TwitterApiCachePluginRedis } from '@twitter-api-v2/plugin-cache-redis'

const redisPlugin = new TwitterApiCachePluginRedis(redisInstance)

const client = new TwitterApi(yourKeys, { plugins: [redisPlugin] })
```

## Writing plugins

You can write object/classes that implements the following interface:
```ts
interface ITwitterApiClientPlugin {
  // Classic requests
  /* Executed when request is about to be prepared. OAuth headers, body, query normalization hasn't been done yet. */
  onBeforeRequestConfig?: TTwitterApiBeforeRequestConfigHook
  /* Executed when request is about to be made. Headers/body/query has been prepared, and HTTP options has been initialized. */
  onBeforeRequest?: TTwitterApiBeforeRequestHook
  /* Executed when a request succeeds (failed requests don't trigger this hook). */
  onAfterRequest?: TTwitterApiAfterRequestHook
  // Error handling in classic requests
  /* Executed when Twitter doesn't reply (network error, server disconnect). */
  onRequestError?: TTwitterApiRequestErrorHook
  /* Executed when Twitter reply but with an error? */
  onResponseError?: TTwitterApiResponseErrorHook
  // Stream requests
  /* Executed when a stream request is about to be prepared. This method **can't** return a `Promise`. */
  onBeforeStreamRequestConfig?: TTwitterApiBeforeStreamRequestConfigHook
  // Request token
  /* Executed after a `.generateAuthLink`, mainly to allow automatic collect of `oauth_token`/`oauth_token_secret` couples. `.generateAuthLink` waits for it, and rejects if it fails. */
  onOAuth1RequestToken?: TTwitterApiAfterOAuth1RequestTokenHook
  /* Executed after a `.generateOAuth2AuthLink`, mainly to allow automatic collect of `state`/`codeVerifier` couples. `.generateOAuth2AuthLink` is sync: it doesn't wait for a returned `Promise`, and only logs an error of the hook with `TwitterApiV2Settings.logger`. */
  onOAuth2RequestToken?: TTwitterApiAfterOAuth2RequestTokenHook
}
```

Every method is optional, because you can implement whatever you want to listen to.

Method types:
```ts
type TTwitterApiBeforeRequestConfigHook = (args: ITwitterApiBeforeRequestConfigHookArgs) => PromiseOrType<TwitterResponse<any> | void>
type TTwitterApiBeforeRequestHook = (args: ITwitterApiBeforeRequestHookArgs) => void | Promise<void>
type TTwitterApiAfterRequestHook = (args: ITwitterApiAfterRequestHookArgs) => PromiseOrType<TwitterApiPluginResponseOverride | void>
type TTwitterApiRequestErrorHook = (args: ITwitterApiRequestErrorHookArgs) => PromiseOrType<TwitterApiPluginResponseOverride | void>
type TTwitterApiResponseErrorHook = (args: ITwitterApiResponseErrorHookArgs) => PromiseOrType<TwitterApiPluginResponseOverride | void>
type TTwitterApiBeforeStreamRequestConfigHook = (args: ITwitterApiBeforeRequestConfigHookArgs) => void
type TTwitterApiAfterOAuth1RequestTokenHook = (args: ITwitterApiAfterOAuth1RequestTokenHookArgs) => void | Promise<void>
type TTwitterApiAfterOAuth2RequestTokenHook = (args: ITwitterApiAfterOAuth2RequestTokenHookArgs) => void | Promise<void>
```

A simple plugin implementation that logs GET requests can be:

```ts
class TwitterApiLoggerPlugin implements ITwitterApiClientPlugin {
  onBeforeRequestConfig(args: ITwitterApiBeforeRequestConfigHookArgs) {
    const method = args.params.method.toUpperCase()
    console.log(`${method} ${args.url.toString()} ${JSON.stringify(args.params.query)}`)
  }
}

const client = new TwitterApi(yourKeys, { plugins: [new TwitterApiLoggerPlugin()] })
```
