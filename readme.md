<p>
  <img alt="Populates a full database of movies from TMDB and IMDB into Postgres." src="/media/banner.jpg">
</p>

<p align="center">
  Populates a full database of movies from TMDB and IMDB into Postgres.
</p>

<p align="center">
  <a href="https://github.com/transitive-bullshit/populate-movies/actions/workflows/test.yml"><img alt="Build Status" src="https://github.com/transitive-bullshit/populate-movies/actions/workflows/test.yml/badge.svg"></a>
  <a href="https://github.com/transitive-bullshit/populate-movies/blob/main/license"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-blue"></a>
  <a href="https://prettier.io"><img alt="Prettier Code Formatting" src="https://img.shields.io/badge/code_style-prettier-brightgreen.svg"></a>
</p>

- [Intro](#intro)
- [Movie Schema](#movie-schema)
- [Prerequisites](#prerequisites)
- [Steps](#steps)
  - [Populate TMDB Movies](#populate-tmdb-movies)
  - [Process Movies](#process-movies)
  - [Populate IMDB Movies](#populate-imdb-movies)
  - [Upsert Movies into Prisma](#upsert-movies-into-prisma)
  - [Query Movies from Prisma](#query-movies-from-prisma)
- [Stats](#stats)
- [Database Notes](#database-notes)
- [License](#license)

## Intro

This project resolves a full set of movies from [TMDB](https://www.themoviedb.org/) and [IMDB](https://imdb.com/) in batches, storing them into a Postgres database using [Prisma](https://www.prisma.io/).

This includes data fetching, normalization, cleaning, and filtering. All steps are idempotent, so you should be able to re-run them whenever you want to refresh your data.

## Movie Schema

Movies are transformed into the following format, which largely follows the TMDB movie details format converted to snakeCase with some additional data from IMDB.

```json
{
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
  "metacriticVotes": 40,
  "createdAt": "2022-11-03T21:15:23.423Z",
  "updatedAt": "2022-11-03T21:15:23.423Z"
}
```

## Prerequisites

- `node >= 16`
- `pnpm >= 7`
- [TMDB API v3 bearer token](https://developers.themoviedb.org/3/getting-started/introduction)
- [Prisma Postgres database URL](https://www.prisma.io/docs/getting-started/setup-prisma/start-from-scratch/relational-databases/connect-your-database-typescript-postgres)

Store your `TMDB_BEARER_TOKEN` and `DATABASE_URL` in a local `.env` file.

You'll need to download a recent [daily export of TMDB movie IDs](https://developers.themoviedb.org/3/getting-started/daily-file-exports) such as [10/30/2022](http://files.tmdb.org/p/exports/movie_ids_10_30_2022.json.gz) and store the uncompressed version into `data/tmdb_dump_movie_ids.json`. This gives us a full list of TMDB movie IDs to kick things off.

If you want movies to contain IMDB ratings, you'll also need to download an official [IMDB title ratings data dump](https://www.imdb.com/interfaces/). We're interested in `title.ratings` ([datasets.imdbws.com/title.ratings.tsv.gz](https://datasets.imdbws.com/title.ratings.tsv.gz)). Store the uncompressed version into `data/title.ratings.tsv`. This file contains a large sample of IMDB movie IDs and their associated IMDB ratings + number of votes, which is nice because it is an official data source that drastically reduces the amount of scraping we need to do. Note that IMDB has [an official API](https://developer.imdb.com/), but it is extremely expensive to use (starting at $50k + usage-based billing).

## Steps

Once we have the data dumps downloaded into `data/` and our environment variables setup, we can start processing movies. Most of the processing steps break things up into batches (defaults to 32k movies per batch) in order to allow for incremental processing and easier debugging.

**All scripts are idempotent**, so you can run these steps repeatedly and expect up-to-date results.

Before getting started, make sure you've run `pnpm install` to initialize the Node.js project.

### Populate TMDB Movies

We'll start off by running `npx tsx src/populate-tmdb-movie-dump.ts` which populates each of the TMDB movie IDs with its corresponding TMDB movie details and stores the results into a series of batched JSON files `out/tmdb-0.json`, `out/tmdb-1.json`, etc. _(takes ~1 hour)_

The result is ~655k movies in 24 batches.

### Process Movies

Next, we'll run `npx tsx src/process-movies.ts` which takes all of the previously resolved TMDB movies and transforms them to a normalized schema, adding in IMDB ratings from our partial IMDB data dump. This will output normalized JSON movies in batched JSON files `out/movies-0.json`, `out/movies-1.json`, etc. _(takes ~30 seconds)_

This script also filters movies which are unlikely to be relevant for most use cases:

- filters adult movies
- filters movies which are not released yet (~1.5%)
- filters movies which do not have a valid IMDB id (~40%)
- filters movies which do not have a valid YouTube trailer (~58%)
- filters movies which are too short (< 30min)
- filters music videos
- filters tv series and episodes
- filters live concerts
- adds additional IMDB info from any previous `populate-tmdb-movies` cache (if `out/tmdb-movies.json` exists)

The result is ~72k movies.

### Populate IMDB Movies

The next **optional** step is to download additional IMDB info for each movie, using a [cheerio](https://github.com/cheeriojs/cheerio)-based scraper called [movier](https://github.com/Zoha/movier). We self-impose a strict rate-limit on the IMDB scraping, so this step will take a long time to run and requires a solid internet connection with minimal interruptions. _(takes 1-2 days)_

**NOTE**: see [IMDB's personal and non-commercial licensing](https://help.imdb.com/article/imdb/general-information/can-i-use-imdb-data-in-my-software/G5JTRESSHJBBHTGX#) before proceeding. This step is **optional** for a reason.

If you want to proceed with downloading additional IMDB metadata, you'll need to run `npx tsx src/populate-imdb-movies.ts` which will read in our normalized movies from `out/movie-0.json`, `out/movie-1.json`, etc, scrape each IMDB movie individually with `movier` and store the results to `out/imdb-movies.json`

If you are running into rate-limit issues (likely `503` errors), then you'll need to adjust the rate-limit in [src/lib/imdb.ts](./src/lib/imdb.ts).

Once this step finishes, you'll need to re-run `npx tsx src/process-movies.ts`, which will now take into account all of the extra IMDB metadata that was downloaded to our local cache.

### Upsert Movies into Prisma

The final **optional** step is to upsert all of the movies into your Prisma database. (_takes ~30 seconds)_

Make sure that you have `DATABASE_URL` set to a Postgres instance in your `.env` file and then run `npx prisma db push` to sync the Prisma schema with your database (as well as generating the prisma client locally in `node_modules`). You can alternatively use `prisma db migrate` and `prisma generate` if you prefer that workflow.

**NOTE**: this step defaults to emptying any existing movies from your database before inserting the new ones. This functionality can be tweaked to perform a less destructive per-movie `upsert` instead, though this approach is quite a bit slower. See the source file for details.

Now you should be ready to run `npx tsx src/upsert-movies-to-db.ts` which will run through `out/movies-0.json`, `out/movies-1.json`, etc and insert each movie into your database.

### Query Movies from Prisma

You should now have a full Postgres database of movies, complete with the most important metadata from TMDB and IMDB. Huzzah!

You can run `npx tsx scripts/scratch.ts` to run an example Prisma query.

## Stats

- ~750k "movies" in TMDB
- **~72k movies** after resolving and filtering
  - 8.6k documentaries
  - 44k english movies
  - 34k movies made in the U.S.
    - (80% of these are made exclusively in the U.S.)
  - 4.3k movies made in India
    - (99% of these are made exclusively in India)
  - 1.3k movies made in China
    - (40% of these are made exclusively in China)
  - IMDB stats
    - 30k movies have at least 1k votes on IMDB
    - 40k movies have at least an IMDB rating of 6
    - 29k movies have at least an IMDB rating of 6.5
    - 17k movies have at least an IMDB rating of 7
    - 3k movies have at least an IMDB rating of 8
    - 300 movies have at least an IMDB rating of 9

(_all stats are approximate_)

## Database Notes

The resulting movie dataset is ~70MB and can fit in most free-tier Postgres instances.

If you want to switch to a different type of database, it should be pretty easy since the majority of the processing happens with local JSON files. The easiest will be switching to any [database supported by Prisma](https://www.prisma.io/docs/concepts/database-connectors), including as MongoDB, MySQL, and SQLite.

## License

MIT © [Travis Fischer](https://transitivebullsh.it)

Support my open source work by <a href="https://twitter.com/transitive_bs">following me on twitter <img src="https://storage.googleapis.com/saasify-assets/twitter-logo.svg" alt="twitter" height="24px" align="center"></a>

<p>
  <a href="https://developers.themoviedb.org/3/getting-started/introduction"><img alt="TMDB" src="/media/tmdb.svg" height="65"></a>
  &nbsp; &nbsp; &nbsp; &nbsp;
  <a href="https://www.imdb.com/interfaces/"><img alt="IMDB" src="/media/imdb.png" height="65"></a>
  &nbsp; &nbsp; &nbsp; &nbsp;
  <a href=""><img alt="Rotten Tomatoes" src="/media/rt.png" height="65"></a>
</p>
