import { CommandParams, commandProperties } from '../../bot'
import { Prompt } from '../../util/message.util'
import { Link } from '../../db/controllers/guild.controller'
import { MessageEmbed } from 'discord.js'

const command: commandProperties = {

    name: 'createlink',
    aliases: ['cl', 'al', 'addlink'],
    args: false,
    description: 'Creates dynamic commands for linking websites or playing youtube clips',
    usage: `Use createlink for the bot to save a youtube video to broadcast or an alias to a specific link.\nFollow the prompts!`,
    cooldown: 1,
    guildOnly: true,

    execute(e: CommandParams) {
        return new Promise(async (resolve, reject) => {

            const guildID = e.message.guild!.id;
            const userID = e.message.author.id;
            const textChannel = e.message.channel;

            async function promptType() {
                const array = Object.values(Link.LinkTypes);
                const msg = new MessageEmbed();
                msg.title = 'Create Link';
                const typeOptions = Prompt.arraySelect(userID, textChannel, array, msg);



            }

            async function promptLink() {

            }

            async function promptNames() {

            }

            async function promptVolume() {

            }


        })
    }
}


export default command;