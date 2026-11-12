// ============================================
// Seed data — Verified Contractor Database
// (output of Module #1: Contractor Acquisition & Onboarding)
// ============================================
//
// The intake module consumes this database read-only: the Matching Engine
// filters and ranks it (TЗ §54–§57). Demo data only.

const SeedContractors = [
    {
        id: 'C-1001', company: 'Keystone Bath & Kitchen', owner: 'Andrei Kovalenko',
        homeZip: '19446', trades: ['remodeling', 'tile', 'plumbing', 'carpentry'],
        serviceCounties: ['Montgomery County', 'Bucks County'], radiusMiles: 30,
        minJob: 5000, maxJob: 150000, trustScore: 92, rating: 4.9, reviewsCount: 61,
        completedProjects: 74, yearsInBusiness: 11, availability: 'available',
        verification: { licensed: true, insured: true, backgroundCheck: true, verified: true },
        languages: ['en', 'ru', 'uk'], avgResponseMinutes: 35, responseRate: 0.94,
        accountStatus: 'active', specialties: ['Bathroom Remodeling', 'Kitchen Remodeling', 'Tile'],
        portfolioProjects: 28
    },
    {
        id: 'C-1002', company: 'Liberty Home Renovations', owner: 'Michael Turner',
        homeZip: '19147', trades: ['remodeling', 'drywall', 'painting', 'flooring', 'carpentry'],
        serviceCounties: ['Philadelphia County', 'Montgomery County', 'Bucks County'], radiusMiles: 30,
        minJob: 2500, maxJob: 250000, trustScore: 88, rating: 4.7, reviewsCount: 118,
        completedProjects: 141, yearsInBusiness: 14, availability: 'available',
        verification: { licensed: true, insured: true, backgroundCheck: true, verified: true },
        languages: ['en', 'es'], avgResponseMinutes: 55, responseRate: 0.89,
        accountStatus: 'active', specialties: ['Whole House Remodeling', 'Basement Remodeling'],
        portfolioProjects: 44
    },
    {
        id: 'C-1003', company: 'Bucks County Tile Works', owner: 'Vitaliy Hrytsenko',
        homeZip: '18901', trades: ['tile', 'flooring'],
        serviceCounties: ['Bucks County', 'Montgomery County'], radiusMiles: 35,
        minJob: 800, maxJob: 40000, trustScore: 85, rating: 4.8, reviewsCount: 47,
        completedProjects: 92, yearsInBusiness: 8, availability: 'available-now',
        verification: { licensed: true, insured: true, backgroundCheck: false, verified: true },
        languages: ['en', 'ru', 'uk'], avgResponseMinutes: 22, responseRate: 0.96,
        accountStatus: 'active', specialties: ['Tile', 'Large Format', 'Shower Systems'],
        portfolioProjects: 35
    },
    {
        id: 'C-1004', company: 'Philly Drywall Pros', owner: 'Jamal Wright',
        homeZip: '19125', trades: ['drywall', 'painting', 'insulation'],
        serviceCounties: ['Philadelphia County'], radiusMiles: 20,
        minJob: 500, maxJob: 60000, trustScore: 79, rating: 4.5, reviewsCount: 73,
        completedProjects: 130, yearsInBusiness: 6, availability: 'available',
        verification: { licensed: true, insured: true, backgroundCheck: true, verified: true },
        languages: ['en'], avgResponseMinutes: 70, responseRate: 0.82,
        accountStatus: 'active', specialties: ['Drywall', 'Ceilings', 'Commercial Drywall'],
        portfolioProjects: 19
    },
    {
        id: 'C-1005', company: 'Delaware Valley Roofing', owner: 'Sergey Bondar',
        homeZip: '19020', trades: ['roofing', 'siding'],
        serviceCounties: ['Bucks County', 'Philadelphia County', 'Montgomery County'], radiusMiles: 40,
        minJob: 1500, maxJob: 200000, trustScore: 90, rating: 4.8, reviewsCount: 96,
        completedProjects: 210, yearsInBusiness: 17, availability: 'available-now',
        verification: { licensed: true, insured: true, backgroundCheck: true, verified: true },
        languages: ['en', 'ru'], avgResponseMinutes: 18, responseRate: 0.97,
        accountStatus: 'active', specialties: ['Roof Replacement', 'Storm Damage', 'Insurance Claims'],
        portfolioProjects: 52
    },
    {
        id: 'C-1006', company: 'Bright Spark Electric', owner: 'Daniel Reyes',
        homeZip: '19038', trades: ['electrical'],
        serviceCounties: ['Montgomery County', 'Philadelphia County'], radiusMiles: 25,
        minJob: 250, maxJob: 80000, trustScore: 87, rating: 4.7, reviewsCount: 84,
        completedProjects: 160, yearsInBusiness: 9, availability: 'available-now',
        verification: { licensed: true, insured: true, backgroundCheck: true, verified: true },
        languages: ['en', 'es'], avgResponseMinutes: 15, responseRate: 0.95,
        accountStatus: 'active', specialties: ['Panel Upgrade', 'EV Charger', 'Emergency Service'],
        portfolioProjects: 22
    },
    {
        id: 'C-1007', company: 'Mainline Plumbing Co.', owner: 'Oleg Marchenko',
        homeZip: '19010', trades: ['plumbing'],
        serviceCounties: ['Montgomery County', 'Philadelphia County'], radiusMiles: 30,
        minJob: 200, maxJob: 90000, trustScore: 83, rating: 4.6, reviewsCount: 65,
        completedProjects: 188, yearsInBusiness: 12, availability: 'available-now',
        verification: { licensed: true, insured: true, backgroundCheck: false, verified: true },
        languages: ['en', 'ru'], avgResponseMinutes: 25, responseRate: 0.9,
        accountStatus: 'active', specialties: ['Leak Repair', 'Repipe', 'Water Heaters'],
        portfolioProjects: 14
    },
    {
        id: 'C-1008', company: 'Comfort Air HVAC', owner: 'Rustam Yusupov',
        homeZip: '19090', trades: ['hvac'],
        serviceCounties: ['Montgomery County', 'Bucks County'], radiusMiles: 30,
        minJob: 400, maxJob: 120000, trustScore: 81, rating: 4.5, reviewsCount: 52,
        completedProjects: 97, yearsInBusiness: 7, availability: 'available',
        verification: { licensed: true, insured: true, backgroundCheck: true, verified: true },
        languages: ['en', 'ru', 'uz'], avgResponseMinutes: 40, responseRate: 0.86,
        accountStatus: 'active', specialties: ['Mini Split', 'System Replacement', 'Ductwork'],
        portfolioProjects: 11
    },
    {
        id: 'C-1009', company: 'Northeast Painting & Finishes', owner: 'Carlos Mendez',
        homeZip: '19111', trades: ['painting', 'drywall'],
        serviceCounties: ['Philadelphia County', 'Bucks County'], radiusMiles: 25,
        minJob: 400, maxJob: 45000, trustScore: 76, rating: 4.4, reviewsCount: 39,
        completedProjects: 88, yearsInBusiness: 5, availability: 'busy',
        verification: { licensed: false, insured: true, backgroundCheck: false, verified: true },
        languages: ['en', 'es'], avgResponseMinutes: 95, responseRate: 0.71,
        accountStatus: 'active', specialties: ['Interior Painting', 'Cabinet Refinishing'],
        portfolioProjects: 16
    },
    {
        id: 'C-1010', company: 'Doylestown Carpentry & Decks', owner: 'Peter Novak',
        homeZip: '18902', trades: ['carpentry', 'fence', 'windows'],
        serviceCounties: ['Bucks County'], radiusMiles: 25,
        minJob: 1000, maxJob: 75000, trustScore: 84, rating: 4.7, reviewsCount: 44,
        completedProjects: 71, yearsInBusiness: 10, availability: 'available',
        verification: { licensed: true, insured: true, backgroundCheck: true, verified: true },
        languages: ['en'], avgResponseMinutes: 50, responseRate: 0.88,
        accountStatus: 'active', specialties: ['Decks', 'Custom Trim', 'Fencing'],
        portfolioProjects: 27
    },
    {
        id: 'C-1011', company: 'Stone & Slab Countertops', owner: 'Ivan Petrov',
        homeZip: '19462', trades: ['countertops', 'tile'],
        serviceCounties: ['Montgomery County', 'Philadelphia County', 'Bucks County'], radiusMiles: 35,
        minJob: 1200, maxJob: 60000, trustScore: 80, rating: 4.6, reviewsCount: 33,
        completedProjects: 64, yearsInBusiness: 6, availability: 'available',
        verification: { licensed: true, insured: true, backgroundCheck: false, verified: true },
        languages: ['en', 'ru'], avgResponseMinutes: 60, responseRate: 0.84,
        accountStatus: 'active', specialties: ['Quartz', 'Granite', 'Backsplash'],
        portfolioProjects: 21
    },
    {
        id: 'C-1012', company: 'Green Acres Landscaping', owner: 'Tomasz Kaminski',
        homeZip: '19422', trades: ['landscaping', 'tree-service', 'concrete'],
        serviceCounties: ['Montgomery County', 'Bucks County'], radiusMiles: 30,
        minJob: 600, maxJob: 90000, trustScore: 74, rating: 4.3, reviewsCount: 29,
        completedProjects: 58, yearsInBusiness: 8, availability: 'available',
        verification: { licensed: false, insured: true, backgroundCheck: false, verified: true },
        languages: ['en'], avgResponseMinutes: 85, responseRate: 0.75,
        accountStatus: 'active', specialties: ['Hardscaping', 'Drainage', 'Patios'],
        portfolioProjects: 18
    },
    {
        id: 'C-1013', company: 'City Handyman Services', owner: 'Bekzod Alimov',
        homeZip: '19146', trades: ['handyman', 'carpentry', 'painting', 'junk-removal', 'cleaning'],
        serviceCounties: ['Philadelphia County'], radiusMiles: 15,
        minJob: 100, maxJob: 8000, trustScore: 72, rating: 4.4, reviewsCount: 91,
        completedProjects: 214, yearsInBusiness: 4, availability: 'available-now',
        verification: { licensed: false, insured: true, backgroundCheck: true, verified: true },
        languages: ['en', 'ru', 'uz'], avgResponseMinutes: 20, responseRate: 0.93,
        accountStatus: 'active', specialties: ['Small Repairs', 'Furniture Assembly', 'Punch Lists'],
        portfolioProjects: 9
    },
    {
        id: 'C-1014', company: 'Precision Concrete & Masonry', owner: 'Luis Ortega',
        homeZip: '19401', trades: ['concrete', 'masonry', 'demolition'],
        serviceCounties: ['Montgomery County', 'Philadelphia County'], radiusMiles: 30,
        minJob: 1500, maxJob: 180000, trustScore: 82, rating: 4.5, reviewsCount: 37,
        completedProjects: 69, yearsInBusiness: 13, availability: 'available',
        verification: { licensed: true, insured: true, backgroundCheck: true, verified: true },
        languages: ['en', 'es'], avgResponseMinutes: 65, responseRate: 0.8,
        accountStatus: 'active', specialties: ['Driveways', 'Retaining Walls', 'Stone Work'],
        portfolioProjects: 24
    },
    {
        id: 'C-1015', company: 'Elite Commercial Builders', owner: 'Robert Klein',
        homeZip: '19406', trades: ['remodeling', 'drywall', 'electrical', 'hvac', 'carpentry'],
        serviceCounties: ['Montgomery County', 'Philadelphia County', 'Bucks County'], radiusMiles: 45,
        minJob: 25000, maxJob: 2000000, trustScore: 94, rating: 4.9, reviewsCount: 28,
        completedProjects: 41, yearsInBusiness: 21, availability: 'available',
        verification: { licensed: true, insured: true, backgroundCheck: true, verified: true },
        languages: ['en'], avgResponseMinutes: 45, responseRate: 0.91,
        accountStatus: 'active', specialties: ['Commercial Remodeling', 'Restaurant Build-Out', 'Office Fit-Out'],
        portfolioProjects: 33
    },
    {
        id: 'C-1016', company: 'Suspended Test Co.', owner: 'N/A',
        homeZip: '19107', trades: ['remodeling', 'tile'],
        serviceCounties: ['Philadelphia County'], radiusMiles: 20,
        minJob: 500, maxJob: 50000, trustScore: 40, rating: 3.1, reviewsCount: 6,
        completedProjects: 8, yearsInBusiness: 2, availability: 'busy',
        verification: { licensed: false, insured: false, backgroundCheck: false, verified: false },
        languages: ['en'], avgResponseMinutes: 240, responseRate: 0.35,
        accountStatus: 'suspended', specialties: [],
        portfolioProjects: 0
    }
];

if (typeof module !== 'undefined') { module.exports = SeedContractors; }
