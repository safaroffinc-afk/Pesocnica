# ТЕХНИЧЕСКОЕ ЗАДАНИЕ №3

## Matching Engine и распределение заявок

**Проект:** «Стройка и Ремонт — Филадельфия и Пенсильвания» / Construction Marketplace Pennsylvania
**Версия:** 1.0
**Назначение:** постановка задачи разработчикам backend, CRM и алгоритмической части
**Связанные модули:** ТЗ №1 — Contractor Acquisition & Onboarding, ТЗ №2 — Customer Acquisition & Project Intake
**Основная цель:** для каждой квалифицированной заявки автоматически подобрать 3–5 наиболее подходящих проверенных подрядчиков, распределить между ними лид по настраиваемым правилам, добиться быстрого ответа и смет — и учиться на результатах.

---

## 1. Главная бизнес-задача

Matching Engine — технологическое ядро платформы. Он превращает два потока:

```text
Qualified Project (модуль №2)  +  Verified Contractor Database (модуль №1)
                          ↓
                    3–5 Matches
                          ↓
              Invitations → Interested → Quotes
                          ↓
                 Contractor Selected
```

Модуль должен:

1. принимать квалифицированную заявку из CRM;
2. применять жёсткие фильтры (hard filters) к базе подрядчиков;
3. считать Match Score по настраиваемым весам;
4. ранжировать кандидатов и выбирать 3–5;
5. рассылать приглашения по выбранной модели распределения;
6. собирать ответы Interested / Pass / Timeout;
7. автоматически довыдавать лид следующим кандидатам (re-issue);
8. соблюдать правила exclusive / shared lead;
9. защищать платформу от обхода (антиобход);
10. отдавать полную аналитику и объяснение каждого решения;
11. обучаться на исторических результатах.

## 2. Ключевые принципы

* **Никогда не рассылать заявку десяткам подрядчиков.** Максимум — настройка `maxContractorsPerProject` (по умолчанию 5).
* **Каждое решение объяснимо.** Для любого подрядчика система может показать: почему включён / исключён и из чего сложился его score. Никаких «чёрных ящиков» в проде.
* **Фильтры — жёсткие, score — мягкий.** Hard filter никогда не компенсируется высоким score.
* **Скорость.** Один прогон матчинга ≤ 5 секунд на базе до 10 000 подрядчиков.
* **Идемпотентность.** Повторный запуск с теми же входными данными не создаёт дублей приглашений.

## 3. Глоссарий

| Термин | Значение |
|---|---|
| Match Run | один прогон движка по одной заявке |
| Candidate | подрядчик, прошедший hard filters, со score |
| Exclusion | подрядчик, отсечённый фильтром, с кодом причины |
| Invitation | приглашение подрядчику по заявке |
| Allocation | факт «лид выдан подрядчику» (для биллинга и лимитов) |
| Re-issue | довыдача лида следующим кандидатам |
| Waterfall | поочерёдная выдача (по одному/пачками по рангу) |
| Broadcast | одновременная выдача всем выбранным |
| Exclusive lead | лид, выданный только одному подрядчику |
| Shared lead | лид, выданный нескольким (стандарт: 3–5) |
| Coverage gap | ZIP/категория, где кандидатов меньше минимума |

## 4. Место в архитектуре

Matching Engine — отдельный сервис (или модуль монолита) со своим API и своей БД-схемой. Он **не** владеет данными заявок и подрядчиков — читает их снапшотами, а наружу отдаёт события.

```text
CRM (Qualification)
      │  POST /match-runs        (см. §40)
      ▼
┌──────────────────────────────┐
│        MATCHING ENGINE       │
│  Hard Filters → Scoring →    │
│  Ranking → Distribution      │
└──────────────────────────────┘
      │ события (см. §43)
      ▼
Notifications · Contractor App · CRM · Analytics
```

## 5. Триггеры запуска Match Run

