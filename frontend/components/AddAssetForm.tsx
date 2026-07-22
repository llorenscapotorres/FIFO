"use client";

import { useState } from "react";
import { createAsset, ApiRequestError } from "@/lib/api";
import type { Asset } from "@/lib/types";

export default function AddAssetForm({ onCreated }: { onCreated: (asset: Asset) => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const asset = await createAsset(name.trim());
      setName("");
      onCreated(asset);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.detail : "No se pudo crear el activo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del activo (ej. MSCI World ETF)"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Añadir activo
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-loss">{error}</p>}
    </form>
  );
}
