import { AutocompleteInteraction, ChatInputCommandInteraction, PermissionsBitField } from 'discord.js';
import prismaClient from '../../../db/prisma-client';
import { Category } from './interfaces/category.interface';
import { Command } from './interfaces/command.interface';

class RegisterCommand implements Command {
  readonly name: string = 'register';
  readonly description: string = 'This command adds or removes this channel from the notification list.';
  readonly category = Category.Utilities;
  readonly options = [];
  readonly default_member_permissions = PermissionsBitField.Flags.Administrator;
  readonly dm_permission = false;

  execute(interaction: ChatInputCommandInteraction): void {
    prismaClient.channels
      .findUnique({
        where: {
          channelid: interaction.channelId!,
        },
      })
      .then(async (channel) => {
        if (channel) {
          await prismaClient.channels.delete({
            where: {
              channelid: interaction.channelId!,
            },
          });
          await interaction.reply({
            content: 'Channel <#' + channel.channelid + '> unregistered as the alert channel!',
            flags: 'Ephemeral',
          });
        } else {
          await prismaClient.channels.create({
            data: {
              channelid: interaction.channelId!,
            },
          });
          await interaction.reply({
            content: 'Channel <#' + interaction.channelId + '> registered as the alert channel!',
            flags: 'Ephemeral',
          });
        }
      });
  }
  autoComplete?: (interaction: AutocompleteInteraction) => void;
}

export default new RegisterCommand();
