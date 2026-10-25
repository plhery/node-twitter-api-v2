export type MediaV2MediaCategory = 'tweet_image' | 'tweet_video' | 'tweet_gif' | 'dm_image' | 'dm_video' | 'dm_gif' | 'subtitles' | 'amplify_video';

export type MediaV2MimeType = 'image/jpeg' | 'image/pjpeg' | 'image/png' | 'image/gif' | 'image/webp' | 'image/bmp' | 'image/tiff'
  | 'video/mp4' | 'video/quicktime' | 'video/webm' | 'video/mp2t'
  | 'text/srt' | 'text/vtt'
  | 'model/gltf-binary' | 'model/vnd.usdz+zip';

export interface MediaV2UploadInitParams {
  additional_owners?: string[];
  media_category?: MediaV2MediaCategory;
  media_type: string;
  total_bytes: number;
  shared?: boolean;
}

export interface MediaV2UploadAppendParams {
  segment_index: number;
  media: Buffer;
}

export interface MediaV2ProcessingInfo {
  state: 'pending' | 'in_progress' | 'failed' | 'succeeded';
  check_after_secs?: number;
  progress_percent?: number;
  error?: {
    code: number;
    message: string;
  };
}

export interface MediaV2UploadResponse {
  data: {
    id: string;
    media_key: string;
    size?: number;
    expires_after_secs: number;
    processing_info?: MediaV2ProcessingInfo;
    image?: {
      w?: number;
      h?: number;
      image_type?: string;
    };
    video?: {
      video_type?: string;
    };
  };
}

export interface MediaV2MetadataCreateParams {
  alt_text?: { text: string };
  allow_download_status?: { allow_download?: boolean };
  audience_policy?: Record<string, any>;
  content_expiration?: { timestamp_sec: number };
  domain_restrictions?: { whitelist: string[] };
  found_media_origin?: { id: string; provider: string };
  geo_restrictions?: Record<string, any>;
  management_info?: { managed: boolean };
  preview_image?: { media_key: Record<string, any> };
  sensitive_media_warning?: Record<string, any>;
  shared_info?: { shared: boolean };
  sticker_info?: { stickers: Record<string, any>[] };
  upload_source?: { upload_source: string };
}

export interface MediaV2MetadataCreateResult {
  data: {
    id: string;
    associated_metadata: {
      alt_text: { text: string };
    };
  };
}
