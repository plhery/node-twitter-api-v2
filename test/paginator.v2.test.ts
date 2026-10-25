import 'mocha';
import { expect } from 'chai';
import {
  TweetSearchRecentV2Paginator,
  TweetUserTimelineV2Paginator,
  TweetV2UserLikedTweetsPaginator,
  UserFollowersV2Paginator,
} from '../src';

type FakeCall = { endpoint: string, query: Record<string, any> };

/** A fake `instance.get` (no network, no credentials): records every call and replies with queued payloads. */
function makeFakeInstance(responses: any[]) {
  const calls: FakeCall[] = [];
  const instance = {
    get: async (endpoint: string, query: Record<string, any>) => {
      calls.push({ endpoint, query: { ...query } });
      return { data: responses.shift(), headers: {}, rateLimit: undefined };
    },
  };

  return { instance: instance as any, calls };
}

const tweet = (id: string, text: string) => ({ id, text, edit_history_tweet_ids: [id] });

// This is the shape X really returns when there is nothing new: no newest_id / oldest_id / previous_token.
const emptyPage = () => ({ meta: { result_count: 0 } });

describe('v2 paginators: polling with previous()/fetchPrevious() (offline, no network or credentials needed)', () => {
  describe('TweetSearchRecentV2Paginator (since_id cursor)', () => {
    it('Should keep since_id when a poll returns an empty page', async () => {
      const { instance, calls } = makeFakeInstance([emptyPage(), emptyPage()]);
      const paginator = new TweetSearchRecentV2Paginator({
        realData: { data: [tweet('5', 'seed')], meta: { newest_id: '5', oldest_id: '5', result_count: 1 } },
        rateLimit: undefined as any,
        instance,
        queryParams: { query: 'grok' },
      });

      await paginator.fetchPrevious();
      await paginator.fetchPrevious();

      expect(calls).to.have.length(2);
      expect(calls[0].query).to.deep.equal({ query: 'grok', since_id: '5' });
      expect(calls[1].query).to.deep.equal({ query: 'grok', since_id: '5' });
      expect(paginator.meta.newest_id).to.equal('5');
      expect(paginator.tweets.map(t => t.id)).to.deep.equal(['5']);
    });

    it('Should still advance since_id when a poll returns new tweets, then keep it on the next empty poll', async () => {
      const { instance, calls } = makeFakeInstance([
        emptyPage(),
        { data: [tweet('9', 'new2'), tweet('8', 'new1')], meta: { newest_id: '9', oldest_id: '8', result_count: 2 } },
        emptyPage(),
      ]);
      const paginator = new TweetSearchRecentV2Paginator({
        realData: { data: [tweet('5', 'seed')], meta: { newest_id: '5', oldest_id: '5', result_count: 1 } },
        rateLimit: undefined as any,
        instance,
        queryParams: { query: 'grok' },
      });

      await paginator.fetchPrevious();
      await paginator.fetchPrevious();
      await paginator.fetchPrevious();

      expect(calls.map(c => c.query.since_id)).to.deep.equal(['5', '5', '9']);
      expect(paginator.meta.newest_id).to.equal('9');
      expect(paginator.tweets.map(t => t.id)).to.deep.equal(['9', '8', '5']);
      expect(paginator.meta.result_count).to.equal(3);
    });

    it('Should not change the next page cursors when an empty page is fetched with fetchNext (unchanged behaviour)', async () => {
      const { instance, calls } = makeFakeInstance([emptyPage()]);
      const paginator = new TweetSearchRecentV2Paginator({
        realData: { data: [tweet('5', 'seed')], meta: { newest_id: '5', oldest_id: '5', result_count: 1, next_token: 'abc' } },
        rateLimit: undefined as any,
        instance,
        queryParams: { query: 'grok' },
      });

      await paginator.fetchNext();

      expect(calls[0].query).to.deep.equal({ query: 'grok', next_token: 'abc' });
      // The end of the results is still detected (no next_token), and the newest tweet is untouched
      expect(paginator.done).to.equal(true);
      expect(paginator.meta.newest_id).to.equal('5');
    });

    it('Should keep oldest_id when fetchNext returns an empty page, so until_id is still sent afterwards', async () => {
      const { instance, calls } = makeFakeInstance([emptyPage(), emptyPage()]);
      const paginator = new TweetSearchRecentV2Paginator({
        realData: { data: [tweet('5', 'seed')], meta: { newest_id: '5', oldest_id: '5', result_count: 1, next_token: 'abc' } },
        rateLimit: undefined as any,
        instance,
        queryParams: { query: 'grok' },
      });

      await paginator.fetchNext();
      await paginator.fetchNext();

      expect(calls[1].query).to.deep.equal({ query: 'grok', until_id: '5' });
      expect(paginator.meta.oldest_id).to.equal('5');
    });
  });

  describe('TweetUserTimelineV2Paginator (pagination_token cursor, TweetPaginableTimelineV2Paginator)', () => {
    it('Should keep previous_token and newest_id when a poll returns an empty page', async () => {
      const { instance, calls } = makeFakeInstance([emptyPage(), emptyPage()]);
      const paginator = new TweetUserTimelineV2Paginator({
        realData: {
          data: [tweet('5', 'seed')],
          meta: { newest_id: '5', oldest_id: '5', result_count: 1, previous_token: 'prev-1' },
        },
        rateLimit: undefined as any,
        instance,
        queryParams: {},
        sharedParams: { id: '42' },
      });

      await paginator.fetchPrevious();
      await paginator.fetchPrevious();

      expect(calls.map(c => c.query.pagination_token)).to.deep.equal(['prev-1', 'prev-1']);
      expect(paginator.meta.previous_token).to.equal('prev-1');
      expect(paginator.meta.newest_id).to.equal('5');
    });

    it('Should advance previous_token and newest_id when a poll returns new tweets, then keep them on the next empty poll', async () => {
      const { instance, calls } = makeFakeInstance([
        { data: [tweet('9', 'new')], meta: { newest_id: '9', oldest_id: '9', result_count: 1, previous_token: 'prev-2' } },
        emptyPage(),
      ]);
      const paginator = new TweetUserTimelineV2Paginator({
        realData: {
          data: [tweet('5', 'seed')],
          meta: { newest_id: '5', oldest_id: '5', result_count: 1, previous_token: 'prev-1' },
        },
        rateLimit: undefined as any,
        instance,
        queryParams: {},
        sharedParams: { id: '42' },
      });

      await paginator.fetchPrevious();
      await paginator.fetchPrevious();

      expect(calls.map(c => c.query.pagination_token)).to.deep.equal(['prev-1', 'prev-2']);
      expect(paginator.meta.previous_token).to.equal('prev-2');
      expect(paginator.meta.newest_id).to.equal('9');
      expect(paginator.tweets.map(t => t.id)).to.deep.equal(['9', '5']);
    });

    it('Should keep oldest_id when fetchNext returns an empty page', async () => {
      const { instance } = makeFakeInstance([emptyPage()]);
      const paginator = new TweetUserTimelineV2Paginator({
        realData: {
          data: [tweet('5', 'seed')],
          meta: { newest_id: '5', oldest_id: '5', result_count: 1, next_token: 'next-1' },
        },
        rateLimit: undefined as any,
        instance,
        queryParams: {},
        sharedParams: { id: '42' },
      });

      await paginator.fetchNext();

      expect(paginator.done).to.equal(true);
      expect(paginator.meta.oldest_id).to.equal('5');
    });
  });

  describe('TweetV2UserLikedTweetsPaginator (pagination_token cursor, TimelineV2Paginator)', () => {
    it('Should keep previous_token when a poll returns an empty page', async () => {
      const { instance, calls } = makeFakeInstance([emptyPage(), emptyPage()]);
      const paginator = new TweetV2UserLikedTweetsPaginator({
        realData: {
          data: [tweet('5', 'seed')],
          meta: { result_count: 1, previous_token: 'prev-1' },
        },
        rateLimit: undefined as any,
        instance,
        queryParams: {},
        sharedParams: { id: '42' },
      });

      await paginator.fetchPrevious();
      await paginator.fetchPrevious();

      expect(calls.map(c => c.query.pagination_token)).to.deep.equal(['prev-1', 'prev-1']);
      expect(paginator.meta.previous_token).to.equal('prev-1');
    });
  });
});

