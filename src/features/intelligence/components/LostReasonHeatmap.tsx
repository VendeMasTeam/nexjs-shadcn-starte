import { useMemo } from 'react';
import { cn } from 'src/lib/utils';
import { SectionCard } from 'src/shared/components/layouts/page';
import { useLostReasonCategories } from 'src/shared/hooks/useTenantOptions';

import type { Competitor, HeatmapCell } from '../types';

interface Props {
  data: HeatmapCell[];
  competitors: Competitor[];
}

function getCellIntensity(count: number, max: number): string {
  if (count === 0 || max === 0) return '';
  const ratio = count / max;
  if (ratio >= 0.75) return 'bg-error/80 text-error-foreground';
  if (ratio >= 0.5) return 'bg-error/40 text-error';
  if (ratio >= 0.25) return 'bg-warning/30 text-warning';
  return 'bg-warning/10 text-warning';
}

export function LostReasonHeatmap({ data, competitors }: Props) {
  const lostReasonCategories = useLostReasonCategories();

  const reasons = useMemo(() => {
    const cats = lostReasonCategories.data as
      | { uid: string; name: string; key: string }[]
      | undefined;
    if (!cats || cats.length === 0) return [];
    return cats;
  }, [lostReasonCategories.data]);

  const reasonLabels = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of reasons) map[r.key] = r.name;
    return map;
  }, [reasons]);
  const cellMap = new Map<string, number>();
  data.forEach((cell) => {
    cellMap.set(`${cell.competitor_uid}-${cell.reason}`, cell.count);
  });

  const maxCount = Math.max(...data.map((c) => c.count), 1);

  const getCount = (competitorUid: string, reasonKey: string) =>
    cellMap.get(`${competitorUid}-${reasonKey}`) ?? 0;

  const rowIds = [...competitors.slice(0, 10).map((c) => c.uid), 'none'];
  const rowNames: Record<string, string> = {
    ...Object.fromEntries(competitors.map((c) => [c.uid, c.name])),
    none: 'Sin competidor',
  };

  return (
    <SectionCard>
      <div className="mb-4">
        <h2 className="text-subtitle2 font-bold text-foreground">Mapa de pérdidas</h2>
        <p className="text-caption text-muted-foreground mt-0.5">
          Competidor × razón de pérdida — intensidad proporcional al volumen
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-caption border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="text-left py-2 pr-4 text-muted-foreground font-medium w-32 shrink-0">
                Competidor
              </th>
              {reasons.map((reason) => (
                <th
                  key={reason.key}
                  className="text-center py-2 px-1 text-muted-foreground font-medium min-w-[72px] max-w-[80px]"
                >
                  <span className="block truncate text-[10px] leading-tight">
                    {reasonLabels[reason.key]}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowIds.map((compUid) => (
              <tr key={compUid}>
                <td className="py-1.5 pr-4 font-medium text-foreground whitespace-nowrap text-xs">
                  {rowNames[compUid]}
                </td>
                {reasons.map((reason) => {
                  const count = getCount(compUid, reason.key);
                  const intensity = getCellIntensity(count, maxCount);
                  return (
                    <td key={reason.key} className="py-1.5 px-1 text-center">
                      <span
                        className={cn(
                          'inline-flex items-center justify-center w-8 h-7 rounded-lg text-xs font-semibold transition-colors',
                          count === 0 ? 'text-muted-foreground/30' : intensity
                        )}
                      >
                        {count === 0 ? '—' : count}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
