import type { Level } from 'level'

import { flickMetrix } from './flick-metrix-types'
import { imdb } from './imdb-types'
import { omdb } from './omdb-types'
import { tmdb } from './tmdb-types'
import { wikidata } from './wikidata-types'

export type { tmdb }
export type { omdb }
export type { imdb }
export type { flickMetrix }
export type { wikidata }

export interface Movie {
  // main external ids
  tmdbId: number
  imdbId: string

  // other external ids
  wikidataId?: string
  facebookId?: string
  instagramId?: string
  twitterId?: string
  netflixId?: string
  huluId?: string
  amazonId?: string
  appleTVId?: string
  twitterUsername?: string
  googleKGId?: string
  traktTVId?: string
  redditTopicId?: string
  letterboxdId?: string
  metacriticId?: string
  allMovieId?: string
  disneyPlusId?: string
  hboMaxId?: string

  // general metadata
  title: string
  originalTitle: string
  language: string
  releaseYear: number | null
  releaseDate: string | null
  genres: string[]
  plot: string
  runtime: number
  adult: boolean
  budget: string
  revenue: string
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

  // images
  posterUrl?: string | null
  posterPlaceholderUrl?: string | null
  posterWidth?: number
  posterHeight?: number
  backdropUrl?: string | null
  backdropPlaceholderUrl?: string | null
  backdropWidth?: number
  backdropHeight?: number

  // video
  trailerUrl?: string | null
  trailerYouTubeId?: string | null

  // imdb
  imdbRating?: number
  imdbVotes?: number
  imdbType?: IMDBType | string

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
  rtCriticsConsensus?: string
  rtUrl?: string
  rtId?: string
  emsId?: string

  // letterboxd
  letterboxdScore?: number
  letterboxdVotes?: number

  // flickmetrix
  flickMetrixId?: number
  flickMetrixScore?: number

  // custom / application-specific
  id?: number
  foreign?: boolean
  relevancyScore?: number
  imdbCustomPopularity?: number
  searchL?: string
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

// from local db cache
export type IMDBMovies = Level<string, imdb.Movie>

// from local cache
export interface FlickMetrixMovies {
  [imdbId: string]: flickMetrix.Movie
}

// from local cache
export interface RTMovies {
  [tmdbId: string]: Partial<Movie>
}

// from local cache
export interface WikidataMovies {
  [imdbId: string]: Partial<Movie>
}

// from local cache
export interface OMDBMovies {
  [imdbId: string]: Partial<omdb.Movie>
}

export type ExtractPropertyNames<T> = {
  [K in keyof T]: K
}[keyof T]

export type MovieField = ExtractPropertyNames<Movie>
