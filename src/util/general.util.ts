import {
	GuildMember,
	VoiceChannel,
	TextChannel,
	Guild as GuildD,
	GuildChannel,
} from "discord.js";
import {
	selfPronouns,
	groupPronouns,
	NumberConstants,
} from "../util/constants";
import { Guild, Link, Movie, Config } from "../db/controllers/guild.controller";
import { extractVCMembers } from "../util/discord.util";
import { linkRegex, spaceCommaRegex, youtubeRegex } from "../util/string.util";
import {
	Filter,
	Prompt as MPrompt,
	MessageChannel,
	Prompt,
	sendToChannel,
} from "../util/message.util";
import {
	IConfigDoc,
	ILinkDoc,
	IAutoDeletePrefix,
	IAutoDeletePrefixDoc,
} from "../db/models/guild.model";
import moment from "moment-timezone";
import { updateOneResponseHandler } from "../db/db.util";

export namespace AliasUtil {
	export interface parseChannelAndMembersResponse {
		members: GuildMember[];
		voiceChannels: GuildChannel[];
		textChannels: GuildChannel[];
		moveChannel?: GuildChannel;
	}
	export interface parseChannelsAndMembersOptions {
		member?: GuildMember;
		moveMode?: boolean;
	}
	export async function parseChannelsAndMembers(
		guild: GuildD,
		args: string[],
		options: parseChannelsAndMembersOptions
	): Promise<parseChannelAndMembersResponse> {
		const member = options.member;

		let members: GuildMember[] = [];
		const voiceChannels: GuildChannel[] = [];
		const textChannels: GuildChannel[] = [];
		let moveChannel;

		// first lets make everything either a string or the id
		let query: string[] = [];
		args.forEach((x) => {
			// seeing if gave a resolvable for user
			const user = guild.member(x);
			if (user) {
				members.push(user);
				return;
			}
			// seeing if gave a resolvable for channel
			const channel = guild.channels.resolve(x);
			if (channel) {
				channel.type == "voice"
					? voiceChannels.push(channel)
					: textChannels.push(channel);
				return;
			}

			let found: boolean = true;
			// either pronoun or need to lookup
			if (member && member.voice.channel) {
				if (groupPronouns.includes(x)) {
					Array.from(member.voice.channel.members.entries())
						.map((el) => el[1])
						.forEach((y) => members.push(y));
				} else if (selfPronouns.includes(x)) {
					members.push(member);
				} else if ("here".includes(x)) {
					if (member.voice.channel) voiceChannels.push(member.voice.channel);
				} else {
					found = false;
				}
			}
			if (!found) query.push(x);
		});

		// then we will look them up in the database
		if (query.length > 0) {
			const alias_doc = await Guild.getGuild(guild.id);
			// once we have the models down, we will separate the voice channels and users
			query.forEach(async (q) => {
				const name_regex = new RegExp(`^${q}$`, "i");
				const alias = alias_doc.aliases.find((x) => name_regex.test(x.name));
				let bad_alias = false;
				if (alias) {
					if (alias.type == "user") {
						// const obj = guild.member(alias.id);
						const obj = await guild.members.fetch(alias.id);
						obj ? members.push(obj) : (bad_alias = true);
					} else if (alias.type == "voice") {
						const obj = guild.channels.resolve(alias.id);
						obj && obj.type == alias.type
							? voiceChannels.push(obj)
							: (bad_alias = true);
					} else if (alias.type == "text") {
						const obj = guild.channels.resolve(alias.id);
						obj && obj.type == alias.type
							? textChannels.push(obj)
							: (bad_alias = true);
					} else {
						bad_alias = true;
					}

					if (bad_alias) {
						// alias that is unresolvable gets BOOTED
						// TODO: put the Alias.deleteAlias call here
					}
				}
			});
		}

		if (options.moveMode) {
			if (voiceChannels.length > 0)
				moveChannel = voiceChannels[voiceChannels.length - 1];
			//if they give multiple voice channels, the last is always the destination
			if (voiceChannels.length > 1) {
				const voice_channel_members = extractVCMembers(
					voiceChannels.slice(0, voiceChannels.length - 1)
				);
				if (Array.isArray(voice_channel_members))
					voice_channel_members.forEach((ch) => (members = members.concat(ch)));
				else members = members.concat(voice_channel_members);
			}
		}

		return {
			members: members,
			voiceChannels: voiceChannels,
			textChannels: textChannels,
			moveChannel: moveChannel,
		};
	}

	/* the prompting for things like the name and the other shit should be defined here and then the args in should be
        defined as just the single that is just called args. 
        each method header then can define an interface that the args should follow and that can then be used for 
        type safety!
    */
}

