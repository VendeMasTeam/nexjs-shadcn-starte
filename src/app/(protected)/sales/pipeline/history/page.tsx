import { OpportunityHistoryView } from 'src/features/sales/views/OpportunityHistoryView';

export const metadata = {
  title: 'Historial de Oportunidades | CRM',
  description: 'Consulta el historial completo de oportunidades del pipeline comercial.',
};

export default function PipelineHistoryPage() {
  return <OpportunityHistoryView />;
}
