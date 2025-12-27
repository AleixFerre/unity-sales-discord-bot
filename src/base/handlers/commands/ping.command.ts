import { AutocompleteInteraction, ChatInputCommandInteraction, PermissionsBitField } from 'discord.js';
import { Category } from './interfaces/category.interface';
import { Command } from './interfaces/command.interface';

class PingCommand implements Command {
  readonly name: string = 'ping';
  readonly description: string = 'This is the test command my g!';
  readonly category = Category.Utilities;
  readonly options = [];
  readonly default_member_permissions = PermissionsBitField.Flags.UseApplicationCommands;
  readonly dm_permission = false;

  execute(interaction: ChatInputCommandInteraction): void {
    interaction.reply({
      content: 'Pong!',
      ephemeral: true,
    });
  }
  autoComplete?: (interaction: AutocompleteInteraction) => void;
}

export default new PingCommand();
