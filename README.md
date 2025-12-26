# Stories Online

Веб‑приложение для создания и прохождения текстовых приключений с генерацией истории через LLM. Шаблоны приключений можно редактировать, публиковать, запускать для игроков и вести историю прохождения.

## Возможности

- Шаблоны приключений: локации, расы, системы и техники, фракции, события, персонажи и прочая информация.
- Запуск приключений (runs) из шаблонов с копированием всех сущностей.
- Настройка главного героя перед стартом.
- Экран игры с историей: ввод реплик/действий, генерация следующего шага, откат истории, регенерация последнего ответа, экспорт в PDF.
- Импорт/экспорт шаблонов в JSON.
- Модерация и публикация приключений (роли администратора).
- JWT‑аутентификация, вход по имени пользователя или email.

## Структура репозитория

```text
.
├── backend/              # Django + DRF API
├── frontend/             # React клиент
├── scripts/              # Скрипты резервного копирования БД
├── backups/              # Папка для дампов БД
├── docker-compose.yml
└── .env.example
```

## Быстрый старт через Docker

1) Скопируйте `.env.example` в `.env` и при необходимости обновите значения.

2) Соберите и запустите сервисы:

```bash
docker compose up --build
```

Сервисы поднимутся на `http://localhost:8000` (backend) и `http://localhost:3000` (frontend). Контейнер `db_backup` делает дамп при старте и далее ежедневно в 03:00, сохраняя файлы в `backups/`.

## Локальная разработка

### Backend

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt

cd backend
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Backend доступен на `http://localhost:8000/`.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm start
```

Frontend доступен на `http://localhost:3000/`.

## Конфигурация окружения

Основные переменные задаются в `.env` (см. `.env.example`).

- `REACT_APP_API_URL` — адрес API для фронтенда.
- `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `ALLOWED_ORIGINS` — базовые настройки Django.
- `POSTGRES_*` — параметры подключения к БД.
- `ACCESS_TOKEN_LIFETIME_MINUTES`, `REFRESH_TOKEN_LIFETIME_DAYS` — сроки жизни JWT.

### LLM

Поддерживаются несколько провайдеров (см. `backend/backend/llm.py`):

- `LLM_PROVIDER=local` — локальный echo‑клиент (по умолчанию, для разработки).
- `LLM_PROVIDER=openai-compatible` — OpenAI‑совместимый endpoint, нужны `LLM_BASE_URL` и `LLM_API_KEY`.
- `LLM_PROVIDER=ollama` — локальный Ollama сервер, нужен `OLLAMA_URL` и опционально `OLLAMA_MODEL`.
- `LLM_PROVIDER=yandex` — YandexGPT, нужны `YC_API_KEY`/`YANDEX_CLOUD_API_KEY` и `YC_FOLDER_ID`/`YANDEX_CLOUD_FOLDER`.

Дополнительно:
`LLM_MODEL`, `LLM_TEMPERATURE`, `LLM_MAX_TOKENS`, `LLM_TIMEOUT_SECONDS`.

## Администраторы и модерация

Доступ к страницам `/admin` и `/moderation` есть только у пользователей с профилем администратора (уровни 1+). Уровни администраторов можно назначать через Django admin или напрямую в БД, создавая запись `Administrator` для нужного пользователя.

## Основные маршруты UI

- `/` — список шаблонов, запусков и опубликованных приключений.
- `/adventures/:id/edit` — редактор шаблона приключения.
- `/adventures/runs/:id/edit` — редактор запущенного приключения.
- `/adventures/:id/hero` — создание главного героя.
- `/adventures/:id/play` — игровой экран с историей.
- `/admin` — управление администраторами (уровни доступа).
- `/moderation` — очередь модерации и опубликованные приключения.

## Минимальный сценарий

1) Создайте шаблон приключения на главной странице (`/`), заполните данные в редакторе (`/adventures/:id/edit`).
2) Отправьте шаблон на модерацию (кнопка в редакторе, требуется администратор).
3) Модератор публикует шаблон на странице `/moderation`.
4) Вернитесь на главную, в разделе «Опубликованные приключения» нажмите «Начать».
5) Если герой не создан, заполните форму на `/adventures/:id/hero`.
6) Перейдите в игру на `/adventures/:id/play`.
