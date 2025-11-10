// Prisma is used for DB models. Keep a TypeScript type for Product to help with typing in the codebase.
export type Product = {
  id: number;
  name: string;
  description: string;
  price: number | string;
  totalStock: number;
  createdAt: Date;
  updatedAt: Date;
};