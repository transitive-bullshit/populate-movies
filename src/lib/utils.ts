import * as types from '../types'

/**
 * Converts a TMDB movie to our normalized format.
 *
 * Also extracts the highest quality images and YouTube trailer using a series
 * of heuristics.
 */
export function convertTMDBMovieDetailsToMovie(
  movieDetails: types.tmdb.MovieDetails
): types.Movie {
  const releaseDate = movieDetails.release_date || null
  const releaseYear = releaseDate ? new Date(releaseDate).getFullYear() : null

  // example tmdb image URL
  // https://image.tmdb.org/t/p/w780/wfGfxtBkhBzQfOZw4S8IQZgrH0a.jpg

  let posterUrl: string = null
  let posterWidth: number = null
  let posterHeight: number = null
  if (movieDetails.poster_path) {
    const posterImage = movieDetails.images?.posters.find(
      (image) => image.file_path === movieDetails.poster_path
    )

    if (posterImage) {
      const posterSize = 'w780' // 'original'
      posterUrl = `https://image.tmdb.org/t/p/${posterSize}${movieDetails.poster_path}`
      posterWidth = posterImage.width
      posterHeight = posterImage.height
    }
  }

  let backdropUrl: string = null
  let backdropWidth: number = null
  let backdropHeight: number = null
  if (movieDetails.backdrop_path) {
    const backdropImage = movieDetails.images?.backdrops.find(
      (image) => image.file_path === movieDetails.backdrop_path
    )
    if (backdropImage) {
      const backdropSize = 'w1280' // 'original'
      backdropUrl = `https://image.tmdb.org/t/p/${backdropSize}${movieDetails.backdrop_path}`
      backdropWidth = backdropImage.width
      backdropHeight = backdropImage.height
    }
  }

  let trailerUrl: string = null
  let trailerYouTubeId: string = null

  if (movieDetails.videos?.results?.length) {
    const video = getBestTMDBTrailerVideo(movieDetails.videos.results)

    if (video && video.key) {
      trailerUrl = `https://youtube.com/watch?v=${video.key}`
      trailerYouTubeId = video.key
    }
  }

  const genreMappings = {
    'science fiction': 'scifi',
    'tv movie': 'tv-movie'
  }
  const genres =
    movieDetails.genres
      ?.map((genre) => genre.name?.toLowerCase())
      .filter(Boolean)
      .map((name) => genreMappings[name] ?? name) ?? []

  return {
    // ids
    id: movieDetails.id,
    tmdbId: movieDetails.id,
    imdbId: movieDetails.imdb_id,

    // general metadata
    title: movieDetails.title || movieDetails.original_title,
    originalTitle: movieDetails.original_title,
    language: movieDetails.original_language,
    releaseDate,
    releaseYear,
    genres,
    plot: movieDetails.overview,
    runtime: movieDetails.runtime,
    adult: movieDetails.adult,
    budget: movieDetails.budget ? `${movieDetails.budget}` : null,
    revenue: movieDetails.revenue ? `${movieDetails.revenue}` : null,
    homepage: movieDetails.homepage,
    status: movieDetails.status?.toLowerCase(),
    keywords: [],
    countriesOfOrigin: [],
    languages: [],
    cast: movieDetails.cast || [],
    director: movieDetails.director || null,

    // images
    posterUrl,
    posterWidth,
    posterHeight,
    backdropUrl,
    backdropWidth,
    backdropHeight,

    // video
    trailerUrl,
    trailerYouTubeId,

    // tmdb
    tmdbPopularity: movieDetails.popularity,
    tmdbRating: movieDetails.vote_average,
    tmdbVotes: movieDetails.vote_count
  }
}

/**
 * Augments a normalized TMDB movie with additional metadata from IMDB.
 *
 * In most cases, we prefer the IMDB data over TMDB equivalents.
 *
 * This function also filters many movies which are unlikely to be relevant
 * for most use cases.
 */
export function populateMovieWithIMDBInfo(
  movie: types.Movie,
  {
    imdbRatings,
    imdbMovies
  }: { imdbRatings?: types.IMDBRatings; imdbMovies?: types.IMDBMovies }
): types.Movie | null {
  if (movie.imdbId) {
    const imdbRating = imdbRatings[movie.imdbId]
    const imdbMovie = imdbMovies[movie.imdbId]
    let hasIMDBRating = false

    if (imdbMovie) {
      if (imdbMovie.genres?.length) {
        const genres = imdbMovie.genres.map((genre) => genre.toLowerCase())
        movie.genres = movie.genres.concat(genres)

        // ensure genres are unique
        movie.genres = Array.from(new Set(movie.genres))
      }

      if (imdbMovie.keywords?.length) {
        movie.keywords = imdbMovie.keywords
      }

      if (imdbMovie.countriesOfOrigin?.length) {
        movie.countriesOfOrigin = imdbMovie.countriesOfOrigin
      }

      if (imdbMovie.languages?.length) {
        movie.languages = imdbMovie.languages
      }

      if (imdbMovie.ageCategoryTitle) {
        movie.mpaaRating = imdbMovie.ageCategoryTitle
      }

      if (imdbMovie.plot) {
        if (movie.plot && imdbMovie.plot?.trim().endsWith('Read all')) {
          // ignore truncated plots
        } else {
          // otherwise favor the IMDB plot over the TMDB plot
          movie.plot = imdbMovie.plot.replace(/\.\.\. read all$/i, '...')
        }
      }

      if (imdbMovie.boxOffice) {
        if (imdbMovie.boxOffice.budget > 0) {
          movie.budget = `${imdbMovie.boxOffice.budget}`
        }

        if (imdbMovie.boxOffice.worldwide > 0) {
          movie.revenue = `${imdbMovie.boxOffice.worldwide}`
        }
      }

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

      movie.imdbType = imdbMovie.mainType

      const genres = new Set(movie.genres)
      if (genres.has('short')) {
        if (imdbMovie.mainType === 'movie') {
          movie.imdbType = 'short'
        }

        // ignore IMDB-labeled short films
        return null
      }
    }

    if (imdbRating) {
      // if we have IMDB ratings from two sources, take the one with more votes,
      // which is likely to be more recent
      if (!hasIMDBRating || imdbRating.numVotes > movie.imdbVotes) {
        hasIMDBRating = true
        movie.imdbRating = imdbRating.rating
        movie.imdbVotes = imdbRating.numVotes
      }
    }
  }

  return movie
}

/**
 * This function tries to find the best matching YouTube trailer for a given video.
 *
 * Ideally, this would be the official trailer in English, but we also consider a
 * series of fallbacks like teaser trailers and film clips if no trailer videos are
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
