import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProductForm } from "@/features/products/components/product-form";
import { ProductList } from "@/features/products/components/product-list";

// Mock the toast hook
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe("Product Components Basic Tests", () => {
  describe("ProductForm", () => {
    const mockProps = {
      onSubmit: vi.fn(),
      onCancel: vi.fn(),
      loading: false,
    };

    it("renders form elements", () => {
      render(<ProductForm {...mockProps} />);
      
      expect(screen.getByText("SKU")).toBeInTheDocument();
      expect(screen.getByText("Product Name")).toBeInTheDocument();
      expect(screen.getByText("This is a composite product")).toBeInTheDocument();
      expect(screen.getByText("This product has variations")).toBeInTheDocument();
      expect(screen.getByText("Create Product")).toBeInTheDocument();
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });
  });

  describe("ProductList", () => {
    const mockProps = {
      products: [],
      loading: false,
      onCreateProduct: vi.fn(),
      onEditProduct: vi.fn(),
      onDeleteProduct: vi.fn(),
      onSearch: vi.fn(),
      onFilterChange: vi.fn(),
      searchQuery: "",
      filters: {},
    };

    it("renders list elements", () => {
      render(<ProductList {...mockProps} />);
      
      expect(screen.getByText("Products")).toBeInTheDocument();
      expect(screen.getByText("Create Product")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Search products by SKU or name...")).toBeInTheDocument();
    });

    it("shows empty state", () => {
      render(<ProductList {...mockProps} />);
      
      expect(screen.getByText("No products found. Create your first product to get started.")).toBeInTheDocument();
    });
  });
});