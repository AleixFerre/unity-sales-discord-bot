import { Client } from 'discord.js';
import express, { Request, Response } from 'express';

type HttpApiOptions = {
  port: number;
  apiToken?: string;
};

class HttpApiServer {
  constructor(private readonly client: Client, private readonly options: HttpApiOptions) {}

  public start(): void {
    const app = express();

    app.use(express.json());
    app.post('/message', this.handleMessage);
    app.use((_req: Request, res: Response) => {
      this.sendJson(res, 404, { error: 'Not found' });
    });

    app.listen(this.options.port, () => {
      console.log(`HTTP API listening on :${this.options.port}`);
    });
  }

  private readonly handleMessage = async (req: Request, res: Response): Promise<void> => {
    if (this.options.apiToken) {
      const auth = req.headers.authorization;
      if (auth !== `Bearer ${this.options.apiToken}`) {
        this.sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }
    }

    try {
      const channelId = req.body?.channelId;
      const content = req.body?.content;

      if (!channelId || !content) {
        this.sendJson(res, 400, { error: 'Missing channelId or content' });
        return;
      }

      const channel = await this.client.channels.fetch(channelId);
      if (!channel || !channel.isTextBased() || !('send' in channel)) {
        this.sendJson(res, 400, { error: 'Invalid channel' });
        return;
      }

      await channel.send({ content });
      this.sendJson(res, 200, { ok: true });
    } catch (error) {
      console.error('API error:', error);
      this.sendJson(res, 500, { error: 'Server error' });
    }
  };

  private sendJson(res: Response, status: number, payload: object): void {
    res.status(status).json(payload);
  }
}

export default HttpApiServer;
