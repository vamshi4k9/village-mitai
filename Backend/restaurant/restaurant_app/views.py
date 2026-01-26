import hashlib
import hmac
from django.shortcuts import get_object_or_404
import razorpay
from rest_framework.response import Response
from django.core.paginator import Paginator


from restaurant import settings
from .serializers import AgentCustomerEntrySerializer, BannerSerializer, CategorySerializer, FieldMarketingFormSerializer, ItemSerializer, CartSerializer, RatingSerializer, RegisterSerializer, UserProfileSerializer, AddressSerializer , InvoiceListSerializer, TransactionDetailSerializer, InvoiceDetailSerializer
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.db.models import Sum
from rest_framework import generics
from rest_framework.decorators import action


from .models import AgentCustomerEntry, Banner, Category, Coupon, FieldMarketingForm, Item, Cart, Order, OrderItem, Address, Invoice, Transaction
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
from rest_framework.decorators import api_view, permission_classes
from django.contrib.auth import authenticate
from .models import UserProfile 
from .serializers import UserSerializer


user_otp_map = {}  # Store phone -> OTP temporarily (in prod use DB or cache)
class OptionalJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        header = self.get_header(request)
        if header is None:
            return None
        return super().authenticate(request)

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


def search_items(request):
    query = request.GET.get('q', '')
    if query:
        items = Item.objects.filter(name__icontains=query).distinct()
    else:
        items = Item.objects.none()

    data = [
        {
            "id": item.id,
            "name": item.name,
            "price": item.price,
            "image_url": item.image,
            "bestseller": item.bestseller,
            "category": [cat.name for cat in item.category.all()]
        }
        for item in items
    ]
    return Response(data, safe=False)


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

class ItemsByCategoryAPIView(APIView):
    def get(self, request, category_name):
        category = get_object_or_404(Category, name=category_name)
        items = Item.objects.filter(category=category.id)
        serializer = ItemSerializer(items, many=True ,context={'request': request})
        return Response(serializer.data)
    

class BestsellerItemsAPIView(APIView):
    def get(self, request):
        bestsellers = Item.objects.filter(bestseller=True)
        serializer = ItemSerializer(bestsellers, many=True)
        return Response(serializer.data)

