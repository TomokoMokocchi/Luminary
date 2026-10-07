// SFOTH wire-protocol (v23) codecs reverse-engineered from the client engine.
//
// All multi-byte fields are little-endian. Every packet in this family starts
// with:  uint16 magic = 18003 (0x4653, "SF"), uint8 version = 23, uint8 opcode.
//
// Opcodes seen on the data channels:
//   4  clock request   (client -> server, "control")   16 bytes
//   5  clock response   (server -> client, "control")   20 bytes
//   6  combat event      (server -> client, "state")     40 bytes
//   7  snapshot ack       (client -> server, "state")      8 bytes
//   2 / 11 snapshot (full / keyframe, reassembled on "state")
//   3 / 10 snapshot fragment headers
//
// Here we only need the clock handshake to bring the client to "connected".

export const MAGIC = 18003;
export const VERSION = 23;

export const OP = {
  INPUT: 1,
  SNAPSHOT: 2,
  FRAGMENT: 3,
  CLOCK_REQUEST: 4,
  CLOCK_RESPONSE: 5,
  COMBAT: 6,
  SNAPSHOT_ACK: 7,
  SNAPSHOT_KEYFRAME: 11,
  FRAGMENT_LARGE: 10,
};

// Decode a clock request (16 bytes). Returns { id, sentAt } or null.
export function decodeClockRequest(buf) {
  if (!buf || buf.length !== 16) return null;
  if (buf.readUInt16LE(0) !== MAGIC) return null;
  if (buf.readUInt8(2) !== VERSION) return null;
  if (buf.readUInt8(3) !== OP.CLOCK_REQUEST) return null;
  return {
    id: buf.readUInt32LE(4),
    sentAt: buf.readDoubleLE(8),
  };
}

// Encode a clock response (20 bytes). serverTick must be a non-negative int;
// sentAt is echoed back verbatim so the client can measure round-trip time.
export function encodeClockResponse(id, sentAt, serverTick) {
  const buf = Buffer.alloc(20);
  buf.writeUInt16LE(MAGIC, 0);
  buf.writeUInt8(VERSION, 2);
  buf.writeUInt8(OP.CLOCK_RESPONSE, 3);
  buf.writeUInt32LE(id >>> 0, 4);
  buf.writeDoubleLE(sentAt, 8);
  buf.writeInt32LE(serverTick | 0, 16);
  return buf;
}

// Identify any 18003/23 framed packet. Returns the opcode or -1.
export function opcodeOf(buf) {
  if (!buf || buf.length < 4) return -1;
  if (buf.readUInt16LE(0) !== MAGIC) return -1;
  if (buf.readUInt8(2) !== VERSION) return -1;
  return buf.readUInt8(3);
}
