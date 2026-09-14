"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type ToastKind = "success" | "error";
type Toast = { id: number; kind: ToastKind; message: string };

const ToastContext = createContext<((message: string, kind?: ToastKind) => void) | null>(null);

/** `const toast = useToast(); toast("Saved."); toast("Couldn't save.", "error");` */
export function useToast() {
  const show = useContext(ToastContext);
  if (!show) throw new Error("useToast must be used within <ToastProvider>");
  return show;
}

const DURATION_MS = 3500;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const show = useCallback((message: string, kind: ToastKind = "success") => {
    const id = ++nextId.current;
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), DURATION_MS);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`toast-in pointer-events-auto max-w-sm border px-4 py-2.5 text-sm shadow-lg backdrop-blur ${
              t.kind === "error"
                ? "border-ember/50 bg-ember/10 text-ember"
                : "border-teal/50 bg-panel/95 text-slate-100"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
