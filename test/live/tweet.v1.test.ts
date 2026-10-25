import 'mocha';
import { expect } from 'chai';
import { TwitterApi } from '../../src';
import { getUserClient } from '../../src/test/utils';

let client: TwitterApi;

describe.skip('Tweets endpoints for v1.1 API', () => {
  before(() => {
    client = getUserClient();
  });

  it.skip('.get - Get 2 tweets using raw HTTP method & specific endpoint', async () => {
    // Using raw HTTP method and URL
    const response1 = await client.get('https://api.x.com/1.1/search/tweets.json?q=@jack&count=2');
    // Using query parser
    const response2 = await client.v1.get('search/tweets.json', {
      q: 'jack',
      count: 2,
    });

    for (const response of [response1, response2]) {
      expect(response.statuses).to.have.length.lessThanOrEqual(2);
      const firstTweet = response.statuses[0];

      expect(firstTweet).to.haveOwnProperty('user');
      expect(firstTweet).to.haveOwnProperty('id_str');

      const firstUser = firstTweet.user;
      expect(firstUser).to.haveOwnProperty('id_str');
    }
  }).timeout(60 * 1000);

  it('.get - Get 2 tweets of a specific user', async () => {
    // Using raw HTTP method and URL
    const response1 = await client.get('https://api.x.com/1.1/statuses/user_timeline.json?screen_name=jack&count=2');
    // Using query parser
    const response2 = await client.v1.get('statuses/user_timeline.json', {
      screen_name: 'jack',
      count: 2,
    });

    for (const response of [response1, response2]) {
      expect(response).to.have.length.lessThanOrEqual(2);
      const firstTweet = response[0];

      expect(firstTweet).to.haveOwnProperty('user');
      expect(firstTweet).to.haveOwnProperty('id_str');

      const firstUser = firstTweet.user;
      expect(firstUser).to.haveOwnProperty('id_str');
      expect(firstUser).to.haveOwnProperty('screen_name');
      expect(firstUser.screen_name).to.equal('jack');
    }

  }).timeout(60 * 1000);

  it('.oembedTweet - Get a embed tweet', async () => {
    const embedTweet = await client.v1.oembedTweet('20');
    expect(embedTweet.html).to.be.a('string');
  }).timeout(60 * 1000);

  it('.singleTweet/.tweets - Get multiple tweets', async () => {
    const tweet = await client.v1.singleTweet('20');
    expect(tweet.id_str).to.be.eq('20');

    const tweets = await client.v1.tweets(['20', '12']);
    expect(tweets).to.be.an('array');
    expect(tweets).to.have.lengthOf(1);

    const tweetMap = await client.v1.tweets(['20', '12'], { map: true });
    expect(tweetMap).to.be.an('object');
    expect(tweetMap.id[12]).to.equal(null);
    expect(tweetMap.id[20]).to.be.an('object');
  }).timeout(60 * 1000);
});
