import { daysUntil, diffDays } from 'src/lib/date';

import type { Opportunity, PipelineStage } from '../types/sales.types';

// ─── Stage colors (fallback palette cuando el backend no manda `stage.color`) ───
// Usado por el chevron del board y por cualquier otro lugar que muestre el
// nombre/badge de una etapa — para que el color sea siempre el mismo por etapa.

export const STAGE_COLOR_PALETTE = [
  { bg: '#93C5FD', accent: '#2563EB', text: '#1E3A8A' },
  { bg: '#7DD3FC', accent: '#0284C7', text: '#0C4A6E' },
  { bg: '#FCD34D', accent: '#D97706', text: '#78350F' },
  { bg: '#86EFAC', accent: '#16A34A', text: '#14532D' },
  { bg: '#C4B5FD', accent: '#7C3AED', text: '#4C1D95' },
  { bg: '#FDA4AF', accent: '#E11D48', text: '#881337' },
  { bg: '#FDBA74', accent: '#EA580C', text: '#7C2D12' },
  { bg: '#A7F3D0', accent: '#059669', text: '#064E3B' },
] as const;

export function getStageColor(stage: PipelineStage, index: number) {
  const fallback = STAGE_COLOR_PALETTE[index % STAGE_COLOR_PALETTE.length];
  return {
    accent: stage.color ?? fallback.accent,
    bg: stage.color ?? fallback.bg,
    text: fallback.text,
  };
}

// ─── Lead Scoring (client-side computation using API data) ─────────────────────

export function computeLeadScore(
  opp: Opportunity,
  stages?: PipelineStage[]
): {
  score: number;
  label: 'hot' | 'warm' | 'cold';
} {
  let score = 0;

  // 1. Recency of activity (0–30 pts) — uses created_at as fallback
  const ref = opp.updated_at ?? opp.created_at;
  if (!ref) return { score: 0, label: 'cold' };
  const daysSince = diffDays(ref);
  if (daysSince <= 2) score += 30;
  else if (daysSince <= 5) score += 20;
  else if (daysSince <= 7) score += 10;

  // 2. Stage probability (0–25 pts)
  const currentStage = stages?.find((s) => s.uid === opp.stage_uid);
  const probability = currentStage?.probability_percent ?? 0;
  score += probability * 0.25;

  // 3. Proximity to close date (0–20 pts)
  const daysToClose = opp.expected_close_date ? daysUntil(opp.expected_close_date) : 0;
  if (daysToClose <= 15) score += 20;
  else if (daysToClose <= 30) score += 15;
  else if (daysToClose <= 60) score += 10;

  // 4. Recency (0–25 pts) — weighted by days since last activity
  if (daysSince <= 3) score += 25;
  else if (daysSince <= 7) score += 15;
  else if (daysSince <= 14) score += 5;

  const total = Math.min(100, Math.round(score));
  return { score: total, label: total >= 70 ? 'hot' : total >= 40 ? 'warm' : 'cold' };
}
