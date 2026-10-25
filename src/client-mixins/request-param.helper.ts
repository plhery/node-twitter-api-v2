import { FormDataHelper } from './form-data.helper';
import type { RequestOptions } from 'https';
import type { TBodyMode, TRequestBody, TRequestQuery, TRequestStringQuery } from '../types/request-maker.mixin.types';
import OAuth1Helper from './oauth1.helper';

/* Helpers functions that are specific to this class but do not depends on instance */

export class RequestParamHelpers {
  static readonly JSON_1_1_ENDPOINTS = new Set([
    'direct_messages/events/new.json',
    'direct_messages/welcome_messages/new.json',
    'direct_messages/welcome_messages/rules/new.json',
    'media/metadata/create.json',
    'collections/entries/curate.json',
  ]);

  static formatQueryToString(query: TRequestQuery) {
    const formattedQuery: TRequestStringQuery = {};

    for (const prop in query) {
      if (typeof query[prop] === 'string') {
        formattedQuery[prop] = query[prop] as string;
      }
      else if (typeof query[prop] !== 'undefined') {
        formattedQuery[prop] = String(query[prop]);
      }
    }

    return formattedQuery;
  }

  static autoDetectBodyType(url: URL) : TBodyMode {
    if (url.pathname.startsWith('/2/') || url.pathname.startsWith('/labs/2/')) {
      // oauth2 takes url encoded
      if (url.password.startsWith('/2/oauth2')) {
        return 'url';
      }
      // Twitter API v2 has JSON-encoded requests for everything else
      return 'json';
    }

    if (url.hostname === 'upload.x.com') {
      if (url.pathname === '/1.1/media/upload.json') {
        return 'form-data';
      }
      // json except for media/upload command, that is form-data.
      return 'json';
    }

    const endpoint = url.pathname.split('/1.1/', 2)[1];

    if (this.JSON_1_1_ENDPOINTS.has(endpoint)) {
      return 'json';
    }
    return 'url';
  }

  static addQueryParamsToUrl(url: URL, query: TRequestQuery) {
    const queryEntries = Object.entries(query) as [string, string][];

    if (queryEntries.length) {
      let search = '';

      for (const [key, value] of queryEntries) {
        search += (search.length ? '&' : '?') + `${OAuth1Helper.percentEncode(key)}=${OAuth1Helper.percentEncode(value)}`;
      }

      url.search = search;
    }
  }

  static constructBodyParams(
    body: TRequestBody,
    headers: Record<string, string>,
    mode: TBodyMode,
  ) {
    if (body instanceof Buffer) {
      return body;
    }

    if (mode === 'json') {
      if (!headers['content-type']) {
        headers['content-type'] = 'application/json;charset=UTF-8';
      }
      return JSON.stringify(body);
    }
    else if (mode === 'url') {
      if (!headers['content-type']) {
        headers['content-type'] = 'application/x-www-form-urlencoded;charset=UTF-8';
      }

      if (Object.keys(body).length) {
        return new URLSearchParams(body)
          .toString()
          .replace(/\*/g, '%2A'); // URLSearchParams doesnt encode '*', but Twitter wants it encoded.
      }

      return '';
    }
    else if (mode === 'raw') {
      throw new Error('You can only use raw body mode with Buffers. To give a string, use Buffer.from(str).');
    }
    else {
      const form = new FormDataHelper();

      for (const parameter in body) {
        form.append(parameter, body[parameter]);
      }

      if (!headers['content-type']) {
        const formHeaders = form.getHeaders();
        headers['content-type'] = formHeaders['content-type'];
      }

      return form.getBuffer();
    }
  }

  static setBodyLengthHeader(options: RequestOptions, body: string | Buffer) {
    options.headers = options.headers ?? {};

    if (typeof body === 'string') {
      options.headers['content-length'] = Buffer.byteLength(body);
    }
    else {
      options.headers['content-length'] = body.length;
    }
  }

  static isOAuthSerializable(item: any) {
    return !(item instanceof Buffer);
  }

  static mergeQueryAndBodyForOAuth(query: TRequestQuery, body: TRequestBody) {
    const parameters: any = {};

    for (const prop in query) {
      parameters[prop] = query[prop];
    }

    if (this.isOAuthSerializable(body)) {
      for (const prop in body) {
        const bodyProp = (body as any)[prop];

        if (this.isOAuthSerializable(bodyProp)) {
          parameters[prop] = typeof bodyProp === 'object' && bodyProp !== null && 'toString' in bodyProp
            ? bodyProp.toString()
            : bodyProp;
        }
      }
    }

    return parameters;
  }

  static moveUrlQueryParamsIntoObject(url: URL, query: TRequestQuery) {
    for (const [param, value] of url.searchParams) {
      query[param] = value;
    }

    // Remove the query string
    url.search = '';
    return url;
  }

  /**
   * Replace URL parameters available in pathname, like `:id`, with data given in `parameters`:
   * `https://x.com/:id.json` + `{ id: '20' }` => `https://x.com/20.json`
   */
  static applyRequestParametersToUrl(url: URL, parameters: TRequestQuery) {
    url.pathname = url.pathname.replace(/:([A-Z_-]+)/ig, (fullMatch, paramName: string) => {
      if (parameters[paramName] === undefined) {
        return fullMatch;
      }

      // Encoded, so that a value like '../../tweets/1' can't change the endpoint.
      // '.' and '..' would still move up the path, even encoded
      const value = String(parameters[paramName]);
      if (value === '.' || value === '..') {
        throw new Error(`Invalid value for URL parameter ${paramName}: ${value}`);
      }
      return encodeURIComponent(value);
    });

    return url;
  }
}

export default RequestParamHelpers;
