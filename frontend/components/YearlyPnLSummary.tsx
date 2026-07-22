import type { YearlyPnL } from "@/lib/types";
import { formatMoney } from "@/lib/format";

export default function YearlyPnLSummary({ years }: { years: YearlyPnL[] }) {
  if (years.length === 0) {
    return null;
  }

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">Beneficio/pérdida por año</h2>
      <p className="mt-1 text-xs text-slate-500">
        Ganancia o pérdida realizada al vender, agrupada por el año de la venta — lo que toca declarar cada año.
      </p>
      <div className="mt-3 divide-y divide-slate-100">
        {years.map((row) => {
          const gainLoss = Number(row.gain_loss);
          return (
            <div key={row.year} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-slate-900">{row.year}</p>
                <p className="text-xs text-slate-500">
                  {row.sale_count} {row.sale_count === 1 ? "venta" : "ventas"}
                </p>
              </div>
              <p className={`text-sm font-semibold ${gainLoss >= 0 ? "text-gain" : "text-loss"}`}>
                {formatMoney(row.gain_loss)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
