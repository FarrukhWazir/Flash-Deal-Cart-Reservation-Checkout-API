"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const prisma_1 = __importDefault(require("./config/prisma"));
const redis_1 = __importDefault(require("./config/redis"));
const productRoutes_1 = __importDefault(require("./routes/productRoutes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middleware
app.use((0, cors_1.default)());
app.use((0, helmet_1.default)());
app.use(express_1.default.json());
// Routes
app.use('/api', productRoutes_1.default);
// Initialize database and Redis connections
const initialize = async () => {
    try {
        // Prisma handles connection lazily; connect explicitly to validate connection
        await prisma_1.default.$connect();
        console.log('Database (Prisma) connected successfully');
        await redis_1.default.connect();
        console.log('Redis connected successfully');
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    }
    catch (error) {
        console.error('Error during initialization:', error);
        process.exit(1);
    }
};
initialize();
