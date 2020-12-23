import { CommandParams, commandProperties } from '../../bot'
import { Prompt, Filter, replyUtil, sendToChannel } from '../../util/message.util'
import { moveMembers } from '../../util/discord.util'
import { AliasUtil } from '../../util/general.util'
import { Alias } from '../../db/controllers/guild.controller'

const command: commandProperties = {
    name: 'shake',
    description: 'Moves everyone in current channel to the main channel',
    aliases: ['s'],
    usage: '[user_id|alias]+',
    args: true,
    cooldown: 5 * 60,
    guildOnly: true,

    async execute(e: CommandParams) {
        try {
            const message = e.message
            const guild = e.message.guild!
            const afk_channel = await Alias.lookupAlias(guild.id, 'afk')
            if (!afk_channel) {
                replyUtil(message, `Couldn't find a channel with alias afk. Add one with the cretealias command.`)
                return
            }

            const afk = guild.channels.resolve(afk_channel.id)

            const { members } = await AliasUtil.parseChannelsAndMembers(guild, e.args, { member: message.member! })

            // for each person in the voice channel, shake them around
            members.forEach((member) => {
                if (member.voice.channel == null) return
                var original = member.voice.channel
                if (member.voice.channel != null) {
                    for (let i = 0; i < 10; i++) {
                        let channel = i % 2 == 0 ? afk : original
                        member.voice
                            .setChannel(channel)
                            .then()
                            .catch((err) => console.error(err))
                    }
                }
            })
        } catch (error) {
            throw error
        }
    },
}

export default command
