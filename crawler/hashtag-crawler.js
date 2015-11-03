
var fs = require('fs');
var request = require('superagent');
var secrets = require('./secrets');

var instagramClient = require('./instagram');
instagramClient.init(secrets.INSTAGRAM_CLIENT_ID, secrets.INSTAGRAM_CLIENT_SECRET);

// u can change this, dummy
var tagToCrawl = 'rainroom';
var outputFilename = './crawled_media.json';

// global variables lol oops!
var responseCount = 0;

main();

function writeFile(data, callback) {
  if (typeof data !== 'string') {
    data = JSON.stringify(data);
  }

  fs.writeFile(outputFilename, data, function(err) {
    if (err) {
      console.log('error saving data:');
      console.log(err);
    }
    else {
      console.log('saved to: ' + outputFilename);
    }

    if (callback) {
      callback(err);
    }
  });
}

function main() {
  var mediaList = [];

  instagramClient.hashtag(tagToCrawl, function(err, res) {
    if (err) {
      console.log('instagram error:');
      console.log(err);
    }
    else {
      handleResponse(res);
    }
  });

  function handleResponse(res) {
    responseCount += 1;
    console.log('handling chill response... this is page ' + responseCount + '...');

    collectData(res.data);
    console.log('i now have this many... ' + mediaList.length);
    writeFile(mediaList);

    var nextPageURL = res.pagination.next_url;
    if (nextPageURL) {
      request
        .get(nextPageURL)
        .end(function(err, apiResponse) {
          if (err) {
            console.log('instagram error:');
            console.log(err);
          }
          else {
            setTimeout(function() {
              handleResponse(apiResponse.body);
            }, 3666); // to get around rate-limiting make this artificially slow
          }
        });
    }
    else {
      console.log('I am all done!');
    }
  }

  function collectData(data) {
    var compressedMedia = instagramClient.compress(data);
    compressedMedia.forEach(function(media) {
      mediaList.push(media);
    });
  }

}
