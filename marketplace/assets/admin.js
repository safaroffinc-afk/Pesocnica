// ============================================
// CRM / Admin Panel
// (TЗ §47–§52, §79–§92, §19 builder, §98 settings, §96 audit)
// ============================================

Store.init();

const Admin = {
    tab: 'dashboard',
    filters: { search: '', category: '', status: '', urgency: '', source: '', county: '', sort: 'newest' },

    tabs: [
        { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-line' },
        { id: 'projects', label: 'Projects', icon: 'fa-clipboard-list' },
        { id: 'customers', label: 'Customers', icon: 'fa-users' },
        { id: 'builder', label: 'Questionnaire Builder', icon: 'fa-list-check' },
        { id: 'settings', label: 'Settings', icon: 'fa-sliders' },
        { id: 'audit', label: 'Audit Log', icon: 'fa-clock-rotate-left' }
    ],

    init() { Admin.render(); },

    render() {
        document.getElementById('adminTabs').innerHTML = Admin.tabs.map(t => `
            <button class="tab-btn ${Admin.tab === t.id ? 'active' : ''}" onclick="Admin.go('${t.id}')">
                <i class="fas ${t.icon}"></i> ${t.label}</button>`).join('');
        document.getElementById('adminHost').innerHTML = Admin.views[Admin.tab]();
    },

    go(tab) { Admin.tab = tab; Admin.render(); },

    statusBadge(status) {
        const meta = Config.projectStatuses.find(x => x.value === status);
        return `<span class="badge badge-${meta ? meta.tone : 'muted'}">${meta ? meta.label : status}</span>`;
    },

    scoreBar(value, tone = null) {
        const color = tone || (value >= 80 ? 'var(--success)' : value >= 60 ? 'var(--info)' : value >= 40 ? 'var(--warning)' : 'var(--danger)');
        return `<div class="score-bar"><div class="track"><div class="fill" style="width:${value}%; background:${color}"></div></div><b>${value}</b></div>`;
    },

    // ====================================================
    // Views
    // ====================================================
    views: {
        // ---- Customer Acquisition Dashboard (TЗ §82–§86, §90–§92) ----
        dashboard() {
            const projects = Store.db.projects;
            const today = p => Utils.hoursSince(p.createdAt) <= 24;
            const reached = status => projects.filter(p => Store.historyOf(p.id).some(h => h.to === status) || p.status === status).length;
            const kpis = [
                { label: 'New Leads Today', value: projects.filter(today).length + Store.db.waitlist.filter(today).length },
                { label: 'Projects Submitted', value: projects.filter(p => p.status !== 'draft').length },
                { label: 'Verified Leads', value: projects.filter(p => p.phoneVerified).length },
                { label: 'Qualified', value: reached('qualified') },
                { label: 'Matched', value: reached('contractors-invited') },
                { label: 'Quotes Received', value: projects.filter(p => Store.quotesOf(p.id).length).length },
                { label: 'Contractors Selected', value: reached('contractor-selected') },
                { label: 'Completed', value: reached('completed') },
                { label: 'Waitlist', value: Store.db.waitlist.length }
            ];
            const funnel = Engine.funnel();
            const maxFunnel = Math.max(1, ...funnel.map(f => f.value));
            const alerts = Engine.alerts();
            const sources = Engine.sourceAnalytics();
            const tasks = Store.db.tasks.filter(t => t.status === 'open');
            return `
            ${!projects.length ? `<div class="card mb-2" style="border-color:var(--primary); margin-bottom:16px">
                <div class="flex-between">
                    <div>
                        <b><i class="fas fa-wand-magic-sparkles" style="color:var(--primary)"></i> CRM пуста</b>
                        <div class="small muted">Загрузите демо-данные: 8 проектов по всей воронке, SLA-алерты, quotes и Verified Review — или создайте заявку через <a href="intake.html">intake</a>.</div>
                    </div>
                    <button class="btn btn-primary" onclick="Admin.seedDemo()"><i class="fas fa-database"></i> Загрузить демо-данные</button>
                </div>
            </div>` : ''}
            <div class="stats-grid">
                ${kpis.map(k => `<div class="stat-card"><div class="stat-value">${k.value}</div><div class="stat-label">${k.label}</div></div>`).join('')}
                <div class="stat-card" style="border-color:var(--primary)">
                    <div class="stat-value">${Utils.money(Engine.totalProjectValue())}</div>
                    <div class="stat-label">Total Project Value Created</div>
                </div>
            </div>

            ${alerts.length ? `<div class="card" style="border-color:var(--danger)">
                <div class="card-title"><i class="fas fa-triangle-exclamation" style="color:var(--danger)"></i> SLA Alerts (${alerts.length})</div>
                ${alerts.map(a => `<div class="summary-row">
                    <span><span class="badge badge-${a.level}">${a.projectId}</span> ${Utils.escapeHtml(a.text)}</span>
                    <button class="btn btn-outline btn-sm" onclick="Admin.openProject('${a.projectId}')">Открыть</button></div>`).join('')}
            </div>` : ''}

            ${tasks.length ? `<div class="card">
                <div class="card-title"><i class="fas fa-phone-volume"></i> Call Tasks (${tasks.length})</div>
                ${tasks.map(t => `<div class="summary-row">
                    <span><span class="badge badge-danger">${t.priority}</span> ${Utils.escapeHtml(t.title)}</span>
                    <button class="btn btn-outline btn-sm" onclick="Admin.closeTask('${t.id}')">Done</button></div>`).join('')}
            </div>` : ''}

            <div class="grid-2">
                <div class="card">
                    <div class="card-title"><i class="fas fa-filter"></i> Funnel</div>
                    ${funnel.map(f => `<div class="funnel-row"><span>${f.label}</span>
                        <div class="bar"><div style="width:${Math.round((f.value / maxFunnel) * 100)}%"></div></div>
                        <b>${f.value}</b></div>`).join('')}
                </div>
                <div class="card">
                    <div class="card-title"><i class="fas fa-percent"></i> Conversion Metrics</div>
                    ${Engine.conversionRates().map(r => `<div class="summary-row"><span class="small">${r.label}</span><b>${r.value}%</b></div>`).join('')}
                </div>
            </div>

            <div class="card mt-2">
                <div class="card-title"><i class="fas fa-bullhorn"></i> Marketing Analytics по источникам</div>
                <div class="table-wrap"><table class="data-table">
                    <thead><tr><th>Source</th><th>Leads</th><th>Qualified</th><th>Matched</th><th>Jobs Awarded</th><th>Completed</th><th>Est. Value</th></tr></thead>
                    <tbody>${sources.map(s => `<tr>
                        <td>${Utils.escapeHtml(s.source)}</td><td>${s.leads}</td><td>${s.qualified}</td>
                        <td>${s.matched}</td><td>${s.awarded}</td><td>${s.completed}</td><td>${Utils.money(s.value)}</td></tr>`).join('') ||
                        '<tr><td colspan="7" class="muted">Нет данных — создайте заявку через intake</td></tr>'}</tbody>
                </table></div>
            </div>`;
        },

        // ---- Project queue (TЗ §47, §87, §88) ----
        projects() {
            const f = Admin.filters;
            let list = Store.db.projects.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            if (f.search) {
                const query = f.search.toLowerCase();
                const digits = query.replace(/\D/g, '');
                list = list.filter(p => {
                    const customer = Store.customer(p.customerId) || {};
                    return p.id.toLowerCase().includes(query) ||
                        `${customer.firstName} ${customer.lastName}`.toLowerCase().includes(query) ||
                        (digits && Utils.normalizePhone(customer.phone).includes(digits)) ||
                        ((p.address && p.address.street) || '').toLowerCase().includes(query) ||
                        p.zip.includes(query);
                });
            }
            if (f.category) list = list.filter(p => p.primaryCategory === f.category);
            if (f.status) list = list.filter(p => p.status === f.status);
            if (f.urgency) list = list.filter(p => (p.urgency || 'Low') === f.urgency);
            if (f.source) list = list.filter(p => (p.tracking && p.tracking.source) === f.source);
            if (f.county) list = list.filter(p => p.location && p.location.county === f.county);
            if (f.sort === 'score') list.sort((a, b) => (b.leadScore || 0) - (a.leadScore || 0));
            if (f.sort === 'urgency') {
                const rank = { High: 0, Medium: 1, Low: 2 };
                list.sort((a, b) => rank[a.urgency || 'Low'] - rank[b.urgency || 'Low']);
            }
            const allCategories = Config.categoryGroups.flatMap(g => g.items);
            const usedSources = Array.from(new Set(Store.db.projects.map(p => (p.tracking && p.tracking.source) || 'Unknown')));
            return `
            <div class="card">
                <div class="card-title"><i class="fas fa-inbox"></i> NEW CUSTOMER PROJECTS (${list.length})</div>
                <div class="filters-row">
                    <input class="input" id="projSearch" placeholder="Поиск: ID, имя, телефон, адрес, ZIP" value="${Utils.escapeHtml(f.search)}"
                        oninput="Admin.setSearch(this.value)">
                    <select class="input" onchange="Admin.filters.category = this.value; Admin.render()">
                        <option value="">Категория</option>
                        ${allCategories.map(c => `<option value="${c.value}" ${f.category === c.value ? 'selected' : ''}>${c.label}</option>`).join('')}
                    </select>
                    <select class="input" onchange="Admin.filters.status = this.value; Admin.render()">
                        <option value="">Статус</option>
                        ${Config.projectStatuses.map(s => `<option value="${s.value}" ${f.status === s.value ? 'selected' : ''}>${s.label}</option>`).join('')}
                    </select>
                    <select class="input" onchange="Admin.filters.urgency = this.value; Admin.render()">
                        <option value="">Urgency</option>
                        ${['High', 'Medium', 'Low'].map(u => `<option ${f.urgency === u ? 'selected' : ''}>${u}</option>`).join('')}
                    </select>
                    <select class="input" onchange="Admin.filters.county = this.value; Admin.render()">
                        <option value="">County</option>
                        ${Config.serviceAreas.map(a => `<option ${f.county === a.county ? 'selected' : ''}>${a.county}</option>`).join('')}
                    </select>
                    <select class="input" onchange="Admin.filters.source = this.value; Admin.render()">
                        <option value="">Source</option>
                        ${usedSources.map(src => `<option value="${Utils.escapeHtml(src)}" ${f.source === src ? 'selected' : ''}>${Utils.escapeHtml(src)}</option>`).join('')}
                    </select>
                    <select class="input" onchange="Admin.filters.sort = this.value; Admin.render()">
                        <option value="newest" ${f.sort === 'newest' ? 'selected' : ''}>Сначала новые</option>
                        <option value="score" ${f.sort === 'score' ? 'selected' : ''}>По Lead Score</option>
                        <option value="urgency" ${f.sort === 'urgency' ? 'selected' : ''}>По Urgency</option>
                    </select>
                </div>
                <div class="table-wrap"><table class="data-table">
                    <thead><tr>
                        <th>Project</th><th>Customer</th><th>ZIP</th><th>Category</th><th>Budget</th>
                        <th>Timeline</th><th>Фото</th><th>Lead Score</th><th>Risk</th><th>Urgency</th><th>Status</th><th>Source</th>
                    </tr></thead>
                    <tbody>${list.map(p => {
                        const customer = Store.customer(p.customerId) || {};
                        const budget = Config.budgetRanges.find(b => b.value === p.budgetRange);
                        const timeline = Config.timelineOptions.find(t => t.value === p.timeline);
                        return `<tr onclick="Admin.openProject('${p.id}')">
                            <td><b>${p.id}</b>${p.highValue ? ' <span class="badge badge-warning">HIGH VALUE</span>' : ''}${p.urgent ? ' <span class="badge badge-danger">URGENT</span>' : ''}</td>
                            <td>${Utils.escapeHtml(`${customer.firstName || ''} ${customer.lastName || ''}`)}<br><span class="small muted">${Utils.escapeHtml(customer.phone || '')}</span></td>
                            <td>${p.zip}</td>
                            <td>${Utils.escapeHtml(Engine.categoryLabel(p.primaryCategory))}</td>
                            <td>${budget ? budget.label : '—'}</td>
                            <td>${timeline ? timeline.label : '—'}</td>
                            <td>${Store.mediaOf(p.id, 'photo').length}</td>
                            <td>${Admin.scoreBar(p.leadScore || 0)}</td>
                            <td><span class="badge badge-${(p.riskLevel || '').includes('High') ? 'danger' : (p.riskLevel || '').includes('Medium') ? 'warning' : 'success'}">${(p.riskLevel || 'Risk Low').replace('Risk ', '')}</span></td>
                            <td>${p.urgency || 'Low'}</td>
                            <td>${Admin.statusBadge(p.status)}</td>
                            <td class="small muted">${Utils.escapeHtml((p.tracking && p.tracking.source) || '—')}</td>
                        </tr>`;
                    }).join('') || '<tr><td colspan="12" class="muted">Заявок нет. Создайте через <a href="intake.html">intake</a>.</td></tr>'}</tbody>
                </table></div>
            </div>

            ${Store.db.waitlist.length ? `<div class="card mt-2">
                <div class="card-title"><i class="fas fa-map-location-dot"></i> WAITLIST — регионы вне зоны запуска (${Store.db.waitlist.length})</div>
                ${Store.db.waitlist.map(w => `<div class="summary-row">
                    <span>${Utils.escapeHtml(w.phone)} · ${w.zip} ${Utils.escapeHtml(w.city || '')} (${Utils.escapeHtml(w.county || '')})</span>
                    <span class="small muted">${Utils.timeAgo(w.createdAt)}</span></div>`).join('')}
            </div>` : ''}`;
        },

        // ---- CRM Customer cards (TЗ §79–§81) ----
        customers() {
            const customers = Store.db.customers.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            return `
            <div class="card">
                <div class="card-title"><i class="fas fa-users"></i> Customers (${customers.length})</div>
                <div class="table-wrap"><table class="data-table">
                    <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Status</th><th>Source</th>
                        <th>Properties</th><th>Projects</th><th>Completed</th><th>Lifetime Value</th><th>Last Activity</th></tr></thead>
                    <tbody>${customers.map(c => {
                        const projects = Store.projectsOfCustomer(c.id);
                        const completed = projects.filter(p => ['completed', 'review-pending', 'closed'].includes(p.status));
                        return `<tr>
                            <td><b>${Utils.escapeHtml(`${c.firstName} ${c.lastName}`)}</b>
                                ${c.status === 'VIP' ? ' <span class="badge badge-warning"><i class="fas fa-crown"></i> VIP</span>' : ''}</td>
                            <td>${Utils.escapeHtml(c.phone)} ${c.phoneVerified ? '<i class="fas fa-circle-check" style="color:var(--success)"></i>' : ''}</td>
                            <td class="small">${Utils.escapeHtml(c.email || '—')}</td>
                            <td><span class="badge badge-primary">${c.status}</span></td>
                            <td class="small muted">${Utils.escapeHtml(c.leadSource || '—')}</td>
                            <td>${Store.propertiesOf(c.id).length}</td>
                            <td>${projects.length}</td>
                            <td>${completed.length}</td>
                            <td>${Utils.money(c.lifetimeValue || 0)}</td>
                            <td class="small muted">${Utils.timeAgo(c.lastActivityAt)}</td></tr>`;
                    }).join('') || '<tr><td colspan="10" class="muted">Клиентов пока нет</td></tr>'}</tbody>
                </table></div>
            </div>`;
        },

        // ---- Questionnaire Builder (TЗ §19) ----
        builder() {
            const categories = [{ value: '*', label: '— Fallback (любая категория) —' }]
                .concat(Config.categoryGroups.flatMap(g => g.items));
            const byCategory = {};
            Store.db.questions.forEach(q => {
                (byCategory[q.category] = byCategory[q.category] || []).push(q);
            });
            return `
            <div class="card">
                <div class="flex-between">
                    <div class="card-title" style="margin:0"><i class="fas fa-list-check"></i> Dynamic Questionnaire Builder</div>
                    <button class="btn btn-primary btn-sm" onclick="Admin.editQuestion(null)"><i class="fas fa-plus"></i> Новый вопрос</button>
                </div>
                <p class="small muted mt-1">Вопросы хранятся как данные, не в коде. Порядок, обязательность, условная логика (showIf) и привязка к категории настраиваются здесь без разработчика.</p>
                ${Object.entries(byCategory).map(([category, questions]) => `
                    <div class="mt-2">
                        <h4 style="font-size:0.85rem; color:var(--primary-dark)">${Utils.escapeHtml((categories.find(c => c.value === category) || { label: category }).label)}
                            <span class="badge badge-muted">${questions.length}</span></h4>
                        <div class="table-wrap"><table class="data-table">
                            <thead><tr><th style="width:80px"></th><th>Вопрос</th><th>Тип</th><th>Обяз.</th><th>Условие</th><th></th></tr></thead>
                            <tbody>${questions.sort((a, b) => (a.order || 0) - (b.order || 0)).map(q => `
                                <tr>
                                    <td><button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); Store.moveQuestion('${q.id}', -1); Admin.render()"><i class="fas fa-arrow-up"></i></button><button class="btn btn-ghost btn-sm" onclick="event.stopPropagation(); Store.moveQuestion('${q.id}', 1); Admin.render()"><i class="fas fa-arrow-down"></i></button></td>
                                    <td>${Utils.escapeHtml(q.label)}<br><span class="small muted">${(q.options || []).slice(0, 6).map(Utils.escapeHtml).join(' · ')}${(q.options || []).length > 6 ? '…' : ''}</span></td>
                                    <td><span class="badge badge-info">${q.type}</span></td>
                                    <td>${q.required ? '<i class="fas fa-check" style="color:var(--success)"></i>' : '—'}</td>
                                    <td class="small muted">${q.showIf ? Utils.escapeHtml(`если ${q.showIf.question} ${q.showIf.in ? 'in: ' + q.showIf.in.join(',') : 'not in: ' + (q.showIf.notIn || []).join(',')}`) : '—'}</td>
                                    <td><button class="btn btn-outline btn-sm" onclick="Admin.editQuestion('${q.id}')"><i class="fas fa-pen"></i></button>
                                        <button class="btn btn-outline btn-sm" onclick="Admin.deleteQuestion('${q.id}')"><i class="fas fa-trash"></i></button></td>
                                </tr>`).join('')}</tbody>
                        </table></div>
                    </div>`).join('')}
            </div>`;
        },

        // ---- Admin Settings (TЗ §98) ----
        settings() {
            const s = Store.settings;
            return `
            <div class="grid-2">
                <div class="card">
                    <div class="card-title"><i class="fas fa-map"></i> Service Areas</div>
                    ${Store.db.serviceAreas.map((a, i) => `
                        <label class="checkbox-row"><input type="checkbox" ${a.active ? 'checked' : ''}
                            onchange="Store.db.serviceAreas[${i}].active = this.checked; Store.save(); Utils.toast('Сохранено', 'success')">
                            <span>${a.county}, ${a.state}</span></label>`).join('')}
                </div>
                <div class="card">
                    <div class="card-title"><i class="fas fa-scale-balanced"></i> Lead Score Weights (сумма ~100)</div>
                    ${Object.entries(s.leadScoreWeights).map(([key, value]) => `
                        <div class="summary-row"><span class="small">${key}</span>
                            <input class="input" type="number" style="width:80px; padding:6px" value="${value}"
                                onchange="Admin.setWeight('leadScoreWeights', '${key}', this.value)"></div>`).join('')}
                </div>
                <div class="card">
                    <div class="card-title"><i class="fas fa-bullseye"></i> Match Score Weights</div>
                    ${Object.entries(s.matchWeights).map(([key, value]) => `
                        <div class="summary-row"><span class="small">${key}</span>
                            <input class="input" type="number" style="width:80px; padding:6px" value="${value}"
                                onchange="Admin.setWeight('matchWeights', '${key}', this.value)"></div>`).join('')}
                </div>
                <div class="card">
                    <div class="card-title"><i class="fas fa-gauge-high"></i> Правила и SLA</div>
                    <div class="summary-row"><span class="small">Max contractors per project</span>
                        <input class="input" type="number" style="width:80px; padding:6px" value="${s.maxContractorsPerProject}"
                            onchange="Store.updateSettings({maxContractorsPerProject: Math.max(1, Math.min(10, Number(this.value) || 5))}); Utils.toast('Сохранено', 'success')"></div>
                    <div class="summary-row"><span class="small">High Value budget threshold, $</span>
                        <input class="input" type="number" style="width:110px; padding:6px" value="${s.highValueBudgetThreshold}"
                            onchange="Store.updateSettings({highValueBudgetThreshold: Number(this.value) || 50000}); Utils.toast('Сохранено', 'success')"></div>
                    <div class="summary-row"><span class="small">Qualification SLA, часы</span>
                        <input class="input" type="number" style="width:80px; padding:6px" value="${s.sla.qualificationHours}"
                            onchange="Admin.setSla('qualificationHours', this.value)"></div>
                    <div class="summary-row"><span class="small">Matching SLA, часы</span>
                        <input class="input" type="number" style="width:80px; padding:6px" value="${s.sla.matchingHours}"
                            onchange="Admin.setSla('matchingHours', this.value)"></div>
                    <div class="summary-row"><span class="small">First response SLA, часы</span>
                        <input class="input" type="number" style="width:80px; padding:6px" value="${s.sla.firstContractorResponseHours}"
                            onchange="Admin.setSla('firstContractorResponseHours', this.value)"></div>
                    <div class="summary-row"><span class="small">No-quote alert, часы</span>
                        <input class="input" type="number" style="width:80px; padding:6px" value="${s.sla.noQuoteAlertHours}"
                            onchange="Admin.setSla('noQuoteAlertHours', this.value)"></div>
                    <div class="mt-2 flex" style="flex-wrap:wrap">
                        <button class="btn btn-outline btn-sm" onclick="Admin.seedDemo()">
                            <i class="fas fa-database"></i> Загрузить демо-данные</button>
                        <button class="btn btn-danger btn-sm" onclick="Admin.resetAll()">
                            <i class="fas fa-rotate-left"></i> Сбросить все данные</button>
                    </div>
                </div>
            </div>`;
        },

        // ---- Audit Log (TЗ §96) ----
        audit() {
            const log = Store.db.auditLog.slice().reverse().slice(0, 200);
            return `
            <div class="card">
                <div class="card-title"><i class="fas fa-clock-rotate-left"></i> Audit Log (последние ${log.length})</div>
                <div class="table-wrap"><table class="data-table">
                    <thead><tr><th>Когда</th><th>Кто</th><th>Действие</th><th>Сущность</th><th>Детали</th></tr></thead>
                    <tbody>${log.map(a => `<tr>
                        <td class="small muted">${Utils.formatDate(a.at, true)}</td>
                        <td><span class="badge badge-muted">${a.actor}</span></td>
                        <td class="small">${a.action}</td>
                        <td class="small">${a.entity} <span class="muted">${a.entityId}</span></td>
                        <td class="small muted">${Utils.escapeHtml(a.details || '')}</td></tr>`).join('') ||
                        '<tr><td colspan="5" class="muted">Пусто</td></tr>'}</tbody>
                </table></div>
            </div>`;
        }
    },

    // Re-render on search input without losing focus or the caret
    setSearch(value) {
        Admin.filters.search = value;
        clearTimeout(Admin._searchTimer);
        Admin._searchTimer = setTimeout(() => {
            Admin.render();
            const input = document.getElementById('projSearch');
            if (input) {
                input.focus();
                input.setSelectionRange(input.value.length, input.value.length);
            }
        }, 250);
    },

    async seedDemo() {
        const ok = await Utils.confirmDialog('Загрузить демо-данные?',
            'Будут созданы 8 проектов по всей воронке, 5 клиентов, quotes, SLA-алерты и один завершённый проект с Verified Review.',
            { okLabel: 'Загрузить' });
        if (!ok) return;
        const result = Store.seedDemo();
        Utils.toast(`Создано проектов: ${result.projects}, клиентов: ${result.customers}`, 'success');
        Admin.render();
    },

    async resetAll() {
        const ok = await Utils.confirmDialog('Сбросить все данные?',
            'Удалятся ВСЕ проекты, клиенты, отзывы и настройки. Действие необратимо.',
            { okLabel: 'Сбросить', danger: true });
        if (!ok) return;
        Store.reset();
        location.reload();
    },

    async deleteQuestion(questionId) {
        const question = Store.db.questions.find(q => q.id === questionId);
        const ok = await Utils.confirmDialog('Удалить вопрос?',
            question ? question.label : '', { okLabel: 'Удалить', danger: true });
        if (!ok) return;
        Store.deleteQuestion(questionId);
        Admin.render();
    },

    setWeight(group, key, value) {
        const patch = {};
        patch[group] = Object.assign({}, Store.settings[group]);
        patch[group][key] = Number(value) || 0;
        Store.updateSettings(patch);
        Utils.toast('Вес обновлён', 'success');
    },

    setSla(key, value) {
        const sla = Object.assign({}, Store.settings.sla);
        sla[key] = Number(value) || sla[key];
        Store.updateSettings({ sla });
        Utils.toast('SLA обновлён', 'success');
    },

    closeTask(taskId) {
        const task = Store.db.tasks.find(t => t.id === taskId);
        task.status = 'done';
        task.doneAt = new Date().toISOString();
        Store.save();
        Admin.render();
    },

    // ====================================================
    // Project card (TЗ §47–§49) + matching controls
    // ====================================================
    openProject(projectId) {
        const project = Store.project(projectId);
        if (!project) return;
        const customer = Store.customer(project.customerId) || {};
        const lead = Engine.leadScore(project);
        const risk = Engine.riskScore(project);
        const budget = Config.budgetRanges.find(b => b.value === project.budgetRange);
        const timeline = Config.timelineOptions.find(t => t.value === project.timeline);
        const media = Store.mediaOf(project.id);
        const matches = Store.matchesOf(project.id);
        const invitations = Store.invitationsOf(project.id);
        const quotes = Store.quotesOf(project.id);
        const sla = Engine.slaOf(project);
        const questions = Store.questionsFor(project.primaryCategory);
        const duplicate = lead.duplicateOf;

        const host = document.getElementById('modalHost');
        host.innerHTML = `
        <div class="modal-backdrop" onclick="if(event.target===this) Admin.closeModal()">
            <div class="modal">
                <div class="modal-header">
                    <div>
                        <h3>${project.id} ${Admin.statusBadge(project.status)}
                            ${project.highValue ? '<span class="badge badge-warning">HIGH VALUE</span>' : ''}
                            ${project.urgent ? '<span class="badge badge-danger">URGENT</span>' : ''}</h3>
                        <span class="small muted">${Utils.escapeHtml(Engine.categoryLabel(project.primaryCategory))} ·
                            ${Utils.escapeHtml(project.location ? `${project.location.city}, ${project.location.county}` : project.zip)} ·
                            создано ${Utils.timeAgo(project.createdAt)} · source: ${Utils.escapeHtml((project.tracking && project.tracking.source) || '—')}</span>
                    </div>
                    <button class="modal-close" onclick="Admin.closeModal()"><i class="fas fa-xmark"></i></button>
                </div>

                <!-- Admin Actions (TЗ §48) -->
                <div class="chip-row">
                    <button class="btn btn-success btn-sm" onclick="Admin.approve('${project.id}')"><i class="fas fa-check"></i> Approve</button>
                    <button class="btn btn-outline btn-sm" onclick="Admin.requestInfo('${project.id}')"><i class="fas fa-circle-question"></i> Request Information</button>
                    <button class="btn btn-outline btn-sm" onclick="Admin.editProject('${project.id}')"><i class="fas fa-pen"></i> Edit</button>
                    <button class="btn btn-primary btn-sm" onclick="Admin.sendToMatching('${project.id}')"><i class="fas fa-paper-plane"></i> Send to Matching</button>
                    <button class="btn btn-outline btn-sm" onclick="Admin.markStatus('${project.id}', 'cancelled', 'Rejected by admin')"><i class="fas fa-ban"></i> Reject</button>
                    ${duplicate ? `<button class="btn btn-outline btn-sm" onclick="Admin.markStatus('${project.id}', 'closed', 'Duplicate of ${duplicate}')"><i class="fas fa-clone"></i> Duplicate (${duplicate})</button>` : ''}
                    <button class="btn btn-danger btn-sm" onclick="Admin.markSpam('${project.id}')"><i class="fas fa-shield-virus"></i> Spam</button>
                </div>

                <div class="grid-2 mt-2">
                    <div>
                        <div class="card-title"><i class="fas fa-user"></i> Customer</div>
                        <div class="summary-row"><span class="label">Имя</span><span class="value">${Utils.escapeHtml(`${customer.firstName || ''} ${customer.lastName || ''}`)}</span></div>
                        <div class="summary-row"><span class="label">Phone</span><span class="value">${Utils.escapeHtml(customer.phone || '—')}
                            ${project.phoneVerified ? '<span class="badge badge-success">VERIFIED</span>' : '<span class="badge badge-warning">NOT VERIFIED</span>'}</span></div>
                        <div class="summary-row"><span class="label">Email</span><span class="value">${Utils.escapeHtml(customer.email || '—')}</span></div>
                        <div class="summary-row"><span class="label">Тип</span><span class="value">${Utils.escapeHtml(project.customerType || '—')} · ${Utils.escapeHtml(project.propertyType || '—')}</span></div>
                        <div class="summary-row"><span class="label">Адрес</span><span class="value">${Utils.escapeHtml(project.address ? `${project.address.street}${project.address.unit ? ' ' + project.address.unit : ''}, ${project.address.city}, PA ${project.address.zip}` : '—')}</span></div>
                        <div class="summary-row"><span class="label">Budget / Timeline</span><span class="value">${budget ? budget.label : '—'} · ${timeline ? timeline.label : '—'}</span></div>
                        <div class="summary-row"><span class="label">Financing</span><span class="value">${project.financingInterest || '—'}</span></div>
                        <div class="summary-row"><span class="label">Urgency</span><span class="value">${project.urgency || 'Low'}${project.emergency ? ' · EMERGENCY' : ''}</span></div>

                        <div class="card-title mt-2"><i class="fas fa-align-left"></i> Описание</div>
                        <div class="small">${Utils.escapeHtml(project.description || '—')}</div>

                        <div class="card-title mt-2"><i class="fas fa-list"></i> Ответы анкеты</div>
                        ${Object.entries(project.answers || {}).map(([id, value]) => {
                            const q = questions.find(x => x.id === id) || Store.db.questions.find(x => x.id === id);
                            return `<div class="summary-row"><span class="label small">${Utils.escapeHtml(q ? q.label : id)}</span>
                                <span class="value small">${Utils.escapeHtml(Array.isArray(value) ? value.join(', ') : String(value))}</span></div>`;
                        }).join('') || '<div class="muted small">Нет ответов</div>'}

                        ${media.length ? `<div class="card-title mt-2"><i class="fas fa-images"></i> Media (${media.length})</div>
                        <div class="media-grid">${media.map(m => `
                            <div class="media-thumb">${m.thumb ? `<img src="${m.thumb}">` : `<i class="fas ${m.kind === 'video' ? 'fa-film' : m.kind === 'document' ? 'fa-file-pdf' : 'fa-image'}"></i>`}
                            <span class="kind-tag">${Utils.fileSize(m.size)}</span></div>`).join('')}</div>` : ''}
                    </div>

                    <div>
                        <div class="card-title"><i class="fas fa-star-half-stroke"></i> Lead Quality Score</div>
                        ${Admin.scoreBar(lead.total)}
                        <span class="badge badge-${lead.classification.tone} mt-1">${lead.classification.label}</span>
                        <div class="mt-1">${lead.breakdown.map(b => `
                            <div class="summary-row"><span class="small">${b.label}</span><span class="small"><b>${b.points}</b>/${b.max}</span></div>`).join('')}</div>

                        <div class="card-title mt-2"><i class="fas fa-shield-halved"></i> Fraud & Spam</div>
                        <span class="badge badge-${risk.level === 'Risk High' ? 'danger' : risk.level === 'Risk Medium' ? 'warning' : 'success'}">${risk.level} (${risk.score})</span>
                        ${risk.flags.length ? `<ul class="small mt-1" style="margin-left:18px">${risk.flags.map(f => `<li>${Utils.escapeHtml(f.label)}</li>`).join('')}</ul>`
                            : '<div class="small muted mt-1">Флагов нет</div>'}

                        <div class="card-title mt-2"><i class="fas fa-stopwatch"></i> Lead Response SLA</div>
                        <div class="summary-row"><span class="small">Time to Qualification</span><b class="small">${sla.timeToQualification ?? '—'} ч</b></div>
                        <div class="summary-row"><span class="small">Time to Match</span><b class="small">${sla.timeToMatch ?? '—'} ч</b></div>
                        <div class="summary-row"><span class="small">Time to First Interest</span><b class="small">${sla.timeToFirstInterest ?? '—'} ч</b></div>
                        <div class="summary-row"><span class="small">Time to First Quote</span><b class="small">${sla.timeToFirstQuote ?? '—'} ч</b></div>

                        <div class="card-title mt-2"><i class="fas fa-people-arrows"></i> Matching (${matches.length})</div>
                        ${matches.length ? matches.map(m => {
                            const contractor = Store.contractor(m.contractorId);
                            const invitation = invitations.find(i => i.contractorId === m.contractorId) || {};
                            const quote = quotes.find(q => q.contractorId === m.contractorId);
                            return `<div class="summary-row"><span class="small">
                                <b>${Utils.escapeHtml(contractor.company)}</b> · ${m.distance ?? '—'} mi
                                <span class="badge badge-${invitation.status === 'interested' ? 'info' : invitation.status === 'passed' ? 'muted' : 'primary'}">${invitation.status || 'invited'}${invitation.passReason ? ': ' + invitation.passReason : ''}</span>
                                ${quote ? `<span class="badge badge-success">${Utils.money(quote.priceLow)}</span>` : ''}</span>
                                <b class="small">${m.score}%</b></div>`;
                        }).join('') : '<div class="small muted">Подбор ещё не запускался</div>'}
                        ${matches.length && invitations.some(i => !i.respondedAt) ? `
                            <button class="btn btn-outline btn-sm mt-1" onclick="Admin.simulateResponses('${project.id}')">
                                <i class="fas fa-bolt"></i> Симулировать ответы мастеров (демо)</button>` : ''}

                        <div class="card-title mt-2"><i class="fas fa-clock-rotate-left"></i> История</div>
                        <ul class="timeline">${Store.historyOf(project.id).map(h => `
                            <li><b>${h.to}</b> <span class="small muted">by ${h.by}</span>${h.note ? ` — <span class="small">${Utils.escapeHtml(h.note)}</span>` : ''}
                            <span class="when">${Utils.formatDate(h.at, true)}</span></li>`).join('')}</ul>
                    </div>
                </div>
            </div>
        </div>`;
    },

    closeModal() { document.getElementById('modalHost').innerHTML = ''; },

    refreshScores(projectId) {
        const project = Store.project(projectId);
        const lead = Engine.leadScore(project);
        const risk = Engine.riskScore(project);
        Store.updateProject(projectId, {
            leadScore: lead.total, leadClass: lead.classification.label,
            riskScore: risk.score, riskLevel: risk.level,
            urgency: Engine.urgency(project), highValue: Engine.isHighValue(project)
        }, 'system', 'Scores recomputed');
    },

    approve(projectId) {
        Admin.refreshScores(projectId);
        Store.setStatus(projectId, 'qualified', 'admin', 'Approved by admin');
        Store.updateProject(projectId, { qualifiedAt: new Date().toISOString() }, 'admin', 'Qualified');
        Utils.toast('Заявка квалифицирована', 'success');
        Admin.renderBehindModal(projectId);
    },

    async requestInfo(projectId) {
        const result = await Utils.dialog({
            title: 'Request More Information',
            message: 'Клиент получит SMS, Email и In-App уведомление.',
            okLabel: 'Отправить запрос',
            fields: [
                { key: 'reason', type: 'chips', label: 'Что запросить?', required: true,
                  options: Config.infoRequestReasons },
                { key: 'note', type: 'textarea', label: 'Комментарий для клиента (необязательно)' }
            ]
        });
        if (result === null) return;
        const reason = Config.infoRequestReasons.find(r => r.value === result.reason);
        const note = result.note || '';
        const project = Store.project(projectId);
        Store.updateProject(projectId, {
            infoRequest: { reason: reason.value, reasonLabel: reason.label, note, status: 'open', requestedAt: new Date().toISOString() }
        }, 'admin', `Requested: ${reason.label}`);
        Store.setStatus(projectId, 'need-info', 'admin', reason.label);
        // Client is notified over SMS + Email + In-App (TЗ §49)
        Store.notify({ audience: 'customer', customerId: project.customerId, projectId,
            channels: ['sms', 'email', 'in-app'], event: 'need-info',
            text: `По заявке ${projectId} нужна информация: ${reason.label}. ${note}` });
        Utils.toast('Запрос отправлен клиенту (SMS + Email + In-App)', 'success');
        Admin.renderBehindModal(projectId);
    },

    async editProject(projectId) {
        const project = Store.project(projectId);
        const budgetOptions = Config.budgetRanges.map(b => ({ value: b.value, label: b.label }));
        const result = await Utils.dialog({
            title: `Edit — ${projectId}`,
            okLabel: 'Сохранить',
            fields: [
                { key: 'description', type: 'textarea', label: 'Описание проекта', value: project.description, required: true },
                { key: 'budgetRange', type: 'select', label: 'Бюджет', options: budgetOptions, value: project.budgetRange },
                { key: 'timeline', type: 'select', label: 'Сроки',
                  options: Config.timelineOptions.map(t => ({ value: t.value, label: t.label })), value: project.timeline }
            ]
        });
        if (result === null) return;
        Store.updateProject(projectId, {
            description: result.description,
            budgetRange: result.budgetRange,
            timeline: result.timeline
        }, 'admin', 'Manual edit');
        Admin.refreshScores(projectId);
        Admin.openProject(projectId);
    },

    markStatus(projectId, status, note) {
        Store.setStatus(projectId, status, 'admin', note);
        Utils.toast(note, 'info');
        Admin.renderBehindModal(projectId);
    },

    async markSpam(projectId) {
        const ok = await Utils.confirmDialog('Пометить как спам?',
            'Заявка будет отменена, а клиент заблокирован (Customer Status: Blocked).',
            { okLabel: 'Spam + Block', danger: true });
        if (!ok) return;
        const project = Store.project(projectId);
        Store.setStatus(projectId, 'cancelled', 'admin', 'Marked as spam');
        const customer = Store.customer(project.customerId);
        if (customer) { customer.status = 'Blocked'; Store.save(); }
        Store.audit('admin', 'customer.block', 'Customer', project.customerId, 'Spam');
        Admin.closeModal();
        Admin.render();
    },

    // Matching Engine trigger (TЗ §54–§58)
    async sendToMatching(projectId) {
        const project = Store.project(projectId);
        if (!Store.historyOf(projectId).some(h => h.to === 'qualified')) {
            const ok = await Utils.confirmDialog('Заявка не квалифицирована',
                'Обычно перед Matching заявку нужно квалифицировать (Approve). Всё равно отправить?',
                { okLabel: 'Отправить в Matching' });
            if (!ok) return;
        }
        Store.setStatus(projectId, 'matching', 'admin', 'Sent to Matching Engine');
        const result = Engine.match(project);
        const min = Store.settings.minContractorsPerProject;
        if (!result.matches.length) {
            Store.setStatus(projectId, 'qualified', 'system', 'Matching: no contractors passed hard filters');
            Utils.toast('Ни один подрядчик не прошёл hard filters', 'danger');
            Admin.renderBehindModal(projectId);
            return;
        }
        Store.saveMatches(projectId, result.matches);
        Store.updateProject(projectId, { matchedAt: new Date().toISOString() }, 'system', 'Matched');
        Store.setStatus(projectId, 'contractors-invited', 'system',
            `${result.matches.length} contractors invited (of ${result.available} eligible)`);
        Store.notify({ audience: 'customer', customerId: project.customerId, projectId,
            channels: ['sms', 'in-app'], event: 'matched',
            text: `Мы нашли подходящих специалистов по заявке ${projectId} — смотрите в кабинете.` });
        if (result.matches.length < min) {
            Store.notify({ audience: 'admin', projectId, event: 'thin-match',
                text: `Внимание: только ${result.matches.length} подрядчик(а) по ${projectId} (минимум ${min}).` });
        }
        Utils.toast(`Приглашено подрядчиков: ${result.matches.length}`, 'success');
        Admin.renderBehindModal(projectId);
    },

    // Demo helper: play the contractor side so the customer flow can continue
    simulateResponses(projectId) {
        const project = Store.project(projectId);
        const invitations = Store.invitationsOf(projectId).filter(i => i.status === 'invited');
        let interested = 0;
        invitations.forEach((invitation, index) => {
            const roll = Engine.hash(projectId + invitation.contractorId + 'resp');
            if (roll < 0.7 || (index === invitations.length - 1 && !interested)) {
                Store.respondToInvitation(invitation.id, 'interested');
                interested += 1;
                const quote = Engine.simulateQuote(project, invitation.contractorId);
                Store.addQuote(quote);
                Store.notify({ audience: 'customer', customerId: project.customerId, projectId,
                    channels: ['sms', 'in-app'], event: 'new-quote',
                    text: `NEW ESTIMATE RECEIVED: ${Store.contractor(invitation.contractorId).company}.` });
            } else {
                const reasons = Config.passReasons;
                Store.respondToInvitation(invitation.id, 'passed', reasons[Math.floor(roll * reasons.length)]);
            }
        });
        if (interested) Store.setStatus(projectId, 'quotes-received', 'system', `${interested} quotes received`);
        Utils.toast(`Ответили: ${interested} interested, ${invitations.length - interested} passed`, 'success');
        Admin.renderBehindModal(projectId);
    },

    // Re-render the page behind the modal, then re-open the project card
    renderBehindModal(projectId = null) {
        Admin.render();
        if (projectId) Admin.openProject(projectId);
    },

    // ====================================================
    // Questionnaire builder editor (TЗ §19)
    // ====================================================
    editQuestion(questionId) {
        const question = questionId ? Store.db.questions.find(q => q.id === questionId) : null;
        const categories = [{ value: '*', label: '— Fallback —' }].concat(Config.categoryGroups.flatMap(g => g.items));
        const host = document.getElementById('modalHost');
        host.innerHTML = `
        <div class="modal-backdrop" onclick="if(event.target===this) Admin.closeModal()">
            <div class="modal modal-sm">
                <div class="modal-header">
                    <h3>${question ? 'Редактировать вопрос' : 'Новый вопрос'}</h3>
                    <button class="modal-close" onclick="Admin.closeModal()"><i class="fas fa-xmark"></i></button>
                </div>
                <div class="field"><label>Текст вопроса *</label>
                    <input class="input" id="qLabel" value="${question ? Utils.escapeHtml(question.label) : ''}"></div>
                <div class="field"><label>Категория *</label>
                    <select class="input" id="qCategory">
                        ${categories.map(c => `<option value="${c.value}" ${question && question.category === c.value ? 'selected' : ''}>${c.label}</option>`).join('')}
                    </select></div>
                <div class="field"><label>Тип поля *</label>
                    <select class="input" id="qType">
                        ${Config.questionFieldTypes.map(t => `<option ${question && question.type === t ? 'selected' : ''}>${t}</option>`).join('')}
                    </select></div>
                <div class="field"><label>Варианты (через запятую, для select/radio/multiselect)</label>
                    <input class="input" id="qOptions" value="${question && question.options ? Utils.escapeHtml(question.options.join(', ')) : ''}"></div>
                <label class="checkbox-row"><input type="checkbox" id="qRequired" ${question && question.required ? 'checked' : ''}><span>Обязательный вопрос</span></label>
                <div class="field"><label>Conditional logic (необязательно)</label>
                    <input class="input" id="qShowIfQ" placeholder="id вопроса-условия" value="${question && question.showIf ? Utils.escapeHtml(question.showIf.question) : ''}">
                    <input class="input mt-1" id="qShowIfIn" placeholder="показывать если ответ входит в: A, B" value="${question && question.showIf && question.showIf.in ? Utils.escapeHtml(question.showIf.in.join(', ')) : ''}">
                    <div class="hint">Оставьте пустым, если вопрос показывается всегда.</div></div>
                <button class="btn btn-primary btn-block" onclick="Admin.saveQuestion('${questionId || ''}')">Сохранить</button>
            </div>
        </div>`;
    },

    saveQuestion(questionId) {
        const label = document.getElementById('qLabel').value.trim();
        if (!label) return Utils.toast('Укажите текст вопроса', 'danger');
        const category = document.getElementById('qCategory').value;
        const type = document.getElementById('qType').value;
        const options = document.getElementById('qOptions').value.split(',').map(s => s.trim()).filter(Boolean);
        const showIfQ = document.getElementById('qShowIfQ').value.trim();
        const showIfIn = document.getElementById('qShowIfIn').value.split(',').map(s => s.trim()).filter(Boolean);
        const existing = questionId ? Store.db.questions.find(q => q.id === questionId) : null;
        const siblings = Store.db.questions.filter(q => q.category === category);
        const question = {
            id: questionId || Utils.uid('q'),
            category, type, label,
            required: document.getElementById('qRequired').checked,
            options: options.length ? options : undefined,
            order: existing ? existing.order : Math.max(0, ...siblings.map(q => q.order || 0)) + 1,
            showIf: showIfQ && showIfIn.length ? { question: showIfQ, in: showIfIn } : undefined
        };
        Store.saveQuestion(question);
        Admin.closeModal();
        Admin.render();
        Utils.toast('Вопрос сохранён', 'success');
    }
};

document.addEventListener('DOMContentLoaded', Admin.init);
