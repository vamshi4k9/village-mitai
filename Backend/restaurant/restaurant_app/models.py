from django.db import models
from django.contrib.auth.models import User 
from django.db import models

class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('maker', 'Maker'),
        ('delivery', 'Delivery'),
        ('agent', 'Agent'),
        ('user', 'User'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='user')
    phone = models.CharField(max_length=15, blank=True, null=True)  # Add this line
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user} - {self.role}"

class Category(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    image = models.ImageField(upload_to='categories/', blank=True, null=True)

    def __str__(self):
        return self.name

class Item(models.Model):
    category = models.ForeignKey(Category, related_name="items", on_delete=models.CASCADE ,default=1)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=8, decimal_places=2)
    discounted_price = models.DecimalField(max_digits=8, decimal_places=2,blank=True,null=True)
    image = models.ImageField(upload_to='items/', blank=True, null=True)
    available = models.BooleanField(default=True)
    bestseller = models.BooleanField(default=False)
    veg = models.BooleanField(default=False)
    shelf_life = models.IntegerField(default=10)
    delivery_time = models.IntegerField(default=1)
    gst = models.IntegerField(blank=True, null=True)
    cgst = models.IntegerField(blank=True, null=True)
    price_half = models.DecimalField(max_digits=8, decimal_places=2,blank=True,null=True)
    discounted_price_half = models.DecimalField(max_digits=8, decimal_places=2,blank=True,null=True)
    price_quarter = models.DecimalField(max_digits=8, decimal_places=2,blank=True,null=True)
    discounted_price_quarter = models.DecimalField(max_digits=8, decimal_places=2,blank=True,null=True)

    def __str__(self):
        return self.name

class OTP(models.Model):
    phone = models.CharField(max_length=15, unique=True)
    otp = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_verified = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.phone} - {self.otp}"
    
class Cart(models.Model):
    session_key = models.CharField(max_length=40, db_index=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='cart_items',null=True, blank=True)
    item = models.ForeignKey('Item', on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    weight = models.CharField(max_length=50, blank=True, null=True)
    class Meta:
        unique_together = ('session_key', 'item')

    def __str__(self):
        return f"{self.user} - {self.quantity} x {self.item.name} ({self.weight})"
    
    @property
    def total_price(self):
        return self.quantity * self.item.price


class Order(models.Model):
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Order #{self.id}"

class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='order_items', on_delete=models.CASCADE)
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.quantity} x {self.item.name} in Order #{self.order.id}"

class Banner(models.Model):
    image = models.ImageField(upload_to='banners/')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    item = models.ForeignKey(Item, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"Banner #{self.id}"

class Invoice(models.Model):
    PAYMENT_CHOICES = [
        ('CASH', 'Cash'),
        ('CARD', 'Card'),
        ('UPI', 'UPI'),
        ('ONLINE', 'Online'),
    ]
    order_date = models.DateTimeField(auto_now_add=True)
    payment_mode = models.CharField(max_length=20, choices=PAYMENT_CHOICES)
    delivery_time = models.IntegerField() 
    session_key = models.CharField(max_length=40, db_index=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE,null=True, blank=True)
    net_amount = models.DecimalField(max_digits=10, decimal_places=2)
    cgst = models.DecimalField(max_digits=6, decimal_places=2, blank=True, null=True)
    sgst = models.DecimalField(max_digits=6, decimal_places=2, blank=True, null=True)
    discount = models.DecimalField(max_digits=6, decimal_places=2, blank=True, null=True)
    STATUS_CHOICES = [
        ('ORDERED', 'Ordered'),
        ('PACKED', 'Packed'),
        ('SHIPPED', 'Shipped'),
        ('DELIVERED','Delivered'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')

    def __str__(self):
        return f"Invoice #{self.id} - {self.user}"


class Transaction(models.Model):
    session_key = models.CharField(max_length=40, db_index=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE,null=True, blank=True)
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='transactions')
    item_amount = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField()
    weight = models.CharField(max_length=50)
    discounted = models.DecimalField(max_digits=6, decimal_places=2)

    def __str__(self):
        return f"{self.quantity} x {self.item.name} for Invoice #{self.invoice.id}"
    

class Address(models.Model):
    session_key = models.CharField(max_length=40, db_index=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='addresses',null=True, blank=True)
    name = models.CharField(max_length=100)  # e.g., "Home", "Office", or contact person's name
    address1 = models.TextField()
    address2 = models.TextField(blank=True, null=True)
    phone_number = models.CharField(max_length=15)
    longitude = models.FloatField(blank=True, null=True)
    latitude = models.FloatField(blank=True, null=True)

    def __str__(self):
        return f"{self.name} - {self.user}"
    
class Rating(models.Model):
    item = models.ForeignKey('Item', on_delete=models.CASCADE)
    transaction = models.ForeignKey('Transaction', on_delete=models.SET_NULL, null=True, blank=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE,null=True, blank=True)
    rating = models.PositiveSmallIntegerField()  # typically 1 to 5
    comment = models.TextField(blank=True, null=True)
    category = models.ForeignKey('Category', on_delete=models.SET_NULL, null=True, blank=True)
    date_time = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.rating}★ by {self.user} on {self.item.name}"