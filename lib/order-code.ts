// Format kode pesanan: NYO-XXXX, tanpa karakter ambigu 0/O/1/I.
export const ORDER_CODE_PATTERN = /^NYO-[A-HJ-NP-Z2-9]{4}$/;

// Rapikan ketikan user jadi "NYO-XXXX": huruf kapital, buang spasi/strip,
// awalan "NYO" boleh diketik atau tidak.
export function normalizeOrderCode(input: string) {
  let raw = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  // User sedang mengetik awalannya ("N", "NY", "NYO"): biarkan dulu.
  if ("NYO".startsWith(raw)) return raw;
  if (raw.startsWith("NYO")) raw = raw.slice(3);
  raw = raw.slice(0, 4);
  return raw ? `NYO-${raw}` : "";
}
