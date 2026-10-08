import { z } from 'zod';

// Team Member (admin-managed)
export const createTeamMemberSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  photo: z.string().min(1, 'Photo is required'),
  designation: z.string().min(1, 'Designation is required'),
  category: z.enum(['TRUSTEE', 'CORE_TEAM', 'VOLUNTEER']),
  education: z.string().optional(),
  experience: z.string().optional(),
  linkedinUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const updateTeamMemberSchema = createTeamMemberSchema.partial();

// Testimonial (admin-managed)
export const createTestimonialSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  designation: z.string().optional(),
  photo: z.string().optional(),
  quote: z.string().min(1, 'Quote is required'),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const updateTestimonialSchema = createTestimonialSchema.partial();

// FAQ (admin-managed)
export const createFaqSchema = z.object({
  question: z.string().min(1, 'Question is required'),
  answer: z.string().min(1, 'Answer is required'),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const updateFaqSchema = createFaqSchema.partial();

// CV Request (public submission; status is a plain string, not an enum)
export const createCvRequestSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  education: z.string().optional(),
  currentRole: z.string().optional(),
  experience: z.string().optional(),
  skills: z.string().optional(),
  careerObjective: z.string().optional(),
  cvType: z.string().optional(),
  additionalRequirements: z.string().optional(),
  existingCvUrl: z.string().optional(),
});

export const updateCvRequestStatusSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED']),
});

export const updateCvRequestNotesSchema = z.object({
  adminNotes: z.string().nullable(),
});

// Contact message status update (admin-managed)
export const updateContactMessageStatusSchema = z.object({
  status: z.enum(['NEW', 'CONTACTED', 'CLOSED']),
});

// Reply (public submission; status is a plain string, not an enum)
export const createReplySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  subject: z.string().optional(),
  message: z.string().min(1, 'Message is required'),
});

export const updateReplyStatusSchema = z.object({
  status: z.enum(['NEW', 'READ', 'REPLIED']),
});

// Site config — arbitrary key/value map, upserted as a whole
export const siteConfigSchema = z.record(z.string(), z.string());

// Site Update (admin-managed)
export const createSiteUpdateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required'),
  shortDescription: z.string().min(1, 'Short description is required'),
  content: z.string().min(1, 'Content is required'),
  featuredImage: z.string().optional(),
  publishedAt: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const updateSiteUpdateSchema = createSiteUpdateSchema.partial();

// Hero Slide (admin-managed)
export const createHeroSlideSchema = z.object({
  image: z.string().min(1, 'Image is required'),
  headline: z.string().min(1, 'Headline is required'),
  subtext: z.string().optional(),
  ctaText: z.string().optional(),
  ctaLink: z.string().optional(),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const updateHeroSlideSchema = createHeroSlideSchema.partial();

// Impact Counter (admin-managed)
export const createImpactCounterSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  number: z.number().int(),
  icon: z.string().optional(),
  order: z.number().int().optional(),
});

export const updateImpactCounterSchema = createImpactCounterSchema.partial();

// Partner (admin-managed)
export const createPartnerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  logo: z.string().min(1, 'Logo is required'),
  websiteUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const updatePartnerSchema = createPartnerSchema.partial();

// Initiative (admin-managed)
const labelDescriptionSchema = z.object({
  label: z.string().min(1),
  description: z.string().min(1),
});

const labelValueSchema = z.object({
  label: z.string().min(1),
  value: z.number(),
});

export const createInitiativeSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required'),
  shortDesc: z.string().min(1, 'Short description is required'),
  fullDesc: z.string().min(1, 'Full description is required'),
  coverImage: z.string().min(1, 'Cover image is required'),
  featureImage: z.string().optional(),
  keyFeatures: z.array(labelDescriptionSchema).optional(),
  keyActivities: z.array(z.string()).optional(),
  howItWorks: z.array(labelDescriptionSchema).optional(),
  impactNumbers: z.array(labelValueSchema).optional(),
  impactPoints: z.array(z.string()).optional(),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const updateInitiativeSchema = createInitiativeSchema.partial();

// Gallery Album (admin-managed)
export const createGalleryAlbumSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  coverImage: z.string().min(1, 'Cover image is required'),
  eventDate: z.coerce.date().optional(),
  isActive: z.boolean().optional(),
});

export const updateGalleryAlbumSchema = createGalleryAlbumSchema.partial();

