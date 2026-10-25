import hashlib
import hmac
from datetime import date
from threading import Thread
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.utils.crypto import constant_time_compare
import razorpay
from rest_framework.response import Response
from django.core.paginator import Paginator


from restaurant import settings
from .utils.email import send_order_confirmation_email
from .utils.delivery import delivery_quote, delivery_window, pick_delivery_date
from .utils.agents import apply_registration_commission, contact_filter, customer_contacts, normalize_phone
from .serializers import AgentCustomerEntrySerializer, BannerSerializer, CategorySerializer, FieldMarketingFormSerializer, ItemSerializer, CartSerializer, OfflineOrderSerializer, RatingSerializer, RegisterSerializer, UserProfileSerializer, AddressSerializer , InvoiceListSerializer, TransactionDetailSerializer, InvoiceDetailSerializer
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.db.models import Avg, Count, Sum, Case, When, Value, IntegerField, F
from rest_framework import generics
from rest_framework.decorators import action


from .models import AgentCustomerEntry, Banner, Category, Coupon, DeliveryFeeConfig, FieldMarketingForm, Item, Cart, MobileNumber, OfflineOrder, Order, OrderItem, Address, Invoice, Review, ReviewImage, Transaction , SiteConfig
from rest_framework.viewsets import ModelViewSet
from rest_framework.views import APIView

from rest_framework.permissions import IsAuthenticated, AllowAny
from decimal import Decimal

import os
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.files.storage import default_storage
import os
from django.http import JsonResponse
from django.db.models import Q
import json

# views.py
from rest_framework import status
from .models import OTP
from .serializers import SendOTPSerializer, VerifyOTPSerializer, UserSerializer
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
import random
from .utils.send_sms import generate_otp, send_otp_sms
from rest_framework_simplejwt.tokens import RefreshToken
from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from django.contrib.auth import authenticate
from .models import UserProfile, PIECE
from .serializers import UserSerializer


user_otp_map = {}  # Store phone -> OTP temporarily (in prod use DB or cache)
class OptionalJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        header = self.get_header(request)
        if header is None:
            return None
        return super().authenticate(request)

class LenientJWTAuthentication(JWTAuthentication):
    """Logged-in users are identified by their JWT; a missing, expired or
    invalid token falls back to guest instead of failing the request."""
    def authenticate(self, request):
        try:
            return super().authenticate(request)
        except Exception:
            return None

STAFF_ROLES = ("admin", "maker", "delivery")


def find_invoice(ref):
    """An order by its order number (VM7F3A9C21B4, or VM2610240007 on older
    orders) or, for older links, its id."""
    ref = str(ref).strip()
    if ref.isdigit():
        return Invoice.objects.filter(id=int(ref)).first()
    return Invoice.objects.filter(order_number=ref.upper()).first()


def is_staff_request(request):
    user = request.user
    return user.is_authenticated and (
        user.is_staff or UserProfile.objects.filter(user=user, role__in=STAFF_ROLES).exists()
    )


def can_access_invoice(request, invoice):
    """An order can be opened, cancelled or reviewed by:
    - the logged-in user it belongs to, or a staff member
    - the browser that placed it as a guest (same session key)
    - anyone holding its tracking link (secret token from the email)
    """
    user = request.user
    if user.is_authenticated:
        if invoice.user_id == user.id or user.is_staff:
            return True
        if UserProfile.objects.filter(user=user, role__in=STAFF_ROLES).exists():
            return True

    token = request.query_params.get("token") or request.data.get("token")
    if token and invoice.tracking_token and constant_time_compare(str(token), invoice.tracking_token):
        return True

    session_key = request.headers.get("x-session-key")
    if session_key and invoice.session_key == session_key:
        return True

    return False


def razorpay_signature_valid(order_id, payment_id, signature):
    expected = hmac.new(
        bytes(settings.RAZORPAY_KEY_SECRET, 'utf-8'),
        bytes(f"{order_id}|{payment_id}", 'utf-8'),
        hashlib.sha256
    ).hexdigest()
    return constant_time_compare(expected, str(signature))


def sync_refund_status(invoice):
    """Refunds start as pending at Razorpay; ask for the latest state so the
    customer sees when the money has actually gone back."""
    if not invoice.refund_id or invoice.refund_status != "PENDING":
        return
    try:
        refund = client.refund.fetch(invoice.refund_id)
    except Exception as e:
        print(f"Refund status check failed for invoice {invoice.id}: {e}")
        return
    new_status = str(refund.get("status", "")).upper()
    if new_status in ("PROCESSED", "FAILED") and new_status != invoice.refund_status:
        invoice.refund_status = new_status
        invoice.save(update_fields=["refund_status"])


class SendOTPView(APIView):
    def post(self, request):
        phone = request.data.get("phone")
        otp = generate_otp()

        # Save OTP temporarily
        user_otp_map[phone] = otp

        # Send OTP via SMS
        sms_result = send_otp_sms(phone, otp)
        print(otp,sms_result)

        return Response({"success": True, "otp": otp, "sms": sms_result})

class VerifyOTPView(APIView):
    def post(self, request):
        phone = request.data.get("phone")
        otp_input = request.data.get("otp")

        if user_otp_map.get(phone) == otp_input:
            # Create token / session or user login logic
            return Response({"success": True, "token": "demo-jwt-token-123"})
        else:
            return Response({"success": False, "message": "Invalid OTP"}, status=400)


@csrf_exempt
def upload_image(request):
    if request.method == "POST":
        if "image" not in request.FILES:
            return JsonResponse({"error": "No image provided"}, status=400)

        image = request.FILES["image"]

        # Correct path to React's public/images folder
        react_public_folder = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../restfrontend/public/images"))

        # Make sure the folder exists
        if not os.path.exists(react_public_folder):
            os.makedirs(react_public_folder, exist_ok=True)

        # Save the image
        image_path = os.path.join(react_public_folder, image.name)

        try:
            with open(image_path, "wb+") as destination:
                for chunk in image.chunks():
                    destination.write(chunk)
        except Exception as e:
            return JsonResponse({"error": f"Failed to save image: {e}"}, status=500)

        # Return the correct image URL
        image_url = f"/images/{image.name}"
        return JsonResponse({"image_url": image_url}, status=201)

    return JsonResponse({"error": "Invalid request"}, status=400)


def ordered_items(queryset, *tie_breakers):
    """Display order for every item list:
    1. in-stock items before out-of-stock ones (even if they are bestsellers)
    2. the admin-set sort_order (1, 2, 3...), items without a number after those
    3. bestsellers
    """
    return queryset.order_by(
        "-available",
        F("sort_order").asc(nulls_last=True),
        "-bestseller",
        *(tie_breakers or ("id",)),
    )


@api_view(['GET'])
@permission_classes([AllowAny])
def search_items(request):
    """Search items across every category. Each word of the query must match
    the item name, its description or its category name."""
    words = request.GET.get('q', '').split()
    if not words:
        return Response([])

    items = Item.objects.select_related("category")
    for word in words:
        items = items.filter(
            Q(name__icontains=word) |
            Q(description__icontains=word) |
            Q(category__name__icontains=word)
        )

    # same display order as every other list; among equals, name matches come
    # ahead of description/category matches
    name_match = Q()
    for word in words:
        name_match &= Q(name__icontains=word)
    items = ordered_items(items.annotate(
        avg_rating=Avg("reviews__rating"),
        total_reviews=Count("reviews", distinct=True),
        name_hit=Case(When(name_match, then=Value(0)), default=Value(1), output_field=IntegerField()),
    ), "name_hit", "name")

    serializer = ItemSerializer(items, many=True, context={'request': request})
    return Response(serializer.data)


