// State of Loader
// Initialized
// Video meta loaded
// Audio meta loaded

Loader = function() {
	this.pollThread_ = NaN;
	this.currentTime_ = NaN;
	this.isSuspended_ = false;
	this.audioTrack_ = null;
	this.videoTrack_ = null;
	this.mediaSource_ = null;
	this.videoSourceBuffer_ = null;
	this.audioSourceBuffer_ = null;
};

Loader.prototype.initialize =
	function(startSeconds, videoRepresentation, audioRepresentation) {
	this.audioTrack_ = new LoaderTrack(audioRepresentation);
	this.videoTrack_ = new LoaderTrack(videoRepresentation);
	this.publish(LoderEvent.FORMAT_CHANGE);
	this.seek(startSeconds);
}

Loader.prototype.resume = function() {

};

Loader.prototype.seek = function(time) {
	this.currentTime_ = Math.max(time, videoTime, audioTime)
};

Loader.prototype.setAudioRepresentation = function() {

};

Loader.prototype.setVideoRepresentation = function() {

};

Loader.prototype.suspend = function() {

};


// Private Methods
Loader.prototype.poll_ = function() {

}


// ==================================================================
LoaderTrack = function() {

};


LoaderTrack.prototype.func1 = function() {

}