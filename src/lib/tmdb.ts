import got from 'got'

import type { tmdb } from '../types'

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
      images = false
    }: {
      videos?: boolean
      images?: boolean
    } = {}
  ): Promise<tmdb.MovieDetails> {
    const opts =
      videos || images
        ? {
            appendToResponse: [videos && 'videos', images && 'images']
              .filter(Boolean)
              .join(',')
          }
        : undefined

    return this._get<tmdb.MovieDetails>(`/movie/${movieId}`, opts)
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
