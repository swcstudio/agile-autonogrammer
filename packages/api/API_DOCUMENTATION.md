# Katalyst Framework API Documentation

## Overview

The Katalyst Framework provides a comprehensive tRPC-based API system designed to support a wide range of applications including storefronts, blogs, no-code builders, dashboards, admin panels, marketing sites, and member areas.

## API Architecture

Built with tRPC for end-to-end type safety and efficient RPC communication. All APIs support both public and protected procedures with robust authentication middleware.

## API Modules

### 1. Authentication & Authorization (`auth`)
Complete authentication system with OAuth, 2FA, API keys, and session management.

**Key Features:**
- User registration and login
- Password management (forgot/reset/change)
- Two-factor authentication
- OAuth provider integration
- Session management
- API key generation and management

### 2. Storefront & E-commerce (`storefront`)
Full-featured e-commerce APIs for product management, shopping cart, checkout, and order processing.

**Key Features:**
- Product catalog with variants
- Category management
- Shopping cart and checkout
- Order management
- Inventory tracking
- Discounts and promotions
- Product reviews
- Wishlist functionality
- Recommendation engine

### 3. Content Management System (`cms`)
Comprehensive CMS for articles, pages, and content blocks with version control.

**Key Features:**
- Article/blog post management
- Page builder with content blocks
- Category and tag organization
- Comment system with moderation
- Media library integration
- Revision control
- SEO optimization
- RSS feeds and sitemaps

### 4. No-Code Builder (`builder`)
Visual builder APIs for creating websites and applications without coding.

**Key Features:**
- Project management
- Page builder with components
- Template library
- Custom component creation
- Asset management
- Global styles and themes
- Data source integration
- Form builder
- Publishing and deployment
- Code export functionality

### 5. Form Builder & Management (`forms`)
Advanced form creation and submission handling system.

**Key Features:**
- Drag-and-drop form builder
- 20+ field types
- Multi-step forms
- Conditional logic
- Form submissions and management
- Integration with third-party services
- Analytics and conversion tracking
- Spam protection
- File upload handling
- Progress saving

### 6. Membership & Subscriptions (`membership`)
Complete membership site functionality with subscription billing.

**Key Features:**
- Plan and pricing management
- Subscription lifecycle
- Member area creation
- Content access control
- Payment method management
- Invoice generation
- Usage tracking and limits
- Coupon management
- Member analytics

### 7. Media & File Management (`media`)
Comprehensive media library with CDN integration and processing.

**Key Features:**
- File upload (single and multipart)
- Folder organization
- Image processing and optimization
- Video transcoding
- CDN integration
- Batch operations
- Share links
- Storage analytics
- Import from URL
- Zip operations

### 8. Admin Dashboard (`admin`)
Administrative functions for system management and monitoring.

**Key Features:**
- Dashboard statistics
- User management
- Role-based access control
- System settings
- Audit logging
- System health monitoring
- Email template management
- Integration configuration
- Backup and restore
- Cache management
- Job queue monitoring

### 9. AI Integration (`ai`)
AI-powered features for content generation and analysis.

**Key Features:**
- Content generation
- Text analysis
- Image processing
- Chatbot integration
- Recommendations

### 10. Analytics (`analytics`)
Comprehensive analytics and reporting system.

**Key Features:**
- Traffic analytics
- User behavior tracking
- Conversion tracking
- Custom events
- Real-time data

## Authentication

All protected endpoints require authentication via JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <token>
```

## Type Safety

All API endpoints are fully typed with TypeScript and Zod schemas, providing:
- Compile-time type checking
- Runtime validation
- Auto-generated TypeScript types
- IDE autocomplete support

## Usage Example

```typescript
import { createTRPCProxyClient } from '@trpc/client';
import type { AppRouter } from '@katalyst/api';

const client = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'https://api.katalyst.io/trpc',
    }),
  ],
});

// Type-safe API calls
const products = await client.storefront.listProducts.query({
  category: 'electronics',
  sortBy: 'price',
  limit: 20,
});

const order = await client.storefront.createOrder.mutate({
  items: [...],
  customer: {...},
});
```

## Rate Limiting

API endpoints are rate-limited based on the authentication level:
- Anonymous: 100 requests/minute
- Authenticated: 1000 requests/minute
- Pro/Enterprise: Custom limits

## Webhooks

Many modules support webhooks for real-time notifications:
- Order events
- Form submissions
- Member signups
- Payment events
- Content publishing

## Error Handling

Consistent error responses with proper HTTP status codes:
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 429: Too Many Requests
- 500: Internal Server Error

## Pagination

All list endpoints support pagination with consistent parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20-50)
- Response includes `total` and `pages`

## Filtering & Sorting

List endpoints support filtering and sorting:
- Multiple filter parameters
- Sort by various fields
- Ascending/descending order

## Performance

- Batch operations supported
- Response caching
- CDN integration for media
- Optimized database queries
- WebSocket support for real-time features

## Security

- Input validation with Zod
- SQL injection prevention
- XSS protection
- CSRF tokens
- Rate limiting
- API key scoping
- Audit logging

## Deployment

The API can be deployed on:
- Vercel (Edge Functions)
- Fly.io (Phoenix/Elixir backend)
- Cloudflare Workers
- Any Node.js environment

## Support

For API support and documentation:
- API Reference: https://docs.katalyst.io/api
- Status Page: https://status.katalyst.io
- Support: support@katalyst.io