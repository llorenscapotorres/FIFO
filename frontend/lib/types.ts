export type Asset = {
  id: number;
  name: string;
  created_at: string;
  total_remaining_shares: string;
  total_remaining_cost_basis: string;
};

export type LotWithRemaining = {
  id: number;
  asset_id: number;
  purchase_date: string;
  amount_invested: string;
  price_per_share: string;
  shares_bought: string;
  created_at: string;
  remaining_shares: string;
  remaining_cost_basis: string;
};

export type LotInput = {
  purchase_date: string;
  amount_invested: string;
  price_per_share: string;
  shares_bought: string;
};

export type LotSummary = {
  lot_id: number;
  purchase_date: string;
  price_per_share: string;
  shares_bought: string;
  remaining_shares: string;
  remaining_cost_basis: string;
};

export type AssetSummary = {
  total_shares_bought_all_time: string;
  total_remaining_shares: string;
  total_remaining_cost_basis: string;
  average_cost_per_remaining_share: string;
  per_lot: LotSummary[];
};

export type ConsumptionRow = {
  purchase_lot_id: number;
  purchase_date: string;
  lot_price_per_share: string;
  shares_consumed: string;
  cost_basis: string;
};

export type SalePreview = {
  shares_to_sell: string;
  total_cost_basis: string;
  gain_loss: string;
  breakdown: ConsumptionRow[];
};

export type SaleInput = {
  sale_date: string;
  sell_amount: string;
  sell_price: string;
};

export type Sale = {
  id: number;
  asset_id: number;
  sale_date: string;
  sell_amount: string;
  sell_price: string;
  shares_sold: string;
  total_cost_basis: string;
  gain_loss: string;
  created_at: string;
};

export type SaleWithBreakdown = Sale & {
  breakdown: ConsumptionRow[];
};

export type ApiError = {
  detail: string;
  available_shares?: string;
  requested_shares?: string;
  blocking_sale_ids?: number[];
};

export type User = {
  id: number;
  email: string;
  created_at: string;
};

export type YearlyPnL = {
  year: number;
  gain_loss: string;
  sale_count: number;
};

export type ImportRowType = "purchase" | "sale" | "unknown";

export type ImportRowPreview = {
  row_number: number;
  row_type: ImportRowType;
  raw_asset_name: string;
  matched_asset_id: number | null;
  is_new_asset: boolean;
  date: string | null;
  price: string | null;
  quantity: string | null;
  amount: string | null;
  warnings: string[];
};

export type ImportConfirmRow = {
  row_type: "purchase" | "sale";
  asset_id?: number | null;
  new_asset_name?: string | null;
  date: string;
  price: string;
  quantity: string;
  amount: string;
};

export type ImportConfirmResult = {
  created_assets: number;
  created_lots: number;
  created_sales: number;
};
