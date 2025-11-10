"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductService = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const redis_1 = __importDefault(require("../config/redis"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const CART_RESERVATION_TTL = parseInt(process.env.CART_RESERVATION_TTL || '600');
class ProductService {
    constructor() { }
    async createProduct(productData) {
        const product = await prisma_1.default.product.create({ data: productData });
        return product;
    }
    async getProductStatus(productId) {
        const product = await prisma_1.default.product.findUnique({ where: { id: productId } });
        if (!product)
            throw new Error('Product not found');
        const reservedStockStr = await redis_1.default.get(`reserved:${productId}`);
        const reservedStock = parseInt(reservedStockStr || '0');
        return {
            totalStock: product.totalStock,
            reservedStock,
            availableStock: product.totalStock - reservedStock
        };
    }
    async reserveProduct(productId, userId, quantity) {
        const reservationKey = `reserved:${productId}`;
        const userReservationKey = `user:${userId}:product:${productId}`;
        // Use Redis transaction to atomically increment reserved count and set user reservation with TTL
        const currentReserved = parseInt((await redis_1.default.get(reservationKey)) || '0');
        const product = await prisma_1.default.product.findUnique({ where: { id: productId } });
        if (!product)
            throw new Error('Product not found');
        if (product.totalStock - currentReserved < quantity) {
            return false;
        }
        const multi = redis_1.default.multi();
        multi.incrBy(reservationKey, quantity);
        multi.set(userReservationKey, quantity.toString(), { EX: CART_RESERVATION_TTL });
        await multi.exec();
        return true;
    }
    async cancelReservation(productId, userId) {
        const reservationKey = `reserved:${productId}`;
        const userReservationKey = `user:${userId}:product:${productId}`;
        const reservedQuantity = await redis_1.default.get(userReservationKey);
        if (!reservedQuantity)
            return false;
        const multi = redis_1.default.multi();
        multi.decrBy(reservationKey, parseInt(reservedQuantity));
        multi.del(userReservationKey);
        await multi.exec();
        return true;
    }
    async checkout(productId, userId) {
        const reservationKey = `reserved:${productId}`;
        const userReservationKey = `user:${userId}:product:${productId}`;
        const reservedQuantity = await redis_1.default.get(userReservationKey);
        if (!reservedQuantity)
            return false;
        const quantity = parseInt(reservedQuantity);
        // Use a Prisma transaction to decrement stock and create an order atomically
        try {
            await prisma_1.default.$transaction(async (tx) => {
                const product = await tx.product.findUnique({ where: { id: productId } });
                if (!product)
                    throw new Error('Product not found');
                if (product.totalStock < quantity)
                    throw new Error('Insufficient stock');
                await tx.product.update({ where: { id: productId }, data: { totalStock: product.totalStock - quantity } });
                await tx.order.create({
                    data: {
                        userId,
                        productId,
                        quantity,
                        totalPrice: product.price * quantity,
                        status: 'completed'
                    }
                });
            });
            // Clear reservation in Redis
            await redis_1.default.del(userReservationKey);
            await redis_1.default.decrBy(reservationKey, quantity);
            return true;
        }
        catch (e) {
            console.error('Checkout error:', e);
            return false;
        }
    }
}
exports.ProductService = ProductService;
