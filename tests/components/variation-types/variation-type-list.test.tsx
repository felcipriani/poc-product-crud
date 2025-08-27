import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { VariationTypeList } from "@/features/variation-types/components/variation-type-list";

// Mock the hooks
vi.mock("@/features/variation-types/hooks/use-variation-types", () => ({
  useVariationTypes: vi.fn(() => ({
    variationTypes: [
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
        name: "Size",
        modifiesWeight: true,
        modifiesDimensions: true,
        createdAt: new Date("2024-01-02"),
        updatedAt: new Date("2024-01-02"),
      },
    ],
    loading: false,
    error: null,
    createVariationType: vi.fn(),
    updateVariationType: vi.fn(),
    deleteVariationType: vi.fn(),
    searchVariationTypes: vi.fn(),
    refreshVariationTypes: vi.fn(),
  })),
}));

import { useVariationTypes } from "@/features/variation-types/hooks/use-variation-types";
import { vi } from "zod/v4/locales";

const mockUseVariationTypes = useVariationTypes as vi.MockedFunction<typeof useVariationTypes>;

// Mock the components
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock("@/components/shared/data-table", () => ({
  AccessibleTable: ({ data, emptyMessage }: any) => (
    <div data-testid="accessible-table">
      {data.length === 0 ? (
        <div>{emptyMessage}</div>
      ) : (
        <div>
          {data.map((item: any) => (
            <div key={item.id} data-testid={`variation-type-${item.id}`}>
              {item.name}
            </div>
          ))}
        </div>
      )}
    </div>
  ),
}));

vi.mock("@/components/shared/loading", () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading...</div>,
}));

vi.mock("@/components/shared/modals", () => ({
  Modal: ({ children, title, isOpen }: any) =>
    isOpen ? (
      <div data-testid="modal">
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
}));

vi.mock("@/features/variation-types/components/variation-type-form", () => ({
  VariationTypeForm: ({ title, isOpen }: any) =>
    isOpen ? <div data-testid="variation-type-form">{title}</div> : null,
}));

describe("VariationTypeList", () => {
  it("should render variation types list", () => {
    render(<VariationTypeList />);
    
    expect(screen.getByText("Variation Types")).toBeInTheDocument();
    expect(screen.getByText("Create Variation Type")).toBeInTheDocument();
    expect(screen.getByTestId("accessible-table")).toBeInTheDocument();
  });

  it("should display variation types", () => {
    render(<VariationTypeList />);
    
    expect(screen.getByTestId("variation-type-1")).toBeInTheDocument();
    expect(screen.getByTestId("variation-type-2")).toBeInTheDocument();
    expect(screen.getByText("Color")).toBeInTheDocument();
    expect(screen.getByText("Size")).toBeInTheDocument();
  });

  it("should have search input", () => {
    render(<VariationTypeList />);
    
    const searchInput = screen.getByPlaceholderText("Search variation types...");
    expect(searchInput).toBeInTheDocument();
  });

  it("should have clear button", () => {
    render(<VariationTypeList />);
    
    const clearButton = screen.getByText("Clear");
    expect(clearButton).toBeInTheDocument();
  });

  it("should render empty message when no variation types", () => {
    // Mock the hook to return empty array
    mockUseVariationTypes.mockReturnValue({
      variationTypes: [],
      loading: false,
      error: null,
      createVariationType: vi.fn(),
      updateVariationType: vi.fn(),
      deleteVariationType: vi.fn(),
      searchVariationTypes: vi.fn(),
      refreshVariationTypes: vi.fn(),
    });

    render(<VariationTypeList />);
    
    expect(screen.getByText(/No variation types found/)).toBeInTheDocument();
  });
});