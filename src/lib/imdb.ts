import fs from 'node:fs/promises'
import util from 'node:util'

import * as movier from 'movier'
import { parse as parseCSV } from 'csv-parse'
import pThrottle from 'p-throttle'

import * as types from '../types'
import * as config from './config'

/**
 * Rate-limit HTTP requests to IMDB. Note that each call to
 * `movier.getTitleDetailsByIMDBId` includes multiple HTTP GET requests.
 *
 * We're using a modified version of `movier` which removes many of these
 * additional requests which fetch data we're not interested in. Otherwise, we
 * would need to use a stricter rate-limit here (originally max 1 per 1000ms).
 */
const throttle = pThrottle({
  limit: 4,
  interval: 2000
})

export const getTitleDetailsByIMDBId = throttle((titleId: string) =>
  movier.getTitleDetailsByIMDBId(titleId, {
    select: {
      detailsLang: true,
      name: true,
      genres: true,
      mainType: true,
      plot: true,
      keywords: true,
      countriesOfOrigin: true,
      languages: true,
      ageCategoryTitle: true,
      boxOffice: true,
      mainRate: true,
      allRates: true,
      runtime: true
    }
  })
)

export async function loadIMDBMoviesFromCache(): Promise<types.IMDBMovies> {
  let imdbMovies: types.IMDBMovies = {}

  try {
    console.log(`loading IMDB movies from cache (${config.imdbMoviesPath})`)

    imdbMovies = JSON.parse(
      await fs.readFile(config.imdbMoviesPath, { encoding: 'utf-8' })
    )

    console.warn(
      `loaded ${Object.keys(imdbMovies).length} IMDB movies from cache (${
        config.imdbMoviesPath
      })`
    )
  } catch (err) {
    console.warn(
      `warn: unable to load IMDB movie cache (${config.imdbMoviesPath})`,
      err.toString()
    )
    console.warn(
      "You can safely ignore this warning if you haven't run `populate-imdb-movies.ts`."
    )
  }

  return imdbMovies
}

export async function loadIMDBRatingsFromDataDump(): Promise<types.IMDBRatings> {
  const imdbRatings: types.IMDBRatings = {}

  try {
    console.log(
      `loading IMDB ratings from data dump (${config.imdbRatingsPath})`
    )

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

    console.warn(
      `loaded ${Object.keys(imdbRatings).length} IMDB ratings from data dump (${
        config.imdbRatingsPath
      })`
    )
  } catch (err) {
    console.warn(
      `warn: unable to load IMDB ratings from data dump (${config.imdbRatingsPath})`,
      err
    )
  }

  return imdbRatings
}
