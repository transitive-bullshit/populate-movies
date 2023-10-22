import fs from 'node:fs/promises'
import util from 'node:util'

import * as movier from 'movier'
import { parse as parseCSV } from 'csv-parse'
import { Level } from 'level'
import pThrottle from 'p-throttle'

import * as types from '../types'
import * as config from './config'

/**
 * Rate-limit HTTP requests to IMDB. Note that each call to
 * `movier.getTitleDetailsByIMDBId` includes multiple HTTP GET requests.
 */
const throttle = pThrottle({
  limit: 10,
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
      // directors: false,
      // writers: false,
      // producers: false,
      // casts: false,
      // posterImage: false,
      // allImages: false,
      // goofs: false,
      // quotes: false,
      // taglines: false,
      // productionCompanies: false,
      // awards: false,
      // awardsSummary: false,
      // dates: false,
      // allReleaseDates: false
    }
  })
)

export async function loadIMDBMoviesDB() {
  const db = new Level<string, types.imdb.Movie>(config.imdbMoviesDbPath, {
    valueEncoding: 'json'
  })
  await db.open()
  return db
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

/**
 * Augments a normalized TMDB movie with additional metadata from IMDB.
 *
 * In most cases, we prefer the IMDB data over TMDB equivalents.
 *
 * This function also filters many movies which are unlikely to be relevant
 * for most use cases.
 */
export function populateMovieWithIMDBInfo(
  movie: types.Movie,
  {
    imdbRatings,
    imdbMovie
  }: { imdbRatings?: types.IMDBRatings; imdbMovie?: types.imdb.Movie }
): types.Movie | null {
  if (!movie.imdbId) {
    return movie
  }

  const imdbRating = imdbRatings ? imdbRatings[movie.imdbId] : null
  let hasIMDBRating = false

  if (imdbMovie) {
    if (imdbMovie.genres?.length) {
      const genres = imdbMovie.genres.map((genre) => genre.toLowerCase())
      movie.genres = movie.genres.concat(genres)

      // ensure genres are unique
      movie.genres = Array.from(new Set(movie.genres))
    }

    if (imdbMovie.keywords?.length) {
      movie.keywords = imdbMovie.keywords
    }

    if (imdbMovie.countriesOfOrigin?.length) {
      movie.countriesOfOrigin = imdbMovie.countriesOfOrigin
    }

    if (imdbMovie.languages?.length) {
      movie.languages = imdbMovie.languages
    }

    if (imdbMovie.ageCategoryTitle) {
      movie.mpaaRating = imdbMovie.ageCategoryTitle
    }

    if (imdbMovie.plot) {
      if (movie.plot && imdbMovie.plot?.trim().endsWith('Read all')) {
        // ignore truncated plots
      } else {
        // otherwise favor the IMDB plot over the TMDB plot
        movie.plot = imdbMovie.plot.replace(/\.\.\. read all$/i, '...')
      }
    }

    if (imdbMovie.boxOffice) {
      if (imdbMovie.boxOffice.budget > 0) {
        movie.budget = `${imdbMovie.boxOffice.budget}`
      }

      if (imdbMovie.boxOffice.worldwide > 0) {
        movie.revenue = `${imdbMovie.boxOffice.worldwide}`
      }
    }

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

    movie.imdbType = imdbMovie.mainType

    const genres = new Set(movie.genres)
    if (genres.has('short')) {
      if (imdbMovie.mainType === 'movie') {
        movie.imdbType = 'short'
      }

      // ignore IMDB-labeled short films
      return null
    }
  }

  if (imdbRating) {
    // if we have IMDB ratings from two sources, take the one with more votes,
    // which is likely to be more recent
    if (!hasIMDBRating || imdbRating.numVotes > movie.imdbVotes) {
      hasIMDBRating = true
      movie.imdbRating = imdbRating.rating
      movie.imdbVotes = imdbRating.numVotes
    }
  }

  return movie
}
