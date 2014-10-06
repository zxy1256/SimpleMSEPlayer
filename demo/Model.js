// ========================================
// Models
// ========================================
var VideoData = function(videoDataObject) {
  this.videoData_ = videoDataObject;
  this.folder_ = '/media/' + this.videoData_.videoId;
};

VideoData.prototype.getInitSegment = function(itag) {
  return new Segment(-1, this.folder_, 'itag' + itag + '_init.mp4', null);
};

VideoData.prototype.getInitUrl = function(itag) {
  return this.folder_ + '/itag' + itag + '_init.mp4';
};

VideoData.prototype.getMediaSegments = function(itag) {
  var segmentNumbers = this.videoData_.formats[itag].mediaSegments;
  var mediaSegments = [];
  for (var i = 0; i < segmentNumbers.length; i++) {
    var segmentNumber = segmentNumbers[i];
    var fileName = 'itag' + itag + '_seq' + segmentNumber + '.mp4';
    var segment = new Segment(segmentNumber, this.folder_,
        fileName, null);
      mediaSegments.push(segment);
  }
  return mediaSegments;
};

VideoData.prototype.getMediaSegmentUrls = function(itag) {
  var segmentNumbers = this.videoData_.formats[itag].mediaSegments;
  var mediaSegmentUrls = [];
  for (var i = 0; i < segmentNumbers.length; i++) {
      mediaSegmentUrls.push(this.folder_ + '/itag' + itag + '_seq' + segmentNumbers[i] + '.mp4');
  }
  return mediaSegmentUrls;
};

VideoData.prototype.getStartTime = function() {
    return this.videoData_.startTime;
};

// ======================================
var Representation = function(adaptationSet) {
  this.adaptationSet = adaptationSet;
  this.initSegment = null; 
  this.mediaSegments = [];
};

Representation.prototype.getMaxSegmentNumber = function() {
  var lastSegment = _.last(this.mediaSegments);
  var result = lastSegment ? lastSegment.segmentNumber : -1;
  return result;
};

Representation.prototype.getSegment = function(segmentNumber) {
  if (segmentNumber == -1) {
    return this.initSegment;
  } else {
    for (var i = 0; i < this.mediaSegments.length; i++) {
      if (this.mediaSegments[i].segmentNumber == segmentNumber) {
        return this.mediaSegments[i];
      }
    }
    return null;
  }
};

// ====================================
var Segment = function(segmentNumber, baseUrl, segmentUrl, range) {
  //util.debug('Segment.constructor seg = ' + segmentNumber +
  //    ', baseUrl = ' + baseUrl + ', segmentUrl = ' + segmentUrl +
  //    ', range = ' + range);
  this.segmentNumber = segmentNumber;
  this.baseUrl = baseUrl;
  this.segmentUrl = segmentUrl;
  this.range = range;
  this.loaded = false;
  this.data = null;
};

Segment.prototype.getUrl = function() {
  return this.baseUrl + '/' + this.segmentUrl + (this.range ? '?range=' + this.range : '');
};
