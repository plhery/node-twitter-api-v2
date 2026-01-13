1.29.0
------
- fix: Add back the article tweet field #628 (@plhery)

1.28.0
------
- Fix coordiante types #626 (@jiahuijiang)
- feat: add max_results to stream rule retrieval #621 (@PLhery)
- fix: remove unsupported previous_token from search params #620 (@PLhery)

1.27.0
------
- fix: remove circular import in TwitterApiReadOnly #619 (@PLhery)
- feat: parse user 24h rate limit headers #618 (@PLhery)
- docs: clarify reply and quotes #617 (@PLhery)
- docs: add missing await in auth example #616 (@PLhery)

1.26.0
------
- feat: add amplify_video media category #615 (@PLhery)
- feat: add new user fields #614 (@PLhery)
- feat: expand community fields #613 (@PLhery)
- docs: document quote and hide reply #612 (@PLhery)
- refactor: derive DM event field type from base event keys #611 (@PLhery)
- feat: add topic_ids space expansion #609 (@PLhery)
- Derive remaining field unions from interfaces #610 (@PLhery)
- feat(stream): support delete_all query for stream rules #608 (@PLhery)
- Add edit controls to TweetV2 #607 (@PLhery)
- docs: clarify usage endpoint #606 (@PLhery)
- docs: add ads api docs #605 (@PLhery)
- docs: document communities endpoints #604 (@PLhery)
- Avoid prototype property iteration in trimUndefinedProperties #602 (@PLhery)
- Add share_with_followers in SendTweetV2Params #599 (@plbompard)

1.25.0
------
- add media write scope #596 (@RenKoya1)

1.24.0
------
- Add API v2 user email retrieval support #593 (@evrimfeyyaz)

1.23.2
------
- Add 'article' to tweet.fields #590 (@silvercondor)

1.23.1
------
- Fix uploadMedia v2  issue #589 (@avillegasn)

1.23.0
------
- Update uploadMedia v2 endpoints #584 (@avillegasn)

1.22.0
------
- Fix V2 Media Alt Text (breaking change) #580 (@francistogram)

1.21.1
------
- Fix V2 Media Alt Text #578 (@francistogram)

1.21.0
------
- add v2 media metadata #575 (@francistogram)

1.20.2
------
- fix: upload-media v2 endpoint #570 #571 (@leeran7)

1.20.1
------
- fix: absence of profile_banner_url field #565 (@MysticalHeat)

1.20.0
------
- feat: add v2 upload media method #562 (@leeran7)
- feat: add clients for ads and ads sandbox #566 (@dmty)
- add community and searchCommunities endpoints #561 (@enszrlu)

1.19.1
------
- Add community id to tweet payload and response #560 (@enszrlu)

1.19.0
------
- fix: type definition for TweetRetweetedOrLikedByV2Params #550 (@dogukanakkaya)
- fix: add and correct field names #554 (@lin-stephanie)
- feat: get tweet usage v2 #555 (@jiahuijiang)

1.18.2
------
- add missing options from dm_event.fields enum #547 (@RenKoya1)

1.18.1
------
- feat: add most_recent_tweet_id field #545 (@RenKoya1)

1.18.0
------
- feat: update again domain from twitter.com to x.com #532 (@melvinmcrn)

1.17.2
------
- fix: limit media_ids count from 1 to 4 #539 (@rare0b)

1.17.1
------
- revert #532 which broke the auth flow (thank you @dubzer)

1.17.0
------
- feat: update domain from twitter.com to x.com #532 (@melvinmcrn)

1.16.4
------
- fix: Added missing types to public_metrics #529 (@solojungle)

1.16.3
------
- fix: add canceled and ended space state #523 (@petrbela)

1.16.2
------
- fix: add type support for Tweets with more than 280 characters #526 (@weswalla)

1.16.1
------
- feat: add connection_status user field #520 (@fzn0x)
- chore: Update documentation #518 (@pranavmalvawala)

