/**
 * @fileoverview Parser functions to extract information from BMFF media.
 */

/**
 * BMFF box types we care about.
 * @enum {number}
 */
BmffBoxType = {
  FTYP: 0x66747970,
  MDAT: 0x6d646174,
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


var BmffParser = {};

/**
 * Rewrites the timestamps for a media slice to work around buggy media.
 * @param {!DataView} media ISO BMFF media slice. Start alignment required.
 * @param {number} segDur Length of the segment in ticks.
 * @return {ArrayBuffer} The rewritten 'moof', or null if the rewrite failed.
 */
BmffParser.rewriteTimestamps = function(media, segDur) {
  // This function is long. Splitting it into multiple functions would make it
  // more complicated and even longer (especially after compression, since
  // the compiler can mangle all the locals freely).
  var moof = BmffParser.getBox_(
      media, 0, BmffBoxType.MOOF);
  if (!moof) {
    return null;
  }
  var mfhd = BmffParser.getBox_(
      media, moof.offset + 8,
      BmffBoxType.MFHD);
  var traf = BmffParser.getBox_(
      media, moof.offset + 8,
      BmffBoxType.TRAF);
  if (!mfhd || !traf) {
    return null;
  }
  var tfhd = BmffParser.getBox_(
      media, traf.offset + 8,
      BmffBoxType.TFHD);
  var trun = BmffParser.getBox_(
      media, traf.offset + 8,
      BmffBoxType.TRUN);
  var tfdt = BmffParser.getBox_(
      media, traf.offset + 8,
      BmffBoxType.TFDT);
  if (!tfhd || !trun || !tfdt) {
    return null;
  }
  var saio = BmffParser.getBox_(
      media, traf.offset + 8,
      BmffBoxType.SAIO);
  var saiz = BmffParser.getBox_(
      media, traf.offset + 8,
      BmffBoxType.SAIZ);
  // saio and saiz are optional.

  if (saio) {
    var saioFlags = saio.readInt32();
    var saioSampleCount = saio.readInt32();
    if (saioFlags != 0 || saioSampleCount != 1) {
      return null;
    }
    var saioOffset = saio.readInt32();
  }

  var tfhdFlags = tfhd.readInt32();
  var trackID = tfhd.readInt32();

  var sampleDescIndexPresent = tfhdFlags & 0x2;

  var baseDataOffset = (tfhdFlags & 0x1) ? tfhd.readInt64() : 0;
  var sampleDescIndex = sampleDescIndexPresent ? tfhd.readInt32() : 0;
  var defaultSampleDuration = (tfhdFlags & 0x8) ? tfhd.readInt32() : 0;
  var defaultSampleSize = (tfhdFlags & 0x10) ? tfhd.readInt32() : 0;
  var defaultSampleFlags = (tfhdFlags & 0x20) ? tfhd.readInt32() : 0;

  var trunFlags = trun.readInt32();
  var dataOffsetPresent = trunFlags & 0x1;
  var firstSampleFlagsPresent = trunFlags & 0x4;
  var sampleDurationPresent = trunFlags & 0x100;
  var sampleSizePresent = trunFlags & 0x200;
  var sampleFlagsPresent = trunFlags & 0x400;
  var sampleCtsOffsetsPresent = trunFlags & 0x800;

  var sampleCount = trun.readInt32();
  var dataOffset = dataOffsetPresent ? trun.readInt32() : 0;
  var firstSampleFlags = firstSampleFlagsPresent ? trun.readInt32() : 0;

  var sampleSizes = [];
  var sampleFlags = [];
  var sampleOrigPresTimes = [];
  var reorderedIdx = [];

  var ctsBias = 0;

  var dtsSum = 0;
  for (var i = 0; i < sampleCount; i++) {
    var duration = sampleDurationPresent ?
        trun.readInt32() : defaultSampleDuration;
    if (sampleSizePresent) {
      sampleSizes.push(trun.readInt32());
    }

    var flags = defaultSampleFlags;
    if (firstSampleFlagsPresent && i == 0) {
      flags = firstSampleFlags;
    } else if (sampleFlagsPresent) {
      flags = trun.readInt32();
    }
    sampleFlags.push(flags);

    var ctsOffset = sampleCtsOffsetsPresent ? trun.readInt32() : 0;
    if (i == 0) {
      // Assumes the first frame is an I-frame and is not reordered.
      ctsBias = ctsOffset;
    }
    sampleOrigPresTimes.push(dtsSum + ctsOffset);
    reorderedIdx.push(i);
    dtsSum += duration;
  }

  // Reorder the sample indices using the presentation timeline. After this
  // step, 'reorderedIdx' contains decode indices in presentation order.
  goog.array.sort(reorderedIdx,
      function(a, b) {return sampleOrigPresTimes[a] - sampleOrigPresTimes[b];});

  // Produce the forward lookup table (presentation indices in decode order).
  var forwardIdx = [];
  for (var i = 0; i < sampleCount; i++) {
    forwardIdx[reorderedIdx[i]] = i;
  }

  var tfhdOptionSize = sampleDescIndexPresent ? 4 : 0;
  var trunSampleSize = 16 * sampleCount;

  // 'moof': 8 bytes
  // 'mfhd': 16 bytes
  // 'traf': 8 bytes
  // 'tfhd': 16 bytes plus options
  // 'tfdt': copied
  // 'trun': 20 bytes plus repeating size
  var outSize = 68 + tfhdOptionSize + tfdt.size + trunSampleSize +
      (saio ? saio.size : 0) + (saiz ? saiz.size : 0);
  var sizeDelta = outSize - moof.size;
  var out = new BmffWriter_(outSize);

  out.writeInt32(outSize);
  out.writeInt32(BmffBoxType.MOOF);
  out.copyBox(mfhd);
  out.writeInt32(outSize - 24);
  out.writeInt32(BmffBoxType.TRAF);
  out.writeInt32(16 + tfhdOptionSize);
  out.writeInt32(BmffBoxType.TFHD);
  out.writeInt32(0x20000 | (sampleDescIndexPresent ? 0x2 : 0));
  out.writeInt32(trackID);
  if (sampleDescIndexPresent) {
    out.writeInt32(sampleDescIndex);
  }
  out.copyBox(tfdt);
  out.writeInt32(20 + trunSampleSize);
  out.writeInt32(BmffBoxType.TRUN);
  out.writeInt32(0x01000f01);
  out.writeInt32(sampleCount);
  out.writeInt32(baseDataOffset + dataOffset + sizeDelta);

  dtsSum = 0;
  for (var i = 0; i < sampleCount; i++) {
    var ptsIdx = forwardIdx[i];
    var pts = Math.round(segDur * ptsIdx / sampleCount);
    var dur = Math.round(segDur * (ptsIdx + 1) / sampleCount) - pts;
    var ctsOffset = pts - dtsSum + ctsBias;
    out.writeInt32(dur);
    out.writeInt32(sampleSizePresent ? sampleSizes[i] : defaultSampleSize);
    out.writeInt32(sampleFlags[i]);
    out.writeInt32(ctsOffset);
    dtsSum += dur;
  }

  if (saio) {
    out.writeInt32(saio.size);
    out.writeInt32(BmffBoxType.SAIO);
    out.writeInt32(0);
    out.writeInt32(1);
    out.writeInt32(saioOffset + sizeDelta);
  }
  if (saiz) {
    out.copyBox(saiz);
  }

  return out.data.buffer;
};


/**
 * @param {!DataView} bytes Media data of a segment.
 * @param {number} deltaTfdtInSeconds
 * @return {ArrayBuffer}
 */
BmffParser.rewriteFirstDecodeTime = function(media, deltaTfdtInSeconds) {
  // This method assumes the file structure is:
  // sidx
  // moof
  //  - mfhd
  //  - traf
  //   - tfhd
  //   - trun
  //   - tfdt
  //   - (saio)
  //   - (saiz)

  var sidx = BmffParser.getBox_(
    media, 0, BmffBoxType.SIDX);
  if (!sidx) {
    return null;
  }

  var timescale = BmffParser.getTimeScaleFromSidx_(sidx);

  var moof = BmffParser.getBox_(
      media, sidx.size, BmffBoxType.MOOF);
  if (!moof) {
    return null;
  }

  var mfhd = BmffParser.getBox_(
      media, moof.offset + 8,
      BmffBoxType.MFHD);
  var traf = BmffParser.getBox_(
      media, moof.offset + 8,
      BmffBoxType.TRAF);
  if (!mfhd || !traf) {
    return null;
  }

  var tfhd = BmffParser.getBox_(
      media, traf.offset + 8,
      BmffBoxType.TFHD);
  var trun = BmffParser.getBox_(
      media, traf.offset + 8,
      BmffBoxType.TRUN);
  var tfdt = BmffParser.getBox_(
      media, traf.offset + 8,
      BmffBoxType.TFDT);
  if (!tfhd || !trun || !tfdt) {
    return null;
  }

  var baseMediaDecodeTime =
      BmffParser.getBaseMediaDecodeTimeFromTfdt_(tfdt);

  var saio = BmffParser.getBox_(
      media, traf.offset + 8,
      BmffBoxType.SAIO);
  var saiz = BmffParser.getBox_(
      media, traf.offset + 8,
      BmffBoxType.SAIZ);
  // saio and saiz are optional.

  var mdat = BmffParser.getBox_(
      media, sidx.size + moof.size,
      BmffBoxType.MDAT);

  var out = new BmffWriter_(sidx.size + moof.size + mdat.size);

  out.copyBox(sidx);

  out.writeInt32(moof.size);
  out.writeInt32(BmffBoxType.MOOF);

  out.copyBox(mfhd);

  out.writeInt32(traf.size);
  out.writeInt32(BmffBoxType.TRAF);

  out.copyBox(tfhd);

  out.writeInt32(16)
  out.writeInt32(BmffBoxType.TFDT);
  out.writeInt32(0);
  out.writeInt32(Math.max(0, baseMediaDecodeTime + Math.floor(deltaTfdtInSeconds * timescale)));

  out.copyBox(trun);

  if (saio) {
    out.copyBox(saio);
  }
  if (saiz) {
    out.copyBox(saiz);
  }

  out.copyBox(mdat);

  return out.data.buffer; 
};


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
  assert(box.type == BmffBoxType.TFDT);
  var version = box.data.getUint8(box.offset + 8);
  if (version) {
    assert(box.data.byteLength - box.offset - 12 >= 8);
    return BmffParser.getUint64_(box.data, box.offset + 12);
  } else {
    assert(box.data.byteLength - box.offset - 12 >= 4);
    return box.data.getUint32(box.offset + 12);
  }
};


