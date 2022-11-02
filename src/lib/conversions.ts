import * as types from '../types'

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

    if (video) {
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
