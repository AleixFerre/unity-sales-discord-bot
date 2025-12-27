import { Events, Interaction } from 'discord.js';
import CustomClient from '../CustomClient';
import { IEvent } from './events/interfaces/event.interface';

class CommandHandler implements IEvent<Events.InteractionCreate> {
  readonly name = Events.InteractionCreate;
  readonly once = false;

  readonly execute = (interaction: Interaction): void => {
    if (!interaction.isChatInputCommand()) return;

    const command = CustomClient.commands.get(interaction.commandName);

    if (!command) {
      interaction.reply({ content: 'Command not found.', ephemeral: true });
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      command.execute(interaction);
    } catch (error) {
      console.error(`Error executing ${interaction.commandName}`);
      console.error(error);
    }
  };
}

export default new CommandHandler();
