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
