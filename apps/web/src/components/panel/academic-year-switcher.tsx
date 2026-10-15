import { getSelectedAcademicYear } from '@/lib/academic-year/selected-year';
import { AcademicYearSelect } from './academic-year-select';

// Selector global del año lectivo; no aparece sin permiso o sin años.
export async function AcademicYearSwitcher() {
  const { years, selected } = await getSelectedAcademicYear();
  if (!selected) return null;

  return <AcademicYearSelect years={[...years]} selectedId={selected.id} />;
}
