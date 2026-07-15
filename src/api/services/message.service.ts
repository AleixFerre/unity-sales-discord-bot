import { channels } from '@prisma/client';
import { Client, EmbedBuilder } from 'discord.js';
import prisma from '../../db/prisma-client';
import { EmbedPayload, MessagePayload, ServiceResult } from './models/message.model';

class MessageService {
  constructor(private readonly client: Client) {}

  public async sendMessages(payload: MessagePayload): Promise<ServiceResult> {
    const message = this.buildMessage(payload);
    if (!message) {
      return { ok: false, status: 400, error: 'Missing embeds' };
    }

    const registeredChannels: channels[] = await prisma.channels.findMany();
    if (registeredChannels.length === 0) {
      return {
        ok: false,
        status: 502,
        error: 'No channels registered. Use /register in a Discord channel first.',
      };
    }

    const results = await Promise.all(
      registeredChannels.map(async ({ channelid }) => {
        try {
          const channel = await this.fetchChannel(channelid);
          if (!channel || !channel.isTextBased() || !('send' in channel)) {
            return false;
          }
          await channel.send(message);
          return true;
        } catch (error) {
          console.error(`Failed to send message to channel ${channelid}`, error);
          return false;
        }
      }),
    );

    const sent = results.filter(Boolean).length;
    if (sent === 0) {
      return {
        ok: false,
        status: 502,
        error: 'Failed to deliver the message to any registered channel.',
      };
    }
    if (sent < results.length) {
      console.warn(`Message delivered to ${sent} of ${results.length} channels.`);
    }
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

  private buildMessage(payload: MessagePayload): { embeds: EmbedBuilder[] } | null {
    const embeds: EmbedBuilder[] = [];
    payload.embeds?.forEach((embed) => embeds.push(...this.buildEmbeds(embed)));
    if (embeds.length === 0) return null;
    if (embeds.length > 10) {
      console.warn(`Trimming message to Discord's 10-embed limit (${embeds.length} built).`);
      embeds.length = 10;
    }
    return { embeds };
  }

  // Discord renders up to 4 images as a single gallery when the extra embeds
  // share the first embed's URL, so a multi-image payload expands to 1..4 embeds.
  private buildEmbeds(embed: EmbedPayload): EmbedBuilder[] {
    const imageUrls = (embed.images ?? [])
      .map((image) => image.url)
      .filter((url) => Boolean(url))
      .slice(0, 4);

    const builder = new EmbedBuilder();
    if (embed.title) builder.setTitle(embed.title);
    if (typeof embed.color === 'number') builder.setColor(embed.color);
    if (embed.url) builder.setURL(embed.url);
    if (embed.fields?.length) builder.addFields(embed.fields);
    if (embed.footer?.text) builder.setFooter({ text: embed.footer.text });
    if (embed.thumbnail?.url) builder.setThumbnail(embed.thumbnail.url);
    if (imageUrls[0]) builder.setImage(imageUrls[0]);

    const builders = [builder];
    if (embed.url) {
      imageUrls.slice(1).forEach((url) => {
        builders.push(new EmbedBuilder().setURL(embed.url as string).setImage(url));
      });
    }
    return builders;
  }
}

export default MessageService;
