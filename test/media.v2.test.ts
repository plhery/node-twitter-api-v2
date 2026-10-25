import 'mocha';
import { expect } from 'chai';
import { randomBytes } from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { TwitterApi } from '../src';

type FakeCall = { endpoint: string, body: Record<string, any> };

/** A v2 client whose `post` records every call (no network, no credentials). */
function makeFakeClient() {
  const client = new TwitterApi('fake-bearer-token').v2;
  const calls: FakeCall[] = [];

  (client as any).post = async (endpoint: string, body: Record<string, any> = {}) => {
    // Copy the chunk: like the real request, it must be read before the promise resolves
    calls.push({ endpoint, body: { ...body, media: body.media && Buffer.from(body.media) } });
    return { data: { id: '42', media_key: '3_42', expires_after_secs: 86400 } };
  };

  return { client, calls };
}

const appendedChunks = (calls: FakeCall[]) => calls.filter(call => call.endpoint === 'media/upload/42/append');

describe('v2 media upload (offline, no network or credentials needed)', () => {
  const content = randomBytes(2500);
  let directory: string;
  let filePath: string;

  before(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'twitter-api-v2-'));
    filePath = path.join(directory, 'image.png');
    fs.writeFileSync(filePath, content);
  });

  after(() => {
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it('Should read a file path chunk by chunk', async () => {
    const { client, calls } = makeFakeClient();

    const mediaId = await client.uploadMedia(filePath, { media_type: 'image/png' }, 1024);

    expect(mediaId).to.equal('42');
    expect(calls[0]).to.deep.equal({
      endpoint: 'media/upload/initialize',
      body: { additional_owners: undefined, media_type: 'image/png', total_bytes: 2500, media_category: 'tweet_image', media: undefined },
    });

    const chunks = appendedChunks(calls);
    expect(chunks.map(call => call.body.segment_index)).to.deep.equal([0, 1, 2]);
    expect(chunks.map(call => call.body.media.length)).to.deep.equal([1024, 1024, 452]);
    expect(Buffer.concat(chunks.map(call => call.body.media)).equals(content)).to.equal(true);

    expect(calls[calls.length - 1].endpoint).to.equal('media/upload/42/finalize');
  });

  it('Should upload a buffer in chunks', async () => {
    const { client, calls } = makeFakeClient();

    await client.uploadMedia(content, { media_type: 'video/mp4' }, 1024);

    expect(calls[0].body).to.include({ total_bytes: 2500, media_category: 'tweet_video' });
    const chunks = appendedChunks(calls);
    expect(chunks.map(call => call.body.media.length)).to.deep.equal([1024, 1024, 452]);
    expect(Buffer.concat(chunks.map(call => call.body.media)).equals(content)).to.equal(true);
  });

  it('Should read a file handle and leave it open', async () => {
    const { client, calls } = makeFakeClient();
    const fileHandle = await fs.promises.open(filePath, 'r');

    try {
      await client.uploadMedia(fileHandle, { media_type: 'image/gif' }, 1024);

      expect(calls[0].body).to.include({ total_bytes: 2500, media_category: 'tweet_gif' });
      expect(Buffer.concat(appendedChunks(calls).map(call => call.body.media)).equals(content)).to.equal(true);
      // A closed file handle would throw EBADF
      expect((await fileHandle.stat()).size).to.equal(2500);
    } finally {
      await fileHandle.close();
    }
  });

  it('Should fail before calling X when the file does not exist', async () => {
    const { client, calls } = makeFakeClient();

    const error = await client.uploadMedia(path.join(directory, 'missing.png'), { media_type: 'image/png' }).catch(e => e);

    expect(error).to.be.instanceOf(Error).with.property('code', 'ENOENT');
    expect(calls).to.have.length(0);
  });
});
