import * as types from '../types'

/**
 * Converts a TMDB movie to our normalized format.
 */
export function convertTMDBMovieDetailsToMovie(
  movieDetails: types.tmdb.MovieDetails
): types.Movie {
  const releaseDate = movieDetails.release_date || null
  const releaseYear = releaseDate ? new Date(releaseDate).getFullYear() : null

  // example tmdb image URL
  // https://image.tmdb.org/t/p/w780/wfGfxtBkhBzQfOZw4S8IQZgrH0a.jpg

  const posterSize = 'w780' // 'original'
  const posterUrl = movieDetails.poster_path
    ? `https://image.tmdb.org/t/p/${posterSize}${movieDetails.poster_path}`
    : null

  const backdropSize = 'w1280' // 'original'
  const backdropUrl = movieDetails.backdrop_path
    ? `https://image.tmdb.org/t/p/${backdropSize}${movieDetails.backdrop_path}`
    : null

  let trailerUrl: string = null
  let trailerYouTubeId: string = null

  if (movieDetails.videos?.results?.length) {
    const video = getBestTMDBTrailerVideo(movieDetails.videos.results)

    if (video && video.key) {
      trailerUrl = `https://youtube.com/watch?v=${video.key}`
      trailerYouTubeId = video.key
    }
  }

  return {
    // ids
    tmdbId: movieDetails.id,
    imdbId: movieDetails.imdb_id,

    // general metadata
    title: movieDetails.title || movieDetails.original_title,
    originalTitle: movieDetails.original_title,
    language: movieDetails.original_language,
    releaseDate,
    releaseYear,
    genres: movieDetails.genres,
    overview: movieDetails.overview,
    runtime: movieDetails.runtime,
    adult: movieDetails.adult,
    budget: movieDetails.budget,
    revenue: movieDetails.revenue,
    homepage: movieDetails.homepage,
    status: movieDetails.status,

    // media
    posterUrl,
    backdropUrl,
    trailerUrl,
    trailerYouTubeId,

    // tmdb
    tmdbPopularity: movieDetails.popularity,
    tmdbRating: movieDetails.vote_average,
    tmdbVotes: movieDetails.vote_count
  }
}

export function populateMovieWithIMDBInfo(
  movie: types.Movie,
  {
    imdbRatings,
    imdbMovies
  }: { imdbRatings?: types.IMDBRatings; imdbMovies?: types.IMDBMovies }
) {
  if (movie.imdbId) {
    const imdbRating = imdbRatings[movie.imdbId]
    const imdbMovie = imdbMovies[movie.imdbId]
    let hasIMDBRating = false

    if (imdbMovie) {
      if (imdbMovie.mainRate?.rateSource?.toLowerCase() === 'imdb') {
        hasIMDBRating = true
        movie.imdbRating = imdbMovie.mainRate.rate
        movie.imdbVotes = imdbMovie.mainRate.votesCount
      }

      const metacriticRate = imdbMovie.allRates?.find(
        (rate) => rate.rateSource?.toLowerCase() === 'metacritics'
      )
      if (metacriticRate) {
        movie.metacriticRating = metacriticRate.rate
        movie.metacriticVotes = metacriticRate.votesCount
      }
    }

    if (imdbRating) {
      if (
        hasIMDBRating &&
        (movie.imdbRating !== imdbRating.rating ||
          movie.imdbVotes !== imdbRating.numVotes)
      ) {
        console.warn(
          `imdb rating mismatch ${movie.imdbId} (${movie.status}) ${movie.title}`,
          {
            scrapedIMDBRating: movie.imdbRating,
            scrapedIMDBVotes: movie.imdbVotes,
            dumpedIMDBRating: imdbRating.rating,
            dumpedIMDBVotes: imdbRating.numVotes
          }
        )
      }

      hasIMDBRating = true
      movie.imdbRating = imdbRating.rating
      movie.imdbVotes = imdbRating.numVotes
    }

    if (!hasIMDBRating) {
      console.log(
        `missing imdb rating ${movie.imdbId} (${movie.status}) ${movie.title}`
      )
    }
  }
}

/**
 * This function tries to find the best matching YouTube trailer for a given video.
 *
 * Ideally, this would be the official trailer in English, but we also consider a
 * series of fallbacks like teaser trailers and film clips of no trailer videos are
 * included in the data from TMDB.
 */
export function getBestTMDBTrailerVideo(
  inputVideos: types.tmdb.Video[]
): types.tmdb.Video | null {
  const videos = inputVideos.filter(
    (video) =>
      video.site?.toLowerCase() === 'youtube' && video.name && video.key
  )
  let candidates: types.tmdb.Video[]
  let candidate: types.tmdb.Video

  candidates = videos.filter((video) => video.type === 'Trailer')

  if (!candidates.length) {
    candidates = videos.filter((video) => video.type === 'Teaser')
  }

  if (!candidates.length) {
    candidates = videos.filter((video) => video.type === 'Clip')
  }

  if (!candidates.length) {
    candidates = videos.filter((video) => video.iso_639_1 === 'en')
  }

  if (!candidates.length) {
    candidates = videos
  }

  if (!candidates.length) {
    return null
  }

  candidate = candidates.find((video) => /^official trailer$/i.test(video.name))
  if (candidate) return candidate

  candidate = candidates.find((video) =>
    /\bofficial\s*us\s*trailer\b/i.test(video.name)
  )
  if (candidate) return candidate

  candidate = candidates.find((video) =>
    /\bofficial\s*final\s*trailer\b/i.test(video.name)
  )
  if (candidate) return candidate

  candidate = candidates.find((video) =>
    /\bofficial\s*trailer\b/i.test(video.name)
  )
  if (candidate) return candidate

  candidate = candidates.find((video) => /official.+trailer/i.test(video.name))
  if (candidate) return candidate

  candidate = candidates.find((video) => /\btrailer\b/i.test(video.name))
  if (candidate) return candidate

  candidate = candidates.find((video) => /trailer/i.test(video.name))
  if (candidate) return candidate

  candidate = candidates.find((video) => video.name === 'Official Teaser')
  if (candidate) return candidate

  candidate = candidates.find((video) => /official.+teaser/i.test(video.name))
  if (candidate) return candidate

  candidate = candidates.find((video) => /\bteaser\b/i.test(video.name))
  if (candidate) return candidate

  candidate = candidates.find((video) => /\bpreview\b/i.test(video.name))
  if (candidate) return candidate

  candidate = candidates.find((video) => /\bsneak peek\b/i.test(video.name))
  if (candidate) return candidate

  candidate = candidates.find((video) => /teaser/i.test(video.name))
  if (candidate) return candidate

  candidate = candidates.find((video) => /preview/i.test(video.name))
  if (candidate) return candidate

  candidate = candidates.find((video) => /sneak peek/i.test(video.name))
  if (candidate) return candidate

  candidate = candidates.find((video) => video.iso_639_1 === 'en')
  if (candidate) return candidate

  candidate = candidates[0]
  if (candidate) return candidate

  return null
}
