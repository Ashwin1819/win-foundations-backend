# Database Migration & Deployment Guide

## Initial Setup (Development)

### 1. Create Local PostgreSQL Database

**Windows (using PostgreSQL installer):**
```bash
# After installing PostgreSQL, create database
createdb -U postgres win_foundation

# Or using psql shell
psql -U postgres
> CREATE DATABASE win_foundation;
> \q
```

**macOS (using Homebrew):**
```bash
brew install postgresql
brew services start postgresql
createdb win_foundation
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install postgresql postgresql-contrib
sudo -u postgres createdb win_foundation
```

### 2. Configure Environment
```bash
# Copy example to .env
cp .env.example .env

# Update .env with your database URL
DATABASE_URL="postgresql://postgres:password@localhost:5432/win_foundation"
```

### 3. Initialize Database
```bash
# Generate Prisma client (required after schema changes)
npm run prisma:generate

# Create initial migration
npm run prisma:migrate
# Follow prompts - name it "init"

# Seed with sample data (optional, for frontend testing)
npm run prisma:seed
```

### 4. Verify Setup
```bash
# Start dev server
npm run dev

# Test health endpoint
curl http://localhost:3000/health

# You should see:
# {
#   "status": "healthy",
#   "timestamp": "2026-09-28T...",
#   "uptime": 123.45,
#   "database": "connected"
# }
```

## Production Deployment

### 1. Choose PostgreSQL Host

**Options:**
- **Cloud**: AWS RDS, Heroku PostgreSQL, Railway, Supabase, PlanetScale
- **Managed**: DigitalOcean Managed Databases
- **Self-hosted**: EC2, VPS, or bare metal

**Recommended for NGO**: Supabase (PostgreSQL + Auth) or Railway (simple deployment)

### 2. Database Setup on Production Host

**For Railway:**
```bash
# Create Railway project → Add PostgreSQL plugin
# Copy DATABASE_URL from plugin settings
# Set as environment variable in your deployment
```

**For Supabase:**
```bash
# Create Supabase project
# Go to Settings → Database → Connection Pooling
# Copy psycopg2 connection string
# Replace host with pooler endpoint
```

**For AWS RDS:**
```bash
# Create PostgreSQL 14+ database
# Security group must allow inbound on port 5432
# Copy connection string format:
# postgresql://user:password@db-xyz.region.rds.amazonaws.com:5432/win_foundation
```

### 3. Prepare Code for Deployment

```bash
# Run final build
npm run build

# Verify TypeScript
npx tsc --noEmit

# Check .gitignore has important files
cat .gitignore
# Should include: .env, node_modules/, dist/, uploads/
```

### 4. Deploy Backend

**Using Railway (Recommended for NGO):**
```bash
# 1. Push code to GitHub
git add .
git commit -m "Initial commit"
git push origin main

# 2. Create Railway project
# 3. Connect GitHub repo
# 4. Add PostgreSQL plugin
# 5. Add environment variables:
#    - DATABASE_URL (from PostgreSQL plugin)
#    - FRONTEND_ORIGIN (your Next.js URL)
#    - SMTP_* (email config)
#    - PAYMENT_* (payment gateway keys)
#    - RECAPTCHA_SECRET
#    - NODE_ENV=production
#    - PORT=3000

# 6. Railway auto-deploys on git push
git push
```

**Using Render.com:**
```bash
# Similar to Railway - connect GitHub, set env vars, auto-deploy
```

**Using Docker (for advanced users):**
```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --production

COPY dist dist
COPY prisma prisma

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/index.js"]
```

### 5. Run Migrations on Production

**IMPORTANT**: Run migrations BEFORE deploying new code

```bash
# SSH into production or use deployment platform's console
npm run prisma:migrate -- --skip-generate

# Or using npx directly
npx prisma migrate deploy

# Check migration history
npx prisma migrate status
```

### 6. Seed Production Database (Optional)

Only do this ONCE for initial data:
```bash
npm run prisma:seed
```

**DO NOT run seed on existing production database** - it will duplicate data.

### 7. Test Production Endpoint

```bash
# Health check
curl https://your-backend-url.com/health

# Verify CORS
curl -H "Origin: https://your-frontend-url.com" https://your-backend-url.com/api/initiatives
```

## Schema Migrations

### Adding New Fields

**Example: Add phone field to Donation**

```prisma
// prisma/schema.prisma
model Donation {
  // ... existing fields
  phone String? // Add this line
}
```

```bash
# Create and apply migration
npm run prisma:migrate -- --name add_phone_to_donation

# Prisma generates SQL migration file
# Review and run
```

### Adding New Tables

```prisma
// prisma/schema.prisma
model Newsletter {
  id        Int     @id @default(autoincrement())
  email     String  @unique
  status    String  @default("active")
  createdAt DateTime @default(now())
}
```

```bash
npm run prisma:migrate -- --name add_newsletter_table
```

