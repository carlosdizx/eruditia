import { Injectable } from '@nestjs/common';

export interface FinancialReport {
  organizationId: string;
  generatedAt: Date;
  revenue: number;
  expenses: number;
  balance: number;
}

// Example endpoint backing: demonstrates the feature + role guards. Returns
// an empty report until there is real financial data to aggregate.
@Injectable()
export default class ReportsService {
  public getFinancialReport(organizationId: string): FinancialReport {
    return {
      organizationId,
      generatedAt: new Date(),
      revenue: 0,
      expenses: 0,
      balance: 0,
    };
  }
}
