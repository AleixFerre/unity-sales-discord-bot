import { Events, Interaction } from 'discord.js';
import CustomClient from '../CustomClient';
import { IEvent } from './events/interfaces/event.interface';

class CommandHandler implements IEvent<Events.InteractionCreate> {
  readonly name = Events.InteractionCreate;
  readonly once = false;

  readonly execute = async (interaction: Interaction): Promise<void> => {
    if (!interaction.isChatInputCommand()) return;

    const command = CustomClient.commands.get(interaction.commandName);

    if (!command) {
      interaction.reply({ content: 'Command not found.', flags: 'Ephemeral' });
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`Error executing ${interaction.commandName}`);
      console.error(error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'There was an error while executing this command.', flags: 'Ephemeral' });
      }
    }
  };
}

export default new CommandHandler();