@csrf_exempt
def create_order(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        items = data.get('items', [])

        total_price = 0
        total_quantity = 0

        order = Order.objects.create(total_price=0)  # Temp 0

        for item_data in items:
            item_id = item_data['id']
            quantity = item_data['quantity']
            item = Item.objects.get(id=item_id)
            item_total = item.price * quantity

            OrderItem.objects.create(
                order=order,
                item=item,
                quantity=quantity,
                price=item_total
            )

            total_price += item_total
            total_quantity += quantity

        order.total_price = total_price
        order.save()

        response = {
            'order_id': order.id,
            'total_price': float(total_price),
            'total_quantity': total_quantity,
            'items': [
                {
                    'name': oi.item.name,
                    'quantity': oi.quantity,
                    'price': float(oi.price),
                } for oi in order.order_items.all()
            ]
        }

        print("Order Summary:", response)  # Console log for debug

        return JsonResponse(response)

class CategoryViewSet(ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

class ItemViewSet(ModelViewSet):
    queryset = Item.objects.all()
    serializer_class = ItemSerializer

    def get_queryset(self):
        return ordered_items(Item.objects.annotate(
            avg_rating=Avg("reviews__rating"),
            total_reviews=Count("reviews", distinct=True)
        ))

class ItemsByCategoryAPIView(APIView):
    def get(self, request, category_name):
        category = get_object_or_404(Category, name=category_name)

        items = ordered_items(Item.objects.filter(category=category).annotate(
            avg_rating=Avg("reviews__rating"),
            total_reviews=Count("reviews", distinct=True)
        ))

        serializer = ItemSerializer(
            items,
            many=True,
            context={'request': request}
        )

        return Response(serializer.data)
    

class BestsellerItemsAPIView(APIView):
    def get(self, request):
        bestsellers = ordered_items(Item.objects.filter(bestseller=True))
        serializer = ItemSerializer(bestsellers, many=True)
        return Response(serializer.data)

def claim_guest_cart(user, session_key):
    """Move this browser's guest cart into the customer's account cart, adding
    quantities together when the same item and weight is in both."""
    if not session_key:
        return
    for line in Cart.objects.filter(session_key=session_key, user__isnull=True):
        existing = (
            Cart.objects.filter(user=user, item_id=line.item_id, weight=line.weight)
            .exclude(id=line.id)
            .first()
        )
        if existing:
            existing.quantity += line.quantity
            existing.save(update_fields=["quantity", "updated_at"])
            line.delete()
        else:
            line.user = user
            line.save(update_fields=["user", "updated_at"])


class CartViewSet(ModelViewSet):
    """Cart of a signed-in customer belongs to their account, so it is the
    same on every device. Guests have a cart per browser (session key)."""
    serializer_class = CartSerializer
    queryset = Cart.objects.all()
    authentication_classes = [LenientJWTAuthentication]
    permission_classes = [AllowAny]

    def get_session_key(self):
        session_key = self.request.headers.get("x-session-key")
        if not session_key:
            self.request.session.create()
            session_key = self.request.session.session_key
        return session_key

    def get_queryset(self):
        session_key = self.get_session_key()
        user = self.request.user
        if user.is_authenticated:
            claim_guest_cart(user, session_key)
            return super().get_queryset().filter(user=user)
        return super().get_queryset().filter(session_key=session_key, user__isnull=True)

    def create(self, request, *args, **kwargs):
        session_key = self.get_session_key()
        item_id = request.data.get("item")
        quantity = int(request.data.get("quantity", 1))
        weight = request.data.get("weight", 1)

        if quantity < 1:
            return Response({"error": "Quantity must be at least 1"}, status=400)

        # by-the-piece lines are only allowed for items set up to be sold that way
        if str(weight) == PIECE:
            item = Item.objects.filter(id=item_id).first()
            if not item or not item.sold_by_piece:
                return Response({"error": "This item is not sold by the piece"}, status=400)

        lines = self.get_queryset()
        cart_item = lines.filter(item_id=item_id, weight=weight).first()
        created = cart_item is None
        if created:
            cart_item = Cart.objects.create(
                session_key=session_key,
                user=request.user if request.user.is_authenticated else None,
                item_id=item_id,
                weight=weight,
                quantity=quantity,
            )
        else:
            cart_item.quantity += quantity
            cart_item.save()

        serializer = self.get_serializer(cart_item)
        return Response(serializer.data, status=201 if created else 200)

    @action(detail=False, methods=["delete"], url_path="clear")
    def clear_cart(self, request):
        deleted_count, _ = self.get_queryset().delete()

        return Response(
            {
                "message": "Cart cleared successfully",
                "deleted_items": deleted_count,
            },
            status=status.HTTP_200_OK,
        )

class RegisterView(APIView):
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "User registered successfully"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


def google_user_from_access_token(access_token):
    """The Google account behind an access token from the sign-in pop-up, in
    the same shape as a verified ID token. None if Google does not confirm the
    token was issued to this site (so a token made for another app is refused)."""
    import requests

    try:
        info = requests.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"access_token": access_token},
            timeout=6,
        )
        if info.status_code != 200:
            return None
        info = info.json()
        if info.get("aud") != settings.GOOGLE_CLIENT_ID:
            return None

        profile = requests.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=6,
        )
        if profile.status_code != 200:
            return None
        profile = profile.json()
    except (requests.RequestException, ValueError):
        return None

    # both answers must be about the same account
    if not profile.get("sub") or profile.get("sub") != info.get("sub"):
        return None
    return {
        "sub": profile["sub"],
        "email": profile.get("email"),
        "email_verified": profile.get("email_verified") in (True, "true"),
        "given_name": profile.get("given_name", ""),
        "family_name": profile.get("family_name", ""),
        "picture": profile.get("picture"),
    }


class GoogleLoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        credential = request.data.get("credential")
        access_token = request.data.get("access_token")

        if credential:
            # Google's own sign-in button sends an ID token
            try:
                google_user = google_id_token.verify_oauth2_token(
                    credential, google_requests.Request(), settings.GOOGLE_CLIENT_ID
                )
            except ValueError:
                return Response({"error": "Invalid Google credential"}, status=status.HTTP_401_UNAUTHORIZED)
        elif access_token:
            # our own themed button uses Google's pop-up and sends an access token
            google_user = google_user_from_access_token(access_token)
            if google_user is None:
                return Response({"error": "Invalid Google credential"}, status=status.HTTP_401_UNAUTHORIZED)
        else:
            return Response({"error": "Google credential is required"}, status=status.HTTP_400_BAD_REQUEST)

        email = google_user.get("email")
        if not email or not google_user.get("email_verified"):
            return Response({"error": "Google account email is not verified"}, status=status.HTTP_400_BAD_REQUEST)

        # Link by Google account id first, then fall back to the email
        google_id = google_user.get("sub")
        profile = UserProfile.objects.filter(google_id=google_id).select_related("user").first()
        user = profile.user if profile else User.objects.filter(email__iexact=email).first()
        if user is None:
            user = User(
                username=email,
                email=email,
                first_name=google_user.get("given_name", ""),
                last_name=google_user.get("family_name", ""),
            )
            user.set_unusable_password()
            user.save()
        profile, _ = UserProfile.objects.get_or_create(user=user, defaults={"role": "user"})
        profile.google_id = google_id
        profile.picture = google_user.get("picture")
        profile.save()

        # Addresses and orders made as a guest in this browser now belong to the account
        session_key = request.headers.get("x-session-key")
        if session_key:
            Address.objects.filter(session_key=session_key, user__isnull=True).update(user=user)
            Invoice.objects.filter(session_key=session_key, user__isnull=True).update(user=user)
            Transaction.objects.filter(session_key=session_key, user__isnull=True).update(user=user)
            claim_guest_cart(user, session_key)

        refresh = RefreshToken.for_user(user)
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": {
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email": user.email,
                "phone": profile.phone,
                "picture": profile.picture,
            },
        }, status=status.HTTP_200_OK)


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def profile_data(self, user):
        profile, _ = UserProfile.objects.get_or_create(user=user, defaults={"role": "user"})
        return {
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "phone": profile.phone,
            "picture": profile.picture,
            "addresses": AddressSerializer(user.addresses.all(), many=True).data,
        }

    def get(self, request):
        return Response(self.profile_data(request.user), status=status.HTTP_200_OK)

    def patch(self, request):
        user = request.user
        profile, _ = UserProfile.objects.get_or_create(user=user, defaults={"role": "user"})

        # email stays tied to the Google account, so it is not editable here
        if "first_name" in request.data:
            user.first_name = str(request.data["first_name"]).strip()[:150]
        if "last_name" in request.data:
            user.last_name = str(request.data["last_name"]).strip()[:150]
        if "phone" in request.data:
            phone = str(request.data["phone"] or "").strip()
            if phone and not (phone.isdigit() and len(phone) == 10):
                return Response({"error": "Mobile number must be 10 digits"}, status=status.HTTP_400_BAD_REQUEST)
            profile.phone = phone or None
            profile.save()
        user.save()

        return Response(self.profile_data(user), status=status.HTTP_200_OK)

