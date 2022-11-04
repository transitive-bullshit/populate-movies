# Populate Movies

> Populates a full database of movies from TMDB and IMDB into Prisma.

[![Build Status](https://github.com/transitive-bullshit/populate-movies/actions/workflows/test.yml/badge.svg)](https://github.com/transitive-bullshit/populate-movies/actions/workflows/test.yml) [![Prettier Code Formatting](https://img.shields.io/badge/code_style-prettier-brightgreen.svg)](https://prettier.io)

## Intro

This project contains a series of scripts for resolving movies from [TMDB](https://www.themoviedb.org/) and [IMDB](https://imdb.com/) in batches and eventually upserting them into a Postgres [Prisma](https://www.prisma.io/) database.

## Prerequisites

- `node >= 16`
- `pnpm >= 7`
- [TMDB API v3 bearer token](https://developers.themoviedb.org/3/getting-started/introduction)
- [Prisma Postgres database URL](https://www.prisma.io/docs/getting-started/setup-prisma/start-from-scratch/relational-databases/connect-your-database-typescript-postgres)

Store your `TMDB_BEARER_TOKEN` and `DATABASE_URL` in a local `.env` file.

You'll need to download a recent [daily export of TMDB movie IDs](https://developers.themoviedb.org/3/getting-started/daily-file-exports) such as [10/30/2022](http://files.tmdb.org/p/exports/movie_ids_10_30_2022.json.gz) and store the uncompressed version into `data/tmdb_dump_movie_ids.json`. This gives us a full list of TMDB movie IDs to kick things off.

If you want movies to contain IMDB ratings, you'll also need to download an official [IMDB title ratings data dump](https://www.imdb.com/interfaces/). We're specifically interested in `title.ratings` such as [datasets.imdbws.com/title.ratings.tsv.gz](https://datasets.imdbws.com/title.ratings.tsv.gz) and store the uncompressed version into `data/title.ratings.tsv`. This file contains a large sample of IMDB movie IDs and their associated IMDB ratings + number of votes, which is nice because it is an official data source that drastically reduces the amount of scraping we need to do. Note that IMDB has [an official API](https://developer.imdb.com/), but it is extremely expensive to use (starting at $50k + usage-based billing).

## Steps

Once we have the data dumps downloaded into `data/` and our environment variables setup, we can start processing movies. Most of the processing steps break things up into batches (defaults to 32000 movies per batch) in order to allow for incremental processing and easier debugging.

**All scripts are idempotent**, so you can run these steps repeatedly and expect up-to-date results (ignoring occasional HTTP errors which are inevitable).

Before getting started, make sure you've run `pnpm install` to initialize the Node.js project.

### Populate TMDB Movies

Next, we'll run `npx tsx src/populate-tmdb-movie-dump.ts` which populates each of the TMDB movie IDs with its corresponding TMDB movie details and stores the results into a series of batched JSON files `out/tmdb-0.json`, `out/tmdb-1.json`, etc. _(takes ~1 hour)_

The result is ~655k movies in 24 batches of 32k.

### Process TMDB Movies

Next, we'll run `npx tsc src/process-tmdb-movies.ts` which takes all of the previously resolved TMDB movies and transforms them to a normalized schema, adding in IMDB ratings from our partial IMDB data dump. This will output normalized JSON movies in batched JSON files `out/movies-0.json`, `out/movies-1.json`, etc. _(takes ~30 seconds)_

We also filters movies which are unlikely to be relevant for our use case:

- filters adult movies
- filters movies which are not released yet (~1.5%)
- filters movies which do not have a valid IMDB id (~40%)
- filters movies which do not have a valid YouTube trailer (~58%)
- filters music videos
- filters movies which are too short

The result is ~78k movies.

### Populate IMDB Movies

The next **optional** step is to download additional IMDB info for each movie, using a [cheerio](https://github.com/cheeriojs/cheerio)-based scraper called [movier](https://github.com/Zoha/movier). Note that we self-impose a strict rate-limit on the IMDB scraping, so this step will take a long time to run and requires a solid internet connection with minimal interruptions. _(takes 1-2 days)_

If you want to download additional IMDB metadata for all movies, including additional rating info, you'll need to run `npx tsc src/populate-imdb-movies.ts` which will read in our normalized movies from `out/movie-0.json`, `out/movie-1.json`, etc, process each movie individually with `movier` and store the results in JSON hashmap keyed by IMDB ID to `out/imdb-movies.json`

Once you are finished populating IMDB movies, you'll need to re-run `npx tsc src/process-tmdb-movies.ts`, which will now take into account the extra IMDB metadata that was downloaded to our local cache.

### Upsert Movies into Prisma

The final **optional** step is to upsert all movies into your Prisma database. (_takes a few minutes)_

Make sure that you run have `DATABASE_URL` set to a Postgres instance in your `.env` file and then run `npx prisma db push` to sync the Prisma schema with your database (as well as generating the prisma client locally in `node_modules`).

Now you should be ready to run `npx tsc src/upsert-movies-to-db.ts` which will run through `out/movies-0.json`, `out/movies-1.json`, etc and upsert each movie into the Prisma database.

### Query Movies from Prisma

You should now have a fully populated Prisma Postgres database of movies, complete with the most important metadata from TMDB and IMDB. Huzzah!

## Movie Schema

Movies are transformed into the following format, which largely follows the TMDB movie details format converted to snakeCase in addition to some data from IMDB like rating info.

```json
{
  "createdAt": "2022-11-03T21:15:23.423Z",
  "updatedAt": "2022-11-03T21:15:23.423Z",
  "tmdbId": 118,
  "imdbId": "tt0367594",
  "title": "Charlie and the Chocolate Factory",
  "originalTitle": "Charlie and the Chocolate Factory",
  "language": "en",
  "releaseYear": 2005,
  "releaseDate": "2005-07-13",
  "genres": ["adventure", "comedy", "family", "fantasy"],
  "overview": "A young boy wins a tour through the most magnificent chocolate factory in the world, led by the world's most unusual candy maker.",
  "runtime": 115,
  "adult": false,
  "budget": 150000000,
  "revenue": 474968763,
  "homepage": "https://www.warnerbros.com/charlie-and-chocolate-factory",
  "status": "released",
  "ageRating": "PG",
  "keywords": [
    "cannibalism",
    "psychotherapy",
    "chocolate factory",
    "chocolate",
    "golden ticket"
  ],
  "countriesOfOrigin": ["United States", "United Kingdom"],
  "languages": ["English"],
  "posterUrl": "https://image.tmdb.org/t/p/w780/wfGfxtBkhBzQfOZw4S8IQZgrH0a.jpg",
  "backdropUrl": "https://image.tmdb.org/t/p/w1280/atoIgfAk2Ig2HFJLD0VUnjiPWEz.jpg",
  "trailerUrl": "https://youtube.com/watch?v=FZkIlAEbHi4",
  "trailerYouTubeId": "FZkIlAEbHi4",
  "imdbRating": 6.7,
  "imdbVotes": 479685,
  "tmdbPopularity": 190.224,
  "tmdbRating": 7.034,
  "tmdbVotes": 13036,
  "metacriticRating": 72,
  "metacriticVotes": 40
}
```

## License

MIT © [Travis Fischer](https://transitivebullsh.it)

Support my open source work by <a href="https://twitter.com/transitive_bs">following me on twitter <img src="https://storage.googleapis.com/saasify-assets/twitter-logo.svg" alt="twitter" height="24px" align="center"></a>
