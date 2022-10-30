/**
 * Moves users between voice channels
 *
 * Parses string for user and channel aliases and moves accordingly.
 * Will always use the first voice channel to move (for now).
 *
 * @file   Moves users from move command
 * @author Andrew Everman.
 * @since  17.7.2020
 */

import { CommandParams, commandProperties } from '../../bot'
import { replyUtil, sendToChannel } from '../../util/messageUtil'
import { moveMembers } from '../../util/discordUtil'
import { AliasUtil } from '../../util/generalUtil'
import { VoiceChannel } from 'discord.js'
import { CommandInteraction } from 'discord.js'
import { SlashCommandBuilder } from '@discordjs/builders'
import { interReplyUtil, assertGuildTextCommand } from '../../util/interactionUtil'
import { ChannelType } from 'discord-api-types'
let z = ChannelType.GuildVoice.toString()

const command = {
    data: new SlashCommandBuilder()
        .setName('move')
        .setDescription(`Moves the users from one channel to anotherl`)
        .addChannelOption(option => option.addChannelType(ChannelType.GuildVoice).setRequired(true).setName('destination').setDescription('The end destination for the users').setRequired(true))
        .addChannelOption(option => option.addChannelType(ChannelType.GuildVoice).setRequired(true).setName('orgin').setDescription('The end destination for the users').setRequired(false)),
    async execute(interaction: CommandInteraction) {
        try {
            await interaction.deferReply()

            const { userId, guild } = assertGuildTextCommand(interaction)



            const member = guild.members.cache.get(userId);
            if (member) {

                const voiceChannel = member.voice.channel;

                if (!voiceChannel) {
                    interReplyUtil(interaction, { content: 'Must be connected to voice to use this' }, { delete: true })
                    return
                }

                const moveChannel = interaction.options.getChannel('destination', true) as VoiceChannel
                const orginChannel = (interaction.options.getChannel('destination', false) as VoiceChannel | null) || member.voice.channel


                if (moveChannel.id != orginChannel.id) {

                    let vcPeople = Array.from(orginChannel.members.entries()).map((x) => x[1])

                    if (moveChannel) {
                        moveMembers(moveChannel, vcPeople)
                    }
                }

                interReplyUtil(interaction, { content: 'Move complete' })
            }
            else {

                interReplyUtil(interaction, { content: 'Error....' })
            }
        } catch (error: any) {
            if (error.name != "FilteredInputError") {
                throw error
            }

        }

    }
}





const commandz: commandProperties = {
    name: 'move',
    aliases: ['m'],
    description:
        'Command line way to move users. Move all users with no arguments. Move specific users by using @ or using an alias. Move all BUT users by using -n before putting users\nThe last voice channel is always the destination',
    usage: `Ex. m me main. Moves you to main channel. \nEx. m jarod havana. Moves jarod to havana`,
    args: true,
    cooldown: 0,
    guildOnly: true,
    async execute(e: CommandParams) {
        try {
            if (!e.message.member) return undefined
            if (!e.message.guild) return undefined

            const member = e.message.member
            if (member.voice.channel == null) {
                replyUtil(e.message, 'Must be connected to voice to use this', true)
                return
            }
            let vcPeople = Array.from(member.voice.channel.members.entries()).map((x) => x[1])

            let { members, moveChannel } = await AliasUtil.parseChannelsAndMembers(
                e.message.guild,
                e.args,
                {
                    member: e.message.member,
                    moveMode: true,
                })

            if (moveChannel && moveChannel instanceof VoiceChannel && members) {
                members.length > 0 ? moveMembers(moveChannel, members) : moveMembers(moveChannel, vcPeople)
            }
        } catch (error) {
            throw error
        }
    },
}

export default command
