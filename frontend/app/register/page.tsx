"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerUser, ApiRequestError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const SPECIAL_CHAR_REGEX = /[^A-Za-z0-9]/;

function passwordError(password: string): string | null {
  if (password.length < 8) {
    return "La contraseña debe tener al menos 8 caracteres.";
  }
  if (!SPECIAL_CHAR_REGEX.test(password)) {
    return "La contraseña debe incluir al menos un carácter especial (no solo letras o solo números).";
  }
  return null;
}

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { refresh } = useAuth();

  const clientPasswordError = password ? passwordError(password) : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = passwordError(password);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await registerUser(email.trim(), password);
      await refresh();
      router.push("/");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.detail : "No se pudo crear la cuenta.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-semibold">Crear cuenta</h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Contraseña</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-slate-500">
            Mínimo 8 caracteres y al menos un carácter especial (no puede ser solo letras o solo números).
          </p>
          {clientPasswordError && <p className="mt-1 text-xs text-loss">{clientPasswordError}</p>}
        </div>

        {error && <p className="text-sm text-loss">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !email.trim() || !password || !!clientPasswordError}
          className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Crear cuenta
        </button>
      </form>

      <p className="mt-4 text-sm text-slate-600">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-slate-900 underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
