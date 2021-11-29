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

const command: commandProperties = {
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
