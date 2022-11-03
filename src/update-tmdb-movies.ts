import fs from 'node:fs/promises'

import makeDir from 'make-dir'
import pMap from 'p-map'

import * as config from './lib/config'
import * as types from './types'
import { convertTMDBMovieDetailsToMovie } from './lib/conversions'
import {
  loadIMDBMoviesFromCache,
  loadIMDBRatingsFromDataDump
} from './lib/imdb'

/**
 * Updates downloaded TMDB movies with the following transforms:
 * - transforms TMDB movies to a common schema
 * - filters movies which are not released yet
 * - filters movies which do not have a valid IMDB id
 * - filters movies which do not have a valid trailer
 * - adds IMDB ratings from an official IMDB data dump
 */
async function main() {
  await makeDir(config.outDir)

  const imdbRatings = await loadIMDBRatingsFromDataDump()
  const imdbMovies = await loadIMDBMoviesFromCache()

  const numTmdbBatches = 24
  let batchNum = 0
  let numMoviesTotal = 0

  console.log('converting TMDB movies')
  do {
    const srcFile = `${config.outDir}/tmdb-${batchNum}.json`
    const tmdbMovies: types.tmdb.MovieDetails[] = JSON.parse(
      await fs.readFile(srcFile, { encoding: 'utf-8' })
    )

    const numTMDBMovies = tmdbMovies.length

    const movies = (
      await pMap(
        tmdbMovies,
        async (tmdbMovie): Promise<types.Movie> => {
          const movie = convertTMDBMovieDetailsToMovie(tmdbMovie)

          if (movie.status !== 'Released') {
            return null
          }

          if (!movie.imdbId) {
            return null
          }

          if (!movie.trailerUrl) {
            return null
          }

          if (movie.imdbId) {
            const imdbRating = imdbRatings[movie.imdbId]
            const imdbMovie = imdbMovies[movie.imdbId]
            let hasIMDBRating = false

            if (imdbMovie) {
              if (imdbMovie.mainRate?.rateSource?.toLowerCase() === 'imdb') {
                hasIMDBRating = true
                movie.imdbRating = imdbMovie.mainRate.rate
                movie.imdbVotes = imdbMovie.mainRate.votesCount
              }

              const metacriticRate = imdbMovie.allRates?.find(
                (rate) => rate.rateSource?.toLowerCase() === 'metacritics'
              )
              if (metacriticRate) {
                movie.metacriticRating = metacriticRate.rate
                movie.metacriticVotes = metacriticRate.votesCount
              }
            }

            if (imdbRating) {
              if (
                hasIMDBRating &&
                (movie.imdbRating !== imdbRating.rating ||
                  movie.imdbVotes !== imdbRating.numVotes)
              ) {
                console.warn(
                  `imdb rating mismatch ${movie.imdbId} (${movie.status}) ${movie.title}`,
                  {
                    scrapedIMDBRating: movie.imdbRating,
                    scrapedIMDBVotes: movie.imdbVotes,
                    dumpedIMDBRating: imdbRating.rating,
                    dumpedIMDBVotes: imdbRating.numVotes
                  }
                )
              }

              hasIMDBRating = true
              movie.imdbRating = imdbRating.rating
              movie.imdbVotes = imdbRating.numVotes
            }

            if (!hasIMDBRating) {
              console.log(
                `missing imdb rating ${movie.imdbId} (${movie.status}) ${movie.title}`
              )
            }
          }

          return movie
        },
        {
          concurrency: 4
        }
      )
    ).filter(Boolean)

    numMoviesTotal += movies.length
    console.log()
    console.log(`batch ${batchNum} done`, {
      numTMDBMovies,
      numMovies: movies.length,
      percentMovies: `${((movies.length / numTMDBMovies) * 100) | 0}%`
    })

    await fs.writeFile(
      `${config.outDir}/movies-${batchNum}.json`,
      JSON.stringify(movies, null, 2),
      { encoding: 'utf-8' }
    )

    ++batchNum
  } while (batchNum < numTmdbBatches)

  console.log()
  console.log('done', {
    numMoviesTotal
  })
}

main()
