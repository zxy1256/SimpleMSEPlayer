/**
 * @fileoverview Wrap MediaSource and return promise.
 */



/**
 * A wrapper to provide promise-based APIs for MediaSource.
 * @constructor
 */
var MediaSourceWrapper = function() {
  if (MediaSourceWrapper.isMediaSourceAvailable()) {
    this.mediaSource_ = MediaSourceWrapper.createMediaSource();
    this.videoBuffer_ = null;
  } else {
    throw new Error('MediaSource unsupported');
  }
};


/**
 * @return {boolean} Whether MediaSource is supported.
 */
MediaSourceWrapper.isMediaSourceAvailable = function() {
  return !!(window['MediaSource'] || 
      window['WebKitMediaSource'] ||
      (window['HTMLMediaElement'] && 
       HTMLMediaElement.prototype.webkitSourceAddId));
};


MediaSourceWrapper.createMediaSource = function() {
  var mediaSourceConstructor =
      window['MediaSource'] || 
      window['WebKitMediaSource'];
  if (mediaSourceConstructor) {
    return new mediaSourceConstructor();
  } else {
    return new MediaSourceImpl();
  } 
};


// =====================
// Public methods
// =====================
MediaSourceWrapper.prototype.activateAsync = function(videoTag) {
  var act = this.activate_.bind(this, videoTag);
  return Q.Promise(function(resolve, reject) {
    act(resolve);
  });
};


MediaSourceWrapper.prototype.addSourceBuffer = function(mimeTypeStr) {
  if (this.mediaSource_.addSourceBuffer) {
    return new SourceBufferWrapper(
        this.mediaSource_.addSourceBuffer(mimeTypeStr));
  } else {
    return new SourceBufferWrapper(
        this.mediaSource_.webkitAddSourceBuffer(mimeTypeStr));
  }
};


// =====================
// Private methods
// =====================
MediaSourceWrapper.prototype.activate_ = function(videoTag, onOpen) {
  this.mediaSource_.addEventListener(
      'sourceopen', onOpen, false);
  this.mediaSource_.addEventListener(
      'webkitsourceopen', onOpen, false);
  videoTag.src = window.URL.createObjectURL(this.mediaSource_);
};



MediaSourceWrapper.readyStates = {
  CLOSED: 'closed',
  OPEN: 'open',
  ENDED: 'ended'
};


/**
 * An adapter from v0.5 MSE API to latest MSE API.
 * @constructor
 */
var MediaSourceV05Adapter = function() {
  /**
   * @type {!Array.<!SourceBufferV05Adapter>}
   */
  this.sourceBuffers = [];

  /**
   * @private {HTMLMediaElement}
   */
  this.videoTag_ = null;

  /**
   * @private {number}
   */
  this.lastSourceId_ = 0;

  this.readyState_ = MediaSourceWrapper.readyStates.CLOSED;

  Object.defineProperty(this, 'readyState', {
    get: function() {
      return this.readyState_;
    }
  });
};


MediaSourceV05Adapter.prototype.addEventListener = 
    function(type, listener, opt_useCapture) {

};


MediaSourceV05Adapter.prototype.addSourceBuffer = function(mimeType) {
  if (this.readyState_ != MediaSourceWrapper.readyStates.OPEN) {
    throw new Error('Invalid state');
  }

  var id = (this.lastSourceId_++).toString();
  this.videoTag_.webkitSourceAddId(id, mimeTyp);
  var buffer = new SourceBufferV05Adapter(this.videoTag_, id);
  this.sourceBuffers.push(buffer);
  return buffer;
};


MediaSourceV05Adapter.prototype.attachVideoTag = function(videoTag) {
  assert(videoTag.webkitSourceAddId && videoTag.webkitSourceRemoveId,
    'MediaSourceV05Adapter should only be used with MSE v0.5 API MediaElement');
  this.videoTag_ = videoTag;
  this.readyState_ = MediaSourceWrapper.readyStates.OPEN;
  this.emitEvent('sourceopen');
};


MediaSourceV05Adapter.prototype.endOfStream = function(opt_error) {
  if (this.readyState_ != MediaSourceWrapper.readyStates.OPEN) {
    throw new Error('Invalid state');
  }
};


MediaSourceV05Adapter.prototype.removeSourceBuffer = function(buffer) {
  if (!this.videoTag_) {
    throw new Error('Invalid state');
  }

  var i = 0;
  for (i = 0; i < this.sourceBuffers.length; i++) {
    if (buffer === this.sourceBuffers[i]) {
      this.videoTag_.webkitSource
    }
  }
};



/**
 * @constructor
 */
var SourceBufferWrapper = function(sourceBuffer) {
  this.buffer_ = sourceBuffer;
};


SourceBufferWrapper.prototype.append = function(arrayBuffer, onDone, onError) {
  log('In append, buffer.timestampOffset = ' + this.buffer_.timestampOffset)
  try {
    var data = new Uint8Array(arrayBuffer);
    if (this.buffer_.appendBuffer) {
      log('Use appendBuffer')
      this.buffer_.addEventListener('updateend', onDone);
      this.buffer_.appendBuffer(data);
    } else if (this.buffer_.appendArrayBuffer) {
      log('Use appendBufferArray')
      this.buffer_.addEventListener('updateend', onDone);
      this.buffer_.appendArrayBuffer(data);
    } else if (this.buffer_.append) {
      log('Use append')
      this.buffer_.append(data);
      setTimeout(onDone, 0);
    }
  } catch (e) {
    log(JSON.stringify(e));
    onError()
  }
};


SourceBufferWrapper.prototype.setTimestampOffset = function(offsetInSeconds) {
  try {
    log('In SourceBuffer.setTimestampOffset, buffer.timestampOffset = ' + this.buffer_.timestampOffset)
    this.buffer_.timestampOffset = offsetInSeconds;
    log('In SourceBuffer.setTimestampOffset, buffer.timestampOffset = ' + this.buffer_.timestampOffset)
  } catch (e) {
    log(JSON.stringify(e));
  }
};


SourceBufferWrapper.prototype.appendAsync = function(arrayBuffer) {
  var asyncFunc = this.append.bind(this, arrayBuffer);
  log('In append Async')
  return Q.Promise(function(resolve, reject) {
    asyncFunc(resolve, reject)
  });
};


var SourceBufferV05Adapter = function(videoTag, id) {

}