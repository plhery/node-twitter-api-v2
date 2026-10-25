import { API_V1_1_PREFIX } from '../globals';
import { DmEventsV1Paginator, WelcomeDmV1Paginator } from '../paginators/dm.paginator.v1';
import {
  CreateDMEventV1Args,
  EDirectMessageEventTypeV1,
  SendDMV1Params,
  DirectMessageCreateV1Result,
  ReceivedDMEventV1,
  ReceivedDMEventsV1,
  GetDmListV1Args,
  MessageCreateDataV1,
  CreateWelcomeDMEventV1Args,
  WelcomeDirectMessageCreateV1Result,
  WelcomeDirectMessageListV1Result,
  WelcomeDmRuleV1Result,
  WelcomeDmRuleListV1Result,
  DirectMessageCreateV1,
} from '../types';
import TwitterApiv1ReadWrite from './client.v1.write';

/**
 * Twitter v1.1 API client with read/write/DMs rights.
 */
export class TwitterApiv1 extends TwitterApiv1ReadWrite {
  protected _prefix = API_V1_1_PREFIX;

  /**
   * Get a client with read/write rights.
   */
  public get readWrite() {
    return this as TwitterApiv1ReadWrite;
  }

  /* Direct messages */
  // Part: Sending and receiving events

  /**
   * Publishes a new message_create event resulting in a Direct Message sent to a specified user from the authenticating user.
   * https://developer.x.com/en/docs/twitter-api/v1/direct-messages/sending-and-receiving/api-reference/new-event
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.sendDmToParticipant()` instead.
   */
  public sendDm({ recipient_id, custom_profile_id, ...params }: SendDMV1Params) {
    const args: CreateDMEventV1Args = {
      event: {
        type: EDirectMessageEventTypeV1.Create,
        [EDirectMessageEventTypeV1.Create]: {
          target: { recipient_id },
          message_data: params,
        },
      },
    };

    if (custom_profile_id) {
      args.event[EDirectMessageEventTypeV1.Create]!.custom_profile_id = custom_profile_id;
    }

    return this.post<DirectMessageCreateV1Result>('direct_messages/events/new.json', args, {
      forceBodyMode: 'json',
    });
  }

  /**
   * Returns a single Direct Message event by the given id.
   *
   * https://developer.x.com/en/docs/twitter-api/v1/direct-messages/sending-and-receiving/api-reference/get-event
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.dmEvent()` instead.
   */
  public getDmEvent(id: string) {
    return this.get<ReceivedDMEventV1>('direct_messages/events/show.json', { id });
  }

  /**
   * Deletes the direct message specified in the required ID parameter.
   * The authenticating user must be the recipient of the specified direct message.
   * https://developer.x.com/en/docs/twitter-api/v1/direct-messages/sending-and-receiving/api-reference/delete-message-event
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.deleteDmEvent()` instead.
   */
  public deleteDm(id: string) {
    return this.delete<void>('direct_messages/events/destroy.json', { id });
  }

  /**
   * Returns all Direct Message events (both sent and received) within the last 30 days.
   * Sorted in reverse-chronological order.
   *
   * https://developer.x.com/en/docs/twitter-api/v1/direct-messages/sending-and-receiving/api-reference/list-events
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Use `v2.listDmEvents()` instead.
   */
  public async listDmEvents(args: Partial<GetDmListV1Args> = {}) {
    const queryParams = { ...args };
    const initialRq = await this.get<ReceivedDMEventsV1>('direct_messages/events/list.json', queryParams, { fullResponse: true });

    return new DmEventsV1Paginator({
      realData: initialRq.data,
      rateLimit: initialRq.rateLimit!,
      instance: this,
      queryParams,
    });
  }

  // Part: Welcome messages (events)

  /**
   * Creates a new Welcome Message that will be stored and sent in the future from the authenticating user in defined circumstances.
   * https://developer.x.com/en/docs/twitter-api/v1/direct-messages/welcome-messages/api-reference/new-welcome-message
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Welcome messages have no v2 equivalent.
   */
  public newWelcomeDm(name: string, data: MessageCreateDataV1) {
    const args: CreateWelcomeDMEventV1Args = {
      [EDirectMessageEventTypeV1.WelcomeCreate]: {
        name,
        message_data: data,
      },
    };

    return this.post<WelcomeDirectMessageCreateV1Result>('direct_messages/welcome_messages/new.json', args, {
      forceBodyMode: 'json',
    });
  }

  /**
   * Returns a Welcome Message by the given id.
   * https://developer.x.com/en/docs/twitter-api/v1/direct-messages/welcome-messages/api-reference/get-welcome-message
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Welcome messages have no v2 equivalent.
   */
  public getWelcomeDm(id: string) {
    return this.get<WelcomeDirectMessageCreateV1Result>('direct_messages/welcome_messages/show.json', { id });
  }

  /**
   * Deletes a Welcome Message by the given id.
   * https://developer.x.com/en/docs/twitter-api/v1/direct-messages/welcome-messages/api-reference/delete-welcome-message
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Welcome messages have no v2 equivalent.
   */
  public deleteWelcomeDm(id: string) {
    return this.delete<void>('direct_messages/welcome_messages/destroy.json', { id });
  }

  /**
   * Updates a Welcome Message by the given ID.
   * Updates to the welcome_message object are atomic.
   * https://developer.x.com/en/docs/twitter-api/v1/direct-messages/welcome-messages/api-reference/update-welcome-message
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Welcome messages have no v2 equivalent.
   */
  public updateWelcomeDm(id: string, data: MessageCreateDataV1) {
    const args = { message_data: data };
    return this.put<WelcomeDirectMessageCreateV1Result>('direct_messages/welcome_messages/update.json', args, {
      forceBodyMode: 'json',
      query: { id },
    });
  }

