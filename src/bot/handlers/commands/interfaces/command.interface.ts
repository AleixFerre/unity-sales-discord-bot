import { ChatInputCommandInteraction } from 'discord.js';

export interface Command {
  readonly name: string;
  readonly description: string;
  readonly options: object;
  readonly default_member_permissions: bigint;
  readonly dm_permission: boolean;

  readonly execute: (interaction: ChatInputCommandInteraction) => Promise<void> | void;
}