1. **Авто:** заявка получила статус `qualified` (событие из модуля №2) и `autoMatch = true` в настройках.
2. **Ручной:** Admin нажал Send to Matching в CRM.
3. **Re-run:** админ повторно запускает после правки заявки (старые незакрытые приглашения корректно отменяются, ответившие — сохраняются, см. §37).
4. **Re-issue:** внутренний триггер по Pass/Timeout/недобору (§34–§36).
5. **Emergency:** заявка с флагом `urgent` запускается немедленно, вне очереди (§38).

Каждый запуск создаёт запись `MatchRun` с полным снапшотом входных данных — прогон можно воспроизвести.

## 6. Входные данные заявки

Снапшот из модуля №2 (payload в §40):

Project ID, ZIP, lat/lng, county; primary category + secondary categories (trades); budget range (min/max/unknown); timeline и urgency (High/Medium/Low, emergency flag); property type; customer type; язык клиента; количество фото; описание (для similar work); флаги highValue, riskLevel; предпочтения клиента (если есть: язык, «только licensed» и т.п.).

**Правило:** заявка с `riskLevel = Risk High` в авто-матчинг не попадает — только вручную после проверки админом.

## 7. Входные данные подрядчика

Снапшот из модуля №1:

account status (active/paused/suspended/banned); verification (verified, licensed, insured, background check) + сроки действия документов; trades; service area (counties, radius от home ZIP, в будущем полигоны); min/max job; availability (available-now / available / busy / on-vacation); Trust Score 0–100; rating и количество отзывов; completed projects, specialties, portfolio; languages; response history (response rate, avg response minutes, acceptance rate, win rate); текущая загрузка лидами (active invitations, active jobs); тариф/подписка (влияет на лимиты, не на score — см. §26); флаги нарушений (антиобход, споры).

---

# HARD FILTERS

## 8. Общие правила фильтров

* Применяются строго до скоринга, в фиксированном порядке (§16).
* Каждый отсев пишется в `MatchExclusion {contractorId, filterCode, details}`.
* Фильтры конфигурируются админом (вкл/выкл, параметры), кроме помеченных «неотключаемый».

## 9. Фильтр: Account Status *(неотключаемый)*

Проходят только `active`. `paused` — по желанию подрядчика; `suspended/banned` — никогда. Код: `ACCOUNT_STATUS`.

## 10. Фильтр: Required Verification *(неотключаемый)*

`verification.verified = true` обязательно. Если у категории `requiresLicense = true` (Electrical, Plumbing, HVAC, Roofing — список настраивается) → обязателен действующий license (дата истечения проверяется). Просроченная страховка при `insuranceRequired = true` — отсев. Коды: `NOT_VERIFIED`, `LICENSE_REQUIRED`, `LICENSE_EXPIRED`, `INSURANCE_EXPIRED`.

## 11. Фильтр: Trade

Primary trade заявки обязан входить в `contractor.trades`. Secondary trades primary-фильтр не заменяют (они учитываются в score, §19). Код: `TRADE_MISMATCH`.

## 12. Фильтр: Service Area / География

Подрядчик проходит, если выполняется **любое** из:

1. county объекта ∈ `serviceCounties`;
2. distance(объект, home ZIP) ≤ `radiusMiles` (haversine);
3. (later) точка внутри service-полигона.

Расстояние считается по lat/lng ZIP-центроидов (MVP) с переходом на геокодинг адреса. Код: `OUT_OF_AREA`.

## 13. Фильтр: Minimum / Maximum Job

При известном бюджете `[bMin, bMax]`: отсев если `bMax < minJob` (код `BUDGET_BELOW_MIN`) или `bMin > maxJob` (код `BUDGET_ABOVE_MAX`). Бюджет Not Sure / Prefer to discuss фильтр не активирует — учитывается только в score (§21).

## 14. Фильтр: Availability

* `emergency = true` → только `available-now` (код `NOT_AVAILABLE_NOW`);
* `urgency = High` → отсекается `busy` и `on-vacation` (код `BUSY`);
* иначе `busy` проходит фильтр, но штрафуется в score.

