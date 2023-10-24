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
    // ignore adult movies
    if (event.data.adult) {
      return null
    }

    const tmdbMovie = await step.run('get-tmdb-movie', () => {
      const tmdb = new TMDB({ bearerToken: process.env.TMDB_BEARER_TOKEN })
      logger.info(event.data.id, event.data.original_title)

      return tmdb.getMovieDetails(event.data.id, {
        videos: true,
        images: true,
        externalIds: true
      })
    })

    const redisId = await step.run('upsert-tmdb-movie', () =>
      redis.upsertTMDBMovie(tmdbMovie)
    )

    return { redisId, tmdbId: tmdbMovie.id }
  }
)
