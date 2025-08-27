import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { FormInput } from "@/components/shared/forms/form-input";

// Test wrapper component
function TestFormInput(props: any) {
  const { control } = useForm({
    defaultValues: { testField: "" },
  });

  return (
    <FormInput
      control={control}
      name="testField"
      label="Test Field"
      {...props}
    />
  );
}

describe("FormInput", () => {
  it("renders with label and input", () => {
    render(<TestFormInput />);
    
    expect(screen.getByLabelText("Test Field")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("shows required indicator when required", () => {
    render(<TestFormInput required />);
    
    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("shows description when provided", () => {
    const description = "This is a test description";
    render(<TestFormInput description={description} />);
    
    expect(screen.getByText(description)).toBeInTheDocument();
  });

  it("shows error message when error is provided", () => {
    const error = { message: "This field is required" };
    render(<TestFormInput error={error} />);
    
    expect(screen.getByText("This field is required")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("sets aria-invalid when error is present", () => {
    const error = { message: "This field is required" };
    render(<TestFormInput error={error} />);
    
    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("allows user input", async () => {
    const user = userEvent.setup();
    render(<TestFormInput />);
    
    const input = screen.getByRole("textbox");
    await user.type(input, "test value");
    
    expect(input).toHaveValue("test value");
  });
});