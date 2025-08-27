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
  VariationType,
  CreateVariationTypeData,
  UpdateVariationTypeData,
} from '@/lib/domain/entities/variation-type';

const variationTypeFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Variation type name is required')
    .max(50, 'Variation type name must be 50 characters or less')
    .regex(/^[a-zA-ZÀ-ÿ0-9\s\-_]+$/, 'Name can only contain letters, numbers, spaces, hyphens, and underscores'),
  modifiesWeight: z.boolean(),
  modifiesDimensions: z.boolean(),
});

type VariationTypeFormData = z.infer<typeof variationTypeFormSchema>;

interface VariationTypeFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateVariationTypeData | UpdateVariationTypeData) => Promise<void>;
  variationType?: VariationType;
  title: string;
}

export function VariationTypeForm({
  isOpen,
  onClose,
  onSubmit,
  variationType,
  title,
}: VariationTypeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    control,
  } = useForm<VariationTypeFormData>({
    resolver: zodResolver(variationTypeFormSchema),
    defaultValues: {
      name: variationType?.name || '',
      modifiesWeight: variationType?.modifiesWeight || false,
      modifiesDimensions: variationType?.modifiesDimensions || false,
    },
  });

  const modifiesWeight = watch('modifiesWeight');
  const modifiesDimensions = watch('modifiesDimensions');

  const handleFormSubmit = async (data: VariationTypeFormData) => {
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
        <div className="space-y-2">
          <FormInput
            control={control}
            name="name"
            label="Name"
            placeholder="e.g., Color, Material, Size"
            error={errors.name}
            required
            description="Enter a unique name for this variation type"
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Modification Settings</h3>
          <p className="text-sm text-gray-600">
            Configure how this variation type affects product calculations
          </p>

          <div className="space-y-3">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                {...register('modifiesWeight')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">Modifies Weight</span>
                <p className="text-xs text-gray-500">
                  Variations of this type will override the base product weight
                </p>
              </div>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                {...register('modifiesDimensions')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">Modifies Dimensions</span>
                <p className="text-xs text-gray-500">
                  Variations of this type will override the base product dimensions
                </p>
              </div>
            </label>
          </div>

          {(modifiesWeight || modifiesDimensions) && (
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
                  <h3 className="text-sm font-medium text-blue-800">Important</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      When products use variations of this type, the base product{' '}
                      {modifiesWeight && modifiesDimensions
                        ? 'weight and dimensions'
                        : modifiesWeight
                        ? 'weight'
                        : 'dimensions'}{' '}
                      will be ignored in favor of the variation-specific values.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : variationType ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}