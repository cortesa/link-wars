import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import LoginModal from "../LoginModal";

describe("LoginModal", () => {
  it("should render modal with login message", () => {
    render(<LoginModal onLogin={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByText(/login required/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();
  });

  it("should call onLogin when login button is clicked", async () => {
    const onLogin = vi.fn();
    const user = userEvent.setup();

    render(<LoginModal onLogin={onLogin} onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /login/i }));

    expect(onLogin).toHaveBeenCalled();
  });

  it("should call onClose when close button is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<LoginModal onLogin={vi.fn()} onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: /close/i }));

    expect(onClose).toHaveBeenCalled();
  });

  it("should call onClose when backdrop is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(<LoginModal onLogin={vi.fn()} onClose={onClose} />);

    const backdrop = screen.getByTestId("modal-backdrop");
    await user.click(backdrop);

    expect(onClose).toHaveBeenCalled();
  });

  it("should have proper accessibility attributes", () => {
    render(<LoginModal onLogin={vi.fn()} onClose={vi.fn()} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby");
  });
});
