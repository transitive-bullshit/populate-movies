import dotenv from 'dotenv-safe'

dotenv.config()

export const dataDir = 'data'
export const outDir = 'out'

export const numBatches = 24
export const batchSize = 32000

// local data dumps
export const tmdbMovieIdsDumpPath = `${dataDir}/tmdb_dump_movie_ids.json`
export const imdbRatingsPath = `${dataDir}/title.ratings.tsv`

// local caches
export const imdbMoviesPath = `${outDir}/imdb-movies.json`
export const flickMetrixMoviesPath = `${outDir}/flick-metrix-movies.json`
