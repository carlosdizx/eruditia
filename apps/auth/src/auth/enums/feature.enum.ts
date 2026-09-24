// Modules an organization can have contracted. Stored in the organization's
// metadata (`features`) and checked by FeatureGuard.
enum Feature {
  FINANCE_MODULE = 'finance_module',
  REPORTS_ADVANCED = 'reports:advanced',
  API_EXTERNAL = 'api:external',
}

export default Feature;
