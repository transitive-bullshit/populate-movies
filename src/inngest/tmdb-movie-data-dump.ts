import { promisify } from 'node:util'
import zlib from 'node:zlib'

import got from 'got'

import * as types from '../types'
import { type Events, type Logger, inngest } from './client'

const gunzip = promisify(zlib.gunzip)

export const populateTMDBMovieDataDump = inngest.createFunction(
  {
    id: 'populate-tmdb-movie-data-dump'
  },
  { event: 'db/populate-tmdb-movie-data-dump' },
  async ({ step, logger }) => {
    const dumpedMovies = await step.run('download-tmdb-movie-data-dump', () =>
      downloadTMDBMovieDump({ logger })
    )

    const events = dumpedMovies
      // ignore adult movies
      .filter((dumpedMovie) => !dumpedMovie.adult)
      // sort input movies by popularity so we process more popular movies first
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .map<Events['db/populate-tmdb-movie']>((dumpedMovie) => ({
        name: 'db/populate-tmdb-movie',
        data: dumpedMovie
      }))

    await step.sendEvent('db/populate-tmdb-movie', events)

    return { count: events.length }
  }
)

async function downloadTMDBMovieDump({ logger }: { logger: Logger }) {
  const date = new Date()
  date.setDate(date.getDate() - 1)
  const month = (1 + date.getUTCMonth()).toString()
  const day = date.getUTCDate().toString()
  const year = date.getUTCFullYear().toString()
  const url = `http://files.tmdb.org/p/exports/movie_ids_${month.padStart(
    2,
    '0'
  )}_${day.padStart(2, '0')}_${year}.json.gz`

  logger.info('downloading TMDB movie ID data dump', url)

  const buffer = await got(url).buffer()
  const unzippedBuffer = await gunzip(buffer)
  const rawDump = unzippedBuffer.toString('utf-8')
  // TMDB's data dump isn't valid JSON, so coerce it
  const jsonStringifiedDump =
    '[\n' + rawDump.split('\n').filter(Boolean).join(',\n') + '\n]'

  const dump = JSON.parse(jsonStringifiedDump) as Array<types.tmdb.DumpedMovie>
  logger.info('downloaded', dump.length, 'movies')
  return dump
}
