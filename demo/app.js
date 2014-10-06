//=================================
// Controllers
// ================================
/**
 * {VideoTag} <-- [SourceBuffer] <-- {MediaSourceManager} <-- [DataQueue] <-- {Loader} <-- [SegmentQueue]
 */




/**
 * @param {Element} videoTag
 * @param {VideoData} videoData
 */
var Player = function(videoTag, videoData) {
  log('Player: constructor start, user agent = ' + navigator.userAgent);
  this.videoData_ = new VideoData(videoData);
  this.dataQueue_ = [];

  this.loader_ = new Loader(
      this.dataQueue_,
      this.videoData_.getInitUrl('135'),
      this.videoData_.getMediaSegmentUrls('135'));
  this.sourceBufferManager_ =
      new MediaSourceManager(videoTag, this.dataQueue_, videoData);

  this.videoTag_ = videoTag;
  this.videoTag_.addEventListener(
      'loadedmetadata', _.bind(this.onMetaDataLoaded, this));
  this.videoTag_.addEventListener(
      'loadeddata', _.bind(this.onDataLoaded, this));
  this.videoTag_.addEventListener(
      'seeking', _.bind(this.onSeeking, this));
  this.videoTag_.addEventListener(
      'seeked', _.bind(this.onSeeked, this));
  this.videoTag_.addEventListener(
      'progress', _.bind(this.onProgress, this));
  this.videoTag_.addEventListener(
      'resize', _.bind(this.onResize, this));

  this.videoTagEventLogger_ = new VideoTagEventLogger(this.videoTag_);

  this.shouldAutoPlay = false;
  this.tempCounter = 0;
  log('Player: constructor end');
};

// =====================
// Public API
// =====================
Player.prototype.play = function() {
  if (this.videoTag_.readyState == 0) {
    this.shouldAutoPlay = true;
  } else {
    this.videoTag_.play();
  }
};


Player.prototype.pause = function() {
  if (this.videoTag_.readyState == 0) {
    this.shouldAutoPlay = false;
  } else {
    this.videoTag_.pause();
  }
};


/**
 * @param {time} Target time in seconds.
 *    Infinity means seek to the end.
 *    Negative value means seek from the end.
 */
Player.prototype.seek = function(time) {
  if (this.videoTag_.readyState == 0) {
    this.startTime = time;
  } else {
    this.videoTag_.currentTime = time;
  }
};

// =====================
// Event handlers
// =====================
Player.prototype.onMetaDataLoaded = function(e) {
  this.videoTag_.currentTime = this.videoData_.videoData_.startTime;
  //this.onSeeked(e);
};


Player.prototype.onDataLoaded = function(e) {
  //this.videoTag_.currentTime = this.videoData_.videoData_.startTime;
  //this.onSeeked(e);
};

Player.prototype.onProgress = function(e) {
  if (this.videoTag_.buffered && 
      this.videoTag_.currentTime < this.videoTag_.buffered.start(0) &&
      this.tempCounter < 1) {
    //this.videoTag_.currentTime = this.videoData_.videoData_.startTime;
    //this.onSeeked(e);
    //this.tempCounter = this.tempCounter + 1;
    //log("Lalalalalala")
  }
};

Player.prototype.onSeeking = function(evt) {
  //this.videoTag_.currentTime = this.videoData_.videoData_.startTime;
  //this.videoTag_.play();
};

Player.prototype.onResize = function(evt) {
  //this.videoTag_.currentTime = this.videoData_.videoData_.startTime;
  // this.videoTag_.pause();
};

Player.prototype.onCanPlay = function() {
  //this.videoTag_.currentTime = this.videoData_.videoData_.startTime;
  //this.onSeeked(e);
};

Player.prototype.onSeeked = function(e) {
  if (this.videoTag_.paused && this.shouldAutoPlay) {
    this.videoTag_.play();
  }
};


