import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import redisClient from '../config/redis';
import dotenv from 'dotenv';

dotenv.config();

const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'rate_limit',
  points: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  duration: parseInt(process.env.RATE_LIMIT_WINDOW || '900'),
});

export const rateLimiterMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch (error) {
    res.status(429).json({
      message: 'Too many requests - please try again later',
    });
  }
};