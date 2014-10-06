/**
 * @fileoverview An adapter from v0.5 MSE API to 20121018 MSE API.
 */



/**
 * @constructor
 */
var MediaSourceV05Adapter = function() {
  this.duration_ = NaN;

  /**
   * @type {!Object.<!SourceBufferV05Adapter>}
   */
  this.sourceBuffers_ = {};

  /**
   * @type {SourceBufferListAdapter}
   */
  this.sourceBuffers = new SourceBufferListAdapter(this.sourceBuffers_);

  /**
   * @private {HTMLMediaElement}
   */
  this.videoTag_ = null;

  /**
   * @private {number}
   */
  this.lastSourceId_ = 0;

  this.readyState_ = MediaSourceWrapper.readyStates.CLOSED;

  this.listeners_ = {};

  Object.defineProperty(this, 'readyState', {
    get: function() {
      return this.readyState_;
    }
  });

  Object.defineProperty(this, 'duration', {
    get: this.getDuration_,
    set: this.setDuration_,
  });
};


MediaSourceV05Adapter.prototype.addEventListener = 
    function(type, listener, opt_useCapture) {
  if (this.videoTag_) {
    this.videoTag_.addEventListener(type, listener, opt_useCapture);
  }

  this.listeners_[type] = {
    'callback': listener,
    'useCapture': opt_useCapture || false,
    'added': !!this.videoTag_
  }
};


/**
 * @param {string} mimeType
 * @return {SourceBufferV05Adapter}
 * @throws {Error}
 */
MediaSourceV05Adapter.prototype.addSourceBuffer = function(mimeType) {
  if (this.readyState_ != MediaSourceWrapper.readyStates.OPEN) {
    throw new Error('Invalid state');
  }

  var id = (this.lastSourceId_++).toString();
  this.videoTag_.webkitSourceAddId(id, mimeType);
  var buffer = new SourceBufferV05Adapter(this.videoTag_, id, this);
  this.sourceBuffers_[id] = buffer;
  $(this.souceBuffers).trigger('addSourceBuffer');
  return buffer;
};


/**
 * @param {HTMLMediaElement} videoTag
 */
MediaSourceV05Adapter.prototype.attachVideoTag = function(videoTag) {
  assert(videoTag.webkitSourceAddId && videoTag.webkitSourceRemoveId,
    'MediaSourceV05Adapter should only be used with MSE v0.5 API MediaElement');
  this.videoTag_ = videoTag;
  for (var type in this.listeners_) {
    var listenerAndFlag = this.listeners_[type];
    this.videoTag_.addEventListener(type, listenerAndFlag.callback, listenerAndFlag.useCapture);
  }
  $(this).trigger('sourceopen');
  this.readyState_ = MediaSourceWrapper.readyStates.OPEN;
};


/**
 *
 */
MediaSourceV05Adapter.prototype.detachVideoTag = function() {
  if (!this.videoTag_) {
    return;
  }

  this.videoTag_.src = null;
  this.readyState_ = MediaSourceWrapper.readyStates.CLOSED;
};


/**
 * @param {=MediaSourceWrapper.errors}
 */
MediaSourceV05Adapter.prototype.endOfStream = function(opt_error) {
  if (this.readyState_ != MediaSourceWrapper.readyStates.OPEN) {
    throw new Error('Invalid state');
  }
  this.readyState_ = MediaSourceWrapper.readyStates.ENDED;
  this.videoTag_.webkitSourceEndOfStream(opt_error);
  $(this).trigger('sourceended');
};


/**
 * @param {SourceBufferV05Adapter}
 */
MediaSourceV05Adapter.prototype.removeSourceBuffer = function(buffer) {
  if (this.readyState_ != MediaSourceWrapper.readyStates.OPEN) {
    throw new Error('Invalid state');
  }

  var i = 0;
  for (i = 0; i < this.sourceBuffers_.length; i++) {
    if (buffer === this.sourceBuffers_[i]) {
      this.videoTag_.webkitSourceRemoveId(buffer.id);
      this.sourceBuffers_[i] = null;
      $(this.sourceBuffers).trigger('removeSourceBuffer');
    }
  }
};


/**
 * @return {number} Duration in seconds.
 * @private
 */
MediaSourceV05Adapter.prototype.getDuration_ = function() {
  return this.readyState_ != MediaSourceWrapper.readyStates.OPEN ?
      this.duration_ : NaN;
};


/**
 * @param {number} duration Duration in seconds
 * @throws {Error}
 * @private
 */
MediaSourceV05Adapter.prototype.setDuration_ = function(duration) {
  if (this.readyState_ != MediaSourceWrapper.readyStates.OPEN) {
    throw new Error('Invalid state');
  }

  if (duration < 0 || isNaN(duration)) {
    throw new Error('Invalid access');
  }

  this.duration_ = duration;
};



/**
 * This method should not be called directly.
 * Use MediaSource.addSourceBuffer to create a SourceBuffer.
 * @param {HTMLMediaElement} videoTag 
 * @param {string} id Id of this SourceBuffer
 * @param {MediaSourceV05Adapter} parentMediaSource
 * @constructor
 */
var SourceBufferV05Adapter = function(videoTag, id, parentMediaSource) {
  /**
   * @private {string}
   */
  this.id_ = id;

  /**
   * @private {MediaSourceV05Adapter}
   */
  this.parentMediaSource_ = parentMediaSource;

  /**
   * @private {HTMLMediaElement}
   */
  this.videoTag_ = videoTag;

  Object.defineProperty(this, 'timestampOffset', {
    get: this.getTimestampOffset_,
    set: this.setTimestampOffset_
  });

  Object.defineProperty(this, 'buffered', {
    get: this.getBuffered_
  });
};


/**
 * @param {ArrayBuffer} data
 */
SourceBufferV05Adapter.prototype.appendBuffer = function(data) {
  this.videoTag_.webkitSourceAppend(this.id_, data);
};


SourceBufferV05Adapter.prototype.abort = function() {
  this.videoTag_.webkitSourceAbort(this.id_);
};



/**
 * @param {!Object.<!SourceBufferV05Adapter>}
 * @constructor
 */
var SourceBufferListAdapter = function(sourceBuffers) {
  this.sourceBuffers_ = sourceBuffers;

  Object.defineProperty(this, 'length', {
    get: function() {return _.keys(this.sourceBuffers_).length}
  });
};


/**
 * @param {number} index
 */
SourceBufferListAdapter.prototype.sourceBuffer = function(index) {
  return this.sourceBuffers_[index.toString()];
};