## 15. Фильтр: Capacity (лимиты загрузки)

Настраиваемые пределы: `maxActiveInvitations` (по умолч. 10), `maxLeadsPerDay` (по умолч. 5), опционально `maxActiveJobs`. Превышение — код `CAPACITY_REACHED`. Цель — не заваливать сильных подрядчиков и не оставлять клиентов без ответа.

## 16. Порядок применения и объяснимость

```text
ACCOUNT_STATUS → VERIFICATION → TRADE → SERVICE_AREA →
MIN/MAX_JOB → AVAILABILITY → CAPACITY → RISK_FLAGS
```

`RISK_FLAGS`: активное расследование антиобхода или открытый спор с этим же клиентом (код `RISK_HOLD`). В CRM карточка Match Run показывает полный список исключённых с причинами.

## 17. Пустой или тонкий результат

Если кандидатов < `minContractorsPerProject` (по умолч. 3):

1. авто-расширение: `radiusBoostMiles` (+10 mi, до 2 шагов) и соседние counties из настроек — **только** для географии; verification/trade/бюджет не ослабляются никогда;
2. если всё ещё < min — выдаётся сколько есть, событие `match.thin`, алерт админу;
3. если 0 — заявка возвращается в `qualified`, событие `match.empty`, алерт High priority, ручная обработка;
4. каждый случай пишется в Coverage Gaps (§48) как сигнал модулю привлечения подрядчиков.

---

# MATCH SCORE

## 18. Формула

```text
MatchScore = Σ ( weight_i × ratio_i ) / Σ weight_i × 100      // 0..100
ratio_i ∈ [0..1]
```

Веса — в админке (§44), по умолчанию:

| Компонент | Вес |
|---|---|
| Trade Match | 25 |
| Location | 20 |
| Trust Score | 20 |
| Budget Fit | 10 |
| Availability | 10 |
| Similar Work | 5 |
| Response History | 5 |
| Language Preference | 5 |

Каждый компонент прогона сохраняется в breakdown кандидата — CRM показывает разбор.

## 19. Trade Match (25)

```text
если secondary trades отсутствуют:      ratio = 1.0
иначе: ratio = 0.7 + 0.3 × (покрытые secondary / все secondary)
```

Подрядчик, закрывающий и плитку, и сантехнику в bathroom remodel, ценнее узкого.

## 20. Location (20)

```text
d = расстояние до объекта, R = радиус подрядчика
ratio = clamp(1 − 0.9 × d / R, 0, 1);   d ≤ 5 mi → ratio = 1.0
```

При отсутствии координат (вошёл по county) — ratio = 0.5.

## 21. Budget Fit (10)

```text
известный бюджет [bMin,bMax]:
  overlap = min(bMax, maxJob) − max(bMin, minJob)
  ratio = clamp(overlap / (bMax − bMin), 0, 1)
Not Sure / Prefer to discuss: ratio = 0.6
```

## 22. Trust Score (20)

`ratio = trustScore / 100`. Trust Score считается модулем №1 (verification, verified reviews, споры, стаж на платформе) и обновляется событиями отсюда (§50).

## 23. Availability (10)

available-now → 1.0; available → 0.8; busy → 0.3.

## 24. Similar Work (5)

```text
ratio = clamp( 0.6 × specialtyMatch + min(0.4, completedProjects / 250), 0, 1 )
specialtyMatch = 1 если категория заявки пересекается со specialties
```

Later: TF-IDF/embedding-похожесть описания заявки на портфолио.

## 25. Response History (5)

```text
ratio = 0.7 × responseRate + 0.3 × clamp(1 − avgResponseMinutes / 120, 0, 1)
```

Новичок без истории (< 5 приглашений): ratio = 0.6 (нейтрально, чтобы не хоронить новых — см. §31).

## 26. Language Preference (5)

Язык клиента ∈ languages подрядчика → 1.0, иначе 0.4.

