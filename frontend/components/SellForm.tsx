"use client";

import { useState } from "react";
import { createSale, previewSale, ApiRequestError } from "@/lib/api";
import type { SalePreview } from "@/lib/types";
import { formatShares } from "@/lib/format";
import SalePreviewBreakdown from "./SalePreviewBreakdown";

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function SellForm({ assetId, onSold }: { assetId: number; onSold: () => void }) {
  const [saleDate, setSaleDate] = useState(todayIso());
  const [sellAmount, setSellAmount] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [preview, setPreview] = useState<SalePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function invalidateStalePreview() {
    setPreview(null);
    setError(null);
  }

  async function handlePreview(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setPreview(null);
    try {
      const result = await previewSale(assetId, {
        sale_date: saleDate,
        sell_amount: sellAmount,
        sell_price: sellPrice,
      });
      setPreview(result);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(
          err.availableShares
            ? `${err.detail} Disponibles: ${formatShares(err.availableShares)} acciones, solicitadas: ${formatShares(
                err.requestedShares || "0"
              )}.`
            : err.detail
        );
      } else {
        setError("No se pudo calcular la venta.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm() {
    setBusy(true);
    setError(null);
    try {
      await createSale(assetId, { sale_date: saleDate, sell_amount: sellAmount, sell_price: sellPrice });
      setPreview(null);
      setSellAmount("");
      setSellPrice("");
      onSold();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.detail : "No se pudo registrar la venta.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-800">Vender</h3>
      <form onSubmit={handlePreview} className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="text-xs text-slate-600">
          Fecha de venta
          <input
            type="date"
            required
            value={saleDate}
            onChange={(e) => {
              setSaleDate(e.target.value);
              invalidateStalePreview();
            }}
            className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-slate-600">
          Dinero a recuperar (€)
          <input
            type="number"
            step="0.01"
            min="0.01"
            required
            value={sellAmount}
            onChange={(e) => {
              setSellAmount(e.target.value);
              invalidateStalePreview();
            }}
            className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs text-slate-600">
          Precio actual por acción (€)
          <input
            type="number"
            step="0.000001"
            min="0.000001"
            required
            value={sellPrice}
            onChange={(e) => {
              setSellPrice(e.target.value);
              invalidateStalePreview();
            }}
            className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md border border-slate-900 px-4 py-1.5 text-sm font-medium text-slate-900 disabled:opacity-40"
          >
            Previsualizar
          </button>
        </div>
      </form>

      {error && <p className="mt-3 text-sm text-loss">{error}</p>}

      {preview && (
        <>
          <SalePreviewBreakdown preview={preview} />
          <div className="mt-3 flex justify-end">
            <button
              onClick={handleConfirm}
              disabled={busy}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              Confirmar venta
            </button>
          </div>
        </>
      )}
    </div>
  );
}
