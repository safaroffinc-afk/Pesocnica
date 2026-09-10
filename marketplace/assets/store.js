// ============================================
// Store — client-side data layer (localStorage)
// ============================================
//
// Implements the API objects listed in TЗ §97. In production these are REST
// resources; here they are collections in one JSON document so the whole
// customer -> CRM -> matching -> review loop can be demonstrated end to end.

const Store = {
    KEY: 'pesocnica.marketplace.v1',
    DRAFT_KEY: 'pesocnica.marketplace.draft.v1',
    db: null,

    // --------------------------------------------------------
    // Lifecycle
    // --------------------------------------------------------
    empty() {
        return {
            version: 1,
            settings: JSON.parse(JSON.stringify(Config.defaultSettings)),
            serviceAreas: JSON.parse(JSON.stringify(Config.serviceAreas)),
            questions: JSON.parse(JSON.stringify(Config.questions)),
            contractors: JSON.parse(JSON.stringify(SeedContractors)),
            customers: [],
            properties: [],
            projects: [],
            media: [],
            statusHistory: [],
            matches: [],
            invitations: [],
            quotes: [],
            appointments: [],
            conversations: [],
            messages: [],
            selections: [],
            changeOrders: [],
            reviews: [],
            referrals: [],
            notifications: [],
            auditLog: [],
            waitlist: [],
            csat: [],
            tasks: [],
            sequences: {},
            session: { customerId: null }
        };
    },

    init() {
        try {
            const raw = localStorage.getItem(Store.KEY);
            Store.db = raw ? JSON.parse(raw) : Store.empty();
        } catch (err) {
            console.warn('Store: corrupted state, starting fresh', err);
            Store.db = Store.empty();
        }
        // Forward-compatible merge: new collections/settings added by a later
        // release must not break a browser holding an older document.
        const blank = Store.empty();
        Object.keys(blank).forEach(key => {
            if (Store.db[key] === undefined) Store.db[key] = blank[key];
        });
        Store.db.settings = Object.assign({}, blank.settings, Store.db.settings);
        if (!Store.db.contractors.length) Store.db.contractors = blank.contractors;
        if (!Store.db.questions.length) Store.db.questions = blank.questions;
        return Store.db;
    },

    save() {
        try {
            localStorage.setItem(Store.KEY, JSON.stringify(Store.db));
        } catch (err) {
            // Quota is usually media thumbnails — drop them, keep the records.
            console.warn('Store: quota exceeded, dropping thumbnails', err);
            Store.db.media.forEach(item => { item.thumb = null; });
            try {
                localStorage.setItem(Store.KEY, JSON.stringify(Store.db));
            } catch (fatal) {
                console.error('Store: unable to persist', fatal);
            }
        }
    },

    reset() {
        localStorage.removeItem(Store.KEY);
        localStorage.removeItem(Store.DRAFT_KEY);
        Store.db = Store.empty();
        Store.save();
    },

    get settings() { return Store.db.settings; },

    updateSettings(patch) {
        Store.db.settings = Object.assign({}, Store.db.settings, patch);
        Store.audit('admin', 'settings.update', 'Settings', 'settings', Object.keys(patch).join(', '));
        Store.save();
    },

    // --------------------------------------------------------
    // Geo / service area (TЗ §7, §8)
    // --------------------------------------------------------
    lookupZip(zip) {
        const clean = String(zip || '').trim();
        return Config.zipDatabase[clean] || null;
    },

    isServiceable(location) {
        if (!location) return false;
        return Store.db.serviceAreas.some(area =>
            area.active && area.county === location.county && area.state === location.state);
    },

    // --------------------------------------------------------
    // Questionnaire (TЗ §13, §19)
    // --------------------------------------------------------
    questionsFor(category) {
        const specific = Store.db.questions
            .filter(q => q.category === category)
            .sort((a, b) => (a.order || 0) - (b.order || 0));
        if (specific.length) return specific;
        return Store.db.questions
            .filter(q => q.category === '*')
            .sort((a, b) => (a.order || 0) - (b.order || 0));
    },

    saveQuestion(question) {
        const index = Store.db.questions.findIndex(q => q.id === question.id);
        if (index >= 0) {
            Store.db.questions[index] = Object.assign({}, Store.db.questions[index], question);
            Store.audit('admin', 'question.update', 'ProjectQuestion', question.id, question.label);
        } else {
            Store.db.questions.push(question);
            Store.audit('admin', 'question.create', 'ProjectQuestion', question.id, question.label);
        }
        Store.save();
    },

    deleteQuestion(id) {
        Store.db.questions = Store.db.questions.filter(q => q.id !== id);
        Store.audit('admin', 'question.delete', 'ProjectQuestion', id, '');
        Store.save();
    },

    moveQuestion(id, direction) {
        const question = Store.db.questions.find(q => q.id === id);
        if (!question) return;
        const siblings = Store.db.questions
            .filter(q => q.category === question.category)
            .sort((a, b) => (a.order || 0) - (b.order || 0));
        const index = siblings.findIndex(q => q.id === id);
        const target = siblings[index + direction];
        if (!target) return;
        const swap = question.order;
        question.order = target.order;
        target.order = swap;
        Store.audit('admin', 'question.reorder', 'ProjectQuestion', id, `-> ${question.order}`);
        Store.save();
    },

    // --------------------------------------------------------
    // Identifiers (TЗ §37)
    // --------------------------------------------------------
    nextProjectId(state = 'PA') {
        const year = new Date().getFullYear();
        const key = `${state}-${year}`;
        const next = (Store.db.sequences[key] || 0) + 1;
        Store.db.sequences[key] = next;
        return `${state}-${year}-${String(next).padStart(6, '0')}`;
    },

    // --------------------------------------------------------
    // Customers (TЗ §39, §77, §79, §80)
    // --------------------------------------------------------
    findCustomerByPhone(phone) {
        const digits = Utils.normalizePhone(phone);
        return Store.db.customers.find(c => Utils.normalizePhone(c.phone) === digits) || null;
    },

    findCustomerByEmail(email) {
        const clean = String(email || '').trim().toLowerCase();
        if (!clean) return null;
        return Store.db.customers.find(c => (c.email || '').toLowerCase() === clean) || null;
    },

    upsertCustomer(data) {
        let customer = Store.findCustomerByPhone(data.phone) ||
            (data.email ? Store.findCustomerByEmail(data.email) : null);
        if (customer) {
            Object.assign(customer, {
                firstName: data.firstName || customer.firstName,
                lastName: data.lastName || customer.lastName,
                email: data.email || customer.email,
                language: data.language || customer.language,
                customerType: data.customerType || customer.customerType,
                phoneVerified: customer.phoneVerified || !!data.phoneVerified,
                emailVerified: customer.emailVerified || !!data.emailVerified,
                serviceConsent: data.serviceConsent ?? customer.serviceConsent,
                marketingConsent: data.marketingConsent ?? customer.marketingConsent,
                lastActivityAt: new Date().toISOString()
            });
        } else {
            customer = {
                id: Utils.uid('cust'),
                firstName: data.firstName || '',
                lastName: data.lastName || '',
                phone: data.phone || '',
                email: data.email || '',
                language: data.language || 'en',
                customerType: data.customerType || 'homeowner',
                phoneVerified: !!data.phoneVerified,
                emailVerified: !!data.emailVerified,
                serviceConsent: !!data.serviceConsent,
                marketingConsent: !!data.marketingConsent,
                status: 'New Lead',
                leadSource: data.leadSource || 'Website Organic',
                referralCode: `REF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
                referredByCode: data.referredByCode || null,
                assignedManager: null,
                createdAt: new Date().toISOString(),
                lastActivityAt: new Date().toISOString()
            };
            Store.db.customers.push(customer);
            Store.audit('system', 'customer.create', 'Customer', customer.id, customer.phone);
        }
        Store.save();
        return customer;
    },

    customer(id) { return Store.db.customers.find(c => c.id === id) || null; },

    // Recomputes the derived customer status (TЗ §80, §81)
    refreshCustomerStatus(customerId) {
        const customer = Store.customer(customerId);
        if (!customer || customer.status === 'Blocked') return;
        const projects = Store.projectsOfCustomer(customerId);
        const completed = projects.filter(p => ['completed', 'review-pending', 'closed'].includes(p.status));
        const volume = completed.reduce((sum, p) => sum + (p.finalValue || Store.budgetMidpoint(p) || 0), 0);
        if (completed.length >= 3 || volume >= 100000) customer.status = 'VIP';
        else if (completed.length >= 1) customer.status = 'Repeat';
        else if (projects.some(p => !['draft', 'cancelled', 'closed'].includes(p.status))) customer.status = 'Active';
        else if (customer.phoneVerified) customer.status = 'Verified';
        customer.lifetimeValue = volume;
        Store.save();
    },

    // --------------------------------------------------------
    // Properties (TЗ §76)
    // --------------------------------------------------------
    upsertProperty(customerId, address) {
        const existing = Store.db.properties.find(p =>
            p.customerId === customerId &&
            (p.street || '').toLowerCase() === (address.street || '').toLowerCase() &&
            p.zip === address.zip);
        if (existing) return existing;
        const property = {
            id: Utils.uid('prop'),
            customerId,
            label: address.label || 'Property',
            street: address.street || '',
            unit: address.unit || '',
            city: address.city || '',
            county: address.county || '',
            state: address.state || '',
            zip: address.zip || '',
            lat: address.lat || null,
            lng: address.lng || null,
            propertyType: address.propertyType || null,
            createdAt: new Date().toISOString()
        };
        Store.db.properties.push(property);
        Store.save();
        return property;
    },

    propertiesOf(customerId) {
        return Store.db.properties.filter(p => p.customerId === customerId);
    },

    // --------------------------------------------------------
    // Projects
    // --------------------------------------------------------
    createProject(project) {
        Store.db.projects.push(project);
        Store.setStatus(project.id, project.status || 'submitted', 'system', 'Project created');
        Store.audit('customer', 'project.create', 'Project', project.id, project.primaryCategory);
        Store.save();
        return project;
    },

    project(id) { return Store.db.projects.find(p => p.id === id) || null; },

    projectsOfCustomer(customerId) {
        return Store.db.projects
            .filter(p => p.customerId === customerId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    updateProject(id, patch, actor = 'admin', note = '') {
        const project = Store.project(id);
        if (!project) return null;
        Object.assign(project, patch, { updatedAt: new Date().toISOString() });
        Store.audit(actor, 'project.update', 'Project', id, note || Object.keys(patch).join(', '));
        Store.save();
        return project;
    },

    setStatus(projectId, status, actor = 'admin', note = '') {
        const project = Store.project(projectId);
        if (!project) return null;
        const previous = project.status;
        project.status = status;
        project.updatedAt = new Date().toISOString();
        Store.db.statusHistory.push({
            id: Utils.uid('hist'),
            projectId,
            from: previous || null,
            to: status,
            at: new Date().toISOString(),
            by: actor,
            note
        });
        Store.audit(actor, 'project.status', 'Project', projectId, `${previous || '—'} → ${status}`);
        Store.save();
        return project;
    },

    historyOf(projectId) {
        return Store.db.statusHistory
            .filter(h => h.projectId === projectId)
            .sort((a, b) => new Date(a.at) - new Date(b.at));
    },

    budgetMidpoint(project) {
        const range = Config.budgetRanges.find(b => b.value === project.budgetRange);
        if (!range || range.min === null) return null;
        return Math.round((range.min + range.max) / 2);
    },

    // --------------------------------------------------------
    // Media (TЗ §22–§25)
    // --------------------------------------------------------
    addMedia(item) {
        const record = Object.assign({ id: Utils.uid('media'), createdAt: new Date().toISOString() }, item);
        Store.db.media.push(record);
        Store.save();
        return record;
    },

    mediaOf(projectId, kind = null) {
        return Store.db.media.filter(m => m.projectId === projectId && (!kind || m.kind === kind));
    },

    // --------------------------------------------------------
    // Matching (TЗ §54–§59)
    // --------------------------------------------------------
    contractor(id) { return Store.db.contractors.find(c => c.id === id) || null; },

    saveMatches(projectId, matches) {
        Store.db.matches = Store.db.matches.filter(m => m.projectId !== projectId);
        Store.db.invitations = Store.db.invitations.filter(i => i.projectId !== projectId);
        matches.forEach(match => {
            Store.db.matches.push(Object.assign({ id: Utils.uid('match'), projectId, createdAt: new Date().toISOString() }, match));
            Store.db.invitations.push({
                id: Utils.uid('inv'),
                projectId,
                contractorId: match.contractorId,
                matchScore: match.score,
                status: 'invited',
                passReason: null,
                sentAt: new Date().toISOString(),
                respondedAt: null
            });
        });
        Store.audit('system', 'matching.run', 'Project', projectId, `${matches.length} contractors invited`);
        Store.save();
    },

    matchesOf(projectId) {
        return Store.db.matches
            .filter(m => m.projectId === projectId)
            .sort((a, b) => b.score - a.score);
    },

    invitationsOf(projectId) {
        return Store.db.invitations.filter(i => i.projectId === projectId);
    },

    respondToInvitation(invitationId, status, passReason = null) {
        const invitation = Store.db.invitations.find(i => i.id === invitationId);
        if (!invitation) return null;
        invitation.status = status;
        invitation.passReason = passReason;
        invitation.respondedAt = new Date().toISOString();
        Store.audit('contractor', `invitation.${status}`, 'ContractorInvitation', invitationId, passReason || '');
        Store.save();
        return invitation;
    },

    // --------------------------------------------------------
    // Quotes / appointments (TЗ §61–§63)
    // --------------------------------------------------------
    addQuote(quote) {
        const record = Object.assign({
            id: Utils.uid('quote'),
            createdAt: new Date().toISOString(),
            status: 'received'
        }, quote);
        Store.db.quotes.push(record);
        Store.audit('contractor', 'quote.create', 'Quote', record.id, `${record.projectId} ${record.priceLow}-${record.priceHigh}`);
        Store.save();
        return record;
    },

    quotesOf(projectId) {
        return Store.db.quotes.filter(q => q.projectId === projectId);
    },

    addAppointment(appointment) {
        const record = Object.assign({ id: Utils.uid('appt'), status: 'requested', createdAt: new Date().toISOString() }, appointment);
        Store.db.appointments.push(record);
        Store.save();
        return record;
    },

    appointmentsOf(projectId) {
        return Store.db.appointments.filter(a => a.projectId === projectId);
    },

    // --------------------------------------------------------
    // Messaging (TЗ §64)
    // --------------------------------------------------------
    conversation(projectId, contractorId) {
        let conversation = Store.db.conversations.find(c => c.projectId === projectId && c.contractorId === contractorId);
        if (!conversation) {
            conversation = {
                id: Utils.uid('conv'),
                projectId,
                contractorId,
                createdAt: new Date().toISOString()
            };
            Store.db.conversations.push(conversation);
            Store.save();
        }
        return conversation;
    },

    // Masks phone / email / URLs until contact details may be exchanged (TЗ §64)
    maskMessage(text) {
        return String(text || '')
            .replace(/(\+?\d[\d\s().-]{7,}\d)/g, '[контакт скрыт]')
            .replace(/[^\s@]+@[^\s@]+\.[a-z]{2,}/gi, '[контакт скрыт]')
            .replace(/\b((https?:\/\/)|(www\.))\S+/gi, '[ссылка скрыта]');
    },

    addMessage(conversationId, sender, text, unmask = false) {
        const message = {
            id: Utils.uid('msg'),
            conversationId,
            sender,
            text: unmask ? text : Store.maskMessage(text),
            createdAt: new Date().toISOString()
        };
        Store.db.messages.push(message);
        Store.save();
        return message;
    },

    messagesOf(conversationId) {
        return Store.db.messages
            .filter(m => m.conversationId === conversationId)
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    },

    // --------------------------------------------------------
    // Selection, change orders, reviews (TЗ §65–§73)
    // --------------------------------------------------------
    selectContractor(projectId, contractorId, quoteId, declineReasons = {}) {
        const selection = {
            id: Utils.uid('sel'),
            projectId,
            contractorId,
            quoteId,
            declineReasons,
            createdAt: new Date().toISOString()
        };
        Store.db.selections.push(selection);
        Store.db.quotes.filter(q => q.projectId === projectId).forEach(q => {
            q.status = q.id === quoteId ? 'accepted' : 'declined';
        });
        Store.setStatus(projectId, 'contractor-selected', 'customer', `Selected ${contractorId}`);
        Store.audit('customer', 'contractor.select', 'ContractorSelection', selection.id, contractorId);
        Store.save();
        return selection;
    },

    selectionOf(projectId) {
        return Store.db.selections.find(s => s.projectId === projectId) || null;
    },

    addChangeOrder(order) {
        const record = Object.assign({ id: Utils.uid('co'), status: 'pending', createdAt: new Date().toISOString() }, order);
        Store.db.changeOrders.push(record);
        Store.audit('contractor', 'changeorder.create', 'ChangeOrder', record.id, Utils.money(record.amount));
        Store.save();
        return record;
    },

    changeOrdersOf(projectId) {
        return Store.db.changeOrders.filter(c => c.projectId === projectId);
    },

    addReview(review) {
        const record = Object.assign({
            id: Utils.uid('rev'),
            verified: true,
            createdAt: new Date().toISOString()
        }, review);
        Store.db.reviews.push(record);
        Store.audit('customer', 'review.create', 'Review', record.id, `${record.projectId} ★${record.overall}`);
        Store.save();
        return record;
    },

    reviewOf(projectId) {
        return Store.db.reviews.find(r => r.projectId === projectId) || null;
    },

    reviewsOfContractor(contractorId) {
        return Store.db.reviews.filter(r => r.contractorId === contractorId);
    },

    // --------------------------------------------------------
    // Waitlist / referrals / CSAT
    // --------------------------------------------------------
    addWaitlist(entry) {
        const record = Object.assign({ id: Utils.uid('wait'), status: 'WAITLIST', createdAt: new Date().toISOString() }, entry);
        Store.db.waitlist.push(record);
        Store.audit('system', 'waitlist.create', 'LeadSource', record.id, record.zip);
        Store.save();
        return record;
    },

    addReferral(customerId, code) {
        const record = { id: Utils.uid('ref'), customerId, code, createdAt: new Date().toISOString(), uses: 0 };
        Store.db.referrals.push(record);
        Store.save();
        return record;
    },

    addCsat(entry) {
        Store.db.csat.push(Object.assign({ id: Utils.uid('csat'), createdAt: new Date().toISOString() }, entry));
        Store.save();
    },

    // --------------------------------------------------------
    // Notifications (TЗ §89) — SMS / Email / In-App are simulated
    // --------------------------------------------------------
    notify(entry) {
        const record = Object.assign({
            id: Utils.uid('notif'),
            channels: ['in-app'],
            audience: 'customer',
            read: false,
            createdAt: new Date().toISOString()
        }, entry);
        Store.db.notifications.push(record);
        Store.save();
        return record;
    },

    notificationsFor(audience, refId = null) {
        return Store.db.notifications
            .filter(n => n.audience === audience && (!refId || n.customerId === refId || n.projectId === refId))
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },

    // --------------------------------------------------------
    // Admin tasks (TЗ §51)
    // --------------------------------------------------------
    addTask(task) {
        const record = Object.assign({
            id: Utils.uid('task'),
            status: 'open',
            createdAt: new Date().toISOString()
        }, task);
        Store.db.tasks.push(record);
        Store.audit('system', 'task.create', 'Task', record.id, record.title);
        Store.save();
        return record;
    },

    tasksOf(projectId) { return Store.db.tasks.filter(t => t.projectId === projectId); },

    // --------------------------------------------------------
    // Audit log (TЗ §96)
    // --------------------------------------------------------
    audit(actor, action, entity, entityId, details = '') {
        Store.db.auditLog.push({
            id: Utils.uid('audit'),
            at: new Date().toISOString(),
            actor,
            action,
            entity,
            entityId,
            details
        });
        if (Store.db.auditLog.length > 800) Store.db.auditLog = Store.db.auditLog.slice(-800);
    },

    auditOf(entityId) {
        return Store.db.auditLog
            .filter(a => a.entityId === entityId)
            .sort((a, b) => new Date(b.at) - new Date(a.at));
    },

    // --------------------------------------------------------
    // Draft autosave (TЗ §6, §50)
    // --------------------------------------------------------
    saveDraft(draft) {
        try {
            localStorage.setItem(Store.DRAFT_KEY, JSON.stringify(Object.assign({}, draft, {
                savedAt: new Date().toISOString()
            })));
        } catch (err) {
            console.warn('Store: draft not saved', err);
        }
    },

    getDraft() {
        try {
            const raw = localStorage.getItem(Store.DRAFT_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (err) {
            return null;
        }
    },

    clearDraft() { localStorage.removeItem(Store.DRAFT_KEY); },

    // --------------------------------------------------------
    // Demo data seeder — fills the CRM with projects across the
    // whole funnel so dashboards, SLA alerts and analytics are
    // visible without manually creating a dozen applications.
    // --------------------------------------------------------
    seedDemo() {
        const ago = hours => new Date(Date.now() - hours * 3600000).toISOString();

        const mkCustomer = (firstName, lastName, phone, email, extra = {}) => {
            const customer = Store.upsertCustomer(Object.assign({
                firstName, lastName, phone, email,
                phoneVerified: true, serviceConsent: true, language: 'ru'
            }, extra));
            return customer;
        };

        const mkProject = spec => {
            const location = Store.lookupZip(spec.zip);
            const project = {
                id: Store.nextProjectId('PA'),
                customerId: spec.customer.id,
                zip: spec.zip,
                location,
                customerType: spec.customerType || 'homeowner',
                propertyType: spec.propertyType || 'single-family',
                categories: spec.categories,
                primaryCategory: spec.categories[0],
                answers: spec.answers || {},
                description: spec.description,
                stage: spec.stage || 'getting-estimates',
                timeline: spec.timeline || '2-4-weeks',
                budgetRange: spec.budget,
                financingInterest: spec.financing || 'No',
                address: { street: spec.street, unit: '', city: location.city, state: 'PA', zip: spec.zip, county: location.county },
                contact: { firstName: spec.customer.firstName, lastName: spec.customer.lastName,
                    phone: spec.customer.phone, email: spec.customer.email, language: 'ru' },
                phoneVerified: true,
                tracking: { source: spec.source || 'Website Organic' },
                status: spec.statuses[spec.statuses.length - 1][0],
                meta: { fillSeconds: 180 + Math.floor(Math.random() * 200) },
                createdAt: ago(spec.ageHours),
                updatedAt: ago(spec.statuses[spec.statuses.length - 1][1])
            };
            Store.db.projects.push(project);
            let previous = null;
            spec.statuses.forEach(([status, hoursAgo]) => {
                Store.db.statusHistory.push({
                    id: Utils.uid('hist'), projectId: project.id,
                    from: previous, to: status, at: ago(hoursAgo), by: 'system', note: 'demo seed'
                });
                previous = status;
            });
            for (let i = 0; i < (spec.photos || 0); i++) {
                Store.db.media.push({ id: Utils.uid('media'), projectId: project.id, kind: 'photo',
                    name: `photo-${i + 1}.jpg`, size: 250000 + i * 40000, thumb: null, createdAt: ago(spec.ageHours) });
            }
            project.urgency = Engine.urgency(project);
            project.emergency = Engine.isEmergency(project);
            project.highValue = Engine.isHighValue(project);
            const lead = Engine.leadScore(project);
            const risk = Engine.riskScore(project);
            project.leadScore = lead.total;
            project.leadClass = lead.classification.label;
            project.riskLevel = risk.level;
            project.riskScore = risk.score;
            return project;
        };

        const runMatching = (project, hoursAgo, respond = false) => {
            const result = Engine.match(project);
            result.matches.forEach(match => {
                Store.db.matches.push(Object.assign({ id: Utils.uid('match'), projectId: project.id, createdAt: ago(hoursAgo) }, match));
                Store.db.invitations.push({ id: Utils.uid('inv'), projectId: project.id,
                    contractorId: match.contractorId, matchScore: match.score, status: 'invited',
                    passReason: null, sentAt: ago(hoursAgo), respondedAt: null });
            });
            project.matchedAt = ago(hoursAgo);
            if (respond) {
                Store.db.invitations.filter(i => i.projectId === project.id).forEach((invitation, index) => {
                    if (index < 3) {
                        invitation.status = 'interested';
                        invitation.respondedAt = ago(hoursAgo - 1);
                        const quote = Engine.simulateQuote(project, invitation.contractorId);
                        quote.id = Utils.uid('quote');
                        quote.status = 'received';
                        quote.createdAt = ago(hoursAgo - 2);
                        Store.db.quotes.push(quote);
                    } else {
                        invitation.status = 'passed';
                        invitation.passReason = 'Too Busy';
                        invitation.respondedAt = ago(hoursAgo - 1);
                    }
                });
            }
            return result;
        };

        const anna = mkCustomer('Анна', 'Петрова', '+1 (215) 555-0134', 'anna.demo@example.com', { leadSource: 'Facebook Ads' });
        const igor = mkCustomer('Игорь', 'Коваль', '+1 (267) 555-0188', 'igor.demo@example.com', { leadSource: 'Google Search' });
        const olga = mkCustomer('Ольга', 'Диденко', '+1 (215) 555-0421', 'olga.demo@example.com', { leadSource: 'Instagram' });
        const mark = mkCustomer('Mark', 'Stein', '+1 (610) 555-0377', 'mark.demo@example.com', { leadSource: 'Referral', customerType: 'investor' });
        const dave = mkCustomer('David', 'Rossi', '+1 (484) 555-0290', 'dave.demo@example.com', { leadSource: 'Google Ads', customerType: 'business-owner' });

        // 1. Fresh application awaiting qualification (inside SLA)
        mkProject({ customer: anna, zip: '19147', categories: ['painting'], budget: '2.5k-5k',
            description: 'Покрасить три комнаты и коридор, стены и потолки. Мелкий ремонт трещин.',
            street: '811 Fitzwater St', photos: 3, source: 'Facebook Ads', ageHours: 1,
            statuses: [['submitted', 1], ['under-review', 1]] });

        // 2. Stale under-review -> qualification SLA alert
        mkProject({ customer: igor, zip: '19111', categories: ['drywall', 'painting'], budget: '5k-10k',
            description: 'Гипсокартон в бейсменте около 600 sq ft, шпаклёвка и покраска.',
            street: '7220 Rising Sun Ave', photos: 2, source: 'Google Search', ageHours: 6,
            statuses: [['submitted', 6], ['under-review', 6]] });

        // 3. Need more information (no photos)
        mkProject({ customer: olga, zip: '19046', categories: ['flooring'], budget: 'not-sure',
            description: 'Заменить пол в гостиной.', street: '404 Cedar St', photos: 0,
            source: 'Instagram', ageHours: 30,
            statuses: [['submitted', 30], ['under-review', 29], ['need-info', 28]] }
        ).infoRequest = { reason: 'photos', reasonLabel: 'Need Photos', note: 'Добавьте фото пола',
            status: 'open', requestedAt: ago(28) };

        // 4. Qualified but never matched -> "no contractor" SLA alert
        const q = mkProject({ customer: mark, zip: '18974', categories: ['roofing'], budget: '10k-25k',
            description: 'Замена кровли на rental-доме, 1600 sq ft, есть протечка после грозы.',
            street: '55 York Rd', photos: 5, source: 'Referral', ageHours: 12, propertyType: 'multi-family',
            statuses: [['submitted', 12], ['under-review', 11], ['qualified', 10]] });
        q.qualifiedAt = ago(10);

        // 5. Invited 16h ago, nobody responded -> "no response" SLA alert
        const inv = mkProject({ customer: olga, zip: '19002', categories: ['hvac'], budget: '5k-10k',
            description: 'Замена кондиционера, система полностью не работает, дом 2 этажа.',
            street: '31 Butler Ave', photos: 2, source: 'Instagram', ageHours: 20,
            answers: { 'hvac-scope': ['Replacement'], 'hvac-emergency': 'No' },
            statuses: [['submitted', 20], ['under-review', 19], ['qualified', 18], ['matching', 17], ['contractors-invited', 16]] });
        inv.qualifiedAt = ago(18);
        runMatching(inv, 16, false);

        // 6. Kitchen with quotes on the table (customer comparing)
        const kitchen = mkProject({ customer: anna, zip: '18901', categories: ['kitchen-remodeling', 'countertops'], budget: '25k-50k',
            description: 'Полный ремонт кухни 12x14: новые кабинеты, кварцевые столешницы, backsplash, освещение.',
            street: '128 E State St', photos: 8, source: 'Facebook Ads', ageHours: 72, stage: 'ready-to-hire',
            answers: { 'kitchen-scope': ['Full Remodel', 'Cabinets', 'Countertops'], 'kitchen-size': 'Medium', 'kitchen-layout': 'No', 'kitchen-materials': 'Need help choosing' },
            statuses: [['submitted', 72], ['under-review', 71], ['qualified', 70], ['matching', 69], ['contractors-invited', 68], ['contractors-interested', 50], ['quotes-received', 46]] });
        kitchen.qualifiedAt = ago(70);
        runMatching(kitchen, 68, true);

        // 7. High-value commercial build-out -> HIGH VALUE flag + call task
        const commercial = mkProject({ customer: dave, zip: '19406', categories: ['commercial-remodeling', 'electrical', 'hvac'], budget: '100k-250k',
            description: 'Build-out ресторана 3200 sq ft в King of Prussia: кухня, зал, бар, вентиляция, электрика.',
            street: '160 N Gulph Rd', photos: 6, source: 'Google Ads', ageHours: 26,
            customerType: 'business-owner', propertyType: 'restaurant', stage: 'getting-estimates', financing: 'Yes',
            statuses: [['submitted', 26], ['under-review', 25], ['qualified', 24]] });
        commercial.qualifiedAt = ago(24);
        Store.db.tasks.push({ id: Utils.uid('task'), projectId: commercial.id, type: 'call', priority: 'High',
            title: `CALL CUSTOMER — HIGH VALUE PROJECT (${commercial.id})`, status: 'open', createdAt: ago(24) });

        // 8. Completed tile project with a verified review (closes the funnel)
        const tile = mkProject({ customer: igor, zip: '19020', categories: ['tile'], budget: '2.5k-5k',
            description: 'Плитка в ванной: пол и стены душевой, ~120 sq ft, керамогранит.',
            street: '3300 Street Rd', photos: 4, source: 'Google Search', ageHours: 340, stage: 'ready-to-hire',
            answers: { 'tile-area': ['Floor', 'Shower'], 'tile-sqft': 120, 'tile-type': 'Porcelain', 'tile-demo': 'Yes' },
            statuses: [['submitted', 340], ['under-review', 339], ['qualified', 338], ['matching', 337], ['contractors-invited', 336],
                ['contractors-interested', 320], ['quotes-received', 310], ['customer-comparing', 300], ['contractor-selected', 290],
                ['in-progress', 250], ['completed', 180], ['review-pending', 175], ['closed', 170]] });
        tile.qualifiedAt = ago(338);
        runMatching(tile, 336, true);
        const tileQuote = Store.db.quotes.find(x => x.projectId === tile.id);
        if (tileQuote) {
            tileQuote.status = 'accepted';
            Store.db.quotes.filter(x => x.projectId === tile.id && x.id !== tileQuote.id)
                .forEach(x => { x.status = 'declined'; });
            Store.db.selections.push({ id: Utils.uid('sel'), projectId: tile.id,
                contractorId: tileQuote.contractorId, quoteId: tileQuote.id,
                declineReasons: { others: 'Price' }, createdAt: ago(290) });
            tile.finalValue = Store.budgetMidpoint(tile);
            tile.progress = 100;
            tile.completionConfirmed = true;
            Store.db.reviews.push({ id: Utils.uid('rev'), projectId: tile.id, customerId: igor.id,
                contractorId: tileQuote.contractorId, quality: 5, communication: 5, timeliness: 4,
                value: 5, cleanliness: 5, overall: 5, wouldHireAgain: true,
                text: 'Сделали аккуратно и в срок, рекомендую.', verified: true, createdAt: ago(170) });
        }

        // Waitlist entry from a not-yet-served county (TЗ §8)
        Store.db.waitlist.push({ id: Utils.uid('wait'), status: 'WAITLIST', zip: '19380',
            phone: '+1 (610) 555-0912', city: 'West Chester', county: 'Chester County',
            tracking: { source: 'SEO Article' }, createdAt: ago(50) });

        [anna, igor, olga, mark, dave].forEach(c => Store.refreshCustomerStatus(c.id));
        Store.audit('admin', 'demo.seed', 'Settings', 'demo', '8 projects, 5 customers, waitlist');
        Store.save();
        return { projects: 8, customers: 5 };
    },

    // --------------------------------------------------------
    // Session (customer "account" created from phone/email, TЗ §39)
    // --------------------------------------------------------
    setSessionCustomer(customerId) {
        Store.db.session.customerId = customerId;
        Store.save();
    },

    sessionCustomer() {
        return Store.customer(Store.db.session.customerId);
    }
};

if (typeof module !== 'undefined') { module.exports = Store; }
