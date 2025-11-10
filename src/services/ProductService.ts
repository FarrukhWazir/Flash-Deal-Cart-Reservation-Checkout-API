import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Product } from '../models/Product';
import redisClient from '../config/redis';
import dotenv from 'dotenv';

dotenv.config();

const CART_RESERVATION_TTL = parseInt(process.env.CART_RESERVATION_TTL || '600');

export class ProductService {
  private productRepository: Repository<Product>;

  constructor() {
    this.productRepository = AppDataSource.getRepository(Product);
  }

  async createProduct(productData: Partial<Product>): Promise<Product> {
    const product = this.productRepository.create(productData);
    return await this.productRepository.save(product);
  }

  async getProductStatus(productId: number): Promise<{
    totalStock: number;
    reservedStock: number;
    availableStock: number;
  }> {
    const product = await this.productRepository.findOneOrFail({
      where: { id: productId }
    });

    const reservedStockStr = await redisClient.get(`reserved:${productId}`);
    const reservedStock = parseInt(reservedStockStr || '0');

    return {
      totalStock: product.totalStock,
      reservedStock,
      availableStock: product.totalStock - reservedStock
    };
  }

  async reserveProduct(productId: number, userId: string, quantity: number): Promise<boolean> {
    // Start a Redis transaction
    const multi = redisClient.multi();

    const reservationKey = `reserved:${productId}`;
    const userReservationKey = `user:${userId}:product:${productId}`;

    try {
      // Get current product details
      const product = await this.productRepository.findOneOrFail({
        where: { id: productId }
      });

      // Get current reserved quantity
      const currentReserved = parseInt(await redisClient.get(reservationKey) || '0');
      
      // Check if there's enough stock available
      if (product.totalStock - currentReserved < quantity) {
        return false;
      }

      // Add reservation
      multi.incrBy(reservationKey, quantity);
      multi.set(userReservationKey, quantity.toString(), {
        EX: CART_RESERVATION_TTL
      });

      await multi.exec();
      return true;
    } catch (error) {
      await multi.discard();
      throw error;
    }
  }

  async cancelReservation(productId: number, userId: string): Promise<boolean> {
    const reservationKey = `reserved:${productId}`;
    const userReservationKey = `user:${userId}:product:${productId}`;

    const multi = redisClient.multi();

    try {
      const reservedQuantity = await redisClient.get(userReservationKey);
      if (!reservedQuantity) return false;

      multi.decrBy(reservationKey, parseInt(reservedQuantity));
      multi.del(userReservationKey);

      await multi.exec();
      return true;
    } catch (error) {
      await multi.discard();
      return false;
    }
  }

  async checkout(productId: number, userId: string): Promise<boolean> {
    const reservationKey = `reserved:${productId}`;
    const userReservationKey = `user:${userId}:product:${productId}`;

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const reservedQuantity = await redisClient.get(userReservationKey);
      if (!reservedQuantity) return false;

      const quantity = parseInt(reservedQuantity);

      // Update product stock
      const product = await queryRunner.manager.findOneOrFail(Product, {
        where: { id: productId },
        lock: { mode: 'pessimistic_write' }
      });

      product.totalStock -= quantity;
      await queryRunner.manager.save(product);

      // Clear reservation
      await redisClient.del(userReservationKey);
      await redisClient.decrBy(reservationKey, quantity);

      await queryRunner.commitTransaction();
      return true;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      return false;
    } finally {
      await queryRunner.release();
    }
  }
}