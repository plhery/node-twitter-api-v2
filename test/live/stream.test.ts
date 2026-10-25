import 'mocha';
import { expect } from 'chai';
import { TwitterApi, ETwitterStreamEvent } from '../../src';
import { getAppClient, getUserClient } from '../../src/test/utils';

// OAuth 1.0a
const clientOauth = getUserClient();

describe.skip('Tweet stream API v1.1', () => {
  it('Should stream 3 tweets without any network error for statuses/filter using events', async () => {
    const streamv1Filter = await clientOauth.v1.filterStream({ track: 'JavaScript' });

    const numberOfTweets = await new Promise<number>((resolve, reject) => {
      let numberOfTweets = 0;

      // Awaits for a tweet
      streamv1Filter.on(ETwitterStreamEvent.ConnectionError, reject);
      streamv1Filter.on(ETwitterStreamEvent.ConnectionClosed, reject);
      streamv1Filter.on(ETwitterStreamEvent.Data, () => {
        numberOfTweets++;

        if (numberOfTweets >= 3) {
          resolve(numberOfTweets);
        }
      });
      streamv1Filter.on(ETwitterStreamEvent.DataKeepAlive, () => console.log('Received keep alive event'));
    }).finally(() => {
      streamv1Filter.close();
    });

    expect(numberOfTweets).to.equal(3);
  }).timeout(1000 * 120);
});

describe.skip('Tweet stream API v2', () => {
  let clientBearer: TwitterApi;

  before(async () => {
    clientBearer = await getAppClient();
  });

  beforeEach(async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  it('Should stream 3 tweets without any network error for sample/stream using async iterator', async () => {
    const streamv2Sample = await clientBearer.v2.getStream('tweets/sample/stream');

    let numberOfTweets = 0;

    for await (const _ of streamv2Sample) {
      numberOfTweets++;

      if (numberOfTweets >= 3) {
        break;
      }
    }

    streamv2Sample.close();

    expect(numberOfTweets).to.equal(3);
  }).timeout(1000 * 120);

  it('In 10 seconds, should have the same tweets registered by async iterator and event handler, where stream is manually started', async () => {
    const streamV2 = clientBearer.v2.sampleStream({ autoConnect: false });

    const eventTweetIds = [] as string[];
    const itTweetIds = [] as string[];

    await streamV2.connect({ autoReconnect: true });

    await Promise.race([
      // 10 seconds timeout
      new Promise(resolve => setTimeout(resolve, 10 * 1000)),
      (async function () {
        streamV2.on(ETwitterStreamEvent.Data, tweet => eventTweetIds.push(tweet.data.id));

        for await (const tweet of streamV2) {
          itTweetIds.push(tweet.data.id);
        }
      })(),
    ]);

    streamV2.close();

    expect(eventTweetIds).to.have.length(itTweetIds.length);
    expect(eventTweetIds.every(id => itTweetIds.includes(id))).to.be.true;
  }).timeout(1000 * 120);
});
