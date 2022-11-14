/**
 * Moves users to the aliases main channel
 *
 * Moves users in current channel of the command invoker to alias "main".
 * If it can't find one then it will tell them.
 *
 * @file   Moves users to main
 * @author Andrew Everman.
 * @since  17.7.2020
 */

import { ChatInputCommandInteraction} from 'discord.js'
import { SlashCommandBuilder } from '@discordjs/builders'
import { interReplyUtil, assertGuildTextCommand } from '../../util/interactionUtil'
import { moveMembers } from '../../util/discordUtil'
import { getAlias } from '../../db/controllers/aliasController'
import { AliasType, SpecialAliases } from '../../db/models/aliasModel'

const command = {
    data: new SlashCommandBuilder()
        .setName('po')
        .setDescription(`Brings everyone in the user's current voice channel to the designated main channel`),
    async execute(interaction: ChatInputCommandInteraction) {
        try {
            const { userId, guild, guildId } = assertGuildTextCommand(interaction)

            const member = guild.members.cache.get(userId)
            if (member) {
                const voiceChannel = member.voice.channel

                if (!voiceChannel) {
                    interReplyUtil(interaction, { content: 'Must be connected to voice to use this' }, { delete: true })
                    return
                }

                const aliasObj = await getAlias(guildId, SpecialAliases.mainVoice, AliasType.voiceChannel)
                const vcUsers = Array.from(member.voice.channel.members.entries()).map((x: any) => x[1])
                const channelId = aliasObj.id

                moveMembers(channelId, vcUsers)

                interReplyUtil(interaction, { content: 'Party is over' })
            } else {
                interReplyUtil(interaction, { content: 'Error....' })
            }
        } catch (error: any) {
            if (error.name != 'FilteredInputError') {
                throw error
            }
        }
    },
}

export default command
