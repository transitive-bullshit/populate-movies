"use strict";
exports.__esModule = true;
exports.imdbRatingsPath = exports.imdbMoviesPath = exports.tmdbMovieIdsDumpPath = exports.batchSize = exports.numBatches = exports.outDir = exports.dataDir = void 0;
var dotenv_safe_1 = require("dotenv-safe");
dotenv_safe_1["default"].config();
exports.dataDir = 'data';
exports.outDir = 'out';
exports.numBatches = 24;
exports.batchSize = 32000;
exports.tmdbMovieIdsDumpPath = "".concat(exports.dataDir, "/tmdb_dump_movie_ids.json");
exports.imdbMoviesPath = "".concat(exports.outDir, "/imdb-movies.json");
exports.imdbRatingsPath = "".concat(exports.dataDir, "/title.ratings.tsv");
