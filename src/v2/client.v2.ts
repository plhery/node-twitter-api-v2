import { API_V2_PREFIX } from '../globals';
import TwitterApiv2ReadWrite from './client.v2.write';
import TwitterApiv2Labs from '../v2-labs/client.v2.labs';

/**
 * Twitter v2 client with all rights (read/write/DMs)
 */
export class TwitterApiv2 extends TwitterApiv2ReadWrite {
  protected _prefix = API_V2_PREFIX;
  protected _labs?: TwitterApiv2Labs;

  /* Sub-clients */

  /**
   * Get a client with read/write rights.
   */
  public get readWrite() {
    return this as TwitterApiv2ReadWrite;
  }

  /**
   * Get a client for v2 labs endpoints.
   *
   * @deprecated X retired the Labs endpoints in 2020.
   */
  public get labs() {
    if (this._labs) return this._labs;

    return this._labs = new TwitterApiv2Labs(this);
  }

  /** API endpoints */


}

export default TwitterApiv2;
