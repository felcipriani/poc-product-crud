"use client";

import * as React from "react";
import { AlertTriangle, Save, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface UnsavedChangesDialogProps {
  open: boolean;
  onSave: () => Promise<void>;
  onDiscard: () => void;
  onCancel: () => void;
  saving?: boolean;
}

export function UnsavedChangesDialog({
  open,
  onSave,
  onDiscard,
  onCancel,
  saving = false
}: UnsavedChangesDialogProps) {
  const handleSave = async () => {
    try {
      await onSave();
    } catch (error) {
      // Error handling is done in parent component
      console.error('Save failed:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
            <DialogTitle>Unsaved Changes</DialogTitle>
          </div>
          <DialogDescription className="text-left">
            You have unsaved changes that will be lost if you continue. 
            What would you like to do?
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md bg-amber-50 p-4 text-sm text-amber-800 border border-amber-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium mb-1">Changes will be lost</div>
              <div>
                Any modifications you&apos;ve made to this product will be permanently lost 
                if you navigate away without saving.
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </Button>
          
          <Button
            variant="destructive"
            onClick={onDiscard}
            disabled={saving}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Discard Changes
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save & Continue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
