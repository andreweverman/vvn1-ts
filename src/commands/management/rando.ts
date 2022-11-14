/**
 * Creates a temporary guild invite
 * 
 * This will create and send an invite in the text channel the command was invoked
 * This invite will kick the user that is brought in with this invite if not given a role within 
 * a certain amount of time, currently 4hr I believe.
 * 
 * @file   Creates temp invite to guild
 * @author Andrew Everman.
 * @since  12.2.2021
 */



import { CommandParams, commandProperties } from '../../bot'
import { Prompt, sendToChannel } from '../../util/messageUtil'
import { ChatInputCommandInteraction, TextChannel } from 'discord.js'
import { NumberConstants } from '../../util/constants'
import { CommandInteraction } from 'discord.js'
import { SlashCommandBuilder } from '@discordjs/builders'
import { interReplyUtil, assertGuildTextCommand } from '../../util/interactionUtil'
import { moveMembers } from '../../util/discordUtil'

const command = {
    data: new SlashCommandBuilder()
        .setName('rando')
        .setDescription(`Creates temporary invite for a random person`),
    async execute(interaction: ChatInputCommandInteraction) {
        try {


            const { userId, textChannel } = assertGuildTextCommand(interaction)

            const link = await textChannel.createInvite({ temporary: true, reason: `${userId} requested temp invite from vvn1` })
            interReplyUtil(interaction, { content: `Temporary invite link: ${link.toString()}` }, { timeout: 10 * NumberConstants.mins })

        } catch (error: any) {
            if (error.name != "FilteredInputError") {
                throw error
            }

        }

    }
}




export default command
