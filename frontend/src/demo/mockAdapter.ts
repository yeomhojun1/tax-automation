import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { Expense, ExpenseCategory, InvoiceDirection, TaxInvoice, TaxType, User } from '@/types';
import { createSeedDb, DemoDb, DemoUser } from './sampleData';
import { DemoParseError, parseInvoiceXml } from './xmlParser';

/**
 * 데모 모드 전용 axios 어댑터. 실제 HTTP 요청을 보내지 않고
 * 백엔드(NestJS)와 같은 응답 모양({ data, message, statusCode })을 브라우저 안에서 만든다.
 * 데이터는 localStorage 에 저장된다.
 */

const STORAGE_KEY = 'tax_demo_db_v1';
const FAKE_LATENCY_MS = 150;

class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function loadDb(): DemoDb {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as DemoDb;
  } catch {
    // 손상된 값이면 새로 만든다
  }
  const seeded = createSeedDb();
  saveDb(seeded);
  return seeded;
}

function saveDb(db: DemoDb): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // 저장 공간이 막힌 환경(시크릿 창 등)에서는 메모리에서만 동작
  }
}

/** 데모 데이터를 처음 상태로 되돌린다. */
export function resetDemoData(): void {
  saveDb(createSeedDb());
}

function publicUser(user: DemoUser): User {
  const { password: _password, ...rest } = user;
  return rest;
}

function tokenFor(user: DemoUser): string {
  return `demo-token-${user.id}`;
}

function requireUser(db: DemoDb, config: InternalAxiosRequestConfig): DemoUser {
  const header = String(config.headers?.Authorization ?? '');
  const match = header.match(/^Bearer demo-token-(\d+)$/);
  const user = match ? db.users.find((u) => u.id === Number(match[1])) : undefined;
  if (!user) throw new HttpError(401, '로그인이 필요합니다');
  return user;
}

function parseBody(config: InternalAxiosRequestConfig): Record<string, unknown> {
  if (typeof config.data === 'string' && config.data.length > 0) {
    try {
      return JSON.parse(config.data) as Record<string, unknown>;
    } catch {
      throw new HttpError(400, '요청 본문이 올바르지 않습니다');
    }
  }
  if (config.data && typeof config.data === 'object' && !(config.data instanceof FormData)) {
    return config.data as Record<string, unknown>;
  }
  return {};
}

function isValidDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value) && !Number.isNaN(Date.parse(value));
}

function dateOnly(value: string): string {
  return value.slice(0, 10);
}

function yearOf(date: string): number {
  return Number(date.slice(0, 4));
}

function monthOf(date: string): number {
  return Number(date.slice(5, 7));
}

function sum<T>(rows: T[], pick: (row: T) => number): number {
  return rows.reduce((total, row) => total + Number(pick(row)), 0);
}

function byDateDesc<T>(pick: (row: T) => string): (a: T, b: T) => number {
  return (a, b) => pick(b).localeCompare(pick(a));
}

function findOwned<T extends { id: number; userId: number }>(rows: T[], id: number, userId: number, label: string): T {
  const row = rows.find((r) => r.id === id);
  if (!row) throw new HttpError(404, `${label}을(를) 찾을 수 없습니다`);
  if (row.userId !== userId) throw new HttpError(403, '권한이 없습니다');
  return row;
}

interface RouteResult {
  status: number;
  data: unknown;
}

async function route(config: InternalAxiosRequestConfig): Promise<RouteResult> {
  const method = (config.method ?? 'get').toLowerCase();
  const path = (config.url ?? '').replace(/^https?:\/\/[^/]+/, '').split('?')[0];
  const params = (config.params ?? {}) as Record<string, unknown>;
  const db = loadDb();
  const now = new Date().toISOString();
  const ok = (data: unknown, status = method === 'post' ? 201 : 200): RouteResult => ({ status, data });

  // ---- 인증 ----
  if (method === 'post' && path === '/api/v1/auth/login') {
    const body = parseBody(config);
    const user = db.users.find((u) => u.email === body.email && u.password === body.password);
    if (!user) throw new HttpError(401, '이메일 또는 비밀번호가 올바르지 않습니다');
    return ok({ accessToken: tokenFor(user), user: publicUser(user) }, 200);
  }

  if (method === 'post' && path === '/api/v1/auth/register') {
    const body = parseBody(config);
    const email = String(body.email ?? '').trim();
    const password = String(body.password ?? '');
    const businessName = String(body.businessName ?? '').trim();
    if (!email || password.length < 8 || !businessName) {
      throw new HttpError(400, '이메일, 8자 이상 비밀번호, 상호를 입력해 주세요');
    }
    if (db.users.some((u) => u.email === email)) throw new HttpError(409, '이미 가입된 이메일입니다');
    const user: DemoUser = {
      id: db.nextId++,
      email,
      password,
      businessName,
      businessNumber: (body.businessNumber as string | undefined) || null,
      isGeneralTaxpayer: body.isGeneralTaxpayer !== false,
      createdAt: now,
      updatedAt: now,
    };
    db.users.push(user);
    saveDb(db);
    return ok({ accessToken: tokenFor(user), user: publicUser(user) });
  }

  const user = requireUser(db, config);

  if (path === '/api/v1/auth/me') {
    if (method === 'get') return ok(publicUser(user));
    if (method === 'patch') {
      const body = parseBody(config);
      if (typeof body.businessName === 'string') user.businessName = body.businessName;
      if ('businessNumber' in body) user.businessNumber = (body.businessNumber as string | null) || null;
      if (typeof body.isGeneralTaxpayer === 'boolean') user.isGeneralTaxpayer = body.isGeneralTaxpayer;
      user.updatedAt = now;
      saveDb(db);
      return ok(publicUser(user));
    }
  }

  if (method === 'patch' && path === '/api/v1/auth/password') {
    const body = parseBody(config);
    if (body.currentPassword !== user.password) throw new HttpError(401, '현재 비밀번호가 올바르지 않습니다');
    const newPassword = String(body.newPassword ?? '');
    if (newPassword.length < 8) throw new HttpError(400, '새 비밀번호는 8자 이상이어야 합니다');
    user.password = newPassword;
    saveDb(db);
    return ok(null, 204);
  }

  // ---- 세금계산서 ----
  const myInvoices = (): TaxInvoice[] => db.invoices.filter((inv) => inv.userId === user.id);

  if (method === 'post' && path === '/api/v1/tax-invoices/upload') {
    const file = config.data instanceof FormData ? config.data.get('file') : null;
    if (!(file instanceof File)) throw new HttpError(400, '업로드할 파일이 없습니다');
    if (!file.name.endsWith('.xml') && !file.type.includes('xml')) {
      throw new HttpError(400, 'XML 파일만 업로드 가능합니다');
    }
    let parsed;
    try {
      parsed = parseInvoiceXml(await file.text(), user.businessNumber ?? '');
    } catch (error) {
      if (error instanceof DemoParseError) throw new HttpError(400, error.message);
      throw error;
    }
    if (myInvoices().some((inv) => inv.invoiceNumber === parsed.invoiceNumber)) {
      throw new HttpError(400, '이미 등록된 세금계산서입니다');
    }
    const invoice: TaxInvoice = {
      id: db.nextId++,
      userId: user.id,
      ...parsed,
      items: parsed.items.map((item) => ({ ...item, id: db.nextId++ })),
      rawFileKey: `demo/${file.name}`,
      createdAt: now,
      updatedAt: now,
    };
    db.invoices.push(invoice);
    saveDb(db);
    return ok(invoice);
  }

  if (method === 'get' && path === '/api/v1/tax-invoices/summary') {
    const year = Number(params.year);
    const quarter = Number(params.quarter);
    if (!Number.isInteger(year) || !Number.isInteger(quarter) || quarter < 1 || quarter > 4) {
      throw new HttpError(400, '분기는 1~4 사이의 값이어야 합니다');
    }
    const startMonth = (quarter - 1) * 3 + 1;
    const rows = myInvoices().filter((inv) => {
      const month = monthOf(inv.issueDate);
      return yearOf(inv.issueDate) === year && month >= startMonth && month <= startMonth + 2;
    });
    const sales = rows.filter((inv) => inv.direction === InvoiceDirection.SALES);
    const purchases = rows.filter((inv) => inv.direction === InvoiceDirection.PURCHASE);
    const salesTaxAmount = sum(sales, (inv) => inv.taxAmount);
    const purchaseTaxAmount = sum(purchases, (inv) => inv.taxAmount);
    return ok({
      salesSupplyAmount: sum(sales, (inv) => inv.supplyAmount),
      salesTaxAmount,
      purchaseSupplyAmount: sum(purchases, (inv) => inv.supplyAmount),
      purchaseTaxAmount,
      estimatedVat: salesTaxAmount - purchaseTaxAmount,
      year,
      quarter,
    });
  }

  if (path === '/api/v1/tax-invoices') {
    if (method === 'get') {
      let rows = myInvoices();
      if (params.direction) rows = rows.filter((inv) => inv.direction === params.direction);
      if (params.startDate && params.endDate) {
        const start = String(params.startDate);
        const end = String(params.endDate);
        rows = rows.filter((inv) => inv.issueDate >= start && inv.issueDate <= end);
      }
      return ok(rows.sort(byDateDesc((inv) => inv.issueDate)));
    }
    if (method === 'post') {
      const body = parseBody(config);
      if (!isValidDate(body.issueDate)) throw new HttpError(400, '발행일 형식이 올바르지 않습니다');
      const direction = body.direction as InvoiceDirection;
      if (!Object.values(InvoiceDirection).includes(direction)) throw new HttpError(400, '구분이 올바르지 않습니다');
      const invoice: TaxInvoice = {
        id: db.nextId++,
        userId: user.id,
        invoiceNumber: `MANUAL-${user.id}-${Date.now()}`,
        direction,
        taxType: TaxType.TAXABLE,
        counterpartyName: String(body.counterpartyName ?? ''),
        counterpartyBizNumber: (body.counterpartyBizNumber as string | undefined) || null,
        supplyAmount: Number(body.supplyAmount ?? 0),
        taxAmount: Number(body.taxAmount ?? 0),
        issueDate: dateOnly(body.issueDate),
        rawFileKey: null,
        items: [],
        createdAt: now,
        updatedAt: now,
      };
      db.invoices.push(invoice);
      saveDb(db);
      return ok(invoice);
    }
  }

  const invoiceMatch = path.match(/^\/api\/v1\/tax-invoices\/(\d+)$/);
  if (invoiceMatch && method === 'delete') {
    const invoice = findOwned(db.invoices, Number(invoiceMatch[1]), user.id, '세금계산서');
    db.invoices = db.invoices.filter((inv) => inv.id !== invoice.id);
    saveDb(db);
    return ok(null, 204);
  }

  // ---- 경비 ----
  if (path === '/api/v1/expenses') {
    if (method === 'get') {
      let rows = db.expenses.filter((e) => e.userId === user.id);
      if (params.year) rows = rows.filter((e) => yearOf(e.expenseDate) === Number(params.year));
      if (params.month) rows = rows.filter((e) => monthOf(e.expenseDate) === Number(params.month));
      if (params.category) rows = rows.filter((e) => e.category === params.category);
      if (params.search) {
        const keyword = String(params.search).toLowerCase();
        rows = rows.filter((e) => e.description.toLowerCase().includes(keyword));
      }
      return ok(rows.sort(byDateDesc((e) => e.expenseDate)));
    }
    if (method === 'post') {
      const body = parseBody(config);
      if (!isValidDate(body.expenseDate)) throw new HttpError(400, '지출일 형식이 올바르지 않습니다');
      if (!Object.values(ExpenseCategory).includes(body.category as ExpenseCategory)) {
        throw new HttpError(400, '카테고리가 올바르지 않습니다');
      }
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount < 0) throw new HttpError(400, '금액이 올바르지 않습니다');
      const expense: Expense = {
        id: db.nextId++,
        userId: user.id,
        category: body.category as ExpenseCategory,
        amount,
        description: String(body.description ?? ''),
        expenseDate: dateOnly(body.expenseDate),
        receiptFileKey: null,
        taxInvoiceId: (body.taxInvoiceId as number | undefined) ?? null,
        createdAt: now,
        updatedAt: now,
      };
      db.expenses.push(expense);
      saveDb(db);
      return ok(expense);
    }
  }

  const expenseMatch = path.match(/^\/api\/v1\/expenses\/(\d+)$/);
  if (expenseMatch) {
    const expense = findOwned(db.expenses, Number(expenseMatch[1]), user.id, '경비');
    if (method === 'patch') {
      const body = parseBody(config);
      if (body.category !== undefined) expense.category = body.category as ExpenseCategory;
      if (body.amount !== undefined) expense.amount = Number(body.amount);
      if (body.description !== undefined) expense.description = String(body.description);
      if (body.expenseDate !== undefined) {
        if (!isValidDate(body.expenseDate)) throw new HttpError(400, '지출일 형식이 올바르지 않습니다');
        expense.expenseDate = dateOnly(body.expenseDate);
      }
      expense.updatedAt = now;
      saveDb(db);
      return ok(expense);
    }
    if (method === 'delete') {
      db.expenses = db.expenses.filter((e) => e.id !== expense.id);
      saveDb(db);
      return ok(null, 204);
    }
  }

  // ---- 대시보드 ----
  if (method === 'get' && path === '/api/v1/dashboard/summary') {
    const year = params.year ? Number(params.year) : new Date().getFullYear();
    const invoices = myInvoices().filter((inv) => yearOf(inv.issueDate) === year);
    const expenses = db.expenses.filter((e) => e.userId === user.id && yearOf(e.expenseDate) === year);
    const sales = invoices.filter((inv) => inv.direction === InvoiceDirection.SALES);
    const purchases = invoices.filter((inv) => inv.direction === InvoiceDirection.PURCHASE);
    const salesTaxAmount = sum(sales, (inv) => inv.taxAmount);
    const purchaseTaxAmount = sum(purchases, (inv) => inv.taxAmount);

    const categoryMap = new Map<ExpenseCategory, number>();
    expenses.forEach((e) => categoryMap.set(e.category, (categoryMap.get(e.category) ?? 0) + Number(e.amount)));

    return ok({
      salesSupplyAmount: sum(sales, (inv) => inv.supplyAmount),
      salesTaxAmount,
      purchaseSupplyAmount: sum(purchases, (inv) => inv.supplyAmount),
      purchaseTaxAmount,
      estimatedVat: salesTaxAmount - purchaseTaxAmount,
      totalExpenses: sum(expenses, (e) => e.amount),
      monthlyTrend: Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        salesAmount: sum(sales.filter((inv) => monthOf(inv.issueDate) === i + 1), (inv) => inv.supplyAmount),
        purchaseAmount: sum(purchases.filter((inv) => monthOf(inv.issueDate) === i + 1), (inv) => inv.supplyAmount),
      })),
      categoryBreakdown: Array.from(categoryMap.entries())
        .map(([category, total]) => ({ category, total }))
        .sort((a, b) => b.total - a.total),
    });
  }

  throw new HttpError(404, `데모 모드에서 지원하지 않는 요청입니다: ${method.toUpperCase()} ${path}`);
}

export async function demoAdapter(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  await new Promise((resolve) => setTimeout(resolve, FAKE_LATENCY_MS));

  try {
    const { status, data } = await route(config);
    return {
      data: status === 204 ? '' : { data, message: 'OK', statusCode: status },
      status,
      statusText: 'OK',
      headers: {},
      config,
      request: {},
    };
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof Error ? error.message : '데모 처리 중 오류가 발생했습니다';
    const response: AxiosResponse = {
      data: { message, statusCode: status, timestamp: new Date().toISOString() },
      status,
      statusText: 'Error',
      headers: {},
      config,
      request: {},
    };
    throw new AxiosError(
      message,
      status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
      config,
      {},
      response,
    );
  }
}
