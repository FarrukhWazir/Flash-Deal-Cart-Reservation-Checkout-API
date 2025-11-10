import { Request, Response } from 'express';
import { ProductService } from '../services/ProductService';
import { body, param, validationResult } from 'express-validator';

const productService = new ProductService();

export const productValidation = {
  createProduct: [
    body('name').isString().notEmpty(),
    body('description').isString().notEmpty(),
    body('price').isFloat({ min: 0 }),
    body('totalStock').isInt({ min: 0 })
  ],
  reserveProduct: [
    param('productId').isInt({ min: 1 }),
    body('userId').isString().notEmpty(),
    body('quantity').isInt({ min: 1 })
  ]
};

export class ProductController {
  async createProduct(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const product = await productService.createProduct(req.body);
      return res.status(201).json(product);
    } catch (error) {
      console.error('Error creating product:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async getProductStatus(req: Request, res: Response) {
    try {
      const productId = parseInt(req.params.productId);
      const status = await productService.getProductStatus(productId);
      return res.json(status);
    } catch (error) {
      console.error('Error getting product status:', error);
      return res.status(404).json({ message: 'Product not found' });
    }
  }

  async reserveProduct(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
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
    } catch (error) {
      console.error('Error reserving product:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async cancelReservation(req: Request, res: Response) {
    try {
      const { userId } = req.body;
      const productId = parseInt(req.params.productId);

      const success = await productService.cancelReservation(productId, userId);
      if (!success) {
        return res.status(404).json({ message: 'Reservation not found' });
      }

      return res.status(200).json({ message: 'Reservation cancelled successfully' });
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async checkout(req: Request, res: Response) {
    try {
      const { userId } = req.body;
      const productId = parseInt(req.params.productId);

      const success = await productService.checkout(productId, userId);
      if (!success) {
        return res.status(400).json({ message: 'Checkout failed' });
      }

      return res.status(200).json({ message: 'Checkout completed successfully' });
    } catch (error) {
      console.error('Error during checkout:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
}