**Запрещено:** платный тариф подрядчика не может влиять на score. Монетизация — через лимиты/фичи, не через искажение подбора. Это правило продукта, неотключаемое.

## 27. Ранжирование и tie-breakers

Сортировка: score DESC → distance ASC → avgResponseMinutes ASC → меньше активных приглашений. Кандидаты ниже `minMatchScore` (по умолч. 35) в выдачу не попадают даже при недоборе — лучше thin-алерт, чем плохой мастер.

---

# РАСПРЕДЕЛЕНИЕ (DISTRIBUTION)

## 28. Количество

`minContractorsPerProject = 3`, `maxContractorsPerProject = 5` (админ-настройка, глобально и per-category). Выдача — top-N по рангу с учётом §29–§31.

## 29. Anti-monopoly cap

Один подрядчик не может держать > `maxOpenInvitesPerZipCategory` (по умолч. 3) открытых приглашений в одной паре ZIP×category. При превышении место получает следующий по рангу. Цель — не отдавать весь район одному игроку.

## 30. Exclusive / Shared lead

* **Shared (стандарт):** лид уходит 3–5 подрядчикам, все это знают (в приглашении: «до N специалистов»).
* **Exclusive:** лид только одному. Разрешён когда: (а) High Value / PM-режим (§39); (б) кандидат ровно один; (в) премиум-правило админа для категории/зоны (например, exclusive первые 2 часа, затем shared). Exclusive всегда с коротким TTL (по умолч. 2 ч), затем авто-переход в shared.
* Тип фиксируется в `LeadAllocation.type` — важно для биллинга.

## 31. Fairness / Exploration quota

`explorationShare` (по умолч. 10%): в среднем в одном из десяти прогонов один слот из N отдаётся случайному кандидату из «новичков» (прошёл фильтры, score ≥ minMatchScore, < 5 исторических приглашений). Иначе новые подрядчики никогда не наберут историю. Слот помечается `slotType = exploration` для честной аналитики.

## 32. Модели выдачи

Настройка `distributionMode` (глобально + per-category + per-urgency):

1. **Broadcast (MVP, по умолчанию):** все N приглашений уходят одновременно; у каждого TTL на ответ.
2. **Waterfall:** пачками по `batchSize` (1–2) по рангу; следующая пачка — по Pass/Timeout всех в текущей или по `batchIntervalMinutes`. Меньше шума подрядчикам, дольше для клиента — не применять при urgency High.
3. **Hybrid:** urgency High → broadcast; Low → waterfall. Правило — таблицей в настройках.

## 33. Invitation: содержимое и приватность

Подрядчик видит: project type + категории; ZIP, город, **примерное** расстояние; budget range; timeline/urgency; краткое описание (маскированное от контактов — фильтр §46 применяется и к описанию клиента); превью фото (с водяным знаком платформы, §46); Match Score; тип лида (shared «до N» / exclusive); TTL ответа.

Подрядчик **не** видит до выбора его клиентом: полный адрес, имя целиком (только имя + первая буква фамилии), телефон, email. Точные правила раскрытия — настройка админа (модуль №2 §95).

## 34. TTL и ответы

`invitationTtlHours`: по умолчанию 4 ч (emergency — 1 ч, планируемые проекты — 12 ч; таблица per-urgency). Ответы:

* **INTERESTED** → уведомление клиенту, подрядчик получает доступ к чату и подаче quote;
* **PASS** + причина (Too Far / Budget Too Low / Too Busy / Not My Trade / Too Large / Too Small / Other) — причина обязательна, идёт в learning (§49);
* **TIMEOUT** — авто-статус по истечении TTL; портит response history.

## 35. Re-issue (повторная выдача)

Триггер: Pass или Timeout освободил слот, и активных приглашений < N, и есть неприглашённые кандидаты.

