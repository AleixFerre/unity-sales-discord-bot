import { Request, Response } from 'express';
import MessageService from '../services/message.service';
import { MessagePayload } from '../services/models/message.model';

class MessageController {
  constructor(private readonly service: MessageService, private readonly apiToken?: string) {}

  public readonly handleSendMessage = async (req: Request, res: Response): Promise<void> => {
    if (this.apiToken) {
      const auth = req.headers.authorization;
      if (auth !== `Bearer ${this.apiToken}`) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
    }

    try {
      const result = await this.service.sendMessage(req.body as MessagePayload);
      if (!result.ok) {
        res.status(result.status).json({ error: result.error });
        return;
      }

      res.status(200).json({ ok: true });
    } catch (error) {
      console.error('API error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  };
}

export default MessageController;
