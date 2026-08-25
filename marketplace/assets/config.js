// ============================================
// Customer Acquisition & Project Intake
// Configuration (admin-editable defaults)
// ============================================
//
// Everything in this file is a DEFAULT. At runtime the Admin Panel writes
// overrides into localStorage (see store.js -> Store.settings), so service
// areas, categories, questions, budget ranges, timelines and scoring weights
// can be changed without a developer (TЗ §19, §98).

const Config = {};

// --------------------------------------------
// Service areas (TЗ §7, §8)
// --------------------------------------------
Config.serviceAreas = [
    { county: 'Philadelphia County', state: 'PA', active: true },
    { county: 'Bucks County', state: 'PA', active: true },
    { county: 'Montgomery County', state: 'PA', active: true }
];

// ZIP -> location. Coordinates are approximate demo data, good enough for
// distance ranking; a production build resolves this through a geo provider.
Config.zipDatabase = {
    // Philadelphia County
    '19102': { city: 'Philadelphia', county: 'Philadelphia County', state: 'PA', lat: 39.953, lng: -75.166 },
    '19103': { city: 'Philadelphia', county: 'Philadelphia County', state: 'PA', lat: 39.953, lng: -75.174 },
    '19106': { city: 'Philadelphia', county: 'Philadelphia County', state: 'PA', lat: 39.949, lng: -75.145 },
    '19107': { city: 'Philadelphia', county: 'Philadelphia County', state: 'PA', lat: 39.951, lng: -75.157 },
    '19111': { city: 'Philadelphia', county: 'Philadelphia County', state: 'PA', lat: 40.062, lng: -75.081 },
    '19114': { city: 'Philadelphia', county: 'Philadelphia County', state: 'PA', lat: 40.066, lng: -75.000 },
    '19115': { city: 'Philadelphia', county: 'Philadelphia County', state: 'PA', lat: 40.090, lng: -75.043 },
    '19116': { city: 'Philadelphia', county: 'Philadelphia County', state: 'PA', lat: 40.117, lng: -75.014 },
    '19118': { city: 'Philadelphia', county: 'Philadelphia County', state: 'PA', lat: 40.073, lng: -75.207 },
    '19119': { city: 'Philadelphia', county: 'Philadelphia County', state: 'PA', lat: 40.048, lng: -75.192 },
    '19123': { city: 'Philadelphia', county: 'Philadelphia County', state: 'PA', lat: 39.965, lng: -75.145 },
    '19125': { city: 'Philadelphia', county: 'Philadelphia County', state: 'PA', lat: 39.977, lng: -75.128 },
    '19127': { city: 'Philadelphia', county: 'Philadelphia County', state: 'PA', lat: 40.027, lng: -75.226 },
    '19128': { city: 'Philadelphia', county: 'Philadelphia County', state: 'PA', lat: 40.043, lng: -75.229 },
    '19130': { city: 'Philadelphia', county: 'Philadelphia County', state: 'PA', lat: 39.968, lng: -75.174 },
    '19146': { city: 'Philadelphia', county: 'Philadelphia County', state: 'PA', lat: 39.938, lng: -75.183 },
    '19147': { city: 'Philadelphia', county: 'Philadelphia County', state: 'PA', lat: 39.936, lng: -75.155 },
    '19148': { city: 'Philadelphia', county: 'Philadelphia County', state: 'PA', lat: 39.917, lng: -75.148 },
    // Bucks County
    '18901': { city: 'Doylestown', county: 'Bucks County', state: 'PA', lat: 40.310, lng: -75.130 },
    '18902': { city: 'Doylestown', county: 'Bucks County', state: 'PA', lat: 40.340, lng: -75.090 },
    '18914': { city: 'Chalfont', county: 'Bucks County', state: 'PA', lat: 40.288, lng: -75.209 },
    '18938': { city: 'New Hope', county: 'Bucks County', state: 'PA', lat: 40.364, lng: -74.951 },
    '18940': { city: 'Newtown', county: 'Bucks County', state: 'PA', lat: 40.229, lng: -74.937 },
    '18954': { city: 'Richboro', county: 'Bucks County', state: 'PA', lat: 40.212, lng: -75.001 },
    '18966': { city: 'Southampton', county: 'Bucks County', state: 'PA', lat: 40.174, lng: -75.032 },
    '18974': { city: 'Warminster', county: 'Bucks County', state: 'PA', lat: 40.207, lng: -75.088 },
    '18976': { city: 'Warrington', county: 'Bucks County', state: 'PA', lat: 40.251, lng: -75.145 },
    '19007': { city: 'Bristol', county: 'Bucks County', state: 'PA', lat: 40.107, lng: -74.855 },
    '19020': { city: 'Bensalem', county: 'Bucks County', state: 'PA', lat: 40.104, lng: -74.944 },
    '19047': { city: 'Langhorne', county: 'Bucks County', state: 'PA', lat: 40.180, lng: -74.914 },
    '19053': { city: 'Feasterville-Trevose', county: 'Bucks County', state: 'PA', lat: 40.148, lng: -74.987 },
    '19067': { city: 'Morrisville', county: 'Bucks County', state: 'PA', lat: 40.209, lng: -74.803 },
    // Montgomery County
    '19001': { city: 'Abington', county: 'Montgomery County', state: 'PA', lat: 40.121, lng: -75.119 },
    '19002': { city: 'Ambler', county: 'Montgomery County', state: 'PA', lat: 40.170, lng: -75.207 },
    '19003': { city: 'Ardmore', county: 'Montgomery County', state: 'PA', lat: 40.005, lng: -75.291 },
    '19006': { city: 'Huntingdon Valley', county: 'Montgomery County', state: 'PA', lat: 40.135, lng: -75.062 },
    '19010': { city: 'Bryn Mawr', county: 'Montgomery County', state: 'PA', lat: 40.023, lng: -75.325 },
    '19025': { city: 'Dresher', county: 'Montgomery County', state: 'PA', lat: 40.145, lng: -75.164 },
    '19034': { city: 'Flourtown', county: 'Montgomery County', state: 'PA', lat: 40.107, lng: -75.213 },
    '19038': { city: 'Glenside', county: 'Montgomery County', state: 'PA', lat: 40.102, lng: -75.156 },
    '19040': { city: 'Hatboro', county: 'Montgomery County', state: 'PA', lat: 40.176, lng: -75.106 },
    '19046': { city: 'Jenkintown', county: 'Montgomery County', state: 'PA', lat: 40.096, lng: -75.115 },
    '19075': { city: 'Oreland', county: 'Montgomery County', state: 'PA', lat: 40.113, lng: -75.183 },
    '19090': { city: 'Willow Grove', county: 'Montgomery County', state: 'PA', lat: 40.146, lng: -75.115 },
    '19096': { city: 'Wynnewood', county: 'Montgomery County', state: 'PA', lat: 40.005, lng: -75.275 },
    '19401': { city: 'Norristown', county: 'Montgomery County', state: 'PA', lat: 40.121, lng: -75.339 },
    '19403': { city: 'Norristown', county: 'Montgomery County', state: 'PA', lat: 40.140, lng: -75.394 },
    '19406': { city: 'King of Prussia', county: 'Montgomery County', state: 'PA', lat: 40.089, lng: -75.396 },
    '19422': { city: 'Blue Bell', county: 'Montgomery County', state: 'PA', lat: 40.152, lng: -75.267 },
    '19426': { city: 'Collegeville', county: 'Montgomery County', state: 'PA', lat: 40.186, lng: -75.454 },
    '19446': { city: 'Lansdale', county: 'Montgomery County', state: 'PA', lat: 40.243, lng: -75.283 },
    '19454': { city: 'North Wales', county: 'Montgomery County', state: 'PA', lat: 40.213, lng: -75.257 },
    '19462': { city: 'Plymouth Meeting', county: 'Montgomery County', state: 'PA', lat: 40.107, lng: -75.283 },
    '19464': { city: 'Pottstown', county: 'Montgomery County', state: 'PA', lat: 40.245, lng: -75.649 },
    '19468': { city: 'Royersford', county: 'Montgomery County', state: 'PA', lat: 40.184, lng: -75.537 },
    '19477': { city: 'Spring House', county: 'Montgomery County', state: 'PA', lat: 40.185, lng: -75.221 },
    // Known, but outside the launch region -> waitlist
    '19380': { city: 'West Chester', county: 'Chester County', state: 'PA', lat: 39.961, lng: -75.604 },
    '19382': { city: 'West Chester', county: 'Chester County', state: 'PA', lat: 39.928, lng: -75.599 },
    '19050': { city: 'Lansdowne', county: 'Delaware County', state: 'PA', lat: 39.938, lng: -75.272 },
    '19063': { city: 'Media', county: 'Delaware County', state: 'PA', lat: 39.917, lng: -75.388 },
    '18018': { city: 'Bethlehem', county: 'Northampton County', state: 'PA', lat: 40.634, lng: -75.400 },
    '08034': { city: 'Cherry Hill', county: 'Camden County', state: 'NJ', lat: 39.909, lng: -75.017 },
    '08054': { city: 'Mount Laurel', county: 'Burlington County', state: 'NJ', lat: 39.947, lng: -74.891 }
};

