"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getAsset, getAssetSummary, getLots, getSales } from "@/lib/api";
import type { Asset, AssetSummary, LotWithRemaining, Sale } from "@/lib/types";
import PositionSummaryCard from "@/components/PositionSummaryCard";
import AddLotForm from "@/components/AddLotForm";
import LotsTable from "@/components/LotsTable";
import SellForm from "@/components/SellForm";
import SalesHistoryTable from "@/components/SalesHistoryTable";

export default function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const assetId = Number(id);

  const [asset, setAsset] = useState<Asset | null>(null);
  const [summary, setSummary] = useState<AssetSummary | null>(null);
  const [lots, setLots] = useState<LotWithRemaining[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshAll = useCallback(async () => {
    const [assetData, summaryData, lotsData, salesData] = await Promise.all([
      getAsset(assetId),
      getAssetSummary(assetId),
      getLots(assetId),
      getSales(assetId),
    ]);
    setAsset(assetData);
    setSummary(summaryData);
    setLots(lotsData);
    setSales(salesData);
  }, [assetId]);

  useEffect(() => {
    refreshAll().finally(() => setLoading(false));
  }, [refreshAll]);

  if (loading) {
    return <p className="text-sm text-slate-500">Cargando...</p>;
  }

  if (!asset || !summary) {
    return <p className="text-sm text-loss">No se ha encontrado el activo.</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/" className="text-xs text-slate-500 underline">
          &larr; volver a activos
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{asset.name}</h1>
      </div>

      <PositionSummaryCard summary={summary} />

      <section>
        <h2 className="text-lg font-semibold text-slate-800">Compras</h2>
        <div className="mt-3 space-y-4">
          <AddLotForm assetId={assetId} onCreated={refreshAll} />
          <LotsTable assetId={assetId} lots={lots} onRefresh={refreshAll} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800">Vender</h2>
        <div className="mt-3">
          <SellForm assetId={assetId} onSold={refreshAll} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-800">Historial de ventas</h2>
        <div className="mt-3">
          <SalesHistoryTable assetId={assetId} sales={sales} onRefresh={refreshAll} />
        </div>
      </section>
    </div>
  );
}
