import 'dotenv/config';
import client from './base/CustomClient';

console.log(process.env['TOKEN']);

client.Init();
