export namespace flickMetrix {
  export interface Movie {
    ID: number
    imdbID: string
    Title: string
    Year: number
    Genre: string
    Released: string
    Director: string
    Cast: string
    imdbRating: number
    imdbVotes: number
    Poster: string
    Plot: string
    Language: string
    Awards: string
    Image: null
    CriticRating: number
    CriticReviews: number
    Consensus: null
    MetacriticRating: number
    MetacriticReviews: number
    AudienceRating: number
    AudienceReviews: number
    DVD: string
    BoxOffice: null
    Production: string
    Trailer: string
    UserWantsToWatch: null
    UserSeen: null
    UserComments: null
    UserRating: null
    UserFavourite: null
    UserRecommends: null
    UserLikes: null
    ComboScore: number
    PosterPath: string
    onDVD: boolean
    LetterboxdScore: number
    // this key unexpectedly uses lowercase in their data for some reason
    // (the lowercase `l` is not a typo)
    letterboxdVotes: number
    RTUrl: string
    Providers: Provider[]
    isTV: boolean
  }

  export interface Provider {
    ID: number
    Country: string
    Provider: string
    imdbID: string
    DateAvailable: string
    Link: string
    tmbdID: number
    isSA: boolean
    isTV: boolean
    newRefresh: boolean
  }
}
