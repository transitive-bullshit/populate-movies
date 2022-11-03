import fs from 'node:fs/promises'

import makeDir from 'make-dir'
import pMap from 'p-map'

import * as config from './lib/config'
import * as types from './types'
import {
  convertTMDBMovieDetailsToMovie,
  populateMovieWithIMDBInfo
} from './lib/conversions'
import {
  loadIMDBMoviesFromCache,
  loadIMDBRatingsFromDataDump
} from './lib/imdb'

/**
 * Processes downloaded TMDB movies with the following transforms:
 * - transforms TMDB movies to a common schema
 * - filters adult movies
 * - filters movies which are not released yet
 * - filters movies which do not have a valid IMDB id
 * - filters movies which do not have a valid YouTube trailer
 * - adds IMDB ratings from an official IMDB data dump
 */
async function main() {
  await makeDir(config.outDir)

  const imdbRatings = await loadIMDBRatingsFromDataDump()
  const imdbMovies = await loadIMDBMoviesFromCache()

  let batchNum = 0
  let numTMDBMoviesTotal = 0
  let numMoviesTotal = 0

  console.log()
  console.log('processing TMDB movies')
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

          if (movie.adult) {
            // console.log('warn adult movie', movie.tmdbId, movie.title)
            return null
          }

          if (movie.status !== 'Released') {
            // console.log(
            //   `warn status (${movie.status})`,
            //   movie.tmdbId,
            //   movie.title
            // )
            return null
          }

          if (!movie.imdbId) {
            // console.log('warn missing imdb id', movie.tmdbId, movie.title)
            return null
          }

          if (!movie.trailerUrl) {
            // console.log('warn missing trailer', movie.tmdbId, movie.title)
            return null
          }

          populateMovieWithIMDBInfo(movie, { imdbRatings, imdbMovies })
          return movie
        },
        {
          concurrency: 4
        }
      )
    ).filter(Boolean)

    numMoviesTotal += movies.length
    numTMDBMoviesTotal += numTMDBMovies

    console.log()
    console.log(`batch ${batchNum} done`, {
      numTMDBMovies,
      numMovies: movies.length,
      percentMovies: `${((movies.length / numTMDBMovies) * 100) | 0}%`
    })
    console.log()

    await fs.writeFile(
      `${config.outDir}/movies-${batchNum}.json`,
      JSON.stringify(movies, null, 2),
      { encoding: 'utf-8' }
    )

    ++batchNum
  } while (batchNum < config.numBatches)

  console.log()
  console.log('done', {
    numTMDBMoviesTotal,
    numMoviesTotal,
    percentMoviesTotal: `${((numMoviesTotal / numTMDBMoviesTotal) * 100) | 0}%`
  })
}

main()
