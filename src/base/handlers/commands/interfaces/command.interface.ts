import { AutocompleteInteraction, ChatInputCommandInteraction } from 'discord.js';
import { Category } from './category.interface';

export interface Command {
  readonly name: string;
  readonly description: string;
  readonly category: Category;
  readonly options: object;
  readonly default_member_permissions: bigint;
  readonly dm_permission: boolean;

  readonly execute: (interaction: ChatInputCommandInteraction) => void;
  readonly autoComplete?: (interaction: AutocompleteInteraction) => void;
}
