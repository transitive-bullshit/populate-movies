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
  - [1. Populate TMDB Movies](#1-populate-tmdb-movies)
  - [2. Populate Flick Metrix Movies](#2-populate-flick-metrix-movies)
  - [3. Process Movies](#3-process-movies)
  - [4. Populate IMDB Movies](#4-populate-imdb-movies)
  - [5. Upsert Movies into Prisma](#5-upsert-movies-into-prisma)
  - [6. Query Movies from Prisma](#6-query-movies-from-prisma)
- [Stats](#stats)
- [Database Notes](#database-notes)
- [License](#license)

## Intro

This project resolves a full set of movies from [TMDB](https://www.themoviedb.org/) and [IMDB](https://imdb.com/) in batches, storing them into a Postgres database using [Prisma](https://www.prisma.io/).

This includes difficult-to-access data like **IMDB ratings**, **Rotten Tomatoes audience & critic scores**, and **YouTube trailers**.

Everything is handled including data fetching, normalization, cleaning, and filtering. All scripts are idempotent, so you should be able to re-run them whenever you want to refresh your data.

## Movie Schema

Movies are transformed into the following format, which combines metadata from TMDB, IMDB, Rotten Tomatoes, and FlickMetrix.

```json
{
  "tmdbId": 680,
  "imdbId": "tt0110912",
  "title": "Pulp Fiction",
  "originalTitle": "Pulp Fiction",
  "language": "en",
  "releaseYear": 1994,
  "releaseDate": "1994-09-10",
  "genres": ["thriller", "crime", "drama"],
  "plot": "The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.",
  "runtime": 154,
  "adult": false,
  "budget": 8000000,
  "revenue": 213928762,
  "homepage": "https://www.miramax.com/movie/pulp-fiction/",
  "mpaaRating": "R",
  "keywords": ["nonlinear timeline", "overdose", "drug use", "drug overdose"],
  "countriesOfOrigin": ["United States"],
  "languages": ["English", "Spanish", "French"],
  "cast": ["John Travolta", "Samuel L. Jackson", "Uma Thurman", "Bruce Willis"],
  "director": "Quentin Tarantino",
  "production": "Miramax Films",
  "awardsSummary": "Won 1 Oscar. Another 63 wins & 47 nominations.",
  "status": "released",
  "posterUrl": "https://image.tmdb.org/t/p/w780/fIE3lAGcZDV1G6XM5KmuWnNsPp1.jpg",
  "posterWidth": 2000,
  "posterHeight": 3000,
  "backdropUrl": "https://image.tmdb.org/t/p/w1280/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg",
  "backdropWidth": 2631,
  "backdropHeight": 1480,
  "trailerUrl": "https://youtube.com/watch?v=tGpTpVyI_OQ",
  "trailerYouTubeId": "tGpTpVyI_OQ",
  "imdbRating": 8.9,
  "imdbVotes": 2033927,
  "imdbType": "movie",
  "tmdbPopularity": 74.051,
  "tmdbRating": 8.491,
  "tmdbVotes": 24004,
  "metacriticRating": 94,
  "metacriticVotes": 24,
  "rtCriticRating": 93,
  "rtCriticVotes": 103,
  "rtAudienceRating": 93,
  "rtAudienceVotes": 1120247,
  "rtUrl": "https://www.rottentomatoes.com/m/pulp_fiction",
  "letterboxdScore": 86,
  "letterboxdVotes": 1102425,
  "flickMetrixScore": 90,
  "flickMetrixId": 110912,
  "foreign": false,
  "relevancyScore": 1883295.240641344,
  "imdbCustomPopularity": 2033927,
  "createdAt": "2022-11-07T03:51:42.276Z",
  "updatedAt": "2022-11-07T03:51:42.276Z"
}
```

In addition to basic movie metadata, most movies also include:

- Ratings
  - **IMDB ratings**
  - **Rotten Tomatoes critic and audience scores**
  - Metacritic ratings
  - Letterboxd ratings
  - FlickMetrix ratings
- Media
  - **YouTube traileras**
  - Poster images
  - Backdrop images

We also compute some useful custom fields like `foreign`, which is a flag for whether or not most Western audience members would recognize the movie. This includes most English movies as well as many of the most popular foreign films.

This format aims to be as compact as possible while still including the most important metadata, so for certain fields like the trailer, we choose the best possible YouTube video according to a set of heuristics and ignore any other related videos.

This may result in less metadata in your database for fallbacks and such, but the project is explicitly designed to be re-run regularly so your data remains valid and up-to-date, relying on these third-parties to deal with data drift.

## Prerequisites

- `node >= 16`
- `pnpm >= 7`
- [TMDB API v3 bearer token](https://developers.themoviedb.org/3/getting-started/introduction)
- [Prisma Postgres database URL](https://www.prisma.io/docs/getting-started/setup-prisma/start-from-scratch/relational-databases/connect-your-database-typescript-postgres)

Store your `TMDB_BEARER_TOKEN` and `DATABASE_URL` in a local `.env` file.

You'll need to download a recent [daily export of TMDB movie IDs](https://developers.themoviedb.org/3/getting-started/daily-file-exports) such as [10/30/2022](http://files.tmdb.org/p/exports/movie_ids_10_30_2022.json.gz) and store the uncompressed version into `data/tmdb_dump_movie_ids.json`. This gives us a full list of TMDB movie IDs to kick things off.

If you want movies to contain IMDB ratings (**optional**), you'll also need to download an official [IMDB title ratings data dump](https://www.imdb.com/interfaces/). You'll want to download `title.ratings` ([datasets.imdbws.com/title.ratings.tsv.gz](https://datasets.imdbws.com/title.ratings.tsv.gz)) and store the uncompressed version into `data/title.ratings.tsv`. This file contains a large sample of IMDB movie IDs and their associated IMDB ratings + number of votes, which is nice because it is an official data source that drastically reduces the amount of scraping we need to do. Note that IMDB has [an official API](https://developer.imdb.com/), but it is extremely expensive to use (starting at $50k + usage-based billing).

## Steps

Once we have the data dumps downloaded into `data/` and our environment variables setup, we can start processing movies. Most of the processing steps break things up into batches (defaults to 32k movies per batch) in order to allow for incremental processing and easier debugging.

**All scripts are idempotent**, so you can run these steps repeatedly and expect up-to-date results.

Before getting started, make sure you've run `pnpm install` to initialize the Node.js project.

### 1. Populate TMDB Movies

We'll start off by running `npx tsx src/populate-tmdb-movie-dump.ts` which populates each of the TMDB movie IDs with its corresponding TMDB movie details and stores the results into a series of batched JSON files `out/tmdb-0.json`, `out/tmdb-1.json`, etc. _(takes ~1 hour)_

The result is ~655k movies in 24 batches.

### 2. Populate Flick Metrix Movies

The next **optional** step is to download movie metadata using [Flick Metrix's](https://flickmetrix.com/) private API. This is really only necessary if you want Rotten Tomatoes scores. _(takes ~3 minutes)_

Run `npx tsx src/populate-flick-metrix-movies` which will fetch ~70k movies and store the results into `out/flick-metrix-movies.json`. This optional metadata will be used by `src/process-movies.ts` if it exists and will be ignored if it doesn't.

### 3. Process Movies

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
- adds additional Rotten Tomatoes and Flick Metrix info from any previous `populate-flick-metrix` cache (if `out/flick-metrix-movies.json` exists)

**NOTE**: this is the most important step, and you will likely find yourself running it multiple times. It is pretty quick, though, since it doesn't require any network access. It is essentially just aggregating all of the data we've downloaded in the other steps into a normalized format and performing some filtering.

The result is ~72k movies.

### 4. Populate IMDB Movies

The next **optional** step is to download additional IMDB info for each movie, using a [cheerio](https://github.com/cheeriojs/cheerio)-based scraper called [movier](https://github.com/Zoha/movier). We self-impose a strict rate-limit on the IMDB scraping, so this step takes a long time to run and requires a solid internet connection with minimal interruptions. _(takes ~12 hours)_

**NOTE**: see [IMDB's personal and non-commercial licensing](https://help.imdb.com/article/imdb/general-information/can-i-use-imdb-data-in-my-software/G5JTRESSHJBBHTGX#) before proceeding. This step is **optional** for a reason.

If you want to proceed with this step, you'll need to run `npx tsx src/populate-imdb-movies.ts` which will read in our normalized movies from `out/movie-0.json`, `out/movie-1.json`, etc, scrape each IMDB movie individually with `movier` and store the results to `out/imdb-movies.json`.

If you are running into rate-limit issues (likely `503` errors), then you'll need to adjust the rate-limit in [src/lib/imdb.ts](./src/lib/imdb.ts).

Once this step finishes, you'll need to re-run `npx tsx src/process-movies.ts`, which will now take into account all of the extra IMDB metadata that was downloaded to our local cache.

### 5. Upsert Movies into Prisma

The final step is to upsert all of the movies into your Prisma database. (_takes ~30 seconds)_

Make sure that you have `DATABASE_URL` set to a Postgres instance in your `.env` file and then run `npx prisma db push` to sync the Prisma schema with your database (as well as generating the prisma client locally in `node_modules`). You can alternatively use `prisma db migrate` and `prisma generate` if you prefer that workflow.

**NOTE**: this step defaults to emptying any existing movies from your database before inserting the new ones. This functionality can be tweaked to perform a less destructive per-movie `upsert` instead, though this approach is quite a bit slower. See the source file for details.

Now you should be ready to run `npx tsx src/upsert-movies-to-db.ts` which will run through `out/movies-0.json`, `out/movies-1.json`, etc and insert each movie into the database.

### 6. Query Movies from Prisma

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
  - 40k movies have an IMDB rating of at least 6
  - 29k movies have an IMDB rating of at least 6.5
  - 17k movies have an IMDB rating of at least 7
  - 3k movies have an IMDB rating of at least 8
  - 300 movies have an IMDB rating of at least 9

(_all stats are approximate_)

## Database Notes

The resulting movie dataset is ~122MB (about half of which is Postgres indices) and should fit in most free-tier Postgres instances.

If you want to use a different type of database, it should be pretty easy since the majority of the processing happens with local JSON files. Note that [Prisma supports several popular databases](https://www.prisma.io/docs/concepts/database-connectors), including MongoDB, MySQL, and SQLite.

## License

MIT © [Travis Fischer](https://transitivebullsh.it)

Support my open source work by <a href="https://twitter.com/transitive_bs">following me on twitter <img src="https://storage.googleapis.com/saasify-assets/twitter-logo.svg" alt="twitter" height="24px" align="center"></a>

<p>
  <a href="https://developers.themoviedb.org/3/getting-started/introduction"><img alt="TMDB" src="/media/tmdb.svg" height="65"></a>
  &nbsp; &nbsp; &nbsp; &nbsp;
  <a href="https://www.imdb.com/interfaces/"><img alt="IMDB" src="/media/imdb.png" height="65"></a>
  &nbsp; &nbsp; &nbsp; &nbsp;
  <a href="https://www.rottentomatoes.com"><img alt="Rotten Tomatoes" src="/media/rt.png" height="65"></a>
</p>
