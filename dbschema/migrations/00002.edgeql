CREATE MIGRATION m1h2uy3grrskukidjamywfvqignduorhogqrhhb4ev3tljo5laemcq
    ONTO m1droyjbi5m65eavuiuuwzxumd2zf26vnggq3s4wyf5ngxfl7lkuia
{
  ALTER TYPE default::Movie {
      CREATE INDEX ON (.tmdbPopularity);
      CREATE INDEX ON (.imdbId);
      CREATE INDEX ON ((.imdbRating, .releaseYear, .foreign, .genres, .searchL, .relevancyScore));
      CREATE INDEX ON (.rtAudienceRating);
      CREATE INDEX ON (.imdbVotes);
      CREATE INDEX ON (.tmdbId);
      CREATE INDEX ON (.rtCriticRating);
      CREATE INDEX ON (.releaseDate);
  };
};
