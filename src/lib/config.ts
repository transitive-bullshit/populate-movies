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

// ----------------------------------------------------------------------------

// Optional redis instance for persisting preview images
export const enablePreviewImages = true
export const redisHost = process.env.REDIS_HOST
export const redisPassword = process.env.REDIS_PASSWORD
export const redisUser = process.env.REDIS_USER || 'default'
export const redisNamespace = process.env.REDIS_NAMESPACE || 'preview-images'
export const redisUrl =
  process.env.REDIS_URL || `redis://${redisUser}:${redisPassword}@${redisHost}`
