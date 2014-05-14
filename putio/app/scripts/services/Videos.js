'use strict';

angular.module('putioAngularApp')
  .factory('Videos', function () {
    // This is where I can query localstorage using lawnchair
    var jssrc = 'https://api.put.io/v2/files/search/from:me%20type:video/page/-1?oauth_token=IK4Q6CE2&callback=putioCB';
    var cbScriptTarget = document.getElementsByTagName('head')[0];
    var cbScript = document.createElement('script');
    cbScript.src = jssrc;
    cbScriptTarget.appendChild(cbScript);

    var _videos = this._videos= [];

    var _serials = this._serials = {};

    var _movies = this._movies = {};

    var _slugMap = this._slugMap = {};

    // Serial/Series related functions

    var addEpisodeMeta = function(item,match){
      match = match.toString().replace(/[,]+/g,',').split(',');
      item.name = match[1].replace(/\W+/ig,' ').trim();
      item.key = sanatise(match[1]);
      item.season = Number(match[2].trim());
      item.episode = Number(match[3].trim());

      return item;
    };

    var serialLookup = function(item){
      var name = item.name;
      var key = item.key;
      var season = item.season;

      if(typeof _serials[key] === 'undefined'){
        _serials[key] = {
          name:name,
          seasons:[],
          season:{}
        };
        var cbScriptTarget = document.getElementsByTagName('head')[0];
        var cbScript = document.createElement('script');
        cbScript.src = 'http://api.trakt.tv/search/shows.json/f4980e1fa96b6e330e1ca87430a33160?query='+name+'&limit=1&callback=traktCB';
        cbScriptTarget.appendChild(cbScript);
      }
      if(_serials[key].seasons.indexOf(season) < 0){
        _serials[key].seasons.push(season);
      }
    };

    var episodesLookup = function(serial,key){
      var cbScriptTarget = document.getElementsByTagName('head')[0];
      var slug = serial.trakt.url.split('/').pop();
      _slugMap[key] = slug;
      _slugMap[slug] = key;
      angular.forEach(serial.seasons,function(season){
        var cbScript = document.createElement('script');
        cbScript.src = 'http://api.trakt.tv/show/season.json/f4980e1fa96b6e330e1ca87430a33160/'+slug+'/'+season+'?callback=traktCB2';
        cbScriptTarget.appendChild(cbScript);
      });
    };

    // Movie related functions
    var addMovieMeta = function(item,match){
      match = match.toString().replace(/[,]+/g,',').split(',');
      item.name = match[1].replace(/\W+/ig,' ').trim();
      item.key = sanatise(match[1]);

      return item;
    };

    var movieLookup = function(item){
      var name = item.name;
      var key = item.key;

      if(typeof _movies[key] === 'undefined'){
        _movies[key] = {
          name:item.putio.name,
          putio:item.putio
        };
        var cbScriptTarget = document.getElementsByTagName('head')[0];
        var cbScript = document.createElement('script');
        cbScript.src = 'http://api.trakt.tv/search/movies.json/f4980e1fa96b6e330e1ca87430a33160?query='+name+'&limit=1&callback=traktCB3';
        cbScriptTarget.appendChild(cbScript);
      }
    };

    // This is a function to allow mapping of the data returned
    // from the Trakt api with the keys that I'm putting in.
    // I'm calling using JSONP callbacks and embedded scripts
    // otherwise I run into massive issues with CORS. 

    var sanatise = function(string){
      return string.replace(/\W+/ig,' ').trim().replace(/\bus$|\buk$|\b\d\d\d\d$/ig,' ').trim().toLowerCase();
    };

    // Public API here
    return {
      // Video related functions
      getVideos: function () {
        return _videos;
      },
      addVideo: function(file) {
        var maskEpisode = /(.+?)[Ss](\d+)[Ee](\d+)|(.+?)(\d{1,2})x(\d{1,2})|(.+?)season.*?(\d{1,2}).*?episode.*?(\d{1,2})/i;
        var matchEpisode = file.name.match(maskEpisode);

        var maskMovie = /(.+?)(\d\d\d\d)/i;
        var matchMovie = file.name.match(maskMovie);

        var item = {
          name: file.name,
          putio: file
        };

        if(matchEpisode){
          item = addEpisodeMeta(item,matchEpisode);
          serialLookup(item);
        } else if(matchMovie){
          item = addMovieMeta(item,matchMovie);
          movieLookup(item);
        }

        _videos.push(item);
        return _videos;
      },
      addMany: function(files){
        var _self = this;
        angular.forEach(files,function(file){
          _self.addVideo(file);
        });
        return _videos;
      },
      // Serial related functions
      getSerials: function () {
        return _serials;
      },
      addSerial: function(item) {
        var _self = this;
        var key = sanatise(item.title);
        if(typeof _serials[key] !== 'undefined'){
          _serials[key].trakt = item;
          _serials[key].name = item.title;
          episodesLookup(_serials[key],key);
        }
        _self.linkSerials();
        return _serials;
      },
      linkSerials: function(){
        angular.forEach(_videos,function(video){
          var key = video.key;
          if(typeof _serials[key] !== 'undefined' && typeof video.trakt === 'undefined'){
            video.trakt = _serials[key].trakt;
          }
        });
      },
      addEpisodes: function(data) {
        var _self = this;
        var explodeUrl = data[0].url.split('/').reverse();
        var key = _slugMap[explodeUrl[4]];
        var season = explodeUrl[2];
        _serials[key].season[season] = data;
        _self.linkEpisodes(key,season);
        return _serials;
      },
      linkEpisodes: function(key,season){
        angular.forEach(_videos, function (video) {
          if(video.key == key && video.season == season){
            video.meta = _serials[key].season[season][video.episode-1];
          }
        });
      },
      getMovies: function(){
        return _movies;
      },
      addMovie: function(data) {
        var key = sanatise(data.title);
        if(typeof _movies[key] !== 'undefined'){
          _movies[key].trakt = data;
        }
        return _movies;
      }
    };
  });