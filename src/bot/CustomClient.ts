import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { Command } from './handlers/commands/interfaces/command.interface';
import eventHandler from './handlers/event.handler';

class CustomClient extends Client {
  commands: Collection<string, Command> = new Collection();

  public Init(): void {
    eventHandler.loadEvents();

    this.login(process.env['TOKEN']).catch((error) => {
      console.error('Error logging in:', error);
    });
  }
}

export default new CustomClient({
  intents: [GatewayIntentBits.Guilds],
});
