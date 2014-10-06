describe('MediaSourceV05API', function() {
  var videoTag = document.getElementById('main-video');
  var validMIMEType = 'video/mp4;  codecs="avc1.4d401e"';
  var segmentsLoaded = {};
  var id = '0';

  var append = function(key) {
    return function() {
      var segmentLoaded = segmentsLoaded[key];
      return segmentLoaded.then(function(data) {
        videoTag.webKitSourceAppend(id, data);
      });
    };
  };

  var load = function(key, url) {
    segmentsLoaded[key] = get(url);
  };

  var baseUrl = '../media/DVRVideo2/';
  load('v_init', baseUrl + 'itag136_init.mp4');
  load('v_16', baseUrl + 'itag136_seq900416.mp4');
  load('v_17', baseUrl + 'itag136_seq900417.mp4');
  load('v_18', baseUrl + 'itag136_seq900418.mp4');
  var allSegmentsLoaded = Q.all(_.values(segmentsLoaded));

  beforeEach(function(done) {
    var onOpen = function(e) {
      videoTag.webkitSourceAddId(id, validMIMEType);
      done();
    }
    videoTag.addEventListener('sourceopen', onOpen);
    videoTag.src = videoTag.mediaSourceURL;
  });  

  it('should be no gap', function(done) {
    var checkExpectations = function() {
      expect(videoTag.bufferred.length).toEqual(1);
      done();
    };

    allSegmentsLoaded
      .then(append('v_init'))
      .then(append('v_16'))
      .then(append('v_17'))
      .then(append('v_18'))
      .fin(checkExpectation);
  });
});