import got from 'got'

import * as types from '../types'

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