// --------------------------------------------
// Lead sources (TЗ §3)
// --------------------------------------------
Config.leadSources = [
    'Facebook Group — Стройка и Ремонт',
    'Facebook Group — Мастера',
    'Facebook Ads',
    'Instagram',
    'Google Search',
    'Google Ads',
    'Google Maps',
    'TikTok',
    'Telegram',
    'WhatsApp',
    'Referral',
    'Contractor Referral',
    'Existing Customer',
    'Website Organic',
    'SEO Article',
    'QR Code',
    'Phone Call',
    'Admin Manual Entry',
    'Other'
];

// Maps a ?source= / utm_source value onto a canonical Lead Source.
Config.sourceAliases = {
    'fb': 'Facebook Ads',
    'facebook': 'Facebook Ads',
    'facebook-ads': 'Facebook Ads',
    'fb-group': 'Facebook Group — Стройка и Ремонт',
    'fb-group-masters': 'Facebook Group — Мастера',
    'ig': 'Instagram',
    'instagram': 'Instagram',
    'google': 'Google Search',
    'google-ads': 'Google Ads',
    'gmb': 'Google Maps',
    'maps': 'Google Maps',
    'tiktok': 'TikTok',
    'telegram': 'Telegram',
    'whatsapp': 'WhatsApp',
    'referral': 'Referral',
    'contractor': 'Contractor Referral',
    'qr': 'QR Code',
    'seo': 'SEO Article'
};

