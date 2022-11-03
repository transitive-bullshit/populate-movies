import fs from 'node:fs/promises'
import util from 'node:util'

import * as movier from 'movier'
import { parse as parseCSV } from 'csv-parse'
import pThrottle from 'p-throttle'

import * as types from '../types'
import * as config from './config'

export interface IMDBRatings {
  [imdbId: string]: IMDBRating
}

export interface IMDBRating {
  rating: number
  numVotes: number
}

/**
 * Rate-limit HTTP requests to IMDB (max 3 per 1200ms). Note that each call to
 * `movier.getTitleDetailsByIMDBId` includes multiple HTTP GET requests to IMDB.
 *
 * We're using a modified version of `movier` which removes many of these
 * additional requests which fetch data we're not interested in. Otherwise, we
 * would need to use a stricter rate-limit here (originally max 1 per 1000ms).
 */
const throttle = pThrottle({
  limit: 3,
  interval: 1200
})

export const getTitleDetailsByIMDBId = throttle(movier.getTitleDetailsByIMDBId)

export async function loadIMDBMoviesFromCache(): Promise<types.IMDBMovies> {
  let imdbMovies: types.IMDBMovies = {}

  try {
    imdbMovies = JSON.parse(
      await fs.readFile(config.imdbMoviesPath, { encoding: 'utf-8' })
    )

    console.log(
      `loaded ${Object.keys(imdbMovies).length} IMDB movies from cache (${
        config.imdbMoviesPath
      })`
    )
  } catch (err) {
    console.warn(
      `warn: unable to load existing IMDB movie cache (${config.imdbMoviesPath})`,
      err
    )
  }

  return imdbMovies
}

export async function loadIMDBRatingsFromDataDump(): Promise<IMDBRatings> {
  let imdbRatings: IMDBRatings = {}

  try {
    console.log('loading IMDB ratings data dump')
    const parse: any = util.promisify(parseCSV)
    const rawCSV = await fs.readFile(config.imdbRatingsPath, {
      encoding: 'utf-8'
    })
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
      `loaded ${Object.keys(imdbRatings).length} IMDB ratings data dump (${
        config.imdbRatingsPath
      })`
    )
  } catch (err) {
    console.warn(
      `warn: unable to load IMDB ratings data dump (${config.imdbRatingsPath})`,
      err
    )
  }

  return imdbRatings
}
