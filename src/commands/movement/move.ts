import { CommandParams, commandProperties } from '../../bot'
import { Prompt, Filter, replyUtil, sendToChannel } from '../../util/message.util'
import { moveMembers } from '../../util/discord.util'
import { AliasUtil } from '../../util/general.util'

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
            const member = e.message.member
            if (member.voice.channel == null) {
                replyUtil(e.message, 'Must be connected to voice to use this', true)
                return
            }
            let vc_people = Array.from(member.voice.channel.members.entries()).map((x) => x[1])

            let { members, voiceChannels } = await AliasUtil.parseChannelsAndMembers(e.message.guild!, e.args, {
                member: e.message.member,
                moveMode: true,
            })

            if (voiceChannels.length == 0) {
                sendToChannel(e.message.channel, "Could't find any voice channels to move to in your message.")
                return
            }

            members.length > 0 ? moveMembers(voiceChannels[0], members) : moveMembers(voiceChannels[0], vc_people)
        } catch (error) {
            throw error
        }
    },
}

export default command
