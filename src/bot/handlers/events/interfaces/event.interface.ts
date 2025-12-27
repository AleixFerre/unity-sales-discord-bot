import { ClientEvents } from 'discord.js';

export interface IEvent<K extends keyof ClientEvents = keyof ClientEvents> {
  readonly name: K;
  readonly once: boolean;
  readonly execute: (...args: ClientEvents[K]) => void;
}
