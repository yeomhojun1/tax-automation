import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { InvoiceItem } from './invoice-item.entity';

export enum InvoiceDirection {
  SALES = 'SALES',
  PURCHASE = 'PURCHASE',
}

export enum TaxType {
  TAXABLE = 'TAXABLE',
  ZERO_RATE = 'ZERO_RATE',
  EXEMPT = 'EXEMPT',
  STATEMENT = 'STATEMENT',
}

@Entity('tax_invoices')
@Index('UQ_tax_invoices_user_invoice_number', ['userId', 'invoiceNumber'], { unique: true })
export class TaxInvoice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  userId: number;

  @Column({ type: 'varchar', length: 64 })
  invoiceNumber: string;

  @Column({ type: 'enum', enum: InvoiceDirection })
  direction: InvoiceDirection;

  @Column({ type: 'enum', enum: TaxType, default: TaxType.TAXABLE })
  taxType: TaxType;

  @Column({ type: 'varchar', length: 100 })
  counterpartyName: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  counterpartyBizNumber: string | null;

  @Column({ type: 'decimal', precision: 15, scale: 0 })
  supplyAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 0 })
  taxAmount: number;

  @Column({ type: 'date' })
  issueDate: Date;

  @Column({ type: 'varchar', length: 500, nullable: true })
  rawFileKey: string | null;

  @OneToMany(() => InvoiceItem, (item) => item.taxInvoice, { cascade: true })
  items: InvoiceItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
