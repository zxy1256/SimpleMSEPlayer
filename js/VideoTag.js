// This is a wrapper of video tag that supports larger than 33bit timestamp.
VideoTag = function() {
  this.currentTime_ = 0;
  this.latestInnerTime_ = 0;
  this.tag_ = new OverflowVideoTag();
  this.tag_.on('timeupdate', this.onTimeUpdate);
};

VideoTag.instance_ = null;

VideoTag.getTag = function() {
  if (VideoTag.instance_) {
    return VideoTag.instance_;
  }
};

VideoTag.prototype.seek = function(time) {
  this.currentTime_ = time;
  this.tag_.seek(time);
};

VideoTag.prototype.getCurrentTime = function() {
  return this.currentTime_;
};

VideoTag.prototype.onTimeUpdate = function(evt) {
  var newTime = evt.time;
  this.currentTime_ += (newTime - this.latestInnerTime);
  this.latestInnerTime = newTime;
};

OverflowVideoTag = function() {
  this.currentTime_ = 0;
};

OverflowVideoTag.OVERFLOW_MAX = 95443.7176888889; 

OverflowVideoTag.prototype.seek = function(time) {
  this.currentTime_ = time % OverflowVideoTag.OVERFLOW_MAX;
};

OverflowVideoTag.prototype.getCurrentTime = function() {
  return this.currentTime_;
};
