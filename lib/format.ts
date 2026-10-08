// Format angka rupiah tanpa spasi: 28000 -> "Rp28.000".
export function formatRupiah(value: number) {
  return `Rp${value.toLocaleString("id-ID")}`;
}

// Jam dari Postgres "15:30:00" -> "15.30".
export function formatSlotTime(time: string) {
  return time.slice(0, 5).replace(":", ".");
}
