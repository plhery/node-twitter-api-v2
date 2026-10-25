import * as crypto from 'crypto';
import * as http from 'http';
import * as net from 'net';
import { TwitterApi } from '../src';
import type { IClientSettings, TwitterApiOAuth2Init, TwitterApiTokens } from '../src';

export interface FakeXRequest {
  method: string;
  /** URL the client asked for, like https://api.x.com/2/tweets?ids=20 */
  url: URL;
  headers: http.IncomingHttpHeaders;
  body: string;
  /** Body parsed from JSON or from a form, when it is one of them */
  data?: any;
}

/** A JSON body (or a string), with status 200 by default. Or a function that writes the response by itself */
export type FakeXReply =
  | { status?: number, headers?: http.OutgoingHttpHeaders, body?: unknown }
  | ((res: http.ServerResponse, req: FakeXRequest) => void);

/** Sends every connection to the local server, in plain HTTP */
class LocalAgent extends http.Agent {
  // https.request checks that the agent protocol is the one of the URL
  protocol = 'https:';

  constructor(protected getPort: () => number) {
    super({ keepAlive: true });
  }

  createConnection() {
    return net.connect(this.getPort(), '127.0.0.1');
  }
}

/**
 * A fake X API, to test the library without network or credentials.
 *
 * Clients made with `client()` keep calling https://api.x.com/..., but their agent sends the requests to a local server.
 * It records them in `requests`, checks OAuth 1.0a signatures like X does, and answers with the replies given to `on()`.
 * Other requests get a 200 with an empty list of results.
 */
export class FakeX {
  static readonly userKeys = { appKey: 'consumer-key', appSecret: 'consumer-secret', accessToken: 'access-token', accessSecret: 'access-secret' };

  readonly requests: FakeXRequest[] = [];
  /** OAuth 1.0a secrets of the consumer keys and tokens X knows */
  readonly secrets: { [keyOrToken: string]: string } = { 'consumer-key': 'consumer-secret', 'access-token': 'access-secret' };
  readonly agent = new LocalAgent(() => (this.server.address() as net.AddressInfo).port);

  protected replies: { method: string, path: string | RegExp, reply: FakeXReply }[] = [];
  protected server = http.createServer((req, res) => this.handle(req, res));

  static async start() {
    const x = new FakeX();
    await new Promise<void>(resolve => x.server.listen(0, '127.0.0.1', resolve));
    return x;
  }

  /** Answers the requests to this path (exact, or matched by a RegExp). The latest reply set for a request wins */
  on(method: string, path: string | RegExp, reply: FakeXReply) {
    this.replies.unshift({ method, path, reply });
    return this;
  }

  /** A client of this fake X, with OAuth 1.0a user keys by default */
  client(tokens: TwitterApiTokens | TwitterApiOAuth2Init | string = FakeX.userKeys, settings: Partial<IClientSettings> = {}) {
    return new TwitterApi(tokens as TwitterApiTokens, { ...settings, httpAgent: this.agent });
  }

  /** Forgets the requests received and the replies set */
  reset() {
    this.requests.length = 0;
    this.replies = [];
  }

  close() {
    this.agent.destroy();
    this.server.closeAllConnections();
    return new Promise<void>(resolve => this.server.close(() => resolve()));
  }

  protected handle(req: http.IncomingMessage, res: http.ServerResponse) {
    const chunks: Buffer[] = [];

    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const request: FakeXRequest = {
        method: req.method!,
        url: new URL(req.url!, `https://${req.headers.host}`),
        headers: req.headers,
        body: Buffer.concat(chunks).toString(),
      };
      request.data = parseBody(request);
      this.requests.push(request);

      if (!this.hasValidSignature(request)) {
        return send(res, { status: 401, body: { title: 'Unauthorized', type: 'about:blank', status: 401, detail: 'Unauthorized' } });
      }

      const route = this.replies.find(({ method, path }) => method === request.method
        && (typeof path === 'string' ? path === request.url.pathname : path.test(request.url.pathname)));
      const reply = route?.reply ?? { body: { data: [], meta: { result_count: 0 } } };

      if (typeof reply === 'function') {
        reply(res, request);
      } else {
        send(res, reply);
      }
    });
  }

  /** Checks an OAuth 1.0a signature from scratch (RFC 5849), so that a signing mistake gets a 401 like on X */
  protected hasValidSignature({ method, url, headers, body }: FakeXRequest) {
    if (!headers.authorization?.startsWith('OAuth ')) {
      return true;
    }

    const oauth: { [key: string]: string } = {};
    for (const part of headers.authorization.slice('OAuth '.length).split(',')) {
      const [key, value] = part.trim().split('=');
      oauth[key] = decodeURIComponent(value.slice(1, -1));
    }

    const consumerSecret = this.secrets[oauth.oauth_consumer_key];
    const tokenSecret = oauth.oauth_token === undefined ? '' : this.secrets[oauth.oauth_token];
    if (consumerSecret === undefined || tokenSecret === undefined) {
      return false;
    }

    // Signed parameters: the oauth_* ones, the query, and the body when it is a form
    const params = Object.entries(oauth).filter(([key]) => key !== 'oauth_signature');
    const requestParams = [...url.searchParams];
    if (headers['content-type']?.startsWith('application/x-www-form-urlencoded')) {
      requestParams.push(...new URLSearchParams(body));
    }
    // login() sends oauth_token in the header and in the body, and X counts it once
    params.push(...requestParams.filter(([key, value]) => oauth[key] !== value));

    const paramString = params
      .map(([key, value]) => [percentEncode(key), percentEncode(value)])
      .sort(([keyA, valueA], [keyB, valueB]) => keyA === keyB ? compare(valueA, valueB) : compare(keyA, keyB))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    const baseString = [method, percentEncode(url.origin + url.pathname), percentEncode(paramString)].join('&');
    const signature = crypto
      .createHmac('sha1', `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`)
      .update(baseString)
      .digest('base64');

    return signature === oauth.oauth_signature;
  }
}

function send(res: http.ServerResponse, { status = 200, headers = {}, body }: { status?: number, headers?: http.OutgoingHttpHeaders, body?: unknown }) {
  if (typeof body === 'string' || body === undefined) {
    res.writeHead(status, headers);
    res.end(body);
  } else {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...headers });
    res.end(JSON.stringify(body));
  }
}

function parseBody({ headers, body }: FakeXRequest) {
  if (headers['content-type']?.startsWith('application/json')) {
    return JSON.parse(body);
  }
  if (headers['content-type']?.startsWith('application/x-www-form-urlencoded')) {
    const data: { [key: string]: string } = {};
    new URLSearchParams(body).forEach((value, key) => data[key] = value);
    return data;
  }
}

function percentEncode(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, char => '%' + char.charCodeAt(0).toString(16).toUpperCase());
}

function compare(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0;
}
