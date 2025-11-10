// Prisma is used for DB models. Keep a TypeScript type for Order to help with typing in the codebase.
export type Order = {
  id: number;
  userId: string;
  productId: number;
  quantity: number;
  totalPrice: number | string;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: Date;
};