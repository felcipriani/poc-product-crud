import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductManagement } from "@/features/products/components/product-management";

// Mock the toast hook
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock the useProducts hook to avoid complex storage mocking
vi.mock("@/features/products/hooks/use-products", () => ({
  useProducts: () => ({
    products: [],
    loading: false,
    error: null,
    filters: {},
    setFilters: vi.fn(),
    createProduct: vi.fn().mockResolvedValue(undefined),
    updateProduct: vi.fn().mockResolvedValue(undefined),
    deleteProduct: vi.fn().mockResolvedValue(undefined),
    refreshProducts: vi.fn().mockResolvedValue(undefined),
  }),
}));

describe("ProductManagement Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders product list initially", async () => {
    render(<ProductManagement />);
    
    expect(screen.getByText("Products")).toBeInTheDocument();
    expect(screen.getByText("Create Product")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search products by SKU or name...")).toBeInTheDocument();
  });

  it("opens create product modal when create button is clicked", async () => {
    const user = userEvent.setup();
    render(<ProductManagement />);
    
    const createButton = screen.getByText("Create Product");
    await user.click(createButton);
    
    await waitFor(() => {
      expect(screen.getByText("Add a new product to your catalog")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("e.g., PROD-001")).toBeInTheDocument(); // SKU field
    });
  });

  it("validates required fields in product form", async () => {
    const user = userEvent.setup();
    render(<ProductManagement />);
    
    // Open create modal
    await user.click(screen.getByText("Create Product"));
    
    // Try to submit without filling required fields
    await waitFor(() => {
      const submitButtons = screen.getAllByText("Create Product");
      expect(submitButtons.length).toBeGreaterThan(1); // One in list, one in modal
    });
    
    const submitButtons = screen.getAllByText("Create Product");
    const modalSubmitButton = submitButtons[submitButtons.length - 1]; // Last one should be in modal
    await user.click(modalSubmitButton);
    
    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText("SKU is required")).toBeInTheDocument();
      expect(screen.getByText("Product name is required")).toBeInTheDocument();
    });
  });

  it("shows search input and filters", () => {
    render(<ProductManagement />);
    
    expect(screen.getByPlaceholderText("Search products by SKU or name...")).toBeInTheDocument();
    expect(screen.getByText("Composite")).toBeInTheDocument();
    expect(screen.getByText("Variations")).toBeInTheDocument();
  });
});