"use client";

import { useState } from "react";
import { createLot, ApiRequestError } from "@/lib/api";

function computeShares(amount: string, price: string): string {
  const a = Number(amount);
  const p = Number(price);
  if (!a || !p || a <= 0 || p <= 0) return "";
  return (a / p).toFixed(6);
}

export default function AddLotForm({
  assetId,
  onCreated,
}: {
  assetId: number;
  onCreated: () => void;
}) {
  const [purchaseDate, setPurchaseDate] = useState("");
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [shares, setShares] = useState("");
  const [sharesEditedManually, setSharesEditedManually] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleAmountChange(value: string) {
    setAmount(value);
    if (!sharesEditedManually) setShares(computeShares(value, price));
  }

  function handlePriceChange(value: string) {
    setPrice(value);
    if (!sharesEditedManually) setShares(computeShares(amount, value));
  }

  function handleSharesChange(value: string) {
    setShares(value);
    setSharesEditedManually(true);
  }

  function resetForm() {
    setPurchaseDate("");
    setAmount("");
    setPrice("");
    setShares("");
    setSharesEditedManually(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createLot(assetId, {
        purchase_date: purchaseDate,
        amount_invested: amount,
        price_per_share: price,
        shares_bought: shares,
      });
      resetForm();
      onCreated();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.detail : "No se pudo registrar la compra.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-md border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-800">Añadir compra</h3>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="text-xs text-slate-600">
          Fecha
          <input
            type="date"
            required
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-slate-600">
          Dinero invertido (€)
          <input
            type="number"
            step="0.01"
            min="0.01"
            required
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-slate-600">
          Precio por acción (€)
          <input
            type="number"
            step="0.000001"
            min="0.000001"
            required
            value={price}
            onChange={(e) => handlePriceChange(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-slate-600">
          Acciones compradas
          <input
            type="number"
            step="0.000001"
            min="0.000001"
            required
            value={shares}
            onChange={(e) => handleSharesChange(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Registrar compra
        </button>
        {sharesEditedManually && (
          <button
            type="button"
            onClick={() => {
              setSharesEditedManually(false);
              setShares(computeShares(amount, price));
            }}
            className="text-xs text-slate-500 underline"
          >
            recalcular acciones automáticamente
          </button>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-loss">{error}</p>}
    </form>
  );
}
