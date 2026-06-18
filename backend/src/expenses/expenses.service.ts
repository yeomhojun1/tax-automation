import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense, ExpenseCategory } from './entities/expense.entity';
import { CreateExpenseDto } from './dtos/create-expense.dto';
import { UpdateExpenseDto } from './dtos/update-expense.dto';

export interface ExpenseQueryFilter {
  year?: number;
  month?: number;
  category?: ExpenseCategory;
  search?: string;
}

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private readonly expenseRepository: Repository<Expense>,
  ) {}

  async findAll(userId: number, filter: ExpenseQueryFilter): Promise<Expense[]> {
    const query = this.expenseRepository
      .createQueryBuilder('expense')
      .where('expense.userId = :userId', { userId });

    if (filter.year) {
      query.andWhere('EXTRACT(YEAR FROM expense.expenseDate) = :year', { year: filter.year });
    }

    if (filter.month) {
      query.andWhere('EXTRACT(MONTH FROM expense.expenseDate) = :month', { month: filter.month });
    }

    if (filter.category) {
      query.andWhere('expense.category = :category', { category: filter.category });
    }

    if (filter.search) {
      query.andWhere('expense.description ILIKE :search', { search: `%${filter.search}%` });
    }

    return query.orderBy('expense.expenseDate', 'DESC').getMany();
  }

  async create(userId: number, dto: CreateExpenseDto): Promise<Expense> {
    const expense = this.expenseRepository.create({
      ...dto,
      userId,
      receiptFileKey: dto.receiptFileKey ?? null,
      taxInvoiceId: dto.taxInvoiceId ?? null,
      expenseDate: new Date(dto.expenseDate),
    });
    return this.expenseRepository.save(expense);
  }

  async update(userId: number, expenseId: number, dto: UpdateExpenseDto): Promise<Expense> {
    const expense = await this.expenseRepository.findOne({ where: { id: expenseId } });
    if (!expense) {
      throw new NotFoundException('경비를 찾을 수 없습니다');
    }
    if (expense.userId !== userId) {
      throw new ForbiddenException('수정 권한이 없습니다');
    }
    Object.assign(expense, {
      ...dto,
      expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : expense.expenseDate,
    });
    return this.expenseRepository.save(expense);
  }

  async remove(userId: number, expenseId: number): Promise<void> {
    const expense = await this.expenseRepository.findOne({ where: { id: expenseId } });
    if (!expense) {
      throw new NotFoundException('경비를 찾을 수 없습니다');
    }
    if (expense.userId !== userId) {
      throw new ForbiddenException('삭제 권한이 없습니다');
    }
    await this.expenseRepository.remove(expense);
  }
}
