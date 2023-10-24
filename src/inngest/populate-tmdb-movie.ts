import * as redis from '../lib/redis'
import { TMDB } from '../lib/tmdb'
import { inngest } from './client'

export const populateTMDBMovie = inngest.createFunction(
  {
    id: 'populate-tmdb-movie',
    concurrency: 16
  },
  { event: 'db/populate-tmdb-movie' },
  async ({ event, step, logger }) => {
    const tmdbMovie = await step.run('get-tmdb-movie', async () => {
      const tmdb = new TMDB({ bearerToken: process.env.TMDB_BEARER_TOKEN })
      logger.info('tmdb get', event.data.tmdbId)

      const res = await tmdb.getMovieDetails(event.data.tmdbId, {
        videos: true,
        images: true,
        externalIds: true
      })

      return res
    })

    logger.info({ tmdbId: tmdbMovie.id, imdbId: tmdbMovie.imdb_id })
    const status = await step.run('upsert-tmdb-movie', async () =>
      redis.upsertTMDBMovie(tmdbMovie)
    )

    return { status, tmdbId: tmdbMovie.id }
  }
)
