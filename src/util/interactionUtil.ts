import {
  Message,
  SelectMenuInteraction,
  Guild,
  InteractionReplyOptions,
  User,
  CommandInteraction,
  TextChannel,
  ComponentType,
  Component,
  EmbedBuilder,
  MessageSelectOption,
} from "discord.js";
import { NumberConstants } from "../util/constants";
import { GeneralFilter } from "./promptUtil";

export namespace InteractionFilters {
  export function regexFilter(
    regex: RegExp,
    trimInput?: boolean
  ): (input: string) => boolean {
    return (input: string) => {
      return GeneralFilter.regexFilter(input, regex, trimInput);
    };
  }
}

export interface InterReplyUtilOptions {
  timeout?: number;
  delete?: boolean;
}
export function interReplyUtil(
  interaction: CommandInteraction,
  payload: InteractionReplyOptions,
  options?: InterEditReplyUtilOptions
) {
  if (!payload.embeds) payload.embeds = [];
  if (!payload.components) payload.components = [];
  if (!payload.content) payload.content = " ";

  interaction.reply(payload).catch((err) => {
    console.error(err);
  });

  if (options?.delete != false) {
    setTimeout(() => {
      try {
        interaction.deleteReply().catch((e) => {
          console.log("Ya esta eliminada");
        });
      } catch (e) {
        console.log("Ya esta eliminada");
      }
    }, options?.timeout || 15 * NumberConstants.secs);
  }
}
export interface InterEditReplyUtilOptions {
  timeout?: number;
  delete?: boolean;
}
export function interEditReplyUtil(
  interaction: CommandInteraction,
  payload: InteractionReplyOptions,
  options?: InterEditReplyUtilOptions
) {
  console.log(`interEditReplyUtil => ${interaction.id}`);
  if (!payload.embeds) payload.embeds = [];
  if (!payload.components) payload.components = [];
  if (!payload.content) payload.content = " ";

  interaction.editReply(payload).catch((err) => {});

  if (options?.delete != false) {
    setTimeout(() => {
      try {
        interaction.deleteReply().catch((e) => {
          {
            console.log("Ya esta eliminada");
          }
        });
      } catch (e) {
        console.log("Ya esta eliminada");
      }
    }, options?.timeout || 15 * NumberConstants.secs);
  }
}

export interface AssertGuildTextCommandResponse {
  guildId: string;
  textChannel: TextChannel;
  guild: Guild;
  user: User;
  userId: string;
}
export function assertGuildTextCommand(
  interaction: CommandInteraction
): AssertGuildTextCommandResponse {
  const textChannel = interaction.channel as TextChannel;
  const guildId = interaction.guildId;
  const guild = interaction.guild;
  const user = interaction.user;
  const userId = interaction.user.id;

  if (!(guildId && textChannel && guild)) {
    interaction.reply(
      `Must use this command from a server's text channel to use this command`
    );
    throw "Not voice channel";
  }

  return { guild, guildId, textChannel, user, userId };
}

export enum FilterInputTypes {
  STRING = "STRING",
  BOOLEAN = "BOOLEAN",
  NUMBER = "NUMBER",
}
export interface GetFilteredInputOptions {
  allowError?: boolean;
}
export function getFilteredInput(
  interaction: CommandInteraction,
  inputName: string,
  inputType: FilterInputTypes,
  filter: (x: any) => boolean,
  errorMessage: string,
  options?: GetFilteredInputOptions
): any {
  let valid = false;
  if (inputType == FilterInputTypes.STRING) {
    const inputString = interaction.options.get(inputName);
    valid = filter(inputString);
    if (valid && inputString) {
      // TODO: TRIM
      return inputString;
      // return inputString.trim()
    }
  }
  if (!valid) {
    interEditReplyUtil(interaction, { content: errorMessage });
    throw new FilteredInputError("Failed filtered input");
  }
}

class FilteredInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FilteredInputError";
  }
}
