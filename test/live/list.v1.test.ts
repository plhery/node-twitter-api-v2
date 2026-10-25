import 'mocha';
import { expect } from 'chai';
import { TwitterApi } from '../../src';
import { getUserClient, sleepTest } from '../../src/test/utils';

let client: TwitterApi;

describe.skip('List endpoints for v1.1 API', () => {
  before(() => {
    client = getUserClient();
  });

  it('.createList/.updateList/.listOwnerships/.removeList/.list - Create, update, get and delete a list', async () => {
    const newList = await client.v1.createList({ name: 'cats', mode: 'private' });

    await sleepTest(1000);
    let createdList = await client.v1.list({ list_id: newList.id_str });

    expect(createdList.id_str).to.equal(newList.id_str);

    await client.v1.updateList({ list_id: newList.id_str, name: 'cats updated' });
    await sleepTest(1000);
    createdList = await client.v1.list({ list_id: newList.id_str });
    expect(createdList.name).to.equal('cats updated');

    const ownerships = await client.v1.listOwnerships();
    expect(ownerships.lists.some(l => l.id_str === newList.id_str)).to.equal(true);

    await sleepTest(1000);
    // This {does} works, but sometimes a 404 is returned...
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    await client.v1.removeList({ list_id: newList.id_str }).catch(() => {});
  }).timeout(60 * 1000);

  it('.addListMembers/.removeListMembers/.listMembers/.listStatuses - Manage list members and list statuses', async () => {
    const newList = await client.v1.createList({ name: 'test list', mode: 'private' });

    await sleepTest(1000);
    await client.v1.addListMembers({ list_id: newList.id_str, user_id: '12' });
    await sleepTest(1000);

    const statuses = await client.v1.listStatuses({ list_id: newList.id_str });
    expect(statuses.tweets).to.have.length.greaterThan(0);

    const members = await client.v1.listMembers({ list_id: newList.id_str });
    expect(members.users.some(u => u.id_str === '12')).to.equal(true);

    await client.v1.removeListMembers({ list_id: newList.id_str, user_id: '12' });

    await sleepTest(1000);
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    await client.v1.removeList({ list_id: newList.id_str }).catch(() => {});
  }).timeout(60 * 1000);
});
