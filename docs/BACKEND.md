# Backend

The API is a Django 5.1 project in [Backend/restaurant/](../Backend/restaurant/) using Django REST Framework and MySQL. The project package is `restaurant`; all business code lives in one app, `restaurant_app`.

## Running it

```bash
cd Backend
python -m venv venv
venv\Scripts\activate          # Windows; `source venv/bin/activate` on Linux/macOS
pip install -r requirements.txt
cd restaurant
python manage.py migrate
python manage.py createsuperuser   # first time only, for /admin/
python manage.py runserver         # http://127.0.0.1:8000
```

The server runs Python 3.12. `mysqlclient` needs the MySQL client libraries installed on your machine.

### Environment variables

Create `Backend/restaurant/.env` (git-ignored). Settings read it with `python-decouple`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DB_NAME` | Yes | MySQL database name |
| `DB_USER` | Yes | MySQL user |
| `DB_PASSWORD` | Yes | MySQL password |
| `DB_HOST` | No, default `localhost` | MySQL host |
| `DB_PORT` | No, default `3306` | MySQL port |
| `BREVO_API_KEY` | Yes | Brevo key for transactional email |
| `MAPBOX_TOKEN` | No, has a default | Driving distance lookup for delivery charges |

The app will not start without the required ones.

### Settings that are not in `.env`

These are set directly in [settings.py](../Backend/restaurant/restaurant/settings.py). Several have a development line and a commented production line, so check them when moving between environments.

| Setting | Notes |
| --- | --- |
| `DEBUG`, `ALLOWED_HOSTS` | Edited by hand per environment |
| `STATIC_ROOT`, `MEDIA_ROOT` | Local folders in development; `/var/www/village-mitai/...` on the server |
| `CORS_ALLOWED_ORIGINS` | Origins allowed to call the API from a browser |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Payment gateway credentials |
| `GOOGLE_CLIENT_ID` | Must match the client ID in `Frontend/src/index.js` |
| `BREVO_SENDER` | From-name and address on outgoing email |
| `SIMPLE_JWT` | Access token lasts 5 hours, refresh token 7 days |

Payment credentials are currently written in `settings.py`. Move them to `.env` before using live keys, and keep them out of commits.

## Code map

| Path | Contents |
| --- | --- |
| [restaurant/settings.py](../Backend/restaurant/restaurant/settings.py) | Configuration |
| [restaurant/urls.py](../Backend/restaurant/restaurant/urls.py) | Mounts `/admin/` and the app URLs; serves media when `DEBUG` is on |
| [restaurant_app/urls.py](../Backend/restaurant/restaurant_app/urls.py) | Every API route, all under `/api/` |
| [restaurant_app/views.py](../Backend/restaurant/restaurant_app/views.py) | All views |
| [restaurant_app/models.py](../Backend/restaurant/restaurant_app/models.py) | All models |
| [restaurant_app/serializers.py](../Backend/restaurant/restaurant_app/serializers.py) | DRF serializers |
| [restaurant_app/admin.py](../Backend/restaurant/restaurant_app/admin.py) | Django admin registrations |
| `restaurant_app/utils/delivery.py` | Delivery distance and charge calculation (Mapbox) |
| `restaurant_app/utils/email.py` | Order emails through Brevo |
| `restaurant_app/utils/send_sms.py` | SMS sending |
| `restaurant_app/middleware/api_logger.py` | Logs each API request to `APIRequestLog` |

## Models

| Area | Models |
| --- | --- |
| Catalogue | `Category`, `Item`, `Banner` |
| Customers | `UserProfile`, `Address`, `OTP`, `MobileNumber` |
| Cart and orders | `Cart`, `Order`, `OrderItem`, `Invoice`, `Transaction` |
| Pricing | `Coupon`, `DeliveryFeeConfig`, `DeliveryCharge`, `StoreLocation` |
| Feedback | `Rating`, `Review` |
| Field sales | `FieldMarketingForm`, `AgentCustomerEntry`, `OfflineOrder`, `OfflineOrderItem` |
| Site settings | `SiteConfig` (WhatsApp number), `NotificationEmail` (who receives order emails) |
| Logging | `APIRequestLog` |

`Invoice` is the order record customers see. Its `tracking_token` is the secret part of the tracking link sent by email, so an order can be viewed without logging in but cannot be guessed from its number.

Site-wide values such as the WhatsApp number, delivery fees, banners and coupons are edited in the Django admin at `/admin/`.

## Authentication

- Customers sign in with Google (`/api/google-login/`) or username and password (`/api/login/`) and receive JWTs from `djangorestframework-simplejwt`.
- The frontend sends `Authorization: Bearer <access token>` and, for cart requests, an `X-Session-Key` header identifying the anonymous browser session.
- Some views use `LenientJWTAuthentication` (defined in `views.py`), which accepts a valid token but lets requests without one through, so guests can check out.
- Staff sign in through `/api/admin-login/` and are routed by role (`admin`, `maker`, `delivery`).

## Migrations

Migration files are currently git-ignored (`**/migrations/*.py` in [Backend/restaurant/.gitignore](../Backend/restaurant/.gitignore)). Each environment therefore generates its own, and the deploy runs `makemigrations` on the server.

This has a known failure: a model change that needs an interactive answer (for example a new unique field with a generated default) cannot be answered during a deploy, so the schema is left behind while the new code goes live. See [DEPLOYMENT.md](DEPLOYMENT.md#known-problems).

Until migrations are tracked in git:

1. Run `python manage.py makemigrations` locally after every model change and check it completes without prompting.
2. If it prompts, write the migration by hand and get that file onto the server before deploying.

## Requirements files

There are two: [Backend/requirements.txt](../Backend/requirements.txt) and [Backend/restaurant/requirements.txt](../Backend/restaurant/requirements.txt). **The deploy installs only `Backend/requirements.txt`.** Add every new package there, or it will be missing on the server.

The two files have drifted apart (different Django and mysqlclient versions, and the inner one lists `pywin32`, which does not install on Linux).