// --------------------------------------------
// Customer & property types (TЗ §9, §10)
// --------------------------------------------
Config.customerTypes = [
    { value: 'homeowner', label: 'Homeowner', labelRu: 'Собственник жилья', icon: 'fa-house-user' },
    { value: 'landlord', label: 'Landlord', labelRu: 'Арендодатель', icon: 'fa-key' },
    { value: 'investor', label: 'Real Estate Investor', labelRu: 'Инвестор', icon: 'fa-chart-line' },
    { value: 'property-manager', label: 'Property Manager', labelRu: 'Управляющий', icon: 'fa-building-user' },
    { value: 'business-owner', label: 'Business Owner', labelRu: 'Владелец бизнеса', icon: 'fa-briefcase' },
    { value: 'tenant', label: 'Tenant', labelRu: 'Арендатор', icon: 'fa-person-shelter' },
    { value: 'realtor', label: 'Realtor', labelRu: 'Риелтор', icon: 'fa-handshake' },
    { value: 'general-contractor', label: 'General Contractor', labelRu: 'Генподрядчик', icon: 'fa-helmet-safety' },
    { value: 'other', label: 'Other', labelRu: 'Другое', icon: 'fa-ellipsis' }
];

Config.propertyTypes = [
    { value: 'single-family', label: 'Single Family Home', icon: 'fa-house' },
    { value: 'townhouse', label: 'Townhouse', icon: 'fa-house-chimney' },
    { value: 'condo', label: 'Condo', icon: 'fa-building' },
    { value: 'apartment', label: 'Apartment', icon: 'fa-city' },
    { value: 'multi-family', label: 'Multi-Family', icon: 'fa-hotel' },
    { value: 'commercial', label: 'Commercial', icon: 'fa-shop' },
    { value: 'office', label: 'Office', icon: 'fa-briefcase' },
    { value: 'retail', label: 'Retail', icon: 'fa-cart-shopping' },
    { value: 'restaurant', label: 'Restaurant', icon: 'fa-utensils' },
    { value: 'warehouse', label: 'Warehouse', icon: 'fa-warehouse' },
    { value: 'other', label: 'Other', icon: 'fa-ellipsis' }
];

