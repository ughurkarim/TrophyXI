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

  it("renders Messi's exact 2006 image in a filled XI node", () => {
    const messi = playersById.get("lionel-messi-2006")!;
    render(
      <TacticalPitch
        formation={getFormation("4-3-3")}
        lineup={[messi]}
        picks={[{ slotId: "rw", cardId: messi.id }]}
      />,
    );

    expect(
      screen.getByRole("img", { name: /lionel messi 2006 portrait/i }),
    ).toHaveAttribute(
      "src",
      expect.stringMatching(
        /^\/assets\/players\/2006\/lionel-messi-2006\.png\?v=/,
      ),
    );
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
    const leftCenterBack = screen.getByRole("button", {
      name: /CB\. Adaptable, 82 percent/i,
    });
    expect(leftCenterBack).toHaveClass("pitch-node--fit-yellow");
    expect(leftCenterBack).not.toHaveClass("pitch-node--fit-label-above");
    const rightCenterBack = screen.getByRole("button", {
      name: /CB\. Awkward Fit, 58 percent/i,
    });
    expect(rightCenterBack).toHaveClass("pitch-node--fit-red");
    expect(rightCenterBack).not.toHaveClass("pitch-node--fit-label-above");
    const incompatibleGoalkeeperSlot = screen.getByRole("button", {
      name: /GK\. Incompatible, 0 percent/i,
    });
    expect(incompatibleGoalkeeperSlot).toHaveAttribute("aria-disabled", "true");
    expect(incompatibleGoalkeeperSlot).toHaveClass(
      "pitch-node--fit-label-above",
    );
    expect(incompatibleGoalkeeperSlot).toHaveClass("pitch-node--near-bottom");
    expect(incompatibleGoalkeeperSlot.querySelector(".pitch-node__fit"))
      .toHaveTextContent("GK0%");
    expect(incompatibleGoalkeeperSlot).toHaveAttribute(
      "title",
      expect.stringMatching(/Incompatible, 0 percent/i),
    );
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

  it("accepts a valid goalkeeper at the fixed GK coordinates without a zero penalty", async () => {
    const user = userEvent.setup();
    const onSelectSlot = vi.fn();
    render(
      <TacticalPitch
        formation={getFormation("3-5-2")}
        onSelectSlot={onSelectSlot}
        fitPreviews={[
          {
            slotId: "gk",
            fit: 100,
            state: "green",
            label: "Perfect Fit",
            penaltyPercent: 0,
            canPlace: true,
            feasibilityBlocked: false,
          },
        ]}
      />,
    );

    const goalkeeperSlot = screen.getByRole("button", {
      name: /GK\. Perfect Fit, 100 percent\. No placement penalty/i,
    });
    expect(goalkeeperSlot).toHaveStyle({ left: "50%", top: "91%" });
    expect(goalkeeperSlot).toHaveClass("pitch-node--fit-label-above");
    expect(goalkeeperSlot).toHaveClass("pitch-node--near-bottom");
    expect(goalkeeperSlot).toHaveClass("pitch-node--goalkeeper");
    expect(goalkeeperSlot).toHaveAttribute("data-slot-position", "GK");
    for (const node of screen.getAllByRole("button", {
      name: /^CB: empty/i,
    })) {
      expect(node).toHaveClass("pitch-node--low-center-back");
      expect(node).toHaveAttribute("data-slot-position", "CB");
    }
    expect(goalkeeperSlot).not.toHaveTextContent("−0%");
    const coordinates = {
      left: goalkeeperSlot.style.left,
      top: goalkeeperSlot.style.top,
      x: goalkeeperSlot.dataset.slotX,
      y: goalkeeperSlot.dataset.slotY,
    };
    goalkeeperSlot.focus();
    await user.click(goalkeeperSlot);
    expect(onSelectSlot).toHaveBeenCalledWith("gk");
    expect({
      left: goalkeeperSlot.style.left,
      top: goalkeeperSlot.style.top,
      x: goalkeeperSlot.dataset.slotX,
      y: goalkeeperSlot.dataset.slotY,
    }).toEqual(coordinates);
  });
});
