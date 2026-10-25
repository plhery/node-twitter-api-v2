import { request } from 'https';
import type { IncomingMessage, ClientRequest } from 'http';
import { TwitterApiV2Settings } from '../settings';
import TweetStream from '../stream/TweetStream';
import { ApiPartialResponseError, ApiRequestError, ApiResponseError } from '../types';
import type { ErrorV1, ErrorV2, TwitterRateLimit, TwitterResponse } from '../types';
import type { TRequestFullData, TRequestFullStreamData, TResponseParseMode } from '../types/request-maker.mixin.types';
import * as zlib from 'zlib';
import { pipeline, Readable } from 'stream';

type TRequestReadyPayload = { req: ClientRequest, res: Readable, originalResponse: IncomingMessage, requestData: TRequestFullData | TRequestFullStreamData };
type TReadyRequestResolver = (value: TRequestReadyPayload) => void;
type TResponseResolver<T> = (value: TwitterResponse<T>) => void;
type TRequestRejecter = (error: ApiRequestError) => void;
type TResponseRejecter = (error: ApiResponseError | ApiPartialResponseError) => void;

interface IBuildErrorParams {
  res: IncomingMessage;
  data: any;
  rateLimit?: TwitterRateLimit;
  code: number;
}

export class RequestHandlerHelper<T> {
  protected req!: ClientRequest;
  protected res!: IncomingMessage;
  protected responseData: Buffer[] = [];

  constructor(protected requestData: TRequestFullData | TRequestFullStreamData) {}

  /* Request helpers */

  get hrefPathname() {
    const url = this.requestData.url;
    return url.hostname + url.pathname;
  }

  protected isCompressionDisabled() {
    return !this.requestData.compression || this.requestData.compression === 'identity';
  }

  protected isFormEncodedEndpoint() {
    return this.requestData.url.href.startsWith('https://api.x.com/oauth/');
  }

  /* Error helpers */

  protected createRequestError(error: Error): ApiRequestError {
    if (TwitterApiV2Settings.debug) {
      TwitterApiV2Settings.logger.log('Request error:', error);
    }

    return new ApiRequestError('Request failed.', {
      request: this.req,
      error,
    });
  }

  protected createPartialResponseError(error: Error, abortClose: boolean): ApiPartialResponseError {
    const res = this.res;
    let message = `Request failed with partial response with HTTP code ${res.statusCode}`;

    if (abortClose) {
      message += ' (connection abruptly closed)';
    } else {
      message += ' (parse error)';
    }

    return new ApiPartialResponseError(message, {
      request: this.req,
      response: this.res,
      responseError: error,
      rawContent: Buffer.concat(this.responseData).toString(),
    });
  }

  protected formatV1Errors(errors: ErrorV1[]) {
    return errors
      .map(({ code, message }) => `${message} (Twitter code ${code})`)
      .join(', ');
  }

  protected formatV2Error(error: ErrorV2) {
    return `${error.title}: ${error.detail} (see ${error.type})`;
  }

  protected createResponseError({ res, data, rateLimit, code }: IBuildErrorParams): ApiResponseError {
    if (TwitterApiV2Settings.debug) {
      TwitterApiV2Settings.logger.log(`Request failed with code ${code}, data:`, data);
      TwitterApiV2Settings.logger.log('Response headers:', res.headers);
    }

    // Errors formatting.
    let errorString = `Request failed with code ${code}`;
    if (data?.errors?.length) {
      const errors = data.errors as (ErrorV1 | ErrorV2)[];

      if (typeof errors[0] === 'object' && 'code' in errors[0]) {
        errorString += ' - ' + this.formatV1Errors(errors as ErrorV1[]);
      }
      else {
        errorString += ' - ' + this.formatV2Error(data as ErrorV2);
      }
    }

    return new ApiResponseError(errorString, {
      code,
      data,
      headers: res.headers,
      request: this.req,
      response: res,
      rateLimit,
    });
  }

