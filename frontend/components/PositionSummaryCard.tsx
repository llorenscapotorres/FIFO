import type { AssetSummary } from "@/lib/types";
import { formatMoney, formatShares } from "@/lib/format";

export default function PositionSummaryCard({ summary }: { summary: AssetSummary }) {
  const cards = [
    { label: "Acciones restantes", value: formatShares(summary.total_remaining_shares) },
    { label: "Coste restante", value: formatMoney(summary.total_remaining_cost_basis) },
    {
      label: "Precio medio de coste",
      value:
        Number(summary.total_remaining_shares) > 0
          ? formatMoney(summary.average_cost_per_remaining_share)
          : "—",
    },
    { label: "Acciones compradas (histórico)", value: formatShares(summary.total_shares_bought_all_time) },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-md border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">{card.label}</p>
          <p className="mt-1 text-lg font-semibold">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
