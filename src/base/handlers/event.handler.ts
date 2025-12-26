import CustomClient from '../CustomClient';
import ReadyEvent from './events/ready.event';

class EventHandler {
  private readonly events = [ReadyEvent];

  public loadEvents(): void {
    for (const event of this.events) {
      if (event.once) {
        CustomClient.once(event.name, event.execute);
      } else {
        CustomClient.on(event.name, event.execute);
      }
    }
  }
}

export default new EventHandler();
