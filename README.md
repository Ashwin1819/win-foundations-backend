# Backend — WIN Foundations API

Express.js + TypeScript REST API. The single source of truth for all data. Both the public frontend and the admin panel communicate exclusively through this service.

## Tech Stack

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Language:** TypeScript
- **ORM:** Prisma
- **Database:** PostgreSQL (Supabase)
- **Auth:** JWT + bcrypt
- **File uploads:** multer
- **Email:** nodemailer (Gmail SMTP)
- **Payments:** Razorpay (built, pending activation)

## Getting Started

```bash
npm install

# Copy and fill in environment variables
cp .env.example .env

# Push Prisma schema to database (use db push, not migrate dev)
npx prisma db push

# Start development server
npm run dev
```

The server starts on `http://localhost:3000` by default (`PORT` in `.env`).

## Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Database
DATABASE_URL=postgresql://...        # Supabase connection string

# Server
PORT=3000
NODE_ENV=development

# CORS
FRONTEND_ORIGIN=http://localhost:3001

# Admin panel URL — used to build the password-reset link
ADMIN_PANEL_URL=http://localhost:3002

# Auth
JWT_SECRET=                          # Long random string, shared with the admin panel

# Internal API key — dormant fallback, accepted as an alternative to a JWT
# on admin routes for trusted server-to-server calls. Not used in normal operation.
INTERNAL_ADMIN_API_KEY=

# Email (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=                           # Gmail App Password (not your Google password)
SMTP_FROM=your@gmail.com
ADMIN_EMAIL=your@gmail.com           # Where contact form / donation / application notifications go

# Payment (add once Razorpay business verification is complete)
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# reCAPTCHA
RECAPTCHA_SECRET=

# File uploads
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880
```

### Setting up Gmail SMTP

1. Enable 2-Step Verification on your Google account
2. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Generate an App Password for "Mail"
4. Use that 16-character password as `SMTP_PASS`

## API Routes

All routes are prefixed with `/api`. 🔒 = requires `requireAdmin` (a valid `admin_token` JWT, or the dormant `x-internal-api-key` header).

### Authentication
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Admin login, returns a JWT |
| `GET` | `/api/auth/me` | 🔒 | Current admin's identity |
| `POST` | `/api/auth/forgot-password` | Public | Request a password-reset email |
| `POST` | `/api/auth/reset-password` | Public | Reset password with a reset token |

> There's no backend logout route — logging out just clears the `admin_token` cookie, handled entirely by the admin app's own `/api/auth/logout` route, with no backend call needed.

### Campaigns
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/campaigns` | Public | Active campaigns |
| `GET` | `/api/campaigns/all` | 🔒 | All campaigns (including inactive) |
| `GET` | `/api/campaigns/:slug` | Public | Single campaign by slug |
| `POST` | `/api/campaigns` | 🔒 | Create campaign |
| `PUT` | `/api/campaigns/:id` | 🔒 | Update campaign |
| `DELETE` | `/api/campaigns/:id` | 🔒 | Delete campaign |

Campaigns also have nested admin-only sub-resources: products (`/api/campaigns/:id/products`, `/api/campaigns/products/:productId`), project details (`/api/campaigns/:id/project`), and campaign updates (`/api/campaigns/:id/updates`, `/api/campaigns/updates/:updateId`).

### Donations
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/donations` | Public | Create donation, initializes a Razorpay order |
| `POST` | `/api/donations/verify/:donationId` | Public | Verify a Razorpay checkout signature |
| `POST` | `/api/donations/webhook` | Public | Razorpay server-to-server webhook |
| `GET` | `/api/donations/all` | 🔒 | All donations with campaign info |
| `GET` | `/api/donations/:id` | 🔒 | Single donation |
| `PUT` | `/api/donations/:id/status` | 🔒 | Update status (`PENDING` or `FAILED` only — `SUCCESS` is set only by the real payment flow, never a manual edit) |
| `DELETE` | `/api/donations/:id` | 🔒 | Delete donation |

### Blogs / Initiatives / Team / Testimonials / FAQ / Hero Slides / Partners / Impact Counters
Standard CRUD with public `GET` and admin-protected `POST`, `PUT`, `DELETE`. Public GETs return active items only; admin `/all` endpoints return everything. Gallery follows the same pattern but is split into albums, photos, and videos (`/api/gallery/albums`, `/api/gallery/videos`).

### Partner Applications
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/partner-applications` | Public | Submit application |
| `GET` | `/api/partner-applications` | 🔒 | All applications |
| `PUT` | `/api/partner-applications/:id` | 🔒 | Update an application (status included in the body) |
| `DELETE` | `/api/partner-applications/:id` | 🔒 | Delete |

### Internship Applications
Same pattern as partner applications (`POST /`, `GET /` 🔒, `PUT /:id` 🔒, `DELETE /:id` 🔒). Fields: `fullName`, `email`, `phone`, `city`, `education`, `areaOfInterest`, `availability`, `message`.

### Volunteer Applications
Same pattern. Fields: `fullName`, `email`, `phone`, `city`, `age`, `occupation`, `skills`, `areaOfInterest`, `availability`, `message`.

