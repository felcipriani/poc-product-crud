import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ToastContainer } from "@/components/shared/notifications/toast-container";

const inter = Inter({ subsets: ["latin"] });

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
      <body className={inter.className}>
        <div className="min-h-screen bg-background flex items-center w-full justify-center">
          {children}
        </div>
        <Toaster />
        <ToastContainer />
      </body>
    </html>
  );
}
