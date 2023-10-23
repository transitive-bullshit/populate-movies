module default {
  abstract type HasTimestamps {
    property createdAt -> datetime {
      readonly := true;
      rewrite insert using (datetime_of_statement());
    };

    property updatedAt -> datetime {
      readonly := true;
      rewrite insert, update using (datetime_of_statement());
    };
  };

  type Movie extending HasTimestamps {
    # main external ids
    required property tmdbId -> int32 { constraint exclusive; };
    required property imdbId -> str { constraint exclusive; };

    # other external ids
    property wikidataId -> str;
    property facebookId -> str;
    property instagramId -> str;
    property twitterId -> str;
    property netflixId -> str;
    property huluId -> str;
    property amazonId -> str;
    property appleTVId -> str;
    property twitterUsername -> str;
    property googleKGId -> str;
    property traktTVId -> str;
    property redditTopicId -> str;
    property letterboxdId -> str;
    property metacriticId -> str;
    property allMovieId -> str;
    property disneyPlusId -> str;
    property hboMaxId -> str;

    # general metadata
    required property title -> str;
    property originalTitle -> str;
    property language -> str;
    property releaseYear -> int32;
    property releaseDate -> datetime;
    property genres -> array<str> { default := <array<str>>[]; };
    property plot -> str;
    property runtime -> int32;
    required property adult -> bool { default := false; };
    property budget -> str;
    property revenue -> str;
    property homepage -> str;
    property status -> str;
    property mpaaRating -> str;
    required property keywords -> array<str> { default := <array<str>>[]; };
    required property countriesOfOrigin -> array<str> { default := <array<str>>[]; };
    required property languages -> array<str> { default := <array<str>>[]; };
    required property cast -> array<str> { default := <array<str>>[]; };
    property director -> str;
    property production -> str;
    property awardsSummary -> str;

    # images 
    property posterUrl -> str;
    property posterPlaceholderUrl -> str;
    property posterWidth -> int32;
    property posterHeight -> int32;
    property backdropUrl -> str;
    property backdropPlaceholderUrl -> str;
    property backdropWidth -> int32;
    property backdropHeight -> int32;

    # videos
    property trailerUrl -> str;
    property trailerYouTubeId -> str;

    # imdb
    property imdbRating -> float32;
    property imdbVotes -> int32;
    property imdbType -> str;

    # tmdb
    property tmdbPopularity -> float32; # https://developer.themoviedb.org/docs/popularity-and-trending
    property tmdbRating -> float32;
    property tmdbVotes -> int32;

    # metacritic
    property metacriticRating -> float32;
    property metacriticVotes -> int32;

    # rotten tomatoes
    property rtCriticRating -> int32;
    property rtCriticVotes -> int32;
    property rtAudienceRating -> int32;
    property rtAudienceVotes -> int32;
    property rtCriticConsensur -> str;
    property rtId -> str;
    property emsId -> str;
    property rtUrl -> str;

    # letterboxd
    property letterboxdScore -> int32;
    property letterboxdVotes -> int32;

    # flickmetrix
    property flickMetrixScore -> int32;
    property flickMetrixVotes -> int32;

    # custom / application-specific)
    property foreign -> bool { default := false; };
    property relevancyScore -> float32 { default := 0; };
    property imdbCustomPopularity -> float32;
    property searchL -> str;

    index on ((.imdbRating, .releaseYear, .foreign, .genres, .searchL, .relevancyScore));
    index on (.imdbVotes);
    index on (.tmdbPopularity);
    index on (.rtCriticRating);
    index on (.rtAudienceRating);
    index on (.releaseDate);
    index on (.tmdbId);
    index on (.imdbId);
  };
}
