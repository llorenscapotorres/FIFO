"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { LotWithRemaining } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/format";

const LINE_COLOR = "#2a78d6";

type PriceChartRow = Omit<LotWithRemaining, "price_per_share"> & { price_per_share: number };

type TooltipPayloadItem = { payload?: PriceChartRow };

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const lot = payload[0].payload;
  if (!lot) return null;
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
      <p className="font-medium text-slate-900">{formatDate(lot.purchase_date)}</p>
      <p className="text-slate-600">{formatMoney(lot.price_per_share)} / acción</p>
    </div>
  );
}

export default function AssetPriceChart({ lots }: { lots: LotWithRemaining[] }) {
  if (lots.length === 0) {
    return null;
  }

  const data: PriceChartRow[] = [...lots]
    .sort((a, b) => new Date(a.purchase_date).getTime() - new Date(b.purchase_date).getTime())
    .map((lot) => ({ ...lot, price_per_share: Number(lot.price_per_share) }));

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">Precio de compra por fecha</h2>
      <p className="mt-1 text-xs text-slate-500">
        Cada punto es una compra registrada, unidas con líneas rectas.
      </p>
      <div className="mt-3 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" vertical={false} />
            <XAxis
              dataKey="purchase_date"
              tickFormatter={(value) => formatDate(value)}
              tick={{ fontSize: 12, fill: "#898781" }}
              axisLine={{ stroke: "#c3c2b7" }}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#898781" }}
              axisLine={false}
              tickLine={false}
              width={70}
              tickFormatter={(value) => formatMoney(value)}
              domain={["auto", "auto"]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="linear"
              dataKey="price_per_share"
              stroke={LINE_COLOR}
              strokeWidth={2}
              dot={{ r: 4, fill: LINE_COLOR, strokeWidth: 0 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
