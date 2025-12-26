import { Client } from 'discord.js';
import eventHandler from './handlers/event.handler';

class CustomClient extends Client {
  public Init(): void {
    eventHandler.loadEvents();

    this.login(process.env['TOKEN'])
      .then(() => {
        console.log('Bot logged in successfully.');
      })
      .catch((error) => {
        console.error('Error logging in:', error);
      });
  }
}

export default new CustomClient({
  intents: [],
});
