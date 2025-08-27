import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import userEvent from "@testing-library/user-event";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

expect.extend(toHaveNoViolations);

describe("Dialog Accessibility", () => {
  it("should have no accessibility violations when open", async () => {
    const { container } = render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
            <DialogDescription>Accessible dialog content</DialogDescription>
          </DialogHeader>
          <Button>Confirm</Button>
        </DialogContent>
      </Dialog>
    );

    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  it("should be dismissible with keyboard", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Dialog open onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Test</DialogTitle>
            <DialogDescription>Press escape to close</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});
