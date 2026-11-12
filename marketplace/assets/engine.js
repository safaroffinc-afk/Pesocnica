// ============================================
// Engine — qualification, risk, matching, analytics
// ============================================
//
// TЗ §21 (AI assistant), §28 (urgency), §42–§46 (lead quality, fraud,
// duplicates), §51–§57 (escalation + matching), §83–§92 (funnel, SLA).

const Engine = {
    // Deterministic pseudo-random in [0,1) so simulated quotes stay stable
    // between renders for the same project/contractor pair.
    hash(seed) {
        let h = 2166136261;
        for (let i = 0; i < seed.length; i++) {
            h ^= seed.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return ((h >>> 0) % 10000) / 10000;
    },

    tradeOf(categoryValue) {
        for (const group of Config.categoryGroups) {
            const item = group.items.find(i => i.value === categoryValue);
            if (item) return item.trade;
        }
        return 'handyman';
    },

    categoryLabel(categoryValue) {
        for (const group of Config.categoryGroups) {
            const item = group.items.find(i => i.value === categoryValue);
            if (item) return item.label;
        }
        return categoryValue || '—';
    },

    // --------------------------------------------------------
    // Urgency (TЗ §28, §53)
    // --------------------------------------------------------
    urgency(project) {
        const stage = Config.projectStages.find(s => s.value === project.stage);
        const timeline = Config.timelineOptions.find(t => t.value === project.timeline);
        let points = (stage ? stage.urgency : 0) + (timeline ? timeline.urgency : 0);
        if (Engine.isEmergency(project)) points += 5;
        if (points >= 7) return 'High';
        if (points >= 3) return 'Medium';
        return 'Low';
    },

    isEmergency(project) {
        if (project.stage === 'emergency') return true;
        const answers = project.answers || {};
        return Store.db.questions.some(q => {
            if (!q.emergencyIf) return false;
            const value = answers[q.id];
            const list = Array.isArray(value) ? value : [value];
            return list.some(v => q.emergencyIf.includes(v));
        });
    },

    // High value project / call task rules (TЗ §51, §52)
    isHighValue(project) {
        const settings = Store.settings;
        const budget = Config.budgetRanges.find(b => b.value === project.budgetRange);
        const byBudget = budget && budget.min !== null && budget.max >= settings.highValueBudgetThreshold;
        const byCategory = settings.highValueCategories.includes(project.primaryCategory);
        const byProperty = ['commercial', 'office', 'retail', 'restaurant', 'warehouse'].includes(project.propertyType);
        return Boolean(byBudget || byCategory || byProperty);
    },

    // --------------------------------------------------------
    // Lead Quality Score (TЗ §42–§44)
    // --------------------------------------------------------
    leadScore(project) {
        const weights = Store.settings.leadScoreWeights;
        const photos = Store.mediaOf(project.id, 'photo').length;
        const budget = Config.budgetRanges.find(b => b.value === project.budgetRange);
        const requiredAnswered = Engine.requiredQuestionsAnswered(project);
        const duplicate = Engine.findDuplicate(project);

        const parts = [
            {
                key: 'phoneVerified', label: 'Phone Verified', max: weights.phoneVerified,
                ratio: project.phoneVerified ? 1 : 0
            },
            {
                key: 'completeDescription', label: 'Complete Description', max: weights.completeDescription,
                ratio: (project.description || '').trim().length >= 120 ? 1
                    : (project.description || '').trim().length >= 40 ? 0.5 : 0
            },
            {
                key: 'photos', label: 'Photos', max: weights.photos,
                ratio: photos >= 3 ? 1 : photos >= 1 ? 0.6 : 0
            },
            {
                key: 'budgetProvided', label: 'Budget Provided', max: weights.budgetProvided,
                ratio: budget && budget.min !== null ? 1 : project.budgetRange === 'discuss' ? 0.5 : 0
            },
            {
                key: 'timelineProvided', label: 'Timeline Provided', max: weights.timelineProvided,
                ratio: project.timeline ? 1 : 0
            },
            {
                key: 'addressVerified', label: 'Address Verified', max: weights.addressVerified,
                ratio: project.address && project.address.street && project.address.zip ? 1 : project.zip ? 0.4 : 0
            },
            {
                key: 'categoryComplete', label: 'Category Complete', max: weights.categoryComplete,
                ratio: project.primaryCategory ? (requiredAnswered ? 1 : 0.5) : 0
            },
            {
                key: 'customerResponsive', label: 'Customer Responsive', max: weights.customerResponsive,
                ratio: project.infoRequest && project.infoRequest.status === 'open'
                    && Utils.hoursSince(project.infoRequest.requestedAt) > 24 ? 0 : 1
            },
            {
                key: 'noDuplicate', label: 'No Duplicate', max: weights.noDuplicate,
                ratio: duplicate ? 0 : 1
            }
        ];

        const breakdown = parts.map(part => ({
            key: part.key,
            label: part.label,
            max: part.max,
            points: Math.round(part.max * part.ratio)
        }));
        const total = Math.min(100, breakdown.reduce((sum, part) => sum + part.points, 0));
        return { total, breakdown, classification: Engine.classify(total), duplicateOf: duplicate ? duplicate.id : null };
    },

    classify(total) {
        const t = Store.settings.leadThresholds;
        if (total >= t.high) return { label: 'HIGH QUALITY', tone: 'success' };
        if (total >= t.qualified) return { label: 'QUALIFIED', tone: 'info' };
        if (total >= t.review) return { label: 'NEEDS REVIEW', tone: 'warning' };
        return { label: 'INCOMPLETE', tone: 'danger' };
    },

    requiredQuestionsAnswered(project) {
        const questions = Store.questionsFor(project.primaryCategory)
            .filter(q => q.required && Engine.questionVisible(q, project.answers || {}));
        return questions.every(q => {
            const value = (project.answers || {})[q.id];
            return Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null && value !== '';
        });
    },

    // Conditional logic for the dynamic questionnaire (TЗ §19)
    questionVisible(question, answers) {
        if (!question.showIf) return true;
        const raw = answers[question.showIf.question];
        const values = Array.isArray(raw) ? raw : (raw === undefined || raw === null || raw === '' ? [] : [raw]);
        if (question.showIf.in) return values.some(v => question.showIf.in.includes(v));
        if (question.showIf.notIn) return values.length > 0 && !values.some(v => question.showIf.notIn.includes(v));
        return true;
    },

    // --------------------------------------------------------
    // Fraud & spam (TЗ §45) and duplicates (TЗ §46)
    // --------------------------------------------------------
    riskScore(project) {
        const flags = [];
        const customer = Store.customer(project.customerId);
        const phone = Utils.normalizePhone(project.contact && project.contact.phone);

        if (!Utils.isValidPhone(phone)) flags.push({ code: 'invalid-phone', label: 'Некорректный телефон', weight: 30 });
        if (!Store.lookupZip(project.zip)) flags.push({ code: 'fake-zip', label: 'ZIP не найден в базе', weight: 25 });

        const samePhoneOthers = Store.db.customers.filter(c =>
            Utils.normalizePhone(c.phone) === phone && c.id !== project.customerId);
        if (samePhoneOthers.length) flags.push({ code: 'duplicate-phone', label: 'Телефон уже привязан к другому клиенту', weight: 20 });

        const email = (project.contact && project.contact.email || '').toLowerCase();
        if (email) {
            const sameEmailOthers = Store.db.customers.filter(c =>
                (c.email || '').toLowerCase() === email && c.id !== project.customerId);
            if (sameEmailOthers.length) flags.push({ code: 'duplicate-email', label: 'Email уже привязан к другому клиенту', weight: 15 });
            const domain = email.split('@')[1] || '';
            if (['mailinator.com', 'tempmail.com', 'guerrillamail.com', '10minutemail.com'].includes(domain)) {
                flags.push({ code: 'disposable-email', label: 'Одноразовый email', weight: 20 });
            }
        }

        if (Engine.findDuplicate(project)) flags.push({ code: 'duplicate-project', label: 'Похожий активный проект', weight: 15 });

        if (customer) {
            const last24h = Store.projectsOfCustomer(customer.id)
                .filter(p => Utils.hoursSince(p.createdAt) <= 24);
            if (last24h.length > 3) flags.push({ code: 'repeated-submissions', label: 'Более 3 заявок за 24 часа', weight: 25 });
        }

        const meta = project.meta || {};
        if (meta.fillSeconds && meta.fillSeconds < 20) {
            flags.push({ code: 'bot-activity', label: 'Форма заполнена подозрительно быстро', weight: 30 });
        }
        if (meta.honeypot) flags.push({ code: 'bot-activity', label: 'Сработала honeypot-ловушка', weight: 50 });
        if (meta.otpAttempts && meta.otpAttempts > 4) {
            flags.push({ code: 'suspicious-ip', label: 'Много неудачных попыток OTP', weight: 15 });
        }

        const score = Math.min(100, flags.reduce((sum, f) => sum + f.weight, 0));
        const level = score >= 50 ? 'Risk High' : score >= 20 ? 'Risk Medium' : 'Risk Low';
        return { score, level, flags };
    },

    findDuplicate(project) {
        if (!project.customerId) return null;
        return Store.db.projects.find(p =>
            p.id !== project.id &&
            p.customerId === project.customerId &&
            p.primaryCategory === project.primaryCategory &&
            p.zip === project.zip &&
            !['completed', 'closed', 'cancelled', 'review-pending'].includes(p.status) &&
            Utils.hoursSince(p.createdAt) < 24 * 60) || null;
    },

    // --------------------------------------------------------
    // AI Project Assistant (TЗ §21) — structuring only, never an estimate
    // --------------------------------------------------------
    assist(text, selectedCategories = []) {
        const lower = String(text || '').toLowerCase();
        if (lower.trim().length < 15) return null;

        const keywordMap = {
            'bathroom-remodeling': ['ванн', 'bathroom', 'санузел', 'shower', 'душ', 'ванная'],
            'kitchen-remodeling': ['кухн', 'kitchen', 'cabinet', 'шкаф'],
            'tile': ['плитк', 'tile', 'кафел', 'backsplash', 'керамогранит'],
            'plumbing': ['сантех', 'plumb', 'труб', 'протеч', 'leak', 'вода', 'water heater'],
            'electrical': ['электр', 'electric', 'проводк', 'розетк', 'outlet', 'панел', 'panel'],
            'drywall': ['гипсокартон', 'drywall', 'стен', 'потолок', 'ceiling'],
            'painting': ['покрас', 'paint', 'краск'],
            'flooring': ['пол', 'floor', 'ламинат', 'паркет', 'hardwood'],
            'roofing': ['крыш', 'roof', 'кровл', 'протекает крыша'],
            'hvac': ['hvac', 'кондицион', 'отоплен', 'heating', 'furnace'],
            'demolition': ['демонтаж', 'снести', 'demolition', 'убрать стар'],
            'windows': ['окн', 'window'],
            'doors': ['двер', 'door']
        };

        const detected = [];
        Object.entries(keywordMap).forEach(([category, words]) => {
            if (words.some(word => lower.includes(word))) detected.push(category);
        });

        const dimensions = (text.match(/(\d{1,3})\s*[x×хX]\s*(\d{1,3})/) || []);
        const sqft = (text.match(/(\d{2,5})\s*(sq\s?ft|кв\.?\s?фут|sqft)/i) || []);

        const primary = selectedCategories.find(c => detected.includes(c)) || detected[0] || null;
        const trades = Array.from(new Set(detected.map(Engine.tradeOf)));

        const missing = [];
        if (!dimensions.length && !sqft.length) missing.push('Укажите примерные размеры или площадь работ.');
        if (!/бюджет|budget|\$/.test(lower)) missing.push('Уточните ориентировочный бюджет — это ускорит подбор.');
        if (!/материал|material|плитк|tile|cabinet/.test(lower)) missing.push('Кто покупает материалы — вы или подрядчик?');
        if (!/срок|когда|asap|неделя|месяц|week|month/.test(lower)) missing.push('Когда планируете начать работы?');

        return {
            detectedCategories: detected,
            primarySuggestion: primary,
            scope: dimensions.length ? `${dimensions[1]} × ${dimensions[2]} ft` : (sqft.length ? `${sqft[1]} sq ft` : null),
            tradesNeeded: trades,
            missingQuestions: missing.slice(0, 3)
        };
    },

    // --------------------------------------------------------
    // Matching Engine (TЗ §54–§57)
    // --------------------------------------------------------
    hardFilter(project, contractor) {
        const reasons = [];
        const settings = Store.settings;
        const location = Store.lookupZip(project.zip);
        const home = Store.lookupZip(contractor.homeZip);
        const distance = Utils.distanceMiles(location, home);

        if (contractor.accountStatus !== 'active') reasons.push('Account Status');
        if (!contractor.verification.verified) reasons.push('Required Verification');

        const primaryTrade = Engine.tradeOf(project.primaryCategory);
        if (!contractor.trades.includes(primaryTrade)) reasons.push('Trade');

        const inCounty = location && contractor.serviceCounties.includes(location.county);
        const inRadius = distance !== null && distance <= contractor.radiusMiles;
        if (!inCounty && !inRadius) reasons.push('Service Area');

        const budget = Config.budgetRanges.find(b => b.value === project.budgetRange);
        if (budget && budget.min !== null) {
            if (budget.max < contractor.minJob) reasons.push('Minimum Job');
            if (budget.min > contractor.maxJob) reasons.push('Maximum Job');
        }

        const licensedTrades = ['electrical', 'plumbing', 'hvac', 'roofing'];
        if (licensedTrades.includes(primaryTrade) && !contractor.verification.licensed) {
            reasons.push('Required Verification');
        }

        const urgency = Engine.urgency(project);
        if (Engine.isEmergency(project) && contractor.availability !== 'available-now') reasons.push('Availability');
        else if (urgency === 'High' && contractor.availability === 'busy') reasons.push('Availability');

        return { passed: reasons.length === 0, reasons, distance, settings };
    },

    matchScore(project, contractor, distance) {
        const w = Store.settings.matchWeights;
        const customer = Store.customer(project.customerId);
        const primaryTrade = Engine.tradeOf(project.primaryCategory);
        const secondaryTrades = (project.categories || [])
            .filter(c => c !== project.primaryCategory)
            .map(Engine.tradeOf);

        // Trade coverage: primary is mandatory, secondary trades add the rest.
        const covered = secondaryTrades.filter(t => contractor.trades.includes(t)).length;
        const tradeRatio = secondaryTrades.length
            ? 0.7 + 0.3 * (covered / secondaryTrades.length)
            : 1;

        // Location: closer is better, decaying to 0 at the contractor's radius.
        const locationRatio = distance === null ? 0.5
            : Math.max(0, Math.min(1, 1 - (distance / Math.max(contractor.radiusMiles, 1)) * 0.9));

        const trustRatio = contractor.trustScore / 100;

        const budget = Config.budgetRanges.find(b => b.value === project.budgetRange);
        let budgetRatio = 0.6;
        if (budget && budget.min !== null) {
            const overlap = Math.min(budget.max, contractor.maxJob) - Math.max(budget.min, contractor.minJob);
            const span = Math.max(budget.max - budget.min, 1);
            budgetRatio = Math.max(0, Math.min(1, overlap / span));
        }

        const availabilityRatio = contractor.availability === 'available-now' ? 1
            : contractor.availability === 'available' ? 0.8 : 0.3;

        const categoryLabel = Engine.categoryLabel(project.primaryCategory).toLowerCase();
        const specialtyHit = contractor.specialties.some(s => categoryLabel.includes(s.toLowerCase()) || s.toLowerCase().includes(categoryLabel));
        const similarRatio = Math.min(1, (specialtyHit ? 0.6 : 0) + Math.min(0.4, contractor.completedProjects / 250));

        const responseRatio = Math.min(1,
            contractor.responseRate * 0.7 + Math.max(0, 1 - contractor.avgResponseMinutes / 120) * 0.3);

        const preferred = (customer && customer.language) || 'en';
        const languageRatio = contractor.languages.includes(preferred) ? 1 : 0.4;

        const breakdown = [
            { key: 'trade', label: 'Trade Match', max: w.trade, points: w.trade * tradeRatio },
            { key: 'location', label: 'Location', max: w.location, points: w.location * locationRatio },
            { key: 'trust', label: 'Trust Score', max: w.trust, points: w.trust * trustRatio },
            { key: 'budget', label: 'Budget Fit', max: w.budget, points: w.budget * budgetRatio },
            { key: 'availability', label: 'Availability', max: w.availability, points: w.availability * availabilityRatio },
            { key: 'similarWork', label: 'Similar Work', max: w.similarWork, points: w.similarWork * similarRatio },
            { key: 'responseHistory', label: 'Response History', max: w.responseHistory, points: w.responseHistory * responseRatio },
            { key: 'language', label: 'Language', max: w.language, points: w.language * languageRatio }
        ].map(part => Object.assign(part, { points: Math.round(part.points * 10) / 10 }));

        const totalMax = breakdown.reduce((sum, part) => sum + part.max, 0) || 100;
        const raw = breakdown.reduce((sum, part) => sum + part.points, 0);
        return { score: Math.round((raw / totalMax) * 100), breakdown };
    },

    match(project) {
        const settings = Store.settings;
        const candidates = [];
        const rejected = [];

        Store.db.contractors.forEach(contractor => {
            const filter = Engine.hardFilter(project, contractor);
            if (!filter.passed) {
                rejected.push({ contractorId: contractor.id, company: contractor.company, reasons: filter.reasons });
                return;
            }
            const scored = Engine.matchScore(project, contractor, filter.distance);
            candidates.push({
                contractorId: contractor.id,
                score: scored.score,
                breakdown: scored.breakdown,
                distance: filter.distance
            });
        });

        candidates.sort((a, b) => b.score - a.score || a.distance - b.distance);
        const max = settings.maxContractorsPerProject;
        return { matches: candidates.slice(0, max), rejected, available: candidates.length };
    },

    // Simulated contractor quote (TЗ §61) — a real build receives this from
    // the contractor app; here it lets the comparison screen be exercised.
    simulateQuote(project, contractorId) {
        const contractor = Store.contractor(contractorId);
        const midpoint = Store.budgetMidpoint(project) || 6000;
        const spread = Engine.hash(project.id + contractorId);
        const factor = 0.78 + spread * 0.5;
        const base = Math.round((midpoint * factor) / 50) * 50;
        const startDays = 3 + Math.round(spread * 21);
        const durationDays = 4 + Math.round(spread * 18);
        return {
            projectId: project.id,
            contractorId,
            priceLow: base,
            priceHigh: Math.round((base * (1.1 + spread * 0.15)) / 50) * 50,
            startDate: new Date(Date.now() + startDays * 86400000).toISOString(),
            durationDays,
            materialsIncluded: spread > 0.45,
            warrantyMonths: [12, 24, 36, 60][Math.floor(spread * 4)],
            note: `Смета от ${contractor ? contractor.company : contractorId} по описанию проекта. Точная цена — после осмотра объекта.`
        };
    },

    // --------------------------------------------------------
    // SLA monitoring & alerts (TЗ §90–§92)
    // --------------------------------------------------------
    slaOf(project) {
        const history = Store.historyOf(project.id);
        const at = status => {
            const entry = history.find(h => h.to === status);
            return entry ? entry.at : null;
        };
        const submittedAt = at('submitted') || project.createdAt;
        const qualifiedAt = at('qualified');
        const matchedAt = at('contractors-invited') || at('matching');
        const invitations = Store.invitationsOf(project.id).filter(i => i.respondedAt);
        const firstInterest = invitations
            .filter(i => i.status === 'interested')
            .sort((a, b) => new Date(a.respondedAt) - new Date(b.respondedAt))[0];
        const quotes = Store.quotesOf(project.id).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        const hoursBetween = (a, b) => (a && b) ? Math.round(((new Date(b) - new Date(a)) / 3600000) * 10) / 10 : null;
        return {
            submittedAt,
            timeToQualification: hoursBetween(submittedAt, qualifiedAt),
            timeToMatch: hoursBetween(qualifiedAt, matchedAt),
            timeToFirstInterest: hoursBetween(matchedAt, firstInterest ? firstInterest.respondedAt : null),
            timeToFirstQuote: hoursBetween(matchedAt, quotes.length ? quotes[0].createdAt : null)
        };
    },

    alerts() {
        const sla = Store.settings.sla;
        const list = [];
        Store.db.projects.forEach(project => {
            if (['draft', 'closed', 'cancelled', 'completed'].includes(project.status)) return;
            const timing = Engine.slaOf(project);
            const age = Utils.hoursSince(timing.submittedAt);

            if (['submitted', 'under-review', 'phone-verification'].includes(project.status) &&
                age > sla.qualificationHours) {
                list.push({ projectId: project.id, level: 'warning',
                    text: `Заявка не квалифицирована ${Math.round(age)} ч (SLA ${sla.qualificationHours} ч)` });
            }
            if (project.status === 'qualified' && Utils.hoursSince(project.qualifiedAt || timing.submittedAt) > sla.noContractorAlertHours) {
                list.push({ projectId: project.id, level: 'danger',
                    text: `Qualified без подрядчиков более ${sla.noContractorAlertHours} ч` });
            }
            if (['contractors-invited', 'matching'].includes(project.status)) {
                const responded = Store.invitationsOf(project.id).some(i => i.respondedAt);
                const matchedAge = Utils.hoursSince(project.matchedAt || timing.submittedAt);
                if (!responded && matchedAge > sla.noResponseAlertHours) {
                    list.push({ projectId: project.id, level: 'danger',
                        text: `Нет реакции подрядчиков более ${sla.noResponseAlertHours} ч` });
                }
            }
            if (['contractors-invited', 'contractors-interested'].includes(project.status) &&
                !Store.quotesOf(project.id).length &&
                Utils.hoursSince(project.matchedAt || timing.submittedAt) > sla.noQuoteAlertHours) {
                list.push({ projectId: project.id, level: 'danger',
                    text: `Нет ни одной сметы более ${sla.noQuoteAlertHours} ч` });
            }
        });
        return list;
    },

    // --------------------------------------------------------
    // Funnel & marketing analytics (TЗ §82–§86)
    // --------------------------------------------------------
    funnel() {
        const projects = Store.db.projects;
        const reached = status => projects.filter(p =>
            Store.historyOf(p.id).some(h => h.to === status) || p.status === status);
        const started = projects.length + Store.db.waitlist.length;
        const contact = projects.filter(p => p.contact && p.contact.phone).length;
        const verified = projects.filter(p => p.phoneVerified).length;
        const submitted = projects.filter(p => p.status !== 'draft').length;
        const qualified = reached('qualified').length;
        const matched = reached('contractors-invited').length;
        const quoted = projects.filter(p => Store.quotesOf(p.id).length).length;
        const selected = reached('contractor-selected').length;
        const completed = reached('completed').length;
        const reviewed = Store.db.reviews.length;
        return [
            { label: 'Start Project', value: started },
            { label: 'Enter Contact', value: contact },
            { label: 'Verify Phone', value: verified },
            { label: 'Submit', value: submitted },
            { label: 'Qualified', value: qualified },
            { label: 'Matched', value: matched },
            { label: 'Receive Quote', value: quoted },
            { label: 'Select Contractor', value: selected },
            { label: 'Completed', value: completed },
            { label: 'Verified Review', value: reviewed }
        ];
    },

    conversionRates() {
        const steps = Engine.funnel();
        const rates = [];
        for (let i = 1; i < steps.length; i++) {
            const from = steps[i - 1].value;
            rates.push({
                label: `${steps[i - 1].label} → ${steps[i].label}`,
                value: from ? Math.round((steps[i].value / from) * 100) : 0
            });
        }
        return rates;
    },

    sourceAnalytics() {
        const bySource = {};
        Store.db.projects.forEach(project => {
            const source = (project.tracking && project.tracking.source) || 'Unknown';
            if (!bySource[source]) {
                bySource[source] = { source, leads: 0, qualified: 0, matched: 0, awarded: 0, completed: 0, value: 0 };
            }
            const row = bySource[source];
            row.leads += 1;
            if (Store.historyOf(project.id).some(h => h.to === 'qualified')) row.qualified += 1;
            if (Store.historyOf(project.id).some(h => h.to === 'contractors-invited')) row.matched += 1;
            if (Store.selectionOf(project.id)) {
                row.awarded += 1;
                row.value += Store.budgetMidpoint(project) || 0;
            }
            if (['completed', 'review-pending', 'closed'].includes(project.status)) row.completed += 1;
        });
        return Object.values(bySource).sort((a, b) => b.leads - a.leads);
    },

    // Total Project Value Created (TЗ §86)
    totalProjectValue() {
        return Store.db.projects
            .filter(p => Store.selectionOf(p.id))
            .reduce((sum, p) => sum + (p.finalValue || Store.budgetMidpoint(p) || 0), 0);
    }
};

if (typeof module !== 'undefined') { module.exports = Engine; }
