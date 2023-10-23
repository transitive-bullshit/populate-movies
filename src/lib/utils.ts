import fs from 'node:fs/promises'

import * as types from '../types'
import * as config from './config'

/**
 * Converts a TMDB movie to our normalized format.
 *
 * Also extracts the highest quality images and YouTube trailer using a series
 * of heuristics.
 */
export function convertTMDBMovieDetailsToMovie(
  movieDetails: types.tmdb.MovieDetails
): types.Movie {
  const releaseDate = movieDetails.release_date || null
  const releaseYear = releaseDate ? new Date(releaseDate).getFullYear() : null

  // example tmdb image URL
  // https://image.tmdb.org/t/p/w780/wfGfxtBkhBzQfOZw4S8IQZgrH0a.jpg

  let posterUrl: string = null
  let posterWidth: number = null
  let posterHeight: number = null
  if (movieDetails.poster_path) {
    const posterImage = movieDetails.images?.posters.find(
      (image) => image.file_path === movieDetails.poster_path
    )

    if (posterImage) {
      const posterSize = 'w780' // 'original'
      posterUrl = `https://image.tmdb.org/t/p/${posterSize}${movieDetails.poster_path}`
      posterWidth = posterImage.width
      posterHeight = posterImage.height
    }
  }

  let backdropUrl: string = null
  let backdropWidth: number = null
  let backdropHeight: number = null
  if (movieDetails.backdrop_path) {
    const backdropImage = movieDetails.images?.backdrops.find(
      (image) => image.file_path === movieDetails.backdrop_path
    )
    if (backdropImage) {
      const backdropSize = 'w1280' // 'original'
      backdropUrl = `https://image.tmdb.org/t/p/${backdropSize}${movieDetails.backdrop_path}`
      backdropWidth = backdropImage.width
      backdropHeight = backdropImage.height
    }
  }

  let trailerUrl: string = null
  let trailerYouTubeId: string = null

  if (movieDetails.videos?.results?.length) {
    const video = getBestTMDBTrailerVideo(movieDetails.videos.results)

    if (video && video.key) {
      trailerUrl = `https://youtube.com/watch?v=${video.key}`
      trailerYouTubeId = video.key
    }
  }

  const genreMappings = {
    'science fiction': 'scifi',
    'tv movie': 'tv-movie'
  }
  const genres =
    movieDetails.genres
      ?.map((genre) => genre.name?.toLowerCase())
      .filter(Boolean)
      .map((name) => genreMappings[name] ?? name) ?? []

  return {
    // ids
    id: movieDetails.id,
    tmdbId: movieDetails.id,
    imdbId: movieDetails.imdb_id,

    // external ids
    wikidataId: movieDetails.external_ids?.wikidata_id,
    facebookId: movieDetails.external_ids?.facebook_id,
    instagramId: movieDetails.external_ids?.instagram_id,
    twitterId: movieDetails.external_ids?.twitter_id,

    // general metadata
    title: movieDetails.title || movieDetails.original_title,
    originalTitle: movieDetails.original_title,
    language: movieDetails.original_language,
    releaseDate,
    releaseYear,
    genres,
    plot: movieDetails.overview,
    runtime: movieDetails.runtime,
    adult: movieDetails.adult,
    budget: movieDetails.budget ? `${movieDetails.budget}` : null,
    revenue: movieDetails.revenue ? `${movieDetails.revenue}` : null,
    homepage: movieDetails.homepage,
    status: movieDetails.status?.toLowerCase(),
    keywords: [],
    countriesOfOrigin: [],
    languages: [],
    cast: movieDetails.cast || [],
    director: movieDetails.director || null,

    // images
    posterUrl,
    posterWidth,
    posterHeight,
    backdropUrl,
    backdropWidth,
    backdropHeight,

    // video
    trailerUrl,
    trailerYouTubeId,

    // tmdb
    tmdbPopularity: movieDetails.popularity,
    tmdbRating: movieDetails.vote_average,
    tmdbVotes: movieDetails.vote_count
  }
}

