# HTTP wrappers & custom signed requests

**Note about URL prefixes**: `.v1` and `.v2` accessors are here for two reasons;
let you access some endpoint wrappers,
**and** auto-prefix your requests when you use HTTP-method wrappers.

Check [in the basics](./basics.md) what are the defined URL prefixes for `.v1` and `.v2`.
If your endpoint request URL *doesn't start with those prefixes*, you must specify it manually!

## Use the direct HTTP methods wrappers

If the endpoint-wrapper for your request has not been made yet, don't leave!
You can make requests on your own!

- `.get` and `.delete`, that takes `(partialUrl: string, query?: TRequestQuery, requestSettings?: TGetClientRequestArgs)` in parameters
- `.post`, `.put` and `.patch` that takes `(partialUrl: string, body?: TRequestBody, requestSettings?: TClientRequestArgs)` in parameters (`requestSettings.query` adds a query string)

```ts
// Don't forget the .json in most of the v1 endpoints!
client.v1.get('statuses/user_timeline.json', { user_id: 14 });

// or, for v2
client.v2.get('users/14/tweets');
```

### Specify request args

Sometimes, you need to customize request settings (API prefix, body mode, response mode). You can pass request options through the **third parameter** of HTTP methods wrappers.
```ts
// [prefix]
// Customize API prefix (prefix that will be prepended to URL in first argument)
client.v1.post('media/upload.json', { media: Buffer.alloc(1024) }, { prefix: 'https://upload.x.com/1.1/' })

// [forceBodyMode]
// Customize body mode (if automatic body detection don't work)
// Body mode can be 'url', 'form-data', 'json' or 'raw' [only with buffers]
client.v1.post('statuses/update.json', { status: 'Hello' }, { forceBodyMode: 'url' })

// [fullResponse]
// Obtain the full response object with rate limits
const res = await client.v1.get('statuses/home_timeline.json', undefined, { fullResponse: true })
console.log(res.rateLimit, res.data)

// [headers]
// Customize sent HTTP headers
client.v1.post('statuses/update.json', { status: 'Hello' }, { headers: { 'X-Custom-Header': 'My Header Value' } })
```