import * as crypto from 'crypto';

// ----------------------------------------------------------
// LICENSE: This code partially belongs to oauth-1.0a package
// ----------------------------------------------------------

export interface OAuth1Tokens {
  key: string;
  secret: string;
}

export interface OAuth1MakerArgs {
  consumerKeys: OAuth1Tokens;
}

export interface OAuth1RequestOptions {
  url: string;
  method: string;
  data?: any;
}

export interface OAuth1AuthInfo {
  oauth_consumer_key: string;
  oauth_nonce: string;
  oauth_signature_method: string;
  oauth_timestamp: number;
  oauth_version: string;
  oauth_token: string;
  oauth_signature: string;
}

export class OAuth1Helper {
  nonceLength = 32;
  protected consumerKeys: OAuth1Tokens;

  constructor(options: OAuth1MakerArgs) {
    this.consumerKeys = options.consumerKeys;
  }

  static percentEncode(str: string) {
    return encodeURIComponent(str)
      .replace(/!/g, '%21')
      .replace(/\*/g, '%2A')
      .replace(/'/g, '%27')
      .replace(/\(/g, '%28')
      .replace(/\)/g, '%29');
  }

  protected hash(base: string, key: string) {
    return crypto
      .createHmac('sha1', key)
      .update(base)
      .digest('base64');
  }

  authorize(request: OAuth1RequestOptions, accessTokens: Partial<OAuth1Tokens> = {}) {
    const oauthInfo: Partial<OAuth1AuthInfo> = {
      oauth_consumer_key: this.consumerKeys.key,
      oauth_nonce: this.getNonce(),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: this.getTimestamp(),
      oauth_version: '1.0',
    };

    if (accessTokens.key !== undefined) {
      oauthInfo.oauth_token = accessTokens.key;
    }

    if (!request.data) {
      request.data = {};
    }

    oauthInfo.oauth_signature = this.getSignature(request, accessTokens.secret, oauthInfo as OAuth1AuthInfo);

    return oauthInfo as OAuth1AuthInfo;
  }

  toHeader(oauthInfo: OAuth1AuthInfo) {
    const sorted = sortObject(oauthInfo);
    let header_value = 'OAuth ';

    for (const element of sorted) {
      if (element.key.indexOf('oauth_') !== 0) {
        continue;
      }

      header_value += OAuth1Helper.percentEncode(element.key) + '="' + OAuth1Helper.percentEncode(element.value as string) + '",';
    }

    return {
      // Remove the last ,
      Authorization: header_value.slice(0, header_value.length - 1),
    };
  }

  protected getNonce() {
    return crypto
      .randomBytes(Math.ceil(this.nonceLength * 3 / 4))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .slice(0, this.nonceLength);
  }

  protected getTimestamp() {
    return Math.trunc(new Date().getTime() / 1000);
  }

  protected getSignature(request: OAuth1RequestOptions, tokenSecret: string | undefined, oauthInfo: OAuth1AuthInfo) {
    return this.hash(
      this.getBaseString(request, oauthInfo),
      this.getSigningKey(tokenSecret)
    );
  }

  protected getSigningKey(tokenSecret: string | undefined) {
    return OAuth1Helper.percentEncode(this.consumerKeys.secret) + '&' + OAuth1Helper.percentEncode(tokenSecret || '');
  }

  protected getBaseString(request: OAuth1RequestOptions, oauthInfo: OAuth1AuthInfo) {
    return request.method.toUpperCase() + '&'
      + OAuth1Helper.percentEncode(this.getBaseUrl(request.url)) + '&'
      + OAuth1Helper.percentEncode(this.getParameterString(request, oauthInfo));
  }

  protected getParameterString(request: OAuth1RequestOptions, oauthInfo: OAuth1AuthInfo) {
    const baseStringData = sortObject(
      percentEncodeData(
        mergeObject(
          oauthInfo,
          mergeObject(request.data, deParamUrl(request.url)),
        ),
      ),
    );

    let dataStr = '';

    for (const { key, value } of baseStringData) {
      // check if the value is an array
      // this means that this key has multiple values
      if (value && Array.isArray(value)) {
        // sort the array first
        value.sort();

        let valString = '';
        // serialize all values for this key: e.g. formkey=formvalue1&formkey=formvalue2
        value.forEach((item, i) => {
          valString += key + '=' + item;
          if (i < value.length){
            valString += '&';
          }
        });

        dataStr += valString;
      } else {
        dataStr += key + '=' + value + '&';
      }
    }

    // Remove the last character
    return dataStr.slice(0, dataStr.length - 1);
  }

  protected getBaseUrl(url: string) {
    return url.split('?')[0];
  }
}

export default OAuth1Helper;

// Helper functions //

function mergeObject<A extends object, B extends object>(obj1: A, obj2: B): A & B {
  return {
    ...obj1 || {},
    ...obj2 || {},
  };
}

function sortObject<T extends object>(data: T) {
  return Object.keys(data)
    .sort()
    .map(key => ({ key, value: data[key as keyof typeof data] }));
}

function deParam(string: string) {
  const split = string.split('&');
  const data: { [key: string]: string | string[] } = {};

  for (const coupleKeyValue of split) {
    const [key, value = ''] = coupleKeyValue.split('=');

    // check if the key already exists
    // this can occur if the QS part of the url contains duplicate keys like this: ?formkey=formvalue1&formkey=formvalue2
    if (data[key]) {
      // the key exists already
      if (!Array.isArray(data[key])) {
        // replace the value with an array containing the already present value
        data[key] = [data[key] as string];
      }
      // and add the new found value to it
      (data[key] as string[]).push(decodeURIComponent(value));
    } else {
      // it doesn't exist, just put the found value in the data object
      data[key] = decodeURIComponent(value);
    }
  }

  return data;
}

function deParamUrl(url: string) {
  const tmp = url.split('?');

  if (tmp.length === 1)
    return {};

  return deParam(tmp[1]);
}

function percentEncodeData<T>(data: T): T {
  const result: any = {};

  for (const key in data) {
    let value: any = data[key];

    // check if the value is an array
    if (value && Array.isArray(value)){
      value = value.map(v => OAuth1Helper.percentEncode(v));
    } else {
      value = OAuth1Helper.percentEncode(value);
    }

    result[OAuth1Helper.percentEncode(key)] = value;
  }

  return result;
}
