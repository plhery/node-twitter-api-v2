import 'mocha';
import { expect } from 'chai';
import { TwitterApi } from '../../src';
import { getAppClient } from '../../src/test/utils';

let client: TwitterApi;

describe.skip('Spaces endpoints for v2 API', () => {
  before(async () => {
    client = await getAppClient();
  });

  it('.space/.spaces/.searchSpaces/.spacesByCreators - Lookup for spaces', async () => {
    const spacesBySearch = await client.v2.searchSpaces({
      query: 'twitter',
      state: 'live',
      'space.fields': ['created_at', 'host_ids', 'title', 'lang', 'invited_user_ids', 'creator_id'],
    });

    expect(spacesBySearch.meta).to.be.a('object');
    expect(spacesBySearch.meta.result_count).to.be.a('number');

    if (spacesBySearch.data?.length) {
      const space = spacesBySearch.data[0];
      expect(space.created_at).to.be.a('string');
      expect(space.creator_id).to.be.a('string');
      expect(space.host_ids).to.be.a('array');

      const singleSpace = await client.v2.space(space.id);
      const singleSpaceThroughLookup = await client.v2.spaces([space.id]);
      const spacesOfCreator = await client.v2.spacesByCreators([space.creator_id!]);

      expect(singleSpace.data.id).to.equal(space.id);

      if (singleSpaceThroughLookup.data) {
        expect(singleSpaceThroughLookup.data[0].id).to.equal(space.id);
      }

      if (spacesOfCreator.data) {
        expect(spacesOfCreator.data.some(s => s.id === space.id)).to.equal(true);
      }
    }
  }).timeout(60 * 1000);
});
