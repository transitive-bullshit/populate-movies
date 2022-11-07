export namespace tmdb {
  export interface DumpedMovie {
    id: number
    original_title: string
    popularity: number
    adult: boolean
    video: boolean
  }

  export interface MovieDetails {
    adult: boolean
    backdrop_path: string
    belongs_to_collection?: any
    budget: number
    homepage: string
    id: number
    imdb_id: string
    original_language: string
    original_title: string
    overview: string
    popularity: number
    poster_path?: any
    genres?: Genre[]
    production_companies: ProductionCompany[]
    production_countries: ProductionCountry[]
    release_date: string
    revenue: number
    runtime: number
    spoken_languages: SpokenLanguage[]
    status: string
    tagline: string
    title: string
    video: boolean
    vote_average: number
    vote_count: number

    // optional via append_to_response
    videos?: Videos
    images?: Images

    // added separately
    cast?: string[]
    director?: string
  }

  export interface AuthorDetails {
    name: string
    username: string
    avatar_path: string
    rating?: number
  }

  export interface KnownFor {
    id: number
    overview: string
    release_date: string
    video: boolean
    adult: boolean
    backdrop_path: string
    media_type: string
    genre_ids: number[]
    title: string
    original_language: string
    original_title: string
    poster_path: string
    vote_count: number
    vote_average: number
    popularity: number
  }

  export interface Person {
    id: number
    name: string
    known_for: KnownFor[]
    profile_path: string
    adult: boolean
    known_for_department: string
    gender: number
    popularity: number
  }

  export interface Collection {
    id: number
    backdrop_path: string
    name: string
    poster_path: string
  }

  export interface Movie {
    id: number
    logo_path: string
    name: string
    poster_path: string
    adult: boolean
    overview: string
    release_date: string
    genre_ids: number[]
    original_title: string
    original_language: string
    title: string
    backdrop_path: string
    popularity: number
    vote_count: number
    video: boolean
    vote_average: number
  }

  export interface Company {
    id: number
    logo_path: string
    name: string
    origin_country: string
  }

  export interface TV {
    id: number
    name: string
    first_air_date: string
    backdrop_path: string
    genre_ids: number[]
    origin_country: string[]
    original_language: string
    original_name: string
    overview: string
    poster_path: string
    popularity: number
    vote_count: number
    vote_average: number
  }

  export interface Genre {
    id: number
    name: string
  }

  export interface ExternalIds {
    imdb_id: string
    facebook_id: string
    instagram_id: string
    twitter_id: string
    id: number
  }

  export interface ProductionCompany {
    id: number
    logo_path: string
    name: string
    origin_country: string
  }

  export interface ProductionCountry {
    iso_3166_1: string
    name: string
  }

  export interface SpokenLanguage {
    english_name: string
    iso_639_1: string
    name: string
  }

  export interface ContentRatings {
    results: ContentRatingsResult[]
    id: number
  }

  export interface ContentRatingsResult {
    iso_3166_1: string
    rating: string
  }

  export interface Recommendation {
    adult: boolean
    backdrop_path?: any
    genre_ids: number[]
    id: number
    original_language: string
    original_title: string
    overview: string
    release_date: string
    poster_path?: any
    popularity: number
    title: string
    video: boolean
    vote_average: number
    vote_count: number
  }

  export interface Recommendations {
    page: number
    results: Recommendation[]
    total_pages: number
    total_results: number
  }

  export interface Review {
    author: string
    author_details: AuthorDetails
    content: string
    created_at: Date
    id: string
    updated_at: Date
    url: string
  }

  export interface Reviews {
    id: number
    page: number
    results: Review[]
    total_pages: number
    total_results: number
  }

  export interface TranslationData {
    title: string
    overview: string
    homepage: string
  }

  export interface Translation {
    iso_3166_1: string
    iso_639_1: string
    name: string
    english_name: string
    data: TranslationData
  }

  export interface Translations {
    id: number
    translations: Translation[]
  }

  export interface Images {
    backdrops: Image[]
    logos: Image[]
    posters: Image[]
  }

  export interface Image {
    aspect_ratio: number
    height: number
    iso_639_1: null | string
    file_path: string
    vote_average: number
    vote_count: number
    width: number
  }
  export interface Videos {
    results: Video[]
  }

  export interface Video {
    iso_639_1: string
    iso_3166_1: string
    name: string
    key: string
    site: Site
    size: number
    type: VideoType
    official: boolean
    published_at: Date
    id: string
  }

  export enum Site {
    YouTube = 'YouTube'
  }

  export enum VideoType {
    Featurette = 'Featurette',
    Teaser = 'Teaser',
    Trailer = 'Trailer',
    Clip = 'Clip'
  }

  export interface Credits {
    id: string
    cast: CastCredit[]
    crew: CrewCredit[]
  }

  export interface CastCredit {
    adult: boolean
    gender: number
    id: number
    known_for_department: string
    name: string
    original_name: string
    popularity: number
    profile_path: string
    cast_id: number
    character: string
    credit_id: string
    order: number
  }

  export interface CrewCredit {
    adult: boolean
    gender: number
    id: number
    known_for_department: string
    name: string
    original_name: string
    popularity: number
    profile_path: null
    credit_id: string
    department: string
    job: string
  }
}
