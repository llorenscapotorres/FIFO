export function formatMoney(value: string | number): string {
  const n = typeof value === "string" ? Number(value) : value;
  return n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });
}

export function formatShares(value: string | number): string {
  const n = typeof value === "string" ? Number(value) : value;
  return n.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 6 });
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("es-ES");
}
