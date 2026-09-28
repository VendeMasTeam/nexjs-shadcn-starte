'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { cn } from 'src/lib/utils';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Icon,
} from 'src/shared/components/ui';

import type { NavItemProps } from './nav-item';
import type { NavSectionData } from './nav-section';

type Props = {
  navData: NavSectionData[];
  className?: string;
};

type SearchEntry = {
  path: string;
  title: string;
  parentTitle?: string;
  icon?: React.ReactNode;
  haystack: string;
};

type SearchGroup = { heading: string; entries: SearchEntry[] };

// Accent- and case-insensitive so "categorias" matches "Categorías".
const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '');

// Only navigable leaves are searchable: a parent with children is just a folder.
function flattenItems(
  items: NavItemProps[],
  heading: string,
  parent?: NavItemProps
): SearchEntry[] {
  return items.flatMap((item) => {
    if (item.children?.length) return flattenItems(item.children, heading, item);

    const words = [item.title, parent?.title, heading].filter(Boolean) as string[];
    return {
      path: item.path,
      title: item.title,
      parentTitle: parent?.title,
      icon: item.icon,
      haystack: normalize(words.join(' ')).toLowerCase(),
    };
  });
}

const subscribeNoop = () => () => {};
const getShortcut = () => (/mac|iphone|ipad/i.test(navigator.userAgent) ? '⌘ K' : 'Ctrl K');

/**
 * Global module search (Ctrl/⌘ + K). Built from the same `navData` the sidebar
 * renders, so it always reflects the user's modules and role — client-side only.
 */
export function NavSearch({ navData, className }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const shortcut = useSyncExternalStore(subscribeNoop, getShortcut, () => 'Ctrl K');

  const groups = useMemo<SearchGroup[]>(
    () =>
      navData
        .map((section) => ({
          heading: section.subheader,
          entries: flattenItems(section.items, section.subheader),
        }))
        .filter((group) => group.entries.length > 0),
    [navData]
  );

  // Own filtering instead of cmdk's fuzzy scorer: it matches scattered letters,
  // so "usuarios" would surface unrelated modules. Every typed word must appear.
  const visibleGroups = useMemo(() => {
    const tokens = normalize(query).toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) return groups;
    return groups
      .map((group) => ({
        ...group,
        entries: group.entries.filter((entry) => tokens.every((t) => entry.haystack.includes(t))),
      }))
      .filter((group) => group.entries.length > 0);
  }, [groups, query]);

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) setQuery('');
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleSelect = useCallback(
    (path: string) => {
      handleOpenChange(false);
      router.push(path);
    },
    [router, handleOpenChange]
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Buscar módulos"
        className={cn(
          'flex items-center gap-2 h-9 px-2.5 sm:px-3 rounded-lg border border-border bg-muted/40',
          'text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors',
          'cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className
        )}
      >
        <Icon name="Search" size={16} className="shrink-0" />
        <kbd className="hidden md:block ml-1 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium">
          {shortcut}
        </kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={handleOpenChange}
        commandProps={{ shouldFilter: false }}
        title="Buscar módulos"
        description="Busca un módulo y navega hacia él"
        className="sm:max-w-xl"
      >
        <CommandInput placeholder="Buscar módulos..." value={query} onValueChange={setQuery} />
        <CommandList className="h-[min(400px,60vh)] max-h-none">
          <CommandEmpty>Sin resultados.</CommandEmpty>
          {visibleGroups.map((group) => (
            <CommandGroup key={group.heading} heading={group.heading}>
              {group.entries.map((entry) => (
                <CommandItem
                  key={entry.path}
                  value={entry.path}
                  onSelect={() => handleSelect(entry.path)}
                  className="gap-3"
                >
                  <span className="flex size-5 shrink-0 items-center justify-center">
                    {entry.icon}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{entry.title}</span>
                  {entry.parentTitle && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {entry.parentTitle}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
