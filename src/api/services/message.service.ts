import { channels } from '@prisma/client';
import { AttachmentBuilder, Client, EmbedBuilder } from 'discord.js';
import prisma from '../../db/prisma-client';
import { deleteStoredCollage, readStoredCollage } from '../utils/collageStore';
import { EmbedPayload, MessagePayload, ServiceResult } from './models/message.model';

type CollageFile = { name: string; data: Buffer; sourceUrl: string };
type BuiltMessage = { embeds: EmbedBuilder[]; files: CollageFile[] };

const FOOTER_ICON_URL =
  'https://cdn.discordapp.com/avatars/1454213455593865428/0a9f6341466ea38d70dc664ff0e7f4c7.webp';

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
        } catch {
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
    // Discord stores its own copy of an uploaded attachment, so once the message is
    // out the local file has no reader left.
    await Promise.all(message.files.map((file) => deleteStoredCollage(file.sourceUrl)));

    if (sent < results.length) {
      const rate = Math.round((sent / results.length) * 100);
      console.warn(`Message delivered to ${sent} of ${results.length} channels (${rate}%).`);
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

  // A Unity list embed carries the collage this backend built when the list was scraped.
  // Uploading the stored file keeps the image working regardless of whether Discord can
  // reach the API; every other embed keeps using its plain image URLs.
  private async buildEmbedGroup(
    embed: EmbedPayload,
    index: number,
  ): Promise<{ embeds: EmbedBuilder[]; file?: CollageFile }> {
    const embeds = this.buildEmbeds(embed);
    const [first] = embeds;
    const imageUrl = first?.data.image?.url;
    if (!first || !imageUrl) {
      return { embeds };
    }

    const collage = await readStoredCollage(imageUrl);
    if (!collage) {
      return { embeds };
    }

    const name = `collage-${index}.jpg`;
    first.setImage(`attachment://${name}`);
    return { embeds, file: { name, data: collage, sourceUrl: imageUrl } };
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
    if (embed.description) builder.setDescription(embed.description);
    if (typeof embed.color === 'number') builder.setColor(embed.color);
    if (embed.url) builder.setURL(embed.url);
    if (embed.fields?.length) builder.addFields(embed.fields);
    if (embed.footer?.text)
      builder.setFooter({ text: embed.footer.text, iconURL: FOOTER_ICON_URL });
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