class AddressView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [LenientJWTAuthentication]
    def get(self, request):
        if request.user.is_authenticated:
            addresses = Address.objects.filter(user=request.user)
        else:
            session_key = request.headers.get("x-session-key")
            addresses = Address.objects.filter(session_key=session_key)
        serializer = AddressSerializer(addresses, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        session_key = request.headers.get("x-session-key") or ""
        if request.user.is_authenticated:
            serializer = AddressSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save(user=request.user,session_key=session_key)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        else:
            serializer = AddressSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save(session_key=session_key)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class AddressDetailView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def put(self, request, address_id):
        address = get_object_or_404(Address, id=address_id, user=request.user)
        serializer = AddressSerializer(address, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, address_id):
        address = get_object_or_404(Address, id=address_id, user=request.user)
        address.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class CreateOrderView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [LenientJWTAuthentication]

    def post(self, request):
        data = request.data

        session_key = request.headers.get("x-session-key") or ""
        payment_mode = data.get("payment_mode")
        delivery_time = data.get("delivery_time", 1)

        net_amount = Decimal(data.get("net_amount", 0))
        cgst = Decimal(data.get("cgst", 0))
        sgst = Decimal(data.get("sgst", 0))
        discount = Decimal(data.get("discount", 0))
        try:
            delivery_charge = Decimal(str(data["delivery_charge"])) if data.get("delivery_charge") is not None else None
        except (ArithmeticError, ValueError):
            delivery_charge = None

        coupon_code = data.get("coupon_code")
        coupon = None

        if coupon_code:
            coupon = Coupon.objects.filter(
                code=coupon_code,
                is_active=True
            ).first()

        cart_items = data.get("cart_items", [])
        address_id = data.get("address_id")

        if not payment_mode or not cart_items:
            return Response(
                {"error": "Payment mode and cart items are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # guest checkout is off for now (settings.GUEST_CHECKOUT_ENABLED). An
        # online order is created after the money is taken, so a paid guest
        # order is still placed; checkout asks guests to sign in before paying.
        if (
            not getattr(settings, "GUEST_CHECKOUT_ENABLED", True)
            and not request.user.is_authenticated
            and not data.get("razorpay_payment_id")
        ):
            return Response(
                {
                    "error": "Please sign in to place your order.",
                    "message": "Please sign in to place your order.",
                },
                status=status.HTTP_401_UNAUTHORIZED
            )

        # checkout removes a coupon that does not fit the payment method, so
        # this only stops a cash order sent with an online-only coupon. Online
        # orders are created after payment, so they are logged, not refused.
        if coupon and not coupon.allows_payment(payment_mode):
            if payment_mode == "CASH":
                return Response(
                    {"error": coupon.payment_mode_message(), "message": coupon.payment_mode_message()},
                    status=status.HTTP_400_BAD_REQUEST
                )
            print(f"Coupon {coupon.code} ({coupon.payment_mode}) used with paid {payment_mode} order")

        # fastest delivery unless the customer scheduled a later day
        try:
            requested_date = date.fromisoformat(data["delivery_date"]) if data.get("delivery_date") else None
        except (TypeError, ValueError):
            requested_date = None
        earliest_date, latest_date = delivery_window(
            Item.objects.filter(id__in=[ci.get("id") for ci in cart_items])
        )
        delivery_date = pick_delivery_date(requested_date, earliest_date, latest_date)
        is_scheduled = bool(data.get("is_scheduled")) and delivery_date > earliest_date

        # Online payment: check the Razorpay signature and keep the ids, they
        # are what a later refund is made against
        razorpay_order_id = data.get("razorpay_order_id")
        razorpay_payment_id = data.get("razorpay_payment_id")
        if razorpay_payment_id:
            if not razorpay_signature_valid(
                razorpay_order_id, razorpay_payment_id, data.get("razorpay_signature", "")
            ):
                return Response(
                    {"error": "Payment could not be verified"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            # one payment pays for one order; a retry returns the order already made
            existing = Invoice.objects.filter(razorpay_payment_id=razorpay_payment_id).first()
            if existing:
                return Response(
                    {
                        "message": "Order created successfully",
                        "invoice_id": existing.id,
                        "order_number": existing.order_number,
                        "tracking_token": existing.tracking_token
                    },
                    status=status.HTTP_200_OK
                )

        address = None
        store_id = None

        if address_id:
            try:
                address = Address.objects.get(id=address_id)
            except Address.DoesNotExist:
                return Response(
                    {"error": "Invalid address"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # the checkout page already says so; this stops an order to an
            # address outside the delivery radius from being placed anyway
            quote = delivery_quote(address.latitude, address.longitude)
            if not quote["deliverable"]:
                return Response(
                    {
                        "error": "Delivery is not available to this address",
                        "message": (
                            f"Sorry, we deliver within {quote['max_delivery_km']} km and this "
                            f"address is {quote['distance_km']} km away."
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            # nearest store that delivers here; it prepares and sends the order
            store_id = quote["store_id"]

        try:
            packing_charge = Decimal(str(data.get("packing_charge") or 0))
        except (ArithmeticError, ValueError):
            packing_charge = Decimal("0")

        # Price of every line as at checkout: actual price (MRP), selling
        # price and, below, its share of the coupon
        order_lines = []
        for item_data in cart_items:
            item = Item.objects.filter(id=item_data.get("id")).first()
            if item is None:
                continue
            qty = int(item_data["quantity"])
            weight = item_data.get("weight", "")
            selling = Decimal(str(item_data["price"]))
            mrp, _ = unit_prices(item, weight)
            mrp = max(mrp, selling)
            order_lines.append({
                "item": item,
                "id": item.id,
                "category_id": item.category_id,
                "weight": weight,
                "qty": qty,
                "unit_price": selling,
                "unit_mrp": mrp,
                "price": selling * qty,
                "original_price": mrp * qty,
                "discounted": Decimal(str(item_data.get("discounted", 0) or 0)),
            })

        line_coupon = [Decimal("0.00")] * len(order_lines)
        line_free = [0] * len(order_lines)
        if coupon and discount > 0 and coupon.price_basis == "mrp":
            # an MRP coupon replaces the sale price on the lines it covers
            for i in coupon_eligible_lines(coupon, order_lines):
                line = order_lines[i]
                line["unit_price"] = line["unit_mrp"]
                line["price"] = line["original_price"]
        if coupon and discount > 0:
            try:
                coupon_total, line_coupon, line_free = calculate_coupon(coupon, order_lines)
                if abs(coupon_total - discount) > Decimal("0.01"):
                    print(f"Coupon {coupon.code}: checkout sent {discount}, server worked out {coupon_total}")
            except CouponNotApplicable as e:
                print(f"Coupon {coupon.code} not split over lines: {e}")

        items_mrp_total = sum((line["original_price"] for line in order_lines), Decimal("0"))
        items_total = sum((line["price"] for line in order_lines), Decimal("0"))

        # agent commission: the coupon's agent, at their current rate, on what
        # is paid for the items (no delivery or packing)
        agent = coupon.agent if coupon and coupon.agent_id else None
        commission_percent = commission_base = commission = None
        if agent:
            profile = UserProfile.objects.filter(user=agent).first()
            commission_percent = profile.commission_percent if profile else Decimal("0")
            commission_base = max(items_total - discount, Decimal("0"))
            commission = (commission_base * commission_percent / Decimal("100")).quantize(Decimal("0.01"))

        # Create Invoice
        invoice = Invoice.objects.create(
            user=request.user if request.user.is_authenticated else None,
            session_key=session_key,
            payment_mode=payment_mode,
            delivery_time=delivery_time,
            delivery_date=delivery_date,
            is_scheduled=is_scheduled,
            net_amount=net_amount,
            cgst=cgst,
            sgst=sgst,
            discount=discount,
            delivery_charge=delivery_charge,
            packing_charge=packing_charge,
            items_mrp_total=items_mrp_total,
            item_discount=items_mrp_total - items_total,
            items_total=items_total,
            coupon_code=coupon.code if coupon else "",
            coupon_type=coupon.discount_type if coupon else "",
            agent=agent,
            agent_commission_percent=commission_percent,
            agent_commission_base=commission_base,
            agent_commission=commission,
            status="ORDERED",
            address=address,
            coupon=coupon,
            store_id=store_id
        )

        # registration commission for the agent who registered this customer
        # (matched by email or mobile, not by username or browser)
        reg_emails, reg_phones = customer_contacts(request.user, address)
        apply_registration_commission(invoice, reg_emails, reg_phones, invoice.order_date)
        if invoice.registration_agent_id:
            invoice.save(update_fields=[
                "registration_agent", "registration_entry", "registration_commission_percent",
                "registration_commission_base", "registration_commission", "agent_commission",
            ])

        if razorpay_payment_id:
            invoice.razorpay_order_id = razorpay_order_id
            invoice.razorpay_payment_id = razorpay_payment_id
            invoice.save(update_fields=["razorpay_order_id", "razorpay_payment_id"])

        # Create Transactions
        created_transactions = []

        for index, line in enumerate(order_lines):
            txn = Transaction.objects.create(
                user=request.user if request.user.is_authenticated else None,
                session_key=session_key,
                item=line["item"],
                invoice=invoice,
                store_id=invoice.store_id,
                item_amount=line["unit_price"],
                mrp_price=line["unit_mrp"],
                quantity=line["qty"],
                weight=line["weight"],
                discounted=line["discounted"],
                coupon_discount=line_coupon[index],
                free_quantity=line_free[index],
                final_amount=max(line["price"] - line_coupon[index], Decimal("0")),
            )
            created_transactions.append(txn)

        try:
            if True:
                print("Sending order confirmation email to:")
                Thread(
                    target=send_order_confirmation_email,
                    kwargs={
                        "invoice": invoice,
                        "transactions": created_transactions
                    }
                ).start()
                print("Email thread started")

        except Exception as e:
            print(f"EMAIL ERROR: {str(e)}")

        return Response(
            {
                "message": "Order created successfully",
                "invoice_id": invoice.id,
                "order_number": invoice.order_number,
                "tracking_token": invoice.tracking_token
            },
            status=status.HTTP_201_CREATED
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_orders(request):
    invoices = Invoice.objects.filter(user=request.user).order_by('-order_date')
    serializer = InvoiceListSerializer(invoices, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_total_order_value(request):
    total = Invoice.objects.filter(user=request.user).aggregate(total_spent=Sum('net_amount'))
    return Response({'total_order_value': total['total_spent'] or 0})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_order_details(request, invoice_id):
    try:
        invoice = Invoice.objects.get(id=invoice_id, user=request.user)
    except Invoice.DoesNotExist:
        return Response({'error': 'Invoice not found'}, status=404)

    transactions = Transaction.objects.filter(invoice=invoice)
    serializer = TransactionDetailSerializer(transactions, many=True)
    return Response(serializer.data)

class PastOrdersView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def get(self, request):
        invoices = Invoice.objects.filter(user=request.user).order_by('-order_date')
        for pending in invoices.filter(refund_status="PENDING"):
            sync_refund_status(pending)
        # cancelled orders are listed but not counted as money spent
        total_spent = invoices.exclude(status="CANCELLED").aggregate(total=Sum('net_amount'))['total'] or 0
        serializer = InvoiceListSerializer(invoices, many=True)
        return Response({
            "total_order_value": total_spent,
            "orders": serializer.data
        })
    
class InvoiceDetailView(APIView):
    authentication_classes = [LenientJWTAuthentication]  # applies for all methods

    # def get_permissions(self):
    #     if self.request.method == 'GET':
    #         # return [IsAuthenticated()]  # enforce permission only on GET
    #     return []
    def get(self, request, invoice_id):
        invoice = find_invoice(invoice_id)
        if invoice is None:
            return Response({"error": "Invoice not found"}, status=status.HTTP_404_NOT_FOUND)

        # same answer as a missing order, so order numbers cannot be probed
        if not can_access_invoice(request, invoice):
            return Response({"error": "Invoice not found"}, status=status.HTTP_404_NOT_FOUND)

        sync_refund_status(invoice)
        serializer = InvoiceDetailSerializer(invoice)
        return Response(serializer.data)
    
    def patch(self, request, invoice_id):
        # only staff (admin, maker, delivery) move an order along
        if not is_staff_request(request):
            return Response({"error": "Staff login required"}, status=status.HTTP_403_FORBIDDEN)

        invoice = find_invoice(invoice_id)
        if invoice is None:
            return Response({"error": "Invoice not found"}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('status')
        valid_statuses = {value for value, _ in Invoice.STATUS_CHOICES}
        if new_status not in valid_statuses:
            return Response({"error": "A valid status is required"}, status=status.HTTP_400_BAD_REQUEST)

        invoice.status = new_status
        invoice.save()

        serializer = InvoiceDetailSerializer(invoice)
        return Response(serializer.data, status=status.HTTP_200_OK)

class SubmitRatingView(generics.CreateAPIView):
    serializer_class = RatingSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

@api_view(['GET'])
def get_all_transactions_and_invoices(request):
    invoices = Invoice.objects.select_related('store', 'address', 'coupon').prefetch_related('transactions', 'transactions__item').all().order_by("-order_date")   
    serializer = InvoiceDetailSerializer(invoices, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([AllowAny])
def admin_login(request):
    """
    Admin login endpoint using existing User model
    """
    try:
        username = request.data.get('username')
        password = request.data.get('password')
        role = request.data.get('role', 'admin')

        if not username or not password:
            return Response({
                'error': 'Username and password are required'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Authenticate user
        user = authenticate(username=username, password=password)
        
        if not user:
            return Response({
                'error': 'Invalid credentials'
            }, status=status.HTTP_401_UNAUTHORIZED)

        # Staff status must be ticked on the account (Staff users admin page)
        if not user.is_staff:
            return Response({
                'error': 'Access denied - Staff access required'
            }, status=status.HTTP_403_FORBIDDEN)

        # Validate role (optional)
        allowed_roles = ['admin', 'staff']
        if role not in allowed_roles:
            return Response({
                'error': f'Invalid role. Allowed roles are: {", ".join(allowed_roles)}'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Handle UserProfile
        try:
            profile = UserProfile.objects.get(user=user)
            user_role = profile.role
        except UserProfile.DoesNotExist:
            # Create profile if it doesn't exist
            # profile = UserProfile.objects.create(user=user, role=role)
            # user_role = role
            return Response({
                'error': f'User Doesnt Have adminaccess '
            }, status=status.HTTP_400_BAD_REQUEST)

        # Generate tokens
        refresh = RefreshToken.for_user(user)
        access_token = refresh.access_token

        # Add role to token
        access_token['role'] = user_role
        access_token['user_id'] = user.id

        return Response({
            'access': str(access_token),
            'refresh': str(refresh),
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'role': user_role
            },
            'message': f'Successfully logged in as {user_role}'
        }, status=status.HTTP_200_OK)

    except Exception as e:
        # Log the error internally (optional)
        print(f"Login error: {e}")
        return Response({
            'error': 'Login failed',
            'message': 'An unexpected error occurred. Please try again later.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class FieldMarketingFormCreateView(generics.CreateAPIView):
    queryset = FieldMarketingForm.objects.all()
    serializer_class = FieldMarketingFormSerializer
    
client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

@csrf_exempt
def create_order(request):
    if request.method == "POST":
        data = json.loads(request.body)
        amount = int(data.get("amount", 0)) * 100  # convert to paise

        order = client.order.create({
            "amount": amount,
            "currency": "INR",
            "payment_capture": 1
        })

        return JsonResponse(order, safe=False)
    
@csrf_exempt
def verify_payment(request):
    if request.method == "POST":
        data = json.loads(request.body)

        razorpay_order_id = data['razorpay_order_id']
        razorpay_payment_id = data['razorpay_payment_id']
        razorpay_signature = data['razorpay_signature']

        generated_signature = hmac.new(
            bytes(settings.RAZORPAY_KEY_SECRET, 'utf-8'),
            bytes(razorpay_order_id + "|" + razorpay_payment_id, 'utf-8'),
            hashlib.sha256
        ).hexdigest()

        if generated_signature == razorpay_signature:
            return JsonResponse({"status": "Payment Verified"})
        else:
            return JsonResponse({"status": "Payment Verification Failed"}, status=400)
        
class BannerListView(generics.ListAPIView):
    queryset = Banner.objects.all()
    serializer_class = BannerSerializer

def cart_weight(weight):
    """A cart line's weight as one of Coupon.WEIGHT_CHOICES; anything that is
    not 250 g, 500 g or a piece is priced as 1 kg (as Cart.total_price does)."""
    weight = str(weight or "").strip().lower()
    if weight == PIECE:
        return PIECE
    return weight if weight in ("250", "500") else "1000"


class CouponNotApplicable(Exception):
    """The coupon cannot be used on this cart; the message says why."""


def calculate_coupon(coupon, lines):
    """Coupon discount for a cart, worked out per cart line.

    Each line is a dict with id, qty, price (line total at the selling price),
    original_price (line total at MRP), category_id and weight.
    Returns (discount, line_discounts, free_units): the total off, the part of
    it taken off each line (rounded so they add up to the total) and, for Buy
    X Get Y Free, how many units of each line are free.
    Raises CouponNotApplicable when the cart does not qualify.
    """
    price_key = "original_price" if coupon.price_basis == "mrp" else "price"
    eligible = coupon_eligible_lines(coupon, lines)

    if not eligible:
        raise CouponNotApplicable("Coupon not applicable to selected items")

    eligible_subtotal = sum(Decimal(str(lines[i][price_key])) for i in eligible)

    if eligible_subtotal < coupon.min_order_value:
        raise CouponNotApplicable(f"Minimum order value Rs.{coupon.min_order_value} required")

    raw = {}   # line index -> discount before rounding
    free = {}  # line index -> free units (Buy X Get Y Free)

    if coupon.discount_type == "bogo":
        buy, get = coupon.buy_quantity, coupon.get_quantity
        group_size = buy + get

        # one entry per unit at the price it is charged at (MRP for an MRP
        # coupon, else the selling price), costliest first
        units = []
        for i in eligible:
            qty = int(lines[i]["qty"] or 0)
            if qty <= 0:
                continue
            unit_price = Decimal(str(lines[i][price_key])) / qty
            units.extend([(unit_price, i)] * qty)
        units.sort(key=lambda u: u[0], reverse=True)

        groups = len(units) // group_size
        if groups == 0:
            missing = group_size - len(units)
            raise CouponNotApplicable(
                f"Add {missing} more eligible item{'s' if missing > 1 else ''} "
                f"to use this Buy {buy} Get {get} Free offer"
            )

        # in each group the last `get` units are the cheapest: those are free
        for g in range(groups):
            for unit_price, i in units[g * group_size + buy:(g + 1) * group_size]:
                raw[i] = raw.get(i, Decimal("0")) + unit_price
                free[i] = free.get(i, 0) + 1

        discount = sum(raw.values(), Decimal("0"))
    elif coupon.discount_type == "percent":
        discount = eligible_subtotal * coupon.discount_value / Decimal("100")
    else:
        discount = coupon.discount_value

    uncapped = discount
    if coupon.max_discount:
        discount = min(discount, coupon.max_discount)
    discount = min(discount, eligible_subtotal).quantize(Decimal("0.01"))

    if raw:
        # free units, scaled down if max_discount cut the total
        scale = discount / uncapped if uncapped else Decimal("0")
        raw = {i: v * scale for i, v in raw.items()}
    elif eligible_subtotal:
        # percent / fixed: spread over the eligible lines by value
        raw = {i: Decimal(str(lines[i][price_key])) / eligible_subtotal * discount for i in eligible}

    line_discounts = [Decimal("0.00")] * len(lines)
    for i, value in raw.items():
        line_discounts[i] = value.quantize(Decimal("0.01"))
    # rounding leftovers go on the line with the biggest share
    leftover = discount - sum(line_discounts, Decimal("0"))
    if leftover and raw:
        biggest = max(raw, key=lambda i: line_discounts[i])
        line_discounts[biggest] += leftover

    return discount, line_discounts, [free.get(i, 0) for i in range(len(lines))]


def coupon_eligible_lines(coupon, lines):
    """Indexes of the cart lines the coupon applies to: by order, category or
    item, and only the weights it allows."""
    if coupon.apply_on == "order":
        eligible = list(range(len(lines)))
    elif coupon.apply_on == "category":
        category_ids = set(coupon.categories.values_list("id", flat=True))
        eligible = [i for i, line in enumerate(lines) if line.get("category_id") in category_ids]
    elif coupon.apply_on == "item":
        item_ids = set(coupon.items.values_list("id", flat=True))
        eligible = [i for i, line in enumerate(lines) if line.get("id") in item_ids]
    else:
        eligible = []

    # coupon limited to some weights (250 g, 1 kg, by piece...)
    allowed_weights = coupon.allowed_weights()
    if allowed_weights:
        eligible = [i for i in eligible if cart_weight(lines[i].get("weight")) in allowed_weights]
    return eligible


def coupon_charged_totals(coupon, lines):
    """What each line costs before the coupon comes off. An MRP coupon is
    worked out on MRP and replaces the item's own sale price, so the lines it
    covers are charged at MRP; every other line keeps its selling price."""
    totals = [Decimal(str(line["price"])) for line in lines]
    if coupon.price_basis == "mrp":
        for i in coupon_eligible_lines(coupon, lines):
            totals[i] = max(Decimal(str(lines[i]["original_price"])), totals[i])
    return totals


def unit_prices(item, weight):
    """(MRP, selling price) of one unit of an item: one pack of this weight,
    or one piece. Same rules as the checkout page."""
    weight = cart_weight(weight)
    if weight == PIECE:
        price = item.piece_price or Decimal("0")
        return Decimal(price), Decimal(price)
    if weight == "250":
        mrp, offer = item.price_quarter, item.discounted_price_quarter
    elif weight == "500":
        mrp, offer = item.price_half, item.discounted_price_half
    else:
        mrp, offer = item.price, item.discounted_price
    mrp = Decimal(mrp or 0)
    selling = Decimal(offer) if offer and 0 < Decimal(offer) < mrp else mrp
    return mrp, selling


@api_view(["POST"])
def apply_coupon(request):
    code = request.data.get("code")
    cart_items = request.data.get("cart_items", [])
    try:
        coupon = Coupon.objects.get(code=code)

        phone_number = None
        if cart_items:
            phone_number = cart_items[0].get("phone_number")

        address_ids = []

        if phone_number:
            address_ids = Address.objects.filter(
                phone_number=phone_number
            ).values_list("id", flat=True)
        if not coupon.is_valid():
            return Response({"error": "Coupon expired or inactive"},status=400)
        payment_mode = request.data.get("payment_mode")
        if payment_mode and not coupon.allows_payment(payment_mode):
            return Response({"error": coupon.payment_mode_message()}, status=400)
        already_used = Invoice.objects.filter(
            address_id__in=address_ids,
            coupon=coupon
        ).exists()

        if already_used:
            return Response(
                {"error": "Coupon already used"},
                status=400
            )

        if coupon.is_new_customer_only:
            existing_orders = Invoice.objects.filter(
                address_id__in=address_ids
            ).exists()

            if existing_orders:
                return Response(
                    {"error": "Coupon valid only for new customers"},
                    status=400
                )

        try:
            discount, line_discounts, free_units = calculate_coupon(coupon, cart_items)
        except CouponNotApplicable as e:
            return Response({"error": str(e)}, status=400)

        # what each line costs before the coupon: the selling price, or MRP
        # on the lines an MRP coupon covers
        charged_totals = coupon_charged_totals(coupon, cart_items)
        total_cart_value = sum(charged_totals, Decimal("0"))
        new_total = max(total_cart_value - discount, Decimal("0"))

        discounted_items = []
        for index, item in enumerate(cart_items):
            current_total = charged_totals[index]
            qty = int(item["qty"] or 0)
            item_discount = line_discounts[index]
            discounted_total = max(current_total - item_discount, Decimal("0"))
            discounted_items.append({
                "id": item["id"],
                "weight": item.get("weight"),
                "qty": item["qty"],
                # true when this line is charged at MRP (its sale price dropped)
                "charged_at_mrp": current_total != Decimal(str(item["price"])),
                "current_total": round(current_total, 2),
                "original_total": round(Decimal(str(item["original_price"])), 2),
                "discount": round(item_discount, 2),
                "free_units": free_units[index],
                "discounted_unit_price": round(discounted_total / qty if qty > 0 else Decimal("0"), 2),
                "discounted_total": round(discounted_total, 2),
            })

        return Response({
            "success": True,
            "coupon_id": coupon.id,
            "price_basis": coupon.price_basis,
            "discount_type": coupon.discount_type,
            # "normal", "free" or "charged" (no free delivery with this coupon)
            "delivery_rule": coupon.delivery_rule,
            "free_delivery": coupon.free_delivery,
            "payment_mode": coupon.payment_mode,
            "discount": round(discount, 2),
            "new_total": round(new_total, 2),
            "discounted_items": discounted_items,
        })

    except Coupon.DoesNotExist:
        return Response(
            {"error": "Invalid coupon"},
            status=400
        )

    except Exception as e:
        print(e)

        return Response(
            {"error": "Something went wrong"},
            status=500
        )
        

@api_view(["POST"])
@authentication_classes([LenientJWTAuthentication])
@permission_classes([IsAuthenticated])
def agent_submit(request):
    """A logged-in agent registers a customer; the entry is theirs."""
    data = request.data
    profile = UserProfile.objects.filter(user=request.user).first()
    if not profile or profile.role != "agent":
        return Response({"error": "Agent login required"}, status=status.HTTP_403_FORBIDDEN)
    agent = request.user

    # the customer's orders are matched later by this email or mobile number
    phone = normalize_phone(data.get("customer_phone"))
    email = (data.get("customer_email") or "").strip().lower()
    if len(phone) != 10:
        return Response({"error": "Enter a valid 10 digit mobile number"}, status=status.HTTP_400_BAD_REQUEST)
    if email:
        from django.core.validators import validate_email
        from django.core.exceptions import ValidationError
        try:
            validate_email(email)
        except ValidationError:
            return Response({"error": "Enter a valid email address"}, status=status.HTTP_400_BAD_REQUEST)

    entry = AgentCustomerEntry.objects.create(
        agent=agent,
        customer_name=data.get("customer_name"),
        customer_phone=phone,
        customer_email=email,
        area=data.get("area"),
        pincode=data.get("pincode"),
        notes=data.get("notes", "")
    )

    serializer = AgentCustomerEntrySerializer(entry)
    return Response(
        {"message": "Entry created successfully", "data": serializer.data},
        status=status.HTTP_201_CREATED
    )
    
@api_view(["GET"])
@authentication_classes([LenientJWTAuthentication])
@permission_classes([IsAuthenticated])
def agent_dashboard(request):
    """Customers an agent registered, and orders and commission from the
    agent's coupons. Agents see their own; admins can pass ?agent_id=."""
    try:
        page_number = int(request.GET.get("page", 1))
    except (TypeError, ValueError):
        page_number = 1

    profile = UserProfile.objects.filter(user=request.user).first()
    role = profile.role if profile else None
    if role == "agent":
        agent = request.user
    elif role == "admin" or request.user.is_superuser:
        agent = User.objects.filter(id=request.GET.get("agent_id") or request.user.id).first()
        if agent is None:
            return Response({"error": "Agent not found"}, status=status.HTTP_404_NOT_FOUND)
    else:
        return Response({"error": "Agent login required"}, status=status.HTTP_403_FORBIDDEN)

    # ✅ All customer entries for this agent
    entries_qs = AgentCustomerEntry.objects.filter(agent=agent).order_by("-created_at")

    # ✅ Pagination
    paginator = Paginator(entries_qs, 10)  # 10 items per page
    page_obj = paginator.get_page(page_number)

    final_entries = []
    total_before = 0
    total_after = 0
    total_sum_orders = 0

    for entry in page_obj:
        # the customer's orders by email or mobile number, on any device or
        # login: the account's email or phone, or the phone on the order's
        # address
        emails = {entry.customer_email} if entry.customer_email else set()
        phones = {normalize_phone(entry.customer_phone)} - {""}
        invoices = Invoice.objects.filter(
            contact_filter(emails, phones, "user__email", "user__userprofile__phone")
            | contact_filter(set(), phones, "user__email", "address__phone_number")
        ).distinct()

        # ✅ Count orders BEFORE and AFTER registration
        orders_before = invoices.filter(order_date__lt=entry.created_at).count()
        orders_after = invoices.filter(order_date__gte=entry.created_at).count()
        total_orders = invoices.count()

        # ✅ Add to dashboard stats
        total_before += orders_before
        total_after += orders_after
        total_sum_orders += total_orders

        final_entries.append({
            "id": entry.id,
            "customer_name": entry.customer_name,
            "customer_phone": entry.customer_phone,
            "customer_email": entry.customer_email,
            "area": entry.area,
            "pincode": entry.pincode,
            "created_at": entry.created_at.strftime("%Y-%m-%d %I:%M %p"),

            "orders_before": orders_before,
            "orders_after": orders_after,
            "total_orders": total_orders
        })

    # ✅ Global stats for top cards
    stats = {
        "registered_count": entries_qs.count(),
        "total_orders_before": total_before,
        "total_orders_after": total_after,
        "total_orders": total_sum_orders,
    }

    # orders placed with the agent's coupons; cancelled ones earn nothing
    agent_profile = UserProfile.objects.filter(user=agent).first()
    coupon_orders = Invoice.objects.filter(agent=agent).order_by("-order_date")
    earning_orders = coupon_orders.exclude(status="CANCELLED")
    totals = earning_orders.aggregate(
        sales=Sum("agent_commission_base"),
        commission=Sum("agent_commission"),
    )
    # orders from customers the agent registered (matched by email/mobile)
    registration_orders = Invoice.objects.filter(registration_agent=agent).order_by("-order_date")
    reg_earning = registration_orders.exclude(status="CANCELLED")
    reg_totals = reg_earning.aggregate(
        sales=Sum("registration_commission_base"),
        commission=Sum("registration_commission"),
    )
    coupon_commission = totals["commission"] or Decimal("0")
    registration_commission = reg_totals["commission"] or Decimal("0")
    stats.update({
        "coupon_orders": earning_orders.count(),
        "coupon_sales": totals["sales"] or Decimal("0"),
        "commission_earned": coupon_commission,
        "commission_percent": agent_profile.commission_percent if agent_profile else Decimal("0"),
        "registration_orders": reg_earning.count(),
        "registration_sales": reg_totals["sales"] or Decimal("0"),
        "registration_commission_earned": registration_commission,
        "registration_commission_percent": agent_profile.registration_commission_percent if agent_profile else Decimal("0"),
        "registration_commission_days": agent_profile.registration_commission_days if agent_profile else None,
        "total_commission_earned": coupon_commission + registration_commission,
    })
    coupon_order_rows = [
        {
            "order_number": inv.order_number,
            "order_date": inv.order_date.strftime("%Y-%m-%d %I:%M %p"),
            "coupon_code": inv.coupon_code,
            "status": inv.status,
            "commission_base": inv.agent_commission_base,
            "commission_percent": inv.agent_commission_percent,
            "commission": Decimal("0") if inv.status == "CANCELLED" else inv.agent_commission,
            # the same agent registered this customer and that commission was higher
            "paid_as_registration": bool(
                inv.registration_agent_id == agent.id and inv.registration_commission
                and not inv.agent_commission
            ),
        }
        for inv in coupon_orders[:50]
    ]
    registration_order_rows = [
        {
            "order_number": inv.order_number,
            "order_date": inv.order_date.strftime("%Y-%m-%d %I:%M %p"),
            "customer": inv.registration_entry.customer_name if inv.registration_entry else "",
            "status": inv.status,
            "commission_base": inv.registration_commission_base,
            "commission_percent": inv.registration_commission_percent,
            "commission": Decimal("0") if inv.status == "CANCELLED" else inv.registration_commission,
            # the coupon commission on this order was higher, so that was paid
            "paid_as_coupon": bool(inv.agent_id == agent.id and not inv.registration_commission),
        }
        for inv in registration_orders.select_related("registration_entry")[:50]
    ]

    return Response({
        "agent": {"id": agent.id, "name": agent.get_full_name() or agent.username},
        "coupons": list(Coupon.objects.filter(agent=agent).values_list("code", flat=True)),
        "coupon_orders": coupon_order_rows,
        "registration_orders": registration_order_rows,
        "entries": final_entries,
        "stats": stats,
        "page": page_number,
        "page_count": paginator.num_pages
    }, status=status.HTTP_200_OK)
    
@api_view(["POST"])
def create_offline_order(request):

    serializer = OfflineOrderSerializer(data=request.data)

    if serializer.is_valid():

        order = serializer.save()

        return Response(
            {
                "message": "Order created",
                "order_id": order.id
            },
            status=status.HTTP_201_CREATED
        )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(["POST"])
def validate_coupon(request):

    phone = request.data.get("phone")
    coupon = request.data.get("coupon")

    if coupon != "VAT20":
        return Response({
            "valid": False,
            "message": "Invalid coupon"
        })

    order_exists = OfflineOrder.objects.filter(phone=phone).exists()

    if order_exists:
        return Response({
            "valid": False,
            "message": "Coupon only for new customers"
        })

    return Response({
        "valid": True,
        "discount": 20
    })

class CreateReviewView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [LenientJWTAuthentication]

    def post(self, request):
        data = request.data
        session_key = request.headers.get("x-session-key")

        item_id = data.get("item_id")
        invoice_id = data.get("invoice_id")
        rating = data.get("rating")
        review_text = data.get("review", "")

        if not item_id or not invoice_id or not rating:
            return Response({"error": "Missing fields"}, status=400)

        try:
            item = Item.objects.get(id=item_id)
            invoice = Invoice.objects.get(id=invoice_id)
        except:
            return Response({"error": "Invalid item/order"}, status=400)

        if not can_access_invoice(request, invoice):
            return Response({"error": "Invalid item/order"}, status=400)

        if not invoice.transactions.filter(item=item).exists():
            return Response({"error": "Item not in this order"}, status=400)

        if invoice.status != "DELIVERED":
            return Response({"error": "Order not delivered"}, status=400)

        photos = request.FILES.getlist("images")
        photo_error = validate_review_photos(photos)
        if photo_error:
            return Response({"error": photo_error}, status=400)

        with transaction.atomic():
            obj, created = Review.objects.update_or_create(
                item=item,
                invoice=invoice,
                defaults={
                    "user": request.user if request.user.is_authenticated else None,
                    "session_key": session_key,
                    "rating": rating,
                    "review": review_text
                }
            )
            room = ReviewImage.MAX_PER_REVIEW - obj.images.count()
            for photo in photos[:max(room, 0)]:
                ReviewImage.objects.create(review=obj, image=photo)

        return Response({
            "message": "Review saved",
            "created": created
        })
        
         
REVIEW_PHOTO_MAX_BYTES = 5 * 1024 * 1024


def validate_review_photos(photos):
    """Returns an error message, or None when every photo is a real image
    under the size limit."""
    from PIL import Image, UnidentifiedImageError

    if len(photos) > ReviewImage.MAX_PER_REVIEW:
        return f"You can add up to {ReviewImage.MAX_PER_REVIEW} photos"
    for photo in photos:
        if photo.size > REVIEW_PHOTO_MAX_BYTES:
            return "Each photo must be under 5 MB"
        try:
            Image.open(photo).verify()
        except (UnidentifiedImageError, OSError, SyntaxError, ValueError):
            return "Only image files can be added"
        finally:
            photo.seek(0)
    return None


def reviewer_name(review):
    """First name and last initial, e.g. "Priya S."; never the email."""
    user = review.user
    if user and user.first_name:
        initial = f" {user.last_name[0]}." if user.last_name else ""
        return f"{user.first_name}{initial}"
    return "Verified buyer"


class ItemReviewsView(APIView):
    """Written reviews and review photos for the product page. Star-only
    ratings (no text, no photo) are left out; they still count in the
    average rating."""
    permission_classes = [AllowAny]

    def get(self, request, item_id):
        reviews = (
            Review.objects.filter(item_id=item_id)
            .filter((Q(review__isnull=False) & ~Q(review="")) | Q(images__isnull=False))
            .select_related("user")
            .prefetch_related("images")
            .distinct()
            .order_by("-created_at")[:50]
        )
        summary = Review.objects.filter(item_id=item_id).aggregate(
            avg_rating=Avg("rating"), total_reviews=Count("id")
        )
        return Response({
            "avg_rating": round(summary["avg_rating"] or 0, 1),
            "total_reviews": summary["total_reviews"],
            "reviews": [
                {
                    "id": r.id,
                    "name": reviewer_name(r),
                    "rating": r.rating,
                    "review": (r.review or "").strip(),
                    "created_at": r.created_at,
                    "images": [request.build_absolute_uri(img.image.url) for img in r.images.all()],
                }
                for r in reviews
                # whitespace-only text with no photo counts as no review
                if (r.review or "").strip() or r.images.all()
            ],
        })


class SimilarItemsView(APIView):
    """Items for the bottom of the product page: others from the same
    category first, topped up with random items when the category is small."""
    permission_classes = [AllowAny]
    LIMIT = 8

    def get(self, request, item_id):
        item = get_object_or_404(Item, id=item_id)
        annotated = Item.objects.exclude(id=item.id).annotate(
            avg_rating=Avg("reviews__rating"),
            total_reviews=Count("reviews", distinct=True),
        )
        same = list(ordered_items(annotated.filter(category_id=item.category_id))[:self.LIMIT])
        extra = []
        if len(same) < self.LIMIT:
            extra = list(
                annotated.exclude(category_id=item.category_id)
                .filter(available=True)
                .order_by("?")[:self.LIMIT - len(same)]
            )
        serializer = ItemSerializer(same + extra, many=True, context={"request": request})
        return Response({"same_category": len(same) > 0, "items": serializer.data})


class ReviewSummaryView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, item_id):
        data = Review.objects.filter(item_id=item_id).aggregate(
            avg_rating=Avg("rating"),
            total_reviews=Count("id")
        )

        return Response({
            "avg_rating": round(data["avg_rating"] or 0, 1),
            "total_reviews": data["total_reviews"]
        })

class OrderReviewStatus(APIView):
    def get(self, request, invoice_id):
        reviews = Review.objects.filter(invoice_id=invoice_id)

        return Response({
            r.item_id: {
                "rating": r.rating,
                "review": r.review,
                "images": [request.build_absolute_uri(img.image.url) for img in r.images.all()],
            } for r in reviews.prefetch_related("images")
        })
        
@api_view(['POST'])
def save_mobile(request):
    mobile = request.data.get('mobile')

    # Validation
    if not mobile:
        return Response({"error": "Mobile number is required"}, status=400)

    if not mobile.isdigit() or len(mobile) != 10:
        return Response({"error": "Invalid mobile number"}, status=400)

    if mobile[0] not in ['6', '7', '8', '9']:
        return Response({"error": "Enter valid Indian mobile number"}, status=400)

    # Save or ignore duplicates
    obj, created = MobileNumber.objects.get_or_create(mobile=mobile)

    return Response({
        "status": "success",
        "is_new": created
    })

class DeliveryConfigAPIView(APIView):
    def get(self, request):
        config = DeliveryFeeConfig.objects.first()
        if not config:
            config = DeliveryFeeConfig.objects.create()
        return Response({
            "free_delivery_above": config.free_delivery_above
        })

@api_view(["GET"])
@permission_classes([AllowAny])
def delivery_dates_view(request):
    """Fastest and latest delivery date for the items in a cart
    (?item_ids=1,2,3), for the delivery date choice at checkout."""
    ids = [i for i in request.query_params.get("item_ids", "").split(",") if i.strip().isdigit()]
    earliest, latest = delivery_window(Item.objects.filter(id__in=ids))
    return Response({
        "earliest_date": earliest.isoformat(),
        "latest_date": latest.isoformat(),
        "today": date.today().isoformat(),
    })


@api_view(["GET"])
@permission_classes([AllowAny])
def delivery_quote_view(request):
    """Distance, delivery charge and whether we deliver, for a saved address
    (?address_id=) or for raw coordinates (?lat=&lng=)."""
    address_id = request.query_params.get("address_id")
    if address_id:
        address = Address.objects.filter(id=address_id).first()
        if not address:
            return Response({"error": "Invalid address"}, status=404)
        latitude, longitude = address.latitude, address.longitude
    else:
        try:
            latitude = float(request.query_params["lat"])
            longitude = float(request.query_params["lng"])
        except (KeyError, ValueError):
            return Response({"error": "address_id or lat and lng are required"}, status=400)

    return Response(delivery_quote(latitude, longitude))


@api_view(["GET"])
def get_site_config(request):
    config = SiteConfig.objects.first()

    return Response({
        "whatsapp_number": config.whatsapp_number if config else ""
    })
    
@api_view(["POST"])
@authentication_classes([LenientJWTAuthentication])
@permission_classes([AllowAny])
def cancel_order(request, invoice_id):
    # the row is locked so two clicks cannot start two refunds
    with transaction.atomic():
        invoice = Invoice.objects.select_for_update().filter(id=invoice_id).first()

        if not invoice or not can_access_invoice(request, invoice):
            return Response({"error": "Invalid order."}, status=404)

        if invoice.status not in ["ORDERED", "IN_PROGRESS"]:
            return Response(
                {"error": "Order can no longer be cancelled."},
                status=400
            )

        if invoice.payment_mode == "UPI":
            if not invoice.razorpay_payment_id:
                return Response(
                    {"error": "This online order cannot be cancelled here. Please contact us to cancel it."},
                    status=400
                )

            # full refund of the Razorpay payment, back to where it was paid from
            if not invoice.refund_id:
                try:
                    # refund exactly what was charged and is still refundable
                    # (Razorpay fails this with "invalid request sent" when the
                    # account balance is lower than the refund amount)
                    payment = client.payment.fetch(invoice.razorpay_payment_id)
                    refundable = int(payment["amount"]) - int(payment.get("amount_refunded") or 0)
                    refund = client.payment.refund(
                        invoice.razorpay_payment_id,
                        {"amount": refundable, "notes": {"invoice_id": str(invoice.id)}}
                    )
                except Exception as e:
                    print(f"Refund failed for invoice {invoice.id}: {e}")
                    return Response(
                        {"error": "Refund could not be started, so the order was not cancelled. Please try again or contact us."},
                        status=502
                    )

                refund_status = str(refund.get("status", "")).upper()
                invoice.refund_id = refund.get("id")
                invoice.refund_status = refund_status if refund_status in ("PROCESSED", "FAILED") else "PENDING"
                invoice.refund_amount = (
                    Decimal(refund["amount"]) / 100 if refund.get("amount") is not None else invoice.net_amount
                )

        elif invoice.payment_mode != "CASH":
            return Response(
                {"error": "This order cannot be cancelled here. Please contact us to cancel it."},
                status=400
            )

        invoice.status = "CANCELLED"
        invoice.save(update_fields=["status", "refund_id", "refund_status", "refund_amount"])

    return Response({
        "success": True,
        "message": "Order cancelled successfully.",
        "status": invoice.status,
        "refund_status": invoice.refund_status,
        "refund_amount": invoice.refund_amount,
    })
