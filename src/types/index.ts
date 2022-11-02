import { omdb } from './omdb-types'
import { tmdb } from './tmdb-types'

export type { tmdb }
export type { omdb }

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

  // ageRating: string
}
