import 'mocha';
import { expect } from 'chai';
import { EDirectMessageEventTypeV1, ReceivedWelcomeDMCreateEventV1, TwitterApi } from '../../src';
import { getUserClient } from '../../src/test/utils';
import { sleepSecs } from '../../src/v1/media-helpers.v1';

let client: TwitterApi;

const TARGET_USER_ID = process.env.TARGET_DM_USER_ID as string;
const TEST_UUID = Math.random();
let isDmTestEnabled = false;

if (process.env.TARGET_DM_USER_ID) {
  isDmTestEnabled = true;
}

describe.skip('DM endpoints for v1.1 API', () => {
  before(() => {
    client = getUserClient();
  });

  it('.sendDm/.getDmEvent/.deleteDm - Send a new direct message and fetch it.', async () => {
    if (!isDmTestEnabled) {
      return;
    }

    const v1Client = client.v1;
    const selfAccount = await client.currentUser();
    const msgText = `Hello, this is a new direct message from an automated script - UUID: ${TEST_UUID}`;

    const sentMessage = await v1Client.sendDm({
      recipient_id: TARGET_USER_ID,
      text: msgText,
    });

    expect(sentMessage.event.type).to.equal(EDirectMessageEventTypeV1.Create);

    // Get event to repeat action
    const messageEvent = await v1Client.getDmEvent(sentMessage.event.id);

    for (const evt of [sentMessage.event, messageEvent.event]) {
      const msgCreate = evt[EDirectMessageEventTypeV1.Create];
      expect(msgCreate).to.be.ok;
      expect(msgCreate).to.haveOwnProperty('message_data');
      expect(msgCreate.message_data.text).to.equal(msgText);
      expect(msgCreate.message_data.quick_reply).to.be.undefined;
      expect(msgCreate.message_data.quick_reply_response).to.be.undefined;
      expect(msgCreate.message_data.attachment).to.be.undefined;
      expect(msgCreate.message_data.ctas).to.be.undefined;
      expect(msgCreate.target.recipient_id).to.equal(TARGET_USER_ID);
      expect(msgCreate.sender_id).to.equal(selfAccount.id_str);
    }
  }).timeout(60 * 1000);

  it('.listDmEvents/.deleteDm - List DM events and delete every available DM sent to TARGET USER ID.', async () => {
    if (!isDmTestEnabled) {
      return;
    }

    const v1Client = client.v1;
    const selfAccount = await client.currentUser();

    const eventPaginator = await v1Client.listDmEvents();

    for await (const evt of eventPaginator) {
      expect(evt.type).to.equal(EDirectMessageEventTypeV1.Create);

      const msgCreate = evt[EDirectMessageEventTypeV1.Create];
      expect(msgCreate).to.be.ok;

      if (msgCreate.target.recipient_id !== TARGET_USER_ID) {
        continue;
      }

      expect(msgCreate).to.haveOwnProperty('message_data');
      expect(msgCreate.message_data.quick_reply).to.be.undefined;
      expect(msgCreate.message_data.quick_reply_response).to.be.undefined;
      expect(msgCreate.message_data.attachment).to.be.undefined;
      expect(msgCreate.message_data.ctas).to.be.undefined;
      expect(msgCreate.target.recipient_id).to.equal(TARGET_USER_ID);
      expect(msgCreate.sender_id).to.equal(selfAccount.id_str);

      await v1Client.deleteDm(evt.id);
    }
  }).timeout(60 * 1000);

  it('.newWelcomeDm/.getWelcomeDm/.updateWelcomeDm/.listWelcomeDms/.deleteWelcomeDm - Every method related to welcome messages.', async () => {
    if (!isDmTestEnabled) {
      return;
    }

    const v1Client = client.v1;

    // NEW WELCOME MESSAGE
    const welcomeMsgUuid = 'WLC-MSG-NAME-' + Math.random().toString().slice(2, 10);
    const newWelcomeMessage = await v1Client.newWelcomeDm(welcomeMsgUuid, {
      text: 'New message text!',
    });

    const msgId = newWelcomeMessage[EDirectMessageEventTypeV1.WelcomeCreate].id;
    expect(newWelcomeMessage).to.haveOwnProperty(EDirectMessageEventTypeV1.WelcomeCreate);
    expect(newWelcomeMessage[EDirectMessageEventTypeV1.WelcomeCreate].message_data.text).to.equal('New message text!');
    expect(newWelcomeMessage[EDirectMessageEventTypeV1.WelcomeCreate].name).to.equal(welcomeMsgUuid);

    // GET WELCOME MESSAGE
    const existingWelcomeMessage = await v1Client.getWelcomeDm(msgId);
    expect(existingWelcomeMessage).to.haveOwnProperty(EDirectMessageEventTypeV1.WelcomeCreate);
    expect(existingWelcomeMessage[EDirectMessageEventTypeV1.WelcomeCreate].message_data.text).to.equal('New message text!');
    expect(existingWelcomeMessage[EDirectMessageEventTypeV1.WelcomeCreate].name).to.equal(welcomeMsgUuid);

    // UPDATE WELCOME MESSAGE
    const updatedMessage = await v1Client.updateWelcomeDm(msgId, { text: 'Updated message text!' });
    expect(updatedMessage[EDirectMessageEventTypeV1.WelcomeCreate].message_data.text).to.equal('Updated message text!');

    // LIST WELCOME MESSAGE (and ensure our sent DM is inside the list.)
    const welcomeMsgPaginator = await v1Client.listWelcomeDms();
    const allWelcomeDirectMessages = [] as ReceivedWelcomeDMCreateEventV1[];

    for await (const dm of welcomeMsgPaginator) {
      allWelcomeDirectMessages.push(dm);
    }

    expect(allWelcomeDirectMessages.some(msg => msg.id === msgId)).to.be.true;

    // Delete the welcome DM
    await v1Client.deleteWelcomeDm(msgId);
  }).timeout(120 * 1000);

  it('.newWelcomeDmRule/.getWelcomeDmRule/.listWelcomeDmRules/.deleteWelcomeDmRule/.setWelcomeDm - Every method related to welcome messages rules.', async () => {
    if (!isDmTestEnabled) {
      return;
    }

    const v1Client = client.v1;
    const currentRules = await v1Client.listWelcomeDmRules();
    // Cleanup every available dm rule
    for await (const rule of currentRules.welcome_message_rules ?? []) {
      await v1Client.deleteWelcomeDmRule(rule.id);
    }

    // NEW WELCOME MESSAGE
    const welcomeMsgUuid = 'WLC-MSG-NAME-' + Math.random().toString().slice(2, 10);
    const newWelcomeMessage = await v1Client.newWelcomeDm(welcomeMsgUuid, {
      text: 'New message text, for rule!',
    });

    const msgId = newWelcomeMessage[EDirectMessageEventTypeV1.WelcomeCreate].id;

    // Create the rule
    const rule = await v1Client.newWelcomeDmRule(msgId);
    expect(rule.welcome_message_rule.welcome_message_id).to.equal(msgId);

    await sleepSecs(4);

    // Create another welcome message
    const welcomeMsgUuid2 = 'WLC-MSG-NAME-' + Math.random().toString().slice(2, 10);
    const anotherWelcomeMessage = await v1Client.newWelcomeDm(welcomeMsgUuid2, {
      text: 'New message text, for rule (2)!',
    });

    const newMsgId = anotherWelcomeMessage[EDirectMessageEventTypeV1.WelcomeCreate].id;

    // Set another rule (will list and delete older rules)
    const newRule = await v1Client.setWelcomeDm(newMsgId);

    // Other rule should be deleted.
    // Delete new rule
    await v1Client.deleteWelcomeDmRule(newRule.welcome_message_rule.id);
    await v1Client.deleteWelcomeDm(newRule.welcome_message_rule.welcome_message_id);
  }).timeout(120 * 1000);
});
