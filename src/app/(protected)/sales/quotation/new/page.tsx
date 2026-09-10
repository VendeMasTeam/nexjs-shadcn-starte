import { QuotationView } from 'src/features/sales/views/QuotationView';

interface NewQuotationPageProps {
  searchParams: Promise<{ opportunity_uid?: string }>;
}

export const metadata = {
  title: 'Nueva Cotización | CRM',
};

export default async function NewQuotationPage({ searchParams }: NewQuotationPageProps) {
  const { opportunity_uid = '' } = await searchParams;

  return <QuotationView mode="create" opportunityUid={opportunity_uid} />;
}
