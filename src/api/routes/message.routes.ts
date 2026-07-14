import { Client } from 'discord.js';
import { Request, Response, Router } from 'express';
import MessageController from '../controllers/message.controller';
import { scrapeAssetStore } from '../services/assetStoreScraper';
import { scrapeFabFree } from '../services/fabFreeScraper';
import MessageService from '../services/message.service';

const createMessageRouter = (client: Client, apiToken?: string): Router => {
  const router = Router();
  const service = new MessageService(client);
  const controller = new MessageController(service, apiToken);

  const isAuthorized = (req: Request): boolean => {
    if (!apiToken) {
      return true;
    }
    console.log(req.headers.authorization,apiToken);
    
    return req.headers.authorization === `Bearer ${apiToken}`;
  };

  router.post('/message', controller.handleSendMessage);
  router.get('/fab/free', async (req: Request, res: Response) => {
    if (!isAuthorized(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      const items = await scrapeFabFree();
      res.status(200).json({ items });
    } catch (error) {
      console.error('Fab limited-time-free scrape failed', error);
      res.status(502).json({ error: 'Failed to fetch Fab limited-time-free data.' });
    }
  });
  router.get('/assetstore/scrape', async (req: Request, res: Response) => {
    if (!isAuthorized(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
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
