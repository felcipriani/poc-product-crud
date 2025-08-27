import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { VariationTypeForm } from '@/features/variation-types/components/variation-type-form';
import { VariationType } from '@/lib/domain/entities/variation-type';

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

describe('VariationTypeForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnClose = vi.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSubmit: mockOnSubmit,
    title: 'Create Variation Type',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders create form correctly', () => {
    render(<VariationTypeForm {...defaultProps} />);

    expect(screen.getByText('Create Variation Type')).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/modifies weight/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/modifies dimensions/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('renders edit form with existing data', () => {
    const existingVariationType: VariationType = {
      id: '1',
      name: 'Color',
      modifiesWeight: false,
      modifiesDimensions: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    render(
      <VariationTypeForm
        {...defaultProps}
        variationType={existingVariationType}
        title="Edit Variation Type"
      />
    );

    expect(screen.getByDisplayValue('Color')).toBeInTheDocument();
    expect(screen.getByLabelText(/modifies weight/i)).not.toBeChecked();
    expect(screen.getByLabelText(/modifies dimensions/i)).toBeChecked();
    expect(screen.getByRole('button', { name: /update/i })).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    render(<VariationTypeForm {...defaultProps} />);

    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Variation type name is required')).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('validates name format', async () => {
    const user = userEvent.setup();
    render(<VariationTypeForm {...defaultProps} />);

    const nameInput = screen.getByLabelText(/name/i);
    await user.type(nameInput, 'Invalid@Name!');

    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/name can only contain letters, numbers, spaces, hyphens, and underscores/i)).toBeInTheDocument();
    });
  });

  it('validates name length', async () => {
    const user = userEvent.setup();
    render(<VariationTypeForm {...defaultProps} />);

    const nameInput = screen.getByLabelText(/name/i);
    await user.type(nameInput, 'a'.repeat(51)); // 51 characters

    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Variation type name must be 50 characters or less')).toBeInTheDocument();
    });
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    mockOnSubmit.mockResolvedValue(undefined);

    render(<VariationTypeForm {...defaultProps} />);

    const nameInput = screen.getByLabelText(/name/i);
    const modifiesWeightCheckbox = screen.getByLabelText(/modifies weight/i);
    const modifiesDimensionsCheckbox = screen.getByLabelText(/modifies dimensions/i);

    await user.type(nameInput, 'Material');
    await user.click(modifiesWeightCheckbox);
    await user.click(modifiesDimensionsCheckbox);

    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'Material',
        modifiesWeight: true,
        modifiesDimensions: true,
      });
    });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows information message when modification flags are selected', async () => {
    const user = userEvent.setup();
    render(<VariationTypeForm {...defaultProps} />);

    const modifiesWeightCheckbox = screen.getByLabelText(/modifies weight/i);
    await user.click(modifiesWeightCheckbox);

    expect(screen.getByText(/when products use variations of this type/i)).toBeInTheDocument();
    expect(screen.getByText(/weight.*will be ignored/i)).toBeInTheDocument();
  });

  it('shows combined information when both flags are selected', async () => {
    const user = userEvent.setup();
    render(<VariationTypeForm {...defaultProps} />);

    const modifiesWeightCheckbox = screen.getByLabelText(/modifies weight/i);
    const modifiesDimensionsCheckbox = screen.getByLabelText(/modifies dimensions/i);
    
    await user.click(modifiesWeightCheckbox);
    await user.click(modifiesDimensionsCheckbox);

    expect(screen.getByText(/weight and dimensions.*will be ignored/i)).toBeInTheDocument();
  });

  it('handles form submission error', async () => {
    const user = userEvent.setup();
    const error = new Error('Name already exists');
    mockOnSubmit.mockRejectedValue(error);

    render(<VariationTypeForm {...defaultProps} />);

    const nameInput = screen.getByLabelText(/name/i);
    await user.type(nameInput, 'Color');

    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });

    // Form should not close on error
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('closes form when cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<VariationTypeForm {...defaultProps} />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('disables submit button while submitting', async () => {
    const user = userEvent.setup();
    let resolveSubmit: () => void;
    const submitPromise = new Promise<void>((resolve) => {
      resolveSubmit = resolve;
    });
    mockOnSubmit.mockReturnValue(submitPromise);

    render(<VariationTypeForm {...defaultProps} />);

    const nameInput = screen.getByLabelText(/name/i);
    await user.type(nameInput, 'Color');

    const submitButton = screen.getByRole('button', { name: /create/i });
    await user.click(submitButton);

    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();

    resolveSubmit!();
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});