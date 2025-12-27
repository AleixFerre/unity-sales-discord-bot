import { channels } from '@prisma/client';
import { Client, EmbedBuilder } from 'discord.js';
import prisma from '../../db/prisma-client';
import { EmbedPayload, MessagePayload, ServiceResult } from './models/message.model';

class MessageService {
  constructor(private readonly client: Client) {}

  public async sendMessages(payload: MessagePayload): Promise<ServiceResult> {
    const channels: channels[] = await prisma.channels.findMany();

    await Promise.all(
      channels.map(async ({ channelid }) => {
        const channel = await this.client.channels.fetch(channelid);
        if (!channel || !channel.isTextBased() || !('send' in channel)) {
          return { ok: false, status: 400, error: 'Invalid channel' };
        }

        const message = this.buildMessage(payload);
        if (!message) {
          return { ok: false, status: 400, error: 'Missing content or embed' };
        }

        return await channel.send(message);
      }),
    );

    return { ok: true };
  }

  private buildMessage(payload: MessagePayload): { content?: string; embeds?: EmbedBuilder[] } | null {
    const content = typeof payload.content === 'string' ? payload.content : undefined;
    const embed = payload.embed ? this.buildEmbed(payload.embed) : null;

    if (!content && !embed) return null;

    return {
      ...(content ? { content } : {}),
      ...(embed ? { embeds: [embed] } : {}),
    };
  }

  private buildEmbed(embed: EmbedPayload): EmbedBuilder {
    const builder = new EmbedBuilder();

    if (embed.title) builder.setTitle(embed.title);
    if (embed.description) builder.setDescription(embed.description);
    if (typeof embed.color === 'number') builder.setColor(embed.color);
    if (embed.url) builder.setURL(embed.url);
    if (embed.fields?.length) builder.addFields(embed.fields);
    if (embed.footer?.text) builder.setFooter({ text: embed.footer.text });
    if (embed.image?.url) builder.setImage(embed.image.url);
    if (embed.thumbnail?.url) builder.setThumbnail(embed.thumbnail.url);

    return builder;
  }
}

export default MessageService;
