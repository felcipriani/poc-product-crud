import Link from "next/link";
import { Package, Layers, Palette, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="container mx-auto py-16">
      <div className="text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            Product Management System
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Manage complex products with variations and compositions. 
            Create simple products, products with variations, and composite products made from other products.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="p-6 border rounded-lg space-y-4">
            <Package className="h-12 w-12 text-primary mx-auto" />
            <h3 className="text-lg font-semibold">Products</h3>
            <p className="text-sm text-muted-foreground">
              Create and manage your product catalog with support for simple, variable, and composite products.
            </p>
          </div>

          <div className="p-6 border rounded-lg space-y-4">
            <Palette className="h-12 w-12 text-primary mx-auto" />
            <h3 className="text-lg font-semibold">Variation Types</h3>
            <p className="text-sm text-muted-foreground">
              Define types of variations like color, size, material that can modify weight and dimensions.
            </p>
          </div>

          <div className="p-6 border rounded-lg space-y-4">
            <Layers className="h-12 w-12 text-primary mx-auto" />
            <h3 className="text-lg font-semibold">Variations</h3>
            <p className="text-sm text-muted-foreground">
              Create specific variations within each type to offer different product options.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Button asChild size="lg">
            <Link href="/products" className="flex items-center gap-2">
              Get Started with Products
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          
          <p className="text-sm text-muted-foreground">
            All data is stored locally in your browser - no backend required
          </p>
        </div>
      </div>
    </div>
  );
}