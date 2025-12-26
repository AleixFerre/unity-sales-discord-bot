import { Client, Events } from 'discord.js';
import { IEvent } from './interfaces/event.interface';

class ReadyEvent implements IEvent<Events.ClientReady> {
  readonly name: Events.ClientReady = Events.ClientReady;
  readonly once = true;
  readonly execute = (client: Client): void => {
    console.log(`🚀 ${client.user?.tag} is now ready and connected to Discord!`);
  };
}

export default new ReadyEvent();
