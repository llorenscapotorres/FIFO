"use client";

import { useState } from "react";
import { deleteLot, ApiRequestError } from "@/lib/api";
import type { LotWithRemaining } from "@/lib/types";
import { formatDate, formatMoney, formatShares } from "@/lib/format";
import EditLotModal from "./EditLotModal";

export default function LotsTable({
  assetId,
  lots,
  onRefresh,
}: {
  assetId: number;
  lots: LotWithRemaining[];
  onRefresh: () => void;
}) {
  const [editingLot, setEditingLot] = useState<LotWithRemaining | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete(lot: LotWithRemaining) {
    setDeleteError(null);
    if (!confirm(`¿Borrar la compra del ${formatDate(lot.purchase_date)}?`)) return;
    try {
      await deleteLot(assetId, lot.id);
      onRefresh();
    } catch (err) {
      setDeleteError(err instanceof ApiRequestError ? err.detail : "No se pudo borrar la compra.");
    }
  }

  if (lots.length === 0) {
    return <p className="text-sm text-slate-500">Todavía no hay compras registradas.</p>;
  }

  return (
    <div>
      {deleteError && <p className="mb-2 text-sm text-loss">{deleteError}</p>}
      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Invertido</th>
              <th className="px-3 py-2">Precio/acción</th>
              <th className="px-3 py-2">Acciones compradas</th>
              <th className="px-3 py-2">Acciones restantes</th>
              <th className="px-3 py-2">Coste restante</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lots.map((lot) => (
              <tr key={lot.id}>
                <td className="px-3 py-2">{formatDate(lot.purchase_date)}</td>
                <td className="px-3 py-2">{formatMoney(lot.amount_invested)}</td>
                <td className="px-3 py-2">{formatMoney(lot.price_per_share)}</td>
                <td className="px-3 py-2">{formatShares(lot.shares_bought)}</td>
                <td className="px-3 py-2">
                  {formatShares(lot.remaining_shares)}
                  {Number(lot.remaining_shares) === 0 && (
                    <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                      agotado
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">{formatMoney(lot.remaining_cost_basis)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  <button
                    onClick={() => setEditingLot(lot)}
                    className="mr-3 text-xs text-slate-600 underline"
                  >
                    editar
                  </button>
                  <button onClick={() => handleDelete(lot)} className="text-xs text-loss underline">
                    borrar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingLot && (
        <EditLotModal
          assetId={assetId}
          lot={editingLot}
          onClose={() => setEditingLot(null)}
          onUpdated={onRefresh}
        />
      )}
    </div>
  );
}
