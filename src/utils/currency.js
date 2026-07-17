export function formatCfa(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return "";
  return `CFA ${n.toLocaleString("en-US")}`;
}
