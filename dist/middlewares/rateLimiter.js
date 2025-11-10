"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimiterMiddleware = void 0;
const rate_limiter_flexible_1 = require("rate-limiter-flexible");
const redis_1 = __importDefault(require("../config/redis"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const rateLimiter = new rate_limiter_flexible_1.RateLimiterRedis({
    storeClient: redis_1.default,
    keyPrefix: 'rate_limit',
    points: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    duration: parseInt(process.env.RATE_LIMIT_WINDOW || '900'),
});
const rateLimiterMiddleware = async (req, res, next) => {
    try {
        await rateLimiter.consume(req.ip || req.socket.remoteAddress || 'unknown');
        next();
    }
    catch (error) {
        res.status(429).json({
            message: 'Too many requests - please try again later',
        });
    }
};
exports.rateLimiterMiddleware = rateLimiterMiddleware;
