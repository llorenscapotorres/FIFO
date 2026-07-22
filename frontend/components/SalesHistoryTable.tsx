"use client";

import { Fragment, useState } from "react";
import { deleteSale, getSale, ApiRequestError } from "@/lib/api";
import type { Sale, SaleWithBreakdown } from "@/lib/types";
import { formatDate, formatMoney, formatShares } from "@/lib/format";

export default function SalesHistoryTable({
  assetId,
  sales,
  onRefresh,
}: {
  assetId: number;
  sales: Sale[];
  onRefresh: () => void;
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [details, setDetails] = useState<Record<number, SaleWithBreakdown>>({});
  const [error, setError] = useState<string | null>(null);

  async function toggleExpand(sale: Sale) {
    if (expandedId === sale.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(sale.id);
    if (!details[sale.id]) {
      const full = await getSale(assetId, sale.id);
      setDetails((prev) => ({ ...prev, [sale.id]: full }));
    }
  }

  async function handleDelete(sale: Sale) {
    setError(null);
    if (!confirm(`¿Borrar la venta del ${formatDate(sale.sale_date)}? Esto libera las acciones consumidas.`))
      return;
    try {
      await deleteSale(assetId, sale.id);
      onRefresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.detail : "No se pudo borrar la venta.");
    }
  }

  if (sales.length === 0) {
    return <p className="text-sm text-slate-500">Todavía no hay ventas registradas.</p>;
  }

  return (
    <div>
      {error && <p className="mb-2 text-sm text-loss">{error}</p>}
      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Vendido</th>
              <th className="px-3 py-2">Precio</th>
              <th className="px-3 py-2">Acciones</th>
              <th className="px-3 py-2">Ganancia/Pérdida</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sales.map((sale) => {
              const isGain = Number(sale.gain_loss) >= 0;
              const isExpanded = expandedId === sale.id;
              const detail = details[sale.id];
              return (
                <Fragment key={sale.id}>
                  <tr>
                    <td className="px-3 py-2">{formatDate(sale.sale_date)}</td>
                    <td className="px-3 py-2">{formatMoney(sale.sell_amount)}</td>
                    <td className="px-3 py-2">{formatMoney(sale.sell_price)}</td>
                    <td className="px-3 py-2">{formatShares(sale.shares_sold)}</td>
                    <td className={`px-3 py-2 font-medium ${isGain ? "text-gain" : "text-loss"}`}>
                      {formatMoney(sale.gain_loss)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      <button
                        onClick={() => toggleExpand(sale)}
                        className="mr-3 text-xs text-slate-600 underline"
                      >
                        {isExpanded ? "ocultar" : "detalle"}
                      </button>
                      <button onClick={() => handleDelete(sale)} className="text-xs text-loss underline">
                        borrar
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={6} className="bg-slate-50 px-3 py-3">
                        {!detail ? (
                          <p className="text-xs text-slate-500">Cargando...</p>
                        ) : (
                          <table className="w-full text-xs">
                            <thead className="text-left text-slate-500">
                              <tr>
                                <th className="py-1 pr-3">Compra del</th>
                                <th className="py-1 pr-3">Precio de compra</th>
                                <th className="py-1 pr-3">Acciones consumidas</th>
                                <th className="py-1 pr-3">Coste base</th>
                              </tr>
                            </thead>
                            <tbody>
                              {detail.breakdown.map((row) => (
                                <tr key={row.purchase_lot_id}>
                                  <td className="py-1 pr-3">{formatDate(row.purchase_date)}</td>
                                  <td className="py-1 pr-3">{formatMoney(row.lot_price_per_share)}</td>
                                  <td className="py-1 pr-3">{formatShares(row.shares_consumed)}</td>
                                  <td className="py-1 pr-3">{formatMoney(row.cost_basis)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
