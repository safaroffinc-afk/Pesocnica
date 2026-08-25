// ============================================
// Customer Dashboard (TЗ §40, §60–§76)
// ============================================

Store.init();

const Dash = {
    activeProjectId: null,

    statusBadge(status) {
        const meta = Config.projectStatuses.find(x => x.value === status);
        return `<span class="badge badge-${meta ? meta.tone : 'muted'}">${meta ? meta.label : status}</span>`;
    },

    stars(rating) {
        const full = Math.round(rating);
        return `<span class="stars">${'★'.repeat(full)}${'☆'.repeat(5 - full)}</span> <span class="small muted">${rating}</span>`;
    },

    init() {
        Dash.render();
    },

    render() {
        const host = document.getElementById('dashHost');
        const customer = Store.sessionCustomer();
        if (!customer) {
            host.innerHTML = `
                <div class="empty-state card">
                    <i class="fas fa-user-slash"></i>
                    <h3>Вы ещё не создавали заявку</h3>
                    <p class="muted small">Кабинет создаётся автоматически после отправки первой заявки.</p>
                    <a class="btn btn-primary mt-2" href="intake.html">Начать заявку</a>
                </div>`;
            return;
        }
        const projects = Store.projectsOfCustomer(customer.id);
        const notifications = Store.notificationsFor('customer', customer.id).slice(0, 6);
        if (!Dash.activeProjectId && projects.length) Dash.activeProjectId = projects[0].id;
        const active = Store.project(Dash.activeProjectId);

        host.innerHTML = `
            <div class="flex-between">
                <div>
                    <h2>Здравствуйте, ${Utils.escapeHtml(customer.firstName)}!</h2>
                    <span class="small muted">${Utils.escapeHtml(customer.phone)} ·
                        ${customer.phoneVerified ? '<span class="badge badge-success">PHONE VERIFIED</span>' : ''}
                        <span class="badge badge-primary">${Utils.escapeHtml(customer.status)}</span></span>
                </div>
                <a class="btn btn-primary" href="intake.html"><i class="fas fa-plus"></i> START ANOTHER PROJECT</a>
            </div>

            <div class="card mt-2">
                <div class="card-title"><i class="fas fa-folder-open"></i> My Projects</div>
                <div class="chip-row">
                    ${projects.map(p => `
                        <button class="chip ${p.id === Dash.activeProjectId ? 'selected' : ''}"
                            onclick="Dash.open('${p.id}')">${p.id} · ${Utils.escapeHtml(Engine.categoryLabel(p.primaryCategory))}</button>`).join('') ||
                        '<span class="muted small">Заявок пока нет</span>'}
                </div>
            </div>

            ${active ? Dash.renderProject(active) : ''}

            <div class="grid-2 mt-2">
                <div class="card">
                    <div class="card-title"><i class="fas fa-bell"></i> Notifications</div>
                    ${notifications.length ? notifications.map(n => `
                        <div class="summary-row"><span class="small">${Utils.escapeHtml(n.text)}</span>
                        <span class="small muted">${Utils.timeAgo(n.createdAt)}</span></div>`).join('')
                        : '<div class="muted small">Пока пусто</div>'}
                </div>
                <div class="card">
                    <div class="card-title"><i class="fas fa-gift"></i> Пригласите друга</div>
                    <p class="small muted">Отправьте другу ваш реферальный код — после его первого завершённого проекта вы получите бонус.</p>
                    <div class="otp-demo-code">${customer.referralCode}</div>
                    <div class="mt-1"><button class="btn btn-outline btn-sm"
                        onclick="navigator.clipboard && navigator.clipboard.writeText('${customer.referralCode}'); Utils.toast('Код скопирован', 'success')">
                        <i class="fas fa-copy"></i> Скопировать</button></div>
                    <div class="card-title mt-2"><i class="fas fa-house"></i> Saved Properties</div>
                    ${Store.propertiesOf(customer.id).map(p => `
                        <div class="small">${Utils.escapeHtml(`${p.street}${p.unit ? ' ' + p.unit : ''}, ${p.city}, ${p.state} ${p.zip}`)}</div>`).join('') ||
                        '<div class="muted small">Нет сохранённых объектов</div>'}
                </div>
            </div>`;
    },

    open(projectId) {
        Dash.activeProjectId = projectId;
        Dash.render();
    },

    // ----------------------------------------------------
    // Project detail: state machine drives which panel shows
    // ----------------------------------------------------
    renderProject(project) {
        const timelineOption = Config.timelineOptions.find(t => t.value === project.timeline);
        const budget = Config.budgetRanges.find(b => b.value === project.budgetRange);
        const history = Store.historyOf(project.id);
        return `
        <div class="card mt-2">
            <div class="flex-between">
                <div class="card-title" style="margin:0"><i class="fas fa-clipboard-list"></i> ${project.id}</div>
                ${Dash.statusBadge(project.status)}
            </div>
            <div class="match-meta mt-1">
                <span><i class="fas fa-location-dot"></i>${Utils.escapeHtml(project.location ? project.location.city : project.zip)}</span>
                <span><i class="fas fa-tag"></i>${Utils.escapeHtml(project.categories.map(Engine.categoryLabel).join(', '))}</span>
                <span><i class="fas fa-sack-dollar"></i>${budget ? budget.label : '—'}</span>
                <span><i class="fas fa-calendar"></i>${timelineOption ? timelineOption.label : '—'}</span>
            </div>
            ${Dash.renderStagePanel(project)}
            <details class="mt-2">
                <summary class="small muted" style="cursor:pointer">История статусов</summary>
                <ul class="timeline mt-1">
                    ${history.map(h => `<li><b>${h.to}</b> ${h.note ? `— ${Utils.escapeHtml(h.note)}` : ''}<span class="when">${Utils.formatDate(h.at, true)}</span></li>`).join('')}
                </ul>
            </details>
        </div>`;
    },

    renderStagePanel(project) {
        const status = project.status;
        if (['submitted', 'under-review', 'phone-verification'].includes(status)) {
            return `<div class="ai-panel mt-2"><b><i class="fas fa-hourglass-half"></i> Заявка на проверке.</b>
                Обычно квалификация занимает до ${Store.settings.sla.qualificationHours} часов. Мы пришлём SMS, когда подберём мастеров.</div>`;
        }
        if (status === 'need-info') {
            const request = project.infoRequest || {};
            return `<div class="ai-panel mt-2" style="border-color:var(--warning); background:var(--warning-bg)">
                <b><i class="fas fa-circle-question"></i> Нужна дополнительная информация:</b>
                ${Utils.escapeHtml(request.reasonLabel || '')} ${request.note ? '— ' + Utils.escapeHtml(request.note) : ''}
                <div class="mt-1"><a class="btn btn-primary btn-sm" href="intake.html">Дополнить заявку</a></div></div>`;
        }
        if (status === 'qualified' || status === 'matching') {
            return `<div class="ai-panel mt-2"><b><i class="fas fa-magnifying-glass"></i> Идёт подбор специалистов…</b></div>`;
        }
        if (['contractors-invited', 'contractors-interested', 'quotes-received', 'customer-comparing', 'site-visit'].includes(status)) {
            return Dash.renderMatches(project) + Dash.renderQuotes(project);
        }
        if (['contractor-selected', 'scheduled'].includes(status)) {
            return Dash.renderSelected(project);
        }
        if (status === 'in-progress') {
            return Dash.renderSelected(project) + Dash.renderProgress(project);
        }
        if (['completed', 'review-pending'].includes(status)) {
            return Dash.renderReviewBlock(project);
        }
        if (status === 'closed') {
            const review = Store.reviewOf(project.id);
            return `<div class="ai-panel mt-2" style="border-color:var(--success); background:var(--success-bg)">
                <b><i class="fas fa-circle-check"></i> Проект завершён.</b>
                ${review ? `Ваш Verified Review: ${'★'.repeat(review.overall)}` : ''}</div>`;
        }
        return '';
    },

    // --- Matches & quotes (TЗ §60–§63) ---
    renderMatches(project) {
        const matches = Store.matchesOf(project.id);
        const invitations = Store.invitationsOf(project.id);
        if (!matches.length) return '';
        return `
        <div class="mt-2">
            <div class="card-title"><i class="fas fa-users"></i> Мы нашли подходящих специалистов</div>
            ${matches.map(match => {
                const contractor = Store.contractor(match.contractorId);
                const invitation = invitations.find(i => i.contractorId === match.contractorId);
                const reviews = Store.reviewsOfContractor(contractor.id);
                const interested = invitation && invitation.status === 'interested';
                const passed = invitation && invitation.status === 'passed';
                return `
                <div class="match-card" ${passed ? 'style="opacity:0.5"' : ''}>
                    <div class="match-avatar">${Utils.initials(contractor.company)}</div>
                    <div class="match-body">
                        <b>${Utils.escapeHtml(contractor.company)}</b>
                        ${contractor.verification.verified ? '<span class="badge badge-success"><i class="fas fa-shield-halved"></i> Verified</span>' : ''}
                        ${interested ? '<span class="badge badge-info">INTERESTED</span>' : ''}
                        ${passed ? '<span class="badge badge-muted">PASSED</span>' : ''}
                        <div class="match-meta">
                            <span><i class="fas fa-award"></i>Trust ${contractor.trustScore}</span>
                            <span>${Dash.stars(contractor.rating)} (${contractor.reviewsCount + reviews.length})</span>
                            <span><i class="fas fa-check-double"></i>${contractor.completedProjects} проектов</span>
                            <span><i class="fas fa-route"></i>${match.distance !== null ? match.distance + ' mi' : '—'}</span>
                            <span><i class="fas fa-images"></i>Portfolio: ${contractor.portfolioProjects}</span>
                        </div>
                        <div class="small muted mt-1">${contractor.specialties.map(Utils.escapeHtml).join(' · ')}</div>
                    </div>
                    <div class="match-actions">
                        <span class="badge badge-primary" style="justify-content:center">Match ${match.score}%</span>
                        ${!passed ? `<button class="btn btn-outline btn-sm" onclick="Dash.openChat('${project.id}', '${contractor.id}')"><i class="fas fa-comments"></i> Message</button>
                        <button class="btn btn-outline btn-sm" onclick="Dash.requestVisit('${project.id}', '${contractor.id}')"><i class="fas fa-calendar-check"></i> Site Visit</button>` : ''}
                    </div>
                </div>`;
            }).join('')}
        </div>`;
    },

    renderQuotes(project) {
        const quotes = Store.quotesOf(project.id).filter(q => q.status !== 'declined');
        if (!quotes.length) {
            return `<div class="ai-panel mt-2"><i class="fas fa-hourglass-half"></i> Ожидаем сметы от заинтересованных мастеров. Мы пришлём уведомление: <b>NEW ESTIMATE RECEIVED</b>.</div>`;
        }
        const cheapest = Math.min(...quotes.map(q => q.priceLow));
        return `
        <div class="mt-2">
            <div class="card-title"><i class="fas fa-file-invoice-dollar"></i> Quote Comparison (${quotes.length})</div>
            <div class="quote-grid">
                ${quotes.map(q => {
                    const contractor = Store.contractor(q.contractorId);
                    return `
                    <div class="quote-card ${q.priceLow === cheapest ? 'best' : ''}">
                        <div class="flex-between"><b>${Utils.escapeHtml(contractor.company)}</b>
                            ${q.priceLow === cheapest ? '<span class="badge badge-success">Лучшая цена</span>' : ''}</div>
                        <div class="quote-price">${Utils.money(q.priceLow)}<span class="small muted"> – ${Utils.money(q.priceHigh)}</span></div>
                        <div class="quote-line"><span>Start Date</span><b>${Utils.formatDate(q.startDate)}</b></div>
                        <div class="quote-line"><span>Duration</span><b>${q.durationDays} дней</b></div>
                        <div class="quote-line"><span>Materials</span><b>${q.materialsIncluded ? 'Included' : 'Not included'}</b></div>
                        <div class="quote-line"><span>Warranty</span><b>${q.warrantyMonths} мес</b></div>
                        <div class="quote-line"><span>Trust / Rating</span><b>${contractor.trustScore} · ★${contractor.rating}</b></div>
                        <div class="quote-line"><span>Verified Projects</span><b>${contractor.completedProjects}</b></div>
                        <button class="btn btn-primary btn-sm mt-1" onclick="Dash.select('${project.id}', '${contractor.id}', '${q.id}')">
                            SELECT CONTRACTOR</button>
                    </div>`;
                }).join('')}
            </div>
        </div>`;
    },

    // --- Selection (TЗ §65, §66) ---
    select(projectId, contractorId, quoteId) {
        const contractor = Store.contractor(contractorId);
        if (!confirm(`Вы уверены, что хотите выбрать этого подрядчика?\n\n${contractor.company}`)) return;
        const reason = prompt('Почему не подошли остальные? (необязательно)\nPrice / Availability / Reviews / Communication / Experience / Other', '');
        Store.selectContractor(projectId, contractorId, quoteId, reason ? { others: reason } : {});
        Store.notify({ audience: 'customer', customerId: Store.project(projectId).customerId, projectId,
            channels: ['sms', 'in-app'], event: 'contractor-selected',
            text: `Вы выбрали ${contractor.company}. Подрядчик получил полный адрес и контакты.` });
        Utils.toast('Подрядчик выбран!', 'success');
        Dash.render();
    },

    renderSelected(project) {
        const selection = Store.selectionOf(project.id);
        if (!selection) return '';
        const contractor = Store.contractor(selection.contractorId);
        const quote = Store.db.quotes.find(q => q.id === selection.quoteId);
        const changeOrders = Store.changeOrdersOf(project.id);
        return `
        <div class="ai-panel mt-2" style="border-color:var(--success); background:var(--success-bg)">
            <b><i class="fas fa-handshake"></i> Ваш подрядчик: ${Utils.escapeHtml(contractor.company)}</b><br>
            <span class="small">Смета: ${quote ? `${Utils.money(quote.priceLow)} – ${Utils.money(quote.priceHigh)}` : '—'} ·
                Начало: ${quote ? Utils.formatDate(quote.startDate) : '—'}</span>
            <div class="mt-1 flex" style="flex-wrap:wrap">
                <button class="btn btn-outline btn-sm" onclick="Dash.openChat('${project.id}', '${contractor.id}')"><i class="fas fa-comments"></i> Message</button>
                ${project.status === 'contractor-selected' ? `
                    <button class="btn btn-primary btn-sm" onclick="Dash.confirmStart('${project.id}')"><i class="fas fa-play"></i> Has the project started? Confirm</button>` : ''}
            </div>
            ${changeOrders.length ? `<div class="mt-1"><b class="small">Change Orders:</b>
                ${changeOrders.map(order => `
                <div class="quote-line"><span>${Utils.escapeHtml(order.description)} (${Utils.money(order.amount)})</span>
                    ${order.status === 'pending' ? `<span>
                        <button class="btn btn-success btn-sm" onclick="Dash.changeOrder('${order.id}', 'approved')">Approve</button>
                        <button class="btn btn-danger btn-sm" onclick="Dash.changeOrder('${order.id}', 'rejected')">Reject</button></span>`
                        : `<b>${order.status}</b>`}</div>`).join('')}</div>` : ''}
        </div>`;
    },

    confirmStart(projectId) {
        Store.setStatus(projectId, 'in-progress', 'customer', 'Customer confirmed start');
        Store.updateProject(projectId, { progress: 0 }, 'customer', 'Start confirmed');
        Utils.toast('Проект в работе', 'success');
        Dash.render();
    },

    changeOrder(orderId, decision) {
        const order = Store.db.changeOrders.find(o => o.id === orderId);
        order.status = decision;
        order.decidedAt = new Date().toISOString();
        Store.audit('customer', `changeorder.${decision}`, 'ChangeOrder', orderId, Utils.money(order.amount));
        Store.save();
        Utils.toast(decision === 'approved' ? 'Change Order подтверждён' : 'Change Order отклонён', 'success');
        Dash.render();
    },

    // --- Progress & completion (TЗ §67–§70) ---
    renderProgress(project) {
        const progress = project.progress || 0;
        return `
        <div class="mt-2">
            <div class="card-title"><i class="fas fa-bars-progress"></i> Project Progress: ${progress}%</div>
            <div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div>
            <div class="chip-row mt-1">
                ${[0, 25, 50, 75, 100].map(v => `
                    <button class="chip ${progress === v ? 'selected' : ''}" onclick="Dash.setProgress('${project.id}', ${v})">${v}%</button>`).join('')}
            </div>
            <div class="small muted mt-1">Демо: прогресс отмечает подрядчик; здесь можно симулировать. На 100% подрядчик отмечает MARK COMPLETE.</div>
        </div>`;
    },

    setProgress(projectId, value) {
        Store.updateProject(projectId, { progress: value }, 'contractor', `Progress ${value}%`);
        if (value === 100) {
            Store.setStatus(projectId, 'completed', 'contractor', 'MARK COMPLETE');
            const project = Store.project(projectId);
            Store.notify({ audience: 'customer', customerId: project.customerId, projectId,
                channels: ['sms', 'in-app'], event: 'completion-confirm',
                text: 'Подрядчик отметил завершение. Подтвердите завершение работ.' });
        }
        Dash.render();
    },

    renderReviewBlock(project) {
        const review = Store.reviewOf(project.id);
        if (review) {
            return `<div class="ai-panel mt-2" style="border-color:var(--success); background:var(--success-bg)">
                <b><i class="fas fa-star"></i> Спасибо за Verified Review!</b> ${'★'.repeat(review.overall)}</div>`;
        }
        if (!project.completionConfirmed) {
            return `
            <div class="ai-panel mt-2" style="border-color:var(--warning); background:var(--warning-bg)">
                <b>Подтвердите завершение работ:</b>
                <div class="chip-row mt-1">
                    <button class="chip" onclick="Dash.confirmCompletion('${project.id}', 'completed')">Completed</button>
                    <button class="chip" onclick="Dash.confirmCompletion('${project.id}', 'partial')">Partially Completed</button>
                    <button class="chip" onclick="Dash.confirmCompletion('${project.id}', 'problem')">Problem</button>
                </div>
            </div>`;
        }
        return Dash.renderReviewForm(project);
    },

    confirmCompletion(projectId, outcome) {
        const project = Store.project(projectId);
        Store.updateProject(projectId, { completionConfirmed: true, completionOutcome: outcome }, 'customer', `Completion: ${outcome}`);
        if (outcome === 'problem') {
            Store.setStatus(projectId, 'disputed', 'customer', 'Customer reported a problem');
            Store.notify({ audience: 'admin', projectId, event: 'dispute', text: `Проблема по проекту ${projectId} — нужно вмешательство.` });
            Utils.toast('Мы передали вопрос менеджеру платформы', 'info');
        } else {
            Store.setStatus(projectId, 'review-pending', 'customer', 'Awaiting verified review');
            const value = Store.budgetMidpoint(project);
            if (value) Store.updateProject(projectId, { finalValue: value }, 'system', 'Final value estimated');
        }
        Store.refreshCustomerStatus(project.customerId);
        Dash.render();
    },

    // --- Verified Review (TЗ §71–§73) ---
    reviewDraft: { quality: 0, communication: 0, timeliness: 0, value: 0, cleanliness: 0, wouldHireAgain: null, text: '' },

    renderReviewForm(project) {
        const draft = Dash.reviewDraft;
        const questions = [
            ['quality', 'Quality'], ['communication', 'Communication'], ['timeliness', 'Timeliness'],
            ['value', 'Value'], ['cleanliness', 'Cleanliness']
        ];
        return `
        <div class="mt-2 card" style="box-shadow:none">
            <div class="card-title"><i class="fas fa-star"></i> Оставьте VERIFIED REVIEW</div>
            ${questions.map(([key, label]) => `
                <div class="field"><label>${label}</label>
                    <div class="star-input">${[1, 2, 3, 4, 5].map(n => `
                        <i class="fas fa-star ${draft[key] >= n ? 'on' : ''}" onclick="Dash.rate('${key}', ${n})"></i>`).join('')}
                    </div></div>`).join('')}
            <div class="field"><label>Would hire again?</label>
                <div class="chip-row">
                    <button class="chip ${draft.wouldHireAgain === true ? 'selected' : ''}" onclick="Dash.hireAgain(true)">Yes</button>
                    <button class="chip ${draft.wouldHireAgain === false ? 'selected' : ''}" onclick="Dash.hireAgain(false)">No</button>
                </div></div>
            <div class="field"><label>Комментарий</label>
                <textarea class="input" id="reviewText" placeholder="Как прошёл проект?">${Utils.escapeHtml(draft.text)}</textarea></div>
            <div class="field"><label>After Photos / Video</label>
                <div class="hint">Приложите фото результата — это усиливает доверие. (демо)</div></div>
            <button class="btn btn-primary" onclick="Dash.submitReview('${project.id}')">Опубликовать Verified Review</button>
        </div>`;
    },

    rate(key, value) { Dash.reviewDraft[key] = value; Dash.keepReviewText(); Dash.render(); },
    hireAgain(value) { Dash.reviewDraft.wouldHireAgain = value; Dash.keepReviewText(); Dash.render(); },
    keepReviewText() {
        const el = document.getElementById('reviewText');
        if (el) Dash.reviewDraft.text = el.value;
    },

    submitReview(projectId) {
        Dash.keepReviewText();
        const draft = Dash.reviewDraft;
        if (!draft.quality || !draft.communication || !draft.timeliness || !draft.value || !draft.cleanliness) {
            return Utils.toast('Поставьте оценку по всем 5 критериям', 'danger');
        }
        if (draft.wouldHireAgain === null) return Utils.toast('Ответьте: наняли бы снова?', 'danger');
        const project = Store.project(projectId);
        const selection = Store.selectionOf(projectId);
        const overall = Math.round((draft.quality + draft.communication + draft.timeliness + draft.value + draft.cleanliness) / 5);
        Store.addReview({
            projectId,
            customerId: project.customerId,
            contractorId: selection.contractorId,
            quality: draft.quality, communication: draft.communication, timeliness: draft.timeliness,
            value: draft.value, cleanliness: draft.cleanliness,
            overall, wouldHireAgain: draft.wouldHireAgain, text: draft.text
        });
        Store.setStatus(projectId, 'closed', 'system', 'Verified review received');
        // Short CSAT after the key milestone (TЗ §93)
        const csat = prompt('Насколько легко было найти мастера? (1–5)', '5');
        if (csat) Store.addCsat({ projectId, question: 'ease-of-finding', score: Number(csat) || null });
        Store.refreshCustomerStatus(project.customerId);
        Dash.reviewDraft = { quality: 0, communication: 0, timeliness: 0, value: 0, cleanliness: 0, wouldHireAgain: null, text: '' };
        Utils.toast('Спасибо! Ваш Verified Review опубликован', 'success');
        Dash.render();
    },

    // --- Site visit (TЗ §63) ---
    requestVisit(projectId, contractorId) {
        const date = prompt('Дата осмотра (например, 2026-09-02):');
        if (!date) return;
        const time = prompt('Время (например, 10:00):') || '10:00';
        Store.addAppointment({ projectId, contractorId, date, time });
        const project = Store.project(projectId);
        if (!['contractor-selected', 'in-progress'].includes(project.status)) {
            Store.setStatus(projectId, 'site-visit', 'customer', `Site visit requested: ${date} ${time}`);
        }
        Utils.toast('Запрос на осмотр отправлен подрядчику', 'success');
        Dash.render();
    },

    // --- Messaging with masking (TЗ §64) ---
    chatWith: null,

    openChat(projectId, contractorId) {
        Dash.chatWith = { projectId, contractorId };
        Dash.renderChat();
    },

    renderChat() {
        const { projectId, contractorId } = Dash.chatWith;
        const contractor = Store.contractor(contractorId);
        const conversation = Store.conversation(projectId, contractorId);
        const messages = Store.messagesOf(conversation.id);
        const selection = Store.selectionOf(projectId);
        const unmasked = selection && selection.contractorId === contractorId;
        const host = document.createElement('div');
        host.className = 'modal-backdrop';
        host.innerHTML = `
            <div class="modal modal-sm">
                <div class="modal-header">
                    <h3><i class="fas fa-comments"></i> ${Utils.escapeHtml(contractor.company)}</h3>
                    <button class="modal-close" onclick="this.closest('.modal-backdrop').remove()"><i class="fas fa-xmark"></i></button>
                </div>
                ${!unmasked ? '<div class="small muted mb-1">До выбора подрядчика телефоны, email и ссылки в сообщениях скрываются автоматически.</div>' : ''}
                <div class="chat-box" id="chatBox">
                    ${messages.map(m => `<div class="chat-msg ${m.sender}">${Utils.escapeHtml(m.text)}<span class="when">${Utils.timeAgo(m.createdAt)}</span></div>`).join('') ||
                      '<div class="muted small" style="text-align:center">Начните диалог</div>'}
                </div>
                <div class="flex mt-1">
                    <input class="input" id="chatInput" placeholder="Сообщение...">
                    <button class="btn btn-primary" id="chatSend"><i class="fas fa-paper-plane"></i></button>
                </div>
            </div>`;
        document.body.appendChild(host);
        const send = () => {
            const input = document.getElementById('chatInput');
            const text = input.value.trim();
            if (!text) return;
            Store.addMessage(conversation.id, 'customer', text, unmasked);
            // Simulated contractor auto-reply keeps the demo alive
            setTimeout(() => {
                Store.addMessage(conversation.id, 'contractor',
                    'Спасибо! Посмотрел детали заявки — отвечу по стоимости в течение пары часов.', unmasked);
                host.remove();
                Dash.renderChat();
            }, 400);
            input.value = '';
            host.remove();
            Dash.renderChat();
        };
        document.getElementById('chatSend').onclick = send;
        document.getElementById('chatInput').addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
    }
};

document.addEventListener('DOMContentLoaded', Dash.init);
