import fs from 'node:fs/promises'

import got from 'got'

import * as types from '../types'
import * as config from './config'

export async function loadFlickMetrixMoviesFromCache(): Promise<types.FlickMetrixMovies> {
  let flickMetrixMovies: types.FlickMetrixMovies = {}

  try {
    console.log(
      `loading flick metrix movies from cache (${config.flickMetrixMoviesPath})`
    )

    const movies: types.flickMetrix.Movie[] = JSON.parse(
      await fs.readFile(config.flickMetrixMoviesPath, { encoding: 'utf-8' })
    )

    for (const movie of movies) {
      flickMetrixMovies[movie.imdbID] = movie
    }

    console.warn(
      `loaded ${
        Object.keys(flickMetrixMovies).length
      } flick metrix movies from cache (${config.flickMetrixMoviesPath})`
    )
  } catch (err) {
    console.warn(
      `warn: unable to load flick metrix movie cache (${config.flickMetrixMoviesPath})`
    )
    console.warn(err)
  }

  return flickMetrixMovies
}

/**
 * Fetches all movies from flickmetrix.com's private API.
 *
 * TODO: speed this up using `p-queue` instead of processing each page serially.
 */
export async function fetchAllFlickMetrixMovies() {
  let currentPage = 0
  let movies: types.flickMetrix.Movie[] = []
  const pageSize = 1000 // defaults to 20

  do {
    const searchParams = new URLSearchParams({
      amazonRegion: 'us',
      cast: '',
      comboScoreMax: '100',
      comboScoreMin: '0',
      countryCode: 'us',
      criticRatingMax: '100',
      criticRatingMin: '0',
      criticReviewsMax: '100000',
      criticReviewsMin: '0',
      currentPage: `${currentPage}`,
      deviceID: '1',
      director: '',
      format: 'movies',
      genreAND: 'false',
      imdbRatingMax: '10',
      imdbRatingMin: '0',
      imdbVotesMax: '10000000',
      imdbVotesMin: '0',
      inCinemas: 'true',
      includeDismissed: 'false',
      includeSeen: 'false',
      includeWantToWatch: 'true',
      isCastSearch: 'false',
      isDirectorSearch: 'false',
      isPersonSearch: 'false',
      language: 'all',
      letterboxdScoreMax: '100',
      letterboxdScoreMin: '0',
      letterboxdVotesMax: '1200000',
      letterboxdVotesMin: '0',
      metacriticRatingMax: '100',
      metacriticRatingMin: '0',
      metacriticReviewsMax: '100',
      metacriticReviewsMin: '0',
      onAmazonPrime: 'false',
      onAmazonVideo: 'false',
      onDVD: 'false',
      onNetflix: 'false',
      pageSize: `${pageSize}`,
      path: '/',
      person: '',
      plot: '',
      queryType: 'GetFilmsToSieve',
      searchTerm: '',
      sharedUser: '',
      sortOrder: 'comboScoreDesc',
      title: '',
      token: '',
      watchedRating: '0',
      writer: '',
      yearMax: '2022',
      yearMin: '1900'
    })
    const url = `https://flickmetrix.com/api2/values/getFilms?${searchParams.toString()}`

    try {
      console.warn(`flickmetrix page ${currentPage}`)
      const res = JSON.parse(await got(url).json())
      console.warn(`flickmetrix page ${currentPage} => ${res.length}`)
      if (!res.length) {
        break
      }

      movies = movies.concat(res)
    } catch (err) {
      console.error('flickmetrix error', err.toString())
      break
    }

    ++currentPage
  } while (true)

  return movies
}
