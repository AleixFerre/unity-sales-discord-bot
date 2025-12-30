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
        const channel = await this.fetchChannel(channelid);
        if (!channel) {
          return { ok: false, status: 400, error: 'Invalid channel' };
        }

        if (!channel.isTextBased() || !('send' in channel)) {
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

  private async fetchChannel(channelid: string) {
    try {
      const channel = await this.client.channels.fetch(channelid);
      if (!channel) {
        await this.deleteChannel(channelid);
        return null;
      }
      return channel;
    } catch (error) {
      if (this.isUnknownChannelError(error)) {
        await this.deleteChannel(channelid);
        return null;
      }
      throw error;
    }
  }

  private isUnknownChannelError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    return 'code' in error && (error as { code?: number }).code === 10003;
  }

  private async deleteChannel(channelid: string): Promise<void> {
    try {
      await prisma.channels.delete({ where: { channelid } });
    } catch {
      // Ignore missing rows or races with other deletions.
    }
  }

  private buildMessage(payload: MessagePayload): { content?: string; embeds?: EmbedBuilder[] } | null {
    const content = typeof payload.content === 'string' ? payload.content : undefined;
    const embeds: EmbedBuilder[] = [];
    if (payload.embeds?.length) {
      payload.embeds.forEach((embed) => {
        embeds.push(this.buildEmbed(embed));
      });
    }

    if (!content && embeds.length === 0) return null;

    return {
      ...(content ? { content } : {}),
      ...(embeds.length ? { embeds } : {}),
    };
  }

  private buildEmbed(embed: EmbedPayload): EmbedBuilder {
    const builder = new EmbedBuilder();

    if (embed.title) builder.setTitle(embed.title);
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
