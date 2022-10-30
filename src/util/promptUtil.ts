
import { timeInPast, TimeInPastOptions, dateInPast } from './timeUtil'
import { Collection, GuildEmoji, Message } from 'discord.js'
import { stringMatch, matchOptions, spaceCommaRegex, guildEmojiRegex } from './stringUtil'

export namespace GeneralFilter {
	export function anyFilter(): boolean {
		return true
	}

	// both are inclusive
	export interface numberRangeFilterOptions {
		integerOnly?: boolean
		multipleInputAllowed?: boolean
	}
	export function numberRangeFilter(
		input: string,
		min: number,
		max: number,
		options?: numberRangeFilterOptions
	): boolean {
		const multiple = options?.multipleInputAllowed == true
		const parseFunc = options?.integerOnly == false ? parseFloat : parseInt

		const validNumber = function (content: string): boolean {
			const num_resp = parseFunc(content)
			return num_resp != NaN && num_resp <= max && num_resp >= min
		}

		const trimmedContent = input.trim()
		return multiple ? trimmedContent.split(' ').every((x) => validNumber(x)) : validNumber(trimmedContent)
	}

	export function quitFilter(input: string): boolean {
		return input.trim().toLowerCase() == 'quit'
	}

	export function sameUserFilter(authorId: string, userID: string): boolean {
		return authorId === userID
	}

	export function uniqueInputFilter(input: string, inputs: string[]): boolean {
		return !inputs.includes(input.trim())
	}

	export function stringFilter(input: string, str: string, options: matchOptions): boolean {
		const regex = stringMatch(str, options)
		const minLengthEnabled: boolean = options.minLength != undefined
		const maxLengthEnabled: boolean = options.maxLength != undefined
		let filterLength: any = () => true
		if (minLengthEnabled || maxLengthEnabled) {
			filterLength = (str: string): boolean => {
				if (options.minLength != undefined) {
					if (str.length < options.minLength) {
						return false
					}
				}
				if (options.maxLength != undefined) {
					if (str.length > options.maxLength) {
						return false
					}
				}
				return true
			}
		}

		const inputStr = options.trimInput == false ? input : input.trim()
		return regex.test(inputStr) && filterLength(inputStr)

	}

	export function stringLengthFilter(input: string, maxLength = 0, minLength = 0): boolean {
		const content = input.trim()
		return content.length >= minLength && content.length <= maxLength
	}

	export function regexFilter(input: string, regex: RegExp, trimInput = true): boolean {
		return regex.test(trimInput ? input.trim() : input)
	}

	export function notInPastFilter(input: string, timeZoneName: string, options?: TimeInPastOptions): boolean {
		const inPast = timeInPast(timeZoneName, input.trim(), options)
		return !inPast
	}

	export function dateNotInPastFilter(input: string, timeZoneName: string): boolean {
		const inPast = dateInPast(timeZoneName, input.trim())
		return !inPast
	}

	export function validEmojiFilter(input: string, cache: Collection<string, GuildEmoji>): boolean {
		const name = input.trim()
		const guild_emoji = guildEmojiRegex.test(name)
		let validGuildEmoji: GuildEmoji | undefined = undefined
		if (guild_emoji) {
			validGuildEmoji = cache.find((x) => {
				let val = `<:${x.identifier}>` == name
				return val
			})
		}
		return validGuildEmoji != undefined
	}
}