// --------------------------------------------
// Categories (TЗ §11) — grouped, multi-select with a primary (TЗ §12)
// --------------------------------------------
Config.categoryGroups = [
    {
        group: 'Remodeling', icon: 'fa-trowel-bricks',
        items: [
            { value: 'kitchen-remodeling', label: 'Kitchen Remodeling', trade: 'remodeling' },
            { value: 'bathroom-remodeling', label: 'Bathroom Remodeling', trade: 'remodeling' },
            { value: 'basement-remodeling', label: 'Basement Remodeling', trade: 'remodeling' },
            { value: 'whole-house-remodeling', label: 'Whole House Remodeling', trade: 'remodeling', highValue: true },
            { value: 'room-addition', label: 'Room Addition', trade: 'remodeling', highValue: true },
            { value: 'garage-conversion', label: 'Garage Conversion', trade: 'remodeling' },
            { value: 'commercial-remodeling', label: 'Commercial Remodeling', trade: 'remodeling', highValue: true }
        ]
    },
    {
        group: 'Interior', icon: 'fa-couch',
        items: [
            { value: 'drywall', label: 'Drywall', trade: 'drywall' },
            { value: 'painting', label: 'Painting', trade: 'painting' },
            { value: 'flooring', label: 'Flooring', trade: 'flooring' },
            { value: 'tile', label: 'Tile', trade: 'tile' },
            { value: 'carpentry', label: 'Carpentry', trade: 'carpentry' },
            { value: 'cabinets', label: 'Cabinets', trade: 'carpentry' },
            { value: 'countertops', label: 'Countertops', trade: 'countertops' },
            { value: 'doors', label: 'Doors', trade: 'carpentry' },
            { value: 'windows', label: 'Windows', trade: 'windows' },
            { value: 'insulation', label: 'Insulation', trade: 'insulation' }
        ]
    },
    {
        group: 'Exterior', icon: 'fa-house-chimney-window',
        items: [
            { value: 'roofing', label: 'Roofing', trade: 'roofing' },
            { value: 'siding', label: 'Siding', trade: 'siding' },
            { value: 'deck', label: 'Deck', trade: 'carpentry' },
            { value: 'fence', label: 'Fence', trade: 'fence' },
            { value: 'gutters', label: 'Gutters', trade: 'roofing' },
            { value: 'exterior-painting', label: 'Exterior Painting', trade: 'painting' },
            { value: 'concrete', label: 'Concrete', trade: 'concrete' },
            { value: 'masonry', label: 'Masonry', trade: 'masonry' },
            { value: 'driveway', label: 'Driveway', trade: 'concrete' }
        ]
    },
    {
        group: 'Systems', icon: 'fa-plug-circle-bolt',
        items: [
            { value: 'electrical', label: 'Electrical', trade: 'electrical' },
            { value: 'plumbing', label: 'Plumbing', trade: 'plumbing' },
            { value: 'hvac', label: 'HVAC', trade: 'hvac' }
        ]
    },
    {
        group: 'Outdoor', icon: 'fa-tree',
        items: [
            { value: 'landscaping', label: 'Landscaping', trade: 'landscaping' },
            { value: 'hardscaping', label: 'Hardscaping', trade: 'landscaping' },
            { value: 'drainage', label: 'Drainage', trade: 'landscaping' },
            { value: 'tree-service', label: 'Tree Service', trade: 'tree-service' },
            { value: 'irrigation', label: 'Irrigation', trade: 'landscaping' }
        ]
    },
    {
        group: 'Other', icon: 'fa-screwdriver-wrench',
        items: [
            { value: 'handyman', label: 'Handyman', trade: 'handyman' },
            { value: 'demolition', label: 'Demolition', trade: 'demolition' },
            { value: 'cleaning', label: 'Cleaning', trade: 'cleaning' },
            { value: 'junk-removal', label: 'Junk Removal', trade: 'junk-removal' },
            { value: 'other', label: 'Other', trade: 'handyman' }
        ]
    }
];

// --------------------------------------------
// Project stage / timeline / budget (TЗ §26–§30)
// --------------------------------------------
Config.projectStages = [
    { value: 'researching', label: 'Just researching', labelRu: 'Пока изучаю варианты', urgency: 0 },
    { value: 'getting-estimates', label: 'Getting estimates', labelRu: 'Собираю сметы', urgency: 2 },
    { value: 'ready-to-hire', label: 'Ready to hire', labelRu: 'Готов нанять мастера', urgency: 3 },
    { value: 'contractor-cancelled', label: 'Contractor cancelled', labelRu: 'Подрядчик отказался', urgency: 3 },
    { value: 'already-started', label: 'Project already started', labelRu: 'Работы уже начаты', urgency: 2 },
    { value: 'emergency', label: 'Emergency', labelRu: 'Аварийная ситуация', urgency: 5 },
    { value: 'other', label: 'Other', labelRu: 'Другое', urgency: 1 }
];

Config.timelineOptions = [
    { value: 'asap', label: 'ASAP', labelRu: 'Как можно скорее', urgency: 5 },
    { value: '1-week', label: 'Within 1 week', labelRu: 'В течение недели', urgency: 4 },
    { value: '1-2-weeks', label: '1–2 weeks', labelRu: '1–2 недели', urgency: 3 },
    { value: '2-4-weeks', label: '2–4 weeks', labelRu: '2–4 недели', urgency: 2 },
    { value: '1-3-months', label: '1–3 months', labelRu: '1–3 месяца', urgency: 1 },
    { value: '3-6-months', label: '3–6 months', labelRu: '3–6 месяцев', urgency: 0 },
    { value: 'planning', label: 'Just planning', labelRu: 'Только планирую', urgency: 0 },
    { value: 'flexible', label: 'Flexible', labelRu: 'Гибкие сроки', urgency: 1 }
];

