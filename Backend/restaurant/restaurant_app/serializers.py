from rest_framework import serializers
from .models import Category, Item, Cart, Address, Invoice, Transaction
from .models import OTP
from django.contrib.auth.models import User

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'image']

class ItemDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Item
        fields = [
            'id', 'name', 'image', 'price', 'discounted_price',
            'description', 'shelf_life', 'delivery_time', 'veg'
        ]

class ItemSerializer(serializers.ModelSerializer):
    category = serializers.PrimaryKeyRelatedField(queryset=Category.objects.all())
    class Meta:
        model = Item
        fields = ['id', 'name','description', 'image', 'category', 'price', 'bestseller','discounted_price','available','shelf_life','veg','delivery_time']

class CartSerializer(serializers.ModelSerializer):
    item = ItemSerializer(read_only=True)

    class Meta:
        model = Cart
        fields = ['id', 'item', 'quantity',]

# serializers.py


class SendOTPSerializer(serializers.Serializer):
    phone = serializers.CharField()

class VerifyOTPSerializer(serializers.Serializer):
    phone = serializers.CharField()
    otp = serializers.CharField()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username']

class RegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('username', 'password', 'email')
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user

class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = ['name', 'address1', 'address2', 'phone_number', 'longitude', 'latitude']


class UserProfileSerializer(serializers.ModelSerializer):
    addresses = AddressSerializer(many=True, read_only=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'addresses']

class InvoiceListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = ['id', 'order_date', 'payment_mode', 'net_amount', 'status']

class ItemDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Item
        fields = ['id', 'name', 'image', 'price', 'discounted_price', 'description', 'shelf_life', 'delivery_time', 'veg']

class TransactionDetailSerializer(serializers.ModelSerializer):
    # item_name = serializers.CharField(source='item.name', read_only=True)
    item = ItemDetailSerializer(read_only=True)

    class Meta:
        model = Transaction
        fields = ['item', 'item_amount', 'quantity', 'weight', 'discounted']


class InvoiceDetailSerializer(serializers.ModelSerializer):
    transactions = TransactionDetailSerializer(many=True, read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'order_date', 'payment_mode', 'net_amount',
            'cgst', 'sgst', 'discount', 'status', 'transactions'
        ]

from .models import Rating

class RatingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rating
        fields = ['id','item', 'transaction', 'rating', 'comment']
