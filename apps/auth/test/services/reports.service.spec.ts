import ReportsService from '@services/reports.service';

describe('ReportsService', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the financial report of the organization', () => {
    const now = new Date('2026-09-23T12:00:00.000Z');
    jest.useFakeTimers({ now });

    expect(new ReportsService().getFinancialReport('org-1')).toEqual({
      organizationId: 'org-1',
      generatedAt: now,
      revenue: 0,
      expenses: 0,
      balance: 0,
    });
  });
});
