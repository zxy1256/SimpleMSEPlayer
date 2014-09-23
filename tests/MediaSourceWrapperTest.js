describe('MediaSource', function() {
  var loggedEvents = [];

  jasmine.DEFAULT_TIMEOUT_INTERVAL = 200000;

  var getBufferedRange_ = function() {
    var buffered = [];
    if (tag.buffered) {
      for (var i = 0; i < tag.buffered.length; i++) {
        buffered.push(
            [tag.buffered.start(i), tag.buffered.end(i)]);
      }
    }
    return JSON.stringify(buffered);
  };

  var onVideoEvent = function(evt) {
    loggedEvents.push(evt.type);
    log('VideoTagEventLogger: evt=' + evt.type +
        ', readystate=' + tag.readyState +
        ', currentTime=' + tag.currentTime +
        ', buffered=' + getBufferedRange_() +
        ', paused=' + tag.paused +
        ', ended=' + tag.ended +
        ', seeking=' + tag.seeking);
  };

  var recordVideoElementEvents = function(videoTag) {
    var allVideoElementEvents = [
      'abort',
      'canplay',
      'canplaythrough',
      'durationchange',
      'emptied',
      'ended',
      'error',
      'loadeddata',
      'loadedmetadata',
      'loadstart',
      'pause',
      'play',
      'playing',
      'progress',
      'ratechange',
      'resize',
      'seeked',
      'seeking',
      'stalled',
      'suspend',
      'timeupdate',
      'volumechange',
      'waiting'
    ];


    allVideoElementEvents.forEach(function(eventType) {
      videoTag.addEventListener(eventType, onVideoEvent);
    }, this);
    loggedEvents = [];
  };

  var checkLoggedEvents = function(expectedEvents) {
    expect(loggedEvents.join(', ')).toEqual(expectedEvents.join(', '));
  };

  var tag, wrapper;

  beforeEach(function(done) {
    tag = document.createElement('video');
    recordVideoElementEvents(tag);
    wrapper = new MediaSourceWrapper(tag);
    done();
  });

  xdescribe('activate', function(done) {
    it('sync should work', function(done) {
      wrapper.activate(tag, done)
    });

    it('async should work', function(done) {
      var p = wrapper.activateAsync(tag);

      var p2 = p.then(function() {
            expect(true).toBe(true);
            expect(loggedEvents.length > 0).toBe(true);
            done()
          })
          .catch(function() {
            expect(false).toBe(true)
            done()
          });
    });
  });

  xdescribe('addSourceBuffer', function(done) {
    it('should work with valid MIME type', function(done) {
      var buffer = null;

      var addOneSourceBuffer = function() {
       buffer = wrapper.addSourceBuffer('video/mp4; codecs="avc1.4d401e"')
      }

      var checkExpectation = function() {
        expect(wrapper.mediaSource_.sourceBuffers).not.toBeNull();
        expect(buffer).not.toBeNull();
        done();
      }

      wrapper.activateAsync(tag)
        .then(addOneSourceBuffer)
        .then(checkExpectation)
    })
  });

  describe('Seeking cross a gap', function(done) {
    var videoBuffer = null;
    var audioBuffer = null;
    var setupIsDone = null;
    var videoInitSegment = null;
    var videoMediaSegment1 = null;
    var audioInitSegment = null;
    var audioMediaSegment = null;

    var appendInit = function() {
      log('Append Init')
      return videoBuffer.appendAsync(videoInitSegment)
        .then(audioBuffer.appendAsync(audioInitSegment));
    };

    var appendMedia = function() {
      log('appendMedia')
      return videoBuffer.appendAsync(videoMediaSegment1)
        .then(audioBuffer.appendAsync(audioMediaSegment1));
    };

    var play = function() {
      log('play')
      tag.play();
    };

     var pause = function() {
      log('pause')
      tag.pause();
    };

    var seek = function(timeInSeconds) {
      return function() {
        log('seek')
        log('tag.currentTime = ' + tag.currentTime)
        tag.currentTime = timeInSeconds;
        log('tag.currentTime = ' + tag.currentTime)
      }
    };

    var wait = function(timeInSeconds) {
      return function () {
        return Q.delay(timeInSeconds * 1000)
      }
    };

    var videoInitSegmentLoaded = get('../media/DVRVideo/v_init.mp4')
        .then(function(data) {
          videoInitSegment = data;
        });
    var videoMediaSegmentLoaded = get('../media/DVRVideo/v_seq0.mp4')
        .then(function(data) {
          videoMediaSegment1 = data;
        });
    var audioInitSegmentLoaded = get('../media/DVRVideo/a_init.mp4')
        .then(function(data) {
          audioInitSegment = data;
        });
    var audioMediaSegmentLoaded = get('../media/DVRVideo/a_seq0.mp4')
        .then(function(data) {
          audioMediaSegment1 = data;
        });

    beforeEach(function(done) {
      videoBuffer = null;
      audioBUffer = null;

      var addSourceBuffer = function() {
        audioBuffer = wrapper.addSourceBuffer(
            'audio/mp4; codecs="mp4a.40.2"');
        videoBuffer = wrapper.addSourceBuffer(
            'video/mp4; codecs="avc1.4d401e"');
      };
      var mediaSourceIsReady = wrapper.activateAsync(tag)
        .then(addSourceBuffer);

      setupIsDone = Q.all([
        videoInitSegmentLoaded,
        videoMediaSegmentLoaded,
        audioInitSegmentLoaded,
        audioMediaSegmentLoaded,
        mediaSourceIsReady]);

      done();
    });

    it('should work', function(done) {
      var checkExpectation = function() {
        log('Checking expectation');
        expect(loggedEvents.length > 0).toBe(true);
        checkLoggedEvents(['loadstart']);
        log('All events: ' + loggedEvents.join(', '));
        done();
      };

      setupIsDone
        .then(appendInit)
        .then(appendMedia)
        .then(play)
        .then(seek(51))
        .then(wait(35))
        .then(checkExpectation)
        .catch(function(e) {
          log(e.message)
          expect(false).toBe(true);
        })
        .fin(function() {
          log('Done.')
          tag.pause();
          done();
        });
    });
  });
});
