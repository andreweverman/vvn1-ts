/**
 * @file   Adds bot user to whitelist. This will make vvn1 not delete their messages
 * @author Andrew Everman.
 * @since  14.11.2022
 */

import { NumberConstants } from '../../util/constants'
import { ChatInputCommandInteraction, CommandInteraction } from 'discord.js'
import { SlashCommandBuilder } from '@discordjs/builders'
import { interReplyUtil, assertGuildTextCommand, interEditReplyUtil } from '../../util/interactionUtil'
import { addWhitelist, isBotWhitelisted } from '../../db/controllers/botWhitelistController'

const command = {
    data: new SlashCommandBuilder()
        .setName('addbottowhitelist')
        .setDescription(`Adds bot user to whitelist (messages won't get deleted)`)
        .addUserOption((option) => option.setName('bot').setDescription('The bot to whitelist').setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction) {
        try {
            await interaction.deferReply()
            const {  guildId } = assertGuildTextCommand(interaction)

            const bot = interaction.options.getUser('bot', true)
            if (!bot.bot) {
                interEditReplyUtil(interaction, { content: 'User supplied must be a bot' })
                return
            }

            const botWhitelisted = await isBotWhitelisted(guildId,bot.id)
            if (botWhitelisted) {
                interEditReplyUtil(interaction, { content: `${bot.username} is already in the whitelist` })
                return
            }

            const res = await addWhitelist(guildId, bot.id)
            if (res){
                interEditReplyUtil(interaction, { content: `${bot.username} has been added to the whitelist` })
            }
            else{
                interEditReplyUtil(interaction, { content: `Error adding ${bot.username} to the whitelist` })
            }
            
        } catch (error: any) {
            if (error.name != 'FilteredInputError') {
                throw error
            }
        }
    },
}

export default command
