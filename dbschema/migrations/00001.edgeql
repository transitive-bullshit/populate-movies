CREATE MIGRATION m1droyjbi5m65eavuiuuwzxumd2zf26vnggq3s4wyf5ngxfl7lkuia
    ONTO initial
{
  CREATE ABSTRACT TYPE default::HasTimestamps {
      CREATE PROPERTY createdAt: std::datetime {
          SET readonly := true;
          CREATE REWRITE
              INSERT 
              USING (std::datetime_of_statement());
      };
      CREATE PROPERTY updatedAt: std::datetime {
          SET readonly := true;
          CREATE REWRITE
              INSERT 
              USING (std::datetime_of_statement());
          CREATE REWRITE
              UPDATE 
              USING (std::datetime_of_statement());
      };
  };
  CREATE TYPE default::Movie EXTENDING default::HasTimestamps {
      CREATE REQUIRED PROPERTY adult: std::bool {
          SET default := false;
      };
      CREATE PROPERTY allMovieId: std::str;
      CREATE PROPERTY amazonId: std::str;
      CREATE PROPERTY appleTVId: std::str;
      CREATE PROPERTY awardsSummary: std::str;
      CREATE PROPERTY backdropHeight: std::int32;
      CREATE PROPERTY backdropPlaceholderUrl: std::str;
      CREATE PROPERTY backdropUrl: std::str;
      CREATE PROPERTY backdropWidth: std::int32;
      CREATE PROPERTY budget: std::str;
      CREATE REQUIRED PROPERTY cast: array<std::str> {
          SET default := (<array<std::str>>[]);
      };
      CREATE REQUIRED PROPERTY countriesOfOrigin: array<std::str> {
          SET default := (<array<std::str>>[]);
      };
      CREATE PROPERTY director: std::str;
      CREATE PROPERTY disneyPlusId: std::str;
      CREATE PROPERTY emsId: std::str;
      CREATE PROPERTY facebookId: std::str;
      CREATE PROPERTY flickMetrixScore: std::int32;
      CREATE PROPERTY flickMetrixVotes: std::int32;
      CREATE PROPERTY foreign: std::bool {
          SET default := false;
      };
      CREATE PROPERTY genres: array<std::str> {
          SET default := (<array<std::str>>[]);
      };
      CREATE PROPERTY googleKGId: std::str;
      CREATE PROPERTY hboMaxId: std::str;
      CREATE PROPERTY homepage: std::str;
      CREATE PROPERTY huluId: std::str;
      CREATE PROPERTY imdbCustomPopularity: std::float32;
      CREATE REQUIRED PROPERTY imdbId: std::str {
          CREATE CONSTRAINT std::exclusive;
      };
      CREATE PROPERTY imdbRating: std::float32;
      CREATE PROPERTY imdbType: std::str;
      CREATE PROPERTY imdbVotes: std::int32;
      CREATE PROPERTY instagramId: std::str;
      CREATE REQUIRED PROPERTY keywords: array<std::str> {
          SET default := (<array<std::str>>[]);
      };
      CREATE PROPERTY language: std::str;
      CREATE REQUIRED PROPERTY languages: array<std::str> {
          SET default := (<array<std::str>>[]);
      };
      CREATE PROPERTY letterboxdId: std::str;
      CREATE PROPERTY letterboxdScore: std::int32;
      CREATE PROPERTY letterboxdVotes: std::int32;
      CREATE PROPERTY metacriticId: std::str;
      CREATE PROPERTY metacriticRating: std::float32;
      CREATE PROPERTY metacriticVotes: std::int32;
      CREATE PROPERTY mpaaRating: std::str;
      CREATE PROPERTY netflixId: std::str;
      CREATE PROPERTY originalTitle: std::str;
      CREATE PROPERTY plot: std::str;
      CREATE PROPERTY posterHeight: std::int32;
      CREATE PROPERTY posterPlaceholderUrl: std::str;
      CREATE PROPERTY posterUrl: std::str;
      CREATE PROPERTY posterWidth: std::int32;
      CREATE PROPERTY production: std::str;
      CREATE PROPERTY redditTopicId: std::str;
      CREATE PROPERTY releaseDate: std::datetime;
      CREATE PROPERTY releaseYear: std::int32;
      CREATE PROPERTY relevancyScore: std::float32 {
          SET default := 0;
      };
      CREATE PROPERTY revenue: std::str;
      CREATE PROPERTY rtAudienceRating: std::int32;
      CREATE PROPERTY rtAudienceVotes: std::int32;
      CREATE PROPERTY rtCriticConsensur: std::str;
      CREATE PROPERTY rtCriticRating: std::int32;
      CREATE PROPERTY rtCriticVotes: std::int32;
      CREATE PROPERTY rtId: std::str;
      CREATE PROPERTY rtUrl: std::str;
      CREATE PROPERTY runtime: std::int32;
      CREATE PROPERTY searchL: std::str;
      CREATE PROPERTY status: std::str;
      CREATE REQUIRED PROPERTY title: std::str;
      CREATE REQUIRED PROPERTY tmdbId: std::int32 {
          CREATE CONSTRAINT std::exclusive;
      };
      CREATE PROPERTY tmdbPopularity: std::float32;
      CREATE PROPERTY tmdbRating: std::float32;
      CREATE PROPERTY tmdbVotes: std::int32;
      CREATE PROPERTY trailerUrl: std::str;
      CREATE PROPERTY trailerYouTubeId: std::str;
      CREATE PROPERTY traktTVId: std::str;
      CREATE PROPERTY twitterId: std::str;
      CREATE PROPERTY twitterUsername: std::str;
      CREATE PROPERTY wikidataId: std::str;
  };
};
