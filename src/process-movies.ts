import fs from 'node:fs/promises'

import makeDir from 'make-dir'
import pMap from 'p-map'

import * as config from './lib/config'
import * as types from './types'
import {
  loadFlickMetrixMoviesFromCache,
  populateMovieWithFlickMetrixInfo
} from './lib/flick-metrix'
import {
  loadIMDBMoviesDB,
  loadIMDBRatingsFromDataDump,
  populateMovieWithIMDBInfo
} from './lib/imdb'
import { keyv } from './lib/keyv'
// import { loadOMDBMoviesFromCache } from './lib/omdb'
import { enrichMovieWithPreviewImages } from './lib/preview-images'
import { processMovie } from './lib/process-movie'
import { loadRTMoviesFromCache, populateMovieWithRTInfo } from './lib/rt'
import { convertTMDBMovieDetailsToMovie, getNumBatches } from './lib/utils'
import {
  loadWikidataMoviesFromCache,
  populateMovieWithWikidataInfo
} from './lib/wikidata'

/**
 * Process downloaded TMDB movies with the following transforms:
 *
 *  - transforms TMDB movies to a common schema
 *  - filters adult movies
 *  - filters movies which are not far enough along in production
 *  - filters movies which do not have a valid IMDB id
 *  - filters movies which do not have a valid YouTube trailer
 *  - (optional) computes LQIP preview images for posters and backdrops
 *  - (optional) adds IMDB ratings from an official IMDB data dump
 *  - (optional) adds additional IMDB metadata from previous `populate-imdb-movies` cache
 *  - (optional) adds additional Rotten Tomatoes metadata from previous `populate-rt-movies` cache
 *  - (optional) adds additional Wikidata metadata from previous `populate-wikidata-movies` cache
 *  - (optional) adds additional Flick Metrix metadata from previous `populate-flick-metrix-movies` cache
 */
async function main() {
  await makeDir(config.outDir)

  // load all of our (possibly empty) cached data from disk
  const [
    imdbRatings,
    imdbMovies,
    rtMovies,
    wikidataMovies,
    flickMetrixMovies,
    numBatches
  ] = await Promise.all([
    loadIMDBRatingsFromDataDump(),
    loadIMDBMoviesDB(),
    loadRTMoviesFromCache(),
    loadWikidataMoviesFromCache(),
    loadFlickMetrixMoviesFromCache(),
    getNumBatches()
    // loadOMDBMoviesFromCache()
  ])

  const statusToIgnore = new Set(['rumored', 'planned'])
  let batchNum = 0
  let numTMDBMoviesTotal = 0
  let numMoviesTotal = 0

  let numAdult = 0
  let numStatus = 0
  let numIMDB = 0
  let numRuntime = 0
  let numTrailer = 0
  let numIMDBType = 0
  let numProcess = 0

  console.log(`\nprocessing TMDB movies in ${numBatches} batches\n`)
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
            ++numAdult
            return null
          }

          if (statusToIgnore.has(movie.status)) {
            // console.log(
            //   `warn status (${movie.status})`,
            //   movie.tmdbId,
            //   movie.title
            // )
            ++numStatus
            return null
          }

          if (!movie.imdbId) {
            // console.log('warn missing imdb id', movie.tmdbId, movie.title)
            ++numIMDB
            return null
          }

          if (movie.runtime < 60) {
            ++numRuntime
            return null
          }

          if (!movie.trailerUrl) {
            // console.log('warn missing trailer', movie.tmdbId, movie.title)
            ++numTrailer
            return null
          }

          let imdbMovie: types.imdb.Movie
          try {
            imdbMovie = await imdbMovies.get(movie.imdbId)
          } catch (err) {
            if (err.code !== 'LEVEL_NOT_FOUND') {
              console.error('imdb leveldb error', err.toString())
            }
          }

          if (!populateMovieWithIMDBInfo(movie, { imdbRatings, imdbMovie })) {
            ++numIMDBType
            return null
          }

          if (!populateMovieWithRTInfo(movie, { rtMovies })) {
            return null
          }

          if (!populateMovieWithWikidataInfo(movie, { wikidataMovies })) {
            return null
          }

          if (!populateMovieWithFlickMetrixInfo(movie, { flickMetrixMovies })) {
            return null
          }

          if (!processMovie(movie)) {
            ++numProcess
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
  } while (batchNum < numBatches)

  console.log()
  console.log('done', {
    numTMDBMoviesTotal,
    numMoviesTotal,
    percentMoviesTotal: `${((numMoviesTotal / numTMDBMoviesTotal) * 100) | 0}%`,
    filters: {
      numAdult,
      numStatus,
      numIMDB,
      numRuntime,
      numTrailer,
      numIMDBType,
      numProcess
    }
  })
}

main().finally(() => {
  keyv.disconnect()
})
