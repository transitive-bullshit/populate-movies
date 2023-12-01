import got from 'got'

import * as types from '../types'

const BASE_URL = 'https://yts.mx/api'

export type YTSSortBy =
  | 'title'
  | 'year'
  | 'rating'
  | 'peers'
  | 'seeds'
  | 'download_count'
  | 'like_count'
  | 'date_added'

export type YTSOrderBy = 'desc' | 'asc'
export type YTSQuality = '720p' | '1080p' | '2160p' | '3D' | 'All'

export class YTS {
  public async getMovies({
    limit = 10,
    page = 1,
    quality,
    minimumIMDBRating,
    query,
    genre,
    sortBy = 'date_added',
    orderBy = 'desc',
    withRTRatings // RT ratings don't seem to work reliably
  }: {
    limit?: number
    page?: number
    quality?: YTSQuality
    minimumIMDBRating?: number
    query?: string
    genre?: string
    sortBy?: YTSSortBy
    orderBy?: YTSOrderBy
    withRTRatings?: boolean
  } = {}): Promise<types.yts.Movie[]> {
    const url = `${BASE_URL}/v2/list_movies.json`

    const res = await got(url, {
      searchParams: {
        limit,
        page,
        quality,
        minimum_rating: minimumIMDBRating,
        query_term: query,
        genre,
        sort_by: sortBy,
        order_by: orderBy,
        with_rt_ratings: withRTRatings
      }
    }).json<types.yts.APIResponseListMovies>()

    return res.data.movies
  }

  public async getMovie({
    imdbId,
    ytsId,
    images = false,
    cast = false
  }: {
    imdbId?: string
    ytsId?: number
    images?: boolean
    cast?: boolean
  }): Promise<types.yts.Movie> {
    const url = `${BASE_URL}/v2/movie_details.json`

    if (!imdbId && !ytsId) {
      throw new Error(`imdbId or ytsId must be provided`)
    }

    const res = await got(url, {
      searchParams: {
        imdb_id: imdbId,
        movie_id: ytsId,
        with_images: images,
        with_cast: cast
      }
    }).json<types.yts.APIResponseGetMovie>()

    return res.data.movie
  }
}
