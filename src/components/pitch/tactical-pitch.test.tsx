import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TacticalPitch } from "@/components/pitch/tactical-pitch";
import { getFormation } from "@/data/formations";
import { playersById } from "@/data/players";

describe("TacticalPitch", () => {
  it("keeps a node at the exact same coordinates through selection", async () => {
    const user = userEvent.setup();
    const onSelectSlot = vi.fn();
    const { rerender } = render(
      <TacticalPitch
        formation={getFormation("4-3-3")}
        selectedSlotId={null}
        onSelectSlot={onSelectSlot}
      />,
    );
    const node = screen.getByRole("button", { name: /^ST: empty/i });
    const before = {
      left: node.style.left,
      top: node.style.top,
      x: node.dataset.slotX,
      y: node.dataset.slotY,
    };
    await user.click(node);
    rerender(
      <TacticalPitch
        formation={getFormation("4-3-3")}
        selectedSlotId="st"
        onSelectSlot={onSelectSlot}
      />,
    );
    const selected = screen.getByRole("button", { name: /^ST: empty/i });
    expect({
      left: selected.style.left,
      top: selected.style.top,
      x: selected.dataset.slotX,
      y: selected.dataset.slotY,
    }).toEqual(before);
    expect(selected).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps focus, compact/mobile rendering, and filled state on the same center", async () => {
    const user = userEvent.setup();
    const formation = getFormation("4-3-3");
    const { rerender } = render(
      <TacticalPitch
        formation={formation}
        compact
        onSelectSlot={vi.fn()}
      />,
    );
    const empty = screen.getByRole("button", { name: /^GK: empty/i });
    const center = {
      left: empty.style.left,
      top: empty.style.top,
      x: empty.dataset.slotX,
      y: empty.dataset.slotY,
    };
    await user.tab();
    expect(empty).toHaveFocus();
    expect({
      left: empty.style.left,
      top: empty.style.top,
      x: empty.dataset.slotX,
      y: empty.dataset.slotY,
    }).toEqual(center);

    const goalkeeper = playersById.get("manuel-neuer-2014")!;
    rerender(
      <TacticalPitch
        formation={formation}
        compact
        lineup={[goalkeeper]}
        picks={[{ slotId: "gk", cardId: goalkeeper.id }]}
      />,
    );
    const filled = screen.getByLabelText(/GK: Manuel Neuer 2014/i);
    expect({
      left: filled.style.left,
      top: filled.style.top,
      x: filled.dataset.slotX,
      y: filled.dataset.slotY,
    }).toEqual(center);
    expect(filled).toHaveClass("pitch-node--filled");
  });

  it("renders labeled green, yellow, red, and incompatible fit previews", () => {
    const formation = getFormation("4-3-3");
    render(
      <TacticalPitch
        formation={formation}
        onSelectSlot={vi.fn()}
        fitPreviews={[
          {
            slotId: "lb",
            fit: 96,
            state: "green",
            label: "Strong Fit",
            penaltyPercent: 0,
            canPlace: true,
            feasibilityBlocked: false,
          },
          {
            slotId: "lcb",
            fit: 82,
            state: "yellow",
            label: "Adaptable",
            penaltyPercent: 7,
            canPlace: true,
            feasibilityBlocked: false,
          },
          {
            slotId: "rcb",
            fit: 58,
            state: "red",
            label: "Awkward Fit",
            penaltyPercent: 18,
            canPlace: true,
            feasibilityBlocked: false,
          },
          {
            slotId: "gk",
            fit: 0,
            state: "incompatible",
            label: "Incompatible",
            penaltyPercent: 25,
            canPlace: false,
            feasibilityBlocked: false,
          },
        ]}
      />,
    );
    const leftBack = screen.getByRole("button", {
      name: /LB\. Strong Fit, 96 percent/i,
    });
    expect(leftBack).toHaveClass("pitch-node--fit-green");
    expect(leftBack).toHaveClass("pitch-node--near-left");
    expect(leftBack).not.toHaveTextContent("−0%");
    expect(
      screen.getByRole("button", { name: /LCB\. Adaptable, 82 percent/i }),
    ).toHaveClass("pitch-node--fit-yellow");
    expect(
      screen.getByRole("button", { name: /RCB\. Awkward Fit, 58 percent/i }),
    ).toHaveClass("pitch-node--fit-red");
    const incompatibleGoalkeeperSlot = screen.getByRole("button", {
      name: /GK\. Incompatible, 0 percent/i,
    });
    expect(incompatibleGoalkeeperSlot).toHaveAttribute("aria-disabled", "true");
    expect(incompatibleGoalkeeperSlot).toHaveClass(
      "pitch-node--fit-label-above",
    );
    expect(incompatibleGoalkeeperSlot).toHaveClass("pitch-node--near-bottom");
    expect(incompatibleGoalkeeperSlot.querySelector(".pitch-node__fit"))
      .toHaveTextContent("POSITION FIT0%Incompatible");
  });

  it("previews exact slots on hover and keyboard focus without moving nodes", async () => {
    const user = userEvent.setup();
    const onPreviewSlot = vi.fn();
    render(
      <TacticalPitch
        formation={getFormation("4-3-3")}
        onSelectSlot={vi.fn()}
        onPreviewSlot={onPreviewSlot}
        fitPreviews={[
          {
            slotId: "lb",
            fit: 96,
            state: "green",
            label: "Strong Fit",
            penaltyPercent: 1,
            canPlace: true,
            feasibilityBlocked: false,
          },
        ]}
      />,
    );
    const node = screen.getByRole("button", {
      name: /LB\. Strong Fit, 96 percent/i,
    });
    const coordinates = {
      left: node.style.left,
      top: node.style.top,
      x: node.dataset.slotX,
      y: node.dataset.slotY,
    };
    await user.hover(node);
    expect(onPreviewSlot).toHaveBeenLastCalledWith("lb");
    await user.unhover(node);
    expect(onPreviewSlot).toHaveBeenLastCalledWith(null);
    node.focus();
    expect(onPreviewSlot).toHaveBeenLastCalledWith("lb");
    expect({
      left: node.style.left,
      top: node.style.top,
      x: node.dataset.slotX,
      y: node.dataset.slotY,
    }).toEqual(coordinates);
  });
});
