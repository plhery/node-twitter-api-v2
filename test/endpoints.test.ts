import 'mocha';
import { expect } from 'chai';
import { FakeX, FakeXRequest } from './fake-x';
import type { TwitterApi } from '../src';

/** A request as 'METHOD host/path?query', with a decoded query */
function describeRequest({ method, url }: FakeXRequest) {
  const query = [...url.searchParams].map(([key, value]) => `${key}=${value}`).join('&');
  return `${method} ${url.host}${url.pathname}${query ? '?' + query : ''}`;
}

const consumerKeys = { appKey: FakeX.userKeys.appKey, appSecret: FakeX.userKeys.appSecret };

describe('Requests sent by the client methods (offline: a fake X answers)', () => {
  let x: FakeX;

  before(async () => {
    x = await FakeX.start();
  });

  after(() => x.close());

  beforeEach(() => {
    x.reset();
    x.on('GET', '/2/users/me', { body: { data: { id: '12', name: 'Jack', username: 'jack' } } });
  });

  describe('Endpoints', () => {
    const cases: { call: (client: TwitterApi) => Promise<unknown>, sends: string | string[], body?: object, bearer?: true }[] = [
      { call: c => c.v2.tweet('hello'), sends: 'POST api.x.com/2/tweets', body: { text: 'hello' } },
      { call: c => c.v2.reply('hi', '20'), sends: 'POST api.x.com/2/tweets', body: { text: 'hi', reply: { in_reply_to_tweet_id: '20' } } },
      { call: c => c.v2.quote('look', '20'), sends: 'POST api.x.com/2/tweets', body: { text: 'look', quote_tweet_id: '20' } },
      { call: c => c.v2.deleteTweet('20'), sends: 'DELETE api.x.com/2/tweets/20' },
      {
        call: c => c.v2.singleTweet('20', { expansions: ['author_id'], 'tweet.fields': ['created_at', 'public_metrics'] }),
        sends: 'GET api.x.com/2/tweets/20?expansions=author_id&tweet.fields=created_at,public_metrics',
      },
      { call: c => c.v2.tweets(['20', '21']), sends: 'GET api.x.com/2/tweets?ids=20,21' },
      {
        call: c => c.v2.search('from:jack "hello world" #x', { max_results: 10 }),
        sends: 'GET api.x.com/2/tweets/search/recent?max_results=10&query=from:jack "hello world" #x',
      },
      { call: c => c.v2.search('nodejs'), sends: 'GET api.x.com/2/tweets/search/recent?query=nodejs', bearer: true },
      { call: c => c.v2.userTimeline('12', { exclude: ['replies'] }), sends: 'GET api.x.com/2/users/12/tweets?exclude=replies' },
      { call: c => c.v2.userMentionTimeline('12'), sends: 'GET api.x.com/2/users/12/mentions' },
      { call: c => c.v2.homeTimeline(), sends: ['GET api.x.com/2/users/me', 'GET api.x.com/2/users/12/timelines/reverse_chronological'] },
      { call: c => c.v2.like('12', '20'), sends: 'POST api.x.com/2/users/12/likes', body: { tweet_id: '20' } },
      { call: c => c.v2.unlike('12', '20'), sends: 'DELETE api.x.com/2/users/12/likes/20' },
      { call: c => c.v2.retweet('12', '20'), sends: 'POST api.x.com/2/users/12/retweets', body: { tweet_id: '20' } },
      { call: c => c.v2.bookmark('20'), sends: ['GET api.x.com/2/users/me', 'POST api.x.com/2/users/12/bookmarks'], body: { tweet_id: '20' } },
      { call: c => c.v2.me({ 'user.fields': ['description'] }), sends: 'GET api.x.com/2/users/me?user.fields=description' },
      { call: c => c.v2.user('12'), sends: 'GET api.x.com/2/users/12' },
      { call: c => c.v2.userByUsername('jack'), sends: 'GET api.x.com/2/users/by/username/jack' },
      { call: c => c.v2.usersByUsernames(['jack', 'x']), sends: 'GET api.x.com/2/users/by?usernames=jack,x' },
      { call: c => c.v2.followers('12', { max_results: 100 }), sends: 'GET api.x.com/2/users/12/followers?max_results=100' },
      { call: c => c.v2.follow('12', '13'), sends: 'POST api.x.com/2/users/12/following', body: { target_user_id: '13' } },
      { call: c => c.v2.unfollow('12', '13'), sends: 'DELETE api.x.com/2/users/12/following/13' },
      { call: c => c.v2.sendDmToParticipant('13', { text: 'hi' }), sends: 'POST api.x.com/2/dm_conversations/with/13/messages', body: { text: 'hi' } },
      { call: c => c.v2.listDmEvents({ 'dm_event.fields': ['sender_id'] }), sends: 'GET api.x.com/2/dm_events?dm_event.fields=sender_id' },
      { call: c => c.v2.createList({ name: 'friends' }), sends: 'POST api.x.com/2/lists', body: { name: 'friends' } },
      { call: c => c.v2.addListMember('3', '13'), sends: 'POST api.x.com/2/lists/3/members', body: { user_id: '13' } },
      { call: c => c.v2.streamRules(), sends: 'GET api.x.com/2/tweets/search/stream/rules', bearer: true },
      {
        call: c => c.v2.updateStreamRules({ add: [{ value: 'cats has:images', tag: 'cats' }] }),
        sends: 'POST api.x.com/2/tweets/search/stream/rules',
        body: { add: [{ value: 'cats has:images', tag: 'cats' }] },
        bearer: true,
      },
      {
        call: c => c.v2.uploadMedia(Buffer.from('image'), { media_type: 'image/png' }),
        sends: ['POST api.x.com/2/media/upload/initialize', 'POST api.x.com/2/media/upload/42/append', 'POST api.x.com/2/media/upload/42/finalize'],
      },
      {
        call: c => c.v1.uploadMedia(Buffer.from('image'), { mimeType: 'image/png' }),
        sends: ['POST upload.x.com/1.1/media/upload.json', 'POST upload.x.com/1.1/media/upload.json', 'POST upload.x.com/1.1/media/upload.json'],
      },
      { call: c => c.v1.verifyCredentials(), sends: 'GET api.x.com/1.1/account/verify_credentials.json' },
    ];

    for (const { call, sends, body, bearer } of cases) {
      it(call.toString().replace(/^c => c\./, ''), async () => {
        x.on('POST', '/2/media/upload/initialize', { body: { data: { id: '42', media_key: '3_42' } } });
        x.on('POST', '/2/media/upload/42/finalize', { body: { data: { id: '42', media_key: '3_42' } } });
        x.on('POST', '/1.1/media/upload.json', { body: { media_id_string: '42' } });

        await call(bearer ? x.client('bearer-token') : x.client());

        expect(x.requests.map(describeRequest)).to.deep.equal(Array.isArray(sends) ? sends : [sends]);
        // OAuth 1.0a signatures are checked by the fake X
        expect(x.requests.map(request => request.headers.authorization?.split(' ')[0])).to.satisfy((schemes: string[]) => schemes.every(scheme => scheme === (bearer ? 'Bearer' : 'OAuth')));

        if (body) {
          expect(x.requests[x.requests.length - 1].data).to.deep.equal(body);
        }
      });
    }
  });

  describe('Authentication flows', () => {
    it('OAuth 1.0a: auth link, login, then requests with the user tokens', async () => {
      x.on('POST', '/oauth/request_token', { body: 'oauth_token=request-token&oauth_token_secret=request-secret&oauth_callback_confirmed=true' });
      x.on('POST', '/oauth/access_token', { body: 'oauth_token=user-token&oauth_token_secret=user-secret&user_id=12&screen_name=jack' });
      x.secrets['request-token'] = 'request-secret';
      x.secrets['user-token'] = 'user-secret';

      const link = await x.client(consumerKeys).generateAuthLink('https://app.example/callback');
      expect(link).to.deep.equal({
        url: 'https://api.x.com/oauth/authenticate?oauth_token=request-token',
        oauth_token: 'request-token',
        oauth_token_secret: 'request-secret',
        oauth_callback_confirmed: 'true',
      });

      const login = await x.client({ ...consumerKeys, accessToken: link.oauth_token, accessSecret: link.oauth_token_secret }).login('verifier');
      expect(login).to.deep.include({ accessToken: 'user-token', accessSecret: 'user-secret', userId: '12', screenName: 'jack' });

      await login.client.v2.me();

      expect(x.requests.map(describeRequest)).to.deep.equal(['POST api.x.com/oauth/request_token', 'POST api.x.com/oauth/access_token', 'GET api.x.com/2/users/me']);
      expect(x.requests[0].data).to.deep.equal({ oauth_callback: 'https://app.example/callback' });
      expect(x.requests[1].data).to.deep.equal({ oauth_token: 'request-token', oauth_verifier: 'verifier' });
      expect(x.requests[2].headers.authorization).to.include('oauth_token="user-token"');
    });

    it('App-only: bearer token from the consumer keys', async () => {
      x.on('POST', '/oauth2/token', { body: { token_type: 'bearer', access_token: 'app-token' } });

      const appClient = await x.client(consumerKeys).appLogin();
      await appClient.v2.singleTweet('20');

      expect(x.requests.map(describeRequest)).to.deep.equal(['POST api.x.com/oauth2/token', 'GET api.x.com/2/tweets/20']);
      expect(x.requests[0].headers.authorization).to.equal('Basic ' + Buffer.from('consumer-key:consumer-secret').toString('base64'));
      expect(x.requests[0].data).to.deep.equal({ grant_type: 'client_credentials' });
      expect(x.requests[1].headers.authorization).to.equal('Bearer app-token');
    });

    it('OAuth 2.0: login with a code, refresh, then requests with the user token', async () => {
      const tokens = { token_type: 'bearer', expires_in: 7200, scope: 'tweet.read users.read offline.access' };
      x.on('POST', '/2/oauth2/token', (res, req) => {
        const token = req.data.grant_type === 'refresh_token' ? 'refreshed' : 'first';
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ...tokens, access_token: `${token}-access-token`, refresh_token: `${token}-refresh-token` }));
      });

      const oauth2Client = x.client({ clientId: 'client-id', clientSecret: 'client-secret' });
      const { codeVerifier } = oauth2Client.generateOAuth2AuthLink('https://app.example/callback', { scope: ['tweet.read', 'users.read', 'offline.access'] });
      const login = await oauth2Client.loginWithOAuth2({ code: 'code', codeVerifier, redirectUri: 'https://app.example/callback' });
      expect(login).to.deep.include({ accessToken: 'first-access-token', refreshToken: 'first-refresh-token', scope: ['tweet.read', 'users.read', 'offline.access'] });

      const refreshed = await oauth2Client.refreshOAuth2Token(login.refreshToken!);
      await refreshed.client.v2.me();

      expect(x.requests.map(describeRequest)).to.deep.equal(['POST api.x.com/2/oauth2/token', 'POST api.x.com/2/oauth2/token', 'GET api.x.com/2/users/me']);
      expect(x.requests[0].headers.authorization).to.equal('Basic ' + Buffer.from('client-id:client-secret').toString('base64'));
      expect(x.requests[0].data).to.deep.include({ code: 'code', code_verifier: codeVerifier, redirect_uri: 'https://app.example/callback', grant_type: 'authorization_code', client_id: 'client-id' });
      expect(x.requests[1].data).to.deep.include({ refresh_token: 'first-refresh-token', grant_type: 'refresh_token', client_id: 'client-id' });
      expect(x.requests[2].headers.authorization).to.equal('Bearer refreshed-access-token');
    });
  });
});
