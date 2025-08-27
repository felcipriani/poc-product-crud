'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField, FormInput } from '@/components/shared/forms';
import { Modal } from '@/components/shared/modals';
import {
  Variation,
  CreateVariationData,
  UpdateVariationData,
} from '@/lib/domain/entities/variation';
import { VariationType } from '@/lib/domain/entities/variation-type';

const variationFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Variation name is required')
    .max(50, 'Variation name must be 50 characters or less')
    .regex(/^[a-zA-ZÀ-ÿ0-9\s\-_]+$/, 'Name can only contain letters, numbers, spaces, hyphens, and underscores'),
  variationTypeId: z.string().min(1, 'Variation type is required'),
});

type VariationFormData = z.infer<typeof variationFormSchema>;

interface VariationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateVariationData | UpdateVariationData) => Promise<void>;
  variation?: Variation;
  variationTypes: VariationType[];
  selectedVariationTypeId?: string;
  title: string;
}

export function VariationForm({
  isOpen,
  onClose,
  onSubmit,
  variation,
  variationTypes,
  selectedVariationTypeId,
  title,
}: VariationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    control,
  } = useForm<VariationFormData>({
    resolver: zodResolver(variationFormSchema),
    defaultValues: {
      name: variation?.name || '',
      variationTypeId: variation?.variationTypeId || selectedVariationTypeId || '',
    },
  });

  const selectedTypeId = watch('variationTypeId');
  const selectedType = variationTypes.find((vt) => vt.id === selectedTypeId);

  const handleFormSubmit = async (data: VariationFormData) => {
    try {
      setIsSubmitting(true);
      await onSubmit(data);
      reset();
      onClose();
    } catch (error) {
      // Error handling is done in the parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title}>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        <FormField 
          control={control}
          name="variationTypeId"
          label="Variation Type" 
          error={errors.variationTypeId} 
          required
        >
          {({ value, onChange, onBlur, name, ref, ...props }) => (
            <div>
              <select
                ref={ref}
                name={name}
                value={value}
                onChange={onChange}
                onBlur={onBlur}
                {...props}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.variationTypeId ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={!!variation} // Don't allow changing type when editing
              >
                <option value="">Select a variation type</option>
                {variationTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
              {variation && (
                <p className="text-sm text-gray-500 mt-1">
                  Variation type cannot be changed when editing
                </p>
              )}
            </div>
          )}
        </FormField>

        {selectedType && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-blue-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Variation Type Info</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    <strong>{selectedType.name}</strong> variations{' '}
                    {selectedType.modifiesWeight && selectedType.modifiesDimensions
                      ? 'modify both weight and dimensions'
                      : selectedType.modifiesWeight
                      ? 'modify weight'
                      : selectedType.modifiesDimensions
                      ? 'modify dimensions'
                      : 'are aesthetic only'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <FormInput
            control={control}
            name="name"
            label="Name"
            placeholder="e.g., Red, Large, Cotton"
            error={errors.name}
            required
            description="Enter a unique name for this variation within the selected type"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || !selectedTypeId}>
            {isSubmitting ? 'Saving...' : variation ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}