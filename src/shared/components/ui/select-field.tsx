'use client';

import { useId, useState } from 'react';
import { cn } from 'src/lib/utils';

import { Badge } from './badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './command';
import { Icon } from './icon';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export interface SelectFieldProps {
  options: SelectOption[];
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  hint?: string;
  searchable?: boolean;
  onSearch?: (q: string) => void;
  multiple?: boolean;
  disabled?: boolean;
  clearable?: boolean;
  required?: boolean;
  className?: string;
}

export function SelectField({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  label,
  error,
  hint,
  searchable = false,
  onSearch,
  multiple = false,
  disabled = false,
  clearable = false,
  required = false,
  className,
}: SelectFieldProps) {
  const generatedId = useId();
  const id = generatedId;
  const listboxId = `${generatedId}-listbox`;
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState<string | string[]>(multiple ? [] : '');

  const actualValue = value !== undefined ? value : internalValue;

  // Normalizar valor a array internamente
  const selected: string[] = multiple
    ? Array.isArray(actualValue)
      ? actualValue
      : []
    : typeof actualValue === 'string' && actualValue !== ''
      ? [actualValue]
      : [];

  const handleValueChange = (newVal: string | string[]) => {
    setInternalValue(newVal);
    onChange?.(newVal);
  };

  const toggle = (val: string) => {
    if (multiple) {
      const next = selected.includes(val) ? selected.filter((v) => v !== val) : [...selected, val];
      handleValueChange(next);
    } else {
      handleValueChange(selected[0] === val ? '' : val);
      setOpen(false);
    }
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleValueChange(multiple ? [] : '');
  };

  const getLabel = (val: string) => options.find((o) => o.value === val)?.label ?? val;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium leading-none text-foreground">
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </label>
      )}

      <Popover
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) onSearch?.('');
        }}
      >
        <PopoverTrigger asChild disabled={disabled}>
          <button
            id={id}
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-invalid={!!error}
            className={cn(
              'flex min-h-10 w-full min-w-44 items-center justify-between rounded-lg border bg-background px-3 py-2 shadow-sm',
              'text-sm transition-all duration-200 cursor-pointer',
              'disabled:cursor-not-allowed disabled:opacity-50 select-none',
              error
                ? 'border-destructive/80 focus-visible:outline-none focus-visible:border-destructive focus-visible:ring-[3px] focus-visible:ring-destructive/20 text-foreground'
                : open
                  ? 'border-primary ring-[3px] ring-primary/20 outline-none'
                  : 'border-border focus-visible:outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20 hover:border-border/80'
            )}
          >
            {/* Valores seleccionados */}
            <div className="flex flex-1 flex-wrap gap-1 text-left min-w-0 pr-2 overflow-hidden items-center">
              {multiple && selected.length > 0 ? (
                selected.map((val) => (
                  <Badge key={val} color="secondary" className="gap-1 pr-1 truncate max-w-full">
                    <span className="truncate">{getLabel(val)}</span>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle(val);
                      }}
                      className="rounded-full hover:bg-muted ml-0.5 p-0.5 outline-none cursor-pointer"
                    >
                      <Icon name="X" className="h-3 w-3" />
                    </div>
                  </Badge>
                ))
              ) : !multiple && selected[0] ? (
                <span className="truncate block">{getLabel(selected[0])}</span>
              ) : (
                <span className="text-muted-foreground truncate block">{placeholder}</span>
              )}
            </div>

            {/* Acciones derecha */}
            <div className="flex items-center gap-1 shrink-0">
              {clearable && selected.length > 0 && !disabled && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={clear}
                  className="rounded p-0.5 text-muted-foreground hover:text-foreground outline-none cursor-pointer"
                >
                  <Icon name="X" className="h-3.5 w-3.5" />
                </div>
              )}
              <Icon
                name="ChevronsUpDown"
                className="h-4 w-4 shrink-0 text-muted-foreground opacity-50"
              />
            </div>
          </button>
        </PopoverTrigger>

        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] min-w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
        >
          {searchable ? (
            <Command shouldFilter={!onSearch}>
              <CommandInput placeholder="Buscar..." className="h-9" onValueChange={onSearch} />
              <CommandList id={listboxId} onWheelCapture={(e) => e.stopPropagation()}>
                <CommandEmpty>Sin resultados.</CommandEmpty>
                <CommandGroup>
                  {options.map((opt) => (
                    <CommandItem
                      key={opt.value}
                      value={opt.value}
                      disabled={opt.disabled}
                      onSelect={() => toggle(opt.value)}
                      className="gap-2 cursor-pointer"
                    >
                      {opt.icon}
                      {opt.label}
                      {selected.includes(opt.value) && (
                        <Icon name="Check" className="ml-auto h-4 w-4 text-primary" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          ) : (
            <div id={listboxId} role="listbox" className="max-h-60 overflow-auto p-1">
              {options.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Sin resultados.</p>
              ) : (
                options.map((opt) => (
                  <div
                    key={opt.value}
                    role="option"
                    aria-selected={selected.includes(opt.value)}
                    aria-disabled={opt.disabled}
                    onClick={() => !opt.disabled && toggle(opt.value)}
                    className={cn(
                      'relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
                      opt.disabled
                        ? 'pointer-events-none opacity-50'
                        : 'hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    {opt.icon}
                    {opt.label}
                    {selected.includes(opt.value) && (
                      <Icon name="Check" className="ml-auto h-4 w-4 text-primary" />
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </PopoverContent>
      </Popover>

      {error && (
        <p className="text-[0.8rem] font-medium text-destructive" role="alert">
          {error}
        </p>
      )}
      {!error && hint && <p className="text-[0.8rem] text-muted-foreground">{hint}</p>}
    </div>
  );
}
