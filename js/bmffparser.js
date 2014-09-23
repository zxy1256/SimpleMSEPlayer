/**
 * BMFF box types we care about.
 * @enum {number}
 */
BmffBoxType = {
  FTYP: 0x66747970,
  MFHD: 0x6d666864,
  MOOF: 0x6d6f6f66,
  MOOV: 0x6d6f6f76,
  MVHD: 0x6d766864,
  SAIO: 0x7361696f,
  SAIZ: 0x7361697a,
  SIDX: 0x73696478,
  STYP: 0x73747970,
  TFDT: 0x74666474,
  TFHD: 0x74666864,
  TRAF: 0x74726166,
  TRUN: 0x7472756e
};



BmffParser = {};


/**
 * This is effectively for live playback only because it requires the given
 * bytes aligns with the start of a box.
 * @param {!ArrayBuffer} bytes Media data of a segment.
 * @return {number} Decode time of the first frame of a segment in seconds.
 */
BmffParser.getFirstDecodeTimeFromSegment = function(bytes) {
  var baseMediaDecodeTime = NaN;
  var timescale = NaN;

  var offset = 0;
  var data = new DataView(bytes);
  while (BmffParser.hasNextBox_(data, offset)) {
    var box = BmffParser.getNextBox_(data, offset);

    if (box.type == BmffBoxType.SIDX) {
      timescale = BmffParser.getTimeScaleFromSidx_(box);
    } else if (box.type == BmffBoxType.MVHD) {
      timescale = BmffParser.getTimeScaleFromMvhd_(box);
    } else if (box.type == BmffBoxType.TFDT) {
      baseMediaDecodeTime =
          BmffParser.getBaseMediaDecodeTimeFromTfdt_(box);
    }

    if (BmffParser.isContainerBox_(box.type)) {
      offset += 8;
    } else {
      offset += box.size;
    }
  }

  return baseMediaDecodeTime / timescale;
};


/**
 * @param {!BmffBox_} box A TFDT box.
 * @return {number} Decode time of the first frame of a segment in timescale.
 * @private
 */
BmffParser.getBaseMediaDecodeTimeFromTfdt_ = function(box) {
  var version = box.data.getUint8(box.offset + 8);
  if (version) {
    return BmffParser.getUint64_(box.data, box.offset + 12);
  } else {
    return box.data.getUint32(box.offset + 12);
  }
};


/**
 * @param {!DataView} data Data to parse.
 * @param {number} offset Byte offset with respect to data.
 * @return {!BmffBox_} A BMFF box.
 * @private
 */
BmffParser.getNextBox_ = function(data, offset) {
  var size = data.getUint32(offset);
  var boxType =
      /** @type {BmffBoxType} */ (data.getUint32(offset + 4));

  return new BmffBox_(data, offset, size, boxType);
};


/**
 * @param {!BmffBox_} box A MVHD box.
 * @return {number} Time scale of a media segment.
 * @private
 */
BmffParser.getTimeScaleFromMvhd_ = function(box) {
  var version = box.data.getUint8(box.offset + 8);
  var timescaleByteOffset = version ? 28 : 20;
  return box.data.getUint32(box.offset + timescaleByteOffset);
};


/**
 * @param {!BmffBox_} box A SIDX box.
 * @return {number} Time scale of a media segment.
 * @private
 */
BmffParser.getTimeScaleFromSidx_ = function(box) {
  return box.data.getUint32(box.offset + 16);
};


/**
 * Reads the bytes from offset as Uint64.
 * @param {!DataView} data Data to parse.
 * @param {number} offset Byte offset with respect to data.
 * @return {number}
 * @private
 */
BmffParser.getUint64_ = function(data, offset) {
  return data.getUint32(offset) * 4294967296 + data.getUint32(offset + 4);
};


/**
 * @param {!DataView} data Data to parse.
 * @param {number} offset Byte offset with respect to data.
 * @return {boolean} Whether next box is available.
 * @private
 */
BmffParser.hasNextBox_ = function(data, offset) {
  if (data.byteLength - offset < 8) {
    return false;
  }
  var size = data.getUint32(offset);

  // A valid box must have a size as large as its header.
  if (size < 8) {
    return false;
  }

  // A valid box must have a type string that matches regexp [a-z]{4},
  // e.g., 'moof', 'moov'. For speed reason, the implementation here does not
  // use regexp.
  var asciiDecimalValueOfLowerCaseA = 97;
  var asciiDecimalValueOfLowerCaseZ = 122;
  for (var i = 4; i < 8; i++) {
    var asciiDecimalValue = data.getInt8(offset + i);
    if (asciiDecimalValue < asciiDecimalValueOfLowerCaseA ||
        asciiDecimalValue > asciiDecimalValueOfLowerCaseZ) {
      return false;
    }
  }

  return data.byteLength - offset >= size;
};


/**
 * @param {!BmffBoxType} boxType
 * @return {boolean} Whether the given box type is recognized as a box which
 *     contains nothing but zero or more other boxes.
 * @private
 */
BmffParser.isContainerBox_ = function(boxType) {
  return boxType == BmffBoxType.MOOF ||
      boxType == BmffBoxType.MOOV ||
      boxType == BmffBoxType.TRAF;
};



/**
 * A box according to BMFF format.
 * @param {!DataView} data Data of the box.
 * @param {number} offset Offset in bytes for the start of this box.
 * @param {number} size Total size in bytes including child boxes.
 * @param {!BmffBoxType} type
 * @constructor
 * @struct
 * @private
 */
BmffBox_ = function(data, offset, size, type) {
  /** @type {!DataView} */
  this.data = data;

  /** @type {number} */
  this.offset = offset;

  /** @type {number} */
  this.size = size;

  /** @type {!BmffBoxType} */
  this.type = type;

  /** @private {number} */
  this.readOffset_ = 8;  // Skip the box header.
};


/**
 * @return {number} Int32. Advances readOffset.
 */
BmffBox_.prototype.readInt32 = function() {
  var value = this.data.getInt32(this.offset + this.readOffset_);
  this.readOffset_ += 4;
  return value;
};


/**
 * @return {number} Int64, within precision limits. Advances readOffset.
 */
BmffBox_.prototype.readInt64 = function() {
  var value = BmffParser.getUint64_(
      this.data, this.offset + this.readOffset_);
  this.readOffset_ += 8;
  return value;
};


/**
 * @param {number} bytes Bytes to skip.
 */
BmffBox_.prototype.skip = function(bytes) {
  this.readOffset_ += bytes;
};
