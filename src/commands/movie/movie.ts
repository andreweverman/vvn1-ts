import { CommandParams, commandProperties } from '../../bot'
import { Prompt } from '../../util/messageUtil'
import addMovie from './movieListOperations/addMovie'
import deleteMovie from './movieListOperations/deleteMovie'
import movieConfig from './movieConfig'
import viewMovie from './movieListOperations/viewMovie'
import addMovieRequest from './request/addMovieRequest'
import deleteMovieRequest from './request/deleteMovieRequest'
import viewMovieRequest from './request/viewMovieRequest'
import watchMovie from './watchMovie'
import addToWatchList from './watchList/addToWatchList'
import viewWatchlist from './watchList/viewWatchList'
import removeWatchList from './watchList/removeWatchList'
import downloadMovie from './download/downloadMovie'
import deleteDownloadRequest from './download/removeDownloadRequest'
import deleteDownload from './download/deleteMovieRequest'

const command: commandProperties = {
    name: 'movie',
    aliases: [],
    description: 'This hosts all the movie functions',
    usage: ', then follow the prompts',
    args: false,
    cooldown: 1,
    guildOnly: true,
    async execute(e: CommandParams) {
        const guildID = e.message.guild!.id
        const userID = e.message.author.id
        const textChannel = e.message.channel

        try {
            const options: Prompt.optionSelectElement[] = [
                { name: 'Watch movie', function: watchMovie.execute, args: e },
                { name: 'View movies', function: viewMovie.execute, args: e },
                { name: 'Watch list operations', function: watchListOperations, args: e },
                { name: 'Movie request operations', function: movieRequestOperations, args: e },
                { name: 'Movie download operations', function: downloadOperations, args: e },
                { name: 'Movie link operations', function: movieLinkOperations, args: e },
                { name: 'Edit movie configuration', function: movieConfig.execute, args: e },
            ]

            Prompt.optionSelect(userID, textChannel, options)

            async function watchListOperations() {
                const newOptions: Prompt.optionSelectElement[] = [
                    { name: 'View watchlist', function: viewWatchlist.execute, args: e },
                    { name: 'Add to watchlist', function: addToWatchList.execute, args: e },
                    { name: 'Delete movie from watchlist', function: removeWatchList.execute, args: e },
                ]
                Prompt.optionSelect(userID, textChannel, newOptions)
            }

            async function movieRequestOperations() {
                const newOptions: Prompt.optionSelectElement[] = [
                    { name: 'View requests', function: viewMovieRequest.execute, args: e },
                    { name: 'Add movie request', function: addMovieRequest.execute, args: e },
                    { name: 'Delete movie request', function: deleteMovieRequest.execute, args: e },
                ]
                Prompt.optionSelect(userID, textChannel, newOptions)
            }
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
                    { name: 'Delete download request', function: deleteDownloadRequest.execute, args: e },
                    { name: 'Delete download', function: deleteDownload.execute, args: e },
                ]
                Prompt.optionSelect(userID, textChannel, newOptions)
            }
        } catch (error) {
            Prompt.handleGetSameUserInputError(error)
        }
    },
}

export default command