### Renaming Fields

Use shadow database for safe renames:
```bash
# 1. Set DATABASE_URL_SHADOW in .env
# 2. Create migration
npm run prisma:migrate -- --name rename_field

# 3. Update code to use new name
# 4. Deploy new code
```

## Backup & Recovery

### Automated Backups

**Railway/Supabase**: Automatic daily backups (check dashboard)
**AWS RDS**: Enable automated backups (7-30 days)

### Manual Backup

```bash
# Local backup
pg_dump -U postgres win_foundation > backup-2026-09-28.sql

# Production backup (requires SSH access)
ssh user@server
pg_dump postgresql://user:pass@localhost/win_foundation > backup.sql
scp backup.sql local-machine:~/
```

### Restore from Backup

```bash
# Drop current database
dropdb -U postgres win_foundation

# Restore from backup
psql -U postgres -d win_foundation < backup.sql

# Regenerate Prisma client
npm run prisma:generate
```

## Monitoring & Maintenance

### Check Database Health

```bash
# Connection count
SELECT count(*) FROM pg_stat_activity;

# Slow queries (requires log_min_duration_statement config)
SELECT mean_time, calls, query FROM pg_stat_statements ORDER BY mean_time DESC;

# Table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) FROM pg_tables ORDER BY pg_total_relation_size DESC;
```

### Connection Pooling

For serverless deployments, use Prisma connection pooling:

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  relationshipMode = "prisma"  // For serverless with cascade issues
}
```

Update DATABASE_URL to use connection pooler:
```
postgresql://user:password@pooler.region.railway.app:5432/win_foundation
```

### Performance Optimization

```sql
-- Create indexes for common queries
CREATE INDEX idx_initiative_active_order ON "Initiative"(isActive, order);
CREATE INDEX idx_campaign_active_order ON "Campaign"(isActive, order);
CREATE INDEX idx_donation_email ON "Donation"(email);
CREATE INDEX idx_donation_status ON "Donation"(paymentStatus);
```

## Troubleshooting

### "connect ECONNREFUSED"
- PostgreSQL not running
- Wrong DATABASE_URL
- Network/firewall blocking connection

**Fix:**
```bash
# Check PostgreSQL running
psql -c "SELECT version();"

# Verify DATABASE_URL
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT 1;"
```

### "Relation does not exist"
- Migrations not run
- Wrong database name

**Fix:**
```bash
npx prisma migrate status
npm run prisma:migrate
```

### "Lost connection during query"
- Database restarting
- Network interruption
- Query timeout

**Fix:**
```bash
# Increase connection timeout in DATABASE_URL
postgresql://...?connect_timeout=10&statement_timeout=60000

# Or restart backend
```

### Disk Space Full
- Database grown too large
- Backups accumulating

**Fix:**
```bash
# Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(...)) FROM pg_tables;

# Archive old donations/messages
DELETE FROM "ContactMessage" WHERE createdAt < '2024-01-01';

# Vacuum to reclaim space
VACUUM FULL;
```

## Admin Panel Colleague's Setup

Your colleague building the admin panel should:

1. **Clone this repo** or copy `prisma/schema.prisma`

2. **Configure same DATABASE_URL**:
   ```bash
   # Use same production database
   DATABASE_URL="postgresql://..."
   ```

3. **Generate Prisma types**:
   ```bash
   npm run prisma:generate
   ```

4. **Run migrations** (same database):
   ```bash
   npm run prisma:migrate
   ```

5. **Sync schema** when either of you adds fields:
   ```bash
   # Admin side adds field
   npm run prisma:migrate

   # Backend side pulls and regenerates
   git pull
   npm run prisma:generate
   ```

## Scaling Considerations

**For 1000s of active donations/month:**
- Enable query logging: `log_statement='all'`
- Archive old data to separate table
- Add read replicas for analytics queries
- Use connection pooling (PgBouncer or cloud pooler)

**For 10,000+ monthly users:**
- Redis caching for frequently read content (initiatives, campaigns)
- CDN for static files (images, PDFs)
- Separate database replica for analytics
- Implement rate limiting tiers

## Checklist

- [ ] PostgreSQL database created on production host
- [ ] DATABASE_URL configured in deployment environment
- [ ] SMTP credentials tested (send test email)
- [ ] Payment gateway keys configured
- [ ] reCAPTCHA keys configured
- [ ] FRONTEND_ORIGIN set to production Next.js URL
- [ ] Migrations run on production: `npm run prisma:migrate`
- [ ] Initial seed data loaded (if needed)
- [ ] Health endpoint returns 200 and "database": "connected"
- [ ] Sample API calls tested (GET /api/initiatives, POST /api/donations mock)
- [ ] Email sending works (donate/volunteer/contact triggers emails)
- [ ] Backups configured
- [ ] Monitoring/logging set up
- [ ] Admin panel colleague has database access
