# Flash Deal Cart API

A Node.js Express API for handling flash deal sales with Redis-based reservation system and PostgreSQL for permanent storage.

## Tech Stack

- Node.js + TypeScript
- Express.js
- PostgreSQL (via TypeORM)
- Redis
- Rate limiting
- Input validation

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

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Create a .env file with your configuration (see .env.example)
4. Start PostgreSQL and Redis servers
5. Run database migrations:
```bash
npm run build
```
6. Start the server:
```bash
npm start
```

For development:
```bash
npm run dev
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
   - Validates against total stock
   - Updates reservation counters
   
3. Stock tracking uses two counters:
   - Total stock (PostgreSQL) - permanent record
   - Reserved stock (Redis) - temporary reservations

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