// Gallery Video (admin-managed)
export const createGalleryVideoSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  youtubeUrl: z.string().min(1, 'YouTube URL is required'),
  thumbnail: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const updateGalleryVideoSchema = createGalleryVideoSchema.partial();

// Campaign Category (admin-managed)
export const createCampaignCategorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required'),
  order: z.number().int().optional(),
});

export const updateCampaignCategorySchema = createCampaignCategorySchema.partial();

// Campaign (admin-managed). raisedAmount is intentionally excluded — it's a
// stored aggregate maintained by the donation-success flow (see
// markDonationSuccessful in routes/donations.ts), never admin-editable directly.
export const createCampaignSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().min(1, 'Slug is required'),
  summary: z.string().min(1, 'Summary is required'),
  story: z.string().min(1, 'Story is required'),
  coverImage: z.string().min(1, 'Cover image is required'),
  goalAmount: z.number().optional(),
  costBreakdown: z.array(z.object({
    item: z.string(),
    qty: z.number(),
    pricePerUnit: z.number(),
  })).optional(),
  presetAmounts: z.array(z.number()).optional(),
  status: z.enum(['ACTIVE', 'COMPLETED']).optional(),
  videoUrl: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  categoryId: z.number().int().nullable().optional(),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const updateCampaignSchema = createCampaignSchema.partial();

// Campaign Product (admin-managed)
export const createCampaignProductSchema = z.object({
  campaignId: z.number().int(),
  name: z.string().min(1, 'Name is required'),
  image: z.string().min(1, 'Image is required'),
  pricePerUnit: z.number(),
  availableQty: z.number().int().optional(),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const updateCampaignProductSchema = createCampaignProductSchema.partial();

// Campaign Project (admin-managed, one-to-one with Campaign)
export const upsertCampaignProjectSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  videoUrl: z.string().optional(),
  images: z.array(z.string()).optional(),
});

// Campaign Update (admin-managed, many-to-one with Campaign)
export const createCampaignUpdateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  images: z.array(z.string()).optional(),
  isPublished: z.boolean().optional(),
  publishedAt: z.coerce.date().optional(),
});

export const updateCampaignUpdateSchema = createCampaignUpdateSchema.partial();

// Blog (admin-managed)
export const createBlogSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  slug: z.string().min(1, 'Slug is required'),
  category: z.string().min(1, 'Category is required'),
  coverImage: z.string().min(1, 'Cover image is required'),
  content: z.string().min(1, 'Content is required'),
  publishedAt: z.coerce.date().optional(),
  isActive: z.boolean().optional(),
});

export const updateBlogSchema = createBlogSchema.partial();

// Camp Location (admin-managed)
export const createCampLocationSchema = z.object({
  initiativeId: z.number().int(),
  name: z.string().min(1, 'Name is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().optional(),
  state: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  campDate: z.coerce.date().optional(),
  description: z.string().optional(),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const updateCampLocationSchema = createCampLocationSchema.partial();

// Donation
const donationItemSchema = z.object({
  productId: z.number(),
  quantity: z.number().int().positive('Quantity must be at least 1'),
});

export const createDonationSchema = z.object({
  donorName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(10, 'Invalid phone number').optional(),
  address: z.string().optional(),
  pan: z.string().optional(),
  mode: z.enum(['CASH', 'PRODUCTS']).default('CASH'),
  amount: z.number().min(300, 'Minimum donation amount is ₹300').optional(),
  tipAmount: z.number().min(0).default(0),
  items: z.array(donationItemSchema).optional(),
  donationType: z.enum(['ONE_TIME', 'MONTHLY']).default('ONE_TIME'),
  campaignId: z.number().optional(),
  paymentMethod: z.string().min(1, 'Payment method is required'),
}).refine(
  (data) => data.mode !== 'CASH' || (typeof data.amount === 'number' && data.amount > 0),
  { message: 'amount is required for cash donations', path: ['amount'] }
).refine(
  (data) => data.mode !== 'PRODUCTS' || (Array.isArray(data.items) && data.items.length > 0),
  { message: 'items are required for product donations', path: ['items'] }
);

export type CreateDonation = z.infer<typeof createDonationSchema>;

// Volunteer Application
export const volunteerApplicationSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(10, 'Invalid phone number'),
  city: z.string().optional(),
  age: z.number().positive('Age must be valid').optional(),
  occupation: z.string().optional(),
  skills: z.string().optional(),
  areaOfInterest: z.string().optional(),
  availability: z.string().optional(),
  message: z.string().optional(),
});

export type VolunteerApplication = z.infer<typeof volunteerApplicationSchema>;

// Contact Message
export const contactMessageSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

export type ContactMessage = z.infer<typeof contactMessageSchema>;

// Partner Application
export const partnerApplicationSchema = z.object({
  organization: z.string().min(2, 'Organization name is required'),
  contactName: z.string().min(2, 'Contact name is required'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(10, 'Invalid phone number'),
  website: z.string().optional(),
  partnershipType: z.string().optional(),
  message: z.string().optional(),
});

export type PartnerApplication = z.infer<typeof partnerApplicationSchema>;

// Internship Application
export const internshipApplicationSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(10, 'Invalid phone number'),
  city: z.string().optional(),
  education: z.string().optional(),
  areaOfInterest: z.string().optional(),
  availability: z.string().optional(),
  message: z.string().optional(),
});

