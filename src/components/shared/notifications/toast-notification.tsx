"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const iconMap = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const colorMap = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};

const iconColorMap = {
  success: 'text-green-600',
  error: 'text-red-600',
  warning: 'text-yellow-600',
  info: 'text-blue-600',
};

export function ToastNotification({
  id,
  type,
  title,
  message,
  duration = 5000,
  onClose,
  action
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  const IconComponent = iconMap[type];

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose(id);
    }, 300); // Animation duration
  }, [id, onClose]);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, handleClose]);

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "max-w-sm w-full shadow-lg rounded-lg pointer-events-auto border transition-all duration-300 ease-in-out",
        colorMap[type],
        isExiting ? "opacity-0 transform translate-x-full" : "opacity-100 transform translate-x-0"
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <IconComponent className={cn("h-5 w-5", iconColorMap[type])} />
          </div>
          
          <div className="ml-3 w-0 flex-1">
            <p className="text-sm font-medium">{title}</p>
            {message && (
              <p className="mt-1 text-sm opacity-90">{message}</p>
            )}
            
            {action && (
              <div className="mt-3">
                <button
                  onClick={action.onClick}
                  className={cn(
                    "text-sm font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 rounded",
                    type === 'success' && "focus:ring-green-500",
                    type === 'error' && "focus:ring-red-500",
                    type === 'warning' && "focus:ring-yellow-500",
                    type === 'info' && "focus:ring-blue-500"
                  )}
                >
                  {action.label}
                </button>
              </div>
            )}
          </div>
          
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={handleClose}
              className={cn(
                "rounded-md inline-flex focus:outline-none focus:ring-2 focus:ring-offset-2",
                type === 'success' && "text-green-400 hover:text-green-500 focus:ring-green-500",
                type === 'error' && "text-red-400 hover:text-red-500 focus:ring-red-500",
                type === 'warning' && "text-yellow-400 hover:text-yellow-500 focus:ring-yellow-500",
                type === 'info' && "text-blue-400 hover:text-blue-500 focus:ring-blue-500"
              )}
            >
              <span className="sr-only">Close</span>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
