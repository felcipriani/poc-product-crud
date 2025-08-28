import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { VariationForm } from "@/features/variations/components/variation-form";
import { Variation } from "@/lib/domain/entities/variation";
import { VariationType } from "@/lib/domain/entities/variation-type";

// Mock the toast hook
vi.mock("@/hooks/use-toast", () => {
  const toast = {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  };
  return {
    toast,
    useToast: () => ({
      toasts: [],
      addToast: vi.fn(),
      removeToast: vi.fn(),
      clearAllToasts: vi.fn(),
      ...toast,
      toast: vi.fn(),
    }),
  };
});

describe("VariationForm", () => {
  const mockVariationTypes: VariationType[] = [
    {
      id: "1",
      name: "Color",
      modifiesWeight: false,
      modifiesDimensions: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "2",
      name: "Material",
      modifiesWeight: true,
      modifiesDimensions: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "3",
      name: "Size",
      modifiesWeight: true,
      modifiesDimensions: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockOnSubmit = vi.fn();
  const mockOnClose = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSubmit: mockOnSubmit,
    variationTypes: mockVariationTypes,
    title: "Create Variation",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders create form correctly", () => {
    render(<VariationForm {...defaultProps} />);

    expect(screen.getByText("Create Variation")).toBeInTheDocument();
    expect(screen.getByLabelText(/variation type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("renders edit form with existing data", () => {
    const existingVariation: Variation = {
      id: "1",
      variationTypeId: "1",
      name: "Red",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    render(
      <VariationForm
        {...defaultProps}
        variation={existingVariation}
        title="Edit Variation"
      />
    );

    expect(screen.getByDisplayValue("Red")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Color")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /update/i })).toBeInTheDocument();
  });

  it("pre-selects variation type when provided", () => {
    render(<VariationForm {...defaultProps} selectedVariationTypeId="2" />);

    const select = screen.getByLabelText(
      /variation type/i
    ) as HTMLSelectElement;
    expect(select.value).toBe("2");
  });

  it("disables variation type selection when editing", () => {
    const existingVariation: Variation = {
      id: "1",
      variationTypeId: "1",
      name: "Red",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    render(<VariationForm {...defaultProps} variation={existingVariation} />);

    const select = screen.getByLabelText(/variation type/i);
    expect(select).toBeDisabled();
    expect(
      screen.getByText(/variation type cannot be changed when editing/i)
    ).toBeInTheDocument();
  });

  it("validates required fields", async () => {
    const user = userEvent.setup();
    render(<VariationForm {...defaultProps} />);

    // Select a variation type first to enable the submit button
    const typeSelect = screen.getByLabelText(/variation type/i);
    await user.selectOptions(typeSelect, "1");

    // Clear the name field to test validation
    const nameInput = screen.getByLabelText(/name/i);
    await user.clear(nameInput);

    const submitButton = screen.getByRole("button", { name: /create/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("Variation name is required")
      ).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("validates name format", async () => {
    const user = userEvent.setup();
    render(<VariationForm {...defaultProps} />);

    const typeSelect = screen.getByLabelText(/variation type/i);
    const nameInput = screen.getByLabelText(/name/i);

    await user.selectOptions(typeSelect, "1");
    await user.type(nameInput, "Invalid@Name!");

    const submitButton = screen.getByRole("button", { name: /create/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(
          /name can only contain letters, numbers, spaces, hyphens, and underscores/i
        )
      ).toBeInTheDocument();
    });
  });

  it("validates name length", async () => {
    const user = userEvent.setup();
    render(<VariationForm {...defaultProps} />);

    const typeSelect = screen.getByLabelText(/variation type/i);
    const nameInput = screen.getByLabelText(/name/i);

    await user.selectOptions(typeSelect, "1");
    await user.type(nameInput, "a".repeat(51)); // 51 characters

    const submitButton = screen.getByRole("button", { name: /create/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("Variation name must be 50 characters or less")
      ).toBeInTheDocument();
    });
  });

  it("submits form with valid data", async () => {
    const user = userEvent.setup();
    mockOnSubmit.mockResolvedValue(undefined);

    render(<VariationForm {...defaultProps} />);

    const typeSelect = screen.getByLabelText(/variation type/i);
    const nameInput = screen.getByLabelText(/name/i);

    await user.selectOptions(typeSelect, "1");
    await user.type(nameInput, "Red");

    const submitButton = screen.getByRole("button", { name: /create/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: "Red",
        variationTypeId: "1",
      });
    });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("shows variation type information when type is selected", async () => {
    const user = userEvent.setup();
    render(<VariationForm {...defaultProps} />);

    const typeSelect = screen.getByLabelText(/variation type/i);
    await user.selectOptions(typeSelect, "1"); // Color type (aesthetic only)

    expect(
      screen.getByText((content, element) => {
        return (
          element?.tagName === "P" &&
          element?.textContent?.trim() === "Color variations are aesthetic only"
        );
      })
    ).toBeInTheDocument();
  });

  it("shows weight modification info for weight-modifying types", async () => {
    const user = userEvent.setup();
    render(<VariationForm {...defaultProps} />);

    const typeSelect = screen.getByLabelText(/variation type/i);
    await user.selectOptions(typeSelect, "2"); // Material type (modifies weight)

    expect(
      screen.getByText((content, element) => {
        return (
          element?.tagName === "P" &&
          element?.textContent?.trim() === "Material variations modify weight"
        );
      })
    ).toBeInTheDocument();
  });

  it("shows dimension modification info for dimension-modifying types", async () => {
    const user = userEvent.setup();
    render(<VariationForm {...defaultProps} />);

    const typeSelect = screen.getByLabelText(/variation type/i);
    await user.selectOptions(typeSelect, "3"); // Size type (modifies both)

    expect(
      screen.getByText((content, element) => {
        return (
          element?.tagName === "P" &&
          element?.textContent?.trim() ===
            "Size variations modify both weight and dimensions"
        );
      })
    ).toBeInTheDocument();
  });

  it("disables submit button when no variation type is selected", () => {
    render(<VariationForm {...defaultProps} />);

    const submitButton = screen.getByRole("button", { name: /create/i });
    expect(submitButton).toBeDisabled();
  });

  it("enables submit button when variation type is selected", async () => {
    const user = userEvent.setup();
    render(<VariationForm {...defaultProps} />);

    const typeSelect = screen.getByLabelText(/variation type/i);
    await user.selectOptions(typeSelect, "1");

    const submitButton = screen.getByRole("button", { name: /create/i });
    expect(submitButton).not.toBeDisabled();
  });

  it("handles form submission error", async () => {
    const user = userEvent.setup();
    const error = new Error("Name already exists");
    mockOnSubmit.mockRejectedValue(error);

    render(<VariationForm {...defaultProps} />);

    const typeSelect = screen.getByLabelText(/variation type/i);
    const nameInput = screen.getByLabelText(/name/i);

    await user.selectOptions(typeSelect, "1");
    await user.type(nameInput, "Red");

    const submitButton = screen.getByRole("button", { name: /create/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });

    // Form should not close on error
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it("closes form when cancel is clicked", async () => {
    const user = userEvent.setup();
    render(<VariationForm {...defaultProps} />);

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("disables submit button while submitting", async () => {
    const user = userEvent.setup();
    let resolveSubmit: () => void;
    const submitPromise = new Promise<void>((resolve) => {
      resolveSubmit = resolve;
    });
    mockOnSubmit.mockReturnValue(submitPromise);

    render(<VariationForm {...defaultProps} />);

    const typeSelect = screen.getByLabelText(/variation type/i);
    const nameInput = screen.getByLabelText(/name/i);

    await user.selectOptions(typeSelect, "1");
    await user.type(nameInput, "Red");

    const submitButton = screen.getByRole("button", { name: /create/i });
    await user.click(submitButton);

    expect(screen.getByRole("button", { name: /saving/i })).toBeDisabled();

    resolveSubmit!();
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
