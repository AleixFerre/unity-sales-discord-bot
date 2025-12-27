import { Client, Events, REST, Routes } from 'discord.js';
import CustomClient from '../../CustomClient';
import { Command } from '../commands/interfaces/command.interface';
import { IEvent } from './interfaces/event.interface';

class ReadyEvent implements IEvent<Events.ClientReady> {
  readonly name: Events.ClientReady = Events.ClientReady;
  readonly once = true;
  readonly execute = async (client: Client): Promise<void> => {
    console.log(`🚀 ${client.user?.tag} is now ready and connected to Discord!`);

    const rest = new REST().setToken(process.env['TOKEN'] || '');

    const commands = CustomClient.commands.map((command) => this.getJson(command));
    await rest.put(Routes.applicationCommands(process.env['CLIENT_ID']!), {
      body: commands,
    });

    console.log(`✅ Successfully registered ${commands.length} commands.`);
  };

  private getJson(command: Command): object {
    return {
      name: command.name,
      description: command.description,
      options: command.options,
      default_member_permissions: command.default_member_permissions.toString(),
      dm_permission: command.dm_permission,
    };
  }
}

export default new ReadyEvent();
