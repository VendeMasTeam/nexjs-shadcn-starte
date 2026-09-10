import { QuotationView } from 'src/features/sales/views/QuotationView';

interface QuotationPageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: 'Cotización | CRM',
};

export default async function QuotationPage({ params }: QuotationPageProps) {
  const { id } = await params;

  return <QuotationView mode="edit" quotationId={id} />;
}
