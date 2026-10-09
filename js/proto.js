// Schemaless protobuf decoder. Antigravity stores steps as protobuf blobs without
// a published schema, so we decode the wire format and address fields by number.
(function (global) {
  'use strict';

  const utf8 = new TextDecoder('utf-8', { fatal: true });
  const utf8Loose = new TextDecoder('utf-8');

  function readVarint(buf, pos) {
    let result = 0, mul = 1, b;
    do {
      if (pos >= buf.length) throw new Error('varint overflow');
      b = buf[pos++];
      result += (b & 0x7f) * mul;
      mul *= 128;
    } while (b & 0x80);
    return [result, pos];
  }

  // Decode one message level. Returns array of {f, w, v}; v is a number (varint),
  // Uint8Array (length-delimited / fixed). Throws on malformed input.
  function decode(buf) {
    const out = [];
    let pos = 0;
    while (pos < buf.length) {
      let key;
      [key, pos] = readVarint(buf, pos);
      const f = Math.floor(key / 8), w = key & 7;
      if (f === 0) throw new Error('field 0');
      let v;
      if (w === 0) {
        [v, pos] = readVarint(buf, pos);
      } else if (w === 1) {
        if (pos + 8 > buf.length) throw new Error('eof');
        v = buf.subarray(pos, pos + 8); pos += 8;
      } else if (w === 5) {
        if (pos + 4 > buf.length) throw new Error('eof');
        v = buf.subarray(pos, pos + 4); pos += 4;
      } else if (w === 2) {
        let len;
        [len, pos] = readVarint(buf, pos);
        if (pos + len > buf.length) throw new Error('eof');
        v = buf.subarray(pos, pos + len); pos += len;
      } else {
        throw new Error('bad wire type ' + w);
      }
      out.push({ f, w, v });
    }
    return out;
  }

  function tryDecode(buf) {
    if (!(buf instanceof Uint8Array)) return null;
    try { return decode(buf); } catch (e) { return null; }
  }

  // A small wrapper with lazy navigation: msg.get(5, 4, 2) walks nested fields.
  class Msg {
    constructor(buf) {
      this.buf = buf;
      this.fields = tryDecode(buf) || [];
    }
    raw(f) { const x = this.fields.find(e => e.f === f); return x ? x.v : undefined; }
    rawAll(f) { return this.fields.filter(e => e.f === f).map(e => e.v); }
    msg(...path) {
      let m = this;
      for (const f of path) {
        const v = m.raw(f);
        if (!(v instanceof Uint8Array)) return null;
        m = new Msg(v);
      }
      return m;
    }
    msgs(...path) {
      const last = path.pop();
      const parent = path.length ? this.msg(...path) : this;
      return parent ? parent.rawAll(last).filter(v => v instanceof Uint8Array).map(v => new Msg(v)) : [];
    }
    str(...path) {
      const last = path.pop();
      const parent = path.length ? this.msg(...path) : this;
      if (!parent) return '';
      const v = parent.raw(last);
      return v instanceof Uint8Array ? utf8Loose.decode(v) : '';
    }
    strs(...path) {
      const last = path.pop();
      const parent = path.length ? this.msg(...path) : this;
      return parent ? parent.rawAll(last).filter(v => v instanceof Uint8Array).map(v => utf8Loose.decode(v)) : [];
    }
    num(...path) {
      const last = path.pop();
      const parent = path.length ? this.msg(...path) : this;
      if (!parent) return undefined;
      const v = parent.raw(last);
      return typeof v === 'number' ? v : undefined;
    }
    has(f) { return this.fields.some(e => e.f === f); }
    // google.protobuf.Timestamp {1: seconds, 2: nanos} -> Date
    time(...path) {
      const m = this.msg(...path);
      if (!m) return null;
      const s = m.num(1);
      if (!s) return null;
      return new Date(s * 1000 + Math.floor((m.num(2) || 0) / 1e6));
    }
  }

  function isPrintable(s) {
    // allow tab/newline/CR; reject other C0 controls
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      if (c < 32 && c !== 9 && c !== 10 && c !== 13) return false;
      if (c === 0xfffd) return false;
    }
    return true;
  }

  // Classify a length-delimited value: 'string' | 'message' | 'bytes'
  function classify(v) {
    if (v.length === 0) return { kind: 'string', value: '' };
    let s = null;
    try { s = utf8.decode(v); } catch (e) { s = null; }
    if (s !== null && isPrintable(s)) return { kind: 'string', value: s };
    const sub = tryDecode(v);
    if (sub && sub.length) return { kind: 'message', value: sub };
    if (s !== null) return { kind: 'string', value: s };
    return { kind: 'bytes', value: v };
  }

  // Convert a buffer into a plain JS tree for the raw viewer.
  function toTree(buf, depth) {
    depth = depth || 0;
    const fields = tryDecode(buf);
    if (!fields) return null;
    return fields.map(({ f, w, v }) => {
      if (w === 0) return { f, type: 'varint', value: v };
      if (w === 1 || w === 5) return { f, type: 'fixed', value: Array.from(v, b => b.toString(16).padStart(2, '0')).join('') };
      const c = classify(v);
      if (c.kind === 'message' && depth < 40) return { f, type: 'message', value: toTree(v, depth + 1) };
      if (c.kind === 'string') return { f, type: 'string', value: c.value };
      return { f, type: 'bytes', value: v.length };
    });
  }

  // Collect every printable string in a message tree (for generic previews / search).
  function collectStrings(buf, out, minLen, depth) {
    out = out || []; minLen = minLen || 1; depth = depth || 0;
    const fields = tryDecode(buf);
    if (!fields || depth > 40) return out;
    for (const { w, v } of fields) {
      if (w !== 2) continue;
      const c = classify(v);
      if (c.kind === 'string' && c.value.length >= minLen) out.push(c.value);
      else if (c.kind === 'message') collectStrings(v, out, minLen, depth + 1);
    }
    return out;
  }

  global.Proto = { decode, tryDecode, Msg, toTree, classify, collectStrings };
})(window);
