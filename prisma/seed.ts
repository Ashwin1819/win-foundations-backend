import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clear existing data (careful in production!)
  await prisma.initiativePhoto.deleteMany();
  await prisma.initiative.deleteMany();
  await prisma.campaignPhoto.deleteMany();
  await prisma.donation.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.update.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.galleryPhoto.deleteMany();
  await prisma.galleryAlbum.deleteMany();
  await prisma.galleryVideo.deleteMany();
  await prisma.testimonial.deleteMany();
  await prisma.impactCounter.deleteMany();
  await prisma.partner.deleteMany();
  await prisma.volunteerApplication.deleteMany();
  await prisma.contactMessage.deleteMany();
  await prisma.heroSlide.deleteMany();
  await prisma.sEOMeta.deleteMany();
  await prisma.siteSettings.deleteMany();

  // Create SiteSettings
  const siteSettings = await prisma.siteSettings.create({
    data: {
      logo: '/assets/logo.png',
      primaryColor: '#1F2937',
      secondaryColor: '#3B82F6',
      address: '123 Charity Lane, New Delhi, India',
      phone: '+91-11-1234-5678',
      email: 'info@winfoundations.in',
      socialLinks: {
        facebook: 'https://facebook.com/winfoundation',
        twitter: 'https://twitter.com/winfoundation',
        instagram: 'https://instagram.com/winfoundation',
        linkedin: 'https://linkedin.com/company/winfoundation'
      },
      orgRegistrationNo: 'NGO-2024-001',
      trust12A: '12A-2024-001',
      trust80G: '80G-2024-001'
    }
  });
  console.log('✓ Created SiteSettings');

  // Create SEO Meta
  await prisma.sEOMeta.createMany({
    data: [
      {
        page: 'home',
        title: 'Win Foundations - Creating Positive Impact',
        description: 'Join us in our mission to create lasting positive change',
        keywords: 'NGO, charity, social work, foundation'
      },
      {
        page: 'initiatives',
        title: 'Our Initiatives - Win Foundations',
        description: 'Explore our ongoing initiatives and programs',
        keywords: 'programs, initiatives, causes'
      },
      {
        page: 'campaigns',
        title: 'Active Campaigns - Win Foundations',
        description: 'Support our current fundraising campaigns',
        keywords: 'campaigns, fundraising, donate'
      }
    ]
  });
  console.log('✓ Created SEO Meta');

  // Create Hero Slides
  await prisma.heroSlide.createMany({
    data: [
      {
        image: '/assets/hero-1.jpg',
        headline: 'Welcome to Win Foundations',
        subtext: 'Together, we create lasting positive change',
        ctaText: 'Donate Now',
        ctaLink: '/donate',
        order: 1,
        isActive: true
      },
      {
        image: '/assets/hero-2.jpg',
        headline: 'Join Our Mission',
        subtext: 'Be part of the solution',
        ctaText: 'Volunteer',
        ctaLink: '/volunteer',
        order: 2,
        isActive: true
      }
    ]
  });
  console.log('✓ Created Hero Slides');

  // Create Initiatives
  const init1 = await prisma.initiative.create({
    data: {
      title: 'Education for All',
      slug: 'education-for-all',
      shortDesc: 'Providing quality education to underprivileged children',
      fullDesc: 'Our education initiative focuses on providing quality education to children from low-income families. We establish learning centers and provide scholarships to deserving students.',
      coverImage: '/assets/initiative-education.jpg',
      featureImage: '/assets/initiative-education-feature.jpg',
      keyFeatures: [
        {
          label: 'Collective Empowerment',
          description: 'We work with entire communities rather than individual households, building learning centers that give every child nearby a path to quality education.'
        },
        {
          label: 'Economic Independence',
          description: 'Scholarships and vocational bridge programs help older students and their families move toward sustainable, self-supporting livelihoods.'
        }
      ],
      keyActivities: ['Setting up schools', 'Teacher training', 'Scholarship programs'],
      howItWorks: [
        {
          label: 'We identify underserved communities',
          description: 'Our team surveys low-income neighborhoods and rural areas to find where access to quality education is most limited.'
        },
        {
          label: 'We set up learning centers and scholarships',
          description: 'Classrooms are established or upgraded, and scholarships are awarded to deserving students to remove financial barriers.'
        },
        {
          label: 'We train and support local teachers',
          description: 'Ongoing teacher training ensures consistent, quality instruction long after a center is set up.'
        }
      ],
      impactNumbers: [
        { label: 'Children Educated', value: 5000 },
        { label: 'Schools Built', value: 25 },
        { label: 'Teachers Trained', value: 200 }
      ],
      impactPoints: [
        'Improved literacy rates among first-generation learners',
        'Reduced school dropout rates in partner communities',
        'Stronger parent and community engagement in local schools'
      ],
      order: 1,
      isActive: true,
      photos: {
        create: [
          { image: '/assets/ed-1.jpg', caption: 'Classroom in action', order: 1 },
          { image: '/assets/ed-2.jpg', caption: 'Students learning', order: 2 }
        ]
      }
    }
  });
  console.log('✓ Created Initiative: Education for All');

  const init2 = await prisma.initiative.create({
    data: {
      title: 'Health & Wellness',
      slug: 'health-wellness',
      shortDesc: 'Healthcare services for rural communities',
      fullDesc: 'Bringing quality healthcare services to remote and rural areas through mobile clinics and health camps.',
      coverImage: '/assets/initiative-health.jpg',
      keyActivities: ['Mobile health clinics', 'Vaccination drives', 'Health awareness'],
      impactNumbers: [
        { label: 'Lives Touched', value: 10000 },
        { label: 'Health Camps', value: 50 },
        { label: 'Free Check-ups', value: 20000 }
      ],
      order: 2,
      isActive: true,
      photos: {
        create: [
          { image: '/assets/health-1.jpg', caption: 'Health camp in progress', order: 1 }
        ]
      }
    }
  });
  console.log('✓ Created Initiative: Health & Wellness');

  // Campaigns are normally added via the admin dashboard once real fundraising drives
  // exist. This one example is seeded to demonstrate the full schema (category, multiple
  // photos/videos, in-kind products) for the admin panel build — replace or remove before
  // launch if a real campaign isn't ready yet.
  const oldAgeHomesCategory = await prisma.campaignCategory.upsert({
    where: { slug: 'old-age-homes' },
    update: {},
    create: { name: 'Old Age Homes', slug: 'old-age-homes', order: 1 }
  });

  await prisma.campaign.create({
    data: {
      title: '[EXAMPLE] Support Our Elderly Care Home',
      slug: 'example-elderly-care-home',
      summary: '[EXAMPLE] Help us provide food, medical care, and comfort to elderly residents in need.',
      story: '[EXAMPLE] Many elderly residents in our care have no family to turn to. This campaign supports their daily needs — nutritious meals, basic medical care, and a safe, dignified place to live out their years. Replace this with a real campaign story before launch.',
      coverImage: '/assets/initiative-placeholder.jpg',
      goalAmount: 500000,
      raisedAmount: 0,
      categoryId: oldAgeHomesCategory.id,
      costBreakdown: [
        { item: '[EXAMPLE] Monthly Groceries', qty: 12, pricePerUnit: 15000 },
        { item: '[EXAMPLE] Medical Supplies & Checkups', qty: 12, pricePerUnit: 8000 },
      ],
      photos: {
        create: [
          { image: '/assets/initiative-placeholder.jpg', caption: '[EXAMPLE] Photo 1', order: 1 },
          { image: '/assets/initiative-placeholder.jpg', caption: '[EXAMPLE] Photo 2', order: 2 },
        ]
      },
      videos: {
        create: [
          { videoUrl: 'https://youtube.com/embed/example', title: '[EXAMPLE] A day at the care home', order: 1 },
        ]
      },
      products: {
        create: [
          { name: '[EXAMPLE] Grocery Kit', image: '/assets/initiative-placeholder.jpg', pricePerUnit: 1000, availableQty: 50, order: 1 },
          { name: '[EXAMPLE] Blanket', image: '/assets/initiative-placeholder.jpg', pricePerUnit: 500, availableQty: 30, order: 2 },
          { name: '[EXAMPLE] Medical Kit', image: '/assets/initiative-placeholder.jpg', pricePerUnit: 1500, availableQty: 20, order: 3 },
          { name: '[EXAMPLE] Hygiene Kit', image: '/assets/initiative-placeholder.jpg', pricePerUnit: 300, availableQty: 40, order: 4 },
        ]
      }
    }
  });
  console.log('✓ Created example Campaign with category, photos, video, and products (for admin panel schema reference)');

  // Updates/blog posts are added via the admin dashboard once real news exists.

  // Create Team Members
 

  // Gallery albums and videos are added via the admin dashboard once real media exists.

  // Create Testimonials
  
  // Create Impact Counters
  await prisma.impactCounter.createMany({
    data: [
      { label: 'Lives Impacted', number: 50000, icon: 'heart', order: 1 },
      { label: 'Schools Built', number: 25, icon: 'school', order: 2 },
      { label: 'Children Educated', number: 5000, icon: 'book', order: 3 },
      { label: 'Active Volunteers', number: 500, icon: 'users', order: 4 }
    ]
  });
  console.log('✓ Created Impact Counters');

  // Partners are added via the admin dashboard once real partnerships exist.

  // Create Policy Pages
  await prisma.policyPage.createMany({
    data: [
      {
        type: 'PRIVACY',
        content: '# Privacy Policy\n\nWin Foundation is committed to protecting your privacy...'
      },
      {
        type: 'TERMS',
        content: '# Terms of Service\n\nBy using this site, you agree to our terms...'
      }
    ]
  });
  console.log('✓ Created Policy Pages');

  console.log('✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