Config.budgetRanges = [
    { value: 'under-1k', label: 'Under $1,000', min: 0, max: 1000 },
    { value: '1k-2.5k', label: '$1K–$2.5K', min: 1000, max: 2500 },
    { value: '2.5k-5k', label: '$2.5K–$5K', min: 2500, max: 5000 },
    { value: '5k-10k', label: '$5K–$10K', min: 5000, max: 10000 },
    { value: '10k-25k', label: '$10K–$25K', min: 10000, max: 25000 },
    { value: '25k-50k', label: '$25K–$50K', min: 25000, max: 50000 },
    { value: '50k-100k', label: '$50K–$100K', min: 50000, max: 100000 },
    { value: '100k-250k', label: '$100K–$250K', min: 100000, max: 250000 },
    { value: '250k-plus', label: '$250K+', min: 250000, max: 1000000 },
    { value: 'not-sure', label: 'Not Sure', min: null, max: null },
    { value: 'discuss', label: 'Prefer to discuss', min: null, max: null }
];

Config.languages = [
    { value: 'en', label: 'English' },
    { value: 'ru', label: 'Русский' },
    { value: 'uk', label: 'Українська' },
    { value: 'uz', label: 'Oʻzbekcha' },
    { value: 'es', label: 'Español' },
    { value: 'other', label: 'Other' }
];

// --------------------------------------------
// Project statuses (TЗ §41)
// --------------------------------------------
Config.projectStatuses = [
    { value: 'draft', label: 'Draft', tone: 'muted' },
    { value: 'submitted', label: 'Submitted', tone: 'info' },
    { value: 'phone-verification', label: 'Phone Verification', tone: 'warning' },
    { value: 'under-review', label: 'Under Review', tone: 'info' },
    { value: 'qualified', label: 'Qualified', tone: 'success' },
    { value: 'need-info', label: 'Need More Information', tone: 'warning' },
    { value: 'matching', label: 'Matching', tone: 'info' },
    { value: 'contractors-invited', label: 'Contractors Invited', tone: 'info' },
    { value: 'contractors-interested', label: 'Contractors Interested', tone: 'info' },
    { value: 'quotes-received', label: 'Quotes Received', tone: 'success' },
    { value: 'customer-comparing', label: 'Customer Comparing', tone: 'info' },
    { value: 'site-visit', label: 'Site Visit', tone: 'info' },
    { value: 'contractor-selected', label: 'Contractor Selected', tone: 'success' },
    { value: 'scheduled', label: 'Scheduled', tone: 'info' },
    { value: 'in-progress', label: 'In Progress', tone: 'warning' },
    { value: 'completed', label: 'Completed', tone: 'success' },
    { value: 'review-pending', label: 'Review Pending', tone: 'warning' },
    { value: 'closed', label: 'Closed', tone: 'muted' },
    { value: 'cancelled', label: 'Cancelled', tone: 'danger' },
    { value: 'disputed', label: 'Disputed', tone: 'danger' }
];

Config.customerStatuses = ['New Lead', 'Verified', 'Active', 'Repeat', 'VIP', 'Inactive', 'Blocked'];

