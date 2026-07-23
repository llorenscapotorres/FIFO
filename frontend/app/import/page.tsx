"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { confirmExcelImport, getAssets, previewExcelImport, ApiRequestError } from "@/lib/api";
import type { Asset, ImportConfirmRow, ImportRowPreview, ImportRowType } from "@/lib/types";

type EditableRow = {
  key: string;
  rowNumber: number;
  rowType: ImportRowType;
  assetChoice: "existing" | "new";
  assetId: number | null;
  newAssetName: string;
  date: string;
  price: string;
  quantity: string;
  amount: string;
  warnings: string[];
};

function toEditableRow(row: ImportRowPreview): EditableRow {
  return {
    key: String(row.row_number),
    rowNumber: row.row_number,
    rowType: row.row_type,
    assetChoice: row.matched_asset_id ? "existing" : "new",
    assetId: row.matched_asset_id,
    newAssetName: row.is_new_asset ? row.raw_asset_name : "",
    date: row.date ?? "",
    price: row.price ?? "",
    quantity: row.quantity ?? "",
    amount: row.amount ?? "",
    warnings: row.warnings,
  };
}

function isRowValid(row: EditableRow): boolean {
  if (row.rowType !== "purchase" && row.rowType !== "sale") return false;
  if (row.assetChoice === "existing" && !row.assetId) return false;
  if (row.assetChoice === "new" && !row.newAssetName.trim()) return false;
  if (!row.date) return false;
  if (!(Number(row.price) > 0)) return false;
  if (!(Number(row.quantity) > 0)) return false;
  if (!(Number(row.amount) > 0)) return false;
  return true;
}

export default function ImportExcelPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    getAssets().then(setAssets);
  }, []);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    setError(null);
    setResult(null);
    setRows([]);
    try {
      const preview = await previewExcelImport(file);
      setRows(preview.map(toEditableRow));
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.detail : "No se pudo leer el archivo.");
    } finally {
      setParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function updateRow(key: string, changes: Partial<EditableRow>) {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...changes } : row)));
  }

  const allValid = rows.length > 0 && rows.every(isRowValid);

  async function handleConfirm() {
    setConfirming(true);
    setError(null);
    try {
      const payload: ImportConfirmRow[] = rows.map((row) => ({
        row_type: row.rowType as "purchase" | "sale",
        asset_id: row.assetChoice === "existing" ? row.assetId : null,
        new_asset_name: row.assetChoice === "new" ? row.newAssetName.trim() : null,
        date: row.date,
        price: row.price,
        quantity: row.quantity,
        amount: row.amount,
      }));
      const outcome = await confirmExcelImport(payload);
      setResult(
        `Importado: ${outcome.created_assets} activo(s) nuevo(s), ${outcome.created_lots} compra(s), ${outcome.created_sales} venta(s).`
      );
      setRows([]);
      router.push("/");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.detail : "No se pudo confirmar la importación.");
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-xs text-slate-500 underline">
          &larr; volver a activos
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Importar transacciones desde Excel</h1>
        <p className="mt-1 text-sm text-slate-600">
          Sube un Excel con tus compras y/o ventas. Detectamos las columnas automáticamente aunque los
          nombres varíen (fecha, activo, precio, cantidad, importe, tipo). Revisa y corrige antes de
          confirmar — nada se guarda hasta que pulses &quot;Confirmar importación&quot;.
        </p>
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-4">
        <label className="text-sm font-medium text-slate-700">
          Archivo Excel (.xlsx)
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            onChange={handleFileChange}
            className="mt-2 block w-full text-sm"
          />
        </label>
        {parsing && <p className="mt-2 text-sm text-slate-500">Analizando archivo...</p>}
        {error && <p className="mt-2 text-sm text-loss">{error}</p>}
        {result && <p className="mt-2 text-sm text-gain">{result}</p>}
      </div>

      {rows.length > 0 && (
        <div className="rounded-md border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              {rows.length} fila(s) detectada(s)
            </h2>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!allValid || confirming}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {confirming ? "Confirmando..." : "Confirmar importación"}
            </button>
          </div>
          {!allValid && (
            <p className="mt-2 text-xs text-loss">
              Hay filas marcadas en ámbar que necesitan revisión antes de poder confirmar.
            </p>
          )}

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="py-2 pr-2">Fila</th>
                  <th className="py-2 pr-2">Tipo</th>
                  <th className="py-2 pr-2">Activo</th>
                  <th className="py-2 pr-2">Fecha</th>
                  <th className="py-2 pr-2">Precio/acción</th>
                  <th className="py-2 pr-2">Acciones</th>
                  <th className="py-2 pr-2">Importe</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const valid = isRowValid(row);
                  return (
                    <tr
                      key={row.key}
                      className={`border-b border-slate-100 align-top ${valid ? "" : "bg-amber-50"}`}
                    >
                      <td className="py-2 pr-2 text-xs text-slate-500">{row.rowNumber}</td>
                      <td className="py-2 pr-2">
                        <select
                          value={row.rowType}
                          onChange={(e) => updateRow(row.key, { rowType: e.target.value as ImportRowType })}
                          className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                        >
                          <option value="unknown" disabled>
                            elige...
                          </option>
                          <option value="purchase">Compra</option>
                          <option value="sale">Venta</option>
                        </select>
                      </td>
                      <td className="py-2 pr-2">
                        <div className="flex flex-col gap-1">
                          <select
                            value={row.assetChoice === "existing" ? String(row.assetId ?? "") : "new"}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === "new") {
                                updateRow(row.key, { assetChoice: "new", assetId: null });
                              } else {
                                updateRow(row.key, { assetChoice: "existing", assetId: Number(value) });
                              }
                            }}
                            className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                          >
                            <option value="new">+ Crear nuevo activo</option>
                            {assets.map((asset) => (
                              <option key={asset.id} value={asset.id}>
                                {asset.name}
                              </option>
                            ))}
                          </select>
                          {row.assetChoice === "new" && (
                            <input
                              type="text"
                              value={row.newAssetName}
                              onChange={(e) => updateRow(row.key, { newAssetName: e.target.value })}
                              placeholder="Nombre del nuevo activo"
                              className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                            />
                          )}
                        </div>
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="date"
                          value={row.date}
                          onChange={(e) => updateRow(row.key, { date: e.target.value })}
                          className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          step="0.000001"
                          value={row.price}
                          onChange={(e) => updateRow(row.key, { price: e.target.value })}
                          className="w-28 rounded-md border border-slate-300 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          step="0.000001"
                          value={row.quantity}
                          onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                          className="w-28 rounded-md border border-slate-300 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <input
                          type="number"
                          step="0.01"
                          value={row.amount}
                          onChange={(e) => updateRow(row.key, { amount: e.target.value })}
                          className="w-28 rounded-md border border-slate-300 px-2 py-1 text-sm"
                        />
                        {row.warnings.length > 0 && (
                          <p className="mt-1 text-xs text-loss">{row.warnings.join(" ")}</p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