/**
 * @param {!DataView} data Raw boxes.
 * @param {number} offset Offset of first box header.
 * @param {BmffBoxType} type Type to search for.
 * @return {BmffBox_} Box, or null if none found.
 * @private
 */
BmffParser.getBox_ = function(data, offset, type) {
  while (BmffParser.hasNextBox_(data, offset)) {
    var box = BmffParser.getNextBox_(data, offset);
    if (box.type == type) {
      return box;
    }
    offset += box.size;
  }
  return null;
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
  assert(box.type == BmffBoxType.MVHD);
  var version = box.data.getUint8(box.offset + 8);
  var timescaleByteOffset = version ? 28 : 20;
  assert(
      box.data.byteLength - box.offset - timescaleByteOffset >= 4);
  return box.data.getUint32(box.offset + timescaleByteOffset);
};


/**
 * @param {!BmffBox_} box A SIDX box.
 * @return {number} Time scale of a media segment.
 * @private
 */
BmffParser.getTimeScaleFromSidx_ = function(box) {
  assert(box.type == BmffBoxType.SIDX);
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


// ==================================================================
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
  assert(size > 0);

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
  assert(this.readOffset_ + 4 <= this.size);
  var value = this.data.getInt32(this.offset + this.readOffset_);
  this.readOffset_ += 4;
  return value;
};


/**
 * @return {number} Int64, within precision limits. Advances readOffset.
 */
BmffBox_.prototype.readInt64 = function() {
  assert(this.readOffset_ + 4 <= this.size);
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


// ==================================================================
/**
 * A helper class for writing a stream.
 * @param {number} len Length in bytes.
 * @constructor
 * @struct
 * @private
 */
BmffWriter_ = function(len) {
  /** @type {DataView} */
  this.data = new DataView(new ArrayBuffer(len));

  /** @private {number} */
  this.offset_ = 0;
};


/**
 * @param {number} val Value to write.
 */
BmffWriter_.prototype.writeInt32 = function(val) {
  assert(this.offset_ + 4 <= this.data.byteLength);
  this.data.setInt32(this.offset_, val);
  this.offset_ += 4;
};


/**
 * @param {!BmffBox_} box Box to write.
 */
BmffWriter_.prototype.copyBox = function(box) {
  var i = 0;
  while (i + 4 <= box.size) {
    this.writeInt32(box.data.getUint32(box.offset + i));
    i += 4;
  }
  while (i < box.size) {
    this.data.setUint8(this.offset_++, box.data.getUint8(box.offset + i++));
  }
};
