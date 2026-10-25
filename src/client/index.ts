import TwitterApiv1 from '../v1/client.v1';
import TwitterApiv2 from '../v2/client.v2';
import { TwitterApiError } from '../types';
import TwitterApiReadWrite from './readwrite';
import TwitterAds from '../ads/client.ads';


// "Real" exported client for usage of TwitterApi.
/**
 * Twitter v1.1 and v2 API client.
 */
export class TwitterApi extends TwitterApiReadWrite {
  protected _v1?: TwitterApiv1;
  protected _v2?: TwitterApiv2;
  protected _ads?: TwitterAds;

  /* Direct access to subclients */
  /**
   * Client for the v1.1 API. X no longer serves most v1.1 endpoints, so most of its methods are deprecated: prefer `v2`.
   */
  public get v1() {
    if (this._v1) return this._v1;

    return this._v1 = new TwitterApiv1(this);
  }

  public get v2() {
    if (this._v2) return this._v2;

    return this._v2 = new TwitterApiv2(this);
  }

  /**
   * Get a client with read/write rights.
   */
  public get readWrite() {
    return this as TwitterApiReadWrite;
  }

  /**
   * Get Twitter Ads API client
   */
  public get ads() {
    if (this._ads) return this._ads;
    return this._ads = new TwitterAds(this);
  }

  /* Static helpers */
  public static getErrors(error: any) {
    if (typeof error !== 'object')
      return [];

    if (!('data' in error))
      return [];

    return (error as TwitterApiError).data.errors ?? [];
  }

  /** Extract another image size than obtained in a `profile_image_url` or `profile_image_url_https` field of a user object. */
  public static getProfileImageInSize(profileImageUrl: string, size: 'normal' | 'bigger' | 'mini' | 'original') {
    const lastPart = profileImageUrl.split('/').pop()!;
    const sizes = ['normal', 'bigger', 'mini'];

    let originalUrl = profileImageUrl;

    for (const availableSize of sizes) {
      if (lastPart.includes(`_${availableSize}`)) {
        originalUrl = profileImageUrl.replace(`_${availableSize}`, '');
        break;
      }
    }

    if (size === 'original') {
      return originalUrl;
    }

    const extPos = originalUrl.lastIndexOf('.');
    if (extPos !== -1) {
      const ext = originalUrl.slice(extPos + 1);
      return originalUrl.slice(0, extPos) + '_' + size + '.' + ext;
    } else {
      return originalUrl + '_' + size;
    }
  }
}

export { default as TwitterApiReadWrite } from './readwrite';
export { default as TwitterApiReadOnly } from './readonly';
export default TwitterApi;
