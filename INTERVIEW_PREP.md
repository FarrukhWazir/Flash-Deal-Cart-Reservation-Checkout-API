# Flash Deal Cart API - Interview Preparation Guide

## System Design Questions

### Q1: Explain the architecture of your Flash Deal Cart system and why you chose this design?
**Answer:**
The system uses a three-tier architecture:
1. **Data Layer:**
   - PostgreSQL for permanent storage (products, orders)
   - Redis for temporary reservations with TTL
2. **Application Layer:**
   - Node.js with Express
   - Prisma ORM for type-safe database operations
   - Redis for distributed locking and caching
3. **API Layer:**
   - RESTful endpoints
   - Rate limiting for API protection
   - Input validation

Key design decisions:
- Used Redis for reservations because:
  - Built-in TTL feature for automatic expiration
  - Atomic operations for race condition prevention
  - In-memory performance for high-concurrency
- Chose Prisma over TypeORM because:
  - Type-safe database operations
  - Better transaction support
  - Auto-generated types from schema
  - Better query performance

### Q2: How do you prevent overselling in a high-concurrency scenario?
**Answer:**
The system uses a multi-layer approach:

1. **Redis Reservation Lock:**
   ```typescript
   async reserveProduct(productId: number, userId: string, quantity: number) {
     const multi = redisClient.multi();
     // Atomic check and update
     const currentReserved = await redisClient.get(`reserved:${productId}`);
     if (totalStock - currentReserved < quantity) return false;
     multi.incrBy(reservationKey, quantity);
     await multi.exec();
   }
   ```

2. **Database Transaction:**
   ```typescript
   await prisma.$transaction(async (tx) => {
     const product = await tx.product.findUnique({
       where: { id: productId }
     });
     if (product.totalStock < quantity) throw new Error();
     await tx.product.update({
       where: { id: productId },
       data: { totalStock: product.totalStock - quantity }
     });
   });
   ```

3. **TTL-based Expiration:**
   - Reservations automatically expire after 10 minutes
   - Stock is automatically returned to available pool

### Q3: Explain your reservation system's workflow
**Answer:**
1. **Reservation Creation:**
   - Check available stock
   - Create temporary hold in Redis
   - Set 10-minute TTL
   - Update reserved count

2. **Checkout Process:**
   - Verify reservation exists
   - Use Prisma transaction to:
     - Update permanent stock
     - Create order record
   - Remove Redis reservation
   - Update reservation counter

3. **Expiration Handling:**
   - Redis TTL automatically expires reservation
   - Counter is decremented
   - Stock becomes available again

## Technical Implementation Questions

### Q4: How do you handle database transactions and rollbacks?
**Answer:**
```typescript
// Using Prisma transactions for atomic operations
async checkout(productId: number, userId: string) {
  try {
    await prisma.$transaction(async (tx) => {
      // All operations in this block are atomic
      const product = await tx.product.findUnique({...});
      await tx.product.update({...});
      await tx.order.create({...});
    });
    // Only if all operations succeed:
    await redisClient.del(reservationKey);
  } catch (error) {
    // Automatic rollback on error
    return false;
  }
}
```

### Q5: How do you implement rate limiting?
**Answer:**
```typescript
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'rate_limit',
  points: 100,          // Number of requests
  duration: 900         // Per 15 minutes
});

export const rateLimiterMiddleware = async (req, res, next) => {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch {
    res.status(429).json({ message: 'Too many requests' });
  }
};
```

### Q6: How do you ensure data consistency between Redis and PostgreSQL?
**Answer:**
1. **Single Source of Truth:**
   - PostgreSQL is the source of truth for stock
   - Redis only maintains temporary reservations
   - Redis data is always derived from PostgreSQL

2. **Atomic Operations:**
   - Use Redis MULTI for atomic reservation updates
   - Use Prisma transactions for permanent updates

3. **Error Handling:**
   ```typescript
   try {
     // DB Transaction
     await prisma.$transaction(async (tx) => {...});
     // Only if DB succeeds, update Redis
     await redisClient.del(reservationKey);
   } catch (error) {
     // On failure, reservation remains and expires naturally
     return false;
   }
   ```

## Scaling and Performance Questions

### Q7: How would you scale this system to handle more traffic?
**Answer:**
1. **Horizontal Scaling:**
   - Multiple API servers behind load balancer
   - Redis cluster for distributed caching
   - PostgreSQL read replicas

2. **Caching Strategies:**
   - Cache product details in Redis
   - Use Redis Cluster for better distribution
   - Implement cache invalidation on updates

3. **Performance Optimizations:**
   - Batch database operations
   - Index frequently queried fields
   - Use connection pooling

### Q8: How do you monitor and debug the system?
**Answer:**
1. **Logging:**
   - Request/response logging
   - Error tracking
   - Transaction monitoring

2. **Metrics:**
   - API response times
   - Redis operation latency
   - Database query performance
   - Reservation patterns

3. **Alerts:**
   - Stock level warnings
   - High error rate alerts
   - Unusual traffic patterns

## Bonus Implementation Details

### Q9: Explain your error handling strategy
**Answer:**
1. **Layered Approach:**
   - Input validation (express-validator)
   - Business logic validation
   - Database constraint errors
   - Global error handler

2. **Error Types:**
   ```typescript
   // HTTP error responses
   - 400: Bad Request (validation errors)
   - 404: Not Found (product/reservation)
   - 409: Conflict (stock issues)
   - 429: Too Many Requests
   - 500: Internal Server Error
   ```

3. **Error Recovery:**
   - Automatic transaction rollbacks
   - Redis reservation expiry
   - Retry mechanisms for temporary failures

### Q10: What improvements would you make given more time?
**Answer:**
1. **Technical Improvements:**
   - Add unit and integration tests
   - Implement WebSocket for real-time stock updates
   - Add request/response compression
   - Implement circuit breakers for external services

2. **Feature Additions:**
   - Multiple product reservations in one transaction
   - User authentication and authorization
   - Reservation queue for high-demand products
   - Analytics for shopping patterns

3. **Operational Improvements:**
   - Docker containerization
   - CI/CD pipeline
   - Monitoring and alerting setup
   - Performance benchmarking suite

## Best Practices Demonstrated

- Clean Architecture (separation of concerns)
- SOLID principles
- Type safety with TypeScript
- Proper error handling
- Rate limiting for API protection
- Atomic transactions
- Concurrent request handling
- Automatic cleanup with TTL
- RESTful API design