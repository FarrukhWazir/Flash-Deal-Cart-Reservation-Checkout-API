import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from './Product';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: string;

  @ManyToOne(() => Product)
  @JoinColumn()
  product: Product;

  @Column()
  productId: number;

  @Column('int')
  quantity: number;

  @Column('decimal', { precision: 10, scale: 2 })
  totalPrice: number;

  @Column({
    type: 'enum',
    enum: ['pending', 'completed', 'cancelled'],
    default: 'pending'
  })
  status: 'pending' | 'completed' | 'cancelled';

  @CreateDateColumn()
  createdAt: Date;
}