"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductController = exports.productValidation = void 0;
const ProductService_1 = require("../services/ProductService");
const express_validator_1 = require("express-validator");
const productService = new ProductService_1.ProductService();
exports.productValidation = {
    createProduct: [
        (0, express_validator_1.body)('name').isString().notEmpty(),
        (0, express_validator_1.body)('description').isString().notEmpty(),
        (0, express_validator_1.body)('price').isFloat({ min: 0 }),
        (0, express_validator_1.body)('totalStock').isInt({ min: 0 })
    ],
    reserveProduct: [
        (0, express_validator_1.param)('productId').isInt({ min: 1 }),
        (0, express_validator_1.body)('userId').isString().notEmpty(),
        (0, express_validator_1.body)('quantity').isInt({ min: 1 })
    ]
};
class ProductController {
    async createProduct(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            const product = await productService.createProduct(req.body);
            return res.status(201).json(product);
        }
        catch (error) {
            console.error('Error creating product:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }
    async getProductStatus(req, res) {
        try {
            const productId = parseInt(req.params.productId);
            const status = await productService.getProductStatus(productId);
            return res.json(status);
        }
        catch (error) {
            console.error('Error getting product status:', error);
            return res.status(404).json({ message: 'Product not found' });
        }
    }
    async reserveProduct(req, res) {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            const { userId, quantity } = req.body;
            const productId = parseInt(req.params.productId);
            const success = await productService.reserveProduct(productId, userId, quantity);
            if (!success) {
                return res.status(400).json({ message: 'Not enough stock available' });
            }
            return res.status(200).json({ message: 'Product reserved successfully' });
        }
        catch (error) {
            console.error('Error reserving product:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }
    async cancelReservation(req, res) {
        try {
            const { userId } = req.body;
            const productId = parseInt(req.params.productId);
            const success = await productService.cancelReservation(productId, userId);
            if (!success) {
                return res.status(404).json({ message: 'Reservation not found' });
            }
            return res.status(200).json({ message: 'Reservation cancelled successfully' });
        }
        catch (error) {
            console.error('Error cancelling reservation:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }
    async checkout(req, res) {
        try {
            const { userId } = req.body;
            const productId = parseInt(req.params.productId);
            const success = await productService.checkout(productId, userId);
            if (!success) {
                return res.status(400).json({ message: 'Checkout failed' });
            }
            return res.status(200).json({ message: 'Checkout completed successfully' });
        }
        catch (error) {
            console.error('Error during checkout:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }
}
exports.ProductController = ProductController;
