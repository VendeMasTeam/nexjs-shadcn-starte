import { DocumentTypesView } from 'src/features/settings/views/DocumentTypesView';
import { PermissionGuard } from 'src/shared/auth/guard/permission-guard';

export default function DocumentTypesPage() {
  return (
    <PermissionGuard permission="documents.read">
      <DocumentTypesView />
    </PermissionGuard>
  );
}
