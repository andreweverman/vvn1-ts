import { CommandParams, commandProperties } from '../../bot'
import { Prompt, Filter,sendToChannel } from '../../util/message.util'
import { Link, Guild, Config } from '../../db/controllers/guild.controller'
import { ILink, ILinkDoc } from '../../db/models/guild.model'
import { MessageEmbed,TextChannel } from 'discord.js'
import { linkRegex, youtubeRegex } from '../../util/string.util'
import { ConfigUtil } from '../../util/general.util'
import { NumberConstants } from '../../util/constants'

const command: commandProperties = {
    name: 'rando',    
    description: 'Creates a temporary link to join. If the user doesnt get a role within 24 hours they get kicked',
    aliases: ['tempinvite', 'invite'],
    usage: ', then follow the prompts',
    cooldown: 0,
    args: false,
    guildOnly: true,

    async execute(e: CommandParams) {
        try {
            const userID = e.message.author.id
            const textChannel = e.message.channel as TextChannel
            const link = await  textChannel.createInvite({temporary:true,reason:`${userID} requested temp invite from vvn1`})
            sendToChannel(textChannel,`Temporary invite link: ${link.toString()}`,true,10*NumberConstants.mins)            
            
        } catch (error) {
            Prompt.handleGetSameUserInputError(error)
        }
    },
}

export default command
