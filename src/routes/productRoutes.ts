import { Router } from 'express';
import { ProductController, productValidation } from '../controllers/ProductController';
import { rateLimiterMiddleware } from '../middlewares/rateLimiter';

const router = Router();
const productController = new ProductController();

// Apply rate limiter to all routes
router.use(rateLimiterMiddleware);

// Create a new product
router.post(
  '/products',
  productValidation.createProduct,
  productController.createProduct
);

// Get product status
router.get(
  '/products/:productId/status',
  productController.getProductStatus
);

// Reserve a product
router.post(
  '/products/:productId/reserve',
  productValidation.reserveProduct,
  productController.reserveProduct
);

// Cancel a reservation
router.delete(
  '/products/:productId/reserve',
  productController.cancelReservation
);

// Checkout
router.post(
  '/products/:productId/checkout',
  productController.checkout
);

export default router;