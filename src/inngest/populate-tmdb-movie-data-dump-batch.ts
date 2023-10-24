import { type Events, inngest } from './client'

export const populateTMDBMovieDataDumpBatch = inngest.createFunction(
  {
    id: 'populate-tmdb-movie-data-dump-batch',
    concurrency: 1
  },
  { event: 'db/populate-tmdb-movie-data-dump-batch' },
  async ({ event, step }) => {
    if (!event.data.tmdbIds?.length) {
      return
    }

    const events = event.data.tmdbIds.map<Events['db/populate-tmdb-movie']>(
      (tmdbId) => ({
        name: 'db/populate-tmdb-movie',
        data: { tmdbId }
      })
    )

    await step.sendEvent('db/populate-tmdb-movie', events)
    return { count: events.length }
  }
)
