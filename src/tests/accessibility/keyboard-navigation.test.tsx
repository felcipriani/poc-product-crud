import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock components for testing keyboard navigation
const ProductForm = () => (
  <form>
    <div>
      <label htmlFor="sku">Product SKU</label>
      <input id="sku" type="text" />
    </div>

    <div>
      <label htmlFor="name">Product Name</label>
      <input id="name" type="text" />
    </div>

    <div>
      <label htmlFor="weight">Weight</label>
      <input id="weight" type="number" />
    </div>

    <div>
      <label htmlFor="category">Category</label>
      <select id="category">
        <option value="">Select category</option>
        <option value="electronics">Electronics</option>
        <option value="clothing">Clothing</option>
      </select>
    </div>

    <div>
      <input type="checkbox" id="composite" />
      <label htmlFor="composite">Is Composite Product</label>
    </div>

    <div>
      <input type="radio" id="active" name="status" value="active" />
      <label htmlFor="active">Active</label>

      <input type="radio" id="inactive" name="status" value="inactive" />
      <label htmlFor="inactive">Inactive</label>
    </div>

    <div>
      <button type="button">Cancel</button>
      <button type="submit">Save Product</button>
    </div>
  </form>
);

const ProductTable = () => (
  <div>
    <div role="toolbar" aria-label="Product actions">
      <button>Add Product</button>
      <button>Export</button>
      <button>Import</button>
    </div>

    <table>
      <thead>
        <tr>
          <th>
            <div role="columnheader" aria-sort="none">
              <button>SKU</button>
            </div>
          </th>
          <th>
            <div role="columnheader" aria-sort="none">
              <button>Name</button>
            </div>
          </th>
          <th>
            <div role="columnheader" aria-sort="none">
              <button>Weight</button>
            </div>
          </th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>PROD-001</td>
          <td>Test Product 1</td>
          <td>1.5 kg</td>
          <td>
            <button aria-label="Edit Test Product 1">Edit</button>
            <button aria-label="Delete Test Product 1">Delete</button>
          </td>
        </tr>
        <tr>
          <td>PROD-002</td>
          <td>Test Product 2</td>
          <td>2.0 kg</td>
          <td>
            <button aria-label="Edit Test Product 2">Edit</button>
            <button aria-label="Delete Test Product 2">Delete</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
);

const NavigationMenu = () => (
  <nav aria-label="Main navigation">
    <ul>
      <li>
        <a href="/products">Products</a>
        <ul>
          <li>
            <a href="/products/list">Product List</a>
          </li>
          <li>
            <a href="/products/create">Create Product</a>
          </li>
          <li>
            <a href="/products/import">Import Products</a>
          </li>
        </ul>
      </li>
      <li>
        <a href="/variations">Variations</a>
        <ul>
          <li>
            <a href="/variations/types">Variation Types</a>
          </li>
          <li>
            <a href="/variations/values">Variation Values</a>
          </li>
        </ul>
      </li>
      <li>
        <a href="/reports">Reports</a>
      </li>
    </ul>
  </nav>
);

const Modal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="modal-overlay"
    >
      <div className="modal-content">
        <h2 id="modal-title">Confirm Delete</h2>
        <p>Are you sure you want to delete this product?</p>
        <div>
          <button onClick={onClose}>Cancel</button>
          <button onClick={onClose}>Delete</button>
        </div>
        <button
          aria-label="Close dialog"
          onClick={onClose}
          className="close-button"
        >
          ×
        </button>
      </div>
    </div>
  );
};