```text
loop (не чаще 1 раза в 10 минут на проект):
  released = N − activeInvitations(project)
  next = следующие по рангу, не приглашённые ранее
  выдать min(released, len(next)) приглашений
until: набрано ≥ minInterested (по умолч. 2 interested)
       или итераций > maxReissueRounds (по умолч. 3)
       или кандидаты кончились
```

Кандидаты кончились + interested = 0 → событие `match.exhausted`, алерт админу, статус заявки `qualified` + пометка «нужен ручной подбор». Одному подрядчику один и тот же проект повторно не выдаётся (исключение: админ вручную, §45).

## 36. Отмена приглашений

Приглашения аннулируются (push «проект закрыт») когда: клиент выбрал подрядчика; заявка отменена/спам; re-run с изменёнными критериями сделал кандидата невалидным. Отменённое приглашение не портит response history.

## 37. Re-run после правки заявки

Пересчёт фильтров и score. Ответившие INTERESTED сохраняются, если проходят новые hard filters (иначе — уведомление и отмена). Не ответившие — отменяются и заменяются новой выдачей. Всё в аудит.

## 38. Emergency-режим

`urgent = true`: очередь с приоритетом; только available-now; TTL 1 ч; broadcast всегда; при отсутствии available-now — немедленный алерт админу + Call Task (обзвон вручную).

## 39. High Value / PM-режим

`highValue = true` (бюджет > порога, Whole House, Commercial): авто-рассылка отключается настройкой `highValueManualMatch` (по умолч. true). Движок готовит кандидатов и score, но приглашения отправляет Project Manager вручную (может добавить/убрать кандидата с указанием причины — в аудит). Возможен exclusive.

---

# API И ДАННЫЕ

## 40. Запуск прогона

```http
POST /api/v1/match-runs
{
  "projectId": "PA-2026-000154",
  "trigger": "auto | admin | reissue | rerun",
  "requestedBy": "system | userId",
  "overrides": { "maxContractors": 5, "distributionMode": "broadcast" } // опционально, только admin
}
→ 202 { "matchRunId": "mr_...", "status": "processing" }
```

Идемпотентность: `Idempotency-Key`; активный прогон по проекту — 409.

```http
GET /api/v1/match-runs/{id}
→ {
  "status": "completed",
  "projectSnapshot": { ... },
  "candidates": [
    { "contractorId": "C-1001", "score": 90, "rank": 1, "distanceMiles": 4.2,
      "slotType": "rank | exploration",
      "breakdown": [ { "key": "trade", "max": 25, "points": 25 }, ... ],
      "invited": true }
  ],
  "exclusions": [
    { "contractorId": "C-1013", "filterCode": "BUDGET_ABOVE_MAX", "details": "maxJob 8000 < bMin 10000" }
  ],
  "thin": false, "settingsSnapshot": { ...весёи лимиты на момент прогона... }
}
```

## 41. Приглашения

```http
GET  /api/v1/contractors/{id}/invitations?status=active
POST /api/v1/invitations/{id}/respond
     { "response": "interested" }  |  { "response": "pass", "reason": "budget_too_low" }
```

Ответ по истёкшему приглашению — 410 Gone.

## 42. Сущности (дополнение к §97 ТЗ №2)

```text
MatchRun            id, projectId, trigger, status, startedAt, finishedAt,
                    projectSnapshot, settingsSnapshot
MatchCandidate      matchRunId, contractorId, score, rank, breakdown[],
                    distanceMiles, slotType, invited
MatchExclusion      matchRunId, contractorId, filterCode, details
ContractorInvitation id, projectId, matchRunId, contractorId, matchScore,
                    leadType(shared|exclusive), status(invited|interested|
                    passed|timeout|cancelled), passReason, sentAt, expiresAt,
                    respondedAt
LeadAllocation      id, invitationId, contractorId, projectId, type, billedAt?
DistributionPolicy  scope(global|category|zone), mode, batchSize, ttlHours, caps
CoverageGap         zip, county, category, date, candidatesFound, needed
MatchOutcome        projectId, invitedIds[], interestedIds[], quotedIds[],
                    selectedId?, completed?, reviewScore?   // для обучения
```

