describe('MediaSource Playback', function() {
  var loggedEvents = [];

  jasmine.DEFAULT_TIMEOUT_INTERVAL = 15000;

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

  var countEvent = function(targetEvt) {
    return filterEvent(targetEvt).length;
  }

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

  var tag, wrapper;

  beforeEach(function(done) {
    tag = document.getElementById('main-video');
    tag.pause();
    tag.src = null;
    recordVideoElementEvents(tag);
    loggedEvents = [];
    wrapper = new MediaSourceWrapper();
    done();
  });

  // ============================================
  // Media Source
  // ============================================
  describe('MediaSource', function(done) {
    beforeEach(function() {
      expect(wrapper.mediaSource_.readyState).toBe('closed');
    });

    describe('In closed state', function(done) {
      describe('setting video tag src', function(done) {
        it('should change readyState to open', function(done) {
          var checkExpectation = function() {
            expect(filterEvent('loadstart').length).toEqual(1);
            expect(wrapper.mediaSource_.readyState).toBe('open');
          };

          wrapper.activateAsync(tag)
            .then(checkExpectation)
            .fin(function() {
              done();
            });
        });
      });

      describe('addSourceBuffer', function() {
        it('should throw INVALID_STATE_ERR', function() {
          var addOneSourceBuffer = function() {
           buffer = wrapper.addSourceBuffer('video/mp4; codecs="avc1.4d401e"')
          };

          expect(addOneSourceBuffer).toThrow();
        });
      });

      describe('endOfStream', function() {
        it('should throw INVALID_STATE_ERR', function() {
          expect(wrapper.mediaSource_.endOfStream).toThrow();
        })
      })
    });

    describe('In open state', function(done) {
      var mediaSourceInOpenState = null;

      beforeEach(function(done) {
        mediaSourceInOpenState = wrapper.activateAsync(tag).then(done);
      });

      describe('setting video tag src', function(done) {
        it('should work?', function(done) {
          var wrapper2 = new MediaSourceWrapper(tag);
          var switchToMediaSource2 = function() {
            return wrapper2.activateAsync(tag);
          }

          var checkExpectation = function() {
            log('Checking expectation');
            expect(filterEvent('error').length).toEqual(0);
            log('All events: ' + loggedEvents.join(', '));
            done();
          };

          mediaSourceInOpenState
            .then(switchToMediaSource2)
            .then(wait(1))
            .fin(checkExpectation);
        });
      });

      describe('addSourceBuffer', function(done) {
        it('should create a SourceBuffer if MIME type is valid', function(done) {
          var buffer = null;

          var addOneSourceBuffer = function() {
           buffer = wrapper.addSourceBuffer('video/mp4; codecs="avc1.4d401e"')
          };

          var checkExpectation = function() {
            expect(wrapper.mediaSource_.sourceBuffers).not.toBeNull();
            expect(wrapper.mediaSource_.sourceBuffers.length).toEqual(1);
            expect(buffer).not.toBeNull();
            done();
          };

          mediaSourceInOpenState
            .then(addOneSourceBuffer)
            .then(checkExpectation)
            .catch(function() {
              done();
            });
        });
      });

      describe('endOfStream', function(done) {
        it('should change state to ended', function(done) {
          mediaSourceInOpenState
            .then(function() {
              expect(wrapper.mediaSource_.readyState).toBe('open');
              wrapper.mediaSource_.endOfStream();
              expect(wrapper.mediaSource_.readyState).toBe('ended')
            })
            .catch(function(e) {
              console.log(e.message);
            })
            .fin(function() {
              done();
            });
        });
      });
    });

    describe('In ended state', function() {
      var mediaSourceInEndedState = null;

      beforeEach(function(done) {
        mediaSourceInEndedState = wrapper.activateAsync(tag)
            .then(wrapper.mediaSource_endOfStream)
            .then(done);
      });

      describe('setting video tag src', function(done) {
        it('should change readyState to open', function(done) {
          var checkExpectation = function() {
            expect(filterEvent('loadstart').length).toEqual(2);
            expect(wrapper.mediaSource_.readyState).toBe('open');
            done();
          };

          wrapper.activateAsync(tag)
            .then(checkExpectation)
            .fin(function() {
              done();
            });
        });
      });
    });
  });

  // ============================================
  // Video Tag
  // ============================================
  describe('VideoTag', function(done) {
    var videoBuffer = null;
    var audioBuffer = null;

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

    var addSourceBuffer = function() {
      audioBuffer = wrapper.addSourceBuffer(
          'audio/mp4; codecs="mp4a.40.2"');
      videoBuffer = wrapper.addSourceBuffer(
          'video/mp4; codecs="avc1.4d401e"');
    };

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
    // ==========================================
    describe('With nothing appended', function(done) {
      it('should be in HAVE_NOTHING state', function() {
        expect(tag.readyState).toBe(0);
      });

      describe('Setting src', function(done) {
        it('should trigger loadstart', function(done) {
          var checkExpectation = function() {
            log('Checking expectation');
            expect(countEvent('loadstart')).toEqual(1);
            expect(countEvent('error')).toEqual(0);
            expect(tag.readyState).toBe(0);
            log('All events: ' + loggedEvents.join(', '));
          };

          wrapper.activateAsync(tag)
            .then(checkExpectation)
            .catch(function(e) {
              console.log(e.message);
              expect(false).toBe(true);
            })
            .fin(done);
        });
      });

      describe('Play', function(done) {
        it('should change the paused state', function() {
          tag.play();
          expect(tag.paused).toBeFalsy();
        });
      });

      describe('Seek', function(done) {
        it('should throw exception', function() {
          var seekTo10 = function() {
            tag.currentTime = 10;
          }
          expect(seekTo10).toThrow();
        });
      });
    });
    // ==========================================

    // ==========================================
    describe('With init segment', function(done) {
      var initAppended = null;

      beforeEach(function(done) {
        videoBuffer = null;
        audioBUffer = null;

        var mediaSourceIsReady = wrapper.activateAsync(tag)
          .then(addSourceBuffer);

        setupIsDone = Q.all([
          videoInitSegmentLoaded,
          audioInitSegmentLoaded,
          mediaSourceIsReady]);

        initAppended = setupIsDone
          .then(appendInit)
          .then(wait(1))
          .then(done);
      });

      it('should be in HAVE_METADATA state', function(done) {
        var checkExpectation = function() {
          log('Checking expectation');
          expect(tag.readyState).toBe(1);
          expect(countEvent('loadedmetadata')).toEqual(1);
          expect(countEvent('error')).toEqual(0);
          log('All events: ' + loggedEvents.join(', '));
        };

       initAppended
          .catch(function(e) {
            log(e.message)
          })
          .fin(function() {
            checkExpectation();
            tag.pause();
            done();
          });
      });

      describe('Setting src', function(done) {
        it('should trigger loadstart', function(done) {
          var checkExpectation = function() {
            log('Checking expectation');
            expect(countEvent('loadstart')).toEqual(2);
            expect(countEvent('error')).toEqual(0);
            expect(tag.readyState).toBe(0);
            log('All events: ' + loggedEvents.join(', '));
          };

          var wrapper2 = new MediaSourceWrapper();

          wrapper2.activateAsync(tag)
            .then(checkExpectation)
            .catch(function(e) {
              console.log(e.message);
              expect(false).toBe(true);
            })
            .fin(done);
        });
      });

      describe('Seek', function(done) {
        it('should change currentTime', function() {
          tag.currentTime = 100000;
          expect(tag.currentTime).toEqual(100000);
        });
      });
    });
    // ==========================================


    // ==========================================
    describe('With init and media segment start from t > 0', function(done) {
      var appendedInitAndMedia = null;
      beforeEach(function(done) {
        videoBuffer = null;
        audioBUffer = null;

        var mediaSourceIsReady = wrapper.activateAsync(tag)
          .then(addSourceBuffer);

        setupIsDone = Q.all([
          videoInitSegmentLoaded,
          videoMediaSegmentLoaded,
          audioInitSegmentLoaded,
          audioMediaSegmentLoaded,
          mediaSourceIsReady]);

        appendedInitAndMedia = setupIsDone
            .then(appendInit)
            .then(appendMedia)
            .then(done);
      });

      describe('Seek after Play', function(done) {
        it('should not cause error', function(done) {
          var checkExpectation = function() {
            log('Checking expectation');
            expect(tag.paused).toBeFalsy();
            expect(filterEvent('seeked').length).toEqual(1);
            expect(filterEvent('timeupdate').length).toBeGreaterThan(2);
            expect(filterEvent('error').length).toEqual(0);
            log('All events: ' + loggedEvents.join(', '));
            done();
          };

          appendedInitAndMedia
              .then(play)
              .then(seek(51))
              .then(wait(5))
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

      describe('Play after Seek', function(done) {
        it('should not cause error', function(done) {
          var checkExpectation = function() {
            log('Checking expectation');
            expect(tag.paused).toBeFalsy();
            expect(filterEvent('seeked').length).toEqual(1);
            expect(filterEvent('timeupdate').length).toBeGreaterThan(2);
            expect(filterEvent('error').length).toEqual(0);
            log('All events: ' + loggedEvents.join(', '));
            done();
          };

          appendedInitAndMedia
              .then(seek(51))
              .then(play)
              .then(wait(5))
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
  });
});