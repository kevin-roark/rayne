
var request = require('superagent');
var kt = require('kutility');

var InstagramBase = 'https://api.instagram.com/v1/';

var credentials;
module.exports.init = function(clientID, clientSecret) {
  credentials = {
    client_id: clientID,
    client_secret: clientSecret
  };
};

module.exports.request = function(endpoint, callback) {
  var url = InstagramBase + endpoint;
  request
    .get(url)
    .query(credentials)
    .query({count: 50})
    .end(function(err, res) {
      if (err) {
        console.log('instagram error:');
        console.log(err);
        if (callback) {
          callback(err, res);
        }
      }
      else {
        var data = res.body;
        if (callback) {
          callback(err, data);
        }
      }
    });
};

module.exports.hashtag = function(tag, callback) {
  var endpoint = 'tags/' + tag + '/media/recent';
  module.exports.request(endpoint, callback);
}

module.exports.locationMedia = function(locationID, callback) {
  var endpoint = 'locations/' + locationID + '/media/recent';
  module.exports.request(endpoint, callback);
};

module.exports.randomGalleryMedia = function(callback) {
  var galleryIDs = ['212943401', '294847', '1218268', '401192748'];
  module.exports.locationMedia(kt.choice(galleryIDs), callback);
};

module.exports.compress = function(responseData, addCaption) {
  function minData(data) {
    var min = {
      id: data.id,
      type: data.type,
      likes: data.likes.count,
      thumbnail: data.images.thumbnail
    };

    if (addCaption && data.caption) {
      min.caption = data.caption.text;
    }

    if (data.type === 'image') {
      min.media = data.images.low_resolution;
    }
    else if (data.type === 'video') {
      min.media = data.videos.low_resolution;
    }

    return min;
  }

  if (Array.isArray(responseData)) {
    var arr = [];
    for (var i = 0; i < responseData.length; i++) {
      arr.push(minData(responseData[i]));
    }
    return arr;
  }
  else {
    return minData(responseData);
  }
};
