import type {
  Asset,
  AssetSummary,
  ApiError,
  LotInput,
  LotWithRemaining,
  Sale,
  SaleInput,
  SalePreview,
  SaleWithBreakdown,
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export class ApiRequestError extends Error {
  detail: string;
  availableShares?: string;
  requestedShares?: string;
  blockingSaleIds?: number[];

  constructor(payload: ApiError) {
    super(payload.detail);
    this.detail = payload.detail;
    this.availableShares = payload.available_shares;
    this.requestedShares = payload.requested_shares;
    this.blockingSaleIds = payload.blocking_sale_ids;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
  });

  if (!res.ok) {
    let payload: ApiError;
    try {
      payload = await res.json();
    } catch {
      payload = { detail: `Error ${res.status}` };
    }
    throw new ApiRequestError(payload);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

// Assets
export const getAssets = () => request<Asset[]>("/api/assets");
export const getAsset = (id: number) => request<Asset>(`/api/assets/${id}`);
export const createAsset = (name: string) =>
  request<Asset>("/api/assets", { method: "POST", body: JSON.stringify({ name }) });
export const updateAsset = (id: number, name: string) =>
  request<Asset>(`/api/assets/${id}`, { method: "PUT", body: JSON.stringify({ name }) });
export const deleteAsset = (id: number) => request<void>(`/api/assets/${id}`, { method: "DELETE" });
export const getAssetSummary = (id: number) => request<AssetSummary>(`/api/assets/${id}/summary`);

// Purchase lots
export const getLots = (assetId: number) =>
  request<LotWithRemaining[]>(`/api/assets/${assetId}/lots`);
export const createLot = (assetId: number, payload: LotInput) =>
  request<LotWithRemaining>(`/api/assets/${assetId}/lots`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
export const updateLot = (assetId: number, lotId: number, payload: LotInput) =>
  request<LotWithRemaining>(`/api/assets/${assetId}/lots/${lotId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
export const deleteLot = (assetId: number, lotId: number) =>
  request<void>(`/api/assets/${assetId}/lots/${lotId}`, { method: "DELETE" });

// Sales
export const previewSale = (assetId: number, payload: SaleInput) =>
  request<SalePreview>(`/api/assets/${assetId}/sales/preview`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
export const createSale = (assetId: number, payload: SaleInput) =>
  request<SaleWithBreakdown>(`/api/assets/${assetId}/sales`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
export const getSales = (assetId: number) => request<Sale[]>(`/api/assets/${assetId}/sales`);
export const getSale = (assetId: number, saleId: number) =>
  request<SaleWithBreakdown>(`/api/assets/${assetId}/sales/${saleId}`);
export const updateSale = (assetId: number, saleId: number, payload: SaleInput) =>
  request<SaleWithBreakdown>(`/api/assets/${assetId}/sales/${saleId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
export const deleteSale = (assetId: number, saleId: number) =>
  request<void>(`/api/assets/${assetId}/sales/${saleId}`, { method: "DELETE" });
