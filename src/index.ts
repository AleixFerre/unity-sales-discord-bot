import { Events } from 'discord.js';
import 'dotenv/config';
import HttpApiServer from './api/HttpApiServer';
import client from './base/CustomClient';

const PORT = Number(process.env['API_PORT'] || 3000);
const API_TOKEN = process.env['API_TOKEN']!;

const apiServer = new HttpApiServer(client, { port: PORT, apiToken: API_TOKEN });

client.Init();
client.once(Events.ClientReady, () => apiServer.start());
