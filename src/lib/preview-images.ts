import got from 'got'
import lqip from 'lqip-modern'
import pMap from 'p-map'
import pMemoize from 'p-memoize'

import * as types from '../types'
import { keyv } from './keyv'

export type PreviewImage = string

export async function enrichMoviesWithPreviewImages(movies: types.Movie[]) {
  await pMap(movies, enrichMovieWithPreviewImages, {
    concurrency: 8
  })
}

export async function enrichMovieWithPreviewImages(movie: types.Movie) {
  if (movie.posterUrl && movie.posterPlaceholderUrl === undefined) {
    const url = movie.posterUrl
    const cacheKey = getCacheKey(url)
    const previewImage = await getPreviewImage({ url, cacheKey })

    movie.posterPlaceholderUrl = previewImage
  }

  if (movie.backdropUrl && movie.backdropPlaceholderUrl === undefined) {
    const url = movie.backdropUrl
    const cacheKey = getCacheKey(url)
    const previewImage = await getPreviewImage({ url, cacheKey })

    movie.backdropPlaceholderUrl = previewImage
  }
}

async function createPreviewImage({
  url,
  cacheKey
}: {
  url: string
  cacheKey: string
}): Promise<PreviewImage | null> {
  try {
    try {
      const cachedPreviewImage: PreviewImage = await keyv.get(cacheKey)
      if (cachedPreviewImage) {
        return cachedPreviewImage
      }
    } catch (err: any) {
      // ignore redis errors
      console.warn(`redis error get "${cacheKey}"`, err.message)
    }

    const { body } = await got(url, {
      responseType: 'buffer',
      timeout: { request: 10000 }
    })
    const result = await lqip(body)
    console.log('lqip', { ...result.metadata, url, cacheKey })

    const previewImage = result.metadata.dataURIBase64

    try {
      await keyv.set(cacheKey, previewImage)
    } catch (err: any) {
      // ignore redis errors
      console.warn(`redis error set "${cacheKey}"`, err.message)
    }

    return previewImage
  } catch (err: any) {
    console.warn('failed to create preview image', url, err.message)
    return null
  }
}

export const getPreviewImage = pMemoize(createPreviewImage, {
  cacheKey: (args: Parameters<typeof createPreviewImage>) => args[0].cacheKey
})

export function getCacheKey(url: string) {
  try {
    const parsed = new URL(url)

    if (parsed.hostname === 'image.tmdb.org') {
      const parts = parsed.pathname.split('/')
      return parts[parts.length - 1]
    } else {
      // TODO: use normalized url
    }
  } catch (err) {
    // TODO: should we just ignore invalid urls here?
  }

  return url
}
