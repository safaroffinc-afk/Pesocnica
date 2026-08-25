// ============================================
// Contractor Portal (demo) — invitations, quotes
// (TЗ §58–§59, §61, §63, §67–§69)
// Privacy: no full address, phone or email before selection (TЗ §58, §95)
// ============================================

Store.init();

const CPortal = {
    currentId: null,

    init() {
        CPortal.currentId = localStorage.getItem('pesocnica.contractor.demo') ||
            Store.db.contractors[0].id;
        CPortal.render();
    },

    switchTo(id) {
        CPortal.currentId = id;
        localStorage.setItem('pesocnica.contractor.demo', id);
        CPortal.render();
    },

    render() {
        const host = document.getElementById('contractorHost');
        const me = Store.contractor(CPortal.currentId);
        const invitations = Store.db.invitations
            .filter(i => i.contractorId === me.id)
            .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));

        host.innerHTML = `
            <div class="flex-between">
                <div>
                    <h2>${Utils.escapeHtml(me.company)}</h2>
                    <span class="small muted">Trust ${me.trustScore} · ★${me.rating} · ${me.completedProjects} проектов</span>
                </div>
                <select class="input" style="max-width:280px" onchange="CPortal.switchTo(this.value)">
                    ${Store.db.contractors.filter(c => c.accountStatus === 'active').map(c => `
                        <option value="${c.id}" ${c.id === me.id ? 'selected' : ''}>${Utils.escapeHtml(c.company)}</option>`).join('')}
                </select>
            </div>
            <p class="small muted mt-1">Демо-режим: выберите компанию, чтобы посмотреть её приглашения. В реальной системе это отдельный логин мастера.</p>

            <div class="card mt-2">
                <div class="card-title"><i class="fas fa-envelope-open-text"></i> Приглашения по заявкам (${invitations.length})</div>
                ${invitations.length ? invitations.map(inv => CPortal.renderInvitation(inv, me)).join('')
                    : '<div class="empty-state"><i class="fas fa-inbox"></i>Пока нет приглашений. Заявки появятся после работы Matching Engine.</div>'}
            </div>`;
    },

    renderInvitation(invitation, me) {
        const project = Store.project(invitation.projectId);
        if (!project) return '';
        const budget = Config.budgetRanges.find(b => b.value === project.budgetRange);
        const timeline = Config.timelineOptions.find(t => t.value === project.timeline);
        const photos = Store.mediaOf(project.id, 'photo');
        const selection = Store.selectionOf(project.id);
        const isSelected = selection && selection.contractorId === me.id;
        const myQuote = Store.quotesOf(project.id).find(q => q.contractorId === me.id);
        const appointments = Store.appointmentsOf(project.id).filter(a => a.contractorId === me.id);
        // Privacy rules (TЗ §58): only ZIP / city / distance until selected
        const contactBlock = isSelected
            ? `<span><i class="fas fa-location-dot"></i>${Utils.escapeHtml(`${project.address.street}${project.address.unit ? ' ' + project.address.unit : ''}, ${project.address.city}, PA ${project.address.zip}`)}</span>
               <span><i class="fas fa-phone"></i>${Utils.escapeHtml(project.contact.phone)}</span>
               <span><i class="fas fa-envelope"></i>${Utils.escapeHtml(project.contact.email)}</span>`
            : `<span><i class="fas fa-location-dot"></i>${Utils.escapeHtml(project.location ? project.location.city : '')} ${project.zip} · ~${invitation.distance !== undefined ? invitation.distance : (Store.matchesOf(project.id).find(m => m.contractorId === me.id) || {}).distance || '—'} mi</span>
               <span class="muted"><i class="fas fa-lock"></i>Полный адрес и контакты — после выбора вас заказчиком</span>`;

        return `
        <div class="match-card">
            <div class="match-body">
                <div class="flex-between">
                    <b>${Utils.escapeHtml(Engine.categoryLabel(project.primaryCategory))}
                        ${project.urgent ? '<span class="badge badge-danger">URGENT</span>' : ''}
                        ${isSelected ? '<span class="badge badge-success">ВЫ ВЫБРАНЫ</span>' : ''}</b>
                    <span class="badge badge-primary">Match ${invitation.matchScore}%</span>
                </div>
                <div class="match-meta mt-1">
                    <span><i class="fas fa-tag"></i>${Utils.escapeHtml(project.categories.map(Engine.categoryLabel).join(', '))}</span>
                    <span><i class="fas fa-sack-dollar"></i>${budget ? budget.label : '—'}</span>
                    <span><i class="fas fa-calendar"></i>${timeline ? timeline.label : '—'}</span>
                    <span><i class="fas fa-images"></i>${photos.length} фото</span>
                </div>
                <div class="match-meta mt-1">${contactBlock}</div>
                <div class="small mt-1">${Utils.escapeHtml((project.description || '').slice(0, 180))}${(project.description || '').length > 180 ? '…' : ''}</div>
                ${photos.length ? `<div class="media-grid mt-1" style="grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));">
                    ${photos.slice(0, 5).map(p => `<div class="media-thumb">${p.thumb ? `<img src="${p.thumb}">` : '<i class="fas fa-image"></i>'}</div>`).join('')}</div>` : ''}
                ${appointments.length ? appointments.map(a => `
                    <div class="ai-panel mt-1" style="padding:8px 12px"><i class="fas fa-calendar-check"></i>
                        Site Visit: <b>${Utils.escapeHtml(a.date)} ${Utils.escapeHtml(a.time)}</b> · ${a.status}
                        ${a.status === 'requested' ? `
                            <button class="btn btn-success btn-sm" onclick="CPortal.visit('${a.id}', 'accepted')">Accept</button>
                            <button class="btn btn-outline btn-sm" onclick="CPortal.visit('${a.id}', 'reschedule')">Suggest New Time</button>
                            <button class="btn btn-danger btn-sm" onclick="CPortal.visit('${a.id}', 'declined')">Decline</button>` : ''}</div>`).join('') : ''}
            </div>
            <div class="match-actions">
                ${invitation.status === 'invited' ? `
                    <button class="btn btn-success btn-sm" onclick="CPortal.respond('${invitation.id}', 'interested')"><i class="fas fa-check"></i> INTERESTED</button>
                    <button class="btn btn-outline btn-sm" onclick="CPortal.pass('${invitation.id}')"><i class="fas fa-forward"></i> PASS</button>` : ''}
                ${invitation.status === 'interested' && !myQuote ? `
                    <span class="badge badge-info" style="justify-content:center">INTERESTED</span>
                    <button class="btn btn-primary btn-sm" onclick="CPortal.quote('${invitation.projectId}')"><i class="fas fa-file-invoice-dollar"></i> Send Quote</button>` : ''}
                ${myQuote ? `<span class="badge badge-success" style="justify-content:center">Quote: ${Utils.money(myQuote.priceLow)}</span>` : ''}
                ${invitation.status === 'passed' ? `<span class="badge badge-muted" style="justify-content:center">PASSED${invitation.passReason ? ': ' + invitation.passReason : ''}</span>` : ''}
                ${isSelected && ['contractor-selected', 'scheduled'].includes(project.status) ? `
                    <button class="btn btn-primary btn-sm" onclick="CPortal.start('${project.id}')"><i class="fas fa-play"></i> STARTED</button>` : ''}
                ${isSelected && project.status === 'in-progress' ? `
                    <button class="btn btn-success btn-sm" onclick="CPortal.complete('${project.id}')"><i class="fas fa-flag-checkered"></i> MARK COMPLETE</button>
                    <button class="btn btn-outline btn-sm" onclick="CPortal.changeOrder('${project.id}')"><i class="fas fa-file-circle-plus"></i> Change Order</button>` : ''}
            </div>
        </div>`;
    },

    respond(invitationId, status) {
        const invitation = Store.respondToInvitation(invitationId, status);
        const project = Store.project(invitation.projectId);
        if (status === 'interested') {
            Store.setStatus(project.id, 'contractors-interested', 'contractor', `Interested: ${invitation.contractorId}`);
            Store.notify({ audience: 'customer', customerId: project.customerId, projectId: project.id,
                channels: ['sms', 'in-app'], event: 'contractor-interested',
                text: `${Store.contractor(invitation.contractorId).company} заинтересован в вашем проекте ${project.id}.` });
        }
        CPortal.render();
    },

    pass(invitationId) {
        const reason = prompt(`Причина отказа?\n${Config.passReasons.join(' / ')}`, 'Too Busy');
        Store.respondToInvitation(invitationId, 'passed', reason || 'Other');
        Utils.toast('Отмечено. Причина учитывается Matching Engine', 'info');
        CPortal.render();
    },

    quote(projectId) {
        const me = Store.contractor(CPortal.currentId);
        const project = Store.project(projectId);
        const simulated = Engine.simulateQuote(project, me.id);
        const low = prompt('Цена от, $:', simulated.priceLow);
        if (low === null) return;
        const high = prompt('Цена до, $:', simulated.priceHigh) || low;
        const record = Store.addQuote(Object.assign(simulated, {
            priceLow: Number(low) || simulated.priceLow,
            priceHigh: Number(high) || simulated.priceHigh
        }));
        Store.setStatus(projectId, 'quotes-received', 'contractor', `Quote from ${me.company}`);
        Store.notify({ audience: 'customer', customerId: project.customerId, projectId,
            channels: ['sms', 'in-app'], event: 'new-quote',
            text: `NEW ESTIMATE RECEIVED: ${me.company} — ${Utils.money(record.priceLow)}–${Utils.money(record.priceHigh)}.` });
        Utils.toast('Смета отправлена заказчику', 'success');
        CPortal.render();
    },

    visit(appointmentId, decision) {
        const appointment = Store.db.appointments.find(a => a.id === appointmentId);
        if (decision === 'reschedule') {
            const date = prompt('Новая дата:', appointment.date) || appointment.date;
            const time = prompt('Новое время:', appointment.time) || appointment.time;
            Object.assign(appointment, { date, time, status: 'rescheduled' });
        } else {
            appointment.status = decision;
        }
        Store.save();
        CPortal.render();
    },

    start(projectId) {
        Store.setStatus(projectId, 'in-progress', 'contractor', 'Contractor marked STARTED');
        Store.updateProject(projectId, { progress: 0 }, 'contractor', 'Started');
        const project = Store.project(projectId);
        Store.notify({ audience: 'customer', customerId: project.customerId, projectId,
            channels: ['sms', 'in-app'], event: 'project-started',
            text: 'Has the project started? Подтвердите начало работ в кабинете.' });
        CPortal.render();
    },

    complete(projectId) {
        Store.updateProject(projectId, { progress: 100 }, 'contractor', 'Progress 100%');
        Store.setStatus(projectId, 'completed', 'contractor', 'MARK COMPLETE');
        const project = Store.project(projectId);
        Store.notify({ audience: 'customer', customerId: project.customerId, projectId,
            channels: ['sms', 'in-app'], event: 'completion-confirm',
            text: 'Подрядчик отметил завершение. Подтвердите завершение работ.' });
        CPortal.render();
    },

    changeOrder(projectId) {
        const description = prompt('Описание изменения (Change Order):');
        if (!description) return;
        const amount = Number(prompt('Сумма изменения, $:', '500')) || 0;
        Store.addChangeOrder({ projectId, contractorId: CPortal.currentId, description, amount });
        const project = Store.project(projectId);
        Store.notify({ audience: 'customer', customerId: project.customerId, projectId,
            channels: ['in-app'], event: 'change-order',
            text: `Change Order: ${description} (${Utils.money(amount)}). Approve или Reject в кабинете.` });
        Utils.toast('Change Order отправлен заказчику', 'success');
        CPortal.render();
    }
};

document.addEventListener('DOMContentLoaded', CPortal.init);
