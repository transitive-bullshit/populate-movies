import fs from 'node:fs'
import stream from 'node:stream'
import { promisify } from 'node:util'

import got from 'got'
import makeDir from 'make-dir'
import zlib from 'minizlib'

import * as config from './lib/config'

const pipeline = promisify(stream.pipeline)

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
  return pipeline(
    got.stream(url),
    new zlib.Gunzip(),
    fs.createWriteStream(config.tmdbMovieIdsDumpPath)
  )
}

async function downloadIMDBTitleRatingsDump() {
  const url = 'https://datasets.imdbws.com/title.ratings.tsv.gz'

  console.log('downloading IMDB title ratings data dump', url)
  return pipeline(
    got.stream(url),
    new zlib.Gunzip(),
    fs.createWriteStream(config.imdbRatingsPath)
  )
}

/**
 * Downloads the TMDB and IMDB data dumps.
 */
async function main() {
  await makeDir(config.outDir)

  await downloadTMDBMovieDump()
  await downloadIMDBTitleRatingsDump()

  console.warn('\ndone')
}

main()
