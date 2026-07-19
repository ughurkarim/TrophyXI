import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { FreeManagerPicker } from "@/components/manager/free-manager-picker";
import { draftEligibleManagers } from "@/data/managers";

const managers = draftEligibleManagers.slice(0, 8);

function PickerHarness({
  onContinue,
  onInspect,
}: {
  onContinue: () => void;
  onInspect: (managerId: string, returnFocus: HTMLElement) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  return (
    <FreeManagerPicker
      managers={managers}
      eraId="all"
      selectedManagerId={selectedId}
      onSelect={setSelectedId}
      onInspect={onInspect}
      onContinue={onContinue}
    />
  );
}

describe("FreeManagerPicker", () => {
  it("keeps the active archive in a compact searchable picker", async () => {
    const user = userEvent.setup();
    render(
      <PickerHarness onContinue={vi.fn()} onInspect={vi.fn()} />,
    );

    expect(screen.getByTestId("free-manager-picker")).toBeVisible();
    expect(
      screen.getAllByRole("button", { name: /^choose .*era fit/i }),
    ).toHaveLength(managers.length);
    expect(
      screen.getByText(
        `${managers.length} of ${managers.length} managers · Neutral / All Eras`,
      ),
    ).toBeVisible();

    const search = screen.getByRole("searchbox", {
      name: "Search managers",
    });
    await user.type(search, managers[0].managerName);

    expect(
      screen.getAllByRole("button", { name: /^choose .*era fit/i }),
    ).toHaveLength(1);
    expect(
      screen.getByRole("button", {
        name: new RegExp(`choose ${managers[0].managerName}`, "i"),
      }),
    ).toBeVisible();
  });

  it("keeps a manager editable until the explicit confirmation", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    const onInspect = vi.fn();
    render(
      <PickerHarness onContinue={onContinue} onInspect={onInspect} />,
    );

    const confirm = screen.getByRole("button", {
      name: /confirm manager/i,
    });
    expect(confirm).toBeDisabled();

    const choices = screen.getAllByRole("button", {
      name: /^choose .*era fit/i,
    });
    const firstChoice = choices[0];
    const secondChoice = choices[1];
    await user.click(firstChoice);
    expect(firstChoice).toHaveAttribute("aria-pressed", "true");
    expect(confirm).toBeEnabled();

    await user.click(secondChoice);
    expect(firstChoice).toHaveAttribute("aria-pressed", "false");
    expect(secondChoice).toHaveAttribute("aria-pressed", "true");
    expect(onContinue).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole("button", {
        name: new RegExp(
          `view manager record for ${managers[1].managerName}, ${managers[1].teamName} ${managers[1].tournamentYear}`,
          "i",
        ),
      }),
    );
    expect(onInspect).toHaveBeenCalledWith(
      managers[1].id,
      expect.any(HTMLElement),
    );

    await user.click(confirm);
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it("exposes the confirmed manager as locked when returning to the picker", () => {
    render(
      <FreeManagerPicker
        managers={managers}
        eraId="all"
        selectedManagerId={managers[0].id}
        managerLocked
        onSelect={vi.fn()}
        onInspect={vi.fn()}
        onContinue={vi.fn()}
      />,
    );

    expect(screen.getAllByText(/selection locked/i)).toHaveLength(2);
    expect(
      screen
        .getAllByRole("button", { name: /^choose .*era fit/i })
        .every((choice) => choice.hasAttribute("disabled")),
    ).toBe(true);
    expect(
      screen.getByRole("button", { name: /continue to formation/i }),
    ).toBeEnabled();
  });
});
