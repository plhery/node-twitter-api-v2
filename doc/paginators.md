# Paginators

Most of the endpoints returning a paginable collection (user timeline, tweet search, home timeline, ...) returns a sub class of `TwitterPaginator`.

By default, instance is built with the initial response data, and you have access to method to fetch automatically next page(s).
```ts
const homeTimeline = await client.v2.homeTimeline();
```

## Iterate over the fetched items

You can iterate with native `Symbol.iterator`.

```ts
for (const fetchedTweet of homeTimeline) {
  // do something with fetchedTweet
}
```

## Access the fetched items

In paginators that contains
- tweets: `.tweets`
- lists: `.lists`
- users: `.users`
- Only IDs: `.ids`
- Welcome messages: `.welcomeMessages`
- Events (like DM events): `.events`

## Check if a next page is available

You can know if a paginator is over by looking up the `.done` property.

```ts
while (!homeTimeline.done) {
  await homeTimeline.fetchNext();
}
```

## Download next page

You can fetch the next page of the collection with the method `.fetchNext()`.
```ts
await homeTimeline.fetchNext();
```
Items will be added to current instance and next calls to `.tweets` or `Symbol.iterator` will include **previously fetched tweets and new tweets**.

Once the paginator is `.done`, `.fetchNext()` and `.fetchLast()` do nothing and send no request.
Search paginators (`.search()` and `.searchAll()`) still send one, to ask for older tweets with `until_id`.

## Get next page as a new instance

Alternatively, you can use `.next()` to fetch a next page and get it as a separator instance.
```ts
const timelinePage2 = await homeTimeline.next();
```
Next page items will be only available on `timelinePage2.tweets` or through `timelinePage2[Symbol.iterator]`. New instance will **not** have items of previous page.
If there is no next page, `.next()` gives an empty instance, without a request.

## Fetch until rate limit hits

If you want to fetch the maximum of tweets or iterate though the whole possible collection, you can use async iterator or `.fetchLast()`.

```ts
// Will fetch 1000 more tweets (automatically split into separate requests),
// except if the rate limit is hit or if no more results are available
await homeTimeline.fetchLast(1000);
```

Alternatively, you can achieve this behaviour with async iterators:
```ts
// Note presence of 'await' here
for await (const tweet of homeTimeline) {
  // Iterate until rate limit is hit
  // or API calls returns no more results
}
```

## v2 meta, includes

For tweets endpoints that returns `meta`s and `includes` in their payload, `v2` paginators supports them (and merge them into a unique container :D),
just use `Paginator.meta` or `Paginator.includes`.

**`.includes` is an accessor to a `TwitterV2IncludesHelper` instance.** See how to [use it here](./helpers.md#helpers-for-includes-of-v2-api-responses).

```ts
const mySearch = await client.v2.search('nodeJS');

for await (const tweet of mySearch) {
  const availableMeta = mySearch.meta;
  const availableIncludes = mySearch.includes;

  // availableMeta and availableIncludes are filled with .meta and .includes
  // fetched at the time you were reading this tweet
  // Once the next page is automatically fetched, they can be updated!
}
```

## v2 errors

In some cases, paginators in v2 API can contains errors. You can access then with `.errors` getter.

## Previous page

On paginators that supports it, you can get previous pages with `.previous()` and `.fetchPrevious()`.

Their behaviour is comparable as `.next()` and `.fetchNext()`.
