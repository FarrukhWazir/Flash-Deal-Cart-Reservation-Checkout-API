import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import prisma from './config/prisma';
import redisClient from './config/redis';
import productRoutes from './routes/productRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// Routes
app.use('/api', productRoutes);

// Initialize database and Redis connections
const initialize = async () => {
  try {
    // Prisma handles connection lazily; connect explicitly to validate connection
    await prisma.$connect();
    console.log('Database (Prisma) connected successfully');

    await redisClient.connect();
    console.log('Redis connected successfully');

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error during initialization:', error);
    process.exit(1);
  }
};

initialize();