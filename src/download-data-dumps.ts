import fs from 'node:fs'
import fsp from 'node:fs/promises'
import stream from 'node:stream'
import { promisify } from 'node:util'
import zlib from 'node:zlib'

import got from 'got'
import makeDir from 'make-dir'
import minizlib from 'minizlib'

import * as config from './lib/config'

const pipeline = promisify(stream.pipeline)
const gunzip = promisify(zlib.gunzip)

async function downloadTMDBMovieDump() {
  const date = new Date()
  date.setDate(date.getDate() - 1)
  const month = (1 + date.getUTCMonth()).toString()
  const day = date.getUTCDate().toString()
  const year = date.getUTCFullYear().toString()
  const url = `http://files.tmdb.org/p/exports/movie_ids_${month.padStart(
    2,
    '0'
  )}_${day.padStart(2, '0')}_${year}.json.gz`

  console.log('downloading TMDB movie ID data dump', url)

  const buffer = await got(url).buffer()
  const unzippedBuffer = await gunzip(buffer)
  const rawDump = unzippedBuffer.toString('utf-8')
  // TMDB's data dump isn't valid JSON, so coerce it
  const jsonStringifiedDump =
    '[\n' + rawDump.split('\n').filter(Boolean).join(',\n') + '\n]'

  return fsp.writeFile(config.tmdbMovieIdsDumpPath, jsonStringifiedDump, {
    encoding: 'utf-8'
  })
}

async function downloadIMDBTitleRatingsDump() {
  const url = 'https://datasets.imdbws.com/title.ratings.tsv.gz'

  console.log('downloading IMDB title ratings data dump', url)
  return pipeline(
    got.stream(url),
    new minizlib.Gunzip(),
    fs.createWriteStream(config.imdbRatingsPath)
  )
}

/**
 * Downloads the TMDB and IMDB data dumps.
 */
async function main() {
  await makeDir(config.outDir)

  await Promise.all([downloadTMDBMovieDump(), downloadIMDBTitleRatingsDump()])

  console.warn('\ndone')
}

main()