  /**
   * Returns all Direct Message events (both sent and received) within the last 30 days.
   * Sorted in reverse-chronological order.
   *
   * https://developer.x.com/en/docs/twitter-api/v1/direct-messages/sending-and-receiving/api-reference/list-events
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Welcome messages have no v2 equivalent.
   */
  public async listWelcomeDms(args: Partial<GetDmListV1Args> = {}) {
    const queryParams = { ...args };
    const initialRq = await this.get<WelcomeDirectMessageListV1Result>('direct_messages/welcome_messages/list.json', queryParams, { fullResponse: true });

    return new WelcomeDmV1Paginator({
      realData: initialRq.data,
      rateLimit: initialRq.rateLimit!,
      instance: this,
      queryParams,
    });
  }

  // Part: Welcome message (rules)

  /**
   * Creates a new Welcome Message Rule that determines which Welcome Message will be shown in a given conversation.
   * https://developer.x.com/en/docs/twitter-api/v1/direct-messages/welcome-messages/api-reference/new-welcome-message-rule
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Welcome messages have no v2 equivalent.
   */
  public newWelcomeDmRule(welcomeMessageId: string) {
    return this.post<WelcomeDmRuleV1Result>('direct_messages/welcome_messages/rules/new.json', {
      welcome_message_rule: { welcome_message_id: welcomeMessageId },
    }, {
      forceBodyMode: 'json',
    });
  }

  /**
   * Returns a Welcome Message Rule by the given id.
   * https://developer.x.com/en/docs/twitter-api/v1/direct-messages/welcome-messages/api-reference/get-welcome-message-rule
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Welcome messages have no v2 equivalent.
   */
  public getWelcomeDmRule(id: string) {
    return this.get<WelcomeDmRuleV1Result>('direct_messages/welcome_messages/rules/show.json', { id });
  }

  /**
   * Deletes a Welcome Message Rule by the given id.
   * https://developer.x.com/en/docs/twitter-api/v1/direct-messages/welcome-messages/api-reference/delete-welcome-message-rule
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Welcome messages have no v2 equivalent.
   */
  public deleteWelcomeDmRule(id: string) {
    return this.delete<void>('direct_messages/welcome_messages/rules/destroy.json', { id });
  }

  /**
   * Retrieves all welcome DM rules for this account.
   * https://developer.x.com/en/docs/twitter-api/v1/direct-messages/welcome-messages/api-reference/list-welcome-message-rules
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Welcome messages have no v2 equivalent.
   */
  public async listWelcomeDmRules(args: Partial<GetDmListV1Args> = {}) {
    const queryParams = { ...args };
    return this.get<WelcomeDmRuleListV1Result>('direct_messages/welcome_messages/rules/list.json', queryParams);
  }

  /**
   * Set the current showed welcome message for logged account ; wrapper for Welcome DM rules.
   * Test if a rule already exists, delete if any, then create a rule for current message ID.
   *
   * If you don't have already a welcome message, create it with `.newWelcomeMessage`.
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. Welcome messages have no v2 equivalent.
   */
  public async setWelcomeDm(welcomeMessageId: string, deleteAssociatedWelcomeDmWhenDeletingRule = true) {
    const existingRules = await this.listWelcomeDmRules();

    if (existingRules.welcome_message_rules?.length) {
      for (const rule of existingRules.welcome_message_rules) {
        await this.deleteWelcomeDmRule(rule.id);

        if (deleteAssociatedWelcomeDmWhenDeletingRule) {
          await this.deleteWelcomeDm(rule.welcome_message_id);
        }
      }
    }

    return this.newWelcomeDmRule(welcomeMessageId);
  }

  // Part: Read indicator

  /**
   * Marks a message as read in the recipient’s Direct Message conversation view with the sender.
   * https://developer.x.com/en/docs/twitter-api/v1/direct-messages/typing-indicator-and-read-receipts/api-reference/new-read-receipt
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
   */
  public markDmAsRead(lastEventId: string, recipientId: string) {
    return this.post<void>('direct_messages/mark_read.json', {
      last_read_event_id: lastEventId,
      recipient_id: recipientId,
    }, { forceBodyMode: 'url' });
  }

  /**
   * Displays a visual typing indicator in the recipient’s Direct Message conversation view with the sender.
   * https://developer.x.com/en/docs/twitter-api/v1/direct-messages/typing-indicator-and-read-receipts/api-reference/new-typing-indicator
   *
   * @deprecated v1.1 endpoint, no longer available on most X API plans. No v2 equivalent in this library.
   */
  public indicateDmTyping(recipientId: string) {
    return this.post<void>('direct_messages/indicate_typing.json', {
      recipient_id: recipientId,
    }, { forceBodyMode: 'url' });
  }

  // Part: Images

  /**
   * Get a single image attached to a direct message. TwitterApi client must be logged with OAuth 1.0a.
   * https://developer.x.com/en/docs/twitter-api/v1/direct-messages/message-attachments/guides/retrieving-media
   */
  public async downloadDmImage(urlOrDm: string | DirectMessageCreateV1) {
    if (typeof urlOrDm !== 'string') {
      const attachment = urlOrDm[EDirectMessageEventTypeV1.Create].message_data.attachment;

      if (!attachment) {
        throw new Error('The given direct message doesn\'t contain any attachment');
      }

      urlOrDm = attachment.media.media_url_https;
    }

    const data = await this.get<Buffer>(urlOrDm, undefined, { forceParseMode: 'buffer', prefix: '' });
    if (!data.length) {
      throw new Error('Image not found. Make sure you are logged with credentials able to access direct messages, and check the URL.');
    }

    return data;
  }
}

export default TwitterApiv1;
