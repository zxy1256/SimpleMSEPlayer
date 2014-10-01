describe('MediaSource Playback', function() {
  var loggedEvents = [];

  jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000;

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

  var filterEvent = function(targetEvt) {
    return loggedEvents.filter(function(evt) {
      return evt == targetEvt;
    });
  };

  var tag, wrapper;


  beforeEach(function(done) {
    tag = document.getElementById('main-video');
    tag.pause();
    tag.src = null;
    recordVideoElementEvents(tag);
    loggedEvents = [];
    wrapper = new MediaSourceWrapper(tag);
    done();
  });

  describe('With init and media segment start from t > 0', function(done) {
    var videoBuffer = null;
    var audioBuffer = null;
    var setupIsDone = null;
    var videoInitSegment = null;
    var videoMediaSegment1 = null;
    var audioInitSegment = null;
    var audioMediaSegment = null;

    var appendInit = function() {
      log('Append Init');
      return videoBuffer.appendAsync(videoInitSegment)
        .then(audioBuffer.appendAsync(audioInitSegment));
    };

    var appendMedia = function() {
      log('appendMedia');
      return videoBuffer.appendAsync(videoMediaSegment1)
        .then(audioBuffer.appendAsync(audioMediaSegment1));
    };

    var play = function() {
      log('play');
      tag.play();
    };

     var pause = function() {
      log('pause');
      tag.pause();
    };

    var seek = function(timeInSeconds) {
      return function() {
        log('seek');
        log('tag.currentTime = ' + tag.currentTime);
        tag.currentTime = timeInSeconds;
        log('tag.currentTime = ' + tag.currentTime);
      }
    };

    var wait = function(timeInSeconds) {
      return function () {
        return Q.delay(timeInSeconds * 1000);
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

    it('should play if seek after play', function(done) {
      var checkExpectation = function() {
        log('Checking expectation');
        expect(tag.paused).toBeFalsy();
        expect(filterEvent('seeked').length).toEqual(1);
        expect(filterEvent('timeupdate').length).toBeGreaterThan(2);
        expect(filterEvent('error').length).toEqual(0);
        log('All events: ' + loggedEvents.join(', '));
        done();
      };

      setupIsDone
        .then(appendInit)
        .then(appendMedia)
        .then(play)
        .then(seek(51))
        .then(wait(10))
        .catch(function(e) {
          log(e.message)
        })
        .fin(function() {
          checkExpectation();
          tag.pause();
          done();
        });
    });

    it('should play if play after seek', function(done) {
      var checkExpectation = function() {
        log('Checking expectation');
        expect(tag.paused).toBeFalsy();
        expect(filterEvent('seeked').length).toEqual(1);
        expect(filterEvent('timeupdate').length).toBeGreaterThan(2);
        expect(filterEvent('error').length).toEqual(0);
        log('All events: ' + loggedEvents.join(', '));
        done();
      };

      setupIsDone
        .then(appendInit)
        .then(appendMedia)
        .then(seek(51))
        .then(wait(1))
        .then(play)
        .then(wait(10))
        .catch(function(e) {
          log(e.message)
        })
        .fin(function() {
          checkExpectation();
          tag.pause();
          done();
        });
    });
  });
});