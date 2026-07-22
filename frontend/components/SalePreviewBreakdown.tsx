import type { SalePreview } from "@/lib/types";
import { formatDate, formatMoney, formatShares } from "@/lib/format";

export default function SalePreviewBreakdown({ preview }: { preview: SalePreview }) {
  const isGain = Number(preview.gain_loss) >= 0;

  return (
    <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm text-slate-600">
        Vendes <span className="font-semibold">{formatShares(preview.shares_to_sell)} acciones</span>,
        repartidas entre las compras más antiguas (FIFO):
      </p>
      <div className="mt-3 overflow-x-auto rounded-md border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="px-3 py-2">Compra del</th>
              <th className="px-3 py-2">Precio de compra</th>
              <th className="px-3 py-2">Acciones consumidas</th>
              <th className="px-3 py-2">Coste base</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {preview.breakdown.map((row) => (
              <tr key={row.purchase_lot_id}>
                <td className="px-3 py-2">{formatDate(row.purchase_date)}</td>
                <td className="px-3 py-2">{formatMoney(row.lot_price_per_share)}</td>
                <td className="px-3 py-2">{formatShares(row.shares_consumed)}</td>
                <td className="px-3 py-2">{formatMoney(row.cost_basis)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-slate-600">Coste base total: {formatMoney(preview.total_cost_basis)}</span>
        <span className={`text-base font-semibold ${isGain ? "text-gain" : "text-loss"}`}>
          {isGain ? "Ganancia" : "Pérdida"} a declarar: {formatMoney(preview.gain_loss)}
        </span>
      </div>
    </div>
  );
}