export namespace LinkUtil {
	export namespace Prompt {
		export interface promptLinkArgs {
			type: Link.LinkTypes;
			userID: string;
			textChannel: MessageChannel;
			currentLink?: ILinkDoc;
		}

		export async function promptLink(args: promptLinkArgs): Promise<string> {
			try {
				const regex =
					args.type === Link.LinkTypes.link ? linkRegex() : youtubeRegex();

				const m = await MPrompt.getSameUserInput(
					args.userID,
					args.textChannel,
					"Enter the link:",
					Filter.regexFilter(regex)
				);

				return m.content.trim();
			} catch (error) {
				throw error;
			}
		}

		export async function promptAddNames(
			args: promptLinkArgs
		): Promise<string[]> {
			try {
				const m = await MPrompt.getSameUserInput(
					args.userID,
					args.textChannel,
					"Enter the names for the link:",
					Filter.anyFilter()
				);

				return m.content.trim().split(" ");
			} catch (error) {
				throw error;
			}
		}

		export async function promptDeleteNames(
			args: promptLinkArgs
		): Promise<string[]> {
			try {
				if (!args.currentLink) {
					throw new Error("No link found");
				}

				const offset = 1;
				const currentNames = args.currentLink.names;
				const prompt = `Current names are: ${currentNames.map(
					(x, i) => `\n${offset + i}: ${x}`
				)}`;
				const names = await MPrompt.arraySelect(
					args.userID,
					args.textChannel,
					args.currentLink.names,
					prompt,
					{
						multiple: true,
						customOffset: offset,
					}
				);
				if (!Array.isArray(names)) {
					throw new Error("Expected an array");
				} else {
					return names;
				}
			} catch (error) {
				throw error;
			}
		}

		export async function promptVolume(args: promptLinkArgs): Promise<number> {
			try {
				const m = await MPrompt.getSameUserInput(
					args.userID,
					args.textChannel,
					`Enter the volume (0 to 1, ${
						args.currentLink
							? `currently: ${args.currentLink.volume}`
							: `default is .5)`
					})`,
					Filter.numberRangeFilter(0, 1, { integerOnly: false })
				);

				return Number.parseFloat(m.content.trim());
			} catch (error) {
				throw error;
			}
		}
	}
}

export namespace MovieUtil {
	export namespace Prompt {
		export interface promptMovieArgs {
			userID: string;
			textChannel: MessageChannel;
			guildID: string;
		}

		export async function promptMovieLink(
			args: promptMovieArgs
		): Promise<string> {
			try {
				const m = await MPrompt.getSameUserInput(
					args.userID,
					args.textChannel,
					"Enter the movie link:",
					Filter.regexFilter(linkRegex())
				);

				return m.content.trim();
			} catch (error) {
				throw error;
			}
		}

		export async function promptMovieName(
			args: promptMovieArgs
		): Promise<string> {
			try {
				const m = await MPrompt.getSameUserInput(
					args.userID,
					args.textChannel,
					"Enter the movie name:",
					Filter.anyFilter()
				);

				return m.content.trim();
			} catch (error) {
				throw error;
			}
		}

		export async function promptMoviePassword(
			args: promptMovieArgs
		): Promise<string> {
			try {
				const options: MPrompt.optionSelectElement[] = [
					{ name: "Default password", function: defaultPassword },
					{ name: "Enter custom password", function: customPassword },
					{ name: "No password", function: noPassword },
				];
				const m = await MPrompt.optionSelect(
					args.userID,
					args.textChannel,
					options
				);

				return m;

				async function defaultPassword(): Promise<string> {
					try {
						return await Movie.getMovieDefaultPassword(args.guildID);
					} catch (error) {
						throw error;
					}
				}

				async function customPassword(): Promise<string> {
					try {
						const m = await MPrompt.getSameUserInput(
							args.userID,
							args.textChannel,
							"Enter the zip file password: ",
							Filter.anyFilter()
						);

						return m.content.trim();
					} catch (error) {
						throw error;
					}
				}

				async function noPassword(): Promise<string> {
					return "";
				}
			} catch (error) {
				throw error;
			}
		}
	}
}

export namespace ConfigUtil {
	export interface ConfigUtilFunctionArgs {
		guildID: string;
		currentConfig: IConfigDoc;
		textChannel: MessageChannel;
		userID: string;
		prefix?: string;
	}

	export async function setNewPrefix(args: ConfigUtilFunctionArgs) {
		try {
			const m = await MPrompt.getSameUserInput(
				args.userID,
				args.textChannel,
				`Please enter the new prefix (currently ${args.currentConfig.prefix}): `,
				Filter.stringLengthFilter(1, 0)
			);
			await Config.setPrefix(args.guildID, m.content.trim(), args.textChannel);
		} catch (error) {
			Prompt.handleGetSameUserInputError(error);
		}
	}

