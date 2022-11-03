import fs from 'node:fs/promises'
import util from 'node:util'

import { parse as parseCSV } from 'csv-parse'
import dotenv from 'dotenv-safe'
import makeDir from 'make-dir'
import pMap from 'p-map'

import * as types from './types'
import { convertTMDBMovieDetailsToMovie } from './lib/conversions'

dotenv.config()

interface IMDBRatings {
  [imdbId: string]: IMDBRating
}

interface IMDBRating {
  rating: number
  numVotes: number
}

/**
 * Updates downloaded TMDB movies with the following transforms:
 * - transforms TMDB movies to a common schema
 * - filters movies which are not released yet
 * - filters movies which do not have a valid IMDB id
 * - filters movies which do not have a valid trailer
 * - adds IMDB ratings from an official IMDB data dump
 */
async function main() {
  const srcDir = 'out'
  const outDir = 'out'
  await makeDir(outDir)

  console.log('parsing IMDB ratings')
  let imdbRatings: IMDBRatings = {}
  const imdbRatingsFilePath = 'data/title.ratings.tsv'
  try {
    const parse: any = util.promisify(parseCSV)
    const rawCSV = await fs.readFile(imdbRatingsFilePath, { encoding: 'utf-8' })
    const imdbRatingsRaw: Array<Array<string>> = await parse(rawCSV, {
      delimiter: '\t'
    })

    for (const imdbRatingRaw of imdbRatingsRaw) {
      const [imdbId, ratingRaw, numVotesRaw] = imdbRatingRaw

      const rating = Number.parseFloat(ratingRaw)
      const numVotes = Number.parseInt(numVotesRaw)

      imdbRatings[imdbId] = {
        rating,
        numVotes
      }
    }

    console.log(
      `loaded ${
        Object.keys(imdbRatings).length
      } IMDB ratings data dump (${imdbRatingsFilePath})`
    )
  } catch (err) {
    console.warn(
      `warn: unable to load IMDB ratings data dump (${imdbRatingsFilePath})`,
      err
    )
  }

  const numTmdbBatches = 24
  let batchNum = 0
  let numMissingIMDBInfo = 0
  let numMovies = 0

  console.log('converting TMDB movies')
  do {
    const srcFile = `${srcDir}/tmdb-${batchNum}.json`
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

            if (imdbRating) {
              movie.imdbRating = imdbRating.rating
              movie.imdbVotes = imdbRating.numVotes
            } else {
              ++numMissingIMDBInfo

              console.log(
                `missing rating ${movie.imdbId} (${movie.status}) ${movie.title}`
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

    numMovies += movies.length
    console.log()
    console.log(`batch ${batchNum} done`, {
      numTMDBMovies,
      numMovies: movies.length,
      percentMovies: `${((movies.length / numTMDBMovies) * 100) | 0}%`
    })

    await fs.writeFile(
      `${outDir}/movies-${batchNum}.json`,
      JSON.stringify(movies, null, 2),
      { encoding: 'utf-8' }
    )

    ++batchNum
  } while (batchNum < numTmdbBatches)

  console.log()
  console.log('done', {
    numMissingIMDBInfo,
    numMovies
  })
}

main()
