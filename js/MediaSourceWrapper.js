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
  return new mediaSourceConstructor();
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


MediaSourceWrapper.prototype.detachVideoTag = function() {

}
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



/**
 * @enum {string}
 */
MediaSourceWrapper.readyStates = {
  CLOSED: 'closed',
  OPEN: 'open',
  ENDED: 'ended'
};


MediaSourceWrapper.endOfStreamError = {
  NETWORK: 'network',
  DECODE: 'decode'
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