1.16.0
------
- feat: Add the ability to return whole media information while uploading #506 (@qedr @HapLifeMan)

1.15.2
------
- fix: Cleanup socket listeners after a request is either rejected or resolved #455
- feat: Support 24-hour rate limit parsing #495
- fix: Correctly return error on media upload even if status stays to "in_progress" #483

1.15.1
------
- fix: Update tweet.definition.v2.ts to add public view count #494 (@sebastianspiegel)
- chore: Update documentation #486 (@ry0y4n)

1.15.0
------
- fix: Add missing client settings when fetching the token #480 (@qfish)

1.14.3
------
- fix: support mov video type #478 (@wass08)

1.14.2
------
- feat: add subscriber_count to spaces typings #452 (@florrdv)
- chore: Fix typo #454 (@will2022)

1.14.1
------
- feat: add verified_type to user schema #442 (@dkulyk)
- chore: fix typos and markdown links #443 (@Jiralite)

1.14.0
------
- feat: improve search query params #431 (@itsjustbrian)
- breaking change: DM Ids should be strings #436

1.13.0
------
- feat: Add DM events endpoints
- feat: Add space tweet endpoint

1.12.10
-------
- fix: Typing issue in v1 DM medias - ReceivedMessageCreateDataV1 #407 (@secchanu)
- fix: Allow overriding the content-type header #413 (@alessandrovisentini)
- fix: readme typo #414 (@vrrdnt)

1.12.9
------
- Fix: Add missing expansions/'tweet.fields' item for tweet edition #392
- friends/followers objects list V1 #391 (@Abdullah-Malik)

1.12.8
------
- Feat: Add `edit_history_tweet_ids` to `TweetV2`
- Feat: Add v1 friends/followers paginators (thanks to @Abdullah-Malik) #380

1.12.7
------
- Fix: Fix Exception throw when response data is truthy but not an object (for example, a raw HTML page) #354
- Fix: Typing issue with `TwitterApiErrorData.errors` that can be `undefined` in some cases #357
- Feat: Add `include_rts` parameters for `.userTimeline` #349

1.12.6
------
- Feat: add follow and unfollow api V1 methods (thanks to @Abdullah-Malik)

1.12.5
------
- Fix: Better check for error presence in `ApiResponseError` instantiation

1.12.4
------
- Fix: Ignore rate limit data for endpoints without rate limit headers in paginators #341
- Fix: Patch for unifiying endpoints with various error payload in v1 API #342
- Feat: `variants` property for `media.fields`, add `MediaVariantsV2` interface (thanks to @roncli) #347

1.12.3
------
- Feat: .favoriteTimeline for API v1 #296 (thanks to @AuroraDysis)
- Feat: duration_millis property for v1 medias (thanks to @RyoshiKayo)
- Feat: source_user_id and source_user_id_str missing properties in MediaEntityV1 (thanks to @AuroraDysis)

1.12.2
------
- Feat: .homeTimeline for API v2 #288

1.12.1
------
- Fix: missing id prop of TweetEntityMentionV2 #274 (@lima-eduardo)
- Fix: add place_id to SendTweetV1Params #287 (@viniciuskneves)

1.12.0
------
- Feat: Update plugin API to support response overloading on error #248
- Feat: `.quote` method to create a retweet with comment (quoted tweet) in `v1` and `v2` #260 (@jonah-saltzman)

1.11.3
------
- Feat: New spaces features: `topic_ids` and `ended_at` on space object, `/spaces/:id/buyers` endpoint #237
- Feat: New bookmarks API #237
- Feat: New Quoted tweets endpoint #237
- Feat: Allow v2.search to be used without query parameter #252
- Fix: Usertimeline v1 endpoint .done property value is false #238
- Feat: `sort_order` parameter #246 (@nolbuzanis)
- Fix: Better error message for failed media uploads #244 (@nolbuzanis)

