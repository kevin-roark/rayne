
var fs = require('fs');
var request = require('superagent');
var secrets = require('./secrets');

var instagramClient = require('./instagram');
instagramClient.init(secrets.INSTAGRAM_CLIENT_ID, secrets.INSTAGRAM_CLIENT_SECRET);

// u can change this, dummy
var tagToCrawl = 'rainroom';
var inputFilename = '../media/rayne_media.json';
var outputFilename = inputFilename;

// global variables lol oops!
var responseCount = 0;
var newMediaCount = 0;

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
  var mediaList = JSON.parse(fs.readFileSync(inputFilename, 'utf8'));
  var knownMedia = mediaList.slice(0, 25);

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
    console.log('handling chill response... this is page ' + responseCount + '...\n');

    var getNextPage = true;
    for (var i = 0; i < res.data.length && getNextPage; i++) {
      var compressedMedia = instagramClient.compress(res.data[i]);
      knownMedia.forEach(function(media, index) {
        if (compressedMedia.id === media.id) {
          console.log('wow it is index ' + index);
          console.log(media.id);
          getNextPage = false;
        }
      });
      if (getNextPage) {
        mediaList.unshift(compressedMedia);
        newMediaCount += 1;
      }
    }

    if (!getNextPage) {
      writeFile(mediaList);
      console.log('all done, got to where we were! found this many total new media: ' + newMediaCount);
      return;
    }
    else {
      console.log('got this many new media: ' + (i + 1));
    }

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
      console.log('I am all done and never found any old media!');
    }
  }

  function collectData(data) {
    var compressedMedia = instagramClient.compress(data);
    if (compressedMedia.thumbnail.url === mediaList[newMediaCount].thumbnail.url) {
      // we have reached the old shit
    }
    compressedMedia.forEach(function(media) {
      mediaList.push(media);
    });
  }

}
