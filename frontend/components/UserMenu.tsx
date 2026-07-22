"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function UserMenu() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  if (loading || !user) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div className="flex items-center gap-3 text-sm text-slate-600">
      <span>{user.email}</span>
      <button
        onClick={handleLogout}
        className="rounded border border-slate-300 px-3 py-1 text-slate-700 hover:bg-slate-100"
      >
        Cerrar sesión
      </button>
    </div>
  );
}
