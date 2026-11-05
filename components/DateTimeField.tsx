"use client";

import { useEffect, useRef, useState } from "react";
import { costaRicaInputValue, formatDate, parseCostaRicaInput } from "@/lib/format";
import type { Lang } from "@/lib/i18n";

function readParts(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hour24 = Number(match[4]);
  return {
    year: Number(match[1]),
    month: Number(match[2]) - 1,
    day: Number(match[3]),
    hour12: hour24 % 12 || 12,
    minute: Number(match[5]),
    pm: hour24 >= 12,
  };
}

function writeValue(year: number, month: number, day: number, hour12: number, minute: number, pm: boolean) {
  let hour = hour12 % 12;
  if (pm) hour += 12;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(month + 1)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
}

function monthCells(year: number, month: number) {
  const first = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const lead = (first + 6) % 7;
  const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: Array<number | null> = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= count; day += 1) cells.push(day);
  while (cells.length % 7) cells.push(null);
  return cells;
}

export function DateTimeField({
  name,
  defaultValue,
  lang,
  label,
  hint,
}: {
  name: string;
  defaultValue: string;
  lang: Lang;
  label: string;
  hint: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const parts = readParts(value) ?? readParts(costaRicaInputValue())!;
  const [view, setView] = useState({ year: parts.year, month: parts.month });

  useEffect(() => {
    const form = wrapRef.current?.closest("form");
    if (!form) return;
    const onReset = () => {
      const next = costaRicaInputValue();
      setValue(next);
      const nextParts = readParts(next);
      if (nextParts) setView({ year: nextParts.year, month: nextParts.month });
    };
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const locale = lang === "es" ? "es-CR" : "en-US";
  const monthName = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(view.year, view.month, 1)),
  );
  const monthTitle = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(locale, { weekday: "narrow", timeZone: "UTC" }).format(new Date(Date.UTC(2024, 0, index + 1))),
  );
  const shown = parseCostaRicaInput(value);
  const minutes = Array.from(new Set([parts.minute, ...Array.from({ length: 12 }, (_, index) => index * 5)])).sort((a, b) => a - b);

  const chooseDay = (day: number) => {
    setValue(writeValue(view.year, view.month, day, parts.hour12, parts.minute, parts.pm));
  };
  const shiftMonth = (delta: number) => {
    const next = new Date(Date.UTC(view.year, view.month + delta, 1));
    setView({ year: next.getUTCFullYear(), month: next.getUTCMonth() });
  };

  return (
    <div ref={wrapRef} className="relative">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <input type="hidden" name={name} value={value} />
      <button type="button" className="input text-left" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        {shown ? formatDate(shown, lang, true) : value}
      </button>
      {open && (
        <div className="card absolute z-30 mt-1 w-full max-w-xs p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between gap-2">
            <button type="button" className="btn-ghost px-2" onClick={() => shiftMonth(-1)} aria-label="←">
              ←
            </button>
            <p className="text-sm font-semibold">{monthTitle}</p>
            <button type="button" className="btn-ghost px-2" onClick={() => shiftMonth(1)} aria-label="→">
              →
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500">
            {weekdays.map((day, index) => (
              <span key={`${day}-${index}`}>{day}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {monthCells(view.year, view.month).map((day, index) =>
              day ? (
                <button
                  key={day}
                  type="button"
                  onClick={() => chooseDay(day)}
                  className={`h-8 rounded-lg text-sm ${
                    day === parts.day && view.year === parts.year && view.month === parts.month ? "bg-brand font-semibold text-white" : "hover:bg-brand-soft"
                  }`}
                >
                  {day}
                </button>
              ) : (
                <span key={`empty-${index}`} />
              ),
            )}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <select
              aria-label={label}
              className="input"
              value={parts.hour12}
              onChange={(event) => setValue(writeValue(parts.year, parts.month, parts.day, Number(event.target.value), parts.minute, parts.pm))}
            >
              {Array.from({ length: 12 }, (_, index) => index + 1).map((hour) => (
                <option key={hour} value={hour}>
                  {hour}
                </option>
              ))}
            </select>
            <select
              aria-label={label}
              className="input"
              value={parts.minute}
              onChange={(event) => setValue(writeValue(parts.year, parts.month, parts.day, parts.hour12, Number(event.target.value), parts.pm))}
            >
              {minutes.map((minute) => (
                <option key={minute} value={minute}>
                  {String(minute).padStart(2, "0")}
                </option>
              ))}
            </select>
            <select
              aria-label={label}
              className="input"
              value={parts.pm ? "pm" : "am"}
              onChange={(event) =>
                setValue(writeValue(parts.year, parts.month, parts.day, parts.hour12, parts.minute, event.target.value === "pm"))
              }
            >
              <option value="am">a. m.</option>
              <option value="pm">p. m.</option>
            </select>
          </div>
        </div>
      )}
      <span className="mt-1 block text-xs text-slate-500">{hint}</span>
    </div>
  );
}
