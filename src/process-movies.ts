import fs from 'node:fs/promises'

import makeDir from 'make-dir'
import pMap from 'p-map'

import * as config from './lib/config'
import * as types from './types'
import { loadFlickMetrixMoviesFromCache } from './lib/flick-metrix'
import {
  loadIMDBMoviesFromCache,
  loadIMDBRatingsFromDataDump
} from './lib/imdb'
import { keyv } from './lib/keyv'
import { enrichMovieWithPreviewImages } from './lib/preview-images'
import { processMovie } from './lib/process-movie'
import { loadRTMoviesFromCache, populateMovieWithRTInfo } from './lib/rt'
import {
  convertTMDBMovieDetailsToMovie,
  populateMovieWithIMDBInfo
} from './lib/utils'

/**
 * Processes downloaded TMDB movies with the following transforms:
 *
 *  - transforms TMDB movies to a common schema
 *  - filters adult movies
 *  - filters movies which are not released yet
 *  - filters movies which do not have a valid IMDB id
 *  - filters movies which do not have a valid YouTube trailer
 *  - adds IMDB ratings from an official IMDB data dump
 *  - adds additional IMDB metadata from previous `populate-imdb-movies` cache
 *  - adds additional Rotten Tomatoes metadata from previous `populate-rt-movies` cache
 *  - adds additional Flick Metrix metadata from previous `populate-flick-metrix-movies` cache
 */
async function main() {
  await makeDir(config.outDir)

  const [imdbRatings, imdbMovies, rtMovies, flickMetrixMovies] =
    await Promise.all([
      loadIMDBRatingsFromDataDump(),
      loadIMDBMoviesFromCache(),
      loadRTMoviesFromCache(),
      loadFlickMetrixMoviesFromCache()
    ])

  const statusToIgnore = new Set(['rumored', 'planned'])
  let batchNum = 0
  let numTMDBMoviesTotal = 0
  let numMoviesTotal = 0

  console.log(`\nprocessing TMDB movies in ${config.numBatches} batches\n`)
  do {
    const srcFile = `${config.outDir}/tmdb-${batchNum}.json`
    const tmdbMovies: types.tmdb.MovieDetails[] = JSON.parse(
      await fs.readFile(srcFile, { encoding: 'utf-8' })
    )

    const numTMDBMovies = tmdbMovies.length

    console.log(
      `\nprocessing ${numTMDBMovies} TMDB movies in batch ${batchNum} (${srcFile})\n`
    )

    const movies = (
      await pMap(
        tmdbMovies,
        async (tmdbMovie): Promise<types.Movie> => {
          const movie = convertTMDBMovieDetailsToMovie(tmdbMovie)

          if (movie.adult) {
            // console.log('warn adult movie', movie.tmdbId, movie.title)
            return null
          }

          if (statusToIgnore.has(movie.status)) {
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

          if (movie.runtime < 60) {
            return null
          }

          if (!movie.trailerUrl) {
            // console.log('warn missing trailer', movie.tmdbId, movie.title)
            return null
          }

          if (!populateMovieWithIMDBInfo(movie, { imdbRatings, imdbMovies })) {
            return null
          }

          if (!populateMovieWithRTInfo(movie, { rtMovies })) {
            return null
          }

          if (!processMovie(movie, { flickMetrixMovies })) {
            return null
          }

          if (config.enablePreviewImages) {
            await enrichMovieWithPreviewImages(movie)
          }

          return movie
        },
        {
          concurrency: 16
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

main().finally(() => {
  keyv.disconnect()
})
