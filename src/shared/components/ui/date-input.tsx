'use client';

import { format, isValid, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { DropdownProps } from 'react-day-picker';

import { cn } from '@/lib/utils';

import { Calendar } from './calendar';
import { Icon } from './icon';
import { Input, type InputProps } from './input';
import { Popover, PopoverAnchor, PopoverContent } from './popover';

// ─── Types ────────────────────────────────────────────────────────────────────

type DateInputProps = Omit<InputProps, 'type' | 'value' | 'onChange' | 'rightIcon'> & {
  value?: string; // YYYY-MM-DD
  onChange?: (e: { target: { value: string } }) => void;
  fromYear?: number;
  toYear?: number;
  minDate?: Date;
};

// ─── Segment layout ───────────────────────────────────────────────────────────
// Display: "dd/mm/aaaa"   positions: 01 34 6789
// Seg 0 = day [0,2)  Seg 1 = month [3,5)  Seg 2 = year [6,10)

const SEG_RANGE = [
  [0, 2],
  [3, 5],
  [6, 10],
] as const;

function cursorToSeg(pos: number): number {
  return pos < 3 ? 0 : pos < 6 ? 1 : 2;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoToParts(iso?: string): [string, string, string] {
  if (!iso) return ['', '', ''];
  const d = parseISO(iso);
  if (!isValid(d)) return ['', '', ''];
  return [
    String(d.getDate()).padStart(2, '0'),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getFullYear()).padStart(4, '0'),
  ];
}

function partsToISO(day: string, month: string, year: string): string | null {
  if (day.length !== 2 || month.length !== 2 || year.length !== 4) return null;
  const d = +day,
    m = +month,
    y = +year;
  const date = new Date(y, m - 1, d);
  if (
    isValid(date) &&
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
  )
    return format(date, 'yyyy-MM-dd');
  return null;
}

// Shows the buffer with zero-padding so the user sees progressive input (01, 019, 0198…)
function buildDisplay(day: string, month: string, year: string, seg: number, buf: string): string {
  const dd = seg === 0 && buf ? buf.padStart(2, '0') : day || 'dd';
  const mm = seg === 1 && buf ? buf.padStart(2, '0') : month || 'mm';
  const yy = seg === 2 && buf ? buf.padStart(4, '0') : year || 'aaaa';
  return `${dd}/${mm}/${yy}`;
}

// ─── CalendarDropdown ─────────────────────────────────────────────────────────
// Custom dropdown for month/year inside the calendar.
// Uses position:fixed (no portal) so it never goes off-screen and never
// triggers the parent Popover's onPointerDownOutside.

function CalendarDropdown({ value, onChange, options = [] }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const current = Number(value);

  // Scroll selected item into view when opening
  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      listRef.current
        ?.querySelector<HTMLElement>('[data-sel="true"]')
        ?.scrollIntoView({ block: 'center' });
    });
  }, [open]);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [open]);

  const handleSelect = (v: number) => {
    onChange?.({ target: { value: String(v) } } as React.ChangeEvent<HTMLSelectElement>);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 cursor-pointer items-center gap-0.5 rounded-md pl-2 pr-1 text-sm font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span>{options.find((o) => o.value === current)?.label ?? current}</span>
        <Icon name="ChevronDown" size={13} className="text-muted-foreground" />
      </button>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          className="absolute left-0 top-full z-50 mt-1 w-28 max-h-64 overflow-y-auto overscroll-contain rounded-md border bg-popover p-1 shadow-md [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border"
          onWheel={(e) => e.stopPropagation()}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={opt.value === current}
              data-sel={opt.value === current}
              disabled={opt.disabled}
              className={cn(
                'w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent disabled:pointer-events-none disabled:opacity-50',
                opt.value === current && 'bg-primary text-primary-foreground hover:bg-primary/90'
              )}
              onClick={() => handleSelect(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── DateInput ────────────────────────────────────────────────────────────────

export function DateInput({
  value,
  onChange,
  fromYear,
  toYear,
  minDate,
  ...props
}: DateInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [activeSeg, setActiveSeg] = useState(0);
  const [buf, setBuf] = useState('');
  const [prevValue, setPrevValue] = useState(value);
  const [parts, setParts] = useState<[string, string, string]>(() => isoToParts(value));
  const [dayVal, monthVal, yearVal] = parts;

  if (value !== prevValue) {
    setPrevValue(value);
    setParts(isoToParts(value));
    setBuf('');
  }

  const thisYear = new Date().getFullYear();
  const yearFrom = fromYear ?? thisYear - 100;
  const yearTo = toYear ?? thisYear + 100;

  const pendingSelRef = useRef<number | null>(null);
  const justFocusedRef = useRef(false);

  // Apply pending selection synchronously before paint (keyboard nav)
  useLayoutEffect(() => {
    const seg = pendingSelRef.current;
    if (seg !== null && inputRef.current) {
      const [s, e] = SEG_RANGE[seg];
      inputRef.current.setSelectionRange(s, e);
      pendingSelRef.current = null;
    }
  });

  const startMonth = useMemo(() => {
    const d = new Date(yearFrom, 0, 1);
    d.setFullYear(yearFrom);
    return d;
  }, [yearFrom]);

  const endMonth = useMemo(() => {
    const d = new Date(yearTo, 11, 31);
    d.setFullYear(yearTo);
    return d;
  }, [yearTo]);

  const selected = useMemo(() => {
    const iso = partsToISO(dayVal, monthVal, yearVal);
    if (!iso) return undefined;
    const d = parseISO(iso);
    return isValid(d) ? d : undefined;
  }, [dayVal, monthVal, yearVal]);

  const [month, setMonth] = useState<Date>(() => selected ?? new Date());
  const [prevSelected, setPrevSelected] = useState(selected);
  if (selected !== prevSelected) {
    setPrevSelected(selected);
    if (selected) setMonth(selected);
  }

  const highlight = (seg: number) => {
    pendingSelRef.current = seg;
  };

  const moveTo = (seg: number) => {
    setActiveSeg(seg);
    setBuf('');
    highlight(seg);
  };

  const emitChange = (d: string, m: string, y: string) => {
    onChange?.({ target: { value: partsToISO(d, m, y) ?? '' } });
  };

  const calendarComponents = useMemo(() => ({ Dropdown: CalendarDropdown }), []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const key = e.key;

    if (key === 'ArrowLeft') {
      e.preventDefault();
      if (activeSeg > 0) moveTo(activeSeg - 1);
      return;
    }
    if (key === 'ArrowRight') {
      e.preventDefault();
      if (activeSeg < 2) moveTo(activeSeg + 1);
      return;
    }
    if (key === 'Tab' || key === 'Enter') return;

    if (key === 'Backspace') {
      e.preventDefault();
      if (buf) {
        setBuf('');
        highlight(activeSeg);
        return;
      }
      const next: [string, string, string] = [...parts];
      next[activeSeg] = '';
      setParts(next);
      emitChange(...next);
      highlight(activeSeg);
      return;
    }

    if (!/^\d$/.test(key)) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    const n = +key;

    if (activeSeg === 0) {
      if (!buf) {
        if (n >= 4) {
          const d: [string, string, string] = [`0${key}`, monthVal, yearVal];
          setParts(d);
          emitChange(...d);
          moveTo(1);
        } else {
          setBuf(key);
          highlight(0);
        }
      } else {
        const candidate = buf + key;
        if (+candidate >= 1 && +candidate <= 31) {
          const d: [string, string, string] = [candidate, monthVal, yearVal];
          setParts(d);
          emitChange(...d);
          moveTo(1);
        } else {
          setBuf('');
          highlight(0);
        }
      }
    } else if (activeSeg === 1) {
      if (!buf) {
        if (n >= 2) {
          const d: [string, string, string] = [dayVal, `0${key}`, yearVal];
          setParts(d);
          emitChange(...d);
          moveTo(2);
        } else {
          setBuf(key);
          highlight(1);
        }
      } else {
        const candidate = buf + key;
        if (+candidate >= 1 && +candidate <= 12) {
          const d: [string, string, string] = [dayVal, candidate, yearVal];
          setParts(d);
          emitChange(...d);
          moveTo(2);
        } else {
          setBuf('');
          highlight(1);
        }
      }
    } else {
      const newBuf = buf + key;
      if (newBuf.length === 4) {
        const d: [string, string, string] = [dayVal, monthVal, newBuf];
        setParts(d);
        emitChange(...d);
        setBuf('');
        highlight(2);
      } else {
        setBuf(newBuf);
        highlight(2);
      }
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
    if (!open) setOpen(true);
    if (justFocusedRef.current) {
      justFocusedRef.current = false;
      return;
    }
    const seg = cursorToSeg(e.currentTarget.selectionStart ?? 0);
    moveTo(seg);
  };

  const handleFocus = () => {
    justFocusedRef.current = true;
    moveTo(0);
    // RAF runs after browser places cursor on mouseup — overrides it
    requestAnimationFrame(() => inputRef.current?.setSelectionRange(0, 2));
  };

  // mouseup is when the browser finalises the selection — re-apply ours
  const handleMouseUp = () => {
    const [s, e] = SEG_RANGE[activeSeg];
    inputRef.current?.setSelectionRange(s, e);
  };

  const handleDaySelect = (day: Date | undefined) => {
    if (day) {
      const p = isoToParts(format(day, 'yyyy-MM-dd'));
      setParts(p);
      emitChange(...p);
    } else {
      const p: [string, string, string] = ['', '', ''];
      setParts(p);
      emitChange(...p);
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className="w-full">
          <Input
            {...props}
            ref={inputRef}
            value={buildDisplay(dayVal, monthVal, yearVal, activeSeg, buf)}
            onChange={() => {}}
            onKeyDown={handleKeyDown}
            onClick={handleClick}
            onFocus={handleFocus}
            onMouseUp={handleMouseUp}
            inputMode="numeric"
            inputClassName="font-mono"
            rightIcon={
              <span
                className="pointer-events-auto cursor-pointer"
                onClick={() => setOpen((v) => !v)}
              >
                <Icon name="Calendar" size={16} />
              </span>
            }
          />
        </div>
      </PopoverAnchor>

      <PopoverContent
        className="w-auto p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleDaySelect}
          month={month}
          onMonthChange={setMonth}
          locale={es}
          captionLayout="dropdown"
          startMonth={startMonth}
          endMonth={endMonth}
          disabled={minDate ? { before: minDate } : undefined}
          components={calendarComponents}
        />
      </PopoverContent>
    </Popover>
  );
}