class CartViewSet(ModelViewSet):
    serializer_class = CartSerializer
    queryset = Cart.objects.all()

    def get_session_key(self):
        session_key = self.request.headers.get("x-session-key")
        if not session_key:
            self.request.session.create()
            session_key = self.request.session.session_key
        return session_key

    def get_queryset(self):
        session_key = self.get_session_key()
        return super().get_queryset().filter(session_key=session_key)

    def create(self, request, *args, **kwargs):
        session_key = self.get_session_key()
        item_id = request.data.get("item")
        quantity = int(request.data.get("quantity", 1))
        weight = request.data.get("weight", 1)

        cart_item, created = Cart.objects.get_or_create(
            session_key=session_key,
            item_id=item_id,
            weight=weight,
            defaults={"quantity": quantity},
        )

        if not created:
            cart_item.quantity += quantity
            cart_item.save()

        serializer = self.get_serializer(cart_item)
        return Response(serializer.data, status=201 if created else 200)

    @action(detail=False, methods=["delete"], url_path="clear")
    def clear_cart(self, request):
        session_key = self.get_session_key()

        deleted_count, _ = Cart.objects.filter(session_key=session_key).delete()

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


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication] 

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
class AddressView(APIView):
    permission_classes = [AllowAny]
    # authentication_classes = [OptionalJWTAuthentication]
    def get(self, request):
        if request.user.is_authenticated:
            addresses = Address.objects.filter(user=request.user)
        else:
            session_key = request.headers.get("x-session-key")
            addresses = Address.objects.filter(session_key=session_key)
        serializer = AddressSerializer(addresses, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        session_key = request.headers.get("x-session-key")
        print(session_key)
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
    

class CreateOrderView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [OptionalJWTAuthentication]

    def post(self, request):
        data = request.data
        session_key = request.headers.get("x-session-key")
        payment_mode = data.get("payment_mode")
        delivery_time = data.get("delivery_time", 1)
        net_amount = Decimal(data.get("net_amount", 0))
        cgst = Decimal(data.get("cgst", 0))
        sgst = Decimal(data.get("sgst", 0))
        discount = Decimal(data.get("discount", 0))
        cart_items = data.get("cart_items", [])

        if not payment_mode or not cart_items:
            return Response({"error": "Payment mode and cart items are required"}, status=status.HTTP_400_BAD_REQUEST)

        if request.user.is_authenticated:
            invoice = Invoice.objects.create(
                user=request.user,
                session_key=session_key,
                payment_mode=payment_mode,
                delivery_time=delivery_time,
                net_amount=net_amount,
                cgst=cgst,
                sgst=sgst,
                discount=discount,
                status='ORDERED'
            )
        else:
            invoice = Invoice.objects.create(
                session_key=session_key,
                payment_mode=payment_mode,
                delivery_time=delivery_time,
                net_amount=net_amount,
                cgst=cgst,
                sgst=sgst,
                discount=discount,
                status='ORDERED'
            )

        # Create Transactions for each cart item
        for item_data in cart_items:
            try:
                item = Item.objects.get(id=item_data["id"])
                if request.user.is_authenticated:
                    Transaction.objects.create(
                        user=request.user,
                        session_key=session_key,
                        item=item,
                        invoice=invoice,
                        item_amount=Decimal(item_data["price"]),
                        quantity=int(item_data["quantity"]),
                        weight=item_data.get("weight", ""),
                        discounted=Decimal(item_data.get("discounted", 0))
                    )
                else:
                    Transaction.objects.create(
                        session_key=session_key,
                        item=item,
                        invoice=invoice,
                        item_amount=Decimal(item_data["price"]),
                        quantity=int(item_data["quantity"]),
                        weight=item_data.get("weight", ""),
                        discounted=Decimal(item_data.get("discounted", 0))
                    )
            except Item.DoesNotExist:
                continue
        return Response({"message": "Order created successfully", "invoice_id": invoice.id}, status=status.HTTP_201_CREATED)


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
        total_spent = invoices.aggregate(total=Sum('net_amount'))['total'] or 0
        serializer = InvoiceListSerializer(invoices, many=True)
        return Response({
            "total_order_value": total_spent,
            "orders": serializer.data
        })
    
class InvoiceDetailView(APIView):
    authentication_classes = [OptionalJWTAuthentication]  # applies for all methods

    # def get_permissions(self):
    #     if self.request.method == 'GET':
    #         # return [IsAuthenticated()]  # enforce permission only on GET
    #     return []
    def get(self, request, invoice_id):
        try:
            invoice = Invoice.objects.get(id=invoice_id)
        except Invoice.DoesNotExist:
            return Response({"error": "Invoice not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = InvoiceDetailSerializer(invoice)
        return Response(serializer.data)
    
    def patch(self, request, invoice_id):
        try:
            invoice = Invoice.objects.get(id=invoice_id)
        except Invoice.DoesNotExist:
            return Response({"error": "Invoice not found"}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('status')
        if not new_status:
            return Response({"error": "Status is required"}, status=status.HTTP_400_BAD_REQUEST)

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
    invoices = Invoice.objects.prefetch_related('transactions', 'transactions__item').all()
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

        # Check if user is staff
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

@api_view(['POST'])
def apply_coupon(request):
    code = request.data.get("code")
    cart_items = request.data.get("cart_items", [])
    try:
        coupon = Coupon.objects.get(code=code)
        if not coupon.is_valid():
            return Response({"error": "Coupon expired or inactive"}, status=400)

        # Filter eligible items by category
        if coupon.category:
            eligible_items = [i for i in cart_items if i["category_id"] == coupon.category.id]
        else:
            eligible_items = cart_items

        if not eligible_items:
            return Response({"error": "Coupon not applicable to selected items"}, status=400)

        # Convert to Decimal for safe arithmetic
        eligible_subtotal = sum(Decimal(i["price"]) * i["qty"] for i in eligible_items)
        total_cart_value = sum(Decimal(i["price"]) * i["qty"] for i in cart_items)

        if eligible_subtotal < coupon.min_order_value:
            return Response({"error": f"Minimum order value ₹{coupon.min_order_value} required"}, status=400)
        if coupon.discount_type.lower() == "percent" :
            discount = eligible_subtotal * (coupon.discount_value / Decimal("100"))
        else:
            discount = coupon.discount_value

        if coupon.max_discount:
            discount = min(discount, coupon.max_discount)
        
        
        new_total = max(total_cart_value - discount, Decimal("0"))
        discounted_items = []
        if eligible_subtotal > 0:
            for item in cart_items:
                item_price = Decimal(item["price"]) * item["qty"]
                if item in eligible_items:
                    item_discount = (item_price / eligible_subtotal) * discount
                    new_price = (Decimal(item["price"]) * item["qty"]) - item_discount
                    discounted_items.append({
                        "id": item["id"],
                        "original_price": str(item["price"]),
                        "qty": item["qty"],
                        "discounted_total": round(new_price, 2)
                    })
                else:
                    discounted_items.append({
                        "id": item["id"],
                        "original_price": str(item["price"]),
                        "qty": item["qty"],
                        "discounted_total": str(item["price"] * item["qty"])
                    })

        return Response({
            "success": True,
            "discount": float(discount),
            "new_total": float(new_total),
            "coupon_id": coupon.id,
            "discounted_items": discounted_items
        })

    except Exception as e:
        print(e)
        return Response({"error": "Invalid coupon"}, status=400)



@api_view(["POST"])
# If you want only logged-in agents → use IsAuthenticated
# @permission_classes([IsAuthenticated])
@permission_classes([AllowAny])  # allow public also if needed
def agent_submit(request):
    data = request.data

    agent_id = data.get("agent_id")

    if agent_id:
        try:
            agent = User.objects.get(id=agent_id)
        except User.DoesNotExist:
            agent = User.objects.get(id=1)   # fallback
    else:
        if request.user and request.user.is_authenticated:
            agent = request.user
        else:
            agent = User.objects.get(id=1)   # default agent

    entry = AgentCustomerEntry.objects.create(
        agent=agent,
        customer_name=data.get("customer_name"),
        customer_phone=data.get("customer_phone"),
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
@permission_classes([AllowAny])
def agent_dashboard(request):
    try:
        agent_id = request.GET.get("agent_id", 1)
        page_number = int(request.GET.get("page", 1))
    except:
        agent_id = 1
        page_number = 1

    try:
        agent = User.objects.get(id=agent_id)
    except User.DoesNotExist:
        agent = User.objects.get(id=1)

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
        phone = entry.customer_phone
        # ✅ Get all addresses that match this phone number
        addresses = Address.objects.filter(phone_number=phone)

        # ✅ Collect all session_keys linked to this customer
        session_keys = list(addresses.values_list("session_key", flat=True))

        # ✅ Fetch all invoices of this customer across all session_keys
        invoices = Invoice.objects.filter(session_key__in=session_keys).order_by("order_date")

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

    return Response({
        "entries": final_entries,
        "stats": stats,
        "page": page_number,
        "page_count": paginator.num_pages
    }, status=status.HTTP_200_OK)