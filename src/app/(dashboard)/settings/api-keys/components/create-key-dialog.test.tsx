import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateKeyDialog } from "./create-key-dialog";

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  newKeyName: "",
  onNameChange: vi.fn(),
  onSubmit: vi.fn(),
  newlyCreatedKey: null,
  copied: false,
  onCopy: vi.fn(),
};

describe("CreateKeyDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders dialog title 'Create API Key' when open is true", () => {
    render(<CreateKeyDialog {...defaultProps} open={true} />);

    expect(screen.getByText("Create API Key")).toBeInTheDocument();
  });

  it("shows name input and Create button when open is true and newlyCreatedKey is null", () => {
    render(
      <CreateKeyDialog {...defaultProps} open={true} newlyCreatedKey={null} />
    );

    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
  });

  it("Create button is disabled when newKeyName is empty string", () => {
    render(
      <CreateKeyDialog {...defaultProps} open={true} newKeyName="" newlyCreatedKey={null} />
    );

    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();
  });

  it("Create button is enabled when newKeyName is non-empty", () => {
    render(
      <CreateKeyDialog
        {...defaultProps}
        open={true}
        newKeyName="my-key"
        newlyCreatedKey={null}
      />
    );

    expect(screen.getByRole("button", { name: "Create" })).not.toBeDisabled();
  });

  it("shows the key text and Copy button when newlyCreatedKey is set", () => {
    const key = "mk_abc123secretkey";
    render(
      <CreateKeyDialog
        {...defaultProps}
        open={true}
        newlyCreatedKey={key}
      />
    );

    expect(screen.getByText(key)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /copy key/i })
    ).toBeInTheDocument();
  });

  it("calls onCopy with the key value when Copy button is clicked", async () => {
    const onCopy = vi.fn();
    const key = "mk_abc123secretkey";
    render(
      <CreateKeyDialog
        {...defaultProps}
        open={true}
        newlyCreatedKey={key}
        onCopy={onCopy}
      />
    );

    const copyButton = screen.getByRole("button", { name: /copy key/i });
    await userEvent.click(copyButton);

    expect(onCopy).toHaveBeenCalledWith(key);
  });
});
