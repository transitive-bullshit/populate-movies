import dotenv from 'dotenv-safe'

dotenv.config()

export const dataDir = 'data'
export const outDir = 'out'

export const numBatches = 24
export const batchSize = 32000

export const tmdbMovieIdsDumpPath = `${dataDir}/tmdb_dump_movie_ids.json`
export const imdbMoviesPath = `${outDir}/imdb-movies.json`
export const imdbRatingsPath = `${dataDir}/title.ratings.tsv`
