describe('MediaSourceV05API', function(done) {
  var videoTag = document.getElementById('main-video');
  var validMIMEType = 'video/mp4;  codecs="avc1.4d401e"';
  var segmentsLoaded = {};
  var id = '0';

  if (videoTag.webkitSourceAddId) {
    spyOn(videoTag, 'webkitSourceAddId');
  } else {
    videoTag.webkitSourceAddId = jasmine.createSpy('webkitSourceAddId');
  }

  if (videoTag.webkitSourceAppend) {
    spyOn(videoTag, 'webkitSourceAppend');
  } else {
    videoTag.webkitSourceAppend = jasmine.createSpy('webkitSourceAppend');
  }

  var append = function(key) {
    return function() {
      var segmentLoaded = segmentsLoaded[key];
      return segmentLoaded.then(function(data) {
        videoTag.webkitSourceAppend(id, data);
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
    videoTag.addEventListener('webkitsourceopen', onOpen);
    videoTag.src = videoTag.mediaSourceURL;
    setTimeout(onOpen, 1000);
  });  

  it('should be no gap', function(done) {
    var checkExpectations = function() {
      expect(videoTag.buffered.length).toEqual(1);
      done();
    };

    allSegmentsLoaded
      .then(append('v_init'))
      .then(append('v_16'))
      .then(append('v_17'))
      .then(append('v_18'))
      .fin(checkExpectations);
  });
});