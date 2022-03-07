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


import { CommandInteraction } from 'discord.js'
import { SlashCommandBuilder } from '@discordjs/builders'
import { interEditReplyUtil, assertGuildTextCommand } from '../../util/interactionUtil'
import { CommandParams, commandProperties } from '../../bot'
import { replyUtil } from '../../util/messageUtil'
import { moveMembers } from '../../util/discordUtil'
import { Alias } from '../../db/controllers/guildController'
import { ChannelType } from 'discord-api-types'

const command = {
    data: new SlashCommandBuilder()
        .setName('po')
        .setDescription(`Brings everyone in the user's current voice channel to the designated main channel`),
    async execute(interaction: CommandInteraction) {
        try {
            await interaction.deferReply()


            const { userId, guild, guildId } = assertGuildTextCommand(interaction)

            const member = guild.members.cache.get(userId);
            if (member) {

                const voiceChannel = member.voice.channel;

                if (!voiceChannel) {
                    interEditReplyUtil(interaction, { content: 'Must be connected to voice to use this' }, { delete: true })
                    return
                }


                const channelAlias = 'main'
                const vcUsers = Array.from(member.voice.channel.members.entries()).map((x: any) => x[1])

                let aliasObj = await Alias.lookupAlias(guildId, channelAlias)
                let channelId
                if (aliasObj && aliasObj.type == 'voice') channelId = aliasObj.id
                else {
                    interEditReplyUtil(interaction, {
                        content:
                            `No channel aliased to "main". Use the createalias command to set a voice channel to main first to use this command. `
                    }, { delete: true })
                    return
                }
                moveMembers(channelId, vcUsers)

                interEditReplyUtil(interaction, { content: 'Party is over' })
            }
            else {

                interEditReplyUtil(interaction, { content: 'Error....' })
            }

        } catch (error: any) {
            if (error.name != "FilteredInputError") {
                throw error
            }

        }

    }
}


const commands: commandProperties = {
    name: 'partyover',
    aliases: ['po'],
    description: 'Move all users in your active voice channel to main. Make sure you hava a channel aliased as "main".',
    usage: '',
    cooldown: 0,
    guildOnly: true,
    args: false,
    async execute(e: CommandParams) {
        try {
            const member = e.message.member
            if (member == null) return undefined
            if (member.voice.channel == null) {
                replyUtil(e.message, 'Must be connected to voice to use this', true)
                return
            }
            const message = e.message
            if (!message.member) {
                return false
            }

            if (message.member.voice.channel == null) replyUtil(message, 'Need to be in voice channel to use this')
            // if not in voice channel they cant move people
            if (member.voice.channel.members == null) replyUtil(message, 'Need to be in voice channel to use this')

            const channel_alias = 'main'
            const vc_people = Array.from(member.voice.channel.members.entries()).map((x) => x[1])

            let alias_obj = await Alias.lookupAlias(message.guild!.id, channel_alias)
            let channel_id
            if (alias_obj && alias_obj.type == 'voice') channel_id = alias_obj.id
            else {
                replyUtil(
                    message,
                    `No channel aliased to "main". Use the createalias command to set a voice channel to main first to use this command. `
                )
                return
            }
            moveMembers(channel_id, vc_people)
        } catch (error) {
            throw error
        }
    },
}

export default command
