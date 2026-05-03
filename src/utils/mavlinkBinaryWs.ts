/**
 * WebSocket üzerinden gelen ham MAVLink v1/v2 çerçevelerini ayrıştırıp
 * handleMAVLinkMessage / applyMavlinkJsonToTelemetry ile uyumlu JSON benzeri nesneler üretir.
 */

const M2_STX = 0xfd;
const M1_STX = 0xfe;

function u32le(dv: DataView, o: number) {
  return dv.getUint32(o, true);
}

function i32le(dv: DataView, o: number) {
  return dv.getInt32(o, true);
}

function u16le(dv: DataView, o: number) {
  return dv.getUint16(o, true);
}

function i16le(dv: DataView, o: number) {
  return dv.getInt16(o, true);
}

function f32le(dv: DataView, o: number) {
  return dv.getFloat32(o, true);
}

function decodePayload(msgid: number, payload: Uint8Array): Record<string, unknown> | null {
  if (payload.byteLength < 1) return null;
  const dv = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);

  switch (msgid) {
    case 0: {
      if (payload.byteLength < 9) return null;
      const base_mode = payload[2] ?? 0;
      const custom_mode = u32le(dv, 3);
      return { type: 'HEARTBEAT', base_mode, custom_mode };
    }
    case 33: {
      if (payload.byteLength < 28) return null;
      return {
        type: 'GLOBAL_POSITION_INT',
        time_boot_ms: u32le(dv, 0),
        lat: i32le(dv, 4),
        lon: i32le(dv, 8),
        alt: i32le(dv, 12),
        relative_alt: i32le(dv, 16),
        vx: i16le(dv, 20),
        vy: i16le(dv, 22),
        vz: i16le(dv, 24),
        hdg: u16le(dv, 26),
      };
    }
    case 74: {
      if (payload.byteLength < 20) return null;
      return {
        type: 'VFR_HUD',
        airspeed: f32le(dv, 0),
        groundspeed: f32le(dv, 4),
        heading: i16le(dv, 8),
        throttle: u16le(dv, 10),
        alt: f32le(dv, 12),
        climb: f32le(dv, 16),
      };
    }
    case 24: {
      if (payload.byteLength < 30) return null;
      const lo = dv.getUint32(0, true);
      const hi = dv.getUint32(4, true);
      const time_usec = hi * 0x100000000 + lo;
      return {
        type: 'GPS_RAW_INT',
        time_usec,
        fix_type: payload[8],
        lat: i32le(dv, 9),
        lon: i32le(dv, 13),
        alt: i32le(dv, 17),
        eph: u16le(dv, 21),
        epv: u16le(dv, 23),
        vel: u16le(dv, 25),
        cog: u16le(dv, 27),
        satellites_visible: payload[29],
      };
    }
    case 1: {
      if (payload.byteLength < 31) return null;
      return {
        type: 'SYS_STATUS',
        voltage_battery: u16le(dv, 14),
        current_battery: i16le(dv, 16),
        battery_remaining: dv.getInt8(30),
      };
    }
    default:
      return null;
  }
}

export class MavlinkWsBinaryAccumulator {
  private buf = new Uint8Array(0);

  reset() {
    this.buf = new Uint8Array(0);
  }

  /** Çerçeve başına en fazla bir mesaj döndürür; birden fazla çerçeve için döngüde çağırın. */
  push(chunk: Uint8Array): Record<string, unknown>[] {
    const combined = new Uint8Array(this.buf.length + chunk.length);
    combined.set(this.buf);
    combined.set(chunk, this.buf.length);

    const out: Record<string, unknown>[] = [];
    let i = 0;

    while (i < combined.length) {
      const b0 = combined[i];
      let frameLen = 0;
      let payloadOff = 0;
      let payloadLen = 0;
      let msgid = 0;

      if (b0 === M2_STX) {
        if (i + 10 > combined.length) break;
        payloadLen = combined[i + 1];
        const incompat = combined[i + 2];
        if (incompat !== 0) {
          i += 1;
          continue;
        }
        frameLen = 12 + payloadLen;
        if (i + frameLen > combined.length) break;
        msgid = combined[i + 7] | (combined[i + 8] << 8) | (combined[i + 9] << 16);
        payloadOff = i + 10;
      } else if (b0 === M1_STX) {
        if (i + 6 > combined.length) break;
        payloadLen = combined[i + 1];
        frameLen = 8 + payloadLen;
        if (i + frameLen > combined.length) break;
        msgid = combined[i + 5];
        payloadOff = i + 6;
      } else {
        i += 1;
        continue;
      }

      const payload = combined.subarray(payloadOff, payloadOff + payloadLen);
      const rec = decodePayload(msgid, payload);
      if (rec) out.push(rec);
      i += frameLen;
    }

    this.buf = combined.subarray(i);
    return out;
  }
}
