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

import { CommandParams, commandProperties } from '../../bot'
import { replyUtil } from '../../util/messageUtil'
import { moveMembers } from '../../util/discordUtil'
import { Alias } from '../../db/controllers/guildController'

const command: commandProperties = {
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
