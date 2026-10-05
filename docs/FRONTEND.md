# Frontend

The storefront and the staff dashboards are one React single-page app in [Frontend/](../Frontend/), built with Create React App (`react-scripts` 5) and managed with pnpm.

## Running it

```bash
cd Frontend
pnpm install
pnpm run dev      # development server on http://localhost:3000
pnpm run build    # production build into Frontend/build
pnpm run test     # Jest in watch mode
```

There is no `start` script; use `dev`.

### Environment variables

Create `Frontend/.env` (it is git-ignored):

```
REACT_APP_MAPBOX_TOKEN=<your Mapbox public token>
```

This is the only variable the app reads. It is used by the delivery location picker in [LocationPicker.js](../Frontend/src/components/LocationPicker.js). On the server the deploy workflow writes this file from the `REACT_APP_MAPBOX_TOKEN` GitHub secret.

### Pointing at an API

[src/constants.js](../Frontend/src/constants.js) exports `API_BASE_URL` and `API_BASE_URL_MEDIA`. The alternatives are kept there as commented lines:

| Value | Use |
| --- | --- |
| `http://127.0.0.1:8000/api` | Local backend |
| `${window.location.origin}/api` | Production, where NGINX serves the API on the same domain |

This is a manual switch, so check it before merging to `main`.

The backend only accepts browser requests from the origins in `CORS_ALLOWED_ORIGINS` in the Django settings. `http://localhost:3000` is on that list.

## How the app is put together

- [src/index.js](../Frontend/src/index.js) mounts the app inside the router and the Google OAuth provider. The Google client ID there must match `GOOGLE_CLIENT_ID` in the backend settings.
- [src/App.js](../Frontend/src/App.js) declares every route. It wraps pages in the shared header, cart drawer and footer, except for the routes listed in `hideLayoutRoutes` (dashboards, login, order status and similar full-screen pages).
- [components/CartContext.jsx](../Frontend/src/components/CartContext.jsx) holds the cart for the whole app.

### Routes

| Path | Component | Notes |
| --- | --- | --- |
| `/` | `Home` | Banners, categories, all items, welcome popup, WhatsApp button |
| `/collections/:categorySlug` | `Category` | Items in one category |
| `/items` | `Items` | All items |
| `/product/:id` | `ProductDetail` | Product page with reviews |
| `/search` | `SearchResults` | |
| `/precheckout`, `/checkout` | `PreCheckout`, `Checkout` | Address, coupon, delivery charge, payment |
| `/order_status` | `OrderStatus` | Order tracking; opened from the confirmation email with `invoice_id` and `token` |
| `/profile` | `Profile` | Account, addresses, past orders |
| `/login`, `/register` | `LoginPage`, `Register` | |
| `/about`, `/contact`, `/privacy` | `About`, `Contact`, `Privacy` | Text pages |
| `/admin-login` | `AdminLogin` | Staff sign-in |
| `/admin/dashboard` | `Dashboards/Ordering` | Role `admin` |
| `/maker/dashboard` | `Dashboards/MakerDashboard` | Role `maker` |
| `/delivery/dashboard` | `Dashboards/DeliveryDashboard` | Role `delivery` |
| `/agent-page`, `/agent-dashboard`, `/recruit`, `/offline-order`, `/catalogue` | Agent and field-sales pages | |
| `/upload` | `UploadImage` | Image upload helper |

Dashboard routes are wrapped in [ProtectedRoute.js](../Frontend/src/ProtectedRoute.js), which checks `user_role` in `localStorage`. This only hides the page; the API must enforce access itself.

### Talking to the API

Requests use axios directly from components. Two header helpers in [constants.js](../Frontend/src/constants.js) cover most calls:

- `SESSION_KEY` sends `X-Session-Key`, an anonymous ID stored in `localStorage` that ties a cart to a browser before login.
- `SESSION_TOKEN` sends the same key plus `Authorization: Bearer <access_token>` when the user is logged in. It is a getter, so the token is read at request time.

Other helpers in [src/utils/](../Frontend/src/utils/):

| File | Purpose |
| --- | --- |
| `auth.js` | Token storage and session handling |
| `loading.js` | Tracks in-flight requests for the route loader |
| `pricing.js` | Item price for weight and piece options |
| `siteConfig.js` | `useWhatsappUrl()` hook; fetches `/site-config/` once per page load |

### Browser storage keys

| Key | Meaning |
| --- | --- |
| `cart_session_key` | Anonymous cart session ID |
| `access_token` | JWT for the logged-in user |
| `user_role` | Staff role used by `ProtectedRoute` |
| `agentId` | Sales agent ID captured from an `?agentid=` link |
| `mobile_prompt_done` | Set once the welcome popup has been submitted or dismissed |

## Shared UI pieces

| Component | What it does |
| --- | --- |
| `Header`, `Footer` | Site chrome; styles in `styles/HeaderFooter.css` |
| `CartPopup` | Cart drawer opened from the header |
| `MobilePrompt` | Welcome popup on the home page that collects a mobile number. Shows 1.5 seconds after the first visit, posts to `/save-mobile/`, never shows again once submitted or dismissed |
| `WhatsAppButton` | Floating chat button, bottom right of the home page. Hidden until a WhatsApp number is set in the admin (`SiteConfig`) |
| `PaymentResultModal`, `ConfirmPopup` | Result and confirmation popups |
| `Loader` | Top-of-page route loader |
| `ProductCard` | Item tile used in every grid |

## Styling conventions

Styles are plain CSS, one file per page or component in [src/styles/](../Frontend/src/styles/), imported by the component that uses it. CSS is global, so prefix class names with the component (`profile-`, `mobile-prompt-`, `static-`).

Keep new screens consistent with these values:

| Token | Value |
| --- | --- |
| Primary brown (text, buttons) | `#3F2305` |
| Button hover | `#2d1804` |
| Page background | `#f4f2f1` |
| Card background | `#f9f9f9` |
| Card border | `#d8cfc4` |
| Tinted fill (badges, icon circles) | `#ede7e1` |
| Muted text | `#7b7167` |
| Error | `#d32f2f` |
| Corner radius | `6px` |
| Font | Poppins |

Shared classes in [App.css](../Frontend/src/App.css): `.page-title` for the page heading and `.section-title` for section headings. The text pages share [StaticPages.css](../Frontend/src/styles/StaticPages.css).

Icons come from Bootstrap Icons, loaded in [public/index.html](../Frontend/public/index.html): `<i className="bi bi-truck"></i>`.

Things to know before adding styles:

- `.App` sets `text-align: center`. Set `text-align: left` on containers that hold body text.
- [Ordering.css](../Frontend/src/styles/Ordering.css) has a bare `h2 { text-align: center }` rule that applies site-wide once loaded.
- Tailwind is loaded from its CDN script in `index.html`, so utility classes work at runtime, but it is not part of the build. Prefer the CSS files for new work.
- Header height is exposed as `--header-offset`; `.page-content` already pads for it.
