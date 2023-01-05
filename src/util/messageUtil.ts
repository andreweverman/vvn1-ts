/**
 *
 * Utility for all Discord message related thigns
 *
 * Defines the way that we handle all our IO with the user
 * Prompt is used in most of the functions
 *
 * @file   Utility for Discord message things
 * @author Andrew Everman.
 * @since  15.10.2020
 */

import {
  Message,
  TextChannel,
  CollectorFilter,
  DMChannel,
  NewsChannel,
  Guild,
  GuildEmoji,
  EmbedField,
  MessagePayload,
  ThreadChannel,
  ChannelType,
  EmbedBuilder,
  Channel,
  MessageEditOptions,
  MessageCreateOptions,
} from "discord.js";
import {
  NumberConstants,
  quit,
  valid,
  messageCollectorTimeout,
  extraStringOption,
} from "./constants";
import {
  stringMatch,
  matchOptions,
  spaceCommaRegex,
  guildEmojiRegex,
} from "./stringUtil";
import { timeInPast, TimeInPastOptions, dateInPast } from "./timeUtil";
export type AsyncCollectorFilter = (...args: any[]) => Promise<boolean>;
export type AnyCollectorFilter = AsyncCollectorFilter | CollectorFilter<any>;

export namespace Filter {
  export interface multipleFiltersInput {
    every?: AnyCollectorFilter[];
    some?: AnyCollectorFilter[];
  }
  export function multipleFilters(
    filters: multipleFiltersInput
  ): AsyncCollectorFilter {
    return async (m: Message) => {
      return new Promise(async (resolve, reject) => {
        let everyRes: boolean = false;
        let someRes: boolean = false;
        if (!filters.every || filters.every.length == 0) {
          everyRes = true;
        } else {
          const everyPromises = filters.every.map((x) => x(m));
          const everyPromiseResults = await Promise.all(everyPromises);
          everyRes = everyPromiseResults.every((x) => x);
        }
        if (!filters.some || filters.some.length == 0) {
          someRes = true;
        } else {
          const onePromises = filters.some.map((x) => x(m));
          const onePromiseResults = await Promise.all(onePromises);
          someRes = onePromiseResults.some((x) => x);
        }
        try {
          resolve(everyRes && someRes);
        } catch (error) {
          reject(error);
        }
      });
    };
  }

  export function anyFilter(): CollectorFilter<any> {
    return () => true;
  }

  // both are inclusive
  export interface numberRangeFilterOptions {
    integerOnly?: boolean;
    multipleInputAllowed?: boolean;
  }

  export function numberRangeFilter(
    min: number,
    max: number,
    options?: numberRangeFilterOptions
  ): CollectorFilter<any> {
    const multiple = options?.multipleInputAllowed == true;
    const parseFunc = options?.integerOnly == false ? parseFloat : parseInt;

    return (response: Message) => {
      const validNumber = function (content: string): boolean {
        const num_resp = parseFunc(content);
        return num_resp != NaN && num_resp <= max && num_resp >= min;
      };

      const trimmedContent = response.content.trim();
      return multiple
        ? trimmedContent.split(" ").every((x) => validNumber(x))
        : validNumber(trimmedContent);
    };
  }

  export function stringFilter(
    str: string,
    options: matchOptions
  ): CollectorFilter<any> {
    const regex = stringMatch(str, options);
    const minLengthEnabled: boolean = options.minLength != undefined;
    const maxLengthEnabled: boolean = options.maxLength != undefined;
    let filterLength: any = () => true;
    if (minLengthEnabled || maxLengthEnabled) {
      filterLength = (str: string): boolean => {
        if (options.minLength != undefined) {
          if (str.length < options.minLength) {
            return false;
          }
        }
        if (options.maxLength != undefined) {
          if (str.length > options.maxLength) {
            return false;
          }
        }
        return true;
      };
    }

    return (response: Message) => {
      const inputStr =
        options.trimInput == false ? response.content : response.content.trim();
      return regex.test(inputStr) && filterLength(inputStr);
    };
  }

  export function stringLengthFilter(
    maxLength = 0,
    minLength = 0
  ): CollectorFilter<any> {
    return (response: Message) => {
      const content = response.content.trim();
      return content.length >= minLength && content.length <= maxLength;
    };
  }

  export function regexFilter(
    regex: RegExp,
    trimInput = true
  ): CollectorFilter<any> {
    return (response: Message) => {
      return regex.test(trimInput ? response.content.trim() : response.content);
    };
  }

  export function notInPastFilter(
    timeZoneName: string,
    options?: TimeInPastOptions
  ): CollectorFilter<any> {
    return (response: Message) => {
      const inPast = timeInPast(timeZoneName, response.content.trim(), options);
      return !inPast;
    };
  }

  export function dateNotInPastFilter(
    timeZoneName: string
  ): CollectorFilter<any> {
    return (response: Message) => {
      const inPast = dateInPast(timeZoneName, response.content.trim());
      return !inPast;
    };
  }

  export function validEmojiFilter(): CollectorFilter<any> {
    return (response: Message) => {
      const name = response.content.trim();
      const guild_emoji = guildEmojiRegex.test(name);
      let validGuildEmoji: GuildEmoji | undefined = undefined;
      if (guild_emoji) {
        validGuildEmoji = response.guild!.emojis.cache.find((x) => {
          let val = `<:${x.identifier}>` == name;
          return val;
        });
      }
      return validGuildEmoji != undefined;
    };
  }
}

