import cors from 'cors';
import { Client } from 'discord.js';
import express, { Request, Response } from 'express';
import createMessageRouter from './routes/message.routes';

type HttpApiOptions = {
  port: number;
  apiToken?: string;
};

class HttpApiServer {
  constructor(private readonly client: Client, private readonly options: HttpApiOptions) {}

  public start(): void {
    const app = express();

    app.use(express.json());
    app.use(
      cors({
        origin: process.env['ALLOWED_ORIGINS']?.split(','),
        credentials: true,
      }),
    );

    app.use(createMessageRouter(this.client, this.options.apiToken));
    app.use((_req: Request, res: Response) => {
      this.sendJson(res, 404, { error: 'Not found' });
    });

    app.listen(this.options.port, () => {
      console.log(`HTTP API listening on :${this.options.port}`);
    });
  }

  private sendJson(res: Response, status: number, payload: object): void {
    res.status(status).json(payload);
  }
}

export default HttpApiServer;