describe('v2 paginators: done paginators and merged includes (offline, no network or credentials needed)', () => {
  // A user timeline that fits in one page: X sends no next_token
  const singlePage = () => ({ data: [tweet('3', 'c'), tweet('2', 'b')], meta: { newest_id: '3', oldest_id: '2', result_count: 2 } });

  it('Should not fetch the first page again with fetchNext() or fetchLast() once done', async () => {
    const { instance, calls } = makeFakeInstance([singlePage(), singlePage()]);
    const paginator = new TweetUserTimelineV2Paginator({
      realData: singlePage(),
      rateLimit: undefined as any,
      instance,
      queryParams: { max_results: 100 },
      sharedParams: { id: '42' },
    });

    expect(paginator.done).to.equal(true);
    expect(await paginator.fetchLast(1000)).to.equal(paginator);
    expect(await paginator.fetchNext()).to.equal(paginator);

    expect(calls).to.have.length(0);
    expect(paginator.tweets.map(t => t.id)).to.deep.equal(['3', '2']);
    expect(paginator.meta.result_count).to.equal(2);
  });

  it('Should give an empty page with next() once done, without a request', async () => {
    const page = () => ({ data: [{ id: '1', name: 'A', username: 'a' }], meta: { result_count: 1 } });
    const { instance, calls } = makeFakeInstance([page()]);
    const paginator = new UserFollowersV2Paginator({
      realData: page(),
      rateLimit: undefined as any,
      instance,
      queryParams: {},
      sharedParams: { id: '42' },
    });

    const next = await paginator.next();

    expect(calls).to.have.length(0);
    expect(next).to.be.instanceOf(UserFollowersV2Paginator);
    expect(next).to.not.equal(paginator);
    expect(next.users).to.deep.equal([]);
    expect(next.done).to.equal(true);
    expect(paginator.users.map(u => u.id)).to.deep.equal(['1']);
  });

  it('Should not repeat the first request of a search that found nothing', async () => {
    const { instance, calls } = makeFakeInstance([emptyPage()]);
    const paginator = new TweetSearchRecentV2Paginator({
      realData: emptyPage() as any,
      rateLimit: undefined as any,
      instance,
      queryParams: { query: 'grok' },
    });

    await paginator.fetchNext();

    // A search with tweets still asks for older ones with until_id (see the until_id test above)
    expect(calls).to.have.length(0);
  });

  it('Should keep one copy of the includes found on several pages', async () => {
    const { instance } = makeFakeInstance([{
      data: [{ ...tweet('2', 'b'), author_id: 'u1', attachments: { media_keys: ['3_1'] } }],
      includes: {
        users: [{ id: 'u1', name: 'A', username: 'a' }, { id: 'u2', name: 'B', username: 'b' }],
        media: [{ media_key: '3_1', type: 'photo' }],
      },
      meta: { newest_id: '2', oldest_id: '2', result_count: 1 },
    }]);
    const paginator = new TweetUserTimelineV2Paginator({
      realData: {
        data: [{ ...tweet('1', 'a'), author_id: 'u1', attachments: { media_keys: ['3_1'] } }],
        includes: { users: [{ id: 'u1', name: 'A', username: 'a' }], media: [{ media_key: '3_1', type: 'photo' }] },
        meta: { newest_id: '1', oldest_id: '1', result_count: 1, next_token: 'next-1' },
      },
      rateLimit: undefined as any,
      instance,
      queryParams: {},
      sharedParams: { id: '42' },
    });

    await paginator.fetchNext();

    expect(paginator.includes.users.map(u => u.id)).to.deep.equal(['u1', 'u2']);
    expect(paginator.includes.media.map(m => m.media_key)).to.deep.equal(['3_1']);
    expect(paginator.includes.medias(paginator.tweets[1]).map(m => m.media_key)).to.deep.equal(['3_1']);
  });
});
