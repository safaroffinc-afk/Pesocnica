// End-to-end smoke test of the marketplace logic layer
const storage = {};
global.localStorage = {
    getItem: k => (k in storage ? storage[k] : null),
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: k => { delete storage[k]; }
};
global.window = { location: { search: '' } };

global.Config = require('/home/user/Pesocnica/marketplace/assets/config.js');
global.Utils = require('/home/user/Pesocnica/marketplace/assets/utils.js');
global.SeedContractors = require('/home/user/Pesocnica/marketplace/assets/seed.js');
global.Store = require('/home/user/Pesocnica/marketplace/assets/store.js');
global.Engine = require('/home/user/Pesocnica/marketplace/assets/engine.js');

let failures = 0;
const check = (name, cond) => {
    console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
    if (!cond) failures++;
};

Store.init();

// --- ZIP / service area ---
const doylestown = Store.lookupZip('18901');
check('ZIP 18901 -> Doylestown / Bucks County', doylestown && doylestown.city === 'Doylestown' && doylestown.county === 'Bucks County');
check('18901 serviceable', Store.isServiceable(doylestown));
check('West Chester (19380) NOT serviceable -> waitlist', !Store.isServiceable(Store.lookupZip('19380')));
check('bad ZIP unknown', Store.lookupZip('00000') === null);

// --- Questionnaire ---
const bathQs = Store.questionsFor('bathroom-remodeling');
check('bathroom questionnaire has 7 questions', bathQs.length === 7);
const fallbackQs = Store.questionsFor('fence');
check('fence falls back to generic questions', fallbackQs.length === 3 && fallbackQs[0].category === '*');
const condQ = bathQs.find(q => q.id === 'bath-length');
check('conditional hidden when size=Not Sure', !Engine.questionVisible(condQ, { 'bath-size': 'Not Sure' }));
check('conditional shown when size=Medium', Engine.questionVisible(condQ, { 'bath-size': 'Medium' }));

// --- Customer + project submit ---
const customer = Store.upsertCustomer({
    firstName: 'Anna', lastName: 'Petrova', phone: '+1 (215) 555-0134',
    email: 'anna@example.com', language: 'ru', customerType: 'homeowner',
    phoneVerified: true, serviceConsent: true, leadSource: 'Facebook Ads'
});
Store.setSessionCustomer(customer.id);
const property = Store.upsertProperty(customer.id, {
    street: '12 Main St', city: 'Doylestown', county: 'Bucks County', state: 'PA', zip: '18901',
    lat: doylestown.lat, lng: doylestown.lng, propertyType: 'single-family'
});
const project = {
    id: Store.nextProjectId('PA'),
    customerId: customer.id, propertyId: property.id,
    zip: '18901', location: doylestown,
    customerType: 'homeowner', propertyType: 'single-family',
    categories: ['bathroom-remodeling', 'tile', 'plumbing'], primaryCategory: 'bathroom-remodeling',
    answers: { 'bath-scope': ['Full Remodel', 'Tile'], 'bath-size': 'Medium', 'bath-layout': 'No', 'bath-plumbing-move': 'Not Sure', 'bath-materials': 'Contractor should provide' },
    description: 'Нужно полностью переделать ванную 8x10 ft, убрать старую плитку, заменить shower и установить новую vanity. Материалы обсудим, бюджет гибкий, хочу начать в течение месяца.',
    stage: 'ready-to-hire', timeline: '2-4-weeks', budgetRange: '10k-25k', financingInterest: 'Maybe',
    address: { street: '12 Main St', unit: '', city: 'Doylestown', state: 'PA', zip: '18901' },
    contact: { firstName: 'Anna', lastName: 'Petrova', phone: '+1 (215) 555-0134', email: 'anna@example.com', language: 'ru' },
    phoneVerified: true, tracking: { source: 'Facebook Ads' },
    status: 'submitted', meta: { fillSeconds: 240 },
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
};
check('Project ID format PA-YYYY-NNNNNN', /^PA-\d{4}-\d{6}$/.test(project.id));
Store.createProject(project);
for (let i = 0; i < 4; i++) Store.addMedia({ projectId: project.id, kind: 'photo', name: `p${i}.jpg`, size: 200000, thumb: null });

// --- Scores ---
project.urgency = Engine.urgency(project);
check('urgency Medium for ready-to-hire + 2-4 weeks', project.urgency === 'Medium');
const lead = Engine.leadScore(project);
check(`lead score high (${lead.total})`, lead.total >= 80);
check('classification HIGH QUALITY', lead.classification.label === 'HIGH QUALITY');
const risk = Engine.riskScore(project);
check('risk low for clean submission', risk.level === 'Risk Low');
check('not high value at 10-25K bathroom', !Engine.isHighValue(project));

// AI assistant
const ai = Engine.assist(project.description, project.categories);
check('AI detects bathroom + tile', ai.detectedCategories.includes('bathroom-remodeling') && ai.detectedCategories.includes('tile'));
check('AI extracts 8x10 scope', ai.scope === '8 × 10 ft');

