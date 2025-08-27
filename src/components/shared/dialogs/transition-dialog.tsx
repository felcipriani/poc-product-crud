"use client";

import * as React from "react";
import { useState } from "react";
import { 
  AlertTriangle, 
  Package, 
  Layers, 
  Loader2, 
  CheckCircle,
  XCircle
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";
import { TransitionDialogProps, TransitionResult } from "@/lib/types/transition-types";
import { getTransitionConfig } from "@/lib/config/transition-config";

const iconMap = {
  AlertTriangle,
  Package,
  Layers,
  CheckCircle,
  XCircle
};

export function TransitionDialog({
  open,
  type,
  context,
  onConfirm,
  onCancel,
  loading = false
}: TransitionDialogProps) {
  const [confirmationText, setConfirmationText] = useState('');
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [result, setResult] = useState<TransitionResult | null>(null);
  
  const config = getTransitionConfig(type, context.existingDataCount);
  const IconComponent = iconMap[config.icon as keyof typeof iconMap] || AlertTriangle;
  
  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setConfirmationText('');
      setHasConfirmed(false);
      setResult(null);
    }
  }, [open]);

  const handleConfirm = async () => {
    if (config.requiresConfirmation && !hasConfirmed) {
      return;
    }
    
    try {
      const transitionResult = await onConfirm();
      setResult(transitionResult);
      
      // Auto-close on success after 2 seconds
      if (transitionResult.success) {
        setTimeout(() => {
          onCancel();
        }, 2000);
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'An unexpected error occurred',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const handleCancel = () => {
    if (!loading) {
      onCancel();
    }
  };

  // Show result screen if operation completed
  if (result) {
    return (
      <Dialog open={open} onOpenChange={handleCancel}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              {result.success ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <XCircle className="h-6 w-6 text-red-600" />
              )}
              <DialogTitle>
                {result.success ? 'Operation Successful' : 'Operation Failed'}
              </DialogTitle>
            </div>
            <DialogDescription className="text-left">
              {result.message}
            </DialogDescription>
          </DialogHeader>

          {result.error && (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-800 border border-red-200">
              <div className="font-medium mb-1">Error Details:</div>
              <div>{result.error}</div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={handleCancel} className="w-full">
              {result.success ? 'Continue' : 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <IconComponent className={cn(
              "h-6 w-6",
              config.destructive ? "text-red-600" : "text-blue-600"
            )} />
            <DialogTitle>{config.title}</DialogTitle>
          </div>
          <DialogDescription className="text-left">
            {config.description}
          </DialogDescription>
        </DialogHeader>

        {/* Product context information */}
        <div className="rounded-md bg-gray-50 p-4 text-sm">
          <div className="font-medium text-gray-900 mb-2">Product Information:</div>
          <div className="space-y-1 text-gray-700">
            <div><strong>Name:</strong> {context.productName}</div>
            <div><strong>SKU:</strong> {context.productSku}</div>
            {context.existingDataCount > 0 && (
              <div>
                <strong>Existing Data:</strong> {context.existingDataCount} composition item(s)
              </div>
            )}
          </div>
        </div>

        {/* Warning message */}
        {config.warning && (
          <div className={cn(
            "rounded-md p-4 text-sm border",
            config.warningType === 'error' && "bg-red-50 text-red-800 border-red-200",
            config.warningType === 'warning' && "bg-yellow-50 text-yellow-800 border-yellow-200",
            config.warningType === 'info' && "bg-blue-50 text-blue-800 border-blue-200"
          )}>
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium mb-1">
                  {config.destructive ? 'Data Loss Warning' : 'Important Notice'}
                </div>
                <div>{config.warning}</div>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation input for destructive actions */}
        {config.requiresConfirmation && (
          <div className="space-y-3">
            <Label htmlFor="confirmation">
              Type &ldquo;<strong>{context.productName}</strong>&rdquo; to confirm:
            </Label>
            <Input
              id="confirmation"
              value={confirmationText}
              onChange={(e) => {
                setConfirmationText(e.target.value);
                setHasConfirmed(e.target.value === context.productName);
              }}
              placeholder={context.productName}
              className={cn(
                hasConfirmed && "border-green-500 focus:border-green-500"
              )}
              disabled={loading}
            />
            {hasConfirmed && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                Confirmation verified
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
          >
            {config.cancelText}
          </Button>
          <Button
            variant={config.destructive ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={loading || (config.requiresConfirmation && !hasConfirmed)}
            className="min-w-[140px]"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </div>
            ) : (
              config.confirmText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
