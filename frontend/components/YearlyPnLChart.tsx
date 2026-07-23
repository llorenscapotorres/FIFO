"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { YearlyPnL } from "@/lib/types";
import { formatMoney } from "@/lib/format";

const GAIN_COLOR = "#16a34a";
const LOSS_COLOR = "#dc2626";

type ChartRow = YearlyPnL & { value: number };

type TooltipPayloadItem = { payload?: ChartRow };

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;
  if (!row) return null;
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
      <p className="font-medium text-slate-900">{row.year}</p>
      <p className={row.value >= 0 ? "text-gain" : "text-loss"}>{formatMoney(row.gain_loss)}</p>
      <p className="text-xs text-slate-500">
        {row.sale_count} {row.sale_count === 1 ? "venta" : "ventas"}
      </p>
    </div>
  );
}

export default function YearlyPnLChart({ years }: { years: YearlyPnL[] }) {
  if (years.length === 0) {
    return null;
  }

  const data: ChartRow[] = [...years]
    .sort((a, b) => a.year - b.year)
    .map((row) => ({ ...row, value: Number(row.gain_loss) }));

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">Beneficio/pérdida por año</h2>
      <p className="mt-1 text-xs text-slate-500">
        <span className="text-gain">Verde</span> = ganancia, <span className="text-loss">rojo</span> = pérdida.
      </p>
      <div className="mt-3 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" vertical={false} />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 12, fill: "#898781" }}
              axisLine={{ stroke: "#c3c2b7" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#898781" }}
              axisLine={false}
              tickLine={false}
              width={70}
              tickFormatter={(value) => formatMoney(value)}
            />
            <ReferenceLine y={0} stroke="#c3c2b7" />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
            <Bar dataKey="value" radius={[4, 4, 4, 4]} maxBarSize={48}>
              {data.map((row) => (
                <Cell key={row.year} fill={row.value >= 0 ? GAIN_COLOR : LOSS_COLOR} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
