import { BatchJob } from './runner'
import { Movie } from '../db/controllers/guildController'

const rule = '* * * * *'
const jobFunction = async function () {
    const downloadedMoviesArr = await Movie.getDownloadedMovies()

    downloadedMoviesArr.forEach((guild) => {
        guild.downloads.forEach(async (movie) => {
            if (movie.uploadLink) {
                await Movie.addMovie(
                    guild.guildID,
                    movie.userID,
                    movie.uploadLink,
                    movie.movieName,
                    movie.zipPassword,
                    movie.zipName,
                    true,
                    movie._id
                )
                const movies = await Movie.getMovies(guild.guildID, [movie.movieName])

                const movieDoc = movies.movies[0]

                Movie.moveToUploaded(guild.guildID, movie, movieDoc)
            }
        })
    })
}

const job: BatchJob = {
    rule: rule,
    function: jobFunction,
}

export default job
