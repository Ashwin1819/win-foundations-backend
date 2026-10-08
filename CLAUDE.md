# Win Foundations Backend - CLAUDE.md

## Project Overview

This is a TypeScript/Node.js backend for the Win Foundations NGO website. It provides:

1. **Public-facing REST API** - Read endpoints for content (initiatives, campaigns, team, etc.)
2. **Form submissions** - Donations, volunteer applications, contact messages with email/payment integration
3. **Admin-ready database** - Complete Prisma schema with all content types and admin fields
4. **Type-safe validation** - Zod schemas for all form inputs
5. **Email integration** - Nodemailer for receipt/confirmation emails
6. **PDF generation** - PDFKit for donation receipts
7. **Rate limiting** - Form submission protection
8. **reCAPTCHA** - Bot protection on contact form
9. **Payment abstraction** - Pluggable payment processor (Razorpay/Stripe/etc.)

## Technology Stack

- **Runtime**: Node.js
- **Language**: TypeScript (strict mode)
- **Web Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Validation**: Zod
- **Rate Limiting**: express-rate-limit
- **Security**: Helmet, CORS
- **File Uploads**: Multer
- **Email**: Nodemailer
- **PDF**: PDFKit
- **Dev Tools**: ts-node-dev, tsx, TypeScript compiler

## Project Structure

```
win-foundation/
├── src/
│   ├── index.ts                 # Entry point - Express app setup
│   ├── routes/                  # API route handlers
│   │   ├── index.ts            # Route aggregator
│   │   ├── settings.ts         # GET /api/settings
│   │   ├── seo.ts              # GET /api/seo/:page
│   │   ├── heroSlides.ts       # GET /api/hero-slides
│   │   ├── initiatives.ts      # GET /api/initiatives/:?slug
│   │   ├── campaigns.ts        # GET /api/campaigns/:?slug
│   │   ├── updates.ts          # GET /api/updates with pagination
│   │   ├── team.ts             # GET /api/team (grouped by category)
│   │   ├── gallery.ts          # GET /api/gallery/albums, videos
│   │   ├── testimonials.ts     # GET /api/testimonials
│   │   ├── impact.ts           # GET /api/impact-counters
│   │   ├── partners.ts         # GET /api/partners
│   │   ├── policies.ts         # GET /api/policies/:type
│   │   ├── donations.ts        # POST /api/donations
│   │   ├── volunteers.ts       # POST /api/volunteers
│   │   └── contact.ts          # POST /api/contact
│   ├── services/
│   │   ├── payment.ts          # Payment gateway abstraction (implement with Razorpay/Stripe)
│   │   ├── email.ts            # Email sending (Nodemailer)
│   │   ├── receipt.ts          # PDF receipt generation (PDFKit)
│   │   └── recaptcha.ts        # reCAPTCHA server-side verification
│   ├── middleware/
│   │   └── rateLimiter.ts      # Express rate-limit setup
│   ├── types/
│   │   └── validation.ts       # Zod schemas for form validation
│   └── utils/
│       └── asyncHandler.ts     # Async route wrapper for error catching
├── prisma/
│   ├── schema.prisma           # Database schema (complete, admin-ready)
│   └── seed.ts                 # Seed script with sample data
├── dist/                       # Compiled JavaScript (build output)
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
└── README.md
```

## Key Decisions

### Schema Design
- **Enums for controlled fields**: AdminRole, CampaignStatus, DonationType, PaymentStatus, ApplicationStatus, MessageStatus, PolicyType, TeamCategory
- **Soft visibility via `isActive`**: All content tables have an `isActive` boolean for admin control without data deletion
- **Order fields**: All display lists have an `order` int field for admin-controlled sorting
- **JSON fields**: flexible data in `socialLinks`, `keyActivities`, `impactNumbers` for future extensibility
- **Strategic indexes**: Slug (unique, searchable), isActive+order (common queries), foreign keys (relations)
- **Timestamps**: `createdAt` (auto), `updatedAt` (auto) on all tables for audit trail

