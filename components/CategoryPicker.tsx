"use client";

import { useRef } from "react";
import { categorizeAction } from "@/app/actions";

type Option = { id: string; name: string; group: string };

/** Changing the category saves immediately and teaches the merchant memory. */
export function CategoryPicker({
  transactionId,
  value,
  options,
  groupLabels,
  label,
  placeholder,
}: {
  transactionId: string;
  value: string | null;
  options: Option[];
  groupLabels: Record<string, string>;
  label: string;
  placeholder: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const groups = Object.keys(groupLabels);
  return (
    <form ref={formRef} action={categorizeAction}>
      <input type="hidden" name="transactionId" value={transactionId} />
      <select
        name="categoryId"
        aria-label={label}
        defaultValue={value ?? ""}
        onChange={() => formRef.current?.requestSubmit()}
        className="input max-w-[13rem] px-2 py-1 text-sm"
      >
        {!value && <option value="">{placeholder}</option>}
        {groups.map((g) => (
          <optgroup key={g} label={groupLabels[g]}>
            {options
              .filter((o) => o.group === g)
              .map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
    </form>
  );
}
