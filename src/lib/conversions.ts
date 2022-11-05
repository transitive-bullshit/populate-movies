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

  const genreMappings = {
    'science fiction': 'scifi'
  }
  const genres =
    movieDetails.genres
      ?.map((genre) => genre.name?.toLowerCase())
      .filter(Boolean)
      .map((name) => genreMappings[name] ?? name) ?? []

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
    genres,
    overview: movieDetails.overview,
    runtime: movieDetails.runtime,
    adult: movieDetails.adult,
    budget: movieDetails.budget,
    revenue: movieDetails.revenue,
    homepage: movieDetails.homepage,
    status: movieDetails.status?.toLowerCase(),
    keywords: [],
    countriesOfOrigin: [],
    languages: [],

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
      if (imdbMovie.genres) {
        const genres = imdbMovie.genres.map((genre) => genre.toLowerCase())
        movie.genres = movie.genres.concat(genres)

        // ensure genres are unique
        movie.genres = Array.from(new Set(movie.genres))
      }

      if (imdbMovie.keywords) {
        movie.keywords = imdbMovie.keywords

        const keywords = new Set(movie.keywords)
        if (
          keywords.has('edited from tv series') ||
          keywords.has('compilation movie') ||
          keywords.has('live performance')
        ) {
          return null
        }
      }

      if (imdbMovie.countriesOfOrigin) {
        movie.countriesOfOrigin = imdbMovie.countriesOfOrigin
      }

      if (imdbMovie.languages) {
        movie.languages = imdbMovie.languages
      }

      if (imdbMovie.ageCategoryTitle) {
        movie.ageRating = imdbMovie.ageCategoryTitle
      }

      if (imdbMovie.plot) {
        if (movie.overview && imdbMovie.plot?.trim().endsWith('Read all')) {
          // ignore truncated plots
        } else {
          // otherwise favor the IMDB plot over the TMDB plot
          movie.overview = imdbMovie.plot.replace(/\.\.\. read all$/i, '...')
        }
      }

      if (imdbMovie.boxOffice) {
        if (imdbMovie.boxOffice.budget > 0) {
          movie.budget = imdbMovie.boxOffice.budget
        }

        if (imdbMovie.boxOffice.worldwide > 0) {
          movie.revenue = imdbMovie.boxOffice.worldwide
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

      if (
        imdbMovie.mainType !== 'movie' &&
        (imdbMovie.mainType as any) !== 'video'
      ) {
        // if ((imdbMovie.mainType as any) === 'tvSpecial') {
        //   console.log('ignoring tv special', movie)
        // } else if ((imdbMovie.mainType as any) === 'tvMovie') {
        //   console.log('ignoring tv movie', movie)
        // }

        // ignore non-movie / non-video titles
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

    // if (!hasIMDBRating) {
    //   console.warn(
    //     `missing imdb rating ${movie.imdbId} (${movie.status}) ${movie.title}`
    //   )
    // }
  }

  if (isMovieLikelyStandupSpecial(movie)) {
    movie.genres.push('stand up')
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

function isTextLikelyStandupSpecial(text: string): boolean {
  if (!text) {
    return false
  }

  if (/\bstand[ -]up comedy special\b/.test(text)) {
    return true
  }

  if (/\bstand[ -]up special\b/.test(text)) {
    return true
  }

  if (/\bstand[ -]up comedy\b/.test(text)) {
    return true
  }

  return false
}

const comedySpecialIMDBIds = new Set(['tt1794821'])

function isMovieLikelyStandupSpecial(movie: types.Movie): boolean {
  if (comedySpecialIMDBIds.has(movie.imdbId)) {
    return true
  }

  const keywords = new Set(movie.keywords)

  if (
    !keywords.has('stand up') &&
    !keywords.has('stand-up') &&
    !keywords.has('stand up special') &&
    !keywords.has('stand-up special') &&
    !isTextLikelyStandupSpecial(movie.overview)
  ) {
    if (
      (keywords.has('stand up comedy') || keywords.has('stand-up comedy')) &&
      movie.imdbType !== 'movie'
    ) {
      // likely a video / Q&A session
      return true
    } else {
      return false
    }
  }

  const standupKeywords = [
    'tv special',
    'live performance',
    'stand up special',
    'stand-up special',
    'stand up comedy',
    'stand-up comedy',
    'stand up act',
    'stand-up act',
    'stand up routine',
    'stand-up routine',
    'stand up comedy performance',
    'stand-up comedy performance'
  ]

  for (const keyword of standupKeywords) {
    if (keywords.has(keyword)) {
      return true
    }
  }

  const genres = new Set(movie.genres)

  if (!genres.has('comedy')) {
    return false
  }

  if (genres.has('documentary')) {
    if (genres.size !== 2) {
      // potentially a documentary about stand up comedy
      return false
    }
  } else if (genres.size > 1) {
    // comedy + non-documentary genre => likely a film related to stand up comedy
    return false
  }

  return true
}
