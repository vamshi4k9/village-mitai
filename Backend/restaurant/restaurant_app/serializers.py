from rest_framework import serializers
from .models import (
    Category,
    Item,
    Cart,
    Address,
    Invoice,
    Transaction,
    FieldMarketingForm,
)
from .models import OTP
from django.contrib.auth.models import User
from .models import UserProfile, Banner


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
    category = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all())

    class Meta:
        model = Item
        fields = [
            "id",
            "name",
            "description",
            "image",
            "category",
            "price",
            "bestseller",
            "discounted_price",
            "available",
            "shelf_life",
            "veg",
            "delivery_time",
        ]


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
        UserProfile.objects.create(user=user, role="maker", phone=phone)
        return user


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = [
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


class InvoiceListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = ["id", "order_date", "payment_mode", "net_amount", "status"]


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
        fields = ["item", "item_amount", "quantity", "weight", "discounted"]


class InvoiceDetailSerializer(serializers.ModelSerializer):
    transactions = TransactionDetailSerializer(many=True, read_only=True)

    class Meta:
        model = Invoice
        fields = [
            "id",
            "order_date",
            "payment_mode",
            "net_amount",
            "cgst",
            "sgst",
            "discount",
            "status",
            "transactions",
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
