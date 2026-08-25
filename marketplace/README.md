# Customer Acquisition & Project Intake — «Стройка и Ремонт PA»

Реализация ТЗ «Модуль сбора заказчиков и заявок» (Construction Marketplace
Pennsylvania, v1.0) как работающего прототипа на чистом HTML/CSS/JS —
без сборки и бэкенда. Данные хранятся в `localStorage`, поэтому весь цикл
**ЗАЯВКА → МАСТЕР → QUOTE → ВЫБОР → РАБОТА → ОТЗЫВ** можно пройти в браузере
от начала до конца.

## Запуск

```bash
python -m http.server 8000
# затем откройте http://localhost:8000/marketplace/
```

## Страницы

| Страница | Роль | Что реализует |
|---|---|---|
| `index.html` | Заказчик | Landing Page: «НУЖЕН МАСТЕР?», CTA по источнику трафика, UTM-передача (§4, §5) |
| `intake.html` | Заказчик | Project Intake Flow: 14 шагов, mobile-first, автосохранение (§6–§39) |
| `dashboard.html` | Заказчик | Кабинет: проекты, matches, quotes, сравнение, выбор, прогресс, Verified Review, referral (§40, §60–§76) |
| `contractor.html` | Мастер (демо) | Приглашения без контактов клиента, Interested/Pass, quotes, site visit, change orders (§58–§69) |
| `admin.html` | Admin | CRM: очередь заявок, Lead/Risk Score, Admin Actions, Matching, Questionnaire Builder, Settings, Audit Log (§47–§52, §19, §82–§98) |

## Архитектура (`assets/`)

| Файл | Содержимое |
|---|---|
| `config.js` | Справочники: ZIP-база (Philadelphia/Bucks/Montgomery + соседние для WAITLIST), источники лидов, категории, бюджеты, сроки, статусы, дефолтные настройки, вопросы анкет |
| `store.js` | Слой данных: все API-сущности из §97 как коллекции в localStorage, черновики, аудит, нотификации |
| `engine.js` | Бизнес-логика: Urgency, Lead Quality Score, Lead Classification, Fraud/Spam, дубликаты, AI Project Assistant, Matching Engine (hard filters + weights), SLA-алерты, воронка, маркетинговая аналитика |
| `intake.js` | Мастер заявки: один вопрос на экран, условная логика анкеты, загрузка фото/видео/документов, OTP, дубликаты при отправке |
| `dashboard.js` / `contractor.js` / `admin.js` | UI трёх ролей |
| `seed.js` | Verified Contractor Database (выход Модуля №1) — 16 демо-подрядчиков |
| `utils.js` | Хелперы: валидация, escaping (XSS), гео-дистанция, маскирование контактов, миниатюры |

## Ключевые механики

- **ZIP → сервисная зона** (§7–§8): город/каунти определяются автоматически;
  вне зоны запуска — форма WAITLIST.
- **Dynamic Questionnaire** (§13–§19): вопросы — данные, не код. Admin в
  Questionnaire Builder создаёт/меняет вопросы, порядок, обязательность и
  conditional logic (`showIf`). 12 типов полей. Fallback-набор для категорий
  без своих вопросов.
- **AI Project Assistant** (§21): структурирует свободный текст (категории,
  scope, trades, недостающие вопросы), estimate не выдаёт.
- **SMS OTP** (§33): без подтверждённого телефона заявка не уходит; TTL,
  лимит попыток, cooldown, rate limit. SMS-шлюз в демо не подключён — код
  показывается на экране.
- **Lead Quality Score 0–100** (§42–§44) с настраиваемыми весами и
  классификацией HIGH QUALITY / QUALIFIED / NEEDS REVIEW / INCOMPLETE.
- **Fraud & Spam** (§45): honeypot, скорость заполнения, дубликаты
  телефона/email/проекта, одноразовые email, fake ZIP → Risk Low/Medium/High.
- **Matching Engine** (§54–§57): hard filters (area, trade, min/max job,
  verification, licensed trades, availability, account status) + весовой
  Match Score (trade 25 / location 20 / trust 20 / budget 10 / availability 10 /
  similar 5 / response 5 / language 5). Максимум 3–5 приглашений, никогда
  массовой рассылки; при «тонком» матче — алерт админу.
- **Privacy** (§58, §95): до выбора подрядчик видит только ZIP/город/дистанцию;
  телефоны, email и ссылки в мессенджере маскируются (§64).
- **Lifecycle** (§41): 20 статусов с полной историей и Audit Log (§96).
- **SLA-мониторинг** (§90–§92): Time to Qualification/Match/Interest/Quote и
  алерты по просрочкам в CRM Dashboard.
- **Analytics** (§82–§86): KPI-плитки, воронка из 10 шагов, конверсии,
  разрез по источникам, Total Project Value Created.
- **HIGH VALUE / URGENT** (§51–§53): Budget $50K+ / Whole House / Commercial →
  флаг + Call Task; emergency-ответы анкеты → URGENT, матчинг только
  Available Now.

## Тесты

`tests/smoke.js` — 41 проверка логического слоя (Node, без браузера):

```bash
node marketplace/tests/smoke.js
```

Покрывают: ZIP/зоны, анкеты и conditional logic, Project ID, urgency,
Lead/Risk Score, AI assistant, hard filters и ранжирование, emergency-матчинг,
quotes → selection → completion → Verified Review, маскирование контактов,
воронку, аналитику источников, дубликаты, персистентность и SLA-алерты.

## Демо-сценарий (5 минут)

1. `index.html` → «ПОЛУЧИТЬ ПРЕДЛОЖЕНИЯ» → заполните заявку (ZIP `18901`,
   Bathroom Remodeling, бюджет $10K–$25K) → OTP с экрана → SUBMIT.
2. `admin.html` → Projects → откройте заявку → **Approve** →
   **Send to Matching** → «Симулировать ответы мастеров».
3. `dashboard.html` → сравните quotes → **SELECT CONTRACTOR**.
4. `contractor.html` → STARTED → MARK COMPLETE.
5. `dashboard.html` → подтвердите завершение → оставьте Verified Review.
6. `admin.html` → Dashboard: воронка дошла до Verified Review.

## Что осознанно вне прототипа (per §101)

Escrow, платежи, contractor financing, полноценный AI estimate, insurance
claims, native apps — а также реальные SMS/email-шлюзы, серверная
авторизация/RBAC и интеграция с внешним geo-API (ZIP-база демо-данная).
Следующий модуль по ТЗ — №3 Matching Engine (расширенное распределение,
exclusive/shared leads, антиобход, обучение на истории).