export type DeleteResponse = Message | boolean;
export function deleteMessage(
  message: Message,
  time: number
): Promise<DeleteResponse> {
  return new Promise((resolve, reject) => {
    console.log(`Attempting to delete messageid ${message.id}:${message.content}`)
    if (message.channel.type == ChannelType.GuildText) resolve(true);

    try {
      setTimeout(() => {
        message
          .delete()
          .then((deletedMessage: Message) => {
            resolve(deletedMessage);
          })
          .catch((error: any) => {
            if (error.httpStatus != 404) {
              reject(error);
            } else {
              resolve(true);
            }
          });
      }, time);
    } catch (error) {
        resolve(true)
    }
  });
}

export interface sendUtilResponse {
  messages: Message[];
  deleteResponses: Promise<DeleteResponse>[];
}

export function sendUtil(
  message: Promise<Message | Message[]>,
  autoDelete: boolean,
  autoDeleteTime = 15 * NumberConstants.secs
): Promise<sendUtilResponse> {
  const result: sendUtilResponse = {
    messages: [],
    deleteResponses: [],
  };

  const postSend = (sentMessage: Message) => {
    result.messages.push(sentMessage);
    if (autoDelete) {
      result.deleteResponses.push(deleteMessage(sentMessage, autoDeleteTime));
    }
  };

  return new Promise((resolve, reject) => {
    message
      .then(async (sentMessage: Message | Message[]) => {
        if (!Array.isArray(sentMessage)) {
          postSend(sentMessage);
        } else {
          sentMessage.forEach((individualMessage) => {
            postSend(individualMessage);
          });
        }

        resolve(result);
      })
      .catch((error: Error) => {
        reject(error);
      });
  });
}

export interface sendPaginationOptions {
  userID: string;
  embeds: EmbedBuilder[];
}
export function sendToChannel(
  channel: Channel | null,
  statement: string | MessagePayload | MessageCreateOptions,
  autoDelete = true,
  autoDeleteTime = 15 * NumberConstants.secs,
  paginationOptions?: sendPaginationOptions
) {
  if (!channel || !channel.isTextBased()) {
    throw null;
  }
  const sendRes = sendUtil(
    channel.send(statement),
    autoDelete,
    autoDeleteTime
  ).then((res) => {
    if (paginationOptions) {
      Prompt.setPaginationButtons(
        res.messages[0],
        paginationOptions.embeds,
        paginationOptions.userID
      );
    }
    return res;
  });

  return sendRes;
}

export function replyUtil(
  message: Message,
  statement: string | MessagePayload | MessageCreateOptions,
  autoDelete = true,
  time = 15 * NumberConstants.secs
): Promise<sendUtilResponse> {
  return sendUtil(message.reply(statement), autoDelete, time);
}

export namespace Prompt {
  export interface gsuiReject {
    reason: string;
    throwError: boolean;
    lastMessage?: Message;
    error?: Error;
  }
  export interface GSUIOptions {
    extraStringOptions?: string[];
    time?: number;
    pagination?: boolean;
    paginationEmbeds?: EmbedBuilder[];
  }
  export function handleGetSameUserInputError(
    errorResponse: any,
    reject?: Function
  ) {
    if (errorResponse.throwError) {
      if (!reject) {
        throw errorResponse;
      } else {
        reject(errorResponse);
      }
    }
  }

  export async function setPaginationButtons(
    message: Message,
    pages: EmbedBuilder[],
    authorID: string
  ) {}

  export interface arrayToPaginatedArrayOptions {
    numbered?: boolean;
    pageSize?: number;
    offset?: number;
    chunk?: number;
  }
  export function arrayToPaginatedArray(
    arr: any[],
    title: string,
    mapFunction: (t: any) => string,
    options?: arrayToPaginatedArrayOptions
  ): EmbedBuilder[] {
    const embeds: EmbedBuilder[] = [];
    const offset = options?.offset || 1;
    const chunk = options?.chunk || 15;
    const maxLength = 1000;

    let i: number, j: number;
    for (i = 0, j = arr.length; i < j; i += chunk) {
      const fields: EmbedField[] = [];
      let f: string[] = [];
      let curLength = 0;
      const linkChunk = arr.slice(i, i + chunk);
      linkChunk.forEach((x, k) => {
        const entry = `${
          options && !options.numbered ? "" : "**" + (i + k + offset) + "**. "
        }${mapFunction(x)}`;
        const isUnder = curLength + entry.length < maxLength;
        if (isUnder) {
          f.push(entry);
          curLength += entry.length;
        }
        if (!isUnder) {
          fields.push({
            name: title,
            value: f.join("\n"),
            inline: true,
          });
          f = [];
          f.push(entry);
          curLength = 0;
        }

        if (k == linkChunk.length - 1) {
          fields.push({
            name: title,
            value: f.join("\n"),
            inline: true,
          });
        }
      });

      const message = new EmbedBuilder().addFields(fields);
      embeds.push(message);
    }
    return embeds;
  }
}
