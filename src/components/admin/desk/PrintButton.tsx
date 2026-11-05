"use client";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="h-10 rounded-lg bg-[#0b3d33] px-4 text-[13.5px] font-medium text-white hover:bg-[#0e4a3f]">
      Print / save PDF
    </button>
  );
}
