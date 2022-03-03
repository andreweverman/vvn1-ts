/**
 *
 * Event handler for when a message is sent
 *
 * The main event we care about.
 * This will run when a message is dm'd or sent in a guild it is in
 * This will execute the command
 * 
 * @file   Message sent event handler
 * @author Andrew Everman.
 * @since  29.10.2020
 */

import { Message, Collection, Client } from 'discord.js'
import { NumberConstants } from '../util/constants'
import { deleteMessage, replyUtil, sendToChannel } from '../util/messageUtil'
import { Config, Link } from '../db/controllers/guildController'
import playAudio from '../commands/indirect/playAudio'
import { IConfigDoc } from '../db/models/guildModel'
async function messageEvent(
	message: Message,
	client: Client,
): Promise<string> {
	return new Promise(async (resolve, reject) => {
		// getting the guild prefix if it is a guild message
		let configDoc: IConfigDoc | undefined = undefined
		let guildPrefix: string = ''
		const guildID: string | undefined = message.guild?.id
		if (guildID) {
			try {
				configDoc = await Config.getGuildConfig(guildID)
				guildPrefix = configDoc.prefix
			} catch (error) {
				console.error(error)
			}
		}

		// TODO: autodelete message flow here
		if (configDoc) {
			const autoDeletePrefix = configDoc.autodelete.find(
				(x) => message.content.startsWith(x.matchOn) && x.type == Config.AutoDeleteType.prefix
			)

			if (autoDeletePrefix) {
				const startsWithMatch = (str: string) => new RegExp(`^${autoDeletePrefix.matchOn}${str}`, 'i')
				const specified = autoDeletePrefix.specified.find((x) =>
					startsWithMatch(x.startsWith).test(message.content.trim())
				)
				const whitelisted = autoDeletePrefix.allowList.find((x) =>
					startsWithMatch(x).test(message.content.trim())
				)
				if (specified) {
					deleteMessage(message, specified.timeToDelete * NumberConstants.secs)
				}
				if ((!autoDeletePrefix.allowMode && !whitelisted) || (autoDeletePrefix.allowMode && whitelisted)) {
					deleteMessage(message, autoDeletePrefix.defaultDeleteTime)
				}
			}
			const autoDeleteMember = configDoc.autodelete.find(
				(x) => message.author.id == x.matchOn && x.type == Config.AutoDeleteType.user
			)

			if (autoDeleteMember) {
				const startsWithMatch = (str: string) => new RegExp(`${str}`, 'i')
				const specified = autoDeleteMember.specified.find((x) =>
					startsWithMatch(x.startsWith).test(message.content.trim())
				)
				const whitelisted = autoDeleteMember.allowList.find((x) =>
					startsWithMatch(x).test(message.content.trim())
				)
				if (specified) {
					deleteMessage(message, specified.timeToDelete * NumberConstants.secs)
				}
				if ((!autoDeleteMember.allowMode && !whitelisted) || (autoDeleteMember.allowMode && whitelisted)) {
					deleteMessage(message, autoDeleteMember.defaultDeleteTime)
				}
			}
		}


	})
}

export default messageEvent