  /* Response helpers */

  protected getResponseDataStream(res: IncomingMessage) {
    if (this.isCompressionDisabled()) {
      return res;
    }

    const contentEncoding = (res.headers['content-encoding'] || 'identity').trim().toLowerCase();

    if (contentEncoding === 'br') {
      const brotli = zlib.createBrotliDecompress({
        flush: zlib.constants.BROTLI_OPERATION_FLUSH,
        finishFlush: zlib.constants.BROTLI_OPERATION_FLUSH,
      });
      pipeline(res, brotli, () => undefined);

      return brotli;
    }
    if (contentEncoding === 'gzip') {
      const gunzip = zlib.createGunzip({
        flush: zlib.constants.Z_SYNC_FLUSH,
        finishFlush: zlib.constants.Z_SYNC_FLUSH,
      });
      pipeline(res, gunzip, () => undefined);

      return gunzip;
    }
    if (contentEncoding === 'deflate') {
      const inflate = zlib.createInflate({
        flush: zlib.constants.Z_SYNC_FLUSH,
        finishFlush: zlib.constants.Z_SYNC_FLUSH,
      });
      pipeline(res, inflate, () => undefined);

      return inflate;
    }

    return res;
  }

  protected detectResponseType(res: IncomingMessage): TResponseParseMode {
    // Auto parse if server responds with JSON body
    if (res.headers['content-type']?.includes('application/json') || res.headers['content-type']?.includes('application/problem+json')) {
      return 'json';
    }
    // f-e oauth token endpoints
    else if (this.isFormEncodedEndpoint()) {
      return 'url';
    }

    return 'text';
  }

  protected getParsedResponse(res: IncomingMessage) {
    const data = this.responseData;
    const mode = this.requestData.forceParseMode || this.detectResponseType(res);

    if (mode === 'buffer') {
      return Buffer.concat(data);
    } else if (mode === 'text') {
      return Buffer.concat(data).toString();
    } else if (mode === 'json') {
      const asText = Buffer.concat(data).toString();
      return asText.length ? JSON.parse(asText) : undefined;
    } else if (mode === 'url') {
      const asText = Buffer.concat(data).toString();
      const formEntries: any = {};

      for (const [item, value] of new URLSearchParams(asText)) {
        formEntries[item] = value;
      }

      return formEntries;
    } else {
      // mode === 'none'
      return undefined;
    }
  }

  protected getRateLimitFromResponse(res: IncomingMessage) {
    let rateLimit: TwitterRateLimit | undefined = undefined;

    if (res.headers['x-rate-limit-limit']) {
      rateLimit = {
        limit: Number(res.headers['x-rate-limit-limit']),
        remaining: Number(res.headers['x-rate-limit-remaining']),
        reset: Number(res.headers['x-rate-limit-reset']),
      };

      if (res.headers['x-app-limit-24hour-limit']) {
        rateLimit.day = {
          limit: Number(res.headers['x-app-limit-24hour-limit']),
          remaining: Number(res.headers['x-app-limit-24hour-remaining']),
          reset: Number(res.headers['x-app-limit-24hour-reset']),
        };
      }

      if (res.headers['x-user-limit-24hour-limit']) {
        rateLimit.userDay = {
          limit: Number(res.headers['x-user-limit-24hour-limit']),
          remaining: Number(res.headers['x-user-limit-24hour-remaining']),
          reset: Number(res.headers['x-user-limit-24hour-reset']),
        };
      }

      if (this.requestData.rateLimitSaver) {
        this.requestData.rateLimitSaver(rateLimit);
      }
    }

    return rateLimit;
  }

  /* Request event handlers */

  protected requestErrorHandler(reject: TRequestRejecter, requestError: Error) {
    this.requestData.requestEventDebugHandler?.('request-error', { requestError });

    reject(this.createRequestError(requestError));
  }

  protected timeoutErrorHandler() {
    this.req.destroy(new Error('Request timeout.'));
  }

