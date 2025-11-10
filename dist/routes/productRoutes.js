"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ProductController_1 = require("../controllers/ProductController");
const rateLimiter_1 = require("../middlewares/rateLimiter");
const router = (0, express_1.Router)();
const productController = new ProductController_1.ProductController();
// Apply rate limiter to all routes
router.use(rateLimiter_1.rateLimiterMiddleware);
// Create a new product
router.post('/products', ProductController_1.productValidation.createProduct, productController.createProduct);
// Get product status
router.get('/products/:productId/status', productController.getProductStatus);
// Reserve a product
router.post('/products/:productId/reserve', ProductController_1.productValidation.reserveProduct, productController.reserveProduct);
// Cancel a reservation
router.delete('/products/:productId/reserve', productController.cancelReservation);
// Checkout
router.post('/products/:productId/checkout', productController.checkout);
exports.default = router;
