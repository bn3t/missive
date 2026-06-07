import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormField } from "./form-field";

describe("FormField", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders label associated with the input", () => {
    render(
      <FormField id="name" label="Name" value="" onChange={() => {}} />
    );

    expect(screen.getByLabelText("Name")).toBeInTheDocument();
  });

  it("renders input with the provided value", () => {
    render(
      <FormField id="name" label="Name" value="Alice" onChange={() => {}} />
    );

    expect(screen.getByLabelText("Name")).toHaveValue("Alice");
  });

  it("calls onChange with the new value when typing", async () => {
    const onChange = vi.fn();
    render(
      <FormField id="name" label="Name" value="" onChange={onChange} />
    );

    const input = screen.getByLabelText("Name");
    await userEvent.type(input, "A");

    expect(onChange).toHaveBeenCalledWith("A");
  });

  it("calls onKeyDown when Enter is pressed", async () => {
    const onKeyDown = vi.fn();
    render(
      <FormField
        id="name"
        label="Name"
        value=""
        onChange={() => {}}
        onKeyDown={onKeyDown}
      />
    );

    const input = screen.getByLabelText("Name");
    await userEvent.type(input, "{Enter}");

    expect(onKeyDown).toHaveBeenCalled();
    const event = onKeyDown.mock.calls[0][0];
    expect(event.key).toBe("Enter");
  });

  it("renders without error when onKeyDown is not provided", () => {
    expect(() =>
      render(
        <FormField id="name" label="Name" value="" onChange={() => {}} />
      )
    ).not.toThrow();
  });

  it("disables the input when disabled prop is true", () => {
    render(
      <FormField id="name" label="Name" value="" onChange={() => {}} disabled />
    );

    expect(screen.getByLabelText("Name")).toBeDisabled();
  });
});
