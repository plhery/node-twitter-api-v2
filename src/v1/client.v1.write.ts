import * as fs from 'fs';
import { API_V1_1_PREFIX, API_V1_1_UPLOAD_PREFIX } from '../globals';
import { hasMultipleItems } from '../helpers';
import {
  AccountProfileV1Params,
  AccountSettingsV1,
  AccountSettingsV1Params,
  AddOrRemoveListMembersV1Params,
  EUploadMimeType,
  FriendshipCreateOrDestroyV1,
  FriendshipCreateV1Params,
  FriendshipDestroyV1Params,
  FriendshipUpdateV1Params,
  FriendshipV1,
  GetListV1Params,
  InitMediaV1Result,
  ListCreateV1Params,
  ListV1,
  MediaMetadataV1Params,
  MediaStatusV1Result,
  MediaSubtitleV1Param,
  ProfileBannerUpdateV1Params,
  ProfileImageUpdateV1Params,
  ReportSpamV1Params,
  SendTweetV1Params,
  TUploadableMedia,
  TweetV1,
  UpdateListV1Params,
  UploadMediaV1Params,
  UserV1,
} from '../types';
import TwitterApiv1ReadOnly from './client.v1.read';
import { TFileHandle, getFileHandle, getFileSizeFromFileHandle, getMediaCategoryByMime, getMimeType, readFileIntoBuffer, readNextPartOf, sleepSecs } from './media-helpers.v1';

const UPLOAD_ENDPOINT = 'media/upload.json';

/**
 * Base Twitter v1 client with read/write rights.
 */
export default class TwitterApiv1ReadWrite extends TwitterApiv1ReadOnly {
  protected _prefix = API_V1_1_PREFIX;

  /**
   * Get a client with only read rights.
   */
  public get readOnly() {
    return this as TwitterApiv1ReadOnly;
  }

  /* Tweet API */

  /**
   * Post a new tweet.
   * https://developer.x.com/en/docs/twitter-api/v1/tweets/post-and-engage/api-reference/post-statuses-update
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.tweet()` instead.
   */
  public tweet(status: string, payload: Partial<SendTweetV1Params> = {}) {
    const queryParams: Partial<SendTweetV1Params> = {
      status,
      tweet_mode: 'extended',
      ...payload,
    };

    return this.post<TweetV1>('statuses/update.json', queryParams);
  }

  /**
   * Quote an existing tweet.
   * https://developer.x.com/en/docs/twitter-api/v1/tweets/post-and-engage/api-reference/post-statuses-update
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.quote()` instead (Enterprise plans only).
   */
  public async quote(status: string, quotingStatusId: string, payload: Partial<SendTweetV1Params> = {}) {
    const url = 'https://x.com/i/statuses/' + quotingStatusId;
    return this.tweet(status, { ...payload, attachment_url: url });
  }

  /**
   * Post a series of tweets.
   * https://developer.x.com/en/docs/twitter-api/v1/tweets/post-and-engage/api-reference/post-statuses-update
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.tweetThread()` instead.
   */
  public async tweetThread(tweets: (SendTweetV1Params | string)[]) {
    const postedTweets: TweetV1[] = [];

    for (const tweet of tweets) {
      // Retrieve the last sent tweet
      const lastTweet = postedTweets.length ? postedTweets[postedTweets.length - 1] : null;
      // Build the tweet query params
      const queryParams: SendTweetV1Params = { ...(typeof tweet === 'string' ? ({ status: tweet }) : tweet) };
      // Reply to an existing tweet if needed
      const inReplyToId = lastTweet ? lastTweet.id_str : queryParams.in_reply_to_status_id;
      const status = queryParams.status;

      if (inReplyToId) {
        postedTweets.push(await this.reply(status, inReplyToId, queryParams));
      } else {
        postedTweets.push(await this.tweet(status, queryParams));
      }
    }

    return postedTweets;
  }

  /**
   * Reply to an existing tweet. Shortcut to `.tweet` with tweaked parameters.
   * https://developer.x.com/en/docs/twitter-api/v1/tweets/post-and-engage/api-reference/post-statuses-update
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.reply()` instead.
   */
  public reply(status: string, in_reply_to_status_id: string, payload: Partial<SendTweetV1Params> = {}) {
    return this.tweet(status, {
      auto_populate_reply_metadata: true,
      in_reply_to_status_id,
      ...payload,
    });
  }

