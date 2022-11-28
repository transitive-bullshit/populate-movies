export namespace omdb {
  export interface Movie {
    Title: string
    Year: string
    Rated: string
    Released: string
    Runtime: string
    Genre: string
    Director: string
    Writer: string
    Actors: string
    Plot: string
    Language: string
    Country: string
    Awards: string
    Poster: string
    Ratings: Rating[]
    Metascore: string
    imdbRating: string
    imdbVotes: string
    imdbID: string
    Type: string
    tomatoMeter?: string
    tomatoImage?: string
    tomatoRating?: string
    tomatoReviews?: string
    tomatoFresh?: string
    tomatoRotten?: string
    tomatoConsensus?: string
    tomatoUserMeter?: string
    tomatoUserRating?: string
    tomatoUserReviews?: string
    tomatoURL?: string
    DVD: string
    BoxOffice: string
    Production: string
    Website: string
    Response: string
  }

  export interface Rating {
    Source: string
    Value: string
  }
}
