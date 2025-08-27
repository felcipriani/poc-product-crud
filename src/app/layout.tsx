import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "Product Management System",
  description:
    "A comprehensive product management system with variations and compositions",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-background flex items-center w-full justify-center">
          {children}
        </div>
        <Toaster />
      </body>
    </html>
  );
}