Все действия — в общий Audit Log (кто запустил, кто перекрыл, что изменилось).

## 43. События (queue / webhooks)

```text
match.completed { matchRunId, projectId, invited: n }
match.thin | match.empty | match.exhausted
invitation.sent | invitation.responded | invitation.expired | invitation.cancelled
lead.allocated { contractorId, type }        // для биллинга
coverage.gap { zip, category }
```

Потребители: Notifications (SMS/push подрядчику ≤ 60 сек после `invitation.sent`), CRM, Analytics, Billing.

## 44. Админ-настройки (без разработчика)

Веса Match Score (сумма валидируется ≈ 100); min/max contractors (глобально, per-category); `minMatchScore`; `distributionMode` + таблица per-category/urgency; TTL per-urgency; batch size/interval; radius boost; capacity-лимиты; anti-monopoly cap; exploration share; exclusive-правила; `highValueManualMatch`; список licensed categories; SLA-пороги. Каждое изменение — versioned (прогон хранит снапшот настроек).

## 45. Ручное управление админом

Добавить подрядчика в выдачу мимо score (но **не** мимо неотключаемых фильтров §9–§10) — с обязательной причиной; убрать кандидата; форс re-issue; сменить режим на конкретном проекте; отменить прогон. Всё в аудит.

---

# АНТИОБХОД И БЕЗОПАСНОСТЬ

## 46. Антиобход платформы

1. **Маскирование до выбора:** телефоны, email, URL, соцсети — в чате, описании заявки и quote-комментариях (regex + нормализация «двa один пять...», later ML).
2. **Водяные знаки** на фото в приглашениях до выбора.
3. **Детект:** N маскирований у пары контрагентов → флаг `bypass_suspect`; interested без quote и без чата, с последующей отменой заявки клиентом — сигнал.
4. **Санкции (настраиваемо):** предупреждение → понижение Trust Score → suspended. Решение принимает админ, движок только флагует.
5. **Экономика удержания:** verified review, Trust Score и повторные лиды доступны только по сделкам через платформу.

## 47. Security / privacy

RBAC (движок пишут только system + admin-роли); PII подрядчику — только по правилам §33; полные снапшоты прогонов — 12 месяцев, дальше агрегаты; rate limiting на respond-endpoint; audit log неизменяем (append-only).

## 48. Coverage Gaps → рост базы

Каждый thin/empty прогон пишет CoverageGap. Еженедельный отчёт: топ ZIP×category с дефицитом → задача модулю №1 (таргетинг рекрутинга подрядчиков). Это замыкает связку модулей.

---

# ОБУЧЕНИЕ НА ИСТОРИИ

## 49. Learning loop (поэтапно)

**Этап A (MVP):** обновление фактических метрик подрядчика после каждого исхода — responseRate, avgResponseMinutes, acceptance rate, win rate (selected/invited), причины Pass. Budget Too Low систематически → подсказка админу поднять minJob подрядчика. Формула score не меняется.

**Этап B:** офлайн-аналитика: корреляция компонентов score с исходами (quote rate, win rate, review score) по `MatchOutcome`; рекомендации по весам; A/B двух наборов весов (сплит по прогонам, метрика — quote rate и time-to-first-interest).

**Этап C (later):** ML-модель P(quote | contractor, project) как замена ручных весов — только при объёме ≥ ~2000 исходов, с обязательной объяснимостью (feature importance в карточке) и kill-switch на возврат к весам.

**Запрещено обучаться на:** расе/национальности/поле владельца, любых прокси к ним; тарифе подрядчика.

## 50. Обратная связь в Trust Score

События движка, влияющие на Trust Score (формула — в модуле №1): timeout'ы понижают; выигранные и завершённые проекты с review ≥ 4 повышают; подтверждённый bypass — сильное понижение.

---

# КАЧЕСТВО И ПРИЁМКА

## 51. SLA и алерты

