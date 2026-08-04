import 'mocha';
import { expect } from 'chai';
import { TwitterApi } from '../src';
import { getAppClient, getUserClient, sleepTest } from '../src/test/utils';

let client: TwitterApi;
const userClient = getUserClient();

describe('Tweets endpoints for v2 API', () => {
  before(async () => {
    client = await getAppClient();
  });

  it.skip('.get - Get 2 tweets using raw HTTP method & specific endpoint', async () => {
    // Using raw HTTP method and URL
    const response1 = await client.get('https://api.x.com/2/tweets?ids=20,1306166445135605761&expansions=author_id&tweet.fields=public_metrics&user.fields=name,public_metrics');
    // Using query parser
    const response2 = await client.v2.get('tweets', {
      ids: '20,1306166445135605761',
      expansions: 'author_id',
      'tweet.fields': 'public_metrics',
      'user.fields': 'name,public_metrics',
    });

    for (const response of [response1, response2]) {
      expect(response.data).to.have.length.lessThanOrEqual(2);
      const firstTweet = response.data[0];

      expect(firstTweet).to.haveOwnProperty('author_id');
      expect(firstTweet).to.haveOwnProperty('public_metrics');

      const includes = response.includes?.users;
      const firstInclude = includes[0];
      expect(includes).to.have.length.lessThanOrEqual(2);
      expect(firstInclude).to.haveOwnProperty('name');
    }

  }).timeout(60 * 1000);

  it.skip('.search - Search and fetch tweets using tweet searcher and consume 200 tweets', async () => {
    // Using string for query
    const response1 = await client.v2.search('nodeJS');
    // Using object with query key
    const response2 = await client.v2.search({ query: 'nodeJS' });

    for (const response of [response1, response2]) {
      const originalLength = response.tweets.length;
      expect(response.tweets.length).to.be.greaterThan(0);

      await response.fetchNext();
      expect(response.tweets.length).to.be.greaterThan(originalLength);

      // Test if iterator correctly fetch tweets (silent)
      let i = 0;
      const ids = [];

      for await (const tweet of response) {
        ids.push(tweet.id);
        if (i > 200) {
          break;
        }

        i++;
      }
      // Check for duplicates
      expect(ids).to.have.length(new Set(ids).size);
    }
  }).timeout(60 * 1000);

  it.skip('.userTimeline/.userMentionTimeline - Fetch user & mention timeline and consume 150 tweets', async () => {
    const jackTimeline = await client.v2.userTimeline('12');

    const originalLength = jackTimeline.tweets.length;
    expect(jackTimeline.tweets.length).to.be.greaterThan(0);

    await jackTimeline.fetchNext();
    expect(jackTimeline.tweets.length).to.be.greaterThan(originalLength);

    const nextPage = await jackTimeline.next();
    expect(nextPage.tweets.map(t => t.id))
      .to.not.have.members(jackTimeline.tweets.map(t => t.id));

    // Test if iterator correctly fetch tweets (silent)
    let i = 0;
    const ids = [];

    for await (const tweet of jackTimeline) {
      ids.push(tweet.id);
      if (i > 150) {
        break;
      }

      i++;
    }

    // Check for duplicates
    expect(ids).to.have.length(new Set(ids).size);

    // Test mentions
    const jackMentions = await client.v2.userMentionTimeline('12', {
      'tweet.fields': ['author_id', 'in_reply_to_user_id'],
    });
    expect(jackMentions.tweets.length).to.be.greaterThan(0);
    expect(jackMentions.tweets.map(tweet => tweet.author_id)).to.not.include('12');
  }).timeout(60 * 1000);

  it.skip('.singleTweet - Download a single tweet', async () => {
    const tweet = await client.v2.singleTweet('20');
    expect(tweet.data.text).to.equal('just setting up my twttr');
  }).timeout(60 * 1000);

  it.skip('.tweetWithMedia - Get a tweet with media variants', async () => {
    const tweet = await client.v2.singleTweet('870042717589340160', { 'tweet.fields': ['attachments'], 'expansions': ['attachments.media_keys'], 'media.fields': ['variants'] });
    expect(tweet.includes && tweet.includes.media && tweet.includes.media[0].variants && tweet.includes.media[0].variants[0].content_type).to.equal('video/mp4');
  }).timeout(60 * 1000);

  it.skip('.tweets - Fetch a bunch of tweets', async () => {
    const tweets = await client.v2.tweets(['20', '1257577057862610951'], {
      'tweet.fields': ['author_id'],
    });
    expect(tweets.data).to.have.length(2);

    const first = tweets.data[0];
    expect(first.author_id).to.be.a('string');
  }).timeout(60 * 1000);

  it.skip('.like/.unlike - Like / unlike a single tweet', async () => {
    const me = await userClient.currentUser();
    const { data: { liked } } = await userClient.v2.like(me.id_str, '20');
    expect(liked).to.equal(true);

    await sleepTest(300);

    const { data: { liked: likedAfterUnlike } } = await userClient.v2.unlike(me.id_str, '20');
    expect(likedAfterUnlike).to.equal(false);
  }).timeout(60 * 1000);

  it.skip('.tweetLikedBy - Get users that liked a tweet', async () => {
    const usersThatLiked = await userClient.v2.tweetLikedBy('20', { 'user.fields': ['created_at'] });
    expect(usersThatLiked.data).to.have.length.greaterThan(0);

    expect(usersThatLiked.data[0].created_at).to.be.a('string');
  }).timeout(60 * 1000);

  it.skip('.tweetRetweetedBy - Get users that retweeted a tweet', async () => {
    const usersThatRt = await userClient.v2.tweetRetweetedBy('20', { 'user.fields': ['created_at'] });
    expect(usersThatRt.data).to.have.length.greaterThan(0);

    expect(usersThatRt.data[0].created_at).to.be.a('string');
  }).timeout(60 * 1000);

  it.skip('.tweet/.deleteTweet - Creates a tweet then delete it', async () => {
    const status = '[TEST THIS IS A TEST TWEET.]';

    const { data: { text, id } } = await userClient.v2.tweet(status);
    expect(text).to.equal(status);

    const { data: { deleted } } = await userClient.v2.deleteTweet(id);
    expect(deleted).to.equal(true);
  }).timeout(60 * 1000);
});
