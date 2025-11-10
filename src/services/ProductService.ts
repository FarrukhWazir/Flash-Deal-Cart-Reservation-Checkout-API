import prisma from '../config/prisma';
import type { Prisma } from '@prisma/client';
import redisClient from '../config/redis';
import dotenv from 'dotenv';

dotenv.config();

const CART_RESERVATION_TTL = parseInt(process.env.CART_RESERVATION_TTL || '600');

export class ProductService {
  constructor() {}

  async createProduct(productData: {
    name: string;
    description: string;
    price: number | string;
    totalStock: number;
  }) {
    const product = await prisma.product.create({ data: productData as any });
    return product;
  }

  async getProductStatus(productId: number): Promise<{ totalStock: number; reservedStock: number; availableStock: number }> {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new Error('Product not found');

    const reservedStockStr = await redisClient.get(`reserved:${productId}`);
    const reservedStock = parseInt(reservedStockStr || '0');

    return {
      totalStock: product.totalStock,
      reservedStock,
      availableStock: product.totalStock - reservedStock
    };
  }

  async reserveProduct(productId: number, userId: string, quantity: number): Promise<boolean> {
    const reservationKey = `reserved:${productId}`;
    const userReservationKey = `user:${userId}:product:${productId}`;

    // Use Redis transaction to atomically increment reserved count and set user reservation with TTL
    const currentReserved = parseInt((await redisClient.get(reservationKey)) || '0');

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new Error('Product not found');

    if (product.totalStock - currentReserved < quantity) {
      return false;
    }

    const multi = redisClient.multi();
    multi.incrBy(reservationKey, quantity);
    multi.set(userReservationKey, quantity.toString(), { EX: CART_RESERVATION_TTL });
    await multi.exec();
    return true;
  }

  async cancelReservation(productId: number, userId: string): Promise<boolean> {
    const reservationKey = `reserved:${productId}`;
    const userReservationKey = `user:${userId}:product:${productId}`;

    const reservedQuantity = await redisClient.get(userReservationKey);
    if (!reservedQuantity) return false;

    const multi = redisClient.multi();
    multi.decrBy(reservationKey, parseInt(reservedQuantity));
    multi.del(userReservationKey);
    await multi.exec();
    return true;
  }

  async checkout(productId: number, userId: string): Promise<boolean> {
    const reservationKey = `reserved:${productId}`;
    const userReservationKey = `user:${userId}:product:${productId}`;

    const reservedQuantity = await redisClient.get(userReservationKey);
    if (!reservedQuantity) return false;
    const quantity = parseInt(reservedQuantity);

    // Use a Prisma transaction to decrement stock and create an order atomically
    try {
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const product = await tx.product.findUnique({ where: { id: productId } });
        if (!product) throw new Error('Product not found');
        if (product.totalStock < quantity) throw new Error('Insufficient stock');

        await tx.product.update({ where: { id: productId }, data: { totalStock: product.totalStock - quantity } });

        await tx.order.create({
          data: {
            userId,
            productId,
            quantity,
            totalPrice: (product.price as any) * quantity,
            status: 'completed'
          }
        });
      });

      // Clear reservation in Redis
      await redisClient.del(userReservationKey);
      await redisClient.decrBy(reservationKey, quantity);
      return true;
    } catch (e) {
      console.error('Checkout error:', e);
      return false;
    }
  }
}