  /* Response event handlers */

  protected classicResponseHandler(resolve: TResponseResolver<T>, reject: TResponseRejecter, res: IncomingMessage) {
    this.res = res;

    const dataStream = this.getResponseDataStream(res);

    // Register the response data
    dataStream.on('data', chunk => this.responseData.push(chunk));
    dataStream.on('end', this.onResponseEndHandler.bind(this, resolve, reject));
    dataStream.on('close', this.onResponseCloseHandler.bind(this, resolve, reject));

    if (dataStream !== res) {
      // A body that can't be decompressed, or a response cut midway, never emits 'end' on the decompressor
      dataStream.on('error', this.onResponseDecompressionErrorHandler.bind(this, reject));
    }

    // Debug handlers
    if (this.requestData.requestEventDebugHandler) {
      this.requestData.requestEventDebugHandler('response', { res });

      res.on('aborted', error => this.requestData.requestEventDebugHandler!('response-aborted', { error }));
      res.on('error', error => this.requestData.requestEventDebugHandler!('response-error', {  error }));
      res.on('close', () => this.requestData.requestEventDebugHandler!('response-close', { data: this.responseData }));
      res.on('end', () => this.requestData.requestEventDebugHandler!('response-end'));
    }
  }

  protected onResponseEndHandler(resolve: TResponseResolver<T>, reject: TResponseRejecter) {
    const rateLimit = this.getRateLimitFromResponse(this.res);
    let data: any;

    try {
      data = this.getParsedResponse(this.res);
    } catch (e) {
      reject(this.createPartialResponseError(e as Error, false));
      return;
    }

    // Handle bad error codes
    const code = this.res.statusCode!;
    if (code >= 400) {
      reject(this.createResponseError({ data, res: this.res, rateLimit, code }));
      return;
    }

    if (TwitterApiV2Settings.debug) {
      TwitterApiV2Settings.logger.log(`[${this.requestData.options.method} ${this.hrefPathname}]: Request succeeds with code ${this.res.statusCode}`);
      TwitterApiV2Settings.logger.log('Response body:', data);
    }

    resolve({
      data,
      headers: this.res.headers,
      rateLimit,
    });
  }

  protected onResponseCloseHandler(resolve: TResponseResolver<T>, reject: TResponseRejecter) {
    const res = this.res;

    if (res.aborted) {
      // Try to parse the request (?)
      try {
        this.getParsedResponse(this.res);
        // Ok, try to resolve normally the request
        return this.onResponseEndHandler(resolve, reject);
      } catch (e) {
        // Parse error, just drop with content
        return reject(this.createPartialResponseError(e as Error, true));
      }
    }
    if (!res.complete) {
      return reject(this.createPartialResponseError(
        new Error('Response has been interrupted before response could be parsed.'),
        true,
      ));
    }

    // else: end has been called
  }

  protected onResponseDecompressionErrorHandler(reject: TResponseRejecter, error: Error) {
    reject(this.createPartialResponseError(error, !this.res.complete));
  }

  protected streamResponseHandler(resolve: TReadyRequestResolver, reject: TResponseRejecter, res: IncomingMessage) {
    const code = res.statusCode!;

    if (code < 400) {
      if (TwitterApiV2Settings.debug) {
        TwitterApiV2Settings.logger.log(`[${this.requestData.options.method} ${this.hrefPathname}]: Request succeeds with code ${res.statusCode} (starting stream)`);
      }

      const dataStream = this.getResponseDataStream(res);

      // HTTP code ok, consume stream
      resolve({ req: this.req, res: dataStream, originalResponse: res, requestData: this.requestData });
    }
    else {
      // Handle response normally, can only rejects
      this.classicResponseHandler(() => undefined, reject, res);
    }
  }

  /* Wrappers for request lifecycle */

