import { EventSchemas, type GetEvents, Inngest } from 'inngest'

import * as types from '../types'

type RawEvents = {
  'db/populate-tmdb-movie-data-dump': {}
  'db/populate-tmdb-movie-data-dump-batch': {
    data: {
      tmdbIds: number[]
    }
  }
  'db/populate-tmdb-movie': {
    data: {
      tmdbId: number
    }
  }
}

export const inngest = new Inngest({
  id: 'populate-movies',
  schemas: new EventSchemas().fromRecord<RawEvents>()
})

export type Events = GetEvents<typeof inngest>
