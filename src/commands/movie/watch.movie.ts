import { MessageEmbed, MessageCollector, Message, ReactionCollector, GuildEmoji, VoiceChannel, Role } from 'discord.js'
import { CommandParams, commandProperties } from '../../bot'
import { Prompt, Filter, sendToChannel, replyUtil, deleteMessage } from '../../util/message.util'
import { Link, Movie, Config, Guild } from '../../db/controllers/guild.controller'
import { stringMatch } from '../../util/string.util'
import { MovieUtil, EmojiUtil } from '../../util/general.util'
import { movieChannelAlias, movieCountdownName, movieTimeName, NumberConstants, vote } from '../../util/constants'
import { IMovieDoc } from '../../db/models/guild.model'
import schedule from 'node-schedule'
import { Moment } from 'moment'
import { getMomentForTZ, Prompt as TPrompt } from '../../util/time.util'
import playAudio from '../indirect/playAudio'
import { getVoiceChannelFromAliases, moveMembers, readyCheck } from '../../util/discord.util'
import _ from 'lodash'
const command: commandProperties = {
    name: 'watchmovie',
    aliases: ['movietime', 'watch'],
    usage: ', then follow the prompts',
    description: '',
    cooldown: 0,
    args: false,
    guildOnly: true,
    async execute(e: CommandParams) {
        const userID = e.message.author.id
        const guildID = e.message.guild!.id
        const textChannel = e.message.channel

        let movieStartSchedule: schedule.Job
        let postInstructionMessageCollector: MessageCollector
        let voiceChannel: VoiceChannel

        let movie: IMovieDoc
        let movieDate: Date
        let movieTimeMoment: Moment
        let movieTimeString: string

        let instructionMessage: Message

        let voteMode = false
        let voteStartSchedule: schedule.Job
        let voteDate: Date
        let voteTimeMoment: Moment
        let voteTimeString: string

        let reactionCollector: ReactionCollector
        interface MovieVote {
            name: string
            movie: IMovieDoc
            count: number
        }
        const votedMovies: MovieVote[] = []
        const votedUserIDs: string[] = []
        let validEmojis: (string | GuildEmoji)[] = []

        const quitCommandString = '--quitmovie'
        const editCommandString = '--editmovie'
        const startCommandString='--startmovie'
        const timeZoneName = await Config.getTimeZoneName(guildID)

        let movieRole: Role | undefined
        let movieRoleAt: Message

        try {
            const editOptions: Prompt.optionSelectElement[] = [
                { name: 'Change movie', function: selectMovieOrVote },
                { name: 'Change movie time', function: getMovieTime },
            ]
            if (!(await selectMovieOrVote(true))) return
            if (!(await getMovieDate())) return
            if (!(await getMovieTime())) return

            let voteTimeValid: boolean | undefined = false
            if (voteMode) {
                while (!voteTimeValid) {
                    if (!(await getVoteDate())) return
                    voteTimeValid = await getVoteTime()

                    if (!voteTimeValid) {
                        sendToChannel(
                            textChannel,
                            `Invalid. Date and time for the vote must be before the movie time (${movieTimeMoment!.format()})`
                        )
                    }
                }
            }

            const { willWatchEmoji, readyToWatchEmoji } = await getEmojis()

            validEmojis.push(willWatchEmoji)
            validEmojis.push(readyToWatchEmoji)

            instructionMessage = await sendInstructions()
            reactionCollector = await collectReactionsFromInstructions()

            const move_and_ping = reactionEndMovieAndPing()

            async function selectMovieOrVote(voteAllowed = false) {
                try {
                    const selectedMovie = await MovieUtil.selectMovie(guildID, userID, textChannel, false, voteAllowed)

                    if (!selectedMovie || selectedMovie?.arrayElements) {
                        if (movie == undefined) {
                            return
                        }
                        const quitReason = 'Did not get a valid movie response. Quitting...'
                        sendToChannel(textChannel, quitReason)
                        throw new Error(quitReason)
                    }
                    if (selectedMovie.arrayElement) movie = selectedMovie.arrayElement
                    if (selectedMovie.stringCommand) voteMode = true
                    manageRole()
                    return true
                } catch (error) {
                    quitMovie(error)
                    return false
                }
            }

            async function manageRole() {
                if (movieRole == undefined && movie != undefined) {
                    movieRole = await MovieUtil.createMovieRole(movie, e.message.guild!)
                } else {
                    if (movieRole?.name != movie.name) {
                        await movieRole?.delete('Change of movie')
                        movieRole = await MovieUtil.createMovieRole(movie, e.message.guild!)
                    }
                }
            }
            async function getMovieDate() {
                try {
                    // we do not want anything to be in the past when doing this
                    const date = await TPrompt.promptDate(userID, textChannel, timeZoneName, {
                        pastAllowed: false,
                        prePrompt: 'Enter the date to watch the movie',
                    })

                    movieDate = date.date
                    return true
                } catch (error) {
                    quitMovie(error)
                    return false
                }
            }

            async function getMovieTime() {
                try {
                    const time = await TPrompt.promptTime(userID, textChannel, timeZoneName, {
                        date: movieDate,
                        interpolate: true,
                        pastAllowed: false,
                        prePrompt: 'Enter the time to watch the movie',
                    })
                    if (!time && movieTimeMoment == undefined) throw new Error('Time not set')
                    if (!time) return

                    movieTimeMoment = getMomentForTZ(timeZoneName, {
                        date: movieDate,
                        hour: time.hour,
                        minute: time.minute,
                        second: 0,
                    })

                    movieTimeString = `${movieTimeMoment.toString()}\n${movieTimeMoment.format('hh:mm A')}`

                    movieStartSchedule != undefined
                        ? movieStartSchedule.reschedule(movieTimeMoment.format())
                        : (movieStartSchedule = schedule.scheduleJob(movieTimeMoment.toDate(), movieTimeExecute))
                    return true
                } catch (error) {
                    quitMovie(error)
                    return false
                }
            }

            async function getVoteDate() {
                try {
                    const date = await TPrompt.promptDate(userID, textChannel, timeZoneName, {
                        pastAllowed: false,
                        prePrompt: 'Enter the date to conclude voting',
                    })

                    voteDate = date.date
                    return true
                } catch (error) {
                    quitMovie(error)
                    return false
                }
            }

            async function getVoteTime(): Promise<boolean | undefined> {
                try {
                    const time = await TPrompt.promptTime(userID, textChannel, timeZoneName, {
                        date: movieDate,
                        interpolate: true,
                        pastAllowed: false,
                        prePrompt: 'Enter the time to conclude voting',
                    })
                    if (!time) throw new Error('Time not set')

                    voteTimeMoment = getMomentForTZ(timeZoneName, {
                        date: voteDate,
                        hour: time.hour,
                        minute: time.minute,
                    })

                    voteTimeString = `${voteTimeMoment.toString()}\n${voteTimeMoment.format('hh:mm A')}`

                    voteStartSchedule != undefined
                        ? voteStartSchedule.reschedule(voteTimeMoment.format())
                        : (voteStartSchedule = schedule.scheduleJob(voteTimeMoment.format(), voteConclusion))

                    return voteTimeMoment.isBefore(movieTimeMoment)
                } catch (error) {
                    Prompt.handleGetSameUserInputError(error)
                }
            }

            async function getInstructionEmbed() {
                try {
                    let movieInformationLink: string | null | undefined
                    const embed = new MessageEmbed().setTitle(`Movie Night`)

                    if (movie) {
                        movieInformationLink = await MovieUtil.getInfoPage(movie.name)

                        embed.addField(
                            `Movie Name:`,
                            `${movie.name}${
                                movie.password != '' && movie.password != 'none'
                                    ? `, password: ||${movie.password}||`
                                    : ', no password'
                            }`,
                            false
                        )
                    } else {
                        embed.addField(
                            'Vote Mode',
                            `To vote for movies, use send a message with ${vote} to enter voting mode.\n Voting ends at ${voteTimeString}`
                        )
                        embed.addField(
                            'Voted Movies',
                            `${
                                votedMovies.length > 0
                                    ? votedMovies.map((x) => `${x.name}: ${x.count}`).join('\n')
                                    : 'No voted movies yet'
                            }`,
                            false
                        )
                    }

                    if (movie && movieInformationLink) {
                        embed.addField('Movie Information', `[Letterboxd](${movieInformationLink} 'Download Link')`)
                    }

                    embed.addField('Time', movieTimeString, false)

                    if (movie) embed.addField('Download Link', `[${movie.name}](${movie.link} 'Download Link')`)

                    embed
                        .addField(
                            'Instructions',
                            `If you want to watch the movie, react with ${willWatchEmoji}. When ready, react with ${readyToWatchEmoji}.\n`,
                            true
                        )
                        .addField(
                            'Editing Options',
                            `To edit the time or movie, use ${editCommandString} and follow the prompts.\nUse ${quitCommandString} if you wish to cancel the movie\nUse ${startCommandString} to start the movie whenever`
                        )

                    if (movieRole)
                        movieRoleAt = (
                            await sendToChannel(textChannel, movieRole.toString(), true, 20 * NumberConstants.mins)
                        ).messages[0]

                    return embed
                } catch (error) {
                    throw new Error('Something ff in making the message embed')
                }
            }

            async function updateInstructions() {
                try {
                    const new_embed = await getInstructionEmbed()
                    instructionMessage.edit('', new_embed)
                } catch (error) {
                    throw error
                }
            }

            async function voteForMovies(voteUserID: string) {
                try {
                    const offset = 1
                    const { movies, message } = await Movie.getMovies(guildID, [], true)

                    const numberOfVotes = Math.min(3, movies.length)
                    if (movies.length == 0) {
                        // no movies to watch. tell them that and quit command
                        replyUtil(e.message, 'No movies to watch. SAD!')
                        return
                    }

                    const moviesMessage = await textChannel.send(message).catch((err) => {
                        console.error(err)
                        return
                    })
                    if (!moviesMessage) return

                    const userResponses = await Prompt.getMultipleInput(
                        voteUserID,
                        textChannel,
                        Filter.numberRangeFilter(offset, movies.length + offset),
                        numberOfVotes,
                        true
                    )

                    deleteMessage(moviesMessage, 0)
                    if (!userResponses) return

                    userResponses.forEach((x: string, i) => {
                        const voteSelectedMovie = movies[Number.parseInt(x) - offset]
                        // adding voted movie to the selection
                        const voteValue = numberOfVotes - i
                        const movieIndex = votedMovies.findIndex((y) => y.name === voteSelectedMovie.name)
                        if (movieIndex > 0) votedMovies[movieIndex].count += voteValue
                        else {
                            // new entry to the arr
                            votedMovies.push({
                                name: voteSelectedMovie.name,
                                movie: voteSelectedMovie,
                                count: voteValue,
                            })
                        }
                    })
                    votedMovies.sort((a, b) => b.count - a.count)
                } catch (error) {
                    quitMovie(error)
                }
            }

            async function sendInstructions(): Promise<Message> {
                return new Promise(async (resolve, reject) => {
                    try {
                        const instruction_embed = await getInstructionEmbed()

                        textChannel
                            .send(instruction_embed)
                            .then((m) => {
                                resolve(m)
                            })
                            .catch((err) => console.error(err))

                        // going to manually do the message collector for the post instr
                        // need a modified option filter because of the asyncronous nature of this

                        postInstructionMessageCollector = textChannel.createMessageCollector((x) => true, {
                            time: 48 * NumberConstants.hours,
                        })

                        /* this handles post movie creation operations
                includes setting time and movie, as well as the voting operations
                */

                        postInstructionMessageCollector.on('collect', async (m) => {
                            const content = m.content.trim().toLowerCase()
                            const sameUserFilter = Filter.sameUserFilter(userID)
                            let done = true
                            if (stringMatch(editCommandString, { loose: true }).test(content) && sameUserFilter(m)) {
                                await Prompt.optionSelect(userID, textChannel, editOptions)
                                updateInstructions()
                            } else if (stringMatch(startCommandString, { loose: true }).test(content)) {
                                movieTimeExecute()
                            } else if (vote == content && voteMode) {
                                if (votedUserIDs.includes(m.author.id)) {
                                    // this mf already voted
                                    replyUtil(m, 'You already voted.')
                                } else {
                                    const author_id = m.author.id
                                    await voteForMovies(m.author.id)
                                    votedUserIDs.push(author_id)
                                    updateInstructions()
                                }
                            } else if (quitCommandString == content && sameUserFilter(m)) {
                                await sendToChannel(textChannel, 'Quitting...', true, 5 * NumberConstants.secs)
                                await deleteMessage(instructionMessage, 0)
                                quitMovie('')
                                if (movieStartSchedule != null) movieStartSchedule.cancel()
                                reactionCollector.stop('Quit')
                                postInstructionMessageCollector.stop('Quit')
                            } else {
                                done = false
                            }

                            if (done) {
                                deleteMessage(m, 0)
                            }
                            // an else can be any other message so dont do anyting to it.
                        })
                    } catch (error) {
                        throw error
                    }
                })
            }

            async function voteConclusion() {
                try {
                    // vote array is already sorted
                    movie = votedMovies[0].movie
                    await manageRole()

                    // let the people who voted know that the movie was selected

                    sendToChannel(
                        textChannel,
                        `${votedUserIDs
                            .map((x) => e.message.guild!.member(x))
                            .join(', ')}, the movie has been selected`,
                        true,
                        3 * NumberConstants.mins
                    )

                    updateInstructions()
                } catch (error) {
                    throw error
                }
            }

            async function movieTimeExecute() {
                try {
                    console.time('Movie time')
                    movieStartSchedule.cancel()
                    const voiceChannelResolveable = await getVoiceChannelFromAliases(
                        e.message.guild!,
                        [movieChannelAlias],
                        true
                    )
                    if (!voiceChannelResolveable?.moveChannel) {
                        sendToChannel(
                            textChannel,
                            'Alias a voice channel to movie to reach the full potential of me!',
                            true
                        )
                        return
                    }

                    voiceChannel = voiceChannelResolveable.moveChannel

                    // pings will watch people and moves ready people

                    reactionCollector.stop('Movie Time')
                    postInstructionMessageCollector.stop('Movie Time')

                    await move_and_ping

                    // playing movie time audio if enabled
                    const movieDoc = await Movie.getMovie(guildID)
                    if (movieDoc == undefined) return

                    const movieTimeObj = movieDoc.sounds.find((x) => x.name == movieTimeName)
                    const movieTimeEnabled = movieTimeObj && movieTimeObj.enabled

                    const startCountdownObj = movieDoc.sounds.find((x) => x.name == movieCountdownName)
                    const startCountDownEnabled = startCountdownObj && startCountdownObj.enabled

                    if (voiceChannel && movieTimeEnabled) {
                        const movie_time = await Link.lookupLink(guildID, movieTimeName)
                        if (movie_time && movie_time.type == 'clip') playAudio(voiceChannel, movie_time, textChannel)
                    }

                    await readyCheck(e.message.guild!, textChannel, voiceChannel, 15).catch((err) => console.error(err))

                    if (voiceChannel && startCountDownEnabled) {
                        const start_countdown = await Link.lookupLink(guildID, movieCountdownName)
                        if (start_countdown && start_countdown.type == 'clip')
                            playAudio(voiceChannel, start_countdown, textChannel)
                    }

                    if (movieRoleAt) deleteMessage(movieRoleAt, 0)
                    return deleteMessage(instructionMessage, 0)
                } catch (error) {
                    throw error
                }
            }

            async function reactionEndMovieAndPing() {
                new Promise((resolve, reject) => {
                    try {
                        if (!reactionCollector) {
                            reject('never initialized')
                        }
                        reactionCollector.on('end', async (collected) => {
                            // defining various filters that will be used.
                            // based on what the reaction collector gives us, will give us a member object or undefined which we will filter out
                            // could use foreach instead for better performance

                            const voice_defined_filter = (x: any) => x.voice.channel
                            let membersToPing: any = []

                            // filtering out the people that said they are ready
                            const ready_reactions = collected.filter(EmojiUtil.filterEmoji([readyToWatchEmoji]))
                            const ready_members = reactionToMembers(ready_reactions, e.message.guild)
                            // members to move are in vc. they get moved. the rest get a message like the will watch people.
                            const [members_to_move, ready_ping] = _.partition(ready_members, voice_defined_filter)

                            // filtering out the people that said they would watch
                            const will_watch_reactions = collected.filter(EmojiUtil.filterEmoji([willWatchEmoji]))

                            const will_watch_members = reactionToMembers(will_watch_reactions, e.message.guild)

                            // going to @ the people who said they would watch
                            membersToPing = membersToPing.concat(ready_ping)
                            membersToPing = membersToPing.concat(will_watch_members)

                            if (ready_members.length > 0) {
                                // move the that are ready to a channel that has the name movie
                                // move the people who are ready and in a voice channel
                                if (voiceChannel != null) moveMembers(voiceChannel, members_to_move)
                            }

                            if (will_watch_members.length > 0) {
                                const members_at = membersToPing.map((x: any) => `<@!${x.id}>`).join(', ')
                                sendToChannel(
                                    textChannel,
                                    `${members_at}, please move to the movie channel when you are ready to watch the movie.`,
                                    true,
                                    5 * NumberConstants.mins
                                )
                            }
                            resolve(true)
                        })
                    } catch (error) {
                        reject(error)
                    }
                })
            }

            async function collectReactionsFromInstructions() {
                const reaction_filter = (reaction: any, user: any) => {
                    const moji = reaction.emoji
                    if (EmojiUtil.isEmoji(moji.name, validEmojis)) return true
                    if (validEmojis.includes(moji)) return true

                    return false
                }
                return instructionMessage.createReactionCollector(reaction_filter, { time: 48 * NumberConstants.hours })
            }

            async function getEmojis() {
                try {
                    const guildDoc = await Guild.getGuild(guildID)

                    const emojis = guildDoc.movie.emojis

                    const willWatchObj = emojis.find((x) => x.name == 'will_watch')
                    const readyToWatchObj = emojis.find((x) => x.name == 'ready')
                    if (!willWatchObj || !readyToWatchObj) throw new Error('Emojis not found')

                    const willWatchEmoji = await EmojiUtil.validateEmoji(e.message.guild!.emojis.cache, willWatchObj)
                    const readyToWatchEmoji = await EmojiUtil.validateEmoji(
                        e.message.guild!.emojis.cache,
                        readyToWatchObj
                    )

                    return {
                        willWatchEmoji: willWatchEmoji,
                        readyToWatchEmoji: readyToWatchEmoji,
                    }
                } catch (error) {
                    throw error
                }
            }

            function reactionToMembers(array: any, guild: any): [] {
                const arr: any = []
                array.forEach((x: any) => {
                    x.users.cache.forEach((user: any) => {
                        const member = guild.member(user.id)
                        if (member != undefined) arr.push(member)
                    })
                })

                return arr
            }

            function quitMovie(error: any) {
                try {
                    if (movieRole) movieRole.delete('Quitting movie')
                    if (movieRoleAt) deleteMessage(movieRoleAt, 0)
                } catch (err) {
                    Prompt.handleGetSameUserInputError(error)
                    Prompt.handleGetSameUserInputError(err)
                }
            }
        } catch (error) {
            if (movieRole) movieRole.delete('Quitting movie')
            Prompt.handleGetSameUserInputError(error)
        }
    },
}

export default command
