import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { TaxInvoice, InvoiceDirection } from '../tax-invoices/entities/tax-invoice.entity';
import { Expense, ExpenseCategory } from '../expenses/entities/expense.entity';

export interface MonthlyTrend {
  month: number;
  salesAmount: number;
  purchaseAmount: number;
}

export interface CategorySummary {
  category: ExpenseCategory;
  total: number;
}

export interface DashboardSummary {
  salesSupplyAmount: number;
  salesTaxAmount: number;
  purchaseSupplyAmount: number;
  purchaseTaxAmount: number;
  estimatedVat: number;
  totalExpenses: number;
  monthlyTrend: MonthlyTrend[];
  categoryBreakdown: CategorySummary[];
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(TaxInvoice)
    private readonly invoiceRepository: Repository<TaxInvoice>,
    @InjectRepository(Expense)
    private readonly expenseRepository: Repository<Expense>,
  ) {}

  async getCurrentYearSummary(userId: number, year?: number): Promise<DashboardSummary> {
    const targetYear = year ?? new Date().getFullYear();
    const startDate = new Date(targetYear, 0, 1);
    const endDate = new Date(targetYear, 11, 31);

    const [invoices, expenses] = await Promise.all([
      this.invoiceRepository.find({
        where: { userId, issueDate: Between(startDate, endDate) },
      }),
      this.expenseRepository.find({
        where: { userId, expenseDate: Between(startDate, endDate) },
      }),
    ]);

    const salesInvoices = invoices.filter((inv) => inv.direction === InvoiceDirection.SALES);
    const purchaseInvoices = invoices.filter((inv) => inv.direction === InvoiceDirection.PURCHASE);

    const salesSupplyAmount = this.sumField(salesInvoices, 'supplyAmount');
    const salesTaxAmount = this.sumField(salesInvoices, 'taxAmount');
    const purchaseSupplyAmount = this.sumField(purchaseInvoices, 'supplyAmount');
    const purchaseTaxAmount = this.sumField(purchaseInvoices, 'taxAmount');
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    return {
      salesSupplyAmount,
      salesTaxAmount,
      purchaseSupplyAmount,
      purchaseTaxAmount,
      estimatedVat: salesTaxAmount - purchaseTaxAmount,
      totalExpenses,
      monthlyTrend: this.buildMonthlyTrend(invoices),
      categoryBreakdown: this.buildCategoryBreakdown(expenses),
    };
  }

  private buildMonthlyTrend(invoices: TaxInvoice[]): MonthlyTrend[] {
    return Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const monthInvoices = invoices.filter(
        (inv) => new Date(inv.issueDate).getMonth() + 1 === month,
      );

      return {
        month,
        salesAmount: this.sumField(
          monthInvoices.filter((inv) => inv.direction === InvoiceDirection.SALES),
          'supplyAmount',
        ),
        purchaseAmount: this.sumField(
          monthInvoices.filter((inv) => inv.direction === InvoiceDirection.PURCHASE),
          'supplyAmount',
        ),
      };
    });
  }

  private buildCategoryBreakdown(expenses: Expense[]): CategorySummary[] {
    const categoryMap = new Map<ExpenseCategory, number>();

    for (const expense of expenses) {
      const current = categoryMap.get(expense.category) ?? 0;
      categoryMap.set(expense.category, current + Number(expense.amount));
    }

    return Array.from(categoryMap.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);
  }

  private sumField(invoices: TaxInvoice[], field: 'supplyAmount' | 'taxAmount'): number {
    return invoices.reduce((sum, inv) => sum + Number(inv[field]), 0);
  }
}
