// ============================================
// Project Intake Flow — customer wizard
// (TЗ §6–§39: mobile first, one question per screen,
//  autosave, back without data loss, OTP, Project ID)
// ============================================

Store.init();

const Intake = {
    stepOrder: [
        'zip', 'customerType', 'propertyType', 'categories', 'questions',
        'description', 'media', 'stage', 'timeline', 'budget',
        'address', 'contact', 'otp', 'review', 'done'
    ],

    state: null,
    otp: { code: null, sentAt: null, attempts: 0, sends: 0, verified: false },

    blank() {
        const params = Utils.queryParams();
        const rawSource = (params.source || params.utm_source || '').toLowerCase();
        return {
            step: 'zip',
            startedAt: new Date().toISOString(),
            zip: '', location: null, waitlisted: false,
            customerType: null,
            propertyType: null,
            categories: [], primaryCategory: null,
            answers: {},
            description: '',
            media: [], // {kind, name, size, type, thumb, duration}
            stage: null,
            timeline: null,
            budgetRange: null, financingInterest: null,
            address: { street: '', unit: '', city: '', state: 'PA', zip: '' },
            contact: { firstName: '', lastName: '', phone: '', email: '', language: 'ru' },
            serviceConsent: false, marketingConsent: false,
            tracking: {
                source: Config.sourceAliases[rawSource] ||
                    (rawSource ? 'Other' : 'Website Organic'),
                rawSource: rawSource || null,
                utmSource: params.utm_source || null,
                utmMedium: params.utm_medium || null,
                utmCampaign: params.utm_campaign || null,
                utmContent: params.utm_content || null,
                campaign: params.campaign || null,
                adSet: params.adset || null,
                ad: params.ad || null,
                referralCode: params.ref || null
            }
        };
    },

    // ----------------------------------------------------
    // Boot / navigation
    // ----------------------------------------------------
    init() {
        const draft = Store.getDraft();
        if (draft && draft.step && draft.step !== 'done') {
            Intake.state = draft;
            Utils.toast('Черновик заявки восстановлен', 'success');
        } else {
            Intake.state = Intake.blank();
        }
        Intake.render();
    },

    save() {
        Store.saveDraft(Intake.state);
        const label = document.getElementById('autosaveLabel');
        if (label) {
            label.innerHTML = '<i class="fas fa-check"></i> сохранено';
            clearTimeout(Intake._saveTimer);
            Intake._saveTimer = setTimeout(() => {
                label.innerHTML = '<i class="fas fa-cloud-arrow-up"></i> автосохранение';
            }, 1500);
        }
    },

    go(step) {
        Intake.state.step = step;
        Intake.save();
        Intake.render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    next() {
        const order = Intake.stepOrder;
        const index = order.indexOf(Intake.state.step);
        Intake.go(order[index + 1]);
    },

    back() {
        const order = Intake.stepOrder;
        const index = order.indexOf(Intake.state.step);
        if (index > 0) Intake.go(order[index - 1]);
    },

    render() {
        const host = document.getElementById('stepHost');
        const order = Intake.stepOrder;
        const index = order.indexOf(Intake.state.step);
        const fill = document.getElementById('progressFill');
        fill.style.width = `${Math.max(5, Math.round(((index + 1) / order.length) * 100))}%`;
        document.getElementById('progressLabel').textContent =
            Intake.state.step === 'done' ? 'Готово' : `Шаг ${index + 1} из ${order.length - 1}`;
        host.innerHTML = Intake.steps[Intake.state.step]();
        if (Intake.mounts[Intake.state.step]) Intake.mounts[Intake.state.step]();
    },

    nav(nextLabel = 'Далее', backable = true, nextId = 'btnNext') {
        return `
            <div class="wizard-nav">
                ${backable ? '<button class="btn btn-outline btn-back" onclick="Intake.back()"><i class="fas fa-arrow-left"></i></button>' : ''}
                <button class="btn btn-primary" id="${nextId}">${nextLabel} <i class="fas fa-arrow-right"></i></button>
            </div>`;
    },

    tileGrid(options, selectedValue, handler) {
        return `<div class="option-grid">${options.map(option => `
            <button class="option-tile ${selectedValue === option.value ? 'selected' : ''}"
                    onclick="${handler}('${option.value}')">
                <i class="fas ${option.icon || 'fa-circle-dot'}"></i>
                <span>${Utils.escapeHtml(option.labelRu || option.label)}
                    ${option.labelRu ? `<span class="tile-sub">${Utils.escapeHtml(option.label)}</span>` : ''}
                </span>
            </button>`).join('')}</div>`;
    },

    // ----------------------------------------------------
    // Step templates
    // ----------------------------------------------------
    steps: {
        // STEP 1 — ZIP (TЗ §7, §8)
        zip() {
            const s = Intake.state;
            return `
            <div class="step-card">
                <div class="step-title">ГДЕ НАХОДИТСЯ ОБЪЕКТ?</div>
                <div class="step-subtitle">Введите ZIP-код — мы проверим, работаем ли мы в вашем районе.</div>
                <div class="field">
                    <input class="input input-lg" id="zipInput" inputmode="numeric" maxlength="5"
                           placeholder="19102" value="${Utils.escapeHtml(s.zip)}" autocomplete="postal-code">
                    <div class="hint" id="zipHint"></div>
                </div>
                <div id="zipResult"></div>
                ${Intake.nav('Продолжить', false)}
            </div>`;
        },

        // STEP 2 — customer type (TЗ §9)
        customerType() {
            return `
            <div class="step-card">
                <div class="step-title">Кто вы?</div>
                <div class="step-subtitle">Это помогает нам правильно квалифицировать заявку.</div>
                ${Intake.tileGrid(Config.customerTypes, Intake.state.customerType, 'Intake.pickCustomerType')}
            </div>`;
        },

        // STEP 3 — property type (TЗ §10)
        propertyType() {
            return `
            <div class="step-card">
                <div class="step-title">Тип объекта</div>
                <div class="step-subtitle">Где будут проводиться работы?</div>
                ${Intake.tileGrid(Config.propertyTypes, Intake.state.propertyType, 'Intake.pickPropertyType')}
            </div>`;
        },

        // STEP 4 — categories, multi + primary (TЗ §11, §12)
        categories() {
            const s = Intake.state;
            return `
            <div class="step-card">
                <div class="step-title">Какие работы нужны?</div>
                <div class="step-subtitle">Можно выбрать несколько. Первая выбранная станет основной — нажмите на выбранную ещё раз, чтобы снять.</div>
                ${Config.categoryGroups.map(group => `
                    <div class="category-group">
                        <h4><i class="fas ${group.icon}"></i> ${group.group}</h4>
                        <div class="chip-row">
                            ${group.items.map(item => {
                                const selected = s.categories.includes(item.value);
                                const primary = s.primaryCategory === item.value;
                                return `<button class="chip ${primary ? 'primary-cat' : selected ? 'selected' : ''}"
                                    onclick="Intake.toggleCategory('${item.value}')">
                                    ${primary ? '<i class="fas fa-star"></i> ' : ''}${Utils.escapeHtml(item.label)}</button>`;
                            }).join('')}
                        </div>
                    </div>`).join('')}
                ${s.primaryCategory ? `<div class="hint" style="margin-top:4px">Основная категория для подбора: <b>${Utils.escapeHtml(Engine.categoryLabel(s.primaryCategory))}</b></div>` : ''}
                ${Intake.nav()}
            </div>`;
        },

        // Dynamic questionnaire (TЗ §13–§19)
        questions() {
            const s = Intake.state;
            const questions = Store.questionsFor(s.primaryCategory)
                .filter(q => Engine.questionVisible(q, s.answers));
            return `
            <div class="step-card">
                <div class="step-title">${Utils.escapeHtml(Engine.categoryLabel(s.primaryCategory))}</div>
                <div class="step-subtitle">Несколько уточняющих вопросов — так предложения будут точнее.</div>
                <div id="questionList">
                    ${questions.map(q => Intake.renderQuestion(q)).join('')}
                </div>
                ${Intake.nav()}
            </div>`;
        },

        // STEP 5 — description + AI assistant (TЗ §20, §21)
        description() {
            const s = Intake.state;
            return `
            <div class="step-card">
                <div class="step-title">Расскажите, что нужно сделать</div>
                <div class="step-subtitle">Например: нужно полностью переделать ванную 8×10 ft, убрать старую плитку, заменить shower и установить новую vanity.</div>
                <div class="field">
                    <textarea class="input" id="descInput" placeholder="Опишите работу своими словами...">${Utils.escapeHtml(s.description)}</textarea>
                </div>
                <div id="aiPanel"></div>
                ${Intake.nav()}
            </div>`;
        },

        // STEP 6 — media (TЗ §22–§25)
        media() {
            const s = Intake.state;
            const m = Store.settings.media;
            const photos = s.media.filter(x => x.kind === 'photo').length;
            const videos = s.media.filter(x => x.kind === 'video').length;
            const docs = s.media.filter(x => x.kind === 'document').length;
            return `
            <div class="step-card">
                <div class="step-title">ДОБАВЬТЕ ФОТО ОБЪЕКТА</div>
                <div class="step-subtitle">Заявки с фотографиями обычно получают более точные предложения.</div>
                <div class="upload-zone" onclick="document.getElementById('photoInput').click()">
                    <i class="fas fa-camera"></i>
                    <b>TAKE PHOTO / UPLOAD FROM PHONE</b><br>
                    <span class="small muted">JPG, PNG, HEIC, WebP · до ${m.maxPhotos} фото (${photos}/${m.maxPhotos})</span>
                </div>
                <input type="file" id="photoInput" accept="image/jpeg,image/png,image/heic,image/heif,image/webp" capture="environment" multiple hidden>
                <div class="flex mt-2" style="gap:8px; flex-wrap:wrap;">
                    <button class="btn btn-outline btn-sm" onclick="document.getElementById('videoInput').click()">
                        <i class="fas fa-video"></i> Видео (${videos}/${m.maxVideos})</button>
                    <button class="btn btn-outline btn-sm" onclick="document.getElementById('docInput').click()">
                        <i class="fas fa-file-pdf"></i> Документы / планы (${docs}/${m.maxDocuments})</button>
                </div>
                <input type="file" id="videoInput" accept="video/mp4,video/quicktime,video/webm" multiple hidden>
                <input type="file" id="docInput" accept="application/pdf,image/jpeg,image/png" multiple hidden>
                <div class="media-grid" id="mediaGrid">${Intake.renderMedia()}</div>
                <div class="hint mt-1">PDF, Blueprint, Floor Plan, Inspection Report, Insurance Estimate — всё это поможет мастеру.</div>
                ${Intake.nav(s.media.length ? 'Далее' : 'Пропустить фото')}
            </div>`;
        },

        // STEP 7 — project stage (TЗ §26)
        stage() {
            return `
            <div class="step-card">
                <div class="step-title">На каком этапе вы сейчас?</div>
                <div class="step-subtitle"></div>
                ${Intake.tileGrid(
                    Config.projectStages.map(o => ({ value: o.value, label: o.label, labelRu: o.labelRu, icon: 'fa-flag' })),
                    Intake.state.stage, 'Intake.pickStage')}
            </div>`;
        },

        // STEP 8 — timeline (TЗ §27)
        timeline() {
            return `
            <div class="step-card">
                <div class="step-title">Когда хотите начать?</div>
                <div class="step-subtitle"></div>
                ${Intake.tileGrid(
                    Config.timelineOptions.map(o => ({ value: o.value, label: o.label, labelRu: o.labelRu, icon: 'fa-calendar-days' })),
                    Intake.state.timeline, 'Intake.pickTimeline')}
            </div>`;
        },

        // STEP 9 — budget + financing (TЗ §29, §30)
        budget() {
            const s = Intake.state;
            return `
            <div class="step-card">
                <div class="step-title">Какой бюджет вы рассматриваете?</div>
                <div class="step-subtitle">Это ориентир, а не обязательство — он помогает подобрать мастеров нужного уровня.</div>
                <div class="chip-row">
                    ${Config.budgetRanges.map(b => `
                        <button class="chip ${s.budgetRange === b.value ? 'selected' : ''}"
                            onclick="Intake.pickBudget('${b.value}')">${Utils.escapeHtml(b.label)}</button>`).join('')}
                </div>
                <div class="field mt-2">
                    <label>Рассматриваете финансирование проекта?</label>
                    <div class="chip-row">
                        ${['Yes', 'No', 'Maybe'].map(v => `
                            <button class="chip ${s.financingInterest === v ? 'selected' : ''}"
                                onclick="Intake.pickFinancing('${v}')">${v}</button>`).join('')}
                    </div>
                </div>
                ${Intake.nav()}
            </div>`;
        },

        // STEP 10 — address (TЗ §31)
        address() {
            const s = Intake.state;
            const location = s.location || {};
            return `
            <div class="step-card">
                <div class="step-title">Адрес объекта</div>
                <div class="step-subtitle">Мастера увидят только ZIP, город и примерное расстояние. Полный адрес откроется только выбранному подрядчику.</div>
                <div class="field">
                    <label>Street Address</label>
                    <input class="input" id="addrStreet" placeholder="123 Main St" value="${Utils.escapeHtml(s.address.street)}">
                </div>
                <div class="field">
                    <label>Unit / Apt (необязательно)</label>
                    <input class="input" id="addrUnit" placeholder="Apt 4B" value="${Utils.escapeHtml(s.address.unit)}">
                </div>
                <div class="grid-2">
                    <div class="field">
                        <label>City</label>
                        <input class="input" id="addrCity" value="${Utils.escapeHtml(s.address.city || location.city || '')}">
                    </div>
                    <div class="field">
                        <label>ZIP</label>
                        <input class="input" id="addrZip" maxlength="5" inputmode="numeric" value="${Utils.escapeHtml(s.address.zip || s.zip)}">
                    </div>
                </div>
                ${Intake.nav()}
            </div>`;
        },

        // STEP 11 — contact + consent (TЗ §32, §35)
        contact() {
            const s = Intake.state;
            return `
            <div class="step-card">
                <div class="step-title">Контактные данные</div>
                <div class="step-subtitle">Телефон нужен для SMS-подтверждения — без него заявка не уходит мастерам.</div>
                <div class="grid-2">
                    <div class="field">
                        <label>First Name *</label>
                        <input class="input" id="ctFirst" autocomplete="given-name" value="${Utils.escapeHtml(s.contact.firstName)}">
                    </div>
                    <div class="field">
                        <label>Last Name *</label>
                        <input class="input" id="ctLast" autocomplete="family-name" value="${Utils.escapeHtml(s.contact.lastName)}">
                    </div>
                </div>
                <div class="field">
                    <label>Phone *</label>
                    <input class="input" id="ctPhone" inputmode="tel" autocomplete="tel" placeholder="+1 (215) 555-0134" value="${Utils.escapeHtml(s.contact.phone)}">
                </div>
                <div class="field">
                    <label>Email *</label>
                    <input class="input" id="ctEmail" inputmode="email" autocomplete="email" placeholder="you@example.com" value="${Utils.escapeHtml(s.contact.email)}">
                </div>
                <div class="field">
                    <label>Предпочитаемый язык</label>
                    <select class="input" id="ctLang">
                        ${Config.languages.map(l => `<option value="${l.value}" ${s.contact.language === l.value ? 'selected' : ''}>${l.label}</option>`).join('')}
                    </select>
                </div>
                <label class="checkbox-row">
                    <input type="checkbox" id="ctConsent" ${s.serviceConsent ? 'checked' : ''}>
                    <span>Я согласен получать сообщения, связанные с моей заявкой и предложениями подрядчиков. <b>(обязательно)</b></span>
                </label>
                <label class="checkbox-row">
                    <input type="checkbox" id="ctMarketing" ${s.marketingConsent ? 'checked' : ''}>
                    <span>Я согласен получать новости и акции платформы. (необязательно)</span>
                </label>
                ${Intake.nav('Получить SMS-код')}
            </div>`;
        },

        // Phone verification (TЗ §33)
        otp() {
            const s = Intake.state;
            return `
            <div class="step-card otp-box">
                <div class="step-title">Подтвердите телефон</div>
                <div class="step-subtitle">Мы отправили SMS с кодом на <b>${Utils.escapeHtml(Utils.formatPhone(s.contact.phone))}</b></div>
                <div class="field">
                    <input class="input input-lg" id="otpInput" inputmode="numeric" maxlength="6" placeholder="••••••" autocomplete="one-time-code">
                    <div class="hint" id="otpHint"></div>
                </div>
                <div class="small muted">Демо-режим: SMS-шлюз не подключён, код показан ниже.</div>
                <div class="otp-demo-code" id="otpDemo"></div>
                <div class="mt-2">
                    <button class="btn btn-ghost btn-sm" id="otpResend"><i class="fas fa-rotate"></i> Отправить код повторно</button>
                </div>
                ${Intake.nav('Подтвердить')}
            </div>`;
        },

        // STEP 12 — review (TЗ §36)
        review() {
            const s = Intake.state;
            const budget = Config.budgetRanges.find(b => b.value === s.budgetRange);
            const timeline = Config.timelineOptions.find(t => t.value === s.timeline);
            const photos = s.media.filter(m => m.kind === 'photo').length;
            return `
            <div class="step-card">
                <div class="step-title">Проверьте заявку</div>
                <div class="step-subtitle">Всё верно? Тогда отправляем в подбор мастеров.</div>
                <div class="summary-list">
                    <div class="summary-row"><span class="label">Location</span><span class="value">${Utils.escapeHtml(`${s.location ? s.location.city + ', ' : ''}${s.zip}`)}</span></div>
                    <div class="summary-row"><span class="label">Category</span><span class="value">${Utils.escapeHtml(s.categories.map(Engine.categoryLabel).join(', '))}</span></div>
                    <div class="summary-row"><span class="label">Description</span><span class="value">${Utils.escapeHtml((s.description || '—').slice(0, 140))}${s.description.length > 140 ? '…' : ''}</span></div>
                    <div class="summary-row"><span class="label">Photos</span><span class="value">${photos} фото, ${s.media.filter(m => m.kind === 'video').length} видео, ${s.media.filter(m => m.kind === 'document').length} док.</span></div>
                    <div class="summary-row"><span class="label">Budget</span><span class="value">${budget ? budget.label : '—'}</span></div>
                    <div class="summary-row"><span class="label">Timeline</span><span class="value">${timeline ? timeline.label : '—'}</span></div>
                    <div class="summary-row"><span class="label">Contact</span><span class="value">${Utils.escapeHtml(`${s.contact.firstName} ${s.contact.lastName}`)}<br><span class="small muted">${Utils.escapeHtml(Utils.formatPhone(s.contact.phone))} · <span class="badge badge-success">PHONE VERIFIED</span></span></span></div>
                </div>
                ${Intake.nav('SUBMIT PROJECT')}
            </div>`;
        },

        // Thank you (TЗ §37–§39)
        done() {
            const project = Store.project(Intake.submittedProjectId);
            if (!project) {
                return `<div class="step-card"><div class="step-title">Заявка отправлена</div>
                    <a class="btn btn-primary btn-block mt-2" href="dashboard.html">Открыть кабинет</a></div>`;
            }
            const status = Config.projectStatuses.find(x => x.value === project.status);
            return `
            <div class="step-card" style="text-align:center">
                <div style="font-size:3rem; color: var(--success); margin-bottom: 10px;"><i class="fas fa-circle-check"></i></div>
                <div class="step-title">ЗАЯВКА ПРИНЯТА</div>
                <div class="step-subtitle">Мы подбираем до ${Store.settings.maxContractorsPerProject} подходящих специалистов для вашего проекта.</div>
                <div class="summary-list" style="text-align:left">
                    <div class="summary-row"><span class="label">Project ID</span><span class="value">${project.id}</span></div>
                    <div class="summary-row"><span class="label">Status</span><span class="value"><span class="badge badge-${status ? status.tone : 'info'}">${status ? status.label : project.status}</span></span></div>
                    <div class="summary-row"><span class="label">Expected Next Step</span><span class="value">Квалификация заявки — обычно до ${Store.settings.sla.qualificationHours} ч</span></div>
                </div>
                <div class="card mt-2" style="text-align:left">
                    <b><i class="fas fa-user-plus" style="color:var(--primary)"></i> Аккаунт создан</b>
                    <div class="small muted">Мы создали личный кабинет по вашему телефону. Придумайте пароль или входите по Magic Link из SMS.</div>
                    <div class="flex mt-1" style="flex-wrap:wrap">
                        <button class="btn btn-outline btn-sm" onclick="Utils.toast('Демо: пароль сохранён', 'success')"><i class="fas fa-key"></i> CREATE PASSWORD</button>
                        <button class="btn btn-outline btn-sm" onclick="Utils.toast('Демо: magic link отправлен по SMS', 'success')"><i class="fas fa-wand-magic-sparkles"></i> Magic Link</button>
                    </div>
                </div>
                <a class="btn btn-primary btn-block mt-2" href="dashboard.html">Перейти в мой кабинет <i class="fas fa-arrow-right"></i></a>
            </div>`;
        }
    },

    // ----------------------------------------------------
    // Dynamic questionnaire rendering (TЗ §19 field types)
    // ----------------------------------------------------
    renderQuestion(q) {
        const s = Intake.state;
        const value = s.answers[q.id];
        const req = q.required ? ' *' : '';
        const label = `<label>${Utils.escapeHtml(q.label)}${req}</label>` +
            (q.help ? `<div class="hint" style="margin-bottom:6px">${Utils.escapeHtml(q.help)}</div>` : '');

        if (q.type === 'multiselect' || q.type === 'checkbox') {
            const selected = Array.isArray(value) ? value : [];
            return `<div class="field" data-q="${q.id}">${label}
                <div class="chip-row">${(q.options || []).map(option => `
                    <button class="chip ${selected.includes(option) ? 'selected' : ''}"
                        onclick="Intake.toggleAnswer('${q.id}', '${Utils.escapeHtml(option)}')">${Utils.escapeHtml(option)}</button>`).join('')}
                </div></div>`;
        }
        if (q.type === 'radio' || q.type === 'select') {
            return `<div class="field" data-q="${q.id}">${label}
                <div class="chip-row">${(q.options || []).map(option => `
                    <button class="chip ${value === option ? 'selected' : ''}"
                        onclick="Intake.setAnswer('${q.id}', '${Utils.escapeHtml(option)}')">${Utils.escapeHtml(option)}</button>`).join('')}
                </div></div>`;
        }
        if (q.type === 'number' || q.type === 'money') {
            return `<div class="field" data-q="${q.id}">${label}
                <input class="input" type="number" inputmode="numeric" value="${value !== undefined && value !== null ? Utils.escapeHtml(value) : ''}"
                    onchange="Intake.setAnswer('${q.id}', this.value, true)"></div>`;
        }
        if (q.type === 'textarea') {
            return `<div class="field" data-q="${q.id}">${label}
                <textarea class="input" onchange="Intake.setAnswer('${q.id}', this.value, true)">${value ? Utils.escapeHtml(value) : ''}</textarea></div>`;
        }
        if (q.type === 'date') {
            return `<div class="field" data-q="${q.id}">${label}
                <input class="input" type="date" value="${value ? Utils.escapeHtml(value) : ''}"
                    onchange="Intake.setAnswer('${q.id}', this.value, true)"></div>`;
        }
        if (q.type === 'photo' || q.type === 'video' || q.type === 'file') {
            return `<div class="field" data-q="${q.id}">${label}
                <div class="hint">Файлы можно приложить на шаге «Фото и документы»${value ? ' · отмечено' : ''}.</div>
                <button class="chip ${value ? 'selected' : ''}" onclick="Intake.setAnswer('${q.id}', 'attached-later')">
                    ${value ? 'Приложу файлы' : 'Отметить: приложу файлы'}</button></div>`;
        }
        // text
        return `<div class="field" data-q="${q.id}">${label}
            <input class="input" type="text" value="${value ? Utils.escapeHtml(value) : ''}"
                onchange="Intake.setAnswer('${q.id}', this.value, true)"></div>`;
    },

    setAnswer(id, value, silent = false) {
        Intake.state.answers[id] = value;
        Intake.save();
        if (!silent) Intake.render(); // conditional questions may appear/hide
    },

    toggleAnswer(id, option) {
        const current = Array.isArray(Intake.state.answers[id]) ? Intake.state.answers[id] : [];
        Intake.state.answers[id] = current.includes(option)
            ? current.filter(x => x !== option)
            : current.concat(option);
        Intake.save();
        Intake.render();
    },

    // ----------------------------------------------------
    // Pickers
    // ----------------------------------------------------
    pickCustomerType(value) { Intake.state.customerType = value; Intake.save(); Intake.next(); },
    pickPropertyType(value) { Intake.state.propertyType = value; Intake.save(); Intake.next(); },
    pickStage(value) { Intake.state.stage = value; Intake.save(); Intake.next(); },
    pickTimeline(value) { Intake.state.timeline = value; Intake.save(); Intake.next(); },
    pickBudget(value) { Intake.state.budgetRange = value; Intake.save(); Intake.render(); },
    pickFinancing(value) { Intake.state.financingInterest = value; Intake.save(); Intake.render(); },

    toggleCategory(value) {
        const s = Intake.state;
        if (s.categories.includes(value)) {
            s.categories = s.categories.filter(c => c !== value);
            if (s.primaryCategory === value) s.primaryCategory = s.categories[0] || null;
        } else {
            s.categories.push(value);
            if (!s.primaryCategory) s.primaryCategory = value;
        }
        Intake.save();
        Intake.render();
    },

    renderMedia() {
        return Intake.state.media.map((item, index) => `
            <div class="media-thumb">
                ${item.thumb ? `<img src="${item.thumb}" alt="">` :
                    `<i class="fas ${item.kind === 'video' ? 'fa-film' : item.kind === 'document' ? 'fa-file-pdf' : 'fa-image'}"></i>`}
                <span class="kind-tag">${item.kind === 'photo' ? 'фото' : item.kind === 'video' ? 'видео' : 'док'}</span>
                <button class="remove" onclick="Intake.removeMedia(${index})"><i class="fas fa-xmark"></i></button>
            </div>`).join('');
    },

    removeMedia(index) {
        Intake.state.media.splice(index, 1);
        Intake.save();
        Intake.render();
    },

    async addFiles(fileList, kind) {
        const m = Store.settings.media;
        const limits = { photo: m.maxPhotos, video: m.maxVideos, document: m.maxDocuments };
        const formats = { photo: m.photoFormats, video: m.videoFormats, document: m.documentFormats };
        const maxMb = { photo: m.maxPhotoMb, video: m.maxVideoMb, document: m.maxPhotoMb };
        for (const file of Array.from(fileList)) {
            const count = Intake.state.media.filter(x => x.kind === kind).length;
            if (count >= limits[kind]) { Utils.toast(`Лимит: не более ${limits[kind]} файлов этого типа`, 'danger'); break; }
            // HEIC often arrives with an empty MIME type — accept by extension.
            const heic = /\.hei[cf]$/i.test(file.name);
            if (file.type && !formats[kind].includes(file.type) && !(kind === 'photo' && heic)) {
                Utils.toast(`Формат ${file.type || file.name} не поддерживается`, 'danger'); continue;
            }
            if (file.size > maxMb[kind] * 1024 * 1024) {
                Utils.toast(`Файл слишком большой (лимит ${maxMb[kind]} MB)`, 'danger'); continue;
            }
            let duration = null;
            if (kind === 'video') {
                duration = await Utils.videoDuration(file);
                if (duration > m.maxVideoSeconds) {
                    Utils.toast(`Видео длиннее ${m.maxVideoSeconds} сек — сократите ролик`, 'danger'); continue;
                }
            }
            const thumb = kind !== 'video' && !heic ? await Utils.thumbnail(file) : null;
            Intake.state.media.push({ kind, name: file.name, size: file.size, type: file.type, thumb, duration });
        }
        Intake.save();
        Intake.render();
    },

    // ----------------------------------------------------
    // Validation per step
    // ----------------------------------------------------
    validators: {
        zip() {
            const s = Intake.state;
            if (!Utils.isValidZip(s.zip)) return 'Введите 5-значный ZIP-код';
            if (!s.location) return 'ZIP не найден. Проверьте код';
            if (!Store.isServiceable(s.location)) return 'WAITLIST';
            return null;
        },
        categories() {
            if (!Intake.state.categories.length) return 'Выберите хотя бы одну категорию работ';
            return null;
        },
        questions() {
            const s = Intake.state;
            const missing = Store.questionsFor(s.primaryCategory)
                .filter(q => q.required && Engine.questionVisible(q, s.answers))
                .filter(q => {
                    const value = s.answers[q.id];
                    return Array.isArray(value) ? !value.length : (value === undefined || value === null || value === '');
                });
            if (missing.length) return `Ответьте на обязательные вопросы: ${missing.map(q => q.label).join('; ')}`;
            return null;
        },
        description() {
            if ((Intake.state.description || '').trim().length < 10) return 'Опишите работу хотя бы одним предложением';
            return null;
        },
        budget() {
            if (!Intake.state.budgetRange) return 'Выберите диапазон бюджета (или «Not Sure»)';
            return null;
        },
        address() {
            const a = Intake.state.address;
            if (!a.street.trim()) return 'Укажите адрес — мастера его не увидят до выбора';
            if (!Utils.isValidZip(a.zip)) return 'Проверьте ZIP в адресе';
            return null;
        },
        contact() {
            const c = Intake.state.contact;
            if (!c.firstName.trim() || !c.lastName.trim()) return 'Укажите имя и фамилию';
            if (!Utils.isValidPhone(c.phone)) return 'Укажите корректный US номер телефона';
            if (!Utils.isValidEmail(c.email)) return 'Укажите корректный email';
            if (!Intake.state.serviceConsent) return 'Нужно согласие на сервисные сообщения по заявке';
            return null;
        }
    },

    // ----------------------------------------------------
    // Step mount logic (event wiring)
    // ----------------------------------------------------
    mounts: {
        zip() {
            const input = document.getElementById('zipInput');
            const hint = document.getElementById('zipHint');
            const result = document.getElementById('zipResult');

            const check = () => {
                const zip = input.value.replace(/\D/g, '').slice(0, 5);
                input.value = zip;
                Intake.state.zip = zip;
                Intake.state.location = null;
                result.innerHTML = '';
                hint.textContent = '';
                if (zip.length !== 5) { Intake.save(); return; }
                const location = Store.lookupZip(zip);
                if (!location) {
                    hint.innerHTML = '<span style="color:var(--danger)">ZIP не найден в базе. Проверьте код.</span>';
                } else {
                    Intake.state.location = location;
                    const ok = Store.isServiceable(location);
                    result.innerHTML = ok
                        ? `<div class="ai-panel" style="border-color:var(--success); background:var(--success-bg)">
                             <b style="color:#047857"><i class="fas fa-circle-check"></i> Great! We serve your area.</b><br>
                             <span class="small">${location.city} · ${location.county} · ${location.state === 'PA' ? 'Pennsylvania' : location.state}</span></div>`
                        : `<div class="ai-panel" style="border-color:var(--warning); background:var(--warning-bg)">
                             <b style="color:#b45309"><i class="fas fa-clock"></i> Мы пока не запустились в вашем районе</b><br>
                             <span class="small">${location.city} · ${location.county}. Оставьте телефон — сообщим о запуске.</span>
                             <div class="field mt-1"><input class="input" id="waitPhone" inputmode="tel" placeholder="+1 (___) ___-____"></div>
                             <button class="btn btn-primary btn-sm" id="waitBtn">Сообщить о запуске</button></div>`;
                    const waitBtn = document.getElementById('waitBtn');
                    if (waitBtn) waitBtn.onclick = () => {
                        const phone = document.getElementById('waitPhone').value;
                        if (!Utils.isValidPhone(phone)) return Utils.toast('Укажите корректный телефон', 'danger');
                        Store.addWaitlist({ zip, phone: Utils.formatPhone(phone), city: location.city, county: location.county, tracking: Intake.state.tracking });
                        Intake.state.waitlisted = true;
                        Utils.toast('Спасибо! Вы в списке ожидания (WAITLIST)', 'success');
                    };
                }
                Intake.save();
            };
            input.addEventListener('input', check);
            if (Intake.state.zip) check();
            document.getElementById('btnNext').onclick = () => {
                const error = Intake.validators.zip();
                if (error === 'WAITLIST') return Utils.toast('Этот район пока в списке ожидания — оставьте телефон выше', 'danger');
                if (error) return Utils.toast(error, 'danger');
                Intake.next();
            };
        },

        categories() { Intake.wireNext('categories'); },
        questions() { Intake.wireNext('questions'); },

        description() {
            const input = document.getElementById('descInput');
            const panel = document.getElementById('aiPanel');
            const runAssist = () => {
                Intake.state.description = input.value;
                Intake.save();
                const ai = Engine.assist(input.value, Intake.state.categories);
                if (!ai) { panel.innerHTML = ''; return; }
                const cats = ai.detectedCategories.map(Engine.categoryLabel);
                panel.innerHTML = `
                    <div class="ai-panel">
                        <h5><i class="fas fa-wand-magic-sparkles"></i> AI Project Assistant</h5>
                        ${cats.length ? `<div><b>Похоже на:</b> ${cats.map(Utils.escapeHtml).join(', ')}</div>` : ''}
                        ${ai.scope ? `<div><b>Scope:</b> ${Utils.escapeHtml(ai.scope)}</div>` : ''}
                        ${ai.tradesNeeded.length ? `<div><b>Trades needed:</b> ${ai.tradesNeeded.map(Utils.escapeHtml).join(', ')}</div>` : ''}
                        ${ai.missingQuestions.length ? `<div class="mt-1"><b>Для более точного подбора мастера уточните ещё ${ai.missingQuestions.length} вопрос(а):</b>
                            <ul>${ai.missingQuestions.map(q => `<li>${Utils.escapeHtml(q)}</li>`).join('')}</ul></div>` : ''}
                        <div class="small muted mt-1">AI помогает структурировать заявку и не выдаёт официальный estimate.</div>
                    </div>`;
            };
            let timer;
            input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(runAssist, 500); });
            runAssist();
            Intake.wireNext('description');
        },

        media() {
            document.getElementById('photoInput').addEventListener('change', e => Intake.addFiles(e.target.files, 'photo'));
            document.getElementById('videoInput').addEventListener('change', e => Intake.addFiles(e.target.files, 'video'));
            document.getElementById('docInput').addEventListener('change', e => Intake.addFiles(e.target.files, 'document'));
            Intake.wireNext();
        },

        budget() { Intake.wireNext('budget'); },

        address() {
            const grab = () => {
                Intake.state.address = {
                    street: document.getElementById('addrStreet').value,
                    unit: document.getElementById('addrUnit').value,
                    city: document.getElementById('addrCity').value,
                    state: 'PA',
                    zip: document.getElementById('addrZip').value
                };
                Intake.save();
            };
            Utils.els('#addrStreet, #addrUnit, #addrCity, #addrZip').forEach(el => el.addEventListener('change', grab));
            document.getElementById('btnNext').onclick = () => {
                grab();
                const error = Intake.validators.address();
                if (error) return Utils.toast(error, 'danger');
                Intake.next();
            };
        },

        contact() {
            const grab = () => {
                Intake.state.contact = {
                    firstName: document.getElementById('ctFirst').value.trim(),
                    lastName: document.getElementById('ctLast').value.trim(),
                    phone: document.getElementById('ctPhone').value.trim(),
                    email: document.getElementById('ctEmail').value.trim(),
                    language: document.getElementById('ctLang').value
                };
                Intake.state.serviceConsent = document.getElementById('ctConsent').checked;
                Intake.state.marketingConsent = document.getElementById('ctMarketing').checked;
                Intake.save();
            };
            Utils.els('#ctFirst, #ctLast, #ctPhone, #ctEmail, #ctLang, #ctConsent, #ctMarketing')
                .forEach(el => el.addEventListener('change', grab));
            document.getElementById('btnNext').onclick = () => {
                grab();
                const error = Intake.validators.contact();
                if (error) return Utils.toast(error, 'danger');
                Intake.sendOtp();
                Intake.next();
            };
        },

        otp() {
            const demo = document.getElementById('otpDemo');
            demo.textContent = Intake.otp.code || '——————';
            document.getElementById('otpResend').onclick = () => {
                const otpConf = Store.settings.otp;
                if (Intake.otp.sends >= otpConf.maxSendsPerHour) return Utils.toast('Слишком много отправок. Попробуйте позже (rate limit)', 'danger');
                if (Intake.otp.sentAt && (Date.now() - Intake.otp.sentAt) / 1000 < otpConf.resendCooldownSeconds) {
                    return Utils.toast(`Подождите ${otpConf.resendCooldownSeconds} секунд перед повторной отправкой`, 'danger');
                }
                Intake.sendOtp();
                demo.textContent = Intake.otp.code;
                Utils.toast('Код отправлен повторно', 'success');
            };
            document.getElementById('btnNext').onclick = () => {
                const otpConf = Store.settings.otp;
                const value = document.getElementById('otpInput').value.trim();
                if (Intake.otp.attempts >= otpConf.maxAttempts) return Utils.toast('Превышен лимит попыток. Запросите новый код', 'danger');
                if ((Date.now() - Intake.otp.sentAt) / 1000 > otpConf.ttlSeconds) return Utils.toast('Код истёк. Запросите новый', 'danger');
                Intake.otp.attempts += 1;
                if (value !== Intake.otp.code) {
                    document.getElementById('otpHint').innerHTML = '<span style="color:var(--danger)">Неверный код</span>';
                    return;
                }
                Intake.otp.verified = true;
                Utils.toast('Телефон подтверждён — PHONE VERIFIED', 'success');
                Intake.next();
            };
        },

        review() {
            document.getElementById('btnNext').onclick = () => Intake.submit();
        }
    },

    wireNext(validatorName = null) {
        const btn = document.getElementById('btnNext');
        if (!btn) return;
        btn.onclick = () => {
            if (validatorName) {
                const error = Intake.validators[validatorName]();
                if (error) return Utils.toast(error, 'danger');
            }
            Intake.next();
        };
    },

    sendOtp() {
        Intake.otp.code = String(Math.floor(100000 + Math.random() * 900000));
        Intake.otp.sentAt = Date.now();
        Intake.otp.attempts = 0;
        Intake.otp.sends += 1;
    },

    // ----------------------------------------------------
    // Submission (TЗ §36–§39, §42–§53)
    // ----------------------------------------------------
    submittedProjectId: null,

    submit() {
        const s = Intake.state;
        if (!Intake.otp.verified) { Utils.toast('Сначала подтвердите телефон', 'danger'); return Intake.go('otp'); }

        // Account auto-created from phone/email (TЗ §39)
        const customer = Store.upsertCustomer({
            firstName: s.contact.firstName,
            lastName: s.contact.lastName,
            phone: Utils.formatPhone(s.contact.phone),
            email: s.contact.email,
            language: s.contact.language,
            customerType: s.customerType,
            phoneVerified: true,
            serviceConsent: s.serviceConsent,
            marketingConsent: s.marketingConsent,
            leadSource: s.tracking.source,
            referredByCode: s.tracking.referralCode
        });
        Store.setSessionCustomer(customer.id);

        const location = s.location || Store.lookupZip(s.zip) || {};
        const property = Store.upsertProperty(customer.id, {
            street: s.address.street, unit: s.address.unit,
            city: s.address.city || location.city, county: location.county,
            state: 'PA', zip: s.address.zip || s.zip,
            lat: location.lat, lng: location.lng,
            propertyType: s.propertyType
        });

        const project = {
            id: Store.nextProjectId('PA'),
            customerId: customer.id,
            propertyId: property.id,
            zip: s.zip,
            location,
            customerType: s.customerType,
            propertyType: s.propertyType,
            categories: s.categories.slice(),
            primaryCategory: s.primaryCategory,
            answers: Object.assign({}, s.answers),
            description: s.description,
            stage: s.stage,
            timeline: s.timeline,
            budgetRange: s.budgetRange,
            financingInterest: s.financingInterest,
            address: Object.assign({}, s.address, { county: location.county }),
            contact: Object.assign({}, s.contact, { phone: Utils.formatPhone(s.contact.phone) }),
            phoneVerified: true,
            emailVerified: false,
            tracking: s.tracking,
            status: 'submitted',
            meta: {
                fillSeconds: Math.round((Date.now() - new Date(s.startedAt).getTime()) / 1000),
                honeypot: !!(document.getElementById('hpField') || {}).value,
                otpAttempts: Intake.otp.attempts
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Duplicate project detection (TЗ §46) — offer to update the existing one
        const duplicate = Engine.findDuplicate(project);
        if (duplicate && !Intake._duplicateConfirmed) {
            if (confirm(`У вас уже есть активный похожий проект (${duplicate.id}). Хотите обновить его вместо создания нового?\n\nOK — обновить существующий, Cancel — создать новый.`)) {
                Store.updateProject(duplicate.id, {
                    description: project.description,
                    answers: project.answers,
                    budgetRange: project.budgetRange,
                    timeline: project.timeline
                }, 'customer', 'Updated via duplicate intake');
                Store.notify({ audience: 'customer', customerId: customer.id, projectId: duplicate.id,
                    channels: ['sms', 'email', 'in-app'], event: 'project-updated',
                    text: `Проект ${duplicate.id} обновлён по вашей новой заявке.` });
                Store.clearDraft();
                Intake.submittedProjectId = duplicate.id;
                Intake.state.step = 'done';
                Intake.render();
                return;
            }
            Intake._duplicateConfirmed = true;
        }

        // Derived scoring — persisted for CRM (TЗ §28, §42–§45, §51–§53)
        Store.createProject(project);
        s.media.forEach(item => Store.addMedia(Object.assign({ projectId: project.id }, item)));

        project.urgency = Engine.urgency(project);
        project.emergency = Engine.isEmergency(project);
        project.highValue = Engine.isHighValue(project);
        const lead = Engine.leadScore(project);
        const risk = Engine.riskScore(project);
        project.leadScore = lead.total;
        project.leadClass = lead.classification.label;
        project.riskLevel = risk.level;
        project.riskScore = risk.score;

        Store.setStatus(project.id, 'under-review', 'system', 'Auto: awaiting qualification');
        if (project.emergency) {
            Store.setStatus(project.id, 'under-review', 'system', 'URGENT: emergency project');
            project.urgent = true;
        }
        if (project.highValue) {
            Store.addTask({ projectId: project.id, type: 'call', priority: 'High',
                title: `CALL CUSTOMER — HIGH VALUE PROJECT (${project.id})` });
        }
        Store.updateProject(project.id, project, 'system', 'Scoring computed');

        // Notifications (TЗ §89)
        Store.notify({ audience: 'customer', customerId: customer.id, projectId: project.id,
            channels: ['sms', 'email', 'in-app'], event: 'project-submitted',
            text: `Заявка ${project.id} принята. Мы подбираем до ${Store.settings.maxContractorsPerProject} специалистов.` });
        Store.notify({ audience: 'admin', projectId: project.id, event: 'new-project',
            text: `Новая заявка ${project.id}: ${Engine.categoryLabel(project.primaryCategory)}, ${project.zip}` });
        // Simulated email verification link (TЗ §34) — does not block the flow
        Store.notify({ audience: 'customer', customerId: customer.id, projectId: project.id,
            channels: ['email'], event: 'email-verification',
            text: 'Подтвердите email по ссылке из письма (не блокирует заявку).' });

        Store.refreshCustomerStatus(customer.id);
        Store.clearDraft();
        Intake.submittedProjectId = project.id;
        Intake.state.step = 'done';
        Intake.render();
    }
};

document.addEventListener('DOMContentLoaded', Intake.init);
