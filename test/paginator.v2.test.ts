import 'mocha';
import { expect } from 'chai';
import {
  TweetSearchRecentV2Paginator,
  TweetUserTimelineV2Paginator,
  TweetV2UserLikedTweetsPaginator,
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
