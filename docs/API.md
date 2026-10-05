# API reference

All routes are defined in [restaurant_app/urls.py](../Backend/restaurant/restaurant_app/urls.py) and sit under `/api/`. Locally the base URL is `http://127.0.0.1:8000/api`.

This is a route index. For request and response fields, read the view named in the last column in [views.py](../Backend/restaurant/restaurant_app/views.py).

**Headers**

| Header | When |
| --- | --- |
| `Authorization: Bearer <access token>` | Routes marked "Login" |
| `X-Session-Key: <id>` | Cart and checkout requests from a browser that may not be logged in |

"Login" in the tables means the view requires an authenticated user. A blank cell means the view does not declare that requirement; it may still check access itself.

## Catalogue

| Route | Purpose | Auth | View |
| --- | --- | --- | --- |
| `/categories/` | Categories (REST viewset) | | `CategoryViewSet` |
| `/items/` | Items (REST viewset) | | `ItemViewSet` |
| `/category/<category_name>` | Items in a category | | `ItemsByCategoryAPIView` |
| `/bestsellers/` | Bestselling items | | `BestsellerItemsAPIView` |
| `/search/` | Search items | | `search_items` |
| `/banners/` | Home page banners | | `BannerListView` |
| `/upload-image/` | Upload an item image | | `upload_image` |

## Accounts

| Route | Purpose | Auth | View |
| --- | --- | --- | --- |
| `/register/` | Create an account | | `RegisterView` |
| `/login/` | Username and password login, returns JWTs | | `TokenObtainPairView` |
| `/google-login/` | Google sign-in, returns JWTs | | `GoogleLoginView` |
| `/token/refresh/` | Exchange a refresh token for a new access token | | `TokenRefreshView` |
| `/send-otp/`, `/verify-otp/` | OTP flow | | `SendOTPView`, `VerifyOTPView` |
| `/admin-login/` | Staff login | | `admin_login` |
| `/profile/` | Read or update the profile | Login | `ProfileView` |
| `/addresses/`, `/create-address/` | List or add addresses | | `AddressView` |
| `/update-address/<address_id>/`, `/delete-address/<address_id>/` | Change or remove an address | Login | `AddressDetailView` |

## Cart and checkout

| Route | Purpose | Auth | View |
| --- | --- | --- | --- |
| `/cart/` | Cart (REST viewset) | | `CartViewSet` |
| `/apply-coupon/` | Apply a coupon to the cart | | `apply_coupon` |
| `/validate-coupon/` | Check a coupon | | `validate_coupon` |
| `/delivery-config/` | Free-delivery threshold and fee settings | | `DeliveryConfigAPIView` |
| `/delivery-quote/` | Delivery charge for a location | | `delivery_quote_view` |
| `/create-order-razor/` | Create a Razorpay order | | `create_order` |
| `/verify-payment/` | Verify the Razorpay signature | | `verify_payment` |
| `/create-order/` | Place the order and create the invoice | | `CreateOrderView` |

## Orders

| Route | Purpose | Auth | View |
| --- | --- | --- | --- |
| `/orders/` | The user's orders | Login | `get_user_orders` |
| `/orders/total/` | Total value of the user's orders | Login | `get_total_order_value` |
| `/orders/<invoice_id>/` | One order | Login | `get_order_details` |
| `/past-orders/` | Past orders for the profile page | Login | `PastOrdersView` |
| `/order-detail/<invoice_id>/` | Order tracking; accepts the login or the `token` from the email link | | `InvoiceDetailView` |
| `/cancel-order/<invoice_id>/` | Cancel an order that is `ORDERED` or `IN_PROGRESS` | | `cancel_order` |
| `/all-transactions-invoices/` | All transactions and invoices, for the dashboards | | `get_all_transactions_and_invoices` |

## Reviews

| Route | Purpose | Auth | View |
| --- | --- | --- | --- |
| `/create-review/` | Add a review | | `CreateReviewView` |
| `/review-summary/<item_id>/` | Rating summary for an item | | `ReviewSummaryView` |
| `/order-reviews/<invoice_id>/` | Which items of an order have been reviewed | | `OrderReviewStatus` |
| `/submit-rating/` | Rate an order | Login | `SubmitRatingView` |

## Field sales and agents

| Route | Purpose | Auth | View |
| --- | --- | --- | --- |
| `/submit-recruit/` | Field marketing recruitment form | | `FieldMarketingFormCreateView` |
| `/agent-submit/` | Agent records a customer entry | | `agent_submit` |
| `/agent-dashboard/` | Agent's figures | | `agent_dashboard` |
| `/offline-order/` | Record an order taken offline | | `create_offline_order` |

## Site

| Route | Purpose | Auth | View |
| --- | --- | --- | --- |
| `/site-config/` | Returns `whatsapp_number` (empty string if not set) | | `get_site_config` |
| `/save-mobile/` | Saves the mobile number from the welcome popup. Body: `{"mobile": "9876543210"}`; 10 digits starting 6 to 9 | | `save_mobile` |

The Django admin is at `/admin/`, outside `/api/`.
