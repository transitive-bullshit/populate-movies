import { populateTMDBMovie } from './populate-tmdb-movie'
import { populateTMDBMovieDataDump } from './populate-tmdb-movie-data-dump'
import { populateTMDBMovieDataDumpBatch } from './populate-tmdb-movie-data-dump-batch'

export const functions = [
  populateTMDBMovieDataDump,
  populateTMDBMovieDataDumpBatch,
  populateTMDBMovie
]
