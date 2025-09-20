# External Database Integration

This document explains how to set up and use the external PostgreSQL database integration in the oms-chat application.

## Setup

### 1. Environment Configuration

Add your external database URL to `.env.local`:

```env
EXTERNAL_DB=postgresql://username:password@host:port/database
```

### 2. Schema Ready

The external database schema has been converted from the Prisma schema and is ready to use. The schema includes:

- **Core Tables**: users, accounts, sessions, roles, permissions
- **Order Management**: orders, orderItems, transactions, orderTags, orderFilters
- **User Management**: userRoles, userActivities, savedViews, onboardingProfiles
- **Case Studies**: caseStudies, monthlyData, keywordData, serpFeatures
- **Notifications**: notificationTypes, notifications, userNotificationReads
- **Commerce**: products, productFeatures, productTags, reviews, reviewTags, reviewProducts
- **Tag System**: tags, userTags, orderTags, bonusRules, bonusGrants
- **Projects**: projects, projectCompetitors
- **User Features**: wishlists, wishlistItems, searchInterests, feedback
- **AI Chatbot**: aiChatbotConfig, aiChatbotNavigation

If you need to introspect from a different database, you can still run:

```bash
pnpm db:introspect
```

This will overwrite the current schema with the actual database structure.

### 3. Using the External Database

Import and use the external database connection:

```typescript
import { external_db } from '@/lib/external-db';

// Example usage
const users = await external_db.select().from(externalSchema.users);
```

## Available Scripts

- `pnpm db:introspect` - Pull schema from external database
- `pnpm db:generate` - Generate migrations for external database
- `pnpm db:migrate:external` - Run migrations on external database

## File Structure

```
lib/
├── external-db.ts          # Database connection (named 'external_db')
├── external-schema.ts      # Generated schema from external DB
└── drizzle-external/       # Generated migrations

drizzle-external.config.ts  # Drizzle config for external DB
```

## Notes

- The external database connection is named `external_db` as requested
- Uses a single session pattern for connection reuse
- Schema is automatically generated from the actual database structure
- Follows the same pattern as algo-chat implementation
