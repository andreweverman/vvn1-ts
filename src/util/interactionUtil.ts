import { MessageActionRow, MessageButton, Message, MessageEmbed, MessageSelectMenu, MessageSelectOptionData, SelectMenuInteraction, TextBasedChannels, Guild, EmbedFieldData, InteractionReplyOptions, User, CommandInteraction, TextChannel, } from 'discord.js'
import { NumberConstants } from '../util/constants'
import { GeneralFilter } from './promptUtil'


export namespace InteractionFilters {

	export function regexFilter(regex: RegExp, trimInput?: boolean): (input: string) => boolean {
		return (input: string) => { return GeneralFilter.regexFilter(input, regex, trimInput) }
	}
}

export interface InterReplyUtilOptions {
	timeout?: number;
	delete?: boolean
}
export function interReplyUtil(interaction: CommandInteraction, payload: InteractionReplyOptions, options?: InterEditReplyUtilOptions) {

	if (!payload.embeds) payload.embeds = []
	if (!payload.components) payload.components = []
	if (!payload.content) payload.content = ' '

	interaction.reply(payload).catch((err) => { })

	if (options?.delete != false) {
		setTimeout(() => {
			interaction.deleteReply()
		},
			options?.timeout || 15 * NumberConstants.secs)
	}

}
export interface InterEditReplyUtilOptions {
	timeout?: number;
	delete?: boolean
}
export function interEditReplyUtil(interaction: CommandInteraction, payload: InteractionReplyOptions, options?: InterEditReplyUtilOptions) {

	if (!payload.embeds) payload.embeds = []
	if (!payload.components) payload.components = []
	if (!payload.content) payload.content = ' '

	interaction.editReply(payload).catch((err) => { })

	if (options?.delete != false) {
		setTimeout(() => {
			interaction.deleteReply()
		},
			options?.timeout || 15 * NumberConstants.secs)
	}

}

export interface AssertGuildTextCommandResponse {
	guildId: string,
	textChannel: TextChannel
	guild: Guild
	user: User
	userId: string
}
export function assertGuildTextCommand(interaction: CommandInteraction): AssertGuildTextCommandResponse {
	const textChannel = interaction.channel as TextChannel
	const guildId = interaction.guildId
	const guild = interaction.guild
	const user = interaction.user
	const userId = interaction.user.id

	if (!(guildId && textChannel && guild)) {
		interaction.reply(`Must use this command from a server's text channel to use this command`)
		throw 'Not voice channel'
	}
	return { guild, guildId, textChannel, user, userId }
}

export interface ReplyWithArrayOptions<T> {
	disableSelection?: boolean
	describeFunction?: (t: T) => string,
	deleteAfter?: number,
	chunkSize?: number,
	deleteWhenDone?: boolean
}
export async function replyWithFlayedArray<T>(interaction: CommandInteraction, title: string, arr: T[], mapFunction: (t: T) => string, options?: ReplyWithArrayOptions<T>): Promise<T | undefined> {
	const embeds: MessageEmbed[] = []
	const allOptions: MessageSelectOptionData[][] = []
	const chunk = options?.chunkSize || 15
	const selectValueOptions: InteractionPrompt.SelectValueOptions = {}
	selectValueOptions.disableSelection = options?.disableSelection
	selectValueOptions.time = options?.deleteAfter
	selectValueOptions.deleteWhenDone = options?.deleteWhenDone

	const maxLength = 1000

	let i: number, j: number
	for (i = 0, j = arr.length; i < j; i += chunk) {
		const fields: EmbedFieldData[] = []
		let option: MessageSelectOptionData[] = []
		let f: string[] = []
		let curLength = 0
		const linkChunk = arr.slice(i, i + chunk)
		linkChunk.forEach((x, k) => {
			const entry = `${mapFunction(x)}`

			const description = `${options?.describeFunction ? options.describeFunction(x) : ''}`
			option.push({ label: entry, value: (i * chunk + k).toString() })
			if (description) option[option.length - 1].description = description
			const isUnder = curLength + entry.length < maxLength
			if (isUnder) {
				f.push(entry)
				curLength += entry.length
			}
			if (!isUnder) {
				fields.push({
					name: title,
					value: f.join('\n'),
					inline: true,
				})
				f = []
				f.push(entry)
				curLength = 0
			}

			if (k == linkChunk.length - 1) {
				fields.push({
					name: title,
					value: f.join('\n'),
					inline: true,
				})
			}
		})

		const message = new MessageEmbed().addFields(fields)
		embeds.push(message)
		allOptions.push(option)
	}
	try {
		const idx = await InteractionPrompt.selectValue(interaction, embeds, allOptions, selectValueOptions)
		return idx >= 0 ? arr[idx] : undefined
	} catch (error) {

		console.log(error)
	}

}

