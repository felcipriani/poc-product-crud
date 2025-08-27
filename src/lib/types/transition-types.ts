/**
 * Types for product transition system
 * Handles transitions between different product states (composite, variations, etc.)
 */

export type TransitionType = 
  | 'enable-variations' 
  | 'disable-composite' 
  | 'disable-variations'
  | 'enable-composite';

export interface TransitionContext {
  productSku: string;
  productName: string;
  existingDataCount: number;
  currentFlags: {
    isComposite: boolean;
    hasVariation: boolean;
  };
  targetFlags: {
    isComposite: boolean;
    hasVariation: boolean;
  };
}

export interface TransitionResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export interface TransitionConfig {
  title: string;
  description: string;
  warning?: string;
  confirmText: string;
  cancelText: string;
  destructive: boolean;
  requiresConfirmation: boolean;
  icon: string; // Icon name for lucide-react
  warningType: 'info' | 'warning' | 'error';
}

export interface TransitionDialogProps {
  open: boolean;
  type: TransitionType;
  context: TransitionContext;
  onConfirm: () => Promise<TransitionResult>;
  onCancel: () => void;
  loading?: boolean;
}
