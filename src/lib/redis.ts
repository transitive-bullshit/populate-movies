import { Redis } from '@upstash/redis'

import * as types from '../types'
import './config'

export const tmdbMovieNamespace = 'tmdb-movie'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
})

function encodeJson(obj: any) {
  return JSON.stringify(obj)
}

function decodeJson<T = any>(str: string): T | null {
  return typeof str === 'string' ? (JSON.parse(str) as T) : null
}

export async function getTMDBMovie(tmdbId: string) {
  const tmdbMovie = await redis.get<any>(`${tmdbMovieNamespace}:${tmdbId}`)
  return decodeJson<types.tmdb.MovieDetails>(tmdbMovie)
}

export async function upsertTMDBMovie(
  tmdbMovie: types.Jsonify<types.tmdb.MovieDetails>
) {
  return redis.set(
    `${tmdbMovieNamespace}:${tmdbMovie.id}`,
    encodeJson(tmdbMovie)
  )
}
