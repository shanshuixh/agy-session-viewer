// Merge a SQLite write-ahead log (*.db-wal) into the main database image, so that
// sql.js (which only reads a single in-memory file) sees the latest committed data.
(function (global) {
  'use strict';

  function u32be(b, o) { return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0; }

  function checksum(bytes, start, end, s0, s1, bigEndian) {
    for (let i = start; i < end; i += 8) {
      let x0, x1;
      if (bigEndian) {
        x0 = u32be(bytes, i); x1 = u32be(bytes, i + 4);
      } else {
        x0 = (bytes[i] | (bytes[i + 1] << 8) | (bytes[i + 2] << 16) | (bytes[i + 3] << 24)) >>> 0;
        x1 = (bytes[i + 4] | (bytes[i + 5] << 8) | (bytes[i + 6] << 16) | (bytes[i + 7] << 24)) >>> 0;
      }
      s0 = (s0 + x0 + s1) >>> 0;
      s1 = (s1 + x1 + s0) >>> 0;
    }
    return [s0, s1];
  }

  // Returns a new Uint8Array (or the original db if the WAL is empty/invalid).
  function applyWal(db, wal) {
    if (!wal || wal.length < 32) return db;
    const magic = u32be(wal, 0);
    if (magic !== 0x377f0682 && magic !== 0x377f0683) return db;
    const bigEndian = (magic & 1) === 1;
    const pageSize = u32be(wal, 8) || 65536;
    const salt1 = u32be(wal, 16), salt2 = u32be(wal, 20);
    let [s0, s1] = checksum(wal, 0, 24, 0, 0, bigEndian);
    if (s0 !== u32be(wal, 24) || s1 !== u32be(wal, 28)) return db;

    const frameSize = 24 + pageSize;
    const pending = new Map();   // pages of the transaction in progress
    const committed = new Map(); // page number -> offset of page data in wal
    let dbPages = Math.ceil(db.length / pageSize);

    for (let off = 32; off + frameSize <= wal.length; off += frameSize) {
      if (u32be(wal, off + 8) !== salt1 || u32be(wal, off + 12) !== salt2) break;
      [s0, s1] = checksum(wal, off, off + 8, s0, s1, bigEndian);
      [s0, s1] = checksum(wal, off + 24, off + frameSize, s0, s1, bigEndian);
      if (s0 !== u32be(wal, off + 16) || s1 !== u32be(wal, off + 20)) break;
      pending.set(u32be(wal, off), off + 24);
      const commitSize = u32be(wal, off + 4);
      if (commitSize) {
        for (const [p, o] of pending) committed.set(p, o);
        pending.clear();
        dbPages = commitSize;
      }
    }
    if (!committed.size) return db;

    const out = new Uint8Array(dbPages * pageSize);
    out.set(db.subarray(0, Math.min(db.length, out.length)));
    for (const [p, o] of committed) {
      if (p >= 1 && p <= dbPages) out.set(wal.subarray(o, o + pageSize), (p - 1) * pageSize);
    }
    // Header bytes 18/19: file format write/read version. 2 = WAL, 1 = legacy.
    out[18] = 1; out[19] = 1;
    return out;
  }

  global.applyWal = applyWal;
})(window);
