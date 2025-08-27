import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { VariationTypeList } from "@/features/variation-types/components/variation-type-list";
import { VariationType } from "@/lib/domain/entities/variation-type";
import { useVariationTypes } from "@/features/variation-types/hooks/use-variation-types";

// Mock the hook
vi.mock("@/features/variation-types/hooks/use-variation-types", () => ({
  useVariationTypes: vi.fn(),
}));

// Mock the toast hook
vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

const mockUseVariationTypes = useVariationTypes as vi.MockedFunction<
  typeof useVariationTypes
>;

describe("VariationTypeList", () => {
  const mockVariationTypes: VariationType[] = [
    {
      id: "1",
      name: "Color",
      modifiesWeight: false,
      modifiesDimensions: false,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    },
    {
      id: "2",
      name: "Material",
      modifiesWeight: true,
      modifiesDimensions: false,
      createdAt: new Date("2024-01-02"),
      updatedAt: new Date("2024-01-02"),
    },
    {
      id: "3",
      name: "Size",
      modifiesWeight: true,
      modifiesDimensions: true,
      createdAt: new Date("2024-01-03"),
      updatedAt: new Date("2024-01-03"),
    },
  ];

  const defaultHookReturn = {
    variationTypes: mockVariationTypes,
    loading: false,
    error: null,
    createVariationType: vi.fn(),
    updateVariationType: vi.fn(),
    deleteVariationType: vi.fn(),
    searchVariationTypes: vi.fn(),
    refreshVariationTypes: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseVariationTypes.mockReturnValue(defaultHookReturn);
  });

  it("renders variation types list correctly", () => {
    render(<VariationTypeList />);

    expect(screen.getByText("Variation Types")).toBeInTheDocument();
    expect(screen.getByText("Color")).toBeInTheDocument();
    expect(screen.getByText("Material")).toBeInTheDocument();
    expect(screen.getByText("Size")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    mockUseVariationTypes.mockReturnValue({
      ...defaultHookReturn,
      loading: true,
      variationTypes: [],
    });

    render(<VariationTypeList />);

    expect(screen.getByRole("status")).toBeInTheDocument(); // Loading spinner
  });

  it("shows error state", () => {
    const errorMessage = "Failed to load variation types";
    mockUseVariationTypes.mockReturnValue({
      ...defaultHookReturn,
      error: errorMessage,
    });

    render(<VariationTypeList />);

    expect(screen.getByText("Error")).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it("displays variation type properties correctly", () => {
    render(<VariationTypeList />);

    // Check that we have the right number of Yes/No badges
    const yesBadges = screen.getAllByText("Yes");
    const noBadges = screen.getAllByText("No");

    // Material and Size modify weight (2 Yes), Size modifies dimensions (1 Yes) = 3 Yes total
    expect(yesBadges).toHaveLength(3);
    // Color doesn't modify weight or dimensions (2 No), Material doesn't modify dimensions (1 No) = 3 No total
    expect(noBadges).toHaveLength(3);
  });

  it("opens create modal when create button is clicked", async () => {
    const user = userEvent.setup();
    render(<VariationTypeList />);

    const createButton = screen.getByRole("button", {
      name: /create variation type/i,
    });
    await user.click(createButton);

    expect(screen.getAllByText("Create Variation Type")).toHaveLength(2); // Button + Modal title
  });

  it("opens edit modal when edit button is clicked", async () => {
    const user = userEvent.setup();
    render(<VariationTypeList />);

    const editButtons = screen.getAllByRole("button", { name: /edit/i });
    await user.click(editButtons[0]);

    expect(screen.getByText("Edit Variation Type")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Color")).toBeInTheDocument();
  });

  it("opens delete confirmation when delete button is clicked", async () => {
    const user = userEvent.setup();
    render(<VariationTypeList />);

    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    await user.click(deleteButtons[0]);

    expect(screen.getByText("Delete Variation Type")).toBeInTheDocument();
    expect(
      screen.getByText(/are you sure you want to delete.*color/i)
    ).toBeInTheDocument();
  });

  it("confirms deletion when delete is confirmed", async () => {
    const user = userEvent.setup();
    const mockDelete = vi.fn().mockResolvedValue(undefined);
    mockUseVariationTypes.mockReturnValue({
      ...defaultHookReturn,
      deleteVariationType: mockDelete,
    });

    render(<VariationTypeList />);

    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    await user.click(deleteButtons[0]);

    const confirmButton = screen.getByRole("button", {
      name: /delete/i,
      hidden: false,
    });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith("1");
    });
  });

  it("searches variation types", async () => {
    const user = userEvent.setup();
    const mockSearch = vi.fn().mockResolvedValue(undefined);
    mockUseVariationTypes.mockReturnValue({
      ...defaultHookReturn,
      searchVariationTypes: mockSearch,
    });

    render(<VariationTypeList />);

    const searchInput = screen.getByPlaceholderText(/search variation types/i);
    await user.type(searchInput, "Color");

    await waitFor(() => {
      expect(mockSearch).toHaveBeenCalledWith("Color");
    });
  });

  it("clears search when clear button is clicked", async () => {
    const user = userEvent.setup();
    const mockSearch = vi.fn().mockResolvedValue(undefined);
    const mockRefresh = vi.fn().mockResolvedValue(undefined);
    mockUseVariationTypes.mockReturnValue({
      ...defaultHookReturn,
      searchVariationTypes: mockSearch,
      refreshVariationTypes: mockRefresh,
    });

    render(<VariationTypeList />);

    const searchInput = screen.getByPlaceholderText(/search variation types/i);
    await user.type(searchInput, "Color");

    const clearButton = screen.getByRole("button", { name: /clear/i });
    await user.click(clearButton);

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("shows empty message when no variation types exist", () => {
    mockUseVariationTypes.mockReturnValue({
      ...defaultHookReturn,
      variationTypes: [],
    });

    render(<VariationTypeList />);

    expect(screen.getByText(/no variation types found/i)).toBeInTheDocument();
  });

  it("renders selectable mode correctly", () => {
    const mockOnSelect = vi.fn();
    render(
      <VariationTypeList
        selectable={true}
        onVariationTypeSelect={mockOnSelect}
      />
    );

    const selectButtons = screen.getAllByRole("button", { name: /select/i });
    expect(selectButtons).toHaveLength(mockVariationTypes.length);
  });

  it("calls onVariationTypeSelect when select button is clicked", async () => {
    const user = userEvent.setup();
    const mockOnSelect = vi.fn();
    render(
      <VariationTypeList
        selectable={true}
        onVariationTypeSelect={mockOnSelect}
      />
    );

    const selectButtons = screen.getAllByRole("button", { name: /select/i });
    await user.click(selectButtons[0]);

    expect(mockOnSelect).toHaveBeenCalledWith(mockVariationTypes[0]);
  });

  it("shows creation dates correctly", () => {
    render(<VariationTypeList />);

    // Check that creation dates are displayed (format may vary by locale)
    const dateElements = screen.getAllByText((content, element) => {
      return (
        (element?.textContent?.includes("Created") &&
          element?.textContent?.includes("2024")) ||
        false
      );
    });
    expect(dateElements.length).toBeGreaterThan(0);
  });
});