	export async function setNewTimeZone(args: ConfigUtilFunctionArgs) {
		try {
			const offset = 1;
			const countries = moment.tz.countries();

			const countryPrompt = `Select a country code:\n${countries
				.map((x, i) => `${i + offset}. ${x}`)
				.join("\n")}`;

			const countryMessage = await MPrompt.arraySelect(
				args.userID,
				args.textChannel,
				countries,
				countryPrompt,
				{
					multiple: false,
					customOffset: offset,
				}
			);

			if (Array.isArray(countryMessage)) {
				throw new Error("Got an array when I should not have from arraySelect");
			}

			const country = countryMessage;

			const arr = moment.tz.zonesForCountry(country, true);
			const message = `Select a timezone:\n${arr
				.map((x, i) => `${i + offset}: ${x.name}, ${x.offset}`)
				.join("\n")}`;

			const m = await MPrompt.arraySelect(
				args.userID,
				args.textChannel,
				arr,
				message,
				{
					multiple: false,
					customOffset: offset,
				}
			);

			if (Array.isArray(m)) {
				throw new Error("Got an array when I should not have from arraySelect");
			}

			await Config.setTimeZone(args.guildID, m, args.textChannel);
		} catch (error) {
			Prompt.handleGetSameUserInputError(error);
		}
	}

	// want to change the schema for this sort of stuff so you have control over like the
	// delte this prefix if the message starts with <blank>, has whitelist and blacklist,
	// control time to delete based on what it matches
	// or delete message from user after timer if also starts with prefix?
	// idk more configurable would be cool
	// also having an all bots autodelete after 1 min or something could be hype

	export async function setPrefixAutoDelete(args: ConfigUtilFunctionArgs) {
		try {
			const options: Prompt.optionSelectElement[] = [
				{ name: "Add new prefix", function: addPrefixAutoDelete, args: args },
				{
					name: "Edit exiting prefix settings",
					function: editPrefixAutoDelete,
					args: args,
				},
				{ name: "Remove prefix", function: removePrefixAutoDelete, args: args },
			];

			return Prompt.optionSelect(args.userID, args.textChannel, options);
		} catch (error) {
			Prompt.handleGetSameUserInputError(error);
		}
	}
	export async function addPrefixAutoDelete(args: ConfigUtilFunctionArgs) {
		try {
			const m = await Prompt.getSameUserInput(
				args.userID,
				args.textChannel,
				"Enter the prefix to autodelete messages for:",
				Filter.stringLengthFilter(10, 0)
			);

			const prefix = m.content.trim();

			// checking if new prefix or need to just go to edit mode
			const config = await Config.getGuildConfig(args.guildID);

			const foundPrefix = config.autodelete_prefixes.find(
				(x) => x.prefix === prefix
			);
			if (!foundPrefix) {
				// new prefix, add and then go to the edit move
				await Config.addPrefixAutoDelete(
					args.guildID,
					prefix,
					args.textChannel
				);
			}
			args.prefix = prefix;

			return editPrefixAutoDelete(args);
		} catch (error) {
			Prompt.handleGetSameUserInputError(error);
		}
	}

	export async function selectPrefix(args: ConfigUtilFunctionArgs) {
		try {
			const configDoc = await Config.getGuildConfig(args.guildID);
			const autodeletePrefixes = configDoc.autodelete_prefixes;
			const offset = 1;
			const prompt = `Select a prefix to edit:\n ${autodeletePrefixes
				.map((x, i) => `${i + offset}. ${x.prefix}`)
				.join("\n")}`;
			const prefix = await Prompt.arraySelect(
				args.userID,
				args.textChannel,
				autodeletePrefixes,
				prompt,
				{
					multiple: false,
					customOffset: offset,
				}
			);

			if (Array.isArray(prefix)) {
				const msg = "Error selecting prefix. Quitting...";
				await sendToChannel(args.textChannel, msg);
				throw new Error(msg);
			}

			return prefix;
		} catch (error) {
			Prompt.handleGetSameUserInputError(error);
		}
	}

