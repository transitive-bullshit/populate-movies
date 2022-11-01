import got from 'got'
import type { tmdb } from './types/tmdb-types'

const BASE_URL_V3 = 'https://api.themoviedb.org/3'

export class TMDB {
  private _bearerToken: string

  constructor({ bearerToken }: { bearerToken: string }) {
    this._bearerToken = bearerToken
  }

  public async getMovieDetails(
    movieId: string | number
  ): Promise<tmdb.MovieDetails> {
    return this._get<tmdb.MovieDetails>(`/movie/${movieId}`)
  }

  private async _get<T>(path: string): Promise<T> {
    const url = `${BASE_URL_V3}${path}`

    return got(url, {
      headers: {
        Authorization: `Bearer ${this._bearerToken}`
      }
    }).json()
  }
}
