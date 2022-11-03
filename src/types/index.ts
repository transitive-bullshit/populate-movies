import { imdb } from './imdb-types'
import { omdb } from './omdb-types'
import { tmdb } from './tmdb-types'

export type { tmdb }
export type { omdb }
export type { imdb }

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
  genres: tmdb.Genre[]
  overview: string
  runtime: number
  adult: boolean
  budget: number
  revenue: number
  homepage: string
  status: string

  // media
  posterUrl?: string | null
  backdropUrl?: string | null
  trailerUrl?: string | null
  trailerYouTubeId?: string | null

  // imdb
  imdbRating?: number
  imdbVotes?: number

  // tmdb
  tmdbPopularity?: number
  tmdbRating?: number
  tmdbVotes?: number

  // metacritic
  metacriticRating?: number
  metacriticVotes?: number

  // ageRating: string
}

export interface IMDBMovies {
  [imdbId: string]: imdb.Movie
}
