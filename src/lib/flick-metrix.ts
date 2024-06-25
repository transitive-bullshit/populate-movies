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

    flickMetrixMovies = JSON.parse(
      await fs.readFile(config.flickMetrixMoviesPath, { encoding: 'utf-8' })
    )

    console.warn(
      `loaded ${
        Object.keys(flickMetrixMovies).length
      } flick metrix movies from cache (${config.flickMetrixMoviesPath})`
    )
  } catch (err) {
    console.warn(
      `warn: unable to load flick metrix movie cache (${config.flickMetrixMoviesPath})`,
      err.toString()
    )
    console.warn(
      "You can safely ignore this warning if you haven't run `populate-flick-metrix-movies.ts`."
    )
  }

  return flickMetrixMovies
}

/**
 * Fetches all movies from flickmetrix.com's private API.
 */
export async function fetchAllFlickMetrixMovies() {
  const pageSize = 1000 // defaults to 20
  let movies: types.flickMetrix.Movie[] = []
  let page = 0

  do {
    try {
      console.warn(`flickmetrix fetching page ${page}`)
      const res = await fetchFlickMetrixMovies({ page, pageSize })
      console.warn(`flickmetrix received page ${page} => ${res.length} movies`)
      if (!res.length) {
        break
      }

      movies = movies.concat(res)
    } catch (err) {
      console.error('flickmetrix error', err.toString())
      break
    }

    ++page
  } while (true)

  return movies
}

/**
 * Fetches a page of movie results from flickmetrix.com's private API.
 */
export async function fetchFlickMetrixMovies({
  page = 0,
  pageSize = 20
}: { page?: number; pageSize?: number } = {}): Promise<
  types.flickMetrix.Movie[]
> {
  const currentPage = page

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
  const res: string = await got(url).json()

  return JSON.parse(res)
}

export function populateMovieWithFlickMetrixInfo(
  movie: types.Movie,
  { flickMetrixMovies }: { flickMetrixMovies?: types.FlickMetrixMovies } = {}
): types.Movie | null {
  // optionally fill in additional metadata from flickmetrix.com
  const flickMetrixMovie = flickMetrixMovies
    ? flickMetrixMovies[movie.imdbId]
    : null

  if (!flickMetrixMovie) {
    return movie
  }

  // for these fields, we want to prioritize the flick metrix values
  const fieldOverrides: Partial<Record<types.MovieField, () => any>> = {
    flickMetrixId: () => flickMetrixMovie.ID || null,
    flickMetrixScore: () => flickMetrixMovie.ComboScore ?? null
  }

  for (const [field, valueFn] of Object.entries(fieldOverrides)) {
    const value = valueFn()

    if (value || value === 0) {
      ;(movie as any)[field] = value
    }
  }

  // for these fields, we want to prioritize values from other sources
  const fieldOptionals: Partial<Record<types.MovieField, () => any>> = {
    plot: () => flickMetrixMovie.Plot ?? null,
    director: () => flickMetrixMovie.Director || null,
    production: () => flickMetrixMovie.Production || null,
    awardsSummary: () => flickMetrixMovie.Awards || null,
    letterboxdScore: () => flickMetrixMovie.LetterboxdScore ?? null,
    letterboxdVotes: () => flickMetrixMovie.letterboxdVotes ?? null,
    rtCriticRating: () => flickMetrixMovie.CriticRating ?? null,
    rtCriticVotes: () => flickMetrixMovie.CriticReviews ?? null,
    rtAudienceRating: () => flickMetrixMovie.AudienceRating ?? null,
    rtAudienceVotes: () => flickMetrixMovie.AudienceReviews ?? null,
    rtUrl: () => flickMetrixMovie.RTUrl?.replace(/\/$/g, '').trim() || null,
    imdbRating: () => flickMetrixMovie.imdbRating ?? null,
    imdbVotes: () => flickMetrixMovie.imdbVotes ?? null,
    metacriticRating: () => flickMetrixMovie.MetacriticRating ?? null,
    metacriticVotes: () => flickMetrixMovie.MetacriticReviews ?? null,
    cast: () =>
      flickMetrixMovie.Cast?.split(',')
        .map((name) => name.trim())
        .filter(Boolean) ?? []
  }

  for (const [field, valueFn] of Object.entries(fieldOptionals)) {
    if (movie[field]) continue
    const value = valueFn()

    if (value || value === 0) {
      ;(movie as any)[field] = value
    }
  }

  // Empirically, a lot of the youtube trailers that exist on flickmetrix that
  // don't exist on tmdb are videos that have been removed from youtube.
  // if (flickMetrixMovie.Trailer && !movie.trailerYouTubeId) {
  //   movie.trailerYouTubeId = flickMetrixMovie.Trailer
  //   movie.trailerUrl = `https://youtube.com/watch?v=${movie.trailerYouTubeId}`
  //   console.log('flickmetrix new trailer', movie.trailerUrl)
  // }

  return movie
}
