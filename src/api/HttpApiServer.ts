import cors from 'cors';
import { Client } from 'discord.js';
import express, { Request, Response } from 'express';
import morgan from 'morgan';
import createMessageRouter from './routes/message.routes';
import { COLLAGE_DIR, COLLAGE_ROUTE } from './utils/collageStore';

type HttpApiOptions = {
  port: number;
  apiToken?: string;
};

class HttpApiServer {
  constructor(private readonly client: Client, private readonly options: HttpApiOptions) {}

  public start(): void {
    const app = express();

    // Hosts like Railway terminate TLS at their edge and forward over plain HTTP.
    // Without this, req.protocol reports 'http' and the collage URLs handed to the
    // composer are blocked as mixed content by the HTTPS frontend.
    app.set('trust proxy', 1);

    // Log every incoming request. Use the concise 'dev' format in development
    // and the full Apache 'combined' format elsewhere for complete traffic records.
    app.use(morgan(process.env['NODE_ENV'] === 'production' ? 'combined' : 'dev'));
    app.use(express.json());
    app.use(
      cors({
        origin: process.env['ALLOWED_ORIGINS']?.split(','),
        credentials: true,
      }),
    );

    // Unauthenticated on purpose: the composer previews the collage in a plain <img>,
    // which cannot carry the bearer token. The file names are random UUIDs.
    app.use(COLLAGE_ROUTE, express.static(COLLAGE_DIR, { maxAge: '1h' }));

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