/**
 * This function tries to find the best matching YouTube trailer for a given video.
 *
 * Ideally, this would be the official trailer in English, but we also consider a
 * series of fallbacks like teaser trailers and film clips if no trailer videos are
 * included in the data from TMDB.
 */
export function getBestTMDBTrailerVideo(
  inputVideos: types.tmdb.Video[]
): types.tmdb.Video | null {
  const videos = inputVideos.filter(
    (video) =>
      video.site?.toLowerCase() === 'youtube' && video.name && video.key
  )
  let candidates: types.tmdb.Video[]
  let candidate: types.tmdb.Video

  candidates = videos.filter((video) => video.type === 'Trailer')

  if (!candidates.length) {
    candidates = videos.filter((video) => video.type === 'Teaser')
  }

  if (!candidates.length) {
    candidates = videos.filter((video) => video.type === 'Clip')
  }

  if (!candidates.length) {
    candidates = videos.filter((video) => video.iso_639_1 === 'en')
  }

  if (!candidates.length) {
    candidates = videos
  }

  if (!candidates.length) {
    return null
  }

  candidate = candidates.find((video) => /^official trailer$/i.test(video.name))
  if (candidate) return candidate

  candidate = candidates.find((video) =>
    /\bofficial\s*us\s*trailer\b/i.test(video.name)
  )
  if (candidate) return candidate

  candidate = candidates.find((video) =>
    /\bofficial\s*final\s*trailer\b/i.test(video.name)
  )
  if (candidate) return candidate

  candidate = candidates.find((video) =>
    /\bofficial\s*trailer\b/i.test(video.name)
  )
  if (candidate) return candidate

  candidate = candidates.find((video) => /official.+trailer/i.test(video.name))
  if (candidate) return candidate

  candidate = candidates.find((video) => /\btrailer\b/i.test(video.name))
  if (candidate) return candidate

  candidate = candidates.find((video) => /trailer/i.test(video.name))
  if (candidate) return candidate

  candidate = candidates.find((video) => video.name === 'Official Teaser')
  if (candidate) return candidate

  candidate = candidates.find((video) => /official.+teaser/i.test(video.name))
  if (candidate) return candidate

  candidate = candidates.find((video) => /\bteaser\b/i.test(video.name))
  if (candidate) return candidate

  candidate = candidates.find((video) => /\bpreview\b/i.test(video.name))
  if (candidate) return candidate

  candidate = candidates.find((video) => /\bsneak peek\b/i.test(video.name))
  if (candidate) return candidate

  candidate = candidates.find((video) => /teaser/i.test(video.name))
  if (candidate) return candidate

  candidate = candidates.find((video) => /preview/i.test(video.name))
  if (candidate) return candidate

  candidate = candidates.find((video) => /sneak peek/i.test(video.name))
  if (candidate) return candidate

  candidate = candidates.find((video) => video.iso_639_1 === 'en')
  if (candidate) return candidate

  candidate = candidates[0]
  if (candidate) return candidate

  return null
}

export async function getTMDBMovieDump() {
  const rawMovieDump = await fs.readFile(config.tmdbMovieIdsDumpPath, {
    encoding: 'utf-8'
  })
  const dumpedMovies: types.tmdb.DumpedMovie[] = JSON.parse(rawMovieDump)
  return dumpedMovies
}

let numBatches: number = undefined

export async function getNumBatches(): Promise<number> {
  if (numBatches === undefined) {
    const dumpedMovies = await getTMDBMovieDump()
    numBatches = Math.ceil(dumpedMovies.length / config.batchSize)
  }

  return numBatches
}

export function removeNulls<T extends object>(obj: T): T | null {
  if (!obj) return null
  const result = {} as T

  for (const key in obj) {
    if (obj[key] !== null) {
      result[key] = obj[key]
    }
  }

  return result
}
