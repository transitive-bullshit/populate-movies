import { tmdb } from './tmdb-types'
import { omdb } from './omdb-types'

export type { tmdb }
export type { omdb }

export interface Movie {
  // ids
  tmdbId: number
  imdbId: number

  title: string
  year: string
  releaseDate: string
  genres: tmdb.Genre[]
  overview: string
  runtime: number
  language: string
  country: string
  rating: string

  // media
  posterUrl: string
  backdropUrl: string

  director: string
  writer: string
  actors: string

  imdbRating: string
  imdbVotes: string
  ratings: Rating[]
  popularity: number

  adult: boolean
  budget: number
  awards: string
  type: string
  production: string
  website: string
}

export interface Rating {
  source: string
  value: string
}
