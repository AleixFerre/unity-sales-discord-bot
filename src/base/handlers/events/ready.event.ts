import { Events } from 'discord.js';
import { IEvent } from './interfaces/event.interface';

class ReadyEvent implements IEvent {
  name = Events.ClientReady;
  once = true;

  execute(): void {
    console.log('The bot is now ready and connected to Discord!');
  }
}

export default new ReadyEvent();
