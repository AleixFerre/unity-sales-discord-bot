import { Request, Response } from 'express';
import MessageService from '../services/message.service';
import { MessagePayload } from '../services/models/message.model';

class MessageController {
  constructor(private readonly service: MessageService) {}

  public readonly handleSendMessage = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.service.sendMessages(req.body as MessagePayload);
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
