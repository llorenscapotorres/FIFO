"use client";

import { useEffect, useState } from "react";
import AddAssetForm from "@/components/AddAssetForm";
import AssetList from "@/components/AssetList";
import YearlyPnLSummary from "@/components/YearlyPnLSummary";
import { getAssets, getYearlyPnL } from "@/lib/api";
import type { Asset, YearlyPnL } from "@/lib/types";

export default function DashboardPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [years, setYears] = useState<YearlyPnL[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAssets(), getYearlyPnL()])
      .then(([assetsResult, yearsResult]) => {
        setAssets(assetsResult);
        setYears(yearsResult);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Tus activos</h1>
      <p className="mt-1 text-sm text-slate-600">
        Crea un activo (ETF, fondo indexado, acción...) y registra tus compras para calcular la
        ganancia o pérdida FIFO al vender.
      </p>

      {!loading && years.length > 0 && (
        <div className="mt-6">
          <YearlyPnLSummary years={years} />
        </div>
      )}

      <div className="mt-6">
        <AddAssetForm onCreated={(asset) => setAssets((prev) => [...prev, asset])} />
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-slate-500">Cargando...</p>
      ) : (
        <AssetList assets={assets} />
      )}
    </div>
  );
}