// --- Qualification + matching ---
Store.setStatus(project.id, 'qualified', 'admin', 'Approved');
Store.updateProject(project.id, { qualifiedAt: new Date().toISOString() }, 'admin');
const result = Engine.match(project);
check(`matching returns 3-5 contractors (${result.matches.length})`, result.matches.length >= 3 && result.matches.length <= 5);
const ids = result.matches.map(m => m.contractorId);
check('suspended contractor excluded', !ids.includes('C-1016'));
check('best match is a remodeler in Bucks/Montco', ['C-1001', 'C-1002'].includes(ids[0]));
const kb = result.matches.find(m => m.contractorId === 'C-1001');
check('Keystone (RU-speaking, Bucks) matched with high score', kb && kb.score >= 70);
check('scores sorted desc', result.matches.every((m, i, a) => i === 0 || a[i - 1].score >= m.score));
Store.saveMatches(project.id, result.matches);
Store.setStatus(project.id, 'contractors-invited', 'system');
check('invitations created', Store.invitationsOf(project.id).length === result.matches.length);

// Hard filters: emergency electrical excludes busy contractors
const emergency = Object.assign({}, project, {
    id: 'PA-TEST-EM', primaryCategory: 'electrical', categories: ['electrical'],
    answers: { 'electrical-scope': ['Panel Upgrade'], 'electrical-emergency': 'Yes' },
    budgetRange: '2.5k-5k', stage: 'emergency', timeline: 'asap'
});
check('emergency detected via questionnaire flag', Engine.isEmergency(emergency));
check('emergency urgency High', Engine.urgency(emergency) === 'High');
const emResult = Engine.match(emergency);
check('emergency matches only available-now electricians', emResult.matches.every(m => Store.contractor(m.contractorId).availability === 'available-now' && Store.contractor(m.contractorId).trades.includes('electrical')));

// --- Quotes, selection, completion, review ---
const inv = Store.invitationsOf(project.id)[0];
Store.respondToInvitation(inv.id, 'interested');
const quote = Store.addQuote(Engine.simulateQuote(project, inv.contractorId));
Store.setStatus(project.id, 'quotes-received', 'contractor');
check('quote in budget ballpark', quote.priceLow > 5000 && quote.priceHigh < 40000);
Store.selectContractor(project.id, inv.contractorId, quote.id, { others: 'Price' });
check('status contractor-selected', Store.project(project.id).status === 'contractor-selected');
check('other quotes auto-declined', Store.quotesOf(project.id).every(q => q.id === quote.id ? q.status === 'accepted' : q.status === 'declined'));
Store.setStatus(project.id, 'in-progress', 'contractor');
Store.setStatus(project.id, 'completed', 'contractor');
Store.updateProject(project.id, { completionConfirmed: true, finalValue: Store.budgetMidpoint(project) }, 'customer');
Store.setStatus(project.id, 'review-pending', 'customer');
Store.addReview({ projectId: project.id, customerId: customer.id, contractorId: inv.contractorId,
    quality: 5, communication: 5, timeliness: 4, value: 5, cleanliness: 5, overall: 5, wouldHireAgain: true, text: 'Отлично' });
Store.setStatus(project.id, 'closed', 'system');
check('verified review stored', Store.reviewOf(project.id).verified === true);
Store.refreshCustomerStatus(customer.id);
check('customer status Repeat after 1 completed', Store.customer(customer.id).status === 'Repeat');

// --- Message masking (TЗ §64) ---
const masked = Store.maskMessage('Позвоните мне +1 215 555 0134 или anna@example.com, сайт www.example.com');
check('phone masked', !masked.includes('215 555'));
check('email masked', !masked.includes('anna@example.com'));
check('url masked', !masked.includes('www.example.com'));

// --- Funnel & analytics ---
const funnel = Engine.funnel();
check('funnel: 10 steps, review counted', funnel.length === 10 && funnel[9].value === 1);
const sources = Engine.sourceAnalytics();
check('source analytics attributes Facebook Ads', sources.some(s => s.source === 'Facebook Ads' && s.awarded === 1));
check('total project value = budget midpoint', Engine.totalProjectValue() === 17500);

// --- Risk flags ---
const bot = Object.assign({}, project, { id: 'PA-TEST-BOT', zip: '00000', location: null,
    contact: { phone: '111', email: 'x@mailinator.com' }, meta: { fillSeconds: 5, honeypot: true } });
const botRisk = Engine.riskScore(bot);
check('bot submission flagged Risk High', botRisk.level === 'Risk High' && botRisk.flags.length >= 4);

// --- Persistence survives reload ---
Store.db = null; Store.init();
check('state survives reload', Store.project(project.id) && Store.db.reviews.length === 1);

// --- Settings editable at runtime (TЗ §98) ---
Store.updateSettings({ maxContractorsPerProject: 3 });
const limited = Engine.match(Object.assign({}, project, { id: 'PA-TEST-LIM' }));
check('max contractors setting respected', limited.matches.length <= 3);

// --- SLA alerts fire on stale projects ---
const stale = Object.assign({}, project, { id: 'PA-TEST-SLA', status: 'submitted',
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString() });
Store.db.projects.push(stale);
Store.db.statusHistory.push({ id: 'h-sla', projectId: stale.id, from: null, to: 'submitted',
    at: stale.createdAt, by: 'system', note: '' });
check('SLA alert for unqualified 5h-old project', Engine.alerts().some(a => a.projectId === 'PA-TEST-SLA'));

// --- Duplicate detection (against the still-active stale project) ---
const dup = Object.assign({}, project, { id: 'PA-TEST-DUP', status: 'submitted', createdAt: new Date().toISOString() });
check('duplicate detected', Engine.findDuplicate(dup) !== null);

console.log(failures ? `\n${failures} FAILURES` : '\nALL CHECKS PASSED');
process.exit(failures ? 1 : 0);
