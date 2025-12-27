import { AutocompleteInteraction, ChatInputCommandInteraction, PermissionsBitField } from 'discord.js';
import { Category } from './interfaces/category.interface';
import { Command } from './interfaces/command.interface';

class RegisterCommand implements Command {
  readonly name: string = 'register';
  readonly description: string = 'This command adds or removes this channel from the notification list.';
  readonly category = Category.Utilities;
  readonly options = [];
  readonly default_member_permissions = PermissionsBitField.Flags.Administrator;
  readonly dm_permission = false;

  execute(interaction: ChatInputCommandInteraction): void {
    interaction.reply({ content: 'Channel registered!', flags: 'Ephemeral' });
  }
  autoComplete?: (interaction: AutocompleteInteraction) => void;
}

export default new RegisterCommand();
