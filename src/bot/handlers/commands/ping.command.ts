import { ChatInputCommandInteraction, PermissionsBitField } from 'discord.js';
import { Command } from './interfaces/command.interface';

class PingCommand implements Command {
  readonly name: string = 'ping';
  readonly description: string = 'This returns pong!';
  readonly options = [];
  readonly default_member_permissions = PermissionsBitField.Flags.UseApplicationCommands;
  readonly dm_permission = false;

  execute(interaction: ChatInputCommandInteraction): void {
    interaction.reply({ content: 'Pong!', flags: 'Ephemeral' });
  }
}

export default new PingCommand();