var VideoTagEventLogger = function(videoTag) {
  this.videoTag_ = videoTag;
  this.events_ = [
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

  this.events_.forEach(function(eventType) {
    this.videoTag_.addEventListener(eventType, this.onVideoTagEvent_.bind(this));
  }, this);
};


VideoTagEventLogger.prototype.onVideoTagEvent_ = function(evt) {
  log('VideoTagEventLogger: evt=' + evt.type +
      ', readystate=' + this.videoTag_.readyState +
      ', currentTime=' + this.videoTag_.currentTime +
      ', buffered=' + this.getBufferedRange_() +
      ', duration=' + this.videoTag_.duration + 
      ', paused=' + this.videoTag_.paused +
      ', seeking=' + this.videoTag_.seeking);
};


VideoTagEventLogger.prototype.getBufferedRange_ = function() {
  var buffered = [];
  if (this.videoTag_.buffered) {
    for (var i = 0; i < this.videoTag_.buffered.length; i++) {
      buffered.push(
          [this.videoTag_.buffered.start(i), this.videoTag_.buffered.end(i)]);
    }
  }
  return JSON.stringify(buffered);
};


var MediaSourceManager = function(videoTag, inputQueue, videoData) {
  log('MediaSourceManager: constructor start');
  this.mediaSource_ = this.createMediaSource();
  this.mediaSource_.addEventListener(
      'sourceopen', _.bind(this.onSourceOpened, this), false);
  this.mediaSource_.addEventListener(
      'webkitsourceopen', _.bind(this.onSourceOpened, this), false);
  videoTag.src = window.URL.createObjectURL(this.mediaSource_);
  this.inputQueue_ = inputQueue;
  this.hasMetaData = false;
  this.hasMediaData = false;
	this.videoData_ = videoData;
  log('MediaSourceManager: constructor end');
};


MediaSourceManager.prototype.createMediaSource = function () {
  if (window['MediaSource']) {
    log('MediaSourceManager: create media source');
    return new window['MediaSource']();
  } else if (window['WebKitMediaSource']) {
    log('MediaSourceManager: create webkit media source');
    return new window['WebKitMediaSource']();
  }
};


/**
 * Reads from data queue and appends to sourceBuffer.
 * @param {ArrayBuffer} ArrayBuffer
 * @private
 */
MediaSourceManager.prototype.append = function(arrayBuffer) {
  log('MediaSourceManager: append');
  try {
    var data = new Uint8Array(arrayBuffer);
    if (this.videoBuffer_.appendBuffer) {
      log('MediaSourceManager: Use appendBuffer');
      this.videoBuffer_.appendBuffer(data);
    } else if (this.videoBuffer_.appendArrayBuffer) {
	    log('MediaSourceManager: Use appendArrayBuffer');
	    this.videoBuffer_.appendArrayBuffer(data);
    } else if (this.videoBuffer_.append) {
      log('MediaSourceManager: Use append');
      this.videoBuffer_.append(data);
    } else {
      log('MediaSourceManager: Do nothing');
    }
  } catch (e) {
    log(JSON.stringify(e));
  }
};


/**
 * @return {boolean} Whether can append
 */
MediaSourceManager.prototype.canAppend = function() {
  return this.videoBuffer_ && !this.videoBuffer_.updating;
};


MediaSourceManager.prototype.fetchNext = function() {
  log('MediaSourceManager: fetchNext start');
  if (this.inputQueue_.length && this.canAppend()) {
    var data = this.inputQueue_[0];
    if (this.hasMetaData) {
      log('MediaSourceManager: append media');
    } else {
      log('MediaSourceManager: append metadata');
      this.hasMetaData = true;
    }
    this.append(data);
    this.inputQueue_.shift();
  }
  log('MediaSourceManager: fetchNext end');
};


MediaSourceManager.prototype.onNewMediaData = function() {
    log('MediaSourceManager: fetching media data');
    this.fetchNext();  
};


MediaSourceManager.prototype.onNewMetaData = function() {
    log('MediaSourceManager: fetching meta data');
    this.fetchNext();  
};


MediaSourceManager.prototype.onSourceOpened = function(e) {
  log('MediaSourceManager: source openned');
  try {
    if (this.mediaSource_.addSourceBuffer) {
      log('MediaSourceManager: addSourceBuffer');
      this.videoBuffer_ =
        // this.mediaSource_.addSourceBuffer('video/mp4; codecs="avc1.4d4015"');
        this.mediaSource_.addSourceBuffer('video/mp4; codecs="avc1.4d4015"');
      //this.mediaSource_.addSourceBuffer('audio/mp4; codecs="mp4a.40.5"');

    } else {
      log('MediaSourceManager: webkitAddSourceBuffer');
      this.videoBuffer_ =
        this.mediaSource_.webkitAddSourceBuffer('video/mp4');
      //this.mediaSource_.webkitAddSourceBuffer('audio/mp4');
    }
  } catch (e) {
    log(e);
    return;
  }
  log('MediaSourceManager: added source openned');
  var f = _.bind(this.fetchNext, this);
  log('MediaSourceManager: added listener 1');
  this.videoBuffer_.addEventListener('updateend', f);
  log('MediaSourceManager: added listener');
  amplify.subscribe('new_meta_data', _.bind(this.onNewMetaData, this));
  amplify.subscribe('new_media_data', _.bind(this.onNewMediaData, this));
  log('MediaSourceManager: added subscription');
	if (this.videoBuffer_.timestampOffset >= 0) {
		log('MediaSourceManager: set timestamp offset');
		//this.videoBuffer_.timestampOffset = - this.videoData_.firstSegmentDecodeTime + this.videoData_.startTime;
		log('MediaSourceManager: set timestamp offset end, timestampOffset = ' + this.videoBuffer_.timestampOffset);
	} else {
		log('MediaSourceManager: not set timestamp offset');
	}
  this.fetchNext();
};



/**
 * Downloads data and appends to data queue.
 * @param {!Array} outputQueue
 * @param {string} initUrl
 * @param {!Array<string>} mediaUrls
 */
var Loader = function(outputQueue, initUrl, mediaUrls) {
  log('Loader: constroctor start');
  this.initUrl_ = initUrl;
  this.mediaUrls_ = mediaUrls;
  this.outputQueue_ = outputQueue;
  this.pendingRequest_ = null;
  this.metadataLoaded_ = false; 
  this.poll();
  log('Loader: constroctor end');
};

Loader.prototype.poll = function() {
  if (this.canLoadNext()) {
    this.loadNext();
  }
};

Loader.prototype.canLoadNext = function() {
  return this.mediaUrls_.length > 0 && !this.pendingRequest_;
};


Loader.prototype.loadNext = function() {
  if (this.metadataLoaded_) {
    log('Loader: load media data');
    var url = this.mediaUrls_.shift();
    this.pendingRequest_ = ajax(url, _.bind(this.onMediaDataLoaded, this));
  } else {
    log('Loader: load meta data');
    this.pendingRequest_ = ajax(
        this.initUrl_, _.bind(this.onMetaDataLoaded, this));
  }
};


Loader.prototype.onMetaDataLoaded = function(arrayBuffer) {
  log('Loader: metadata loaded');
  this.metadataLoaded_ = true; 
  this.pendingRequest_ = null;
  this.outputQueue_.push(arrayBuffer);
  amplify.publish('new_meta_data');
  this.poll();
};


Loader.prototype.onMediaDataLoaded = function(arrayBuffer) {
  log('Loader: media loaded');
  this.pendingRequest_ = null;
  this.outputQueue_.push(arrayBuffer);
  amplify.publish('new_media_data');
  this.poll();
};
