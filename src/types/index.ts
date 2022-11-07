import { flickMetrix } from './flick-metrix-types'
import { imdb } from './imdb-types'
import { omdb } from './omdb-types'
import { tmdb } from './tmdb-types'

export type { tmdb }
export type { omdb }
export type { imdb }
export type { flickMetrix }

export interface Movie {
  // ids
  tmdbId: number
  imdbId: string

  // general metadata
  title: string
  originalTitle: string
  language: string
  releaseYear: number | null
  releaseDate: string | null
  genres: string[]
  overview: string
  runtime: number
  adult: boolean
  budget: number
  revenue: number
  homepage: string
  status: string
  mpaaRating?: string
  keywords: string[]
  countriesOfOrigin: string[]
  languages: string[]
  cast: string[]
  director?: string
  production?: string
  awardsSummary?: string

  // media
  posterUrl?: string | null
  backdropUrl?: string | null
  trailerUrl?: string | null
  trailerYouTubeId?: string | null

  // imdb
  imdbRating?: number
  imdbVotes?: number
  imdbType?: IMDBType

  // tmdb
  tmdbPopularity?: number // https://developers.themoviedb.org/3/getting-started/popularity
  tmdbRating?: number
  tmdbVotes?: number

  // metacritic
  metacriticRating?: number
  metacriticVotes?: number

  // rotten tomatoes
  rtCriticRating?: number
  rtCriticVotes?: number
  rtAudienceRating?: number
  rtAudienceVotes?: number
  rtUrl?: string

  // letterboxd
  letterboxdScore?: number
  letterboxdVotes?: number

  // flickmetrix
  flickMetrixId?: number
  flickMetrixScore?: number

  // custom / application-specific
  foreign?: boolean
  relevancyScore?: number
  imdbCustomPopularity?: number
}

export type IMDBType =
  | 'movie'
  | 'short'
  | 'series'
  | 'seriesEpisode'
  | 'tvSpecial'
  | 'tvMovie'
  | 'video'

// from data dump
export interface IMDBRatings {
  [imdbId: string]: IMDBRating
}

// from data dump
export interface IMDBRating {
  rating: number
  numVotes: number
}

// from local cache
export interface IMDBMovies {
  [imdbId: string]: imdb.Movie
}

// from local cache
export interface FlickMetrixMovies {
  [tmdbId: string]: flickMetrix.Movie
}