// --------------------------------------------
// Default settings — every value below is editable in Admin → Settings
// --------------------------------------------
Config.defaultSettings = {
    // Lead Quality Score weights (TЗ §43)
    leadScoreWeights: {
        phoneVerified: 20,
        completeDescription: 10,
        photos: 15,
        budgetProvided: 10,
        timelineProvided: 10,
        addressVerified: 10,
        categoryComplete: 10,
        customerResponsive: 10,
        noDuplicate: 5
    },
    // Lead classification thresholds (TЗ §44)
    leadThresholds: { high: 80, qualified: 60, review: 40 },
    // Match Score weights (TЗ §56)
    matchWeights: {
        trade: 25,
        location: 20,
        trust: 20,
        budget: 10,
        availability: 10,
        similarWork: 5,
        responseHistory: 5,
        language: 5
    },
    // Matching limits (TЗ §57)
    minContractorsPerProject: 3,
    maxContractorsPerProject: 5,
    // High value / escalation rules (TЗ §51, §52)
    highValueBudgetThreshold: 50000,
    highValueCategories: ['whole-house-remodeling', 'commercial-remodeling', 'room-addition'],
    callTaskBudgetThreshold: 50000,
    // SLA in hours (TЗ §91, §92)
    sla: {
        qualificationHours: 2,
        matchingHours: 1,
        firstContractorResponseHours: 4,
        noQuoteAlertHours: 48,
        noContractorAlertHours: 4,
        noResponseAlertHours: 12
    },
    // Media limits (TЗ §22, §24)
    media: {
        maxPhotos: 30,
        maxVideos: 5,
        maxDocuments: 10,
        maxPhotoMb: 15,
        maxVideoMb: 100,
        maxVideoSeconds: 120,
        photoFormats: ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp'],
        videoFormats: ['video/mp4', 'video/quicktime', 'video/webm'],
        documentFormats: ['application/pdf', 'image/jpeg', 'image/png']
    },
    // OTP / anti-abuse (TЗ §33, §94)
    otp: { length: 6, ttlSeconds: 300, maxAttempts: 5, resendCooldownSeconds: 30, maxSendsPerHour: 5 },
    // Automated follow-up schedule in hours (TЗ §50)
    followUpHours: [1, 24, 72],
    // Privacy: what a contractor sees before selection (TЗ §58, §95)
    contractorPrivacy: { showFullAddress: false, showPhone: false, showEmail: false, revealOn: 'contractor-selected' }
};

// --------------------------------------------
// Dynamic questionnaire (TЗ §13–§19)
// --------------------------------------------
// Questions are DATA, never hardcoded UI. Field types: text, textarea,
// number, select, multiselect, radio, checkbox, date, money, photo, video,
// file. `showIf` gives conditional logic; `order` gives sorting.
Config.questionFieldTypes = [
    'text', 'textarea', 'number', 'select', 'multiselect',
    'radio', 'checkbox', 'date', 'money', 'photo', 'video', 'file'
];

