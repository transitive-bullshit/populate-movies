import fs from 'node:fs/promises'
import util from 'node:util'

import { parse as parseCSV } from 'csv-parse'
import dotenv from 'dotenv-safe'
import makeDir from 'make-dir'
import pMap from 'p-map'

import * as types from './types'
import { convertTMDBMovieDetailsToMovie } from './conversions'
import { getTitleDetailsByIMDBId } from './imdb'

dotenv.config()

interface IMDBRatings {
  [imdbId: string]: IMDBRating
}

interface IMDBRating {
  rating: number
  numVotes: number
}

/**
 * TODO
 */
async function main() {
  const srcDir = 'out'
  const outDir = 'out'
  await makeDir(outDir)

  const parse: any = util.promisify(parseCSV)
  const imdbRatingsFile = 'data/title.ratings.tsv'
  const rawCSV = await fs.readFile(imdbRatingsFile, { encoding: 'utf-8' })
  const imdbRatingsRaw: Array<Array<string>> = await parse(rawCSV, {
    delimiter: '\t'
  })
  const imdbRatings: IMDBRatings = {}
  for (const imdbRatingRaw of imdbRatingsRaw) {
    const [imdbId, ratingRaw, numVotesRaw] = imdbRatingRaw

    const rating = Number.parseFloat(ratingRaw)
    const numVotes = Number.parseInt(numVotesRaw)

    imdbRatings[imdbId] = {
      rating,
      numVotes
    }
  }

  const numTmdbBatches = 24
  let batchNum = 0
  let numMissingIMDBInfo = 0
  let numMovies = 0
  const imdbMovies = {}

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

          // TODO: filter imdb "mainType": "seriesEpisode",

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

              try {
                const imdbMovie = await getTitleDetailsByIMDBId(movie.imdbId)
                imdbMovies[movie.imdbId] = imdbMovie

                if (imdbMovie.mainRate.rateSource?.toLowerCase() === 'imdb') {
                  movie.imdbRating = imdbMovie.mainRate.rate
                  movie.imdbVotes = imdbMovie.mainRate.votesCount
                }

                console.log(movie)
                // console.log(imdbMovie)
              } catch (err) {
                console.error('imdb error', movie.imdbId, err)
              }
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
      percentMovies: `${((movies.length / numTMDBMovies) * 100) | 0}%`,
      numIMDBMovies: Object.keys(imdbMovies).length
    })

    await fs.writeFile(
      `${outDir}/movies-${batchNum}.json`,
      JSON.stringify(movies, null, 2),
      { encoding: 'utf-8' }
    )

    await fs.writeFile(
      `${outDir}/imdb-movies.json`,
      JSON.stringify(imdbMovies, null, 2),
      { encoding: 'utf-8' }
    )

    ++batchNum
  } while (batchNum < numTmdbBatches)

  console.log()
  console.log('done', {
    numMissingIMDBInfo,
    numMovies,
    numIMDBMovies: Object.keys(imdbMovies).length
  })
}

main()
