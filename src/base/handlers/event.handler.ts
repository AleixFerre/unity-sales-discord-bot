import CustomClient from '../CustomClient';
import CommandHandler from './command.handler';
import PingCommand from './commands/ping.command';
import ReadyEvent from './events/ready.event';

class EventHandler {
  private readonly events = [ReadyEvent, CommandHandler];
  private readonly commands = [PingCommand];

  public loadEvents(): void {
    this.loadCommands();

    for (const event of this.events) {
      if (event.once) {
        CustomClient.once(event.name, event.execute);
      } else {
        CustomClient.on(event.name, event.execute);
      }
    }
  }

  loadCommands() {
    for (const command of this.commands) {
      CustomClient.commands.set(command.name, command);
    }
  }
}

export default new EventHandler();