Config.questions = [
    // ---- Bathroom Remodeling (TЗ §14) ----
    { id: 'bath-scope', category: 'bathroom-remodeling', order: 1, type: 'multiselect', required: true,
      label: 'Что вы хотите сделать?', labelEn: 'What do you want to do?',
      options: ['Full Remodel', 'Partial Remodel', 'Shower Replacement', 'Bathtub', 'Tile', 'Vanity', 'Toilet', 'Plumbing', 'Electrical', 'Painting', 'Other'] },
    { id: 'bath-size', category: 'bathroom-remodeling', order: 2, type: 'radio', required: true,
      label: 'Примерный размер ванной', labelEn: 'Approximate bathroom size',
      options: ['Small', 'Medium', 'Large', 'Not Sure'] },
    { id: 'bath-length', category: 'bathroom-remodeling', order: 3, type: 'number', required: false,
      label: 'Длина, ft', labelEn: 'Length (ft)', help: 'Если знаете точные размеры',
      showIf: { question: 'bath-size', notIn: ['Not Sure'] } },
    { id: 'bath-width', category: 'bathroom-remodeling', order: 4, type: 'number', required: false,
      label: 'Ширина, ft', labelEn: 'Width (ft)',
      showIf: { question: 'bath-size', notIn: ['Not Sure'] } },
    { id: 'bath-layout', category: 'bathroom-remodeling', order: 5, type: 'radio', required: true,
      label: 'Нужно ли менять планировку?', labelEn: 'Change the layout?', options: ['Yes', 'No', 'Not Sure'] },
    { id: 'bath-plumbing-move', category: 'bathroom-remodeling', order: 6, type: 'radio', required: true,
      label: 'Нужно ли переносить plumbing?', labelEn: 'Move plumbing?', options: ['Yes', 'No', 'Not Sure'] },
    { id: 'bath-materials', category: 'bathroom-remodeling', order: 7, type: 'radio', required: true,
      label: 'Материалы', labelEn: 'Materials',
      options: ['Customer already purchased', 'Customer will purchase', 'Contractor should provide', 'Need help choosing'] },

    // ---- Tile (TЗ §15) ----
    { id: 'tile-area', category: 'tile', order: 1, type: 'multiselect', required: true,
      label: 'Где нужна плитка?', labelEn: 'Where?',
      options: ['Floor', 'Walls', 'Shower', 'Backsplash', 'Outdoor', 'Other'] },
    { id: 'tile-sqft', category: 'tile', order: 2, type: 'number', required: true,
      label: 'Площадь, sq ft', labelEn: 'Area (sq ft)' },
    { id: 'tile-type', category: 'tile', order: 3, type: 'radio', required: true,
      label: 'Тип плитки', labelEn: 'Tile type',
      options: ['Ceramic', 'Porcelain', 'Marble', 'Natural Stone', 'Large Format', 'Not Sure'] },
    { id: 'tile-demo', category: 'tile', order: 4, type: 'radio', required: true,
      label: 'Нужен демонтаж старого покрытия?', labelEn: 'Demolition required?', options: ['Yes', 'No'] },

    // ---- Drywall (TЗ §16) ----
    { id: 'drywall-scope', category: 'drywall', order: 1, type: 'multiselect', required: true,
      label: 'Что нужно сделать?', labelEn: 'Scope',
      options: ['New Installation', 'Repair', 'Ceiling', 'Walls', 'Basement', 'Commercial'] },
    { id: 'drywall-area', category: 'drywall', order: 2, type: 'number', required: true,
      label: 'Примерная площадь, sq ft', labelEn: 'Approximate area (sq ft)' },
    { id: 'drywall-framing', category: 'drywall', order: 3, type: 'radio', required: true,
      label: 'Нужен framing?', labelEn: 'Need framing?', options: ['Yes', 'No', 'Not Sure'] },
    { id: 'drywall-insulation', category: 'drywall', order: 4, type: 'radio', required: true,
      label: 'Нужна insulation?', labelEn: 'Need insulation?', options: ['Yes', 'No', 'Not Sure'] },
    { id: 'drywall-finishing', category: 'drywall', order: 5, type: 'radio', required: true,
      label: 'Нужен finishing?', labelEn: 'Need finishing?', options: ['Yes', 'No', 'Not Sure'] },
    { id: 'drywall-painting', category: 'drywall', order: 6, type: 'radio', required: true,
      label: 'Нужна покраска?', labelEn: 'Need painting?', options: ['Yes', 'No', 'Not Sure'] },

    // ---- Roofing (TЗ §17) ----
    { id: 'roof-scope', category: 'roofing', order: 1, type: 'multiselect', required: true,
      label: 'Что нужно сделать?', labelEn: 'Scope',
      options: ['Repair', 'Replacement', 'Leak', 'Storm Damage', 'Inspection'] },
    { id: 'roof-stories', category: 'roofing', order: 2, type: 'select', required: true,
      label: 'Количество этажей', labelEn: 'Number of stories', options: ['1', '2', '3', '4+'] },
    { id: 'roof-age', category: 'roofing', order: 3, type: 'select', required: false,
      label: 'Примерный возраст кровли', labelEn: 'Approximate roof age',
      options: ['0–5 years', '5–10 years', '10–20 years', '20+ years', 'Not Sure'] },
    { id: 'roof-insurance', category: 'roofing', order: 4, type: 'radio', required: true,
      label: 'Страховой случай?', labelEn: 'Insurance claim?', options: ['Yes', 'No', 'Not Sure'] },
    { id: 'roof-insurance-doc', category: 'roofing', order: 5, type: 'file', required: false,
      label: 'Приложите insurance estimate', labelEn: 'Attach insurance estimate',
      showIf: { question: 'roof-insurance', in: ['Yes'] } },

    // ---- Electrical (TЗ §18) ----
    { id: 'electrical-scope', category: 'electrical', order: 1, type: 'multiselect', required: true,
      label: 'Что нужно сделать?', labelEn: 'Scope',
      options: ['Outlet', 'Lighting', 'Panel Upgrade', 'New Wiring', 'EV Charger', 'Generator', 'Commercial', 'Other'] },
    { id: 'electrical-emergency', category: 'electrical', order: 2, type: 'radio', required: true,
      label: 'Это аварийная ситуация?', labelEn: 'Emergency?', options: ['Yes', 'No'], emergencyIf: ['Yes'] },

    // ---- Plumbing ----
    { id: 'plumbing-scope', category: 'plumbing', order: 1, type: 'multiselect', required: true,
      label: 'Что нужно сделать?', labelEn: 'Scope',
      options: ['Leak', 'Pipe Replacement', 'Water Heater', 'Drain / Clog', 'Fixture Install', 'Repipe', 'Sewer Line', 'Other'] },
    { id: 'plumbing-emergency', category: 'plumbing', order: 2, type: 'radio', required: true,
      label: 'Есть активная протечка?', labelEn: 'Active leak / emergency?', options: ['Yes', 'No'], emergencyIf: ['Yes'] },

    // ---- Kitchen Remodeling ----
    { id: 'kitchen-scope', category: 'kitchen-remodeling', order: 1, type: 'multiselect', required: true,
      label: 'Что вы хотите сделать?', labelEn: 'Scope',
      options: ['Full Remodel', 'Cabinets', 'Countertops', 'Backsplash', 'Flooring', 'Appliances', 'Plumbing', 'Electrical', 'Island', 'Other'] },
    { id: 'kitchen-size', category: 'kitchen-remodeling', order: 2, type: 'radio', required: true,
      label: 'Размер кухни', labelEn: 'Kitchen size', options: ['Small', 'Medium', 'Large', 'Not Sure'] },
    { id: 'kitchen-layout', category: 'kitchen-remodeling', order: 3, type: 'radio', required: true,
      label: 'Нужно ли менять планировку?', labelEn: 'Change the layout?', options: ['Yes', 'No', 'Not Sure'] },
    { id: 'kitchen-materials', category: 'kitchen-remodeling', order: 4, type: 'radio', required: true,
      label: 'Материалы', labelEn: 'Materials',
      options: ['Customer already purchased', 'Customer will purchase', 'Contractor should provide', 'Need help choosing'] },

    // ---- Painting ----
    { id: 'painting-area', category: 'painting', order: 1, type: 'multiselect', required: true,
      label: 'Что красим?', labelEn: 'What are we painting?',
      options: ['Interior Walls', 'Ceilings', 'Trim / Doors', 'Cabinets', 'Basement', 'Commercial Space'] },
    { id: 'painting-rooms', category: 'painting', order: 2, type: 'number', required: true,
      label: 'Количество комнат', labelEn: 'Number of rooms' },
    { id: 'painting-prep', category: 'painting', order: 3, type: 'radio', required: false,
      label: 'Нужна подготовка поверхностей (patching)?', labelEn: 'Surface prep needed?', options: ['Yes', 'No', 'Not Sure'] },

    // ---- Flooring ----
    { id: 'flooring-type', category: 'flooring', order: 1, type: 'radio', required: true,
      label: 'Тип покрытия', labelEn: 'Flooring type',
      options: ['Hardwood', 'Laminate', 'LVP / Vinyl', 'Carpet', 'Tile', 'Refinishing', 'Not Sure'] },
    { id: 'flooring-sqft', category: 'flooring', order: 2, type: 'number', required: true,
      label: 'Площадь, sq ft', labelEn: 'Area (sq ft)' },
    { id: 'flooring-demo', category: 'flooring', order: 3, type: 'radio', required: true,
      label: 'Нужен демонтаж старого покрытия?', labelEn: 'Removal of old flooring?', options: ['Yes', 'No', 'Not Sure'] },

    // ---- HVAC ----
    { id: 'hvac-scope', category: 'hvac', order: 1, type: 'multiselect', required: true,
      label: 'Что нужно сделать?', labelEn: 'Scope',
      options: ['Repair', 'Replacement', 'New Installation', 'Maintenance', 'Ductwork', 'Mini Split', 'Not Sure'] },
    { id: 'hvac-emergency', category: 'hvac', order: 2, type: 'radio', required: true,
      label: 'Система полностью не работает?', labelEn: 'System completely down?', options: ['Yes', 'No'], emergencyIf: ['Yes'] },

    // ---- Fallback set: applies to any category with no dedicated questions ----
    { id: 'generic-scope', category: '*', order: 1, type: 'radio', required: true,
      label: 'Какой объём работ?', labelEn: 'Scope of work',
      options: ['Small repair', 'Medium project', 'Large project', 'Not Sure'] },
    { id: 'generic-size', category: '*', order: 2, type: 'number', required: false,
      label: 'Примерная площадь, sq ft (если применимо)', labelEn: 'Approximate area (sq ft)' },
    { id: 'generic-materials', category: '*', order: 3, type: 'radio', required: false,
      label: 'Материалы', labelEn: 'Materials',
      options: ['Customer already purchased', 'Customer will purchase', 'Contractor should provide', 'Need help choosing'] }
];

// --------------------------------------------
// Request-more-information reasons (TЗ §49)
// --------------------------------------------
Config.infoRequestReasons = [
    { value: 'photos', label: 'Need Photos' },
    { value: 'address', label: 'Need Address' },
    { value: 'budget', label: 'Need Budget' },
    { value: 'measurements', label: 'Need Measurements' },
    { value: 'scope', label: 'Need Scope' },
    { value: 'verification', label: 'Need Verification' },
    { value: 'other', label: 'Other' }
];

// Contractor "pass" reasons (TЗ §59)
Config.passReasons = [
    'Too Far', 'Budget Too Low', 'Too Busy', 'Not My Trade',
    'Project Too Large', 'Project Too Small', 'Other'
];

// Reasons a customer declined the other quotes (TЗ §66)
Config.declineReasons = ['Price', 'Availability', 'Reviews', 'Communication', 'Experience', 'Other'];

if (typeof module !== 'undefined') { module.exports = Config; }