1.11.2
------
- Fix: .meta is not correctly typed in paginators #231
- Fix: Caught promise is rejected without ability of catching it later when a request fails and a plugin is used #229

1.11.1
------
- Feat: Support error hooks in plugins #226 #227
- Fix: Bypass Twitter v2 incoherence by converting `start_time` to a valid `since_id` when `until_id` is used in paginators #197 #228
- Feat: Getter for DM images `.v1.downloadDmImage` to download images hosted on `ton.twitter.com` protected by OAuth 1.0a

1.11.0
------
- Feat: Support plugins (more features coming soon as plugins!)
- Feat: Compression level can now be specified explicitly
- Refactor: `.v1.uploadMedia()` now accept `options.mimeType` and `options.longVideo` as argument, in replacement of `options.type` (which is now deprecated)
- Fix: OAuth2 scope incorrectly encoded #184

1.10.3
------
- Feat: Native support of gzip compression for streaming endpoints
- Feat: Native support of brotli (25% more compressed than gzip) compression for non-streaming endpoints, when available

1.10.2
------
- Feat: Native support of gzip/deflate compression for non-streaming endpoints

1.10.1
------
- Fix: Crash when a v2 paginator is empty and response does not contains a `.meta` property #177
- Fix: "Memory leak" when response are abruptly closed by Twitter or OS, because no close/error listener on response object was attributed

1.10.0
------
- Feat: Pagination support for `tweets/:id/liking_users` and `tweets/:id/retweeted_by` #165
- Feat: Support custom Node HTTP agents #149
- Doc: Better example for `.v2.me()` and fix typos #160 #164 (thanks to @rbochenek and @ShubhamKushwah)

1.9.1
-----
- Fix: Use next_token instead of until_id if pagination token available #152

1.9.0
-----
- Feat: Helpers for v2 includes
- Feat: Support for custom debug loggers
- Fix: Errors accessor to get API errors in paginators #145
- Fix: Correctly update .includes/.meta/.errors in paginators when using async iterator #142
- Fix: Incorrect HTTP method for GET lists #147 #148
- Doc: Better doc & examples for OAuth 2.0 user-context

1.8.1
-----
- Feat: Add every GET lists v2 endpoints

1.8.0
-----
- Feat: Add OAuth2 user-context support
- Feat: Add users/me v2 endpoint wrapper

1.7.2
-----
- Fix: Paginator can return multiple times the same results in some conditions
- Feat: .done property for paginators, to know when a next page is fetchable

1.7.1
-----
- Fix: wrong type for optional parameter images in TweetEntityUrlV2

1.7.0
-----
- Feat: Create tweet v2 endpoint (thanks to @sudo-kaizen) #110
- Feat: Delete tweet v2 endpoint (thanks to @sudo-kaizen) #111
- Feat: Tweet thread and reply to a tweet v2
- Fix: BREAKING: Explicitly specify userId on userMutingUsers (thanks to @mika-f) #114

1.6.5
-----
- Fix: Increase retry timeout on stream reconnection

1.6.4
-----
- Fix: Reject stream reconnection if a reconnect process is already started

1.6.3
-----
- Fix: Streams will know correctly reject `.connect` `Promise` on connection error if `autoReconnect` is `false`

1.6.2
-----
- Feat: Streams do now support auto-reconnection for the initial connection attempt

1.6.1
-----
- Feat: New option for creating streams, `autoConnect` that is `true` by default ; Setting the value to `false` will cause the `TweetStream` object to be returned immediately (not in a `Promise`), because connection isn't awaited #92
- Fix: `autoReconnectRetries`: Setting this params to `Infinity` no longer causes the stream reconnection attempts to be delayed to next event loop turn #92
- Fix: Use `https.request(options)` instead of `https.request(url, options)`, because some people has outdated dependencies that overwrite native Node's exported function and break its signature #94 #96
- Feat: Next retry timeout computation can be customized by using `.nextRetryTimeout` property of `TweetStream` instance, that is function taking a `tryOccurrence` and returning the number of milliseconds to wait before trying to reconnect

