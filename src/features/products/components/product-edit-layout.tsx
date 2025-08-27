"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { 
  ArrowLeft, 
  ChevronRight, 
  Circle, 
  Settings, 
  Package, 
  Layers,
  Save
} from "lucide-react";
import { Product } from "@/lib/domain/entities/product";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UnsavedChangesDialog } from "@/components/shared/dialogs/unsaved-changes-dialog";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { cn } from "@/lib/utils/cn";

export interface ProductEditLayoutProps {
  product: Product;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onBack: () => void;
  onSave: () => Promise<void>;
  hasUnsavedChanges: boolean;
  saving?: boolean;
  children: React.ReactNode;
}

interface TabConfig {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  available: boolean;
}

export function ProductEditLayout({
  product,
  activeTab,
  onTabChange,
  onBack,
  onSave,
  hasUnsavedChanges,
  saving = false,
  children
}: ProductEditLayoutProps) {
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  const { checkUnsavedChanges } = useUnsavedChanges({
    hasUnsavedChanges,
    message: "You have unsaved changes. Are you sure you want to leave this page?"
  });

  // Available tabs based on product configuration
  const availableTabs = useMemo((): TabConfig[] => {
    const tabs: TabConfig[] = [
      { 
        id: 'details', 
        label: 'Details', 
        icon: Settings, 
        available: true 
      },
    ];

    if (product.hasVariation) {
      tabs.push({
        id: 'variations',
        label: 'Variations',
        icon: Layers,
        available: true
      });
    }

    if (product.isComposite) {
      tabs.push({
        id: 'composition',
        label: product.hasVariation ? 'Variation Compositions' : 'Composition',
        icon: Package,
        available: true
      });
    }

    return tabs;
  }, [product.isComposite, product.hasVariation]);

  // Handle navigation with unsaved changes check
  const handleNavigation = (navigationFn: () => void) => {
    if (hasUnsavedChanges) {
      setPendingNavigation(() => navigationFn);
      setShowUnsavedWarning(true);
    } else {
      navigationFn();
    }
  };

  // Handle tab change with unsaved changes check
  const handleTabChange = (newTab: string) => {
    if (newTab === activeTab) return;
    
    handleNavigation(() => onTabChange(newTab));
  };

  // Handle back navigation with unsaved changes check
  const handleBack = () => {
    handleNavigation(onBack);
  };

  // Handle save and continue navigation
  const handleSaveAndContinue = async () => {
    try {
      await onSave();
      setShowUnsavedWarning(false);
      pendingNavigation?.();
      setPendingNavigation(null);
    } catch (error) {
      // Error is handled by parent component
      console.error('Save failed:', error);
    }
  };

  // Handle discard changes and continue
  const handleDiscardAndContinue = () => {
    setShowUnsavedWarning(false);
    pendingNavigation?.();
    setPendingNavigation(null);
  };

  // Handle cancel navigation
  const handleCancelNavigation = () => {
    setShowUnsavedWarning(false);
    setPendingNavigation(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with breadcrumb and actions */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Breadcrumb and back button */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Products
              </Button>
              
              <div className="text-sm text-muted-foreground flex items-center">
                <span>Products</span>
                <ChevronRight className="h-4 w-4 mx-1" />
                <span className="font-medium text-foreground">
                  {product.name} ({product.sku})
                </span>
              </div>
            </div>

            {/* Save indicator and actions */}
            <div className="flex items-center gap-3">
              {hasUnsavedChanges && (
                <div className="flex items-center gap-2 text-sm text-amber-600">
                  <Circle className="h-2 w-2 fill-current" />
                  Unsaved changes
                </div>
              )}
              
              <Button
                onClick={onSave}
                disabled={!hasUnsavedChanges || saving}
                className="min-w-[80px] flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="h-12 bg-transparent border-0 p-0">
              {availableTabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className={cn(
                    "h-12 px-4 rounded-none border-b-2 border-transparent",
                    "data-[state=active]:border-primary data-[state=active]:bg-transparent",
                    "hover:bg-gray-50 transition-colors"
                  )}
                >
                  <tab.icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>

      {/* Unsaved changes warning dialog */}
      <UnsavedChangesDialog
        open={showUnsavedWarning}
        onSave={handleSaveAndContinue}
        onDiscard={handleDiscardAndContinue}
        onCancel={handleCancelNavigation}
        saving={saving}
      />
    </div>
  );
}