	export async function editPrefixAutoDelete(args: ConfigUtilFunctionArgs) {
		let prefixDoc: IAutoDeletePrefix | undefined;
		if (!args.prefix) {
			prefixDoc = await selectPrefix(args);
			if (prefixDoc) {
				args.prefix = prefixDoc.prefix;
			}
		}
		if (prefixDoc == undefined) {
			if (!args.prefix) {
				throw new Error("Coundnt set prefix");
			}
			prefixDoc = await Config.getAutoDeletePrefix(args.guildID, args.prefix);
		}

		if (!prefixDoc) {
			sendToChannel(
				args.textChannel,
				"Prefix not loaded in for whatever reason. Quitting..."
			);
			return undefined;
		}

		const deleteModeString =
			"Currently in delete mode, meaning the default is to delete messages and will not delete messages that start with the whitelist";
		const allowModeString =
			"Currently in allow mode, meaning that the default is to allow messages and will delete messages that are mentioned on the whitelist";
		const options: Prompt.optionSelectElement[] = [
			{
				name: `Edit whitelisted commands. If in allow mode, deletes the command. If in delete mode, allows the command`,
				function: editAllowList,
				args: args,
			},
			{
				name: `Edit specified command delete times (ex. if you want ${prefixDoc.prefix}play to delete slower than others)`,
				function: editPrefixSpecifiedDelete,
				args: args,
			},
			{
				name: `Change mode. ${
					prefixDoc.allowMode ? allowModeString : deleteModeString
				}`,
				function: changeAutoDeleteMode,
				args: args,
			},
			{ name: "Back", function: setPrefixAutoDelete, args: args },
		];

		return Prompt.optionSelect(args.userID, args.textChannel, options);
	}

	export async function changeAutoDeleteMode(args: ConfigUtilFunctionArgs) {
		try {
			if (!args.prefix) throw new Error("No prefix");
			const prefixDoc = await Config.getAutoDeletePrefix(
				args.guildID,
				args.prefix
			);
			if (!prefixDoc) return undefined;
			await Config.changePrefixAutoDeleteMode(
				args.guildID,
				prefixDoc,
				args.textChannel
			);

			editPrefixAutoDelete(args);
		} catch (error) {
			throw error;
		}
	}
	export async function removePrefixAutoDelete(args: ConfigUtilFunctionArgs) {
		try {
			const prefixDoc = await selectPrefix(args);
			if (!prefixDoc) {
				return undefined;
			}
			args.prefix = prefixDoc.prefix;

			if (!args.prefix) {
				return undefined;
			} else {
				await Config.deletePrefixAutoDelete(
					args.guildID,
					args.prefix,
					args.textChannel
				);
				args.prefix = undefined;
				setPrefixAutoDelete(args);
			}
		} catch (error) {
			throw error;
		}
	}

	export async function editPrefixSpecifiedDelete() {}

	export async function removePrefixSpecifiedDelete() {}

	export async function removeAutodeletePrefix() {}

	export async function editAllowList(args: ConfigUtilFunctionArgs) {
		try {
			if (!args.prefix) {
				sendToChannel(
					args.textChannel,
					"Error on my end. Prefix not passsed in for whatever reason. Quitting..."
				);
				return undefined;
			}

			const prefixDoc = await Config.getAutoDeletePrefix(
				args.guildID,
				args.prefix
			);
			if (!prefixDoc) {
				sendToChannel(
					args.textChannel,
					"Prefix not loaded in for whatever reason. Quitting..."
				);
				return undefined;
			}

			//  display current allow list
			const extraPrompt = `Current list includes: ${prefixDoc.allowList.join(
				", "
			)}`;

			const options: Prompt.optionSelectElement[] = [
				{
					name: "Add to allow list",
					function: addToPrefixAllowList,
					args: args,
				},
				{
					name: "Remove from allow list",
					function: removeFromPrefixAllowList,
					args: args,
				},
				{ name: "Back", function: editPrefixAutoDelete, args: args },
			];

			return Prompt.optionSelect(args.userID, args.textChannel, options, {
				extraPrompt: extraPrompt,
			});
		} catch (error) {
			throw error;
		}
	}

	export async function addToPrefixAllowList(args: ConfigUtilFunctionArgs) {
		try {
			if (!args.prefix) {
				sendToChannel(
					args.textChannel,
					"Error on my end. Prefix not passsed in for whatever reason. Quitting..."
				);
				return undefined;
			}

			const prefixDoc = await Config.getAutoDeletePrefix(
				args.guildID,
				args.prefix
			);
			if (!prefixDoc) {
				sendToChannel(
					args.textChannel,
					"Prefix not loaded in for whatever reason. Quitting..."
				);
				return undefined;
			}

			const m = await Prompt.getSameUserInput(
				args.userID,
				args.textChannel,
				"Enter the names you would like to whitelist (can add multiple with spaces for commas between):",
				Filter.anyFilter()
			);

			const names = m.content.trim().split(spaceCommaRegex());

			await Config.addPrefixAutoDeleteAllowed(
				args.guildID,
				prefixDoc,
				names,
				args.textChannel
			);

			editPrefixAutoDelete(args);
		} catch (error) {
			throw error;
		}
	}

	export async function removeFromPrefixAllowList(
		args: ConfigUtilFunctionArgs
	) {}

	export async function setUserAutoDelete(args: ConfigUtilFunctionArgs) {}

	export async function newMessageArchiveSetup(args: ConfigUtilFunctionArgs) {}
}
