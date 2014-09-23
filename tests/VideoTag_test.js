describe('VideoTag', function() {
  var tag, mediaSource;

  var createMediaSource = function () {
    if (window['MediaSource']) {
      return new window['MediaSource']();
    } else if (window['WebKitMediaSource']) {
      return new window['WebKitMediaSource']();
    }
  };

  beforeEach(function() {
    tag = document.createElement('video');
  });

  describe('Initialized', function() {
    it('should have current time be 0', function() {
      expect(tag.currentTime).toBe(0);
    });

    it('should have current time be 0', function() {
      expect(tag.paused).toBe(true);
    });

    describe('Play', function() {
      it('should change paused', function() {
        tag.play();
        expect(tag.paused).toBe(false);
      });
    });
  });


  describe('seek', function() {
    it('should handle no overflow', function() {
//      tag.seek(10);
//      expect(tag.getCurrentTime()).toEqual(10);
      expect(true).toBe(true);
    });

    it('should handle overflow', function() {
//      tag.seek(100000);
//      expect(tag.getCurrentTime()).toEqual(100000);
    });
  });

  describe('on timeupdate', function() {
    it('should emit a timeupdate event with correct timestamp', function() {
//      tag.tag_.emit('timeupdate', 10);
//      exp
    });
  });
});
