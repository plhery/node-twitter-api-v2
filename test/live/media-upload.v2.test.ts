import 'mocha';
import { expect } from 'chai';
import { EUploadMimeType, TwitterApi } from '../../src';
import { getUserClient } from '../../src/test/utils';
import * as fs from 'fs';
import * as path from 'path';

let client: TwitterApi;

const gifImg = path.resolve(__dirname, 'assets', 'pec.gif');
const maxTimeout = 1000 * 60;

describe.skip('Media upload for v2 API', () => {
  before(() => {
    client = getUserClient();
  });

  it('Upload a GIF image from buffer', async () => {
    // Upload media (from buffer)
    const mediaId = await client.v2.uploadMedia(await fs.promises.readFile(gifImg), { media_type: EUploadMimeType.Gif });
    expect(mediaId).to.be.an('string');
    expect(mediaId).to.have.length.greaterThan(0);
  }).timeout(maxTimeout);
});