import { downloadTMDBMovieDataDump } from 'src/lib/tmdb'

import { type Events, inngest } from './client'

export const populateTMDBMovieDataDump = inngest.createFunction(
  {
    id: 'populate-tmdb-movie-data-dump',
    concurrency: 1
  },
  { event: 'db/populate-tmdb-movie-data-dump' },
  async ({ event, step, logger }) => {
    const rawDumpedMovies = await downloadTMDBMovieDataDump(event.data.date)
    const dumpedMovies = rawDumpedMovies
      // ignore adult movies
      .filter((dumpedMovie) => !dumpedMovie.adult)
      // sort input movies by popularity so we process more popular movies first
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    // .slice(0, 32) // for testing

    logger.info('downloaded', rawDumpedMovies.length, 'movies')
    logger.info('processing', dumpedMovies.length, 'movies')

    const limit = 500
    const numBatches = Math.ceil(dumpedMovies.length / limit)
    const events: Array<Events['db/populate-tmdb-movie-data-dump-batch']> = []

    for (let i = 0; i < numBatches; i++) {
      const offset = i * limit
      events.push({
        name: 'db/populate-tmdb-movie-data-dump-batch',
        data: {
          tmdbIds: dumpedMovies
            .slice(offset, offset + limit)
            .map((dumpedMovie) => dumpedMovie.id)
        }
      })
    }

    await step.sendEvent('db/populate-tmdb-movie-data-dump-batch', events)
    return { count: events.length, total: dumpedMovies.length }
  }
)
