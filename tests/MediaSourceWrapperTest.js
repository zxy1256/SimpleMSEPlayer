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
        //buffer = wrapper.addSourceBuffer('video/mp4; codecs="avc1.4d4015"')
       //buffer = wrapper.addSourceBuffer('video/mp4; codecs="avc1.4d401e"')

        buffer = wrapper.addSourceBuffer('video/mp4')
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

  describe('SourceBuffer.append', function(done) {
    var videoBuffer = null;
    var audioBuffer = null;
    var setupIsDone = null;
    var videoInitSegment = null;
    var videoMediaSegment1 = null;
    var audioInitSegment = null;
    var audioMediaSegment = null;

    beforeEach(function(done) {
      videoBuffer = null;
      audioBUffer = null;
      segments = [];
      videoInitSegment = null;
      videoMediaSegment1 = null;
      audioInitSegment = null;
      audioMediaSegment = null;

      //var initSegmentLoaded = get('../media/wZHwpyXFB88_One_DVR_Video/itag135_init.mp4')
      //var initSegmentLoaded = get('../media/226nssw-9Z4/itag134_seg1.mp4')
      //var initSegmentLoaded = get('../media/226nssw-9Z4/itag134_init.mp4') 
      var videoInitSegmentLoaded = get('../media/qkRE-NnFkaA/itag134_init.mp4')
          .then(function(data) {
            videoInitSegment = data;
          });
      
      //var mediaSegmentLoaded = get('../media/wZHwpyXFB88_One_DVR_Video/itag135_seq263490.mp4') // Start time = 10870.023
      //var mediaSegmentLoaded = get('../media/226nssw-9Z4/itag134_seg2.mp4')
      //var mediaSegmentLoaded = get('../media/226nssw-9Z4/itag134_rest.mp4')
      var videoMediaSegmentLoaded = get('../media/qkRE-NnFkaA/itag134_seq0.mp4') // start time 2145.016
          .then(function(data) {
            videoMediaSegment1 = data;
          });

      //var initSegmentLoaded = get('../media/wZHwpyXFB88_One_DVR_Video/itag135_init.mp4')
      //var initSegmentLoaded = get('../media/226nssw-9Z4/itag134_seg1.mp4')
      //var initSegmentLoaded = get('../media/226nssw-9Z4/itag134_init.mp4') 
      var audioInitSegmentLoaded = get('../media/qkRE-NnFkaA/itag140_init.mp4')
          .then(function(data) {
            audioInitSegment = data;
          });
      
      //var mediaSegmentLoaded = get('../media/wZHwpyXFB88_One_DVR_Video/itag135_seq263490.mp4') // Start time = 10870.023
      //var mediaSegmentLoaded = get('../media/226nssw-9Z4/itag134_seg2.mp4')
      //var mediaSegmentLoaded = get('../media/226nssw-9Z4/itag134_rest.mp4')
      var audioMediaSegmentLoaded = get('../media/qkRE-NnFkaA/itag140_seq0.mp4') // start time 2145.016
          .then(function(data) {
            audioMediaSegment1 = data;
          });

      var addSourceBuffer = function() {
        videoBuffer = wrapper.addSourceBuffer('video/mp4; codecs="avc1.4d4015"');
        audioBuffer = wrapper.addSourceBuffer('audio/mp4; codecs="mp4a.40.2"');
        //buffer = wrapper.addSourceBuffer('video/mp4; codecs="avc1.4d401e"');
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
      var appendInit = function() {
        log('Append Init')
        return videoBuffer.appendAsync(videoInitSegment)
          .then(audioBuffer.appendAsync(audioInitSegment));
      };

      var appendMedia = function() {
        log('appendMedia')
        videoBuffer.setTimestampOffset(0);
        audioBuffer.setTimestampOffset(0);
        return videoBuffer.appendAsync(videoMediaSegment1)
          .then(audioBuffer.appendAsync(audioMediaSegment1));
      };

      var appendMediaToTimeEqualsZero = function() {
        //buffer.setTimestampOffset(-2145.01611328125);
        log('appendMediaToTimeEqualsZero')
        //videoBuffer.setTimestampOffset(-2145);
        //audioBuffer.setTimestampOffset(-2145);
        var videoData =  new DataView(videoMediaSegment1);
        var audioData = new DataView(audioMediaSegment1);
        var newVideo = BmffParser.rewriteFirstDecodeTime(videoData, -2146.016);
        var newAudio = BmffParser.rewriteFirstDecodeTime(audioData, -2146.016);
        return videoBuffer.appendAsync(newVideo)
          .then(audioBuffer.appendAsync(newAudio));
      }

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
          //tag.currentTime = 10;
          //tag.currentTime = 10871;
          //tag.currentTime = 2146;
          tag.currentTime = timeInSeconds;
          log('tag.currentTime = ' + tag.currentTime)
        }
      };

      var checkExpectation = function() {
        log('Checking expectation');
        expect(loggedEvents.length > 0).toBe(true);
        checkLoggedEvents(['loadstart']);
        log('All events: ' + loggedEvents.join(', '));
      };

      var wait = function(timeInSeconds) {
        return function () {
          return Q.delay(timeInSeconds * 1000)
        }
      };

      setupIsDone
        .then(appendInit)
        .then(wait(1))
        .then(appendMediaToTimeEqualsZero)
        .then(appendMedia)
        .then(wait(1))
        .then(play)
        .then(wait(7))
        .then(seek(0))
        .then(wait(7))
        .then(pause)
        .then(seek(2146))
        .then(play)
        //.then(wait(3))
        //.then(play)
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

      //setTimeout(checkExpectation, 4000);
    });
  });
});
