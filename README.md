# Flash Deal Cart API

A Node.js Express API for handling flash deal sales with Redis-based reservation system and PostgreSQL for permanent storage.

## Tech Stack

- Node.js + TypeScript
- Express.js
- PostgreSQL (via Prisma ORM)
- Redis (for temporary reservations)
- Rate limiting
- Input validation with express-validator

## Features

- Product creation and management
- Temporary cart reservations with TTL
- Concurrent request handling
- Stock management with no overselling
- Rate limiting
- Input validation
- Error handling

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL
- Redis

## Installation and Setup

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Configure Environment:
   - Copy the `.env.example` file to `.env`
   - Update the PostgreSQL and Redis configurations if needed

4. Database Setup:
   - Start PostgreSQL service:
   ```bash
   sudo service postgresql start
   ```
   - Create the database:
   ```bash
   # Login to PostgreSQL
   sudo -u postgres psql

   # Create the database
   CREATE DATABASE flash_deal_db;

   # Exit psql
   \q
   ```

5. Start Redis Server:
   ```bash
   sudo service redis-server start
   ```

6. Initialize Database Schema:
   ```bash
   # Generate Prisma client
   npm run prisma:generate

   # Push schema to database (development)
   npx prisma db push

   # Or run migrations (production)
   npx prisma migrate deploy

   # Build TypeScript files
   npm run build
   ```

7. Start the Server:
   For production:
   ```bash
   npm start
   ```
   
   For development (with auto-reload):
   ```bash
   npm run dev
   ```

8. Verify Setup:
   - Redis server running on port 6379
   - PostgreSQL server running on port 5432
   - Application running on port 3000
   - Database 'flash_deal_db' created and synchronized

## Database Schema

### Products Table
```prisma
model Product {
  id          Int      @id @default(autoincrement())
  name        String
  description String
  price       Decimal  @db.Decimal(10, 2)
  totalStock  Int
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  orders      Order[]
}
```

### Orders Table
```prisma
model Order {
  id         Int         @id @default(autoincrement())
  userId     String
  product    Product     @relation(fields: [productId], references: [id])
  productId  Int
  quantity   Int
  totalPrice Decimal     @db.Decimal(10, 2)
  status     OrderStatus @default(pending)
  createdAt  DateTime    @default(now())
}

enum OrderStatus {
  pending
  completed
  cancelled
}
```

## How It Works

### Reservation Lock Logic

The system uses Redis to implement a temporary reservation system:

1. When a user adds an item to cart:
   - Checks available stock in PostgreSQL
   - Creates a temporary reservation in Redis with 10-minute TTL
   - Increments the reserved count for that product
   
2. The reservation system uses Redis transactions to ensure atomicity:
   - Checks current reserved quantity
   - Validates against total stock (from Prisma)
   - Updates reservation counters atomically
   
3. Stock tracking uses two systems:
   - Permanent stock (PostgreSQL via Prisma) - source of truth
   - Temporary reservations (Redis) - with automatic TTL cleanup
   
4. Checkout process uses Prisma transactions to ensure:
   - Stock updates are atomic
   - Order creation is tied to stock update
   - No overselling can occur

### Expiration Handling

Reservations automatically expire using Redis TTL:
- Each reservation has a 10-minute TTL
- When TTL expires, the reservation is automatically removed
- Reserved stock counter is decremented
- Stock becomes available for other users

## API Endpoints

### Products

#### Create Product
- POST /api/products
```json
{
  "name": "Product Name",
  "description": "Product Description",
  "price": 99.99,
  "totalStock": 200
}
```

#### Get Product Status
- GET /api/products/:productId/status
```json
{
  "totalStock": 200,
  "reservedStock": 5,
  "availableStock": 195
}
```

#### Reserve Product
- POST /api/products/:productId/reserve
```json
{
  "userId": "user123",
  "quantity": 2
}
```

#### Cancel Reservation
- DELETE /api/products/:productId/reserve
```json
{
  "userId": "user123"
}
```

#### Checkout
- POST /api/products/:productId/checkout
```json
{
  "userId": "user123"
}
```

## Error Handling

The API implements proper error handling:
- Input validation errors (400)
- Not found errors (404)
- Rate limit exceeded (429)
- Server errors (500)

## Rate Limiting

Basic rate limiting is implemented:
- 100 requests per 15-minute window
- Uses Redis to track request counts
- Returns 429 status when limit exceeded

## Postman Collection

A Postman collection and environment are provided in the `/postman` directory:

- `Flash_Deal_Cart_API.postman_collection.json`: API collection with all endpoints
- `Flash_Deal_Cart_API.postman_environment.json`: Environment variables

To use the collection:

1. Import both files into Postman
2. Select the "Flash Deal Cart API Environment"
3. The `baseUrl` variable is preset to `http://localhost:3000`
4. All endpoints are organized under the "Products" folder
5. Sample request bodies are included for each endpoint