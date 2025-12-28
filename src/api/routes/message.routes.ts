import { Client } from 'discord.js';
import { Request, Response, Router } from 'express';
import MessageController from '../controllers/message.controller';
import MessageService from '../services/message.service';
import { scrapeAssetStore } from '../services/assetStoreScraper';

const createMessageRouter = (client: Client, apiToken?: string): Router => {
  const router = Router();
  const service = new MessageService(client);
  const controller = new MessageController(service, apiToken);

  router.post('/message', controller.handleSendMessage);
  router.get('/assetstore/scrape', async (req: Request, res: Response) => {
    if (apiToken) {
      const auth = req.headers.authorization;
      if (auth !== `Bearer ${apiToken}`) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
    }

    const url = typeof req.query['url'] === 'string' ? req.query['url'] : '';
    if (!url) {
      res.status(400).json({ error: 'Missing url parameter.' });
      return;
    }
    if (!isSupportedAssetUrl(url)) {
      res.status(400).json({ error: 'URL must be a Unity Asset Store or Fab listing.' });
      return;
    }

    try {
      const data = await scrapeAssetStore(url);
      res.status(200).json(data ?? {});
    } catch (error) {
      console.error('Asset Store scrape failed', error);
      res.status(502).json({ error: 'Failed to fetch asset store data.' });
    }
  });

  return router;
};

const isSupportedAssetUrl = (rawUrl: string): boolean => {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.hostname === 'assetstore.unity.com') {
      return parsed.pathname.startsWith('/packages/');
    }
    if (parsed.hostname === 'www.fab.com' || parsed.hostname === 'fab.com') {
      return parsed.pathname.startsWith('/listings/');
    }
    return false;
  } catch {
    return false;
  }
};

export default createMessageRouter;