### CV Requests
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/cv-requests` | Public | Submit CV request |
| `GET` | `/api/cv-requests/all` | 🔒 | All requests |
| `PUT` | `/api/cv-requests/:id/status` | 🔒 | Update status (`PENDING`/`IN_PROGRESS`/`COMPLETED`/`REJECTED`) |
| `PUT` | `/api/cv-requests/:id/notes` | 🔒 | Update internal notes |
| `DELETE` | `/api/cv-requests/:id` | 🔒 | Delete |

### Contact / Messages
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/contact` | Public | Submit contact message |
| `GET` | `/api/contact/all` | 🔒 | All messages |
| `PUT` | `/api/contact/:id/status` | 🔒 | Update status (`NEW`/`CONTACTED`/`CLOSED`) |
| `DELETE` | `/api/contact/:id` | 🔒 | Delete |

### Replies
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/replies` | Public | Submit a reply/feedback |
| `GET` | `/api/replies/all` | 🔒 | All replies |
| `PUT` | `/api/replies/:id/status` | 🔒 | Update status (`NEW`/`READ`/`REPLIED`) |
| `DELETE` | `/api/replies/:id` | 🔒 | Delete |

### Site Config (Key/Value Store)
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/site-config` | Public | All config as a flat `{key: value}` object |
| `PUT` | `/api/site-config` | 🔒 | Upsert one or more config keys |

### Site Updates (News/Announcements)
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/site-updates/all` | 🔒 | All updates |
| `GET` | `/api/site-updates` | Public | Active updates only, ordered |
| `POST` | `/api/site-updates` | 🔒 | Create update |
| `PUT` | `/api/site-updates/:id` | 🔒 | Update |
| `DELETE` | `/api/site-updates/:id` | 🔒 | Delete |

### Media (File Uploads)
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/media/upload` | 🔒 | Upload an image/video (multipart, field `file`). Optionally attach to a Blog or CampLocation; neither given means a standalone upload. Returns the created Media row, including its `url`. |
| `GET` | `/api/media/all` | 🔒 | All media, regardless of parent |
| `PUT` | `/api/media/:id` | 🔒 | Update title/caption |
| `DELETE` | `/api/media/:id` | 🔒 | Delete |

## Authentication

The backend uses **JWT + bcrypt**:

- Admin logs in via `POST /api/auth/login` with email + password
- On success, a signed JWT is returned and the admin app stores it as an httpOnly cookie (`admin_token`, `SameSite=Lax`)
- Protected routes use `requireAdmin` middleware, which verifies `Authorization: Bearer <token>`
- The `requireAdmin` middleware also accepts an `x-internal-api-key` header as a fallback (dormant — not used in normal operation)

There is exactly **one admin account**. No multi-user management UI exists.

## Data Models (key ones)

```
AdminUser             — one record, bcrypt password
Campaign              — fundraising campaigns (+ CampaignCategory/Photo/Video/Product/Project/Update)
Donation / DonationItem — linked to Campaign, PaymentStatus enum
Blog                   — published articles
Initiative             — programme/project pages (+ InitiativePhoto)
TeamMember             — team profiles
GalleryAlbum / GalleryPhoto / GalleryVideo — photo/video gallery
Testimonial             — donor/volunteer testimonials
FAQ                     — frequently asked questions
HeroSlide               — homepage carousel slides
PartnerApplication
InternshipApplication
VolunteerApplication
CVRequest               — CV/resume service requests
ContactMessage          — contact form submissions (route: /api/contact)
Reply                   — general reply/feedback form
SiteConfig              — key/value store for site settings
SiteUpdate              — news/announcements
Media                   — uploaded files, optionally attached to a Blog or CampLocation
CampLocation            — relief/outreach camp locations
```

## Status Enums

```
ApplicationStatus: NEW | REVIEWING | CONTACTED | APPROVED | REJECTED | CLOSED
PaymentStatus:     PENDING | SUCCESS | FAILED
MessageStatus:     NEW | CONTACTED | CLOSED
CVRequest.status:  PENDING | IN_PROGRESS | COMPLETED | REJECTED  (plain String, not enum)
Reply.status:      NEW | READ | REPLIED  (plain String, not enum)
```

## Database Commands

```bash
# Apply schema changes to database (use this, not migrate dev)
npx prisma db push

# Open Prisma Studio (visual DB browser)
npx prisma studio

# Regenerate Prisma client after schema changes
npx prisma generate
```

## Payments (Razorpay)

The payment flow is fully built but inactive (no live keys configured). To activate:

1. Complete business verification on [razorpay.com](https://razorpay.com)
2. Get your API keys and webhook secret from the Razorpay Dashboard
3. Add to `.env`:
   ```
   RAZORPAY_KEY_ID=rzp_live_...
   RAZORPAY_KEY_SECRET=...
   RAZORPAY_WEBHOOK_SECRET=...
   ```
4. Restart the server — no code changes needed

## Scripts

```bash
npm run dev      # Development with hot reload (ts-node-dev)
npm run build    # Compile TypeScript
npm start        # Run compiled output
```
