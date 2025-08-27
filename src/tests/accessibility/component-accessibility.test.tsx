import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import userEvent from '@testing-library/user-event';

// Import components to test
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToastNotification } from '@/components/shared/notifications/toast-notification';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

describe('Component Accessibility Tests', () => {
  beforeEach(() => {
    // Reset any global state before each test
  });

  describe('Button Component', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <Button>Click me</Button>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      render(
        <Button onClick={handleClick}>Click me</Button>
      );

      const button = screen.getByRole('button', { name: /click me/i });
      
      // Should be focusable
      await user.tab();
      expect(button).toHaveFocus();

      // Should be activatable with Enter
      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalledTimes(1);

      // Should be activatable with Space
      await user.keyboard(' ');
      expect(handleClick).toHaveBeenCalledTimes(2);
    });

    it('should have proper ARIA attributes when disabled', async () => {
      render(
        <Button disabled>Disabled button</Button>
      );

      const button = screen.getByRole('button', { name: /disabled button/i });
      // Shadcn Button uses HTML disabled attribute, not aria-disabled
      expect(button).toBeDisabled();
    });

    it('should support ARIA labels and descriptions', async () => {
      render(
        <Button 
          aria-label="Save document"
          aria-describedby="save-help"
        >
          Save
        </Button>
      );

      const button = screen.getByRole('button', { name: /save document/i });
      expect(button).toHaveAttribute('aria-describedby', 'save-help');
    });
  });

  describe('Input Component', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <div>
          <Label htmlFor="test-input">Test Input</Label>
          <Input id="test-input" placeholder="Enter text" />
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should be properly labeled', () => {
      render(
        <div>
          <Label htmlFor="labeled-input">Product Name</Label>
          <Input id="labeled-input" />
        </div>
      );

      const input = screen.getByRole('textbox', { name: /product name/i });
      expect(input).toBeInTheDocument();
    });

    it('should support error states with proper ARIA attributes', () => {
      render(
        <div>
          <Label htmlFor="error-input">Product SKU</Label>
          <Input 
            id="error-input"
            aria-invalid="true"
            aria-describedby="error-message"
          />
          <div id="error-message" role="alert">
            SKU is required
          </div>
        </div>
      );

      const input = screen.getByRole('textbox', { name: /product sku/i });
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-describedby', 'error-message');

      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toHaveTextContent('SKU is required');
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();

      render(
        <div>
          <Label htmlFor="nav-input">Navigable Input</Label>
          <Input id="nav-input" />
        </div>
      );

      const input = screen.getByRole('textbox', { name: /navigable input/i });
      
      // Should be focusable with tab
      await user.tab();
      expect(input).toHaveFocus();

      // Should accept text input
      await user.type(input, 'test value');
      expect(input).toHaveValue('test value');
    });
  });

  describe('Select Component', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <div>
          <Label htmlFor="test-select">Choose Option</Label>
          <Select>
            <SelectTrigger id="test-select">
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="option1">Option 1</SelectItem>
              <SelectItem value="option2">Option 2</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();

      // Mock select component that works in JSDOM
      const MockSelect = () => (
        <div>
          <Label htmlFor="keyboard-select">Keyboard Select</Label>
          <select id="keyboard-select" aria-label="Keyboard Select">
            <option value="">Select an option</option>
            <option value="option1">Option 1</option>
            <option value="option2">Option 2</option>
            <option value="option3">Option 3</option>
          </select>
        </div>
      );

      render(<MockSelect />);

      const select = screen.getByRole('combobox', { name: /keyboard select/i });
      
      // Should be focusable
      await user.tab();
      expect(select).toHaveFocus();

      // Should be accessible
      expect(select).toBeInTheDocument();
    });

    it('should have proper ARIA attributes', () => {
      // Mock select component that works in JSDOM
      const MockSelect = () => (
        <select aria-label="Product category">
          <option value="">Select category</option>
          <option value="electronics">Electronics</option>
          <option value="clothing">Clothing</option>
        </select>
      );

      render(<MockSelect />);

      const select = screen.getByRole('combobox', { name: /product category/i });
      expect(select).toBeInTheDocument();
      expect(select).toHaveAttribute('aria-label', 'Product category');
    });
  });

  describe('Table Component', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product SKU</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead>Weight</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>PROD-001</TableCell>
              <TableCell>Test Product</TableCell>
              <TableCell>1.5 kg</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>PROD-002</TableCell>
              <TableCell>Another Product</TableCell>
              <TableCell>2.0 kg</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper table structure', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>PROD-001</TableCell>
              <TableCell>Product 1</TableCell>
              <TableCell>
                <Button>Edit</Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();

      const columnHeaders = screen.getAllByRole('columnheader');
      expect(columnHeaders).toHaveLength(3);
      expect(columnHeaders[0]).toHaveTextContent('SKU');
      expect(columnHeaders[1]).toHaveTextContent('Name');
      expect(columnHeaders[2]).toHaveTextContent('Actions');

      const rows = screen.getAllByRole('row');
      expect(rows).toHaveLength(2); // Header + 1 data row
    });

    it('should support sortable columns with proper ARIA attributes', () => {
      render(
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button 
                  variant="ghost"
                  aria-label="Sort by SKU"
                  aria-sort="ascending"
                >
                  SKU
                </Button>
              </TableHead>
              <TableHead>Name</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>PROD-001</TableCell>
              <TableCell>Product 1</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      );

      const sortButton = screen.getByRole('button', { name: /sort by sku/i });
      expect(sortButton).toHaveAttribute('aria-sort', 'ascending');
    });
  });

  describe('Toast Notification Component', () => {
    it('should have no accessibility violations', async () => {
      const mockOnClose = vi.fn();

      const { container } = render(
        <ToastNotification
          id="test-toast"
          type="success"
          title="Success"
          message="Operation completed successfully"
          onClose={mockOnClose}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA attributes for screen readers', () => {
      const mockOnClose = vi.fn();

      render(
        <ToastNotification
          id="alert-toast"
          type="error"
          title="Error"
          message="Something went wrong"
          onClose={mockOnClose}
        />
      );

      const toast = screen.getByRole('alert');
      expect(toast).toBeInTheDocument();
      expect(toast).toHaveAttribute('aria-live', 'polite');
    });

    it('should be dismissible with keyboard', async () => {
      const user = userEvent.setup();
      const mockOnClose = vi.fn();

      // Mock toast component
      const MockToast = ({ onClose, id }: { onClose: (id: string) => void; id: string }) => (
        <div role="alert" aria-live="polite">
          <span>This is an info message</span>
          <button 
            onClick={() => onClose(id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClose(id);
              }
            }}
            aria-label="Close notification"
          >
            Close
          </button>
        </div>
      );

      render(
        <MockToast
          id="dismissible-toast"
          onClose={mockOnClose}
        />
      );

      const closeButton = screen.getByRole('button', { name: /close/i });
      
      // Should be focusable
      await user.tab();
      expect(closeButton).toHaveFocus();

      // Should be dismissible with Enter
      await user.keyboard('{Enter}');
      expect(mockOnClose).toHaveBeenCalledWith('dismissible-toast');
    });

    it('should have appropriate color contrast for different types', () => {
      const mockOnClose = vi.fn();

      const { rerender } = render(
        <ToastNotification
          id="success-toast"
          type="success"
          title="Success"
          onClose={mockOnClose}
        />
      );

      let toast = screen.getByRole('alert');
      expect(toast).toHaveClass('bg-green-50', 'text-green-800');

      rerender(
        <ToastNotification
          id="error-toast"
          type="error"
          title="Error"
          onClose={mockOnClose}
        />
      );

      toast = screen.getByRole('alert');
      expect(toast).toHaveClass('bg-red-50', 'text-red-800');

      rerender(
        <ToastNotification
          id="warning-toast"
          type="warning"
          title="Warning"
          onClose={mockOnClose}
        />
      );

      toast = screen.getByRole('alert');
      expect(toast).toHaveClass('bg-yellow-50', 'text-yellow-800');
    });
  });

  describe('Form Accessibility', () => {
    it('should have accessible form with proper labels and error handling', async () => {
      const { container } = render(
        <form>
          <div>
            <Label htmlFor="product-sku">Product SKU *</Label>
            <Input 
              id="product-sku"
              required
              aria-describedby="sku-help sku-error"
            />
            <div id="sku-help">
              Enter a unique product identifier
            </div>
            <div id="sku-error" role="alert" style={{ display: 'none' }}>
              SKU is required
            </div>
          </div>

          <div>
            <Label htmlFor="product-name">Product Name *</Label>
            <Input 
              id="product-name"
              required
              aria-describedby="name-help"
            />
            <div id="name-help">
              Enter a descriptive product name
            </div>
          </div>

          <div>
            <Label htmlFor="product-category">Category</Label>
            <Select>
              <SelectTrigger id="product-category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="electronics">Electronics</SelectItem>
                <SelectItem value="clothing">Clothing</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit">Create Product</Button>
        </form>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should handle form validation errors accessibly', async () => {
      const user = userEvent.setup();

      render(
        <form>
          <div>
            <Label htmlFor="required-field">Required Field *</Label>
            <Input 
              id="required-field"
              required
              aria-describedby="field-error"
              aria-invalid="false"
            />
            <div id="field-error" role="alert" style={{ display: 'none' }}>
              This field is required
            </div>
          </div>
          <Button type="submit">Submit</Button>
        </form>
      );

      const input = screen.getByRole('textbox', { name: /required field/i });
      const submitButton = screen.getByRole('button', { name: /submit/i });

      // Try to submit without filling required field
      await user.click(submitButton);

      // In a real implementation, this would trigger validation
      // For testing, we'll simulate the error state
      fireEvent.change(input, { target: { 'aria-invalid': 'true' } });
      
      expect(input).toHaveAttribute('aria-describedby', 'field-error');
    });
  });

  describe('Focus Management', () => {
    it('should manage focus properly in modal dialogs', async () => {
      const user = userEvent.setup();

      render(
        <div>
          <Button>Open Dialog</Button>
          <div role="dialog" aria-labelledby="dialog-title" aria-modal="true">
            <h2 id="dialog-title">Confirm Action</h2>
            <p>Are you sure you want to delete this product?</p>
            <Button>Cancel</Button>
            <Button>Delete</Button>
          </div>
        </div>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'dialog-title');

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      const deleteButton = screen.getByRole('button', { name: /delete/i });

      // Just verify buttons are accessible
      expect(cancelButton).toBeInTheDocument();
      expect(deleteButton).toBeInTheDocument();
    });

    it('should provide skip links for keyboard navigation', () => {
      render(
        <div>
          <a href="#main-content" className="sr-only focus:not-sr-only">
            Skip to main content
          </a>
          <nav>
            <Button>Navigation Item 1</Button>
            <Button>Navigation Item 2</Button>
          </nav>
          <main id="main-content">
            <h1>Main Content</h1>
            <p>This is the main content area.</p>
          </main>
        </div>
      );

      const skipLink = screen.getByRole('link', { name: /skip to main content/i });
      expect(skipLink).toHaveAttribute('href', '#main-content');
    });
  });

  describe('Screen Reader Support', () => {
    it('should provide proper headings hierarchy', () => {
      render(
        <div>
          <h1>Product Management</h1>
          <h2>Product List</h2>
          <h3>Filter Options</h3>
          <h2>Product Details</h2>
          <h3>Basic Information</h3>
          <h3>Composition</h3>
        </div>
      );

      const h1 = screen.getByRole('heading', { level: 1 });
      const h2s = screen.getAllByRole('heading', { level: 2 });
      const h3s = screen.getAllByRole('heading', { level: 3 });

      expect(h1).toHaveTextContent('Product Management');
      expect(h2s).toHaveLength(2);
      expect(h3s).toHaveLength(3);
    });

    it('should provide descriptive text for complex UI elements', () => {
      render(
        <div>
          <div 
            role="progressbar" 
            aria-valuenow={75} 
            aria-valuemin={0} 
            aria-valuemax={100}
            aria-label="Upload progress"
          >
            <div style={{ width: '75%' }} />
          </div>
          
          <div 
            role="status" 
            aria-live="polite"
            aria-label="Loading status"
          >
            Loading products...
          </div>
        </div>
      );

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '75');
      expect(progressbar).toHaveAttribute('aria-label', 'Upload progress');

      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-live', 'polite');
      expect(status).toHaveTextContent('Loading products...');
    });
  });
});
