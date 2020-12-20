import { CommandParams, commandProperties } from '../../bot'
import { Prompt, Filter } from '../../util/message.util'
import { Link } from '../../db/controllers/guild.controller'
import { ILink } from '../../db/models/guild.model'
import { MessageEmbed } from 'discord.js'
import { linkRegex, youtubeRegex } from '../../util/string.util'

const command: commandProperties = {

    name: 'createlink',
    aliases: ['cl', 'al', 'addlink'],
    args: false,
    description: 'Creates dynamic commands for linking websites or playing youtube clips',
    usage: `Use createlink for the bot to save a youtube video to broadcast or an alias to a specific link.\nFollow the prompts!`,
    cooldown: 1,
    guildOnly: true,

    async execute(e: CommandParams) {

        const guildID = e.message.guild!.id;
        const userID = e.message.author.id;
        const textChannel = e.message.channel;

        interface linkType {
            name: Link.LinkTypes,
            description: string,
            regex: RegExp,
            volumePrompt: boolean,
        }

        const options: linkType[] = [
            { name: Link.LinkTypes.link, description: 'Static link that gets returned when invoked by name', regex: linkRegex(), volumePrompt: false },
            { name: Link.LinkTypes.clip, description: 'A youtube link that gets played in a voice channel', regex: youtubeRegex(), volumePrompt: true }
        ]


        let linkType: linkType;
        let type: Link.LinkTypes;
        let names: string[];
        let link: string;
        let volume: number | undefined;
        try {
            linkType = await promptType();
            type = linkType.name;
            link = await promptLink();
            names = await promptNames();

            if (type === Link.LinkTypes.clip) {
                volume = await promptVolume();
            }

            let linkObj: ILink = {
                names: names,
                link: link,
                type: type,
                uploader: e.message.author.id,
                volume: volume
            }
            await Link.createLink(guildID, linkObj,textChannel)
            return true
        } catch (error) {
            throw error
        }

        async function promptType(): Promise<linkType> {
            return new Promise((resolve, reject) => {

                const msg = new MessageEmbed();

                msg.addField('Select type', options.map((x, i) => `${i + 1}. ${x.name}, ${x.description}`))

                Prompt.arraySelect(userID, textChannel, options, msg).then((option) => {
                    if (Array.isArray(option)) { reject(null); return }
                    resolve(option);
                }).catch(error => {
                    reject(error)
                })
            })

        }

        async function promptLink(): Promise<string> {
            try {
                const regex = type === Link.LinkTypes.link ? linkRegex() : youtubeRegex();

                const m = await Prompt.getSameUserInput(userID,
                    textChannel,
                    'Enter the link:',
                    Filter.regexFilter(regex));

                return m.content.trim()

            } catch (error) {
                throw error
            }
        }

        async function promptNames(): Promise<string[]> {
            try {
                const m = await Prompt.getSameUserInput(userID, textChannel, 'Enter the names for the link:', Filter.anyFilter())
                return m.content.trim().split(' ')
            } catch (error) {
                throw error
            }
        }

        async function promptVolume(): Promise<number> {
            try {
                const m = await Prompt.getSameUserInput(userID, textChannel, 'Enter the volume (0 to 1, default is .5)', Filter.numberRangeFilter(0, 1))

                return Number.parseFloat(m.content.trim());
            } catch (error) {
                throw error
            }
        }

    }
}


export default command;