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
  it("keeps the manager pool ranked, filtered, and searchable", async () => {
    const user = userEvent.setup();
    render(
      <PickerHarness onContinue={vi.fn()} onInspect={vi.fn()} />,
    );

    expect(screen.getByTestId("free-manager-picker")).toBeVisible();
    expect(
      screen.getAllByRole("button", { name: /^choose /i }),
    ).toHaveLength(managers.length);
    expect(
      screen.getByText(new RegExp(`${managers.length} of ${managers.length} managers`, "i")),
    ).toBeVisible();
    expect(screen.getByLabelText("Manager nation")).toBeVisible();
    expect(screen.getByLabelText("Manager era")).toBeVisible();
    expect(screen.getByLabelText("Tactical style")).toBeVisible();
    expect(screen.getByLabelText("Preferred formation")).toBeVisible();
    expect(screen.getByLabelText("Sort managers")).toHaveValue("quality");
    expect(screen.queryByText("ERA FIT")).not.toBeInTheDocument();

    const search = screen.getByRole("searchbox", {
      name: "Search managers",
    });
    await user.type(search, managers[0].managerName);

    expect(
      screen.getAllByRole("button", { name: /^choose /i }),
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

    const firstChoice = screen.getByRole("button", {
      name: new RegExp(`choose ${managers[0].managerName}.*${managers[0].tournamentYear}`, "i"),
    });
    const secondChoice = screen.getByRole("button", {
      name: new RegExp(`choose ${managers[1].managerName}.*${managers[1].tournamentYear}`, "i"),
    });
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
          `view profile for ${managers[1].managerName}, ${managers[1].teamName} ${managers[1].tournamentYear}`,
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

  it("keeps a previously confirmed manager editable when returning", () => {
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

    expect(
      screen
        .getAllByRole("button", { name: /^choose /i })
        .every((choice) => !choice.hasAttribute("disabled")),
    ).toBe(true);
    expect(
      screen.getByRole("button", { name: /confirm manager/i }),
    ).toBeEnabled();
  });
});