### Route Design
- **Consistent JSON responses**: All endpoints return JSON
- **Active-only by default**: Read endpoints filter `isActive: true` (admin-managed visibility)
- **Pagination support**: `/updates` endpoint includes limit/offset for infinite scroll
- **Grouped endpoints**: `/team` groups by category; `/gallery` separates albums/videos
- **Relation eager-loading**: Initiative/Campaign/Album routes include photos

### Error Handling
- **asyncHandler wrapper**: All async routes wrapped to catch Promise rejections
- **Zod validation**: 400 status with field-level error details
- **Centralized error middleware**: Consistent error response format
- **Development stack traces**: Included in error responses in development mode

### Security
- **Rate limiting**: 5 form submissions per 15 minutes, 100 general API requests per minute
- **CORS**: Restricted to FRONTEND_ORIGIN env var
- **Helmet**: HTTP security headers
- **reCAPTCHA**: Contact form bot protection
- **Zod validation**: Input validation on all form submissions
- **No secrets in code**: All config via env vars

### Services
- **Payment abstraction**: Interface-based design allows plugging in Razorpay, Stripe, PayU without changing routes
- **Email service**: Centralized Nodemailer setup with reusable functions (receipt, confirmation, admin alert)
- **PDF receipts**: On-demand generation with donor details, PAN, 80G eligibility marking
- **reCAPTCHA**: Server-side verification with configurable threshold

## Admin Panel Integration (For Your Colleague)

The admin panel will connect to the **same PostgreSQL database** via Prisma.

### Setup in Admin Codebase
```bash
# 1. Share the same prisma/schema.prisma or copy it
# 2. Generate types
npm run prisma:generate

# 3. Connect to same DATABASE_URL
DATABASE_URL=postgresql://... npm run dev
```

### Admin-Only Responsibilities
These fields/tables exist purely for the admin panel to manage; the public backend reads them but does not expose admin routes:

- **AdminUser** - Create admin authentication, JWT/sessions
- **isActive toggles** - Control content visibility on all tables
- **order fields** - Control display ordering on all tables
- **SiteSettings** - Manage branding, contact info, social links
- **SEOMeta** - Manage page-level SEO (title, description, keywords)
- **Donation.paymentStatus** - Mark donations as SUCCESS/FAILED/PENDING
- **Donation.receiptPdfUrl** - Regenerate receipts
- **VolunteerApplication.status** - Mark as CONTACTED/CLOSED
- **ContactMessage.status** - Mark as CONTACTED/CLOSED

### Data Flow
```
NextJS Frontend
    ↓ (reads public API)
Public Backend (this repo)
    ↓ (shared database)
PostgreSQL
    ↑ (admin CRUD)
Admin Backend (your colleague)
    ↑ (serves admin UI)
Admin Frontend (your colleague)
```

## Development Workflow

### First-time Setup
```bash
# 1. Copy .env.example to .env
cp .env.example .env

# 2. Configure DATABASE_URL, SMTP, etc.
# 3. Generate Prisma client
npm run prisma:generate

# 4. Create and migrate database
npm run prisma:migrate

# 5. Seed with sample data
npm run prisma:seed

# 6. Start dev server
npm run dev
```

### During Development
```bash
# Hot-reload dev server
npm run dev

# Check TypeScript
npx tsc --noEmit

# Rebuild after schema changes
npm run prisma:migrate

# Add seed data for testing
npm run prisma:seed
```

### Before Shipping
```bash
# Build TypeScript
npm run build

# Type-check
npx tsc --noEmit

# Test endpoints manually
curl http://localhost:3000/api/initiatives

# Verify env vars set in production
# DATABASE_URL, FRONTEND_ORIGIN, SMTP_*, PAYMENT_*, RECAPTCHA_SECRET
```

## Configuration

