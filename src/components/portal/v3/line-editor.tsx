"use client";

import { Plus, Trash2 } from "lucide-react";
import { LINE_UNITS, formatMoney, lineTotal, type DocumentLine, type LineUnit } from "@/lib/portal-money";
import { Button, inputClass } from "@/components/portal/v2/ui";

const UNITS: LineUnit[] = LINE_UNITS;

/** Editable line grid shared by the quote and invoice editors. */
export function LineEditor({
  lines,
  currency,
  onChange,
}: {
  lines: DocumentLine[];
  currency: string;
  onChange: (next: DocumentLine[]) => void;
}) {
  const update = (index: number, patch: Partial<DocumentLine>) => {
    onChange(lines.map((line, position) => (position === index ? { ...line, ...patch } : line)));
  };

  return (
    <div className="space-y-2">
      <div className="hidden grid-cols-[1fr_110px_80px_70px_90px_90px_32px] gap-1.5 md:grid">
        {["Description", "Category", "Unit", "Qty", "Unit price", "Total", ""].map((head) => (
          <span key={head} className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#7E8CA0]">
            {head}
          </span>
        ))}
      </div>

      {lines.map((line, index) => (
        <div
          key={index}
          className="grid grid-cols-2 gap-1.5 rounded-[10px] border border-white/[0.06] p-2 md:grid-cols-[1fr_110px_80px_70px_90px_90px_32px] md:border-0 md:p-0"
        >
          <input
            value={line.description}
            onChange={(event) => update(index, { description: event.target.value })}
            placeholder="What is being billed"
            className={`${inputClass} col-span-2 md:col-span-1`}
            aria-label={`Line ${index + 1} description`}
          />
          <input
            value={line.category}
            onChange={(event) => update(index, { category: event.target.value })}
            placeholder="category"
            className={inputClass}
            aria-label={`Line ${index + 1} category`}
          />
          <select
            value={line.unit}
            onChange={(event) => update(index, { unit: event.target.value as LineUnit })}
            className={inputClass}
            aria-label={`Line ${index + 1} unit`}
          >
            {UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
          <input
            value={line.quantity}
            onChange={(event) => update(index, { quantity: Number(event.target.value) })}
            inputMode="decimal"
            className={inputClass}
            aria-label={`Line ${index + 1} quantity`}
          />
          <input
            value={line.unit_price}
            onChange={(event) => update(index, { unit_price: Number(event.target.value) })}
            inputMode="decimal"
            className={inputClass}
            aria-label={`Line ${index + 1} unit price`}
          />
          <span className="self-center text-right font-mono text-[11px] text-[#C7D3E3]">
            {formatMoney(lineTotal(line.quantity, line.unit_price), currency)}
          </span>
          <button
            type="button"
            onClick={() => onChange(lines.filter((_, position) => position !== index))}
            className="justify-self-end rounded-full p-1 text-[#7E8CA0] hover:bg-white/10 hover:text-[#FFB4B4]"
            aria-label={`Remove line ${index + 1}`}
          >
            <Trash2 size={13} />
          </button>
        </div>
      ))}

      <Button
        onClick={() =>
          onChange([...lines, { description: "", category: "general", unit: "hour", quantity: 1, unit_price: 0 }])
        }
      >
        <Plus size={13} /> Add line
      </Button>
    </div>
  );
}
