/**
 * Shakes a user to wake them up
 *
 * Moves the user back and forth from their current channel to afk.
 * This will hopefully wake them up.
 *
 * @file   Shakes a user
 * @author Andrew Everman.
 * @since  16.7.2020
 */

import { CommandInteraction, VoiceChannel } from 'discord.js'
import { assertGuildTextCommand } from '../../util/interactionUtil'
import {} from '../../bot'

const command = {
    type: 2,
    name: 'Shake',
    async execute(interaction: CommandInteraction) {
        try {
            const { guild } = assertGuildTextCommand(interaction)

            const shakee = interaction.options.getUser('user')!
            const member = guild.members.cache.get(shakee.id)!
            const afk = guild.channels.resolve(guild.afkChannel!) as VoiceChannel

            if (member.voice.channel == null) return
            let original = member.voice.channel
            if (member.voice.channel != null) {
                for (let i = 0; i < 10; i++) {
                    let channel = i % 2 == 0 ? afk : (original as VoiceChannel)
                    member.voice
                        .setChannel(channel)
                        .then()
                        .catch((err: any) => console.error(err))
                }
            }
        } catch (error: any) {
            if (error.name != 'FilteredInputError') {
                throw error
            }
        }
    },
}

export default command
