import { promisify } from 'node:util'
import zlib from 'node:zlib'

import got from 'got'

import * as types from '../types'

const gunzip = promisify(zlib.gunzip)

const BASE_URL_V3 = 'https://api.themoviedb.org/3'

type GetOptions = {
  appendToResponse: string
}

export class TMDB {
  private _bearerToken: string

  constructor({ bearerToken }: { bearerToken: string }) {
    this._bearerToken = bearerToken
  }

  public async getMovieDetails(
    movieId: string | number,
    {
      videos = false,
      images = false,
      externalIds = false,
      credits = false,
      keywords = false
    }: {
      videos?: boolean
      images?: boolean
      externalIds?: boolean
      credits?: boolean
      keywords?: boolean
    } = {}
  ): Promise<types.tmdb.MovieDetails> {
    const opts =
      videos || images
        ? {
            appendToResponse: [
              videos && 'videos',
              images && 'images',
              externalIds && 'external_ids',
              credits && 'credits',
              keywords && 'keywords'
            ]
              .filter(Boolean)
              .join(',')
          }
        : undefined

    return this._get<types.tmdb.MovieDetails>(`/movie/${movieId}`, opts)
  }

  public async getMovieCredits(
    movieId: string | number
  ): Promise<types.tmdb.Credits> {
    return this._get<types.tmdb.Credits>(`/movie/${movieId}/credits`)
  }

  private async _get<T>(path: string, opts?: GetOptions): Promise<T> {
    const url = `${BASE_URL_V3}${path}`

    return got(url, {
      headers: {
        Authorization: `Bearer ${this._bearerToken}`
      },
      searchParams: opts
        ? {
            append_to_response: opts.appendToResponse
          }
        : undefined
    }).json()
  }
}

export async function downloadTMDBMovieDataDump(input: string) {
  const date = input ? new Date(input) : new Date()
  if (!input) {
    date.setDate(date.getDate() - 1)
  }

  const month = (1 + date.getUTCMonth()).toString()
  const day = date.getUTCDate().toString()
  const year = date.getUTCFullYear().toString()
  const url = `http://files.tmdb.org/p/exports/movie_ids_${month.padStart(
    2,
    '0'
  )}_${day.padStart(2, '0')}_${year}.json.gz`
  console.log({ input, date, url })

  const buffer = await got(url).buffer()
  const unzippedBuffer = await gunzip(buffer)
  const rawDump = unzippedBuffer.toString('utf-8')
  // TMDB's data dump isn't valid JSON, so coerce it
  const jsonStringifiedDump =
    '[\n' + rawDump.split('\n').filter(Boolean).join(',\n') + '\n]'

  const dumpedMovies = JSON.parse(
    jsonStringifiedDump
  ) as Array<types.tmdb.DumpedMovie>

  return dumpedMovies
}
