# AGENTS.md

twitter-api-v2: a strongly typed Twitter/X API v1.1 and v2 client for Node.js, published on npm as `twitter-api-v2`.

## Layout

- `src/`: library code. `v1/`, `v2/`, `v2-labs/`, `ads/`, `ads-sandbox/` hold the API clients, `paginators/` the paginators, `stream/` the streaming client, `types/` the API types.
- `test/`: mocha + chai tests, in TypeScript. The ones that call the real X API are in `test/live/`.
- `doc/`: user documentation. Update it when public behaviour changes.
- `changelog.md`: written by `release.mjs` during a release, don't edit it in feature work.

## Checks

- `npm run lint`, `npm run build` and `npm test` must pass. CI runs them on Node 22, 24 and 26, on pushes to master and on pull requests.
- `npm test` runs the tests of `test/`, offline and without credentials. Run a single file with `npm run mocha test/<name>.test.ts`.
- Test new behaviour offline. `test/fake-x.ts` is a fake X API: its clients keep calling `https://api.x.com/...`, but their requests go to a local server that records them, checks OAuth 1.0a signatures like X does, and answers with the replies set with `on()`. Narrower fakes are fine too, like a fake `instance.get` for paginators or a fake response stream for `TweetStream`.
- The tests of `test/live/` call the real X API and some calls are billed: ask before running them. They need `CONSUMER_TOKEN`, `CONSUMER_SECRET`, `OAUTH_TOKEN` and `OAUTH_SECRET` (in `.env`) and throw at import without them. Run them with `npm run test:live`, or with the Live tests workflow on GitHub, which uses the repository secrets.

## Commits and pull requests

- Short commit subjects, conventional prefixes welcome: `fix(stream): …`, `feat: …`, `docs: …`.
- The changelog lists merged pull requests only. Commits pushed directly to master (CI, tooling, chores) are left out of it.

## Releasing

Creating a GitHub release makes `.github/workflows/publish.yml` publish the package to npm, with trusted publishing and provenance (no npm token involved). `release.mjs` does the rest and needs an authenticated `gh` CLI:

1. `node release.mjs <patch|minor|major> --dry-run` shows the next version and its changelog entries. There is one entry per commit since the latest tag that belongs to a merged pull request, formatted as `- <subject> #<pr> (@<author>)`. Use patch for fixes, minor for new features or new API fields, and major for breaking changes.
2. `node release.mjs <patch|minor|major>` first checks that master is clean and in sync with origin, then runs lint and build. It bumps `package.json` and `package-lock.json`, prepends the entries to `changelog.md`, and commits `upgrade to <version>`.
3. `node release.mjs --publish` pushes master and creates the `<version>` release (tag, title and notes from the changelog), which starts the npm publish. It then comments `Shipped in <version>` on every released pull request and on the issues they close. `node release.mjs patch --publish` does steps 2 and 3 in one go.

Then follow the publish with `gh run list --workflow publish.yml` and check `npm view twitter-api-v2 version`. Also look for open issues that the release fixes without being linked to a pull request. Comment on those by hand, explaining the fix.

## Good to know

- X documents v2 pagination tokens as opaque, but they are base36-encoded text. For tweet timelines, `previous_token` decodes to `PREV_TOKEN<newest_id>` and `next_token` to `NEXT_TOKEN<oldest_id>`, so they act like `since_id`/`until_id` and can be replayed. Search `next_token`s decode to `{"maxId":<oldest_id>}`.
