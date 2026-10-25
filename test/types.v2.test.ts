import 'mocha';
import { expect } from 'chai';
import {
  EUploadMimeType,
  IParsedOAuth2TokenResult,
  SendTweetV2Params,
  SpaceV2SearchParams,
  StreamingV2DeleteRulesParams,
  TOAuth2Scope,
  TwitterApiv2,
} from '../src';

type UploadMediaV2MimeType = Parameters<TwitterApiv2['uploadMedia']>[1]['media_type'];

// ts-node type-checks this file before running it, so a failing check fails the whole test run
describe('v2 types (compile-time checks)', () => {
  it('Should accept the documented v2 MIME types and the EUploadMimeType values', () => {
    const mimeTypes: UploadMediaV2MimeType[] = [EUploadMimeType.Srt, 'text/plain', 'text/vtt', 'video/webm', 'model/vnd.usdz+zip'];
    // @ts-expect-error The union must not widen to string
    const unknownMimeType: UploadMediaV2MimeType = 'image/svg+xml';

    expect(mimeTypes).to.have.length(5);
    expect(unknownMimeType).to.be.a('string');
  });

  it('Should keep accepting the old tweet params next to the documented ones', () => {
    const oldTweet: SendTweetV2Params = { text: 'old', for_super_followers_only: 'True', reply_settings: 'mentionedUsers' };
    const newTweet: SendTweetV2Params = {
      text: 'new',
      edit_options: { previous_post_id: '1' },
      for_super_followers_only: true,
      reply_settings: 'verified',
      made_with_ai: true,
      media: { media_ids: ['1'], title: 'title', call_to_actions: { watch_now: { url: 'https://example.com' } } },
    };

    expect(oldTweet.text).to.equal('old');
    expect(newTweet.text).to.equal('new');
  });

  it('Should keep the parsed OAuth2 scope assignable to TOAuth2Scope[]', () => {
    const parsedScope: IParsedOAuth2TokenResult['scope'] = ['tweet.read', 'timeline.read', 'broadcast.write'];
    const scopes: TOAuth2Scope[] = parsedScope;

    expect(scopes).to.have.length(3);
  });

  it('Should accept the optional search and rule params', () => {
    const search: SpaceV2SearchParams = { query: 'nodejs' };
    const allStates: SpaceV2SearchParams = { query: 'nodejs', state: 'all' };
    const deleteByValue: StreamingV2DeleteRulesParams = { delete: { values: ['from:x'] } };

    expect(search.state).to.equal(undefined);
    expect(allStates.state).to.equal('all');
    expect(deleteByValue.delete.values).to.deep.equal(['from:x']);
  });
});
