"use client";

import Link from "next/link";
import type { Asset } from "@/lib/types";
import { formatMoney, formatShares } from "@/lib/format";

export default function AssetList({ assets }: { assets: Asset[] }) {
  if (assets.length === 0) {
    return (
      <p className="mt-6 text-sm text-slate-500">
        Todavía no has añadido ningún activo. Crea el primero arriba.
      </p>
    );
  }

  return (
    <ul className="mt-6 divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
      {assets.map((asset) => (
        <li key={asset.id}>
          <Link
            href={`/assets/${asset.id}`}
            className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
          >
            <span className="font-medium">{asset.name}</span>
            <span className="text-sm text-slate-600">
              {formatShares(asset.total_remaining_shares)} acciones ·{" "}
              {formatMoney(asset.total_remaining_cost_basis)} invertido
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
