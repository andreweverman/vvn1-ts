import { CommandParams, commandProperties } from "../../bot";
import * as lodash from 'lodash';
import * as Discord from 'discord.js'
import { createAlias } from "../../db/controllers/guild.controller";


const command: commandProperties = {
  name: 'createalias',
  aliases: ['ca', 'addalias'],
  args: false,
  description: 'Creates aliases for voice channels and users for certain ids. This is helpful for when you want to move someone',
  usage: 'Follow the prompts!',
  cooldown: 1,
  guildOnly: true,
  execute(p: CommandParams) {
    console.log('in createalias');

    const guildID = p.message.id;

    

  },
};


export default command;
