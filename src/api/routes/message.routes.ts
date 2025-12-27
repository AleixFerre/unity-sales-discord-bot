import { Router } from 'express';
import MessageController from '../controllers/message.controller';
import MessageService from '../services/message.service';
import { Client } from 'discord.js';

const createMessageRouter = (client: Client, apiToken?: string): Router => {
  const router = Router();
  const service = new MessageService(client);
  const controller = new MessageController(service, apiToken);

  router.post('/message', controller.handleSendMessage);

  return router;
};

export default createMessageRouter;
