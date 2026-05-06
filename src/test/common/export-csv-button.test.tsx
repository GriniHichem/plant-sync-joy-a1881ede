import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { ExportCsvButton } from "@/components/common/ExportCsvButton";

vi.mock("@/lib/exportCsv", () => ({ exportToCsv: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { exportToCsv } from "@/lib/exportCsv";
import { toast } from "sonner";

describe("ExportCsvButton", () => {
  beforeEach(() => vi.clearAllMocks());

  it("disabled when data empty", () => {
    const { container } = render(
      <ExportCsvButton data={[]} columns={[{ key: "a", label: "A" }]} filename="x" />
    );
    const btn = container.querySelector("button")!;
    expect(btn.hasAttribute("disabled")).toBe(true);
  });

  it("calls exportToCsv with filtered data and shows toast", () => {
    const data = [{ a: 1 }, { a: 2 }];
    const cols = [{ key: "a", label: "A" }];
    const { container } = render(<ExportCsvButton data={data} columns={cols} filename="x" />);
    fireEvent.click(container.querySelector("button")!);
    expect(exportToCsv).toHaveBeenCalledWith(data, cols, "x");
    expect((toast as any).success).toHaveBeenCalledWith("2 ligne(s) exportée(s)");
  });
});
