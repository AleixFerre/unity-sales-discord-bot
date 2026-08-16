import { channels } from '@prisma/client';
import { AttachmentBuilder, Client, EmbedBuilder } from 'discord.js';
import prisma from '../../db/prisma-client';
import { buildCollage, MAX_COLLAGE_IMAGES } from '../utils/collage';
import { fetchImageBuffer } from '../utils/imageFetch';
import { EmbedPayload, MessagePayload, ServiceResult } from './models/message.model';

type CollageFile = { name: string; data: Buffer };
type BuiltMessage = { embeds: EmbedBuilder[]; files: CollageFile[] };

class MessageService {
  constructor(private readonly client: Client) {}

  public async sendMessages(payload: MessagePayload): Promise<ServiceResult> {
    const message = await this.buildMessage(payload);
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
          // A shared AttachmentBuilder cannot be reused across these concurrent
          // sends, so each channel gets its own wrapper around the cached buffers.
          await channel.send({
            embeds: message.embeds,
            files: message.files.map(({ name, data }) => new AttachmentBuilder(data, { name })),
          });
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

  private async buildMessage(payload: MessagePayload): Promise<BuiltMessage | null> {
    const groups = await Promise.all(
      (payload.embeds ?? []).map((embed, index) => this.buildEmbedGroup(embed, index)),
    );

    const embeds: EmbedBuilder[] = [];
    const files: CollageFile[] = [];
    groups.forEach((group) => {
      embeds.push(...group.embeds);
      if (group.file) files.push(group.file);
    });
    if (embeds.length === 0) return null;

    if (embeds.length > 10) {
      console.warn(`Trimming message to Discord's 10-embed limit (${embeds.length} built).`);
      embeds.length = 10;
    }

    // Uploading an attachment no surviving embed points at would leave it dangling
    // under the message, so files are dropped alongside the embeds that referenced them.
    const referenced = new Set(embeds.map((embed) => embed.data.image?.url));
    return { embeds, files: files.filter((file) => referenced.has(`attachment://${file.name}`)) };
  }

  // Several images are merged into one collage we upload ourselves, which keeps the
  // layout under our control instead of Discord's. Anything that fails along the way
  // falls back to the URL gallery below.
  private async buildEmbedGroup(
    embed: EmbedPayload,
    index: number,
  ): Promise<{ embeds: EmbedBuilder[]; file?: CollageFile }> {
    const imageUrls = this.readImageUrls(embed);
    if (embed.collage === false || imageUrls.length < 2) {
      return { embeds: this.buildEmbeds(embed) };
    }

    const buffers = (await Promise.all(imageUrls.map(fetchImageBuffer))).filter(
      (buffer): buffer is Buffer => buffer !== null,
    );
    const collage = buffers.length >= 2 ? await buildCollage(buffers) : null;
    if (!collage) {
      console.warn('Falling back to the URL gallery for an embed the collage could not cover.');
      return { embeds: this.buildEmbeds(embed) };
    }

    const name = `collage-${index}.jpg`;
    return {
      embeds: [this.buildBaseEmbed(embed).setImage(`attachment://${name}`)],
      file: { name, data: collage },
    };
  }

  // Discord renders up to 4 images as a single gallery when the extra embeds
  // share the first embed's URL, so a multi-image payload expands to 1..4 embeds.
  private buildEmbeds(embed: EmbedPayload): EmbedBuilder[] {
    const imageUrls = this.readImageUrls(embed);
    const builder = this.buildBaseEmbed(embed);
    if (imageUrls[0]) builder.setImage(imageUrls[0]);

    const builders = [builder];
    if (embed.url) {
      imageUrls.slice(1).forEach((url) => {
        builders.push(new EmbedBuilder().setURL(embed.url as string).setImage(url));
      });
    }
    return builders;
  }

  private buildBaseEmbed(embed: EmbedPayload): EmbedBuilder {
    const builder = new EmbedBuilder();
    if (embed.title) builder.setTitle(embed.title);
    if (embed.description) builder.setDescription(embed.description);
    if (typeof embed.color === 'number') builder.setColor(embed.color);
    if (embed.url) builder.setURL(embed.url);
    if (embed.fields?.length) builder.addFields(embed.fields);
    if (embed.footer?.text) builder.setFooter({ text: embed.footer.text });
    if (embed.thumbnail?.url) builder.setThumbnail(embed.thumbnail.url);
    return builder;
  }

  private readImageUrls(embed: EmbedPayload): string[] {
    return (embed.images ?? [])
      .map((image) => image.url)
      .filter((url) => Boolean(url))
      .slice(0, MAX_COLLAGE_IMAGES);
  }
}

export default MessageService;
