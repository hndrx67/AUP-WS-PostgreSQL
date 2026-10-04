"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";
import type { ToastKind } from "@/lib/toast";

type Toast = { id: number; message: string; kind: ToastKind };

export function ToastHost() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<{ message: string; kind: ToastKind }>).detail;
      if (!detail?.message) return;
      const id = Date.now() + Math.random();
      setToasts((current) => [...current, { id, ...detail }]);
      window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 2000);
    };
    window.addEventListener("aup:toast", onToast);
    return () => window.removeEventListener("aup:toast", onToast);
  }, []);

  return (
    <div className="toast-host" role="region" aria-label="Notifications">
      {toasts.map((toast) => {
        const Icon = toast.kind === "error" ? CircleAlert : toast.kind === "info" ? Info : CheckCircle2;
        return (
          <div
            key={toast.id}
            className={`toast-card toast-${toast.kind}`}
            role={toast.kind === "error" ? "alert" : "status"}
          >
            <Icon size={18} aria-hidden="true" />
            <span className="min-w-0 flex-1">{toast.message}</span>
            <button
              type="button"
              className="toast-close"
              aria-label="Dismiss notification"
              onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
