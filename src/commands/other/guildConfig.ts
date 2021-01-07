import { CommandParams, commandProperties } from '../../bot'
import { Prompt, Filter } from '../../util/message.util'
import { Link, Guild, Config } from '../../db/controllers/guild.controller'
import { ILink, ILinkDoc } from '../../db/models/guild.model'
import { MessageEmbed } from 'discord.js'
import { linkRegex, youtubeRegex } from '../../util/string.util'
import { ConfigUtil } from '../../util/general.util'

const command: commandProperties = {
    name: 'guildconfig',
    description: 'Sets up configurations for this server',
    aliases: ['cfg', 'config'],
    usage: ', then follow the prompts',
    cooldown: 0,
    args: false,
    guildOnly: true,

    async execute(e: CommandParams) {
        try {
            const guildID = e.message.guild!.id
            const userID = e.message.author.id
            const textChannel = e.message.channel

            const configDoc = await Config.getGuildConfig(guildID)

            if (!configDoc) {
                throw new Error('No no config doc')
            }

            const args: ConfigUtil.ConfigUtilFunctionArgs = {
                guildID: guildID,
                client:e.client,
                guild: e.message.guild!,
                currentConfig: configDoc,
                textChannel: textChannel,
                userID: userID,
            }

            const options: Prompt.optionSelectElement[] = [
                {
                    name: `Set server prefix (currently ${configDoc.prefix})`,
                    function: ConfigUtil.setNewPrefix,
                    args: args,
                },
                {
                    name: `Set the server time zone (currently ${configDoc.tz.name})`,
                    function: ConfigUtil.setNewTimeZone,
                    args: args,
                },
                {
                    name: 'Set which prefixes auto delete messages',
                    function: ConfigUtil.setPrefixAutoDelete,
                    args: args,
                },
                {
                    name: 'Set which users auto delete messages',
                    function: ConfigUtil.setUserAutoDelete,
                    args: args,
                },
                {
                    name: 'Configure message archive',
                    function: ConfigUtil.newMessageArchiveSetup,
                    args: args,
                },
            ]

            Prompt.optionSelect(userID, textChannel, options)
        } catch (error) {
            Prompt.handleGetSameUserInputError(error)
        }
    },
}

export default command