  /**
   * Delete an existing tweet belonging to you.
   * https://developer.x.com/en/docs/twitter-api/v1/tweets/post-and-engage/api-reference/post-statuses-destroy-id
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.deleteTweet()` instead.
   */
  public deleteTweet(tweetId: string) {
    return this.post<TweetV1>('statuses/destroy/:id.json', { tweet_mode: 'extended' }, { params: { id: tweetId } });
  }

  /* User API */

  /**
   * Report the specified user as a spam account to Twitter.
   * Additionally, optionally performs the equivalent of POST blocks/create on behalf of the authenticated user.
   * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/mute-block-report-users/api-reference/post-users-report_spam
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
   */
  public reportUserAsSpam(options: ReportSpamV1Params) {
    return this.post<UserV1>('users/report_spam.json', { tweet_mode: 'extended', ...options });
  }

  /**
   * Turn on/off Retweets and device notifications from the specified user.
   * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/follow-search-get-users/api-reference/post-friendships-update
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
   */
  public updateFriendship(options: Partial<FriendshipUpdateV1Params>) {
    return this.post<FriendshipV1>('friendships/update.json', options);
  }

  /**
   * Follow the specified user.
   * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/follow-search-get-users/api-reference/post-friendships-create
   */
   public createFriendship(options: Partial<FriendshipCreateV1Params>) {
    return this.post<FriendshipCreateOrDestroyV1>('friendships/create.json', options);
  }

  /**
   * Unfollow the specified user.
   * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/follow-search-get-users/api-reference/post-friendships-destroy
   */
   public destroyFriendship(options: Partial<FriendshipDestroyV1Params>) {
    return this.post<FriendshipCreateOrDestroyV1>('friendships/destroy.json', options);
  }

  /* Account API */

  /**
   * Update current account settings for authenticating user.
   * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/manage-account-settings/api-reference/get-account-settings
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
   */
  public updateAccountSettings(options: Partial<AccountSettingsV1Params>) {
    return this.post<AccountSettingsV1>('account/settings.json', options);
  }

  /**
   * Sets some values that users are able to set under the "Account" tab of their settings page.
   * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/manage-account-settings/api-reference/post-account-update_profile
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
   */
  public updateAccountProfile(options: Partial<AccountProfileV1Params>) {
    return this.post<UserV1>('account/update_profile.json', options);
  }

  /**
   * Uploads a profile banner on behalf of the authenticating user.
   * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/manage-account-settings/api-reference/post-account-update_profile_banner
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
   */
  public async updateAccountProfileBanner(file: TUploadableMedia, options: Partial<ProfileBannerUpdateV1Params> = {}) {
    const queryParams = {
      banner: await readFileIntoBuffer(file),
      ...options,
    };
    return this.post<void>('account/update_profile_banner.json', queryParams, { forceBodyMode: 'form-data' });
  }

  /**
   * Updates the authenticating user's profile image.
   * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/manage-account-settings/api-reference/post-account-update_profile_image
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
   */
  public async updateAccountProfileImage(file: TUploadableMedia, options: Partial<ProfileImageUpdateV1Params> = {}) {
    const queryParams = {
      tweet_mode: 'extended',
      image: await readFileIntoBuffer(file),
      ...options,
    };
    return this.post<UserV1>('account/update_profile_image.json', queryParams, { forceBodyMode: 'form-data' });
  }

  /**
   * Removes the uploaded profile banner for the authenticating user.
   * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/manage-account-settings/api-reference/post-account-remove_profile_banner
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
   */
  public removeAccountProfileBanner() {
    return this.post<void>('account/remove_profile_banner.json');
  }

  /* Lists */

  /**
   * Creates a new list for the authenticated user.
   * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/create-manage-lists/api-reference/post-lists-create
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.createList()` instead.
   */
  public createList(options: ListCreateV1Params) {
    return this.post<ListV1>('lists/create.json', { tweet_mode: 'extended', ...options });
  }

  /**
   * Updates the specified list. The authenticated user must own the list to be able to update it.
   * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/create-manage-lists/api-reference/post-lists-update
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.updateList()` instead.
   */
  public updateList(options: UpdateListV1Params) {
    return this.post<ListV1>('lists/update.json', { tweet_mode: 'extended', ...options });
  }

