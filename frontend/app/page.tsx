"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AddAssetForm from "@/components/AddAssetForm";
import AssetList from "@/components/AssetList";
import YearlyPnLSummary from "@/components/YearlyPnLSummary";
import PortfolioPieChart from "@/components/PortfolioPieChart";
import YearlyPnLChart from "@/components/YearlyPnLChart";
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Tus activos</h1>
          <p className="mt-1 text-sm text-slate-600">
            Crea un activo (ETF, fondo indexado, acción...) y registra tus compras para calcular la
            ganancia o pérdida FIFO al vender.
          </p>
        </div>
        <Link
          href="/import"
          className="shrink-0 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Importar desde Excel
        </Link>
      </div>

      {!loading && (assets.length > 0 || years.length > 0) && (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <PortfolioPieChart assets={assets} />
          <YearlyPnLChart years={years} />
        </div>
      )}

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