* qualification → invitations: ≤ 1 ч (авто-режим: ≤ 1 мин);
* invitation.sent → уведомление подрядчику: ≤ 60 сек;
* первый interested: цель ≤ 4 ч — иначе алерт;
* нет ни одного interested за 12 ч → алерт; нет quote за 48 ч → алерт (пороги — настройки).

## 52. Метрики дашборда матчинга

Match rate (% qualified c ≥ 3 приглашениями); avg candidates per run; acceptance rate (interested/invited); timeout rate; time-to-first-interest / first-quote; quote rate; win rate по подрядчикам; распределение причин Pass; thin/empty count; exploration-слоты и их исходы; coverage gaps.

## 53. Тестирование

1. **Unit:** каждый hard filter и каждый компонент score — таблицы граничных случаев (бюджет на границе minJob, объект ровно на радиусе, просроченный license…).
2. **Golden set:** ≥ 30 эталонных пар «заявка → ожидаемый ранжированный список» в фикстурах; прогоняется в CI; изменение выдачи требует осознанного обновления фикстур.
3. **Симуляция:** генератор 1000 синтетических заявок по реальной географии — проверка распределения нагрузки (нет монополии), доли thin, производительности.
4. **Идемпотентность и гонки:** двойной POST, одновременный respond и cancel.

## 54. Acceptance Criteria

Модуль готов, когда:

* qualified заявка автоматически получает 3–5 приглашений ≤ 1 минуты;
* ни один подрядчик не получает заявку мимо hard filters, каждый отсев объясним кодом;
* score любого кандидата раскладывается на компоненты в CRM;
* подрядчик отвечает Interested/Pass (с причиной), timeout проставляется сам;
* Pass/Timeout запускают re-issue по правилам §35 с лимитами;
* exclusive/shared фиксируются в allocation;
* thin/empty дают алерт и CoverageGap;
* контакты и адрес скрыты до выбора, маскирование работает в чате;
* админ меняет веса/лимиты/режимы без разработчика, прогоны хранят снапшот настроек;
* повторный запуск не создаёт дублей;
* метрики §52 доступны на дашборде.

## 55. MVP-объём

**В MVP:** hard filters §9–§15; score §18–§26 с ручными весами; broadcast; shared lead; TTL + Interested/Pass/Timeout; re-issue; emergency-режим; ручной PM-режим для High Value; маскирование контактов; MatchRun/Exclusion/Invitation + аудит; настройки весов и лимитов; метрики базово; learning этап A.

**Не в MVP:** waterfall/hybrid; exclusive-биллинг; полигоны service area; ML-similar-work и этап C; водяные знаки (можно этапом 2); A/B весов.

## 56. Следующий модуль

**ТЗ №4 — Quotes, Site Visits & Deal Flow:** структура смет и их сравнение, календарь осмотров, переговоры в чате, фиксация сделки и стоимости (основа для Total Project Value и будущего биллинга), договорные документы.

---

## Приложение А. Референс-реализация в этом репозитории

Прототип уже реализует ядро этого ТЗ и служит исполняемой спецификацией:

| Раздел ТЗ | Код |
|---|---|
| Hard filters §9–§14 | `marketplace/assets/engine.js` → `Engine.hardFilter()` |
| Score §18–§26 | `Engine.matchScore()` (breakdown по компонентам) |
| Ранжирование, top-N §27–§28 | `Engine.match()` |
| Invitations, privacy §33 | `store.js` → `saveMatches()`, `contractor.js` |
| Interested/Pass §34 | `Store.respondToInvitation()` + причины Pass |
| Маскирование §46 | `Store.maskMessage()` |
| Настройки §44 | `Config.defaultSettings` + Admin → Settings |
| Тесты §53 | `marketplace/tests/smoke.js` (фильтры, ранжирование, emergency) |

Расхождения прототипа с ТЗ (capacity-лимиты, TTL/timeout, re-issue, exploration, MatchRun-персистентность) — предмет разработки по этому документу.
