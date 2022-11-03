# Populate Movies

> Populates a full database of movies from TMDB and IMDB into Prisma.

[![Build Status](https://github.com/transitive-bullshit/populate-movies/actions/workflows/test.yml/badge.svg)](https://github.com/transitive-bullshit/populate-movies/actions/workflows/test.yml) [![Prettier Code Formatting](https://img.shields.io/badge/code_style-prettier-brightgreen.svg)](https://prettier.io)

## Intro

This project includes a series of scripts for resolving movies from [TMDB](https://www.themoviedb.org/) and [IMDB](https://imdb.com/) in batches and eventually upserting them into a MySQL [Prisma](https://www.prisma.io/) database (I use [PlanetScale](https://planetscale.com/)'s free tier). It should be easy to support different databases with a few minor changes to the [Prisma schema](./prisma/schema.prisma).

## Prerequisites

- `node >= 16`
- `pnpm >= 7`
- [TMDB v3 API bearer token](https://developers.themoviedb.org/3/getting-started/introduction)
- [Prisma MySQL database URL](https://www.prisma.io/docs/getting-started/setup-prisma/start-from-scratch/relational-databases/connect-your-database-typescript-postgres) ([Planetscale guide](https://planetscale.com/docs/onboarding/create-an-account))

Store your `TMDB_BEARER_TOKEN` and `DATABASE_URL` in a local `.env` file.

You'll need to download an official [TMDB daily movie ID dump](https://developers.themoviedb.org/3/getting-started/daily-file-exports) such as [10/30/2022](http://files.tmdb.org/p/exports/movie_ids_10_30_2022.json.gz) and store it into `data/tmdb_dump_movie_ids.json`. This gives us an extensive list of all TMDB movie IDs.

If you want IMDB ratings, you'll also need to download an official [IMDB title ratings data dump](https://www.imdb.com/interfaces/). We're specifically interested in `title.ratings` such as [datasets.imdbws.com/title.ratings.tsv.gz](https://datasets.imdbws.com/title.ratings.tsv.gz) and store the uncompressed version into `data/title.ratings.tsv`. This file contains a large sample of IMDB movie IDs and their associated IMDB ratings + number of votes, which is nice because it is an official data source that drastically reduces the amount of scraping we need to do. Note that IMDB has [an official API](https://developer.imdb.com/), but it is extremely expensive to use (starting at $50k + usage-based billing).

Note that these large data dumps are not included in the Git repository

## Steps

Once we have the data dumps downloaded into `data/` and our environment variables setup, we can start processing them in batches. Several of the processing steps are broken up into batches (defaults to 32000 movies per batch) in order to allow for incremental processing and experimentation. This is also nice because it allows you to inspect the data after each step.

Make sure you've run `pnpm install`.

Next, we'll run `npx tsx src/populate-tmdb-movie-dump.ts` which populates each of the TMDB movie IDs with its corresponding TMDB movie details and stores the results into a series of batched JSON files `out/tmdb-0.json`, `out/tmdb-1.json`, etc. (_takes ~1 hour_)

Next, we'll run `npx tsc src/update-tmdb-movies.ts` which takes all of the previously resolved TMDB movies and transforms them to a normalized schema, adding in IMDB ratings from our partial IMDB data dump. This will output normalized JSON movies in batched JSON files `out/movies-0.json`, `out/movies-1.json`, etc. (_takes < 1 minute_)

This step also filters movies which are unlikely to be relevant for our use case:

- filters movies which are not released yet
- filters movies which do not have a valid IMDB id
- filters movies which do not have a valid trailer

The next **optional** step is to download additional IMDB info for each movie, using a [cheerio](https://github.com/cheeriojs/cheerio)-based scraper called [movier](https://github.com/Zoha/movier). Note that we self-impose a strict rate-limit on the IMDB scraping, so this step will take a long time to run and requires a solid internet connection with minimal interruptions. (_takes 1-2 days_)

If you want to download additional IMDB metadata for all movies, including additional rating info, you'll need to run `npx tsc src/populate-imdb-movies.ts` which will read in our normalized movies from `out/movie-0.json`, `out/movie-1.json`, etc, process each movie individually with `movier` and store the results in JSON hashmap keyed by IMDB ID to `out/imdb-movies.json`

## Movie Schema

Movies are transformed into the following format, which largely follows the TMDB movie details format converted to snakeCase in addition to some data from IMDB like rating info.

```json
{
  "tmdbId": 118,
  "imdbId": "tt0367594",
  "title": "Charlie and the Chocolate Factory",
  "originalTitle": "Charlie and the Chocolate Factory",
  "language": "en",
  "releaseDate": "2005-07-13",
  "releaseYear": 2005,
  "genres": ["Adventure", "Comedy", "Family", "Fantasy"],
  "overview": "A young boy wins a tour through the most magnificent chocolate factory in the world, led by the world's most unusual candy maker.",
  "runtime": 115,
  "adult": false,
  "budget": 150000000,
  "revenue": 474968763,
  "homepage": "https://www.warnerbros.com/charlie-and-chocolate-factory",
  "status": "Released",
  "posterUrl": "https://image.tmdb.org/t/p/w780/wfGfxtBkhBzQfOZw4S8IQZgrH0a.jpg",
  "backdropUrl": "https://image.tmdb.org/t/p/w1280/atoIgfAk2Ig2HFJLD0VUnjiPWEz.jpg",
  "trailerUrl": "https://youtube.com/watch?v=FZkIlAEbHi4",
  "trailerYouTubeId": "FZkIlAEbHi4",
  "tmdbPopularity": 190.224,
  "imdbRating": 6.7,
  "imdbVotes": 479487
}
```

## TODO

- filter imdb "mainType": "seriesEpisode",

## License

MIT © [Travis Fischer](https://transitivebullsh.it)

Support my open source work by <a href="https://twitter.com/transitive_bs">following me on twitter <img src="https://storage.googleapis.com/saasify-assets/twitter-logo.svg" alt="twitter" height="24px" align="center"></a>
