from rest_framework import serializers
from .models import (
    Category,
    Item,
    Cart,
    Address,
    Invoice,
    MobileNumber,
    OfflineOrder,
    OfflineOrderItem,
    Review,
    Transaction,
    FieldMarketingForm, AgentCustomerEntry
)
from .models import OTP, StoreLocation
from django.contrib.auth.models import User
from .models import UserProfile, Banner
from django.db.models import Avg


class FieldMarketingFormSerializer(serializers.ModelSerializer):
    class Meta:
        model = FieldMarketingForm
        fields = "__all__"


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "image"]


class ItemDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Item
        fields = [
            "id",
            "name",
            "image",
            "price",
            "discounted_price",
            "description",
            "shelf_life",
            "delivery_time",
            "veg",
        ]

class ItemSerializer(serializers.ModelSerializer):
    avg_rating = serializers.SerializerMethodField()
    total_reviews = serializers.SerializerMethodField()

    class Meta:
        model = Item
        fields = "__all__"  # or your fields

    def get_avg_rating(self, obj):
        if hasattr(obj, "avg_rating"):
            return round(obj.avg_rating or 0, 1)

        return round(obj.reviews.aggregate(avg=Avg("rating"))["avg"] or 0, 1)

    def get_total_reviews(self, obj):
        if hasattr(obj, "total_reviews"):
            return obj.total_reviews or 0

        return obj.reviews.count()


# class CartSerializer(serializers.ModelSerializer):
#     item = ItemSerializer(read_only=True)
#     item_id = serializers.PrimaryKeyRelatedField(
#         queryset=Item.objects.all(), write_only=True, source='item'
#     )


#     class Meta:
#         model = Cart
#         fields = ['id', 'item', 'quantity','item_id']


class CartSerializer(serializers.ModelSerializer):
    item = ItemSerializer()
    item_id = serializers.PrimaryKeyRelatedField(
        queryset=Item.objects.all(), write_only=True, source="item"
    )
    total_price = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = [
            "id",
            "item",
            "quantity",
            "total_price",
            "updated_at",
            "item_id",
            "weight",
        ]

    def get_total_price(self, obj):
        return obj.total_price


class SendOTPSerializer(serializers.Serializer):
    phone = serializers.CharField()


class VerifyOTPSerializer(serializers.Serializer):
    phone = serializers.CharField()
    otp = serializers.CharField()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username"]


class RegisterSerializer(serializers.ModelSerializer):
    phone = serializers.CharField(required=True)

    class Meta:
        model = User
        fields = ["username", "first_name", "last_name", "email", "password", "phone"]
        extra_kwargs = {"password": {"write_only": True}}

    def create(self, validated_data):
        phone = validated_data.pop("phone")
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        # public sign-up is always a customer; staff are created in the admin
        UserProfile.objects.create(user=user, role="user", phone=phone)
        return user


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = [
            "id",
            "name",
            "address1",
            "address2",
            "phone_number",
            "longitude",
            "latitude",
        ]


class UserProfileSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField()  # or use UserSerializer for nested info

    class Meta:
        model = UserProfile
        fields = ["user", "role", "phone", "created_at", "updated_at"]


class StoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = StoreLocation
        fields = ["id", "name", "address", "latitude", "longitude"]


class InvoiceListSerializer(serializers.ModelSerializer):
    can_cancel = serializers.ReadOnlyField()
    # code saved with the order; older orders only have the coupon link
    coupon_code = serializers.SerializerMethodField()

    def get_coupon_code(self, obj):
        return obj.coupon_code or (obj.coupon.code if obj.coupon else None)
    store_name = serializers.CharField(source="store.name", read_only=True, default=None)

    class Meta:
        model = Invoice
        fields = ["id", "order_number", "order_date", "payment_mode", "net_amount", "status", "tracking_token",
                  "can_cancel", "refund_status", "refund_amount", "delivery_date", "is_scheduled",
                  "discount", "delivery_charge", "packing_charge", "items_mrp_total",
                  "item_discount", "items_total", "coupon_code", "coupon_type", "store_name", "delivered_at"]


class ItemDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Item
        fields = [
            "id",
            "name",
            "image",
            "price",
            "discounted_price",
            "description",
            "shelf_life",
            "delivery_time",
            "veg",
        ]


class TransactionDetailSerializer(serializers.ModelSerializer):
    # item_name = serializers.CharField(source='item.name', read_only=True)
    item = ItemDetailSerializer(read_only=True)

    class Meta:
        model = Transaction
        fields = ["item", "item_amount", "mrp_price", "quantity", "weight", "discounted",
                  "coupon_discount", "free_quantity", "final_amount", "store"]


class InvoiceDetailSerializer(serializers.ModelSerializer):
    can_cancel = serializers.ReadOnlyField()
    # code saved with the order; older orders only have the coupon link
    coupon_code = serializers.SerializerMethodField()

    def get_coupon_code(self, obj):
        return obj.coupon_code or (obj.coupon.code if obj.coupon else None)
    transactions = TransactionDetailSerializer(many=True, read_only=True)
    address = AddressSerializer(read_only=True)  
    # where the order is prepared and picked up from
    store = StoreSerializer(read_only=True)

    class Meta:
        model = Invoice
        fields = [
            "id",
            "order_number",
            "order_date",
            "payment_mode",
            "net_amount",
            "cgst",
            "sgst",
            "discount",
            "status",
            "transactions",
            "address",
            "can_cancel",
            "refund_status",
            "refund_amount",
            "delivery_date",
            "is_scheduled",
            "delivery_charge",
            "packing_charge",
            "items_mrp_total",
            "item_discount",
            "items_total",
            "coupon_code",
            "delivered_at",
            "coupon_type",
            "store",
        ]


from .models import Rating, UserProfile


class RatingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rating
        fields = ["id", "item", "transaction", "rating", "comment"]


class UserProfileSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField()  # or use UserSerializer for nested info

    class Meta:
        model = UserProfile
        fields = ["user", "role", "phone", "created_at", "updated_at"]



class BannerSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    item_id = serializers.IntegerField(source="item.id", read_only=True)
    image = serializers.ImageField()

    class Meta:
        model = Banner
        fields = ['id', 'image', 'category_name', 'item_id']


class AgentCustomerEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = AgentCustomerEntry
        fields = "__all__"


class OfflineOrderItemSerializer(serializers.ModelSerializer):

    class Meta:
        model = OfflineOrderItem
        fields = [
            "item",
            "name",
            "weight",
            "price"
        ]


class OfflineOrderSerializer(serializers.ModelSerializer):

    items = OfflineOrderItemSerializer(many=True)

    class Meta:
        model = OfflineOrder
        fields = "__all__"

    def create(self, validated_data):

        items_data = validated_data.pop("items")

        order = OfflineOrder.objects.create(**validated_data)

        for item in items_data:
            OfflineOrderItem.objects.create(
                order=order,
                **item
            )

        return order

class ReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ["id", "item", "rating", "review", "created_at"]
        

class MobileNumberSerializer(serializers.ModelSerializer):
    class Meta:
        model = MobileNumber
        fields = ['mobile']