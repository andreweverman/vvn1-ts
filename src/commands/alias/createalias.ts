import { CommandParams, commandProperties } from "../../bot";
import * as lodash from 'lodash';
import { TextChannel } from 'discord.js'
import { createAlias } from "../../db/controllers/guild.controller";
import { getSameUserInput, sameUserFilter } from "../../util/prompt.util";


const command: commandProperties = {
  name: 'createalias',
  aliases: ['ca', 'addalias'],
  args: false,
  description: 'Creates aliases for voice channels and users for certain ids. This is helpful for when you want to move someone',
  usage: 'Follow the prompts!',
  cooldown: 1,
  guildOnly: true,
  async execute(e: CommandParams) {
    console.log('in createalias');

    const userID = e.message.author.id;
    const textChannel = e.message.channel;

    const guildID = e.message.id;

    const gsuiResult = await getSameUserInput(userID, textChannel, 'Enter the id', sameUserFilter(userID))

    if (!gsuiResult) return false

    let j = 0;

    
  },
};


export default command;
