import fs from 'node:fs/promises'

import got from 'got'
import pThrottle from 'p-throttle'

import * as types from '../types'
import * as config from './config'

const API_BASE_URL = 'https://www.omdbapi.com'

export type OMDBGetOptions = {
  apiKey?: string
  rt?: boolean
  imdbId?: string
}

/**
 * Rate-limit HTTP requests to OMDB API.
 */
const throttle = pThrottle({
  limit: 4,
  interval: 10
})

export const getOMDBMovieByIMDBID = throttle(getOMDBMovieByIMDBIDImpl)

async function getOMDBMovieByIMDBIDImpl(
  imdbId: string,
  opts?: Omit<OMDBGetOptions, 'imdbId'>
): Promise<Partial<types.omdb.Movie>> {
  const movie = await _get<types.omdb.Movie>('/', {
    ...opts,
    imdbId
  })

  for (const key of Object.keys(movie)) {
    if (movie[key] === 'N/A') {
      delete movie[key]
    }
  }

  return movie
}

async function _get<T>(path: string, opts: OMDBGetOptions): Promise<T> {
  const url = `${API_BASE_URL}${path}`
  const apiKey = opts.apiKey ?? process.env.OMDB_API_KEY

  return got(url, {
    searchParams: {
      apiKey,
      tomatoes: !!opts.rt,
      i: opts.imdbId
    },
    timeout: {
      request: 20000
    }
  }).json()
}

export async function loadOMDBMoviesFromCache(): Promise<types.OMDBMovies> {
  let omdbMovies: types.OMDBMovies = {}

  try {
    console.log(`loading OMDB movies from cache (${config.omdbMoviesPath})`)

    omdbMovies = JSON.parse(
      await fs.readFile(config.omdbMoviesPath, { encoding: 'utf-8' })
    )

    console.warn(
      `loaded ${Object.keys(omdbMovies).length} OMDB movies from cache (${
        config.omdbMoviesPath
      })`
    )
  } catch (err) {
    console.warn(
      `warn: unable to load OMDB movie cache (${config.omdbMoviesPath})`
    )
    console.warn(
      "You can safely ignore this warning if you haven't run `populate-omdb-movies.ts`."
    )
    console.warn(err)
  }

  return omdbMovies
}
