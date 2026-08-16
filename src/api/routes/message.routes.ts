import { Client } from 'discord.js';
import { NextFunction, Request, Response, Router } from 'express';
import MessageController from '../controllers/message.controller';
import { scrapeAssetStore, scrapeAssetStoreList } from '../services/assetStoreScraper';
import { scrapeFabFree } from '../services/fabFreeScraper';
import MessageService from '../services/message.service';

const createMessageRouter = (client: Client, apiToken?: string): Router => {
  const router = Router();
  const service = new MessageService(client);
  const controller = new MessageController(service);

  const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
    if (apiToken && req.headers.authorization !== `Bearer ${apiToken}`) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    next();
  };

  router.post('/message', requireAuth, controller.handleSendMessage);
  router.get('/fab/free', requireAuth, async (_req: Request, res: Response) => {
    try {
      const items = await scrapeFabFree();
      res.status(200).json({ items });
    } catch (error) {
      console.error('Fab limited-time-free scrape failed', error);
      res.status(502).json({ error: 'Failed to fetch Fab limited-time-free data.' });
    }
  });
  router.get('/assetstore/scrape', requireAuth, async (req: Request, res: Response) => {
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
  router.get('/assetstore/list', requireAuth, async (req: Request, res: Response) => {
    const url = typeof req.query['url'] === 'string' ? req.query['url'] : '';
    if (!url) {
      res.status(400).json({ error: 'Missing url parameter.' });
      return;
    }
    if (!isSupportedAssetListUrl(url)) {
      res.status(400).json({ error: 'URL must be a Unity Asset Store list.' });
      return;
    }

    try {
      const data = await scrapeAssetStoreList(url, readPublicBaseUrl(req));
      res.status(200).json(data);
    } catch (error) {
      console.error('Asset Store list scrape failed', error);
      res.status(502).json({ error: 'Failed to fetch asset store list data.' });
    }
  });

  return router;
};

// Collage URLs have to be absolute so the composer can render them; PUBLIC_BASE_URL
// covers deployments behind a proxy, where the request host is not the public one.
const readPublicBaseUrl = (req: Request): string =>
  process.env['PUBLIC_BASE_URL'] || `${req.protocol}://${req.get('host')}`;

const isSupportedAssetListUrl = (rawUrl: string): boolean => {
  try {
    const parsed = new URL(rawUrl);
    return parsed.hostname === 'assetstore.unity.com' && parsed.pathname.startsWith('/lists/');
  } catch {
    return false;
  }
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