1.6.0
-----
- Feat: List v2 muted users endpoint #89
- Feat: Manage v2 lists endpoints
- Feat: Support user-flow with OAuth2 (beta - not documented yet)
- Fix: Incorrect typing for createMediaMetadata #93

1.5.2
-----
- Feat: Tweet thread helper #76 #79
- Fix: Explicit max_results parameters should now work properly in paginators #74 #84
- Fix: Endpoints with parameterized URLs now registers properly rate-limit data in cache store

1.5.1
-----
- Fix: Fix return type for v1.1 'tweets' wrapper #72

1.5.0
-----
- Feat: v1.1 List endpoints, GET and POST, with doc, paginators and typings #70
- Feat: Save rate limit information for last request of each endpoint #70
- Doc: Documentation improvements for uploading media #68 #70
- Doc: Fixed parameter name #67

1.4.1
-----
- Fix: Incorrect type union in MessageCreateAttachmentV1 & MessageCreateLocationV1
- Doc: Added real-life examples
- Doc: Add Twitter doc link to .tweet/.reply

1.4.0
-----
- Feat: Add every oauth/authenticate parameters #54 - thanks to @tbhmens
- Fix: Set allowSyntheticDefaultImport to false to improve compat #57 - thanks to @PLHery
- Feat: Add missing tweet.field items in type enumeration #60 - thanks to @filippkowalski
- Doc: Add info about error handling #61
- Feat: Endpoint wrappers for v2 Spaces endpoints #62
- Feat: Endpoint wrappers for v2 Batch Compliance endpoints #62
- Feat: Types & wrappers for account, friendships, users and tweets v1.1 endpoints #64
- Fix: Incorrect encoding of '*' character in query strings #63 #64

1.3.0
-----
- Doc: Improve rate-limit documentation #47 #32
- Feat: Public Direct Messages (DMs) 1.1 endpoints support: wrappers, typings, docs and tests #48
- Feat: New 05/06/07-2021 v2 endpoints wrappers #50
- Feat: Paginator mode for .following/.followers for v2 #50
- Fix: Many fixes for tweet streams auto-reconnect, handle connection errors more smoothly #50
- Feat: New events for tweet streams, that includes lost connection and reconnections #50
- Feat: Handle stream errors deliveries in a dedicated .DataError event (for v2 tweet streams) #50
- Fix: Corrections for body-mode auto-detection (mainly for manual API requests) #53

1.2.0
-----
- Fix: fetchLast was throwing an error with timelines #43
- Feat: Add .meta and .includes in v2 paginators #35 #46
- Feat: Add some missing attributes to tweetEntity typings #42

1.1.1
-----
- Fix: in streams, the KeepAlive was not emitted #33

1.1.0
-----
- Add the new v2 likes endpoint
- Fix: add some missing media types

1.0.0
-----
First Stable Version
- More tests, way more documentation
- Add every missing v2 endpoints
- Remove the two dependencies (form-data and oauth)
- Improve error management
- Fix issues with node12
- Fix issues with the auth API

0.4.0
-----
- Add V1 and V2 streaming V2 endpoints
- Add V2 followers and following endpoints
- Refactor / various fixes

0.3.0
-----
- Add the four API v2 user endpoints
- Improve type definitions
- Minor v2 search refactor

0.2.3
-----
- Fix npm package (was not built)

0.2.1
-----
- Export typescript definitions

0.2.0
-----
- Link and Oauth auth
- PUT/PATCH/DELETE
- improve get/post methods (build query strings, v1/v2 urls, ...)
- read/write/DMs segmentation
- native media chunked upload, with simultaneous send of file parts

0.1.0
-----
- First foundations
