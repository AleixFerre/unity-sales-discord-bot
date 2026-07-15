import { ChatInputCommandInteraction, PermissionsBitField } from 'discord.js';
import prismaClient from '../../../db/prisma-client';
import { Command } from './interfaces/command.interface';

class RegisterCommand implements Command {
  readonly name: string = 'register';
  readonly description: string = 'This command adds or removes this channel from the notification list.';
  readonly options = [];
  readonly default_member_permissions = PermissionsBitField.Flags.Administrator;
  readonly dm_permission = false;

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const channelid = interaction.channelId!;
    const channel = await prismaClient.channels.findUnique({ where: { channelid } });

    if (channel) {
      await prismaClient.channels.delete({ where: { channelid } });
      await interaction.reply({
        content: 'Channel <#' + channel.channelid + '> unregistered as the alert channel!',
        flags: 'Ephemeral',
      });
    } else {
      await prismaClient.channels.create({ data: { channelid } });
      await interaction.reply({
        content: 'Channel <#' + channelid + '> registered as the alert channel!',
        flags: 'Ephemeral',
      });
    }
  }
}

export default new RegisterCommand();
