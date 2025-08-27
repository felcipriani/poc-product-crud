"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FormInput } from "../forms";
import { AccessibleTable, Pagination } from "../data-table";
import { Modal, LegacyModal, ConfirmModal } from "../modals";
import { LoadingSpinner, LoadingState, TableSkeleton } from "../loading";
import { useToast } from "@/hooks/use-toast";

interface ExampleData {
  id: number;
  name: string;
  email: string;
  status: "active" | "inactive";
}

const mockData: ExampleData[] = [
  { id: 1, name: "John Doe", email: "john@example.com", status: "active" },
  { id: 2, name: "Jane Smith", email: "jane@example.com", status: "inactive" },
  { id: 3, name: "Bob Johnson", email: "bob@example.com", status: "active" },
  { id: 4, name: "Alice Brown", email: "alice@example.com", status: "active" },
  { id: 5, name: "Charlie Wilson", email: "charlie@example.com", status: "inactive" },
];

export function UIShowcase() {
  const { toast } = useToast();
  const { control, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      name: "",
      email: "",
    },
  });

  const [data, setData] = React.useState(mockData);
  const [loading, setLoading] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<keyof ExampleData>("name");
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc" | null>("asc");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [showModal, setShowModal] = React.useState(false);
  const [showConfirmModal, setShowConfirmModal] = React.useState(false);

  const itemsPerPage = 3;
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const paginatedData = data.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const columns = [
    {
      key: "name" as const,
      label: "Name",
      sortable: true,
    },
    {
      key: "email" as const,
      label: "Email",
      sortable: true,
    },
    {
      key: "status" as const,
      label: "Status",
      sortable: true,
      render: (value: string | number) => (
        <span
          className={`px-2 py-1 rounded-full text-xs ${
            value === "active"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {value}
        </span>
      ),
    },
  ];

  const handleSort = (key: keyof ExampleData, direction: "asc" | "desc" | null) => {
    setSortBy(key);
    setSortDirection(direction);
    
    if (direction) {
      const sorted = [...data].sort((a, b) => {
        const aVal = String(a[key]);
        const bVal = String(b[key]);
        return direction === "asc" 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      });
      setData(sorted);
    } else {
      setData(mockData); // Reset to original order
    }
  };

  const onSubmit = (formData: any) => {
    toast({
      title: "Form Submitted",
      description: `Name: ${formData.name}, Email: ${formData.email}`,
    });
  };

  const simulateLoading = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast({
        title: "Loading Complete",
        description: "Data has been loaded successfully",
      });
    }, 2000);
  };

  const handleConfirm = () => {
    toast({
      title: "Action Confirmed",
      description: "The action has been completed",
    });
  };

  const showErrorToast = () => {
    toast({
      title: "Error",
      description: "Something went wrong",
      variant: "destructive",
    });
  };

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold mb-2">UI Components Showcase</h1>
        <p className="text-muted-foreground">
          Demonstration of all the UI components with accessibility features
        </p>
      </div>

      {/* Form Components */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Form Components</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
          <FormInput
            control={control}
            name="name"
            label="Full Name"
            description="Enter your full name"
            required
            error={errors.name}
            placeholder="John Doe"
          />
          <FormInput
            control={control}
            name="email"
            label="Email Address"
            description="We'll never share your email"
            required
            error={errors.email}
            type="email"
            placeholder="john@example.com"
          />
          <Button type="submit">Submit Form</Button>
        </form>
      </section>

      {/* Table Components */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Data Table</h2>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={simulateLoading} disabled={loading}>
              {loading ? <LoadingSpinner size="sm" /> : null}
              Simulate Loading
            </Button>
          </div>
          
          <LoadingState
            loading={loading}
            fallback={<TableSkeleton rows={3} columns={3} />}
          >
            <AccessibleTable
              data={paginatedData}
              columns={columns}
              sortBy={sortBy}
              sortDirection={sortDirection}
              onSort={handleSort}
              caption="Example user data table with sorting and pagination"
              rowKey={(row) => row.id}
            />
            
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={data.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              className="mt-4"
            />
          </LoadingState>
        </div>
      </section>

      {/* Modal Components */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Modal Components</h2>
        <div className="flex gap-2">
          <Button onClick={() => setShowModal(true)}>
            Open Modal
          </Button>
          <Button 
            onClick={() => setShowConfirmModal(true)}
            variant="destructive"
          >
            Open Confirm Modal
          </Button>
        </div>

        <LegacyModal
          open={showModal}
          onOpenChange={setShowModal}
          title="Example Modal"
          description="This is a demonstration of the modal component"
          footer={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button onClick={() => setShowModal(false)}>
                Save Changes
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <p>This is the modal content area. You can put any content here.</p>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm">Example content block</p>
            </div>
          </div>
        </LegacyModal>

        <ConfirmModal
          open={showConfirmModal}
          onOpenChange={setShowConfirmModal}
          title="Confirm Deletion"
          description="Are you sure you want to delete this item? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          variant="destructive"
          onConfirm={handleConfirm}
        />
      </section>

      {/* Toast Components */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Toast Notifications</h2>
        <div className="flex gap-2">
          <Button onClick={() => toast({ title: "Success", description: "Operation completed successfully" })}>
            Success Toast
          </Button>
          <Button onClick={showErrorToast} variant="destructive">
            Error Toast
          </Button>
          <Button 
            onClick={() => toast({ 
              title: "Info", 
              description: "This is an informational message" 
            })}
            variant="outline"
          >
            Info Toast
          </Button>
        </div>
      </section>

      {/* Loading Components */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Loading States</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h3 className="font-medium">Loading Spinners</h3>
            <div className="flex items-center gap-4">
              <LoadingSpinner size="sm" />
              <LoadingSpinner size="md" />
              <LoadingSpinner size="lg" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-medium">Skeleton Loading</h3>
            <TableSkeleton rows={2} columns={3} />
          </div>
        </div>
      </section>
    </div>
  );
}