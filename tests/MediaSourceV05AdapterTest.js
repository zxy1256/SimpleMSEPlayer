describe('MediaSourceV05Adapter', function() {
  var mediaSource = null;
  var videoTag = document.getElementById('main-video');
  var validMIMEType = 'video/mp4';
  var invalidMIMEType = 'not_video/invalid_codec';

  beforeEach(function() {
    mediaSource = new MediaSourceV05Adapter();
  });

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

  if (videoTag.webkitSourceAbort) {
    spyOn(videoTag, 'webkitSourceAbort');
  } else {
    videoTag.webkitSourceAbort = jasmine.createSpy('webkitSourceAbort');
  }

  describe('CLOSED state', function() {
    it('should in this state after creation', function() {
      expect(mediaSource.readyState).toBe('closed');
    });

    describe('attachVideoTag', function() {
      it('should emit sourceopen event', function(done) {
        $(mediaSource).on('sourceopen', function() {
          expect(true).toBeTruthy();
          done();
        });
        mediaSource.attachVideoTag(videoTag);
      });

      it('should change state to OPEN', function() {
        mediaSource.attachVideoTag(videoTag);
        expect(mediaSource.readyState).toBe('open');
      });
    });

    describe('addSourceBuffer', function() {
      it('should throw INVALID_STATE exception', function() {
        expect(function() {mediaSource.addSourceBuffer(validMIMEType)}).toThrow();
      });
    });

    describe('duration', function() {
      it('get should return NaN', function() {
        expect(isNaN(mediaSource.duration)).toBeTruthy();
      });

      it('set should throw INVALID_STATE error if negative', function() {
        expect(function() {mediaSource.duration = 1}).toThrow();
      });
    });

    describe('endOfStream', function() {
      it('should throw INVALID_STATE exception', function() {
        expect(function() {mediaSource.endOfStream()}).toThrow();
      });
    });

    describe('removeSourceBuffer', function() {
      it('should throw INVALID_STATE exception', function() {
        var sourceBuffer = new SourceBufferV05Adapter(videoTag, '1', mediaSource);
        expect(function() {mediaSource.removeSourceBuffer(sourceBuffer)}).toThrow();       
      });
    });
  });

  // ===================================================
  describe('OPEN state', function() {
    beforeEach(function() {
      mediaSource.attachVideoTag(videoTag);
    });

    describe('addSourceBuffer', function() {
      it('should create a new SourceBufferV05Adapter', function() {
        expect(mediaSource.addSourceBuffer(validMIMEType)).not.toBeNull();
      });
    });

    describe('detachVideoTag', function() {
      it('should change state to CLOSED', function() {
        mediaSource.detachVideoTag();
        expect(mediaSource.readyState).toBe('closed');
      });
    });

    describe('endOfStream', function() {
      it('should change state to ENDED', function() {
        mediaSource.endOfStream();
        expect(mediaSource.readyState).toBe('ended');
      });
    });

    describe('removeSourceBuffer', function() {
      it('should remove the given sourceBuffer', function() {
        var sourceBuffer = mediaSource.addSourceBuffer(validMIMEType);
        medianSource.removeSourceBuffer(sourceBuffer);
        expect(mediaSource.sourceBuffers.length).toEqual(0);
      });
    });
  });

  // ===================================================
  describe('ENDED state', function() {
    beforeEach(function() {
      mediaSource.attachVideoTag(videoTag);
      mediaSource.endOfStream();
    });

    describe('endOfStream', function() {
      it('should throw INVALID_STATE exception', function() {
        expect(function() {mediaSource.endOfStream()}).toThrow();
      });
    });
  });

  describe('SourceBufferV05Adapter', function() {
    var setupIsDone = null;
    var segmentsLoaded = {}
    var sourceBuffer = null;

    var append = function(key) {
      return function() {
        var segmentLoaded = segmentsLoaded[key];
        segmentLoaded.then(function(data) {
          sourceBuffer.appendBuffer(data)
        });
      }
    };

    var load = function(key, url) {
      segmentsLoaded[key] = get(url);
    };

    var baseUrl = '../media/DVRVideo2/';
    load('v_init', baseUrl + 'itag136_init.mp4');
    load('v_16', baseUrl + 'itag136_seq900416.mp4');
    load('v_17', baseUrl + 'itag136_seq900417.mp4');
    var allSegmentsLoaded = Q.all(_.values(segmentsLoaded));

    beforeEach(function(done) {
      videoTag.src = null;
      mediaSource.attachVideoTag(videoTag);
      sourceBuffer = mediaSource.addSourceBuffer(validMIMEType);
      allSegmentsLoaded.then(done);
    });

    describe('appendBuffer', function(done) {
      it('should not create any gap', function(done) {
        var checkExpectations = function() {
          expect(videoTag.webkitSourceAppend).toHaveBeenCalled();
          // expect(sourceBuffer.bufferred.length).toEqual(1);
          done();
        };
        segmentsLoaded['v_init']
          .then(function(data) {
            sourceBuffer.appendBuffer(data);
          })
          .then(checkExpectations);
      });      
    });

    describe('If mediaSource closed', function() {
    });
  });
});
