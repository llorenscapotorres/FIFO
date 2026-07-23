"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { Asset } from "@/lib/types";
import { formatMoney } from "@/lib/format";

const CATEGORY_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7"];
const OTHER_COLOR = "#898781";
const MAX_SLICES = 7;

type Slice = { name: string; value: number };

function buildSlices(assets: Asset[]): Slice[] {
  const withValue = assets
    .map((asset) => ({ name: asset.name, value: Number(asset.total_remaining_cost_basis) }))
    .filter((slice) => slice.value > 0)
    .sort((a, b) => b.value - a.value);

  if (withValue.length <= MAX_SLICES) {
    return withValue;
  }

  const top = withValue.slice(0, MAX_SLICES);
  const restTotal = withValue.slice(MAX_SLICES).reduce((sum, slice) => sum + slice.value, 0);
  return [...top, { name: "Otros", value: restTotal }];
}

type TooltipPayloadItem = { name?: string; value?: number };

function CustomTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  total: number;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const slice = payload[0];
  const pct = total > 0 && slice.value !== undefined ? ((slice.value / total) * 100).toFixed(1) : "0";
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
      <p className="font-medium text-slate-900">{slice.name}</p>
      <p className="text-slate-600">
        {formatMoney(slice.value ?? 0)} · {pct}%
      </p>
    </div>
  );
}

export default function PortfolioPieChart({ assets }: { assets: Asset[] }) {
  const slices = buildSlices(assets);
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  if (slices.length === 0) {
    return null;
  }

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">Composición de la cartera</h2>
      <p className="mt-1 text-xs text-slate-500">Por coste de compra de las acciones que aún mantienes.</p>
      <div className="mt-3 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              innerRadius="45%"
              outerRadius="80%"
              paddingAngle={2}
              stroke="#fcfcfb"
              strokeWidth={2}
            >
              {slices.map((slice, index) => (
                <Cell
                  key={slice.name}
                  fill={slice.name === "Otros" ? OTHER_COLOR : CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip total={total} />} />
            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