  protected debugRequest() {
    const url = this.requestData.url;

    TwitterApiV2Settings.logger.log(`[${this.requestData.options.method} ${this.hrefPathname}]`, this.requestData.options);
    if (url.search) {
      TwitterApiV2Settings.logger.log('Request parameters:', [...url.searchParams.entries()].map(([key, value]) => `${key}: ${value}`));
    }
    if (this.requestData.body) {
      TwitterApiV2Settings.logger.log('Request body:', this.requestData.body);
    }
  }

  protected buildRequest() {
    const url = this.requestData.url;
    const auth = url.username ? `${url.username}:${url.password}` : undefined;
    const headers = this.requestData.options.headers ?? {};

    if (this.requestData.compression === true || this.requestData.compression === 'brotli') {
      headers['accept-encoding'] = 'br;q=1.0, gzip;q=0.8, deflate;q=0.5, *;q=0.1';
    } else if (this.requestData.compression === 'gzip') {
      headers['accept-encoding'] = 'gzip;q=1, deflate;q=0.5, *;q=0.1';
    } else if (this.requestData.compression === 'deflate') {
      headers['accept-encoding'] = 'deflate;q=1, *;q=0.1';
    }

    if (TwitterApiV2Settings.debug) {
      this.debugRequest();
    }

    this.req = request({
      ...this.requestData.options,
      // Define URL params manually, addresses dependencies error https://github.com/PLhery/node-twitter-api-v2/issues/94
      host: url.hostname,
      port: url.port || undefined,
      path: url.pathname + url.search,
      protocol: url.protocol,
      auth,
      headers,
    });
  }

  protected registerRequestEventDebugHandlers(req: ClientRequest) {
    req.on('close', () => this.requestData.requestEventDebugHandler!('close'));
    req.on('abort', () => this.requestData.requestEventDebugHandler!('abort'));

    req.on('socket', socket => {
      this.requestData.requestEventDebugHandler!('socket', { socket });

      socket.on('error', error => this.requestData.requestEventDebugHandler!('socket-error', { socket, error }));
      socket.on('connect', () => this.requestData.requestEventDebugHandler!('socket-connect', { socket }));
      socket.on('close', withError => this.requestData.requestEventDebugHandler!('socket-close', { socket, withError }));
      socket.on('end', () => this.requestData.requestEventDebugHandler!('socket-end', { socket }));
      socket.on('lookup', (...data) => this.requestData.requestEventDebugHandler!('socket-lookup', { socket, data }));
      socket.on('timeout', () => this.requestData.requestEventDebugHandler!('socket-timeout', { socket }));
    });
  }

  makeRequest() {
    this.buildRequest();

    return new Promise<TwitterResponse<T>>((resolve, reject) => {
      const req = this.req;

      // Handle request errors. Node also emits 'error' when the socket closes before a response
      req.on('error', this.requestErrorHandler.bind(this, reject));

      req.on('response', this.classicResponseHandler.bind(this, resolve, reject));

      if (this.requestData.options.timeout) {
        req.on('timeout', this.timeoutErrorHandler.bind(this));
      }

      // Debug handlers
      if (this.requestData.requestEventDebugHandler) {
        this.registerRequestEventDebugHandlers(req);
      }

      if (this.requestData.body) {
        req.write(this.requestData.body);
      }

      req.end();
    });
  }

  async makeRequestAsStream() {
    const { req, res, requestData, originalResponse } = await this.makeRequestAndResolveWhenReady();
    return new TweetStream<T>(requestData as TRequestFullStreamData, { req, res, originalResponse });
  }

  makeRequestAndResolveWhenReady() {
    this.buildRequest();

    return new Promise<TRequestReadyPayload>((resolve, reject) => {
      const req = this.req;

      // Handle request errors
      req.on('error', this.requestErrorHandler.bind(this, reject));

      req.on('response', this.streamResponseHandler.bind(this, resolve, reject));

      if (this.requestData.body) {
        req.write(this.requestData.body);
      }

      req.end();
    });
  }
}

export default RequestHandlerHelper;