export enum FilterInputTypes {
	STRING = 'STRING',
	BOOLEAN = 'BOOLEAN',
	NUMBER = 'NUMBER',
}
export interface GetFilteredInputOptions {
	allowError?: boolean
}
export function getFilteredInput(interaction: CommandInteraction, inputName: string, inputType: FilterInputTypes, filter: (x: any) => boolean, errorMessage: string, options?: GetFilteredInputOptions): any {
	let valid = false
	if (inputType == FilterInputTypes.STRING) {
		const inputString = interaction.options.getString(inputName)
		valid = filter(inputString)
		if (valid && inputString) {
			return inputString.trim()
		}
	}
	if (!valid) {
		interEditReplyUtil(interaction, { content: errorMessage })
		throw new FilteredInputError('Failed filtered input')
	}
}

class FilteredInputError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "FilteredInputError";
	}
}

export namespace InteractionPrompt {

	export interface SelectValueOptions {
		disableSelection?: boolean
		time?: number;
		allowOtherUsersToInteract?: boolean,
		deleteWhenDone?: boolean
	}
	export async function selectValue(interaction: CommandInteraction, embeds: MessageEmbed[], allOptions: MessageSelectOptionData[][], options?: SelectValueOptions): Promise<number> {
		return new Promise(async (resolve: any, reject: any) => {
			async function done(num: number) {
				if (options?.deleteWhenDone) {
					await interaction.deleteReply().catch(err => { })
				}
				resolve(num)
			}
			let i = 0
			const time = options?.time ? options.time : 5 * NumberConstants.mins
			const allowOtherUsersToInteract = options?.allowOtherUsersToInteract ? true : false
			const allowOptions = allOptions.length > 0 && !options?.disableSelection
			const getComponents = (backDisabled: boolean, forwardDisabled: boolean) => {
				const comps = [paginationButtons({ backDisabled, forwardDisabled }),]
				if (allowOptions) comps.push(buildSelect(allOptions[i]))
				return comps
			}

			const message = await interaction.editReply({ content: ' ', embeds: [embeds[i]], components: getComponents(true, embeds.length <= 1) }) as Message
			const paginationCollector = message.createMessageComponentCollector({ componentType: 'BUTTON', time: time });



			const embedsEnd = embeds.length - 1
			paginationCollector.on('collect', async collected => {

				if (!allowOtherUsersToInteract && (collected.user.id !== interaction.user.id)) {
					collected.reply({ content: `These buttons aren't for you!`, ephemeral: true })
					return;
				}
				if (collected.customId === "back") {
					i -= 1
				}
				if (collected.customId === "forward") {
					i += 1
				}

				if (collected.customId === "allthewayback") {
					i = 0
				}
				if (collected.customId === "allthewayforward") { i = embedsEnd }

				let backDisabled = i == 0
				let forwardDisabled = i == embedsEnd

				collected.update({ content: ' ', embeds: [embeds[i]], components: getComponents(backDisabled, forwardDisabled) })
			});

			paginationCollector.on('end', collected => {
				done(-1)
			});

			if (allowOptions) {

				const selectCollector = message.createMessageComponentCollector({ componentType: 'SELECT_MENU', time: time });

				selectCollector.on('collect', async function (collected: SelectMenuInteraction) {
					if (!allowOtherUsersToInteract && (collected.user.id !== interaction.user.id)) {
						collected.reply({ content: `These buttons aren't for you!`, ephemeral: true })
						return;
					}

					collected.update({ content: ' ' })
					setTimeout(() => {
						// collected.deleteReply()
					}, 10 * NumberConstants.secs)
					done(parseInt(collected.values[0]))

				});

				selectCollector.on('end', collected => {
				});
			}


		})
	}


	export function paginationButtons(options?: { backDisabled?: boolean, forwardDisabled?: boolean }) {
		const backDisabled = options?.backDisabled ? true : false
		const forwardDisabled = options?.forwardDisabled ? true : false
		const row = new MessageActionRow()
			.addComponents(
				new MessageButton()
					.setCustomId('allthewayback')
					.setLabel('⏪️')
					.setStyle('SECONDARY').setDisabled(backDisabled))
			.addComponents(
				new MessageButton()
					.setCustomId('back')
					.setLabel('⬅️')
					.setStyle('SECONDARY').setDisabled(backDisabled),
			).addComponents(
				new MessageButton()
					.setCustomId('forward')
					.setLabel('️➡️')
					.setStyle("SECONDARY").
					setDisabled(forwardDisabled))
			.addComponents(
				new MessageButton()
					.setCustomId('allthewayforward')
					.setLabel('️⏩️')
					.setStyle("SECONDARY").
					setDisabled(forwardDisabled))


		return row
	}

	function buildSelect(options: MessageSelectOptionData[]) {
		return new MessageActionRow()
			.addComponents(
				new MessageSelectMenu()
					.setCustomId('select')
					.setPlaceholder('Nothing selected')
					.addOptions(options))

	}
}
