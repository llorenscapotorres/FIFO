"use client";

import { useState } from "react";
import { updateLot, ApiRequestError } from "@/lib/api";
import type { LotWithRemaining } from "@/lib/types";

export default function EditLotModal({
  assetId,
  lot,
  onClose,
  onUpdated,
}: {
  assetId: number;
  lot: LotWithRemaining;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [purchaseDate, setPurchaseDate] = useState(lot.purchase_date);
  const [amount, setAmount] = useState(lot.amount_invested);
  const [price, setPrice] = useState(lot.price_per_share);
  const [shares, setShares] = useState(lot.shares_bought);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const hasConsumptionHistory = Number(lot.remaining_shares) < Number(lot.shares_bought);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await updateLot(assetId, lot.id, {
        purchase_date: purchaseDate,
        amount_invested: amount,
        price_per_share: price,
        shares_bought: shares,
      });
      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.detail : "No se pudo actualizar la compra.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-md bg-white p-5 shadow-lg">
        <h3 className="text-sm font-semibold">Editar compra</h3>
        {hasConsumptionHistory && (
          <p className="mt-2 rounded-md bg-amber-50 p-2 text-xs text-amber-800">
            Esta compra ya se ha usado en alguna venta. Cambiar el precio no modifica las
            ganancias/pérdidas ya calculadas, solo afectará a ventas futuras.
          </p>
        )}
        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          <label className="block text-xs text-slate-600">
            Fecha
            <input
              type="date"
              required
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="block text-xs text-slate-600">
            Dinero invertido (€)
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="block text-xs text-slate-600">
            Precio por acción (€)
            <input
              type="number"
              step="0.000001"
              min="0.000001"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="block text-xs text-slate-600">
            Acciones compradas
            <input
              type="number"
              step="0.000001"
              min="0.000001"
              required
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </label>
          {error && <p className="text-sm text-loss">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
