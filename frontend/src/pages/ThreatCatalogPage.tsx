// pages/ThreatCatalogPage.tsx
import PageWrapper from '../components/layout/PageWrapper';
import EmptyState from '../components/common/EmptyState';

export default function ThreatCatalogPage() {
  return (
    <PageWrapper title="Каталог угроз ФСТЭК">
      <EmptyState title="В разработке" message="Каталог угроз с поиском появится в ближайшее время" icon="⚠️" />
    </PageWrapper>
  );
}