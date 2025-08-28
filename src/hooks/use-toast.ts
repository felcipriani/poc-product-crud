"use client";

import { useEffect, useState, useCallback } from "react";
import { ToastType } from "@/components/shared/notifications/toast-notification";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Simple in-memory store so toasts can be triggered outside React components
let toastStore: Toast[] = [];
const listeners = new Set<(toasts: Toast[]) => void>();

function notify() {
  for (const listener of listeners) {
    listener([...toastStore]);
  }
}

function add(toast: Omit<Toast, "id">): string {
  const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  toastStore = [...toastStore, { ...toast, id }];
  notify();
  return id;
}

function remove(id: string) {
  toastStore = toastStore.filter((t) => t.id !== id);
  notify();
}

function clear() {
  toastStore = [];
  notify();
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>(toastStore);

  useEffect(() => {
    listeners.add(setToasts);
    return () => {
      listeners.delete(setToasts);
    };
  }, []);

  const success = useCallback(
    (title: string, message?: string, options?: Partial<Toast>) =>
      add({ type: "success", title, message, ...options }),
    []
  );

  const error = useCallback(
    (title: string, message?: string, options?: Partial<Toast>) =>
      add({ type: "error", title, message, duration: 0, ...options }),
    []
  );

  const warning = useCallback(
    (title: string, message?: string, options?: Partial<Toast>) =>
      add({ type: "warning", title, message, ...options }),
    []
  );

  const info = useCallback(
    (title: string, message?: string, options?: Partial<Toast>) =>
      add({ type: "info", title, message, ...options }),
    []
  );

  return {
    toasts,
    addToast: add,
    removeToast: remove,
    clearAllToasts: clear,
    success,
    error,
    warning,
    info,
    toast: add,
  };
}

// Callable toast function with convenience helpers
function toastFn(toast: Omit<Toast, "id">) {
  return add(toast);
}

toastFn.success = (title: string, message?: string, options?: Partial<Toast>) =>
  add({ type: "success", title, message, ...options });
toastFn.error = (title: string, message?: string, options?: Partial<Toast>) =>
  add({ type: "error", title, message, duration: 0, ...options });
toastFn.warning = (title: string, message?: string, options?: Partial<Toast>) =>
  add({ type: "warning", title, message, ...options });
toastFn.info = (title: string, message?: string, options?: Partial<Toast>) =>
  add({ type: "info", title, message, ...options });
toastFn.remove = remove;
toastFn.clear = clear;

export const toast = toastFn as typeof toastFn & {
  success: typeof toastFn.success;
  error: typeof toastFn.error;
  warning: typeof toastFn.warning;
  info: typeof toastFn.info;
  remove: typeof toastFn.remove;
  clear: typeof toastFn.clear;
};