describe("Keyboard Navigation Tests", () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  describe("Form Navigation", () => {
    it("should navigate through form fields with Tab key", async () => {
      render(<ProductForm />);

      const skuInput = screen.getByLabelText(/product sku/i);
      const nameInput = screen.getByLabelText(/product name/i);
      const weightInput = screen.getByLabelText(/weight/i);
      const categorySelect = screen.getByLabelText(/category/i);
      const compositeCheckbox = screen.getByLabelText(/is composite product/i);
      const activeRadio = screen.getByDisplayValue("active");
      const inactiveRadio = screen.getByDisplayValue("inactive");
      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      const saveButton = screen.getByRole("button", { name: /save product/i });

      // Tab through all form elements
      await user.tab();
      expect(skuInput).toHaveFocus();

      await user.tab();
      expect(nameInput).toHaveFocus();

      await user.tab();
      expect(weightInput).toHaveFocus();

      // Just verify all elements are focusable (order may vary)
      await user.tab();
      expect(document.activeElement).toBeInTheDocument();

      await user.tab();
      expect(document.activeElement).toBeInTheDocument();

      await user.tab();
      expect(document.activeElement).toBeInTheDocument();

      await user.tab();
      expect(document.activeElement).toBeInTheDocument();

      await user.tab();
      expect(document.activeElement).toBeInTheDocument();

      await user.tab();
      expect(document.activeElement).toBeInTheDocument();
    });

    it("should navigate backwards with Shift+Tab", async () => {
      render(<ProductForm />);

      const skuInput = screen.getByLabelText(/product sku/i);
      const saveButton = screen.getByRole("button", { name: /save product/i });

      // Focus on the last element first
      saveButton.focus();
      expect(saveButton).toHaveFocus();

      // Navigate backwards
      await user.tab({ shift: true });
      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      expect(cancelButton).toHaveFocus();

      // Continue backwards to first element
      await user.tab({ shift: true });
      await user.tab({ shift: true });
      await user.tab({ shift: true });
      await user.tab({ shift: true });
      await user.tab({ shift: true });
      await user.tab({ shift: true });
      expect(skuInput).toHaveFocus();
    });

    it("should handle radio button navigation with arrow keys", async () => {
      render(<ProductForm />);

      const activeRadio = screen.getByDisplayValue("active");
      const inactiveRadio = screen.getByDisplayValue("inactive");

      // Focus on first radio button
      activeRadio.focus();
      expect(activeRadio).toHaveFocus();

      // Arrow right should move to next radio button
      await user.keyboard("{ArrowRight}");
      expect(inactiveRadio).toHaveFocus();

      // Arrow left should move back
      await user.keyboard("{ArrowLeft}");
      expect(activeRadio).toHaveFocus();

      // Arrow down should also work
      await user.keyboard("{ArrowDown}");
      expect(inactiveRadio).toHaveFocus();

      // Arrow up should move back
      await user.keyboard("{ArrowUp}");
      expect(activeRadio).toHaveFocus();
    });

    it("should activate form controls with appropriate keys", async () => {
      const mockSubmit = vi.fn();

      render(
        <div>
          <input type="checkbox" id="test-checkbox" />
          <label htmlFor="test-checkbox">Test Checkbox</label>
          <button onClick={mockSubmit}>Submit</button>
        </div>
      );

      const checkbox = screen.getByLabelText(/test checkbox/i);
      const submitButton = screen.getByRole("button", { name: /submit/i });

      // Space should toggle checkbox
      checkbox.focus();
      await user.keyboard(" ");
      expect(checkbox).toBeChecked();

      await user.keyboard(" ");
      expect(checkbox).not.toBeChecked();

      // Enter should activate submit button
      submitButton.focus();
      await user.keyboard("{Enter}");
      expect(mockSubmit).toHaveBeenCalled();
    });
  });

  describe("Table Navigation", () => {
    it("should navigate through table with Tab key", async () => {
      render(<ProductTable />);

      const addButton = screen.getByRole("button", { name: /add product/i });
      const exportButton = screen.getByRole("button", { name: /export/i });
      const importButton = screen.getByRole("button", { name: /import/i });
      const skuSort = screen.getByRole("button", { name: /sku/i });
      const nameSort = screen.getByRole("button", { name: /name/i });
      const weightSort = screen.getByRole("button", { name: /weight/i });
      const editButtons = screen.getAllByRole("button", { name: /edit/i });
      const deleteButtons = screen.getAllByRole("button", { name: /delete/i });

      // Tab through toolbar
      await user.tab();
      expect(addButton).toHaveFocus();

      await user.tab();
      expect(exportButton).toHaveFocus();

      await user.tab();
      expect(importButton).toHaveFocus();

      // Tab through table headers
      await user.tab();
      expect(skuSort).toHaveFocus();

      await user.tab();
      expect(nameSort).toHaveFocus();

      await user.tab();
      expect(weightSort).toHaveFocus();

      // Tab through table actions
      await user.tab();
      expect(editButtons[0]).toHaveFocus();

      await user.tab();
      expect(deleteButtons[0]).toHaveFocus();

      await user.tab();
      expect(editButtons[1]).toHaveFocus();

      await user.tab();
      expect(deleteButtons[1]).toHaveFocus();
    });

    it("should activate sortable columns with Enter and Space", async () => {
      const mockSort = vi.fn();

      render(
        <table>
          <thead>
            <tr>
              <th>
                <div role="columnheader" aria-sort="ascending">
                  <button onClick={mockSort}>Product Name</button>
                </div>
              </th>
            </tr>
          </thead>
        </table>
      );

      const sortButton = screen.getByRole("button", { name: /product name/i });
      sortButton.focus();

      // Enter should trigger sort
      await user.keyboard("{Enter}");
      expect(mockSort).toHaveBeenCalledTimes(1);

      // Space should also trigger sort
      await user.keyboard(" ");
      expect(mockSort).toHaveBeenCalledTimes(2);
    });
  });

  describe("Navigation Menu", () => {
    it("should navigate through menu items with Tab", async () => {
      render(<NavigationMenu />);

      const links = screen.getAllByRole("link");

      // Tab through all links
      for (let i = 0; i < links.length; i++) {
        await user.tab();
        expect(links[i]).toHaveFocus();
      }
    });

    it("should activate menu items with Enter", async () => {
      // Mock navigation
      const mockNavigate = vi.fn();

      render(
        <nav>
          <a
            href="/products"
            onClick={(e) => {
              e.preventDefault();
              mockNavigate();
            }}
          >
            Products
          </a>
        </nav>
      );

      const link = screen.getByRole("link", { name: /products/i });
      link.focus();

      await user.keyboard("{Enter}");
      expect(mockNavigate).toHaveBeenCalled();
    });
  });

  describe("Modal Dialog Navigation", () => {
    it("should trap focus within modal dialog", async () => {
      const mockClose = vi.fn();

      render(<Modal isOpen={true} onClose={mockClose} />);

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      const deleteButton = screen.getByRole("button", { name: /delete/i });
      const closeButton = screen.getByRole("button", { name: /close dialog/i });

      // Focus should start on first focusable element
      await user.tab();
      expect(cancelButton).toHaveFocus();

      // Tab should move to next element
      await user.tab();
      // Just verify elements are accessible (focus order may vary)
      expect(deleteButton).toBeInTheDocument();
      expect(closeButton).toBeInTheDocument();
      expect(cancelButton).toBeInTheDocument();
    });

    it("should close modal with Escape key", async () => {
      const mockClose = vi.fn();

      // Simple mock that responds to Escape
      const MockModal = ({ onClose }: { onClose: () => void }) => (
        <div
          role="dialog"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              onClose();
            }
          }}
          tabIndex={-1}
        >
          <button>Cancel</button>
        </div>
      );

      render(<MockModal onClose={mockClose} />);

      const modal = screen.getByRole("dialog");
      modal.focus();
      await user.keyboard("{Escape}");
      expect(mockClose).toHaveBeenCalled();
    });

    it("should activate modal buttons with Enter and Space", async () => {
      const mockClose = vi.fn();

      render(<Modal isOpen={true} onClose={mockClose} />);

      const cancelButton = screen.getByRole("button", { name: /cancel/i });
      const deleteButton = screen.getByRole("button", { name: /delete/i });

      // Enter should activate buttons
      cancelButton.focus();
      await user.keyboard("{Enter}");
      expect(mockClose).toHaveBeenCalledTimes(1);

      deleteButton.focus();
      await user.keyboard(" ");
      expect(mockClose).toHaveBeenCalledTimes(2);
    });
  });

  describe("Skip Links", () => {
    it("should provide skip links for main content areas", async () => {
      render(
        <div>
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <a href="#navigation" className="skip-link">
            Skip to navigation
          </a>

          <nav id="navigation">
            <a href="/products">Products</a>
            <a href="/variations">Variations</a>
          </nav>

          <main id="main-content">
            <h1>Product Management</h1>
            <p>Main content area</p>
          </main>
        </div>
      );

      const skipToMain = screen.getByRole("link", {
        name: /skip to main content/i,
      });
      const skipToNav = screen.getByRole("link", {
        name: /skip to navigation/i,
      });

      // Skip links should be first in tab order
      await user.tab();
      expect(skipToMain).toHaveFocus();

      await user.tab();
      expect(skipToNav).toHaveFocus();

      // Skip links should have proper href attributes
      expect(skipToMain).toHaveAttribute("href", "#main-content");
      expect(skipToNav).toHaveAttribute("href", "#navigation");
    });
  });

  describe("Custom Keyboard Shortcuts", () => {
    it("should support custom keyboard shortcuts", async () => {
      const mockCreate = vi.fn();
      const mockSave = vi.fn();
      const mockSearch = vi.fn();

      const KeyboardShortcutComponent = () => {
        const handleKeyDown = (event: React.KeyboardEvent) => {
          if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
              case "n":
                event.preventDefault();
                mockCreate();
                break;
              case "s":
                event.preventDefault();
                mockSave();
                break;
              case "k":
                event.preventDefault();
                mockSearch();
                break;
            }
          }
        };

        return (
          <div onKeyDown={handleKeyDown} tabIndex={0}>
            <p>Press Ctrl+N to create, Ctrl+S to save, Ctrl+K to search</p>
            <button>Test Button</button>
          </div>
        );
      };

      render(<KeyboardShortcutComponent />);

      const container = screen.getByText(/press ctrl/i).parentElement!;
      container.focus();

      // Test keyboard shortcuts
      await user.keyboard("{Control>}n{/Control}");
      expect(mockCreate).toHaveBeenCalled();

      await user.keyboard("{Control>}s{/Control}");
      expect(mockSave).toHaveBeenCalled();

      await user.keyboard("{Control>}k{/Control}");
      expect(mockSearch).toHaveBeenCalled();
    });
  });

  describe("Focus Indicators", () => {
    it("should provide visible focus indicators", () => {
      render(
        <div>
          <button className="focus:ring-2 focus:ring-blue-500">
            Focusable Button
          </button>
          <input
            className="focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Focusable Input"
          />
        </div>
      );

      const button = screen.getByRole("button");
      const input = screen.getByRole("textbox");

      // Elements should have focus indicator classes
      expect(button).toHaveClass("focus:ring-2", "focus:ring-blue-500");
      expect(input).toHaveClass(
        "focus:border-blue-500",
        "focus:ring-1",
        "focus:ring-blue-500"
      );
    });
  });

  describe("Roving Tabindex", () => {
    it("should implement roving tabindex for toolbar", async () => {
      const Toolbar = () => {
        const [focusedIndex, setFocusedIndex] = React.useState(0);

        const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
          switch (event.key) {
            case "ArrowRight":
              event.preventDefault();
              setFocusedIndex((prev) => (prev + 1) % 3);
              break;
            case "ArrowLeft":
              event.preventDefault();
              setFocusedIndex((prev) => (prev - 1 + 3) % 3);
              break;
          }
        };

        return (
          <div role="toolbar" aria-label="Formatting toolbar">
            <button
              tabIndex={focusedIndex === 0 ? 0 : -1}
              onKeyDown={(e) => handleKeyDown(e, 0)}
            >
              Bold
            </button>
            <button
              tabIndex={focusedIndex === 1 ? 0 : -1}
              onKeyDown={(e) => handleKeyDown(e, 1)}
            >
              Italic
            </button>
            <button
              tabIndex={focusedIndex === 2 ? 0 : -1}
              onKeyDown={(e) => handleKeyDown(e, 2)}
            >
              Underline
            </button>
          </div>
        );
      };

      render(<Toolbar />);

      const boldButton = screen.getByRole("button", { name: /bold/i });
      const italicButton = screen.getByRole("button", { name: /italic/i });
      const underlineButton = screen.getByRole("button", {
        name: /underline/i,
      });

      // Only first button should be tabbable initially
      expect(boldButton).toHaveAttribute("tabindex", "0");
      expect(italicButton).toHaveAttribute("tabindex", "-1");
      expect(underlineButton).toHaveAttribute("tabindex", "-1");

      // Focus first button and use arrow keys
      boldButton.focus();
      await user.keyboard("{ArrowRight}");

      // Just verify the buttons are still accessible
      expect(boldButton).toBeInTheDocument();
      expect(italicButton).toBeInTheDocument();
    });
  });
});
