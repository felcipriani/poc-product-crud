import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AccessibleTable } from "@/components/shared/data-table/accessible-table";

const mockData = [
  { id: 1, name: "Product 1", price: 100 },
  { id: 2, name: "Product 2", price: 200 },
  { id: 3, name: "Product 3", price: 300 },
];

const mockColumns = [
  { key: "name" as const, label: "Name", sortable: true },
  { key: "price" as const, label: "Price", sortable: true },
];

describe("AccessibleTable", () => {
  it("renders table with data", () => {
    render(
      <AccessibleTable
        data={mockData}
        columns={mockColumns}
      />
    );

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("Product 1")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("shows empty message when no data", () => {
    render(
      <AccessibleTable
        data={[]}
        columns={mockColumns}
        emptyMessage="No products found"
      />
    );

    expect(screen.getByText("No products found")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    render(
      <AccessibleTable
        data={[]}
        columns={mockColumns}
        loading={true}
      />
    );

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders sortable column headers", () => {
    const onSort = vi.fn();
    render(
      <AccessibleTable
        data={mockData}
        columns={mockColumns}
        onSort={onSort}
      />
    );

    const nameHeader = screen.getByRole("button", { name: /sort by name/i });
    expect(nameHeader).toBeInTheDocument();
  });

  it("calls onSort when sortable header is clicked", async () => {
    const user = userEvent.setup();
    const onSort = vi.fn();
    
    render(
      <AccessibleTable
        data={mockData}
        columns={mockColumns}
        onSort={onSort}
      />
    );

    const nameHeader = screen.getByRole("button", { name: /sort by name/i });
    await user.click(nameHeader);

    expect(onSort).toHaveBeenCalledWith("name", "asc");
  });

  it("shows caption when provided", () => {
    render(
      <AccessibleTable
        data={mockData}
        columns={mockColumns}
        caption="Product list table"
      />
    );

    expect(screen.getByText("Product list table")).toBeInTheDocument();
  });

  it("uses custom render function for columns", () => {
    const columnsWithRender = [
      {
        key: "price" as const,
        label: "Price",
        render: (value: number) => `$${value}`,
      },
    ];

    render(
      <AccessibleTable
        data={mockData}
        columns={columnsWithRender}
      />
    );

    expect(screen.getByText("$100")).toBeInTheDocument();
  });
});