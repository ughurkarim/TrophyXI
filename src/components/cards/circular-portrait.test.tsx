import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CircularPortrait } from "@/components/cards/circular-portrait";

describe("CircularPortrait", () => {
  it("renders licensed context, crop metadata, and a stable size class", () => {
    render(
      <CircularPortrait
        imageId="kylian-mbappe-2018"
        subjectName="Kylian Mbappé"
        era="2010s"
        size="featured"
      />,
    );
    const image = screen.getByRole("img", {
      name: /exact-tournament photograph of kylian mbappé/i,
    });
    expect(image).toBeInTheDocument();
    expect(image.closest(".circular-portrait")).toHaveClass(
      "circular-portrait--featured",
    );
    expect(image.closest(".circular-portrait")).toHaveAttribute(
      "data-image-context",
      "Exact-tournament photograph",
    );
  });

  it("labels conservative licensed face context without a tournament claim", () => {
    render(
      <CircularPortrait
        imageId="pele-1970"
        subjectName="Pelé"
        era="1970s"
      />,
    );
    expect(
      screen.getByRole("img", {
        name: /other licensed face photograph of pelé/i,
      }),
    ).toBeInTheDocument();
  });

  it("renders a draftable non-face Photo Pending identity marker", () => {
    render(
      <CircularPortrait
        imageId="lionel-messi-2014"
        subjectName="Lionel Messi"
        era="2010s"
        statusTier="icon"
        countryCode="ARG"
        tournamentYear={2014}
      />,
    );
    const pending = screen.getByRole("img", {
      name: /photo pending for lionel messi 2014/i,
    });
    expect(pending).toHaveTextContent("LM");
    expect(pending).toHaveTextContent("PHOTO PENDING");
    expect(pending.closest(".circular-portrait")).toHaveAttribute(
      "data-photo-status",
      "pending",
    );
    expect(screen.queryByRole("img", { name: /photograph/i })).not.toBeInTheDocument();
  });
});
