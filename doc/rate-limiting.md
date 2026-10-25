# Rate limiting

## Extract rate limit information with plugins

Plugin `@twitter-api-v2/plugin-rate-limit` can help you to store/get rate limit information.
It stores automatically rate limits sent by Twitter at each request and gives you an API to get them when you need to.

```ts
import { TwitterApi } from 'twitter-api-v2'
import { TwitterApiRateLimitPlugin } from '@twitter-api-v2/plugin-rate-limit'

const rateLimitPlugin = new TwitterApiRateLimitPlugin()
const client = new TwitterApi(yourKeys, { plugins: [rateLimitPlugin] })

// ...make requests...
await client.v2.me()
// ...

const currentRateLimitForMe = await rateLimitPlugin.v2.getRateLimit('users/me')
console.log(currentRateLimitForMe.limit) // 75
console.log(currentRateLimitForMe.remaining) // 74
```

## With HTTP methods helpers

If you use a HTTP method helper (`.get`, `.post`, ...), you can get a **full response** object that directly contains the rate limit information,
even if the request didn't fail!
```ts
const manualFullResponse = await client.v2.get<Tweetv2SearchResult>('tweets/search/recent', { query: 'nodeJS' }, { fullResponse: true });

// Response data
manualFullResponse.data; // Tweetv2SearchResult
// Rate limit information
manualFullResponse.rateLimit; // { limit: number, remaining: number, reset: number }
// Optional daily limits
manualFullResponse.rateLimit.day; // Application 24h limit (if provided)
manualFullResponse.rateLimit.userDay; // User 24h limit (if provided)
```

## Handle errors - Everywhere in this library

This library helps you to handle rate limiting.
When a request fails (with a Twitter response), it create a `ApiResponseError` instance and throw it.

If `ApiResponseErrorInstance.rateLimitError` is `true`, then you just hit the rate limit.
You have access to rate limit limits with `ApiResponseErrorInstance.rateLimit`:

```ts
import { ApiResponseError } from 'twitter-api-v2';

try {
  // Get a single tweet
  await client.v2.tweet('20');
} catch (error) {
  if (error instanceof ApiResponseError && error.rateLimitError && error.rateLimit) {
    console.log(`You just hit the rate limit! Limit for this endpoint is ${error.rateLimit.limit} requests!`);
    console.log(`Request counter will reset at timestamp ${error.rateLimit.reset}.`);
  }
}
```

---

**Example**: You can automate this process with a waiter that will retry a failed request after the reset timer is over:

*Warning*: This method can be VERY ineffective, as it can wait up to 15 minutes (Twitter's usual rate limit reset time).
```ts
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function autoRetryOnRateLimitError<T>(callback: () => T | Promise<T>) {
  while (true) {
    try {
      return await callback();
    } catch (error) {
      if (error instanceof ApiResponseError && error.rateLimitError && error.rateLimit) {
        const resetTimeout = error.rateLimit.reset * 1000; // convert to ms time instead of seconds time
        const timeToWait = resetTimeout - Date.now();

        await sleep(timeToWait);
        continue;
      }

      throw error;
    }
  }
}

// Then use it...
await autoRetryOnRateLimitError(() => client.v2.tweet('20'));
```

## Special case of paginators

Paginators will automatically handle the rate limit when using `.fetchLast` or async iteration.
The `.fetchLast` or iteration will automatically ends when rate limit is hit.

Moreover, you can access current rate limit status for paginator's endpoint with the `.rateLimit` getter.
```ts
const paginator = await client.v2.homeTimeline();
console.log(paginator.rateLimit); // { limit: number, remaining: number, reset: number }
```
