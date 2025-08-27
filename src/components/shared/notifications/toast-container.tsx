"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { ToastNotification } from "./toast-notification";
import { useToast } from "@/hooks/use-toast";

export function ToastContainer() {
  const { toasts, removeToast } = useToast();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed top-0 right-0 z-50 p-4 space-y-4 pointer-events-none"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <ToastNotification
          key={toast.id}
          {...toast}
          onClose={removeToast}
        />
      ))}
    </div>,
    document.body
  );
}
