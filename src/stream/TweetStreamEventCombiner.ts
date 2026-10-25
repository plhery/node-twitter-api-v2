import { EventEmitter } from 'events';
import { ETwitterStreamEvent } from '../types';
import type TweetStream from './TweetStream';

/** Why an iteration ends: the stream was closed, or `error` has to be thrown */
type TweetStreamCombinerEnding = { error?: any };

export class TweetStreamEventCombiner<T> extends EventEmitter {
  private stack: T[] = [];
  private ending?: TweetStreamCombinerEnding;
  private onceNewEvent: (resolver: () => void) => void;

  constructor(private stream: TweetStream<T>) {
    super();

    this.onStreamData = this.onStreamData.bind(this);
    this.onStreamError = this.onStreamError.bind(this);
    this.onConnectionLost = this.onConnectionLost.bind(this);
    this.onReconnectLimitExceeded = this.onReconnectLimitExceeded.bind(this);
    this.onStreamClosed = this.onStreamClosed.bind(this);
    this.onceNewEvent = this.once.bind(this, 'event');

    // Init events from stream
    stream.on(ETwitterStreamEvent.Data, this.onStreamData);
    stream.on(ETwitterStreamEvent.TweetParseError, this.onStreamError);
    // With autoReconnect, a lost connection is retried: only the end of the retries ends the iteration
    stream.on(ETwitterStreamEvent.ConnectionError, this.onConnectionLost);
    stream.on(ETwitterStreamEvent.ConnectionLost, this.onConnectionLost);
    stream.on(ETwitterStreamEvent.ReconnectLimitExceeded, this.onReconnectLimitExceeded);
    stream.on(ETwitterStreamEvent.ConnectionClosed, this.onStreamClosed);
  }

  /** Returns a new `Promise` that will `resolve` on next event (data, error or end of the stream). */
  nextEvent() {
    return new Promise<void>(this.onceNewEvent);
  }

  /** Returns `true` if there's something in the stack. */
  hasStack() {
    return this.stack.length > 0;
  }

  /** Returns stacked data events, and clean the stack. */
  popStack() {
    const stack = this.stack;
    this.stack = [];
    return stack;
  }

  /** Returns why the iteration ends, once it has to. */
  getEnding() {
    return this.ending;
  }

  /** Ends the iteration once the stack is empty. The first ending wins. */
  end(ending: TweetStreamCombinerEnding = {}) {
    if (!this.ending) {
      this.ending = ending;
    }
    this.emit('event');
  }

  /** Cleanup all the listeners attached on stream. */
  destroy() {
    this.removeAllListeners();
    this.stream.off(ETwitterStreamEvent.Data, this.onStreamData);
    this.stream.off(ETwitterStreamEvent.TweetParseError, this.onStreamError);
    this.stream.off(ETwitterStreamEvent.ConnectionError, this.onConnectionLost);
    this.stream.off(ETwitterStreamEvent.ConnectionLost, this.onConnectionLost);
    this.stream.off(ETwitterStreamEvent.ReconnectLimitExceeded, this.onReconnectLimitExceeded);
    this.stream.off(ETwitterStreamEvent.ConnectionClosed, this.onStreamClosed);
  }

  private onStreamData(payload: T) {
    // After a parse error, the stream goes on but the iteration doesn't
    if (this.ending) {
      return;
    }
    this.stack.push(payload);
    this.emit('event');
  }

  private onStreamError(error: any) {
    this.end({ error });
  }

  private onConnectionLost(error?: any) {
    if (!this.stream.autoReconnect) {
      this.end({ error: error ?? new Error(`Connection lost: nothing received for ${this.stream.keepAliveTimeoutMs}ms.`) });
    }
  }

  private onReconnectLimitExceeded() {
    this.end({ error: new Error('Connection closed: reconnect limit exceeded.') });
  }

  private onStreamClosed() {
    this.end();
  }
}

export default TweetStreamEventCombiner;
