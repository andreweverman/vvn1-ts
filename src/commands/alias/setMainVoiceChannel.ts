import { Channel, ChannelType, ChatInputCommandInteraction, CommandInteraction, PermissionFlagsBits } from 'discord.js'
import { SlashCommandBuilder } from '@discordjs/builders'
import { interReplyUtil, assertGuildTextCommand } from '../../util/interactionUtil'
import { setAlias } from '../../db/controllers/aliasController'
import { AliasType, SpecialAliases } from '../../db/models/aliasModel'

const command = {
    data: new SlashCommandBuilder()
        .setName('setmainvoicechannel')
        .setDescription('Sets the main channel for use with /po')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption((option) =>
            option
                .setName('channel')
                .setDescription('The channel to be aliased')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildVoice)
        ),
    async execute(interaction: ChatInputCommandInteraction) {
        try {
            const { guildId } = assertGuildTextCommand(interaction)
            const channel = interaction.options.getChannel('channel')!

            const res = await setAlias(guildId, SpecialAliases.mainVoice, channel.id, AliasType.voiceChannel)
            if (!res.errors) {
                interReplyUtil(interaction, { content: 'Created alias' })
            } else {
                interReplyUtil(interaction, { content: 'Error creating alias' })
            }
        } catch (error: any) {
            if (error.name != 'FilteredInputError') {
                throw error
            }
        }
    },
}

export default command
