# Game Client‑Server Skeleton

This repository contains a minimal client–server application scaffold for a game featuring neural network gameplay. The goal of this project is to provide a starting point for development rather than a complete production system. It includes:

* **Backend** — A Django REST API with PostgreSQL for persistent storage, token‑based authentication (JWT) using Simple JWT and custom user registration.
* **Frontend** — A React application that presents a home screen with a header, login form and registration form. Tokens obtained from the backend are stored on the client and attached to subsequent API requests.

> **Note**: Secrets such as database credentials and token lifetimes are loaded from a `.env` file. Only `.env.example` is committed to version control; create your own `.env` when running the application locally.

## Directory Structure

```text
game_app/
├── .env.example         # Template for environment variables
├── backend/             # Django REST API
│   ├── backend/         # Django project package
│   │   ├── __init__.py
│   │   ├── asgi.py
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── manage.py
│   ├── requirements.txt # Python dependencies
│   └── users/           # Custom user app
│       ├── __init__.py
│       ├── admin.py
│       ├── models.py
│       ├── serializers.py
│       ├── urls.py
│       └── views.py
└── frontend/            # React client (see below)
```

## Backend Overview

The backend is built with **Django** and **Django REST Framework**. It defines a custom `User` model that extends Django's `AbstractUser` by adding a `credits` field. User registration is implemented via a dedicated API endpoint (`/api/users/register/`). Authentication uses JSON Web Tokens (JWT) with access tokens expiring after 15 minutes and refresh tokens expiring after 30 days (configurable via the `.env` file).

### Running the Backend

1. Create a virtual environment and install dependencies:

   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r backend/requirements.txt
   ```

2. Copy `.env.example` to `.env` and update the values for your local setup.

3. Apply migrations and create a superuser:

   ```bash
   cd backend
   python manage.py migrate
   python manage.py createsuperuser
   ```

4. Run the development server:

   ```bash
   python manage.py runserver
   ```

The API will be available at `http://localhost:8000/`.

## Frontend Overview

The frontend lives in the `frontend/` directory and is built with **React**. It displays a simple home page with a header. The left side of the header has a “Play” button placeholder and the right side has a “Login” button. Clicking “Login” opens a modal with a form for entering a username and password as well as a toggle for switching to a registration form. Registration includes fields for username, email, password and confirmation. After successful login or registration, the user is returned to the home page with the JWT stored locally to authorize future requests.

### Running the Frontend

1. Change into the `frontend` directory:

   ```bash
   cd frontend
   ```

2. Install the dependencies:

   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env` and specify the API base URL (e.g. `REACT_APP_API_URL=http://localhost:8000`).

4. Start the development server:

   ```bash
   npm start
   ```

The React application will be accessible at `http://localhost:3000/`.

## Extending This Project

This skeleton is intentionally minimal. Future improvements might include:

* Persisting refresh tokens in HTTP‑only cookies for improved security.
* Implementing email verification and password reset functionality.
* Adding game logic and integration with neural network APIs.
* Introducing a dedicated `play/` route and managing game state on the frontend.

Contributions and feedback are welcome!