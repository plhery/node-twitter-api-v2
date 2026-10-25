import 'mocha';
import { expect } from 'chai';
import { TwitterApi } from '../../src';
import { getUserClient } from '../../src/test/utils';

let userClient: TwitterApi;

describe.skip('Users endpoints for v1.1 API', () => {
  before(async () => {
    userClient = getUserClient();
  });

  it('.user/.users - Get users by ID', async () => {
    const jack = await userClient.v1.user({ user_id: '12' });

    expect(jack).to.be.a('object');
    expect(jack.id_str).to.equal('12');
    expect(jack.screen_name.toLowerCase()).to.equal('jack');

    const users = await userClient.v1.users({ user_id: ['12', '14561327'] });
    expect(users).to.have.length(2);
  }).timeout(60 * 1000);

  it('.searchUsers - Search for users', async () => {
    const jackSearch = await userClient.v1.searchUsers('jack');

    expect(jackSearch.users).to.be.a('array');
    expect(jackSearch.users).to.have.length.greaterThan(0);
  }).timeout(60 * 1000);

  it('.userProfileBannerSizes - Get banner size of a user', async () => {
    const sizes = await userClient.v1.userProfileBannerSizes({ user_id: '14561327' });

    expect(sizes.sizes).to.be.a('object');
    expect(sizes.sizes.web_retina.h).to.be.a('number');
  }).timeout(60 * 1000);

  it('.friendship/.friendships - Get friendship objects', async () => {
    const friendship = await userClient.v1.friendship({ source_id: '12', target_id: '14561327' });
    expect(friendship.relationship).to.be.an('object');
    expect(friendship.relationship.source.id_str).to.eq('12');
    expect(friendship.relationship.target.id_str).to.eq('14561327');

    const friendships = await userClient.v1.friendships({ user_id: ['12', '786491'] });
    expect(friendships).to.be.an('array');
    expect(friendships).to.have.lengthOf(2);
    expect(friendships[0].id_str).to.be.oneOf(['12', '786491']);
  }).timeout(60 * 1000);
});


// describe('', () => {
//   it('', async () => {

//   }).timeout(60 * 1000);
// });
