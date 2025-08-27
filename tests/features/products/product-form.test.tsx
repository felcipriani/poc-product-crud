import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductForm } from "@/features/products/components/product-form";
import { Product } from "@/lib/domain/entities/product";
import { beforeEach } from "node:test";

describe("ProductForm", () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  const defaultProps = {
    onSubmit: mockOnSubmit,
    onCancel: mockOnCancel,
    loading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders create form with empty fields", () => {
    render(<ProductForm {...defaultProps} />);
    
    expect(screen.getByPlaceholderText("e.g., PROD-001")).toHaveValue("");
    expect(screen.getByPlaceholderText("Enter product name")).toHaveValue("");
    // Number inputs can have null value when empty
    const weightInput = screen.getByPlaceholderText("0.00");
    expect(weightInput.value === "" || weightInput.value === null).toBe(true);
    expect(screen.getByText("Create Product")).toBeInTheDocument();
  });

  it("renders edit form with populated fields", () => {
    const product: Product = {
      sku: "TEST-001",
      name: "Test Product",
      weight: 5.5,
      dimensions: { height: 10, width: 20, depth: 30 },
      isComposite: false,
      hasVariation: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    render(<ProductForm {...defaultProps} product={product} />);
    
    expect(screen.getByDisplayValue("TEST-001")).toBeDisabled();
    expect(screen.getByDisplayValue("Test Product")).toBeInTheDocument();
    expect(screen.getByDisplayValue("5.5")).toBeInTheDocument();
    expect(screen.getByDisplayValue("10")).toBeInTheDocument();
    expect(screen.getByDisplayValue("20")).toBeInTheDocument();
    expect(screen.getByDisplayValue("30")).toBeInTheDocument();
    expect(screen.getByLabelText("This product has variations")).toBeChecked();
    expect(screen.getByText("Update Product")).toBeInTheDocument();
  });

  it("shows form elements", () => {
    render(<ProductForm {...defaultProps} />);
    
    expect(screen.getByPlaceholderText("e.g., PROD-001")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter product name")).toBeInTheDocument();
    expect(screen.getByLabelText("This is a composite product")).toBeInTheDocument();
    expect(screen.getByLabelText("This product has variations")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Create Product")).toBeInTheDocument();
  });

  it("calls onCancel when cancel button is clicked", async () => {
    const user = userEvent.setup();
    render(<ProductForm {...defaultProps} />);
    
    await user.click(screen.getByText("Cancel"));
    
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it("shows loading state", () => {
    render(<ProductForm {...defaultProps} loading={true} />);
    
    expect(screen.getByText("Saving...")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeDisabled();
  });

  it("disables weight field when composite is checked", async () => {
    const user = userEvent.setup();
    render(<ProductForm {...defaultProps} />);
    
    const weightField = screen.getByPlaceholderText("0.00");
    const compositeCheckbox = screen.getByLabelText("This is a composite product");
    
    expect(weightField).not.toBeDisabled();
    
    await user.click(compositeCheckbox);
    
    expect(weightField).toBeDisabled();
    expect(screen.getByText("Weight will be calculated from composition items")).toBeInTheDocument();
  });
});