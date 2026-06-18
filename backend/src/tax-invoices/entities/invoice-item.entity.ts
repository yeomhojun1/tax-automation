import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TaxInvoice } from './tax-invoice.entity';

@Entity('invoice_items')
export class InvoiceItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => TaxInvoice, (invoice) => invoice.items, { onDelete: 'CASCADE' })
  taxInvoice: TaxInvoice;

  @Column({ type: 'int' })
  taxInvoiceId: number;

  @Column({ type: 'varchar', length: 100 })
  itemName: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  specification: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 0, default: 0 })
  quantity: number;

  @Column({ type: 'decimal', precision: 15, scale: 0, default: 0 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 15, scale: 0 })
  supplyAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 0 })
  taxAmount: number;

  @CreateDateColumn()
  createdAt: Date;
}