### Environment Variables
```env
# Database (required)
DATABASE_URL=postgresql://user:pass@localhost:5432/win_foundation

# Server
PORT=3000
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:3001

# Email (required for form confirmations)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@winfoundations.in
ADMIN_EMAIL=info@winfoundations.in

# Payment (required, currently placeholder)
PAYMENT_GATEWAY_KEY=your-key
PAYMENT_GATEWAY_SECRET=your-secret

# reCAPTCHA (required for contact form)
RECAPTCHA_SECRET=your-recaptcha-secret

# File uploads
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880
```

## Next Steps

### Immediate (To Get Running)
1. **Database setup**: Create PostgreSQL database, set DATABASE_URL
2. **Email config**: Configure SMTP with your email provider (Gmail, SendGrid, AWS SES)
3. **Seed data**: Run `npm run prisma:seed` to populate sample content
4. **Frontend integration**: Point Next.js frontend to http://localhost:3000/api

### Integration Work
1. **Payment gateway**: Implement `src/services/payment.ts` with your chosen processor
   - Razorpay: [Razorpay Node SDK](https://razorpay.com)
   - Stripe: [Stripe Node SDK](https://stripe.com/docs/js)
   - PayU: [PayU Node SDK](https://www.payu.in)
2. **File uploads**: Implement file upload routes if needed for image management
3. **Webhook handling**: Add payment gateway webhooks for donation status updates

### For Admin Panel Colleague
1. **Schema review**: Ensure they're building against the same `prisma/schema.prisma`
2. **Authentication**: Implement admin login using AdminUser model
3. **CRUD routes**: Build `/api/admin/*` routes for their admin UI
4. **Sync schema**: If they add fields/tables, regenerate client (`npm run prisma:generate`)

## Debugging

### Common Issues

**"Could not connect to database"**
- Check DATABASE_URL is correct
- Ensure PostgreSQL is running
- Verify user has permission to create database

**"Prisma client not found"**
- Run `npm run prisma:generate`
- Clear node_modules and reinstall if persist

**"Email not sending"**
- Verify SMTP credentials in .env
- Check Gmail: need app password (not regular password)
- Check logs for actual SMTP error

**"Payment endpoints 404"**
- Ensure routes are imported in `src/routes/index.ts`
- Check route paths match API calls

**TypeScript errors**
- Run `npx tsc --noEmit` to see all errors
- Check .d.ts files in src/types if needed

### Logging
- Morgan logs all HTTP requests in dev mode
- Async errors logged via middleware
- Email/payment errors logged to console

## Performance Notes

- **Database indexes**: Defined on slug, isActive, category, foreign keys
- **Eager loading**: Relations loaded upfront (photos, etc.) to avoid N+1 queries
- **Pagination**: `/updates` supports limit/offset to prevent large result sets
- **Rate limiting**: Form submissions rate-limited to prevent spam/abuse

## Testing Notes

Seed data includes:
- 2 initiatives with photos
- 1 campaign with photos
- 1 blog post
- 4 team members
- 1 gallery album with photos
- 2 gallery videos
- 2 testimonials
- 4 impact counters
- 3 partners
- 3 policy pages

Use this to test frontend without needing admin panel first.

## Deployment Checklist

- [ ] Database migrated to production PostgreSQL
- [ ] Environment variables configured (DATABASE_URL, SMTP, Payment, reCAPTCHA, FRONTEND_ORIGIN)
- [ ] Build succeeds: `npm run build`
- [ ] TypeScript checks pass: `npx tsc --noEmit`
- [ ] Endpoints tested against production database
- [ ] Email sending verified
- [ ] Payment gateway keys configured and tested
- [ ] CORS origin points to production frontend
- [ ] Rate limiting active (not in dev mode)
- [ ] Error logging configured
- [ ] Backups scheduled for PostgreSQL database

## Support

For questions on:
- **Schema design**: Check `prisma/schema.prisma` comments and README
- **API endpoints**: See route files in `src/routes/*`
- **Email/Payment**: See `src/services/*` files
- **Error handling**: See async wrapper in `src/utils/asyncHandler.ts`
- **Database queries**: See Prisma docs at https://www.prisma.io/docs/