export type InternshipApplication = z.infer<typeof internshipApplicationSchema>;

// Admin-managed form fields (Partner / Internship / CV Building forms)
export const createFormFieldSchema = z.object({
  formType: z.enum(['PARTNER', 'INTERNSHIP', 'CV_BUILDING']),
  label: z.string().min(1, 'Label is required'),
  fieldKey: z.string().min(1, 'Field key is required').regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, 'Field key must start with a letter and contain only letters, numbers, and underscores'),
  fieldType: z.enum(['TEXT', 'EMAIL', 'PHONE', 'TEXTAREA', 'SELECT', 'NUMBER']).optional(),
  placeholder: z.string().optional(),
  required: z.boolean().optional(),
  options: z.array(z.string()).optional(),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const updateFormFieldSchema = createFormFieldSchema.partial();

// Application status update (admin-managed, shared shape across Partner/
// Internship/Volunteer applications)
export const updateApplicationStatusSchema = z.object({
  status: z.enum(['NEW', 'REVIEWING', 'CONTACTED', 'APPROVED', 'REJECTED', 'CLOSED']),
});

// Donation payment-status update (admin-managed). SUCCESS is deliberately excluded
// — it only ever happens through the real payment flow (markDonationSuccessful),
// which also generates a receipt, increments Campaign.raisedAmount, and sends an
// email. A raw admin edit must never be able to fake that.
export const updateDonationStatusSchema = z.object({
  paymentStatus: z.enum(['PENDING', 'FAILED']),
});

// Site settings (admin-managed singleton). All optional/partial — PUT only
// updates the fields it's given.
export const updateSiteSettingsSchema = z.object({
  logo: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  socialLinks: z.record(z.string(), z.string()).optional(),
  orgRegistrationNo: z.string().optional(),
  trust12A: z.string().optional(),
  trust80G: z.string().optional(),
  footerTagline: z.string().optional(),
  presetAmounts: z.array(z.number().positive()).optional(),
  tipPercentOptions: z.array(z.number().min(0)).optional(),
});

// Footer links (admin-managed; section is a plain string, not an enum, so new
// sections can be added without a migration)
export const createFooterLinkSchema = z.object({
  section: z.string().min(1, 'Section is required'),
  label: z.string().min(1, 'Label is required'),
  url: z.string().min(1, 'URL is required'),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const updateFooterLinkSchema = createFooterLinkSchema.partial();

// Policy page content (admin-managed)
export const updatePolicyPageSchema = z.object({
  content: z.string().min(1, 'Content is required'),
});

// Homepage mission-quote carousel (admin-managed)
export const createQuoteSchema = z.object({
  text: z.string().min(1, 'Quote text is required'),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const updateQuoteSchema = createQuoteSchema.partial();

// Homepage presence-map pins (admin-managed)
export const createPresenceLocationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  left: z.string().min(1, 'Left position is required'),
  top: z.string().min(1, 'Top position is required'),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const updatePresenceLocationSchema = createPresenceLocationSchema.partial();

export const createCampaignPhotoSchema = z.object({
  caption: z.string().optional(),
  order: z.number().int().optional(),
});

export const createCampaignVideoSchema = z.object({
  videoUrl: z.string().min(1, 'Video URL is required'),
  title: z.string().optional(),
  order: z.number().int().optional(),
});

export const updateCampaignVideoSchema = createCampaignVideoSchema.partial();

export const createInitiativeVideoSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  youtubeUrl: z.string().min(1, 'Video URL is required'),
  order: z.number().int().optional(),
});

export const updateInitiativeVideoSchema = createInitiativeVideoSchema.partial();

export const createCoreValueSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const updateCoreValueSchema = createCoreValueSchema.partial();
