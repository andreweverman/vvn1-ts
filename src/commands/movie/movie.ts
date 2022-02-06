/**
 * Central movie command launcher
 * 
 * Use all the movie commands from this command
 *
 * @file   Central movie command launcher
 * @author Andrew Everman.
 * @since  17.7.2020
 */

import { CommandParams, commandProperties } from '../../bot'
import { Prompt } from '../../util/messageUtil'
import addMovie from './movieListOperations/addMovie'
import deleteMovie from './movieListOperations/deleteMovie'
import movieConfig from './movieConfig'
import viewMovie from './movieListOperations/viewMovie'
import watchMovie from './watchMovie'
import downloadMovie from './download/downloadMovie'

const command: commandProperties = {
    name: 'movie',
    aliases: [],
    description: 'This hosts all the movie functions',
    usage: ', then follow the prompts',
    args: false,
    cooldown: 1,
    guildOnly: true,
    async execute(e: CommandParams) {
        const userID = e.message.author.id
        const textChannel = e.message.channel

        try {
            const options: Prompt.optionSelectElement[] = [
                { name: 'Watch a Movie', function: watchMovie.execute, args: e },
                { name: 'View Movies', function: viewMovie.execute, args: e },
                { name: 'Movie List Operations', function: movieLinkOperations, args: e },
                { name: 'Movie Download/Upload operations', function: downloadOperations, args: e },
                { name: 'Edit movie configuration', function: movieConfig.execute, args: e },
            ]

            Prompt.optionSelect(userID, textChannel, options)




            async function movieLinkOperations() {
                const newOptions: Prompt.optionSelectElement[] = [
                    { name: 'View current movie links', function: viewMovie.execute, args: e },
                    { name: 'Add movie request', function: addMovie.execute, args: e },
                    { name: 'Delete movie request', function: deleteMovie.execute, args: e },
                ]
                Prompt.optionSelect(userID, textChannel, newOptions)
            }

            async function downloadOperations() {
                const newOptions: Prompt.optionSelectElement[] = [
                    { name: 'Create download request', function: downloadMovie.execute, args: e },
                ]
                Prompt.optionSelect(userID, textChannel, newOptions)
            }
        } catch (error) {
            Prompt.handleGetSameUserInputError(error)
        }
    },
}

export default command
