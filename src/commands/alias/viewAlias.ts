import { CommandParams, commandProperties } from "../../bot";
import * as lodash from 'lodash';
import { TextChannel, Message, MessageEmbed } from 'discord.js'
import { Alias } from "../../db/controllers/guild.controller";
import { Prompt, Filter, sendToChannel } from "../../util/message.util";
import { extractActiveUsers, extractChannels } from "../../util/discord.util"
import { NumberConstants } from "../../util/constants";

const command: commandProperties = {
  name: 'viewalias',
  aliases: ['va', 'lookupalias'],
  args: false,
  description: 'View existing aliases for users and channels',
  usage: 'Follow the prompts!',
  cooldown: 1,
  guildOnly: true,



  execute(e: CommandParams) {
    return new Promise((resolve, reject) => {

      const options: Prompt.optionSelectElement[] = [
        { name: 'View alias for yourself', function: selectSelf },
        { name: 'View alias for a specified id', function: selectID }
      ]

      Prompt.optionSelect(e.message.author.id, e.message.channel, options).catch((error) => {
        throw error;
      })

      async function selectSelf() {
        getAliases(e.message.author.id).catch((error) => {
          throw error;
        })
      }

      async function selectID() {
        const prompt = 'Please reply with the id for a user or channel:';

        const selectFilters: Filter.multipleFiltersInput = {
          some: [
            Filter.validUserFilter(e.message.guild!),
            Filter.validChannelFilter(e.message.guild!)
          ]
        }
        const filter = Filter.multipleFilters(selectFilters);

        Prompt.getSameUserInput(
          e.message.author.id,
          e.message.channel,
          prompt,
          filter
        ).then((m: Message) => {
          const id = m.content.trim()
          getAliases(id).catch((error) => {
            throw error;
          });
        })
          .catch((error) => {
            Prompt.handleGetSameUserInputError(error, reject);
          })
      }

      async function getAliases(id: string) {
        Alias.getAliasesByID(e.message.guild!.id, id).then(aliases => {
          let msg: string | MessageEmbed;
          if (aliases == undefined) {
            msg = "There are no aliases for this id";
          } else {
            let content: string = aliases.map(x => x.name).join('\n');
            msg = new MessageEmbed().addField(`Aliases for id: ${id}`, content, true);
          }

          sendToChannel(e.message.channel, msg, true, 1 * NumberConstants.mins).then(x => {
            resolve(true)
          }).catch((error) => {
            throw error
          })
        }).catch(error => {
          Prompt.handleGetSameUserInputError(error, reject);
        })
      }

    })
  },
};


export default command;
