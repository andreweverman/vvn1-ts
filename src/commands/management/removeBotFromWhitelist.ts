/**
 * @file   Removes bot user from whitelist. 
 * @author Andrew Everman.
 * @since  14.11.2022
 */

import { ChatInputCommandInteraction, CommandInteraction } from 'discord.js'
import { SlashCommandBuilder } from '@discordjs/builders'
import { interReplyUtil, assertGuildTextCommand, interEditReplyUtil } from '../../util/interactionUtil'
import { addWhitelist, isBotWhitelisted, removeWhitelist } from '../../db/controllers/botWhitelistController'

const command = {
    data: new SlashCommandBuilder()
        .setName('removebotfromwhitelist')
        .setDescription(`Removes bot user from whitelist (messages will get deleted)`)
        .addUserOption((option) => option.setName('bot').setDescription('The bot to not whitelist').setRequired(true)),
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
            if (!botWhitelisted) {
                interEditReplyUtil(interaction, { content: `${bot.username} was not whitelisted. No changes made.`})
                return
            }

            const res = await removeWhitelist(guildId, bot.id)
            if (res){
                interEditReplyUtil(interaction, { content: `${bot.username} has been removed from the whitelist` })
            }
            else{
                interEditReplyUtil(interaction, { content: `Error removing ${bot.username} from the whitelist` })
            }
            
        } catch (error: any) {
            if (error.name != 'FilteredInputError') {
                throw error
            }
        }
    },
}

export default command
