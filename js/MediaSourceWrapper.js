/**
 * @fileoverview Wrap MediaSource and return promise.
 */

var MediaSourceWrapper = function(tag) {
  this.mediaSource_ = MediaSourceWrapper.createMediaSource();
  this.videoBuffer_ = null;
}

MediaSourceWrapper.createMediaSource = function() {
  var mediaSourceConstructor =
      window['MediaSource'] || window['WebKitMediaSource'];
  return mediaSourceConstructor ? (new mediaSourceConstructor()) : null; 
};

MediaSourceWrapper.prototype.activate = function(videoTag, onOpen) {
  this.mediaSource_.addEventListener(
      'sourceopen', onOpen, false);
  this.mediaSource_.addEventListener(
      'webkitsourceopen', onOpen, false);
  videoTag.src = window.URL.createObjectURL(this.mediaSource_);
};

MediaSourceWrapper.prototype.activateAsync = function(videoTag) {
  var act = this.activate.bind(this, videoTag);
  return Q.Promise(function(resolve, reject) {
    act(resolve);
  });
};

MediaSourceWrapper.prototype.addSourceBuffer = function(mimeTypeStr) {
  if (this.mediaSource_.addSourceBuffer) {
    this.videoBuffer_ =
      new SourceBufferWrapper(this.mediaSource_.addSourceBuffer(mimeTypeStr));
  } else {
    this.videoBuffer_ =
      new SourceBufferWrapper(this.mediaSource_.webkitAddSourceBuffer(mimeTypeStr));
  }
  return this.videoBuffer_;
};


SourceBufferWrapper = function(sourceBuffer) {
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