  /**
   * Deletes the specified list. The authenticated user must own the list to be able to destroy it.
   * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/create-manage-lists/api-reference/post-lists-destroy
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.removeList()` instead.
   */
  public removeList(options: GetListV1Params) {
    return this.post<ListV1>('lists/destroy.json', { tweet_mode: 'extended', ...options });
  }

  /**
   * Adds multiple members to a list, by specifying a comma-separated list of member ids or screen names.
   * If you add a single `user_id` or `screen_name`, it will target `lists/members/create.json`, otherwise
   * it will target `lists/members/create_all.json`.
   * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/create-manage-lists/api-reference/post-lists-members-create_all
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.addListMember()` instead.
   */
  public addListMembers(options: AddOrRemoveListMembersV1Params) {
    const hasMultiple = (options.user_id && hasMultipleItems(options.user_id)) || (options.screen_name && hasMultipleItems(options.screen_name));
    const endpoint = hasMultiple ? 'lists/members/create_all.json' : 'lists/members/create.json';

    return this.post<void>(endpoint, options);
  }

  /**
   * Removes one or more members from a list, by specifying a comma-separated list of member ids or screen names.
   * If you add a single `user_id` or `screen_name`, it will target `lists/members/destroy.json`, otherwise
   * it will target `lists/members/destroy_all.json`.
   * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/create-manage-lists/api-reference/post-lists-members-destroy_all
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.removeListMember()` instead.
   */
  public removeListMembers(options: AddOrRemoveListMembersV1Params) {
    const hasMultiple = (options.user_id && hasMultipleItems(options.user_id)) || (options.screen_name && hasMultipleItems(options.screen_name));
    const endpoint = hasMultiple ? 'lists/members/destroy_all.json' : 'lists/members/destroy.json';

    return this.post<void>(endpoint, options);
  }

  /**
   * Subscribes the authenticated user to the specified list.
   * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/create-manage-lists/api-reference/post-lists-subscribers-create
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.subscribeToList()` instead.
   */
  public subscribeToList(options: GetListV1Params) {
    return this.post<ListV1>('lists/subscribers/create.json', { tweet_mode: 'extended', ...options });
  }

  /**
   * Unsubscribes the authenticated user of the specified list.
   * https://developer.x.com/en/docs/twitter-api/v1/accounts-and-users/create-manage-lists/api-reference/post-lists-subscribers-destroy
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.unsubscribeOfList()` instead.
   */
  public unsubscribeOfList(options: GetListV1Params) {
    return this.post<ListV1>('lists/subscribers/destroy.json', { tweet_mode: 'extended', ...options });
  }

  /* Media upload API */

  /**
   * This endpoint can be used to provide additional information about the uploaded media_id.
   * This feature is currently only supported for images and GIFs.
   * https://developer.x.com/en/docs/twitter-api/v1/media/upload-media/api-reference/post-media-metadata-create
   *
   * @deprecated v1.1 media endpoint, sunset by X in June 2025. Use `v2.createMediaMetadata()` instead.
   */
  public createMediaMetadata(mediaId: string, metadata: Partial<MediaMetadataV1Params>) {
    return this.post<void>(
      'media/metadata/create.json',
      { media_id: mediaId, ...metadata },
      { prefix: API_V1_1_UPLOAD_PREFIX, forceBodyMode: 'json' },
    );
  }

  /**
   * Use this endpoint to associate uploaded subtitles to an uploaded video. You can associate subtitles to video before or after Tweeting.
   * **To obtain subtitle media ID, you must upload each subtitle file separately using `.uploadMedia()` method.**
   *
   * https://developer.x.com/en/docs/twitter-api/v1/media/upload-media/api-reference/post-media-subtitles-create
   *
   * @deprecated v1.1 media endpoint, sunset by X in June 2025. No v2 equivalent in this library.
   */
  public createMediaSubtitles(mediaId: string, subtitles: MediaSubtitleV1Param[]) {
    return this.post<void>(
      'media/subtitles/create.json',
      { media_id: mediaId, media_category: 'TweetVideo', subtitle_info: { subtitles } },
      { prefix: API_V1_1_UPLOAD_PREFIX, forceBodyMode: 'json' },
    );
  }

