/**
 * Configures guild settings
 * 
 * Currenly does:
 * 	Guild prefix
 * 	Server time zone
 * 	Autodelte messages for
 * 		-prefix
 * 		-user
 * 	Set up message archive
 * 
 * @file   Configures guild settings
 * @author Andrew Everman.
 * @since  19.7.2020 
 */

import { CommandParams, commandProperties } from '../../bot'
import { Prompt} from '../../util/messageUtil'
import { Config } from '../../db/controllers/guildController'
import { ConfigUtil } from '../../util/generalUtil'

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
                    function: ConfigUtil.messageArchiveConfig,
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
