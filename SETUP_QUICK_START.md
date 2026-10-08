# Quick Start Guide

Get the Win Foundations backend running in 5 minutes.

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+ running locally
- Code editor (VSCode recommended)

## Quick Setup

### 1. Install & Configure (2 min)
```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env - set these minimum values:
DATABASE_URL=postgresql://postgres:password@localhost:5432/win_foundation
FRONTEND_ORIGIN=http://localhost:3001
NODE_ENV=development
```

### 2. Database Setup (2 min)
```bash
# Create database (if not exists)
createdb win_foundation

# Initialize schema
npm run prisma:generate
npm run prisma:migrate

# Seed with sample data (optional but recommended)
npm run prisma:seed
```

### 3. Start Server (1 min)
```bash
npm run dev
```

You should see:
```
✓ Database connected
Win Foundations server running on http://localhost:3000
```

### 4. Test It
```bash
# In another terminal
curl http://localhost:3000/health

# Should respond:
# {"status":"healthy","database":"connected",...}
```

Done! Server is running.

## Next Steps

- **Read README.md** for full API documentation
- **Review CLAUDE.md** for architecture and decisions
- **Check MIGRATION_GUIDE.md** for production deployment
- **Implement payment gateway** in `src/services/payment.ts`
- **Configure email** (SMTP_* in .env)
- **Point frontend** to `http://localhost:3000/api`

## Common Issues

**"Could not connect to database"**
```bash
# Is PostgreSQL running?
psql -c "SELECT version();"

# Is DATABASE_URL correct?
echo $DATABASE_URL
```

**"Relation does not exist"**
```bash
# Run migrations
npm run prisma:migrate
```

**Port already in use**
```bash
# Change PORT in .env
PORT=3001
```

## Key Endpoints to Test

```bash
# Public read API
curl http://localhost:3000/api/initiatives
curl http://localhost:3000/api/campaigns
curl http://localhost:3000/api/settings
curl http://localhost:3000/api/team

# Form submissions (POST)
curl -X POST http://localhost:3000/api/donations \
  -H "Content-Type: application/json" \
  -d '{"donorName":"John","email":"john@example.com","amount":1000,"paymentMethod":"card"}'
```

## Environment Variables Cheat Sheet

Required:
- `DATABASE_URL` - PostgreSQL connection
- `FRONTEND_ORIGIN` - Next.js frontend URL
- `NODE_ENV` - development/production

Email (for form confirmations):
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `ADMIN_EMAIL`

Security:
- `RECAPTCHA_SECRET` - For contact form

Payment (use placeholder initially):
- `PAYMENT_GATEWAY_KEY`, `PAYMENT_GATEWAY_SECRET`

## Development Commands

```bash
npm run dev              # Hot-reload dev server
npm run build            # Compile TypeScript
npm start                # Run production build
npx tsc --noEmit         # Check TypeScript without building
npm run prisma:generate  # Regenerate Prisma client
npm run prisma:migrate   # Run database migrations
npm run prisma:seed      # Populate sample data
```

## Directory Structure

```
src/
  index.ts              ← Main Express app
  routes/               ← API endpoints
  services/             ← Email, payment, PDF
  middleware/           ← Rate limiting
  types/                ← Zod schemas
  utils/                ← Helper functions

prisma/
  schema.prisma         ← Database schema
  seed.ts               ← Sample data

dist/                   ← Build output (don't edit)
```

## For Admin Panel Developer

Your colleague building the admin panel should:

1. Clone this repo (or use same schema)
2. Set `DATABASE_URL` to same PostgreSQL database
3. Run `npm run prisma:generate`
4. Build admin CRUD routes against same schema

Both backends share one database - no duplication needed.

## Getting Help

1. **API questions**: Check route files in `src/routes/`
2. **Schema questions**: See `prisma/schema.prisma` with comments
3. **Deployment**: Read `MIGRATION_GUIDE.md`
4. **Architecture**: Read `CLAUDE.md`
5. **Full docs**: See `README.md`

## Production Checklist

Before deploying:
- [ ] Build works: `npm run build`
- [ ] TypeScript clean: `npx tsc --noEmit`
- [ ] .env configured with production values
- [ ] Database migrated: `npm run prisma:migrate`
- [ ] Email service tested
- [ ] Payment gateway keys configured
- [ ] CORS origin set to production frontend URL
- [ ] Backups configured

Deploy with `npm start` (or use Railway/Render for 1-click deploy).

That's it! Happy building. 🚀
