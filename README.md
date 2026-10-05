# Village Mitai

Online store for Village Mitai (Chirasvi Foods), a traditional sweets brand. Customers browse sweets, add them to a cart, pay online through Razorpay and track their order. Staff use role-based dashboards to manage, prepare and deliver orders.

The repository holds two applications:

| Folder | What it is | Stack |
| --- | --- | --- |
| [Frontend/](Frontend/) | Customer storefront and staff dashboards | React 19 (Create React App), React Router 7, Bootstrap 5, pnpm |
| [Backend/](Backend/) | REST API and Django admin | Django 5.1, Django REST Framework, MySQL, Gunicorn |

## Documentation

| Document | Read it when you want to |
| --- | --- |
| [docs/FRONTEND.md](docs/FRONTEND.md) | Run the storefront, find a page or component, follow the styling conventions |
| [docs/BACKEND.md](docs/BACKEND.md) | Run the API, set environment variables, understand models and migrations |
| [docs/API.md](docs/API.md) | Look up an endpoint |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Understand how a push to `main` reaches the server, or debug a failed deploy |

## Quick start

You need Node.js with pnpm, Python 3.12 and a MySQL server.

**Backend** (serves `http://127.0.0.1:8000`):

```bash
cd Backend
python -m venv venv
venv\Scripts\activate          # Windows; use `source venv/bin/activate` on Linux/macOS
pip install -r requirements.txt
cd restaurant
# create restaurant/.env first, see docs/BACKEND.md
python manage.py migrate
python manage.py runserver
```

**Frontend** (serves `http://localhost:3000`):

```bash
cd Frontend
pnpm install
# create Frontend/.env first, see docs/FRONTEND.md
pnpm run dev
```

The frontend finds the API through `API_BASE_URL` in [Frontend/src/constants.js](Frontend/src/constants.js). Point it at `http://127.0.0.1:8000/api` for local work and switch it back before pushing to `main`.

## Repository layout

```
village-mitai/
├── .github/workflows/     # deploy-backend.yml, deploy-frontend.yml, main.yml (SSH test)
├── Backend/
│   ├── requirements.txt   # the file the deploy installs from
│   └── restaurant/        # Django project
│       ├── manage.py
│       ├── restaurant/        # settings, root urls, wsgi
│       └── restaurant_app/    # models, views, serializers, urls, utils, middleware
├── Frontend/
│   ├── public/            # index.html, images
│   └── src/
│       ├── components/    # pages and shared components
│       ├── styles/        # one CSS file per page or component
│       ├── utils/         # auth, pricing, loading, site config helpers
│       └── constants.js   # API base URL and request headers
└── docs/
```

## Branches and releases

- `main` is production. A push to `main` deploys whichever of `Frontend/` or `Backend/` changed.
- `development-cicd` is the working branch. Merge it into `main` to release.