  /**
   * Use this endpoint to dissociate subtitles from a video and delete the subtitles. You can dissociate subtitles from a video before or after Tweeting.
   * https://developer.x.com/en/docs/twitter-api/v1/media/upload-media/api-reference/post-media-subtitles-delete
   *
   * @deprecated v1.1 media endpoint, sunset by X in June 2025. No v2 equivalent in this library.
   */
  public deleteMediaSubtitles(mediaId: string, ...languages: string[]) {
    return this.post<void>(
      'media/subtitles/delete.json',
      {
        media_id: mediaId,
        media_category: 'TweetVideo',
        subtitle_info: { subtitles: languages.map(lang => ({ language_code: lang })) },
      },
      { prefix: API_V1_1_UPLOAD_PREFIX, forceBodyMode: 'json' },
    );
  }

  /**
   * Upload a media (JPG/PNG/GIF/MP4/MOV/WEBP) or subtitle (SRT) to Twitter and return the media_id to use in tweet/DM send.
   *
   * @param file If `string`, filename is supposed.
   * A `Buffer` is a raw file.
   * `fs.promises.FileHandle` or `number` are file pointers.
   *
   * @param options.type File type (Enum 'jpg' | 'longmp4' | 'mp4' | 'mov | 'png' | 'gif' | 'srt' | 'webp').
   * If filename is given, it could be guessed with file extension, otherwise this parameter is mandatory.
   * If type is not part of the enum, it will be used as mime type.
   *
   * Type `longmp4` is **required** is you try to upload a video higher than 140 seconds.
   *
   * @param options.chunkLength Maximum chunk length sent to Twitter. Default goes to 1 MB.
   *
   * @param options.additionalOwners Other user IDs allowed to use the returned media_id. Default goes to none.
   *
   * @param options.maxConcurrentUploads Maximum uploaded chunks in the same time. Default goes to 3.
   *
   * @param options.target Target type `tweet` or `dm`. Defaults to `tweet`.
   * You must specify it if you send a media to use in DMs.
   *
   * @param returnFullMediaData If set to true, returns the whole media information instead of just the media_id
   *
   * @deprecated v1.1 media endpoint, sunset by X in June 2025. Use `v2.uploadMedia()` instead, which also accepts file paths.
   */
  public async uploadMedia(file: TUploadableMedia, options: Partial<UploadMediaV1Params>, returnFullMediaData: true): Promise<MediaStatusV1Result>;
  /** @deprecated v1.1 media endpoint, sunset by X in June 2025. Use `v2.uploadMedia()` instead, which also accepts file paths. */
  public async uploadMedia(file: TUploadableMedia, options?: Partial<UploadMediaV1Params>): Promise<string>;
  public async uploadMedia(file: TUploadableMedia, options: Partial<UploadMediaV1Params> = {}, returnFullMediaData = false) {
    const chunkLength = options.chunkLength ?? (1024 * 1024);

    const { fileHandle, mediaCategory, fileSize, mimeType } = await this.getUploadMediaRequirements(file, options);

    // Get the file handle (if not buffer)
    try {
      // Finally! We can send INIT message.
      const mediaData = await this.post<InitMediaV1Result>(
        UPLOAD_ENDPOINT,
        {
          command: 'INIT',
          total_bytes: fileSize,
          media_type: mimeType,
          media_category: mediaCategory,
          additional_owners: options.additionalOwners,
          shared: options.shared ? true : undefined,
        },
        { prefix: API_V1_1_UPLOAD_PREFIX },
      );

      // Upload the media chunk by chunk
      await this.mediaChunkedUpload(fileHandle, chunkLength, mediaData.media_id_string, options.maxConcurrentUploads);

      // Finalize media
      const fullMediaData = await this.post<MediaStatusV1Result>(
        UPLOAD_ENDPOINT,
        {
          command: 'FINALIZE',
          media_id: mediaData.media_id_string,
        },
        { prefix: API_V1_1_UPLOAD_PREFIX },
      );

      if (fullMediaData.processing_info && fullMediaData.processing_info.state !== 'succeeded') {
        // Must wait if video is still computed
        await this.awaitForMediaProcessingCompletion(fullMediaData);
      }

      // Video is ready, return media_id
      if (returnFullMediaData) {
        return fullMediaData;
      } else {
        return fullMediaData.media_id_string;
      }
    } finally {
      // Close file if any
      if (typeof file === 'number') {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        fs.close(file, () => {});
      }
      else if (typeof fileHandle! === 'object' && !(fileHandle instanceof Buffer)) {
        fileHandle.close();
      }
    }
  }

  protected async awaitForMediaProcessingCompletion(fullMediaData: MediaStatusV1Result) {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      fullMediaData = await this.mediaInfo(fullMediaData.media_id_string);
      const { processing_info } = fullMediaData;

      if (!processing_info || processing_info.state === 'succeeded') {
        // Ok, completed!
        return;
      }

      if (processing_info.error?.code) {
        const { name, message } = processing_info.error;
        throw new Error(`Failed to process media: ${name} - ${message}.`);
      }

      if (processing_info.state === 'failed') {
        // No error data
        throw new Error('Failed to process the media.');
      }

      if (processing_info.check_after_secs) {
        // Await for given seconds
        await sleepSecs(processing_info.check_after_secs);
      }
      else {
        // No info; Await for 5 seconds
        await sleepSecs(5);
      }
    }
  }

  protected async getUploadMediaRequirements(file: TUploadableMedia, { mimeType, type, target, longVideo }: Partial<UploadMediaV1Params> = {}) {
    // Get the file handle (if not buffer)
    let fileHandle: TFileHandle;

    try {
      fileHandle = await getFileHandle(file);

      // Get the mimetype
      const realMimeType = getMimeType(file, type, mimeType);

      // Get the media category
      let mediaCategory: string;

      // If explicit longmp4 OR explicit MIME type and not DM target
      if (realMimeType === EUploadMimeType.Mp4 && ((!mimeType && !type && target !== 'dm') || longVideo)) {
        mediaCategory = 'amplify_video';
      } else {
        mediaCategory = getMediaCategoryByMime(realMimeType, target ?? 'tweet');
      }

      return {
        fileHandle,
        mediaCategory,
        fileSize: await getFileSizeFromFileHandle(fileHandle),
        mimeType: realMimeType,
      };
    } catch (e) {
      // Close file if any
      if (typeof file === 'number') {
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        fs.close(file, () => {});
      }
      else if (typeof fileHandle! === 'object' && !(fileHandle instanceof Buffer)) {
        fileHandle.close();
      }

      throw e;
    }
  }

  protected async mediaChunkedUpload(
    fileHandle: TFileHandle,
    chunkLength: number,
    mediaId: string,
    maxConcurrentUploads = 3,
  ) {
    // Send chunk by chunk
    let chunkIndex = 0;

    if (maxConcurrentUploads < 1) {
      throw new RangeError('Bad maxConcurrentUploads parameter.');
    }

    // Creating a buffer for doing file stuff (if we don't have one)
    const buffer = fileHandle instanceof Buffer ? undefined : Buffer.alloc(chunkLength);
    // Sliced/filled buffer returned for each part
    let readBuffer: Buffer;
    // Needed to know when we should stop reading the file
    let nread: number;
    // Needed to use the buffer object (file handles always "remembers" file position)
    let offset = 0;

    [readBuffer, nread] = await readNextPartOf(fileHandle, chunkLength, offset, buffer);
    offset += nread;

    // Handle max concurrent uploads
    const currentUploads = new Set<Promise<any>>();

    // Read buffer until file is completely read
    while (nread) {
      const mediaBufferPart = readBuffer.slice(0, nread);

      // Sent part if part has something inside
      if (mediaBufferPart.length) {
        const request = this.post(
          UPLOAD_ENDPOINT,
          {
            command: 'APPEND',
            media_id: mediaId,
            segment_index: chunkIndex,
            media: mediaBufferPart,
          },
          { prefix: API_V1_1_UPLOAD_PREFIX },
        );

        currentUploads.add(request);
        request.then(() => {
          currentUploads.delete(request);
        });

        chunkIndex++;
      }

      if (currentUploads.size >= maxConcurrentUploads) {
        // Await for first promise to be finished
        await Promise.race(currentUploads);
      }

      [readBuffer, nread] = await readNextPartOf(fileHandle, chunkLength, offset, buffer);
      offset += nread;
    }

    await Promise.all([...currentUploads]);
  }
}
