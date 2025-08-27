import Link from "next/link";
import { Package, Layers, Palette, Home } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const navigation: Array<{ name: string; href: string; icon: any }> = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Products", href: "/products", icon: Package },
  { name: "Variation Types", href: "/variation-types", icon: Palette },
  { name: "Variations", href: "/variations", icon: Layers },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background w-9/12">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-2">
                <Package className="h-6 w-6" />
                <span className="font-bold text-xl">Product Manager</span>
              </Link>

              <div className="hidden md:flex items-center space-x-6">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href as any}
                    className={cn(
                      "flex items-center space-x-2 text-sm font-medium transition-colors hover:text-primary",
                      "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        <div className="container mx-auto py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
