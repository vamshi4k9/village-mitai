import secrets
import uuid
from django.db import IntegrityError, transaction
from decimal import Decimal
from django.utils import timezone
from django.db import models
from django.contrib.auth.models import User 
from django.db import models
from django.db.models import Q


# value of Cart.weight / Transaction.weight for a line bought by the piece
PIECE = "piece"


class FieldMarketingForm(models.Model):
    GENDER_CHOICES = [
        ('Male', 'Male'),
        ('Female', 'Female'),
        ('Other', 'Other'),
    ]

    QUALIFICATION_CHOICES = [
        ('10th', '10th'),
        ('12th', '12th'),
        ('Graduate', 'Graduate'),
        ('Postgraduate', 'Postgraduate'),
    ]

    WORK_HOUR_CHOICES = [
        ('2 Hours', '2 Hours'),
        ('4 Hours', '4 Hours'),
        ('6 Hours', '6 Hours'),
        ('Full-time', 'Full-time'),
        ('Flexible', 'Flexible'),
    ]

    SALARY_PREFERENCE_CHOICES = [
        ('Salary-Based', 'Salary-Based'),
        ('Commission-Based', 'Commission-Based'),
        ('Open to Both', 'Open to Both'),
    ]   
    ROLE_CHOICES = [
        ('Field Agent', 'Field Agent'),
        ('Delivery Partner', 'Delivery Partner'),
        ('Cook', 'Cook'),
    ]   

    full_name = models.CharField(max_length=100)
    dob = models.DateField()
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES)
    mobile_number = models.CharField(max_length=15)
    email = models.EmailField(blank=True, null=True)
    city_area = models.CharField(max_length=100)
    languages_spoken = models.JSONField(default=list)
    qualification = models.CharField(max_length=20, choices=QUALIFICATION_CHOICES)
    owns_vehicle = models.BooleanField()
    has_field_experience = models.BooleanField()
    preferred_work_location = models.CharField(max_length=100, blank=True, null=True)
    daily_commitment = models.CharField(max_length=20, choices=WORK_HOUR_CHOICES)
    willing_for_fieldwork = models.BooleanField()
    salary_preference = models.CharField(max_length=30, choices=SALARY_PREFERENCE_CHOICES)
    role = models.CharField(max_length=50, choices=ROLE_CHOICES,default='Field Agent')

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.full_name

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
    google_id = models.CharField(max_length=64, unique=True, blank=True, null=True)
    # agents only: % of what customers pay for the items on orders placed with
    # the agent's coupons. Each order keeps the rate it was placed at.
    commission_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    # agents only: % of what a customer the agent registered pays for the
    # items, on orders placed after the registration (matched by the
    # customer's email or mobile number)
    registration_commission_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    # how many days after a registration its orders still earn commission;
    # empty means no limit
    registration_commission_days = models.PositiveIntegerField(blank=True, null=True)
    picture = models.URLField(max_length=500, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user} - {self.role}"


# roles of people who work for the shop; everyone else is a customer
STAFF_ACCOUNT_ROLES = ("admin", "maker", "delivery", "agent")


class StaffUser(User):
    """Admin, maker, delivery and agent accounts. Same login table as
    customers, shown and created separately in the admin."""

    class Meta:
        proxy = True
        verbose_name = "Staff user"
        verbose_name_plural = "Staff users"


class Customer(User):
    """People who shop on the site."""

    class Meta:
        proxy = True
        verbose_name = "Customer"
        verbose_name_plural = "Customers"

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
    sort_order = models.PositiveIntegerField(
        blank=True,
        null=True,
        db_index=True,
        help_text="Display position across all items (1 shows first). Leave empty to show after the numbered items."
    )
    veg = models.BooleanField(default=False)
    shelf_life = models.IntegerField(default=10)
    delivery_time = models.IntegerField(default=1)
    gst = models.IntegerField(blank=True, null=True)
    cgst = models.IntegerField(blank=True, null=True)
    price_half = models.DecimalField(max_digits=8, decimal_places=2,blank=True,null=True)
    discounted_price_half = models.DecimalField(max_digits=8, decimal_places=2,blank=True,null=True)
    price_quarter = models.DecimalField(max_digits=8, decimal_places=2,blank=True,null=True)
    discounted_price_quarter = models.DecimalField(max_digits=8, decimal_places=2,blank=True,null=True)
    # Selling by the piece: the item page offers it only when BOTH are filled
    piece_weight = models.PositiveIntegerField(
        blank=True,
        null=True,
        help_text="Weight of one piece in grams. Fill this and the piece price to sell this item by the piece."
    )
    piece_price = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        blank=True,
        null=True,
        help_text="Price of one piece."
    )

    @property
    def sold_by_piece(self):
        return bool(self.piece_weight and self.piece_price)

    def __str__(self):
        return self.name
    
class Coupon(models.Model):
    DISCOUNT_CHOICES = [
        ("percent", "Percent"),
        ("fixed", "Fixed Amount"),
        ("bogo", "Buy X Get Y Free"),
    ]
    APPLY_ON_CHOICES = [
        ("order", "Entire Order"),
        ("category", "Category"),
        ("item", "Item"),
    ]
    code = models.CharField(max_length=50, unique=True)
    # agent who gets commission on orders placed with this coupon
    agent = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="agent_coupons",
        limit_choices_to={"userprofile__role": "agent"},
    )
    discount_type = models.CharField(
        max_length=10,
        choices=DISCOUNT_CHOICES,
        default="percent"
    )
    discount_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    # Buy X Get Y Free: in every group of buy + get units the cheapest
    # get units are free, so the customer pays for the costliest ones
    buy_quantity = models.PositiveIntegerField(
        default=1
    )
    get_quantity = models.PositiveIntegerField(
        default=1
    )
    DELIVERY_RULE_CHOICES = [
        ("normal", "Normal"),
        ("free", "Always free"),
        ("charged", "Always charged"),
    ]
    # how the coupon treats the delivery charge; "free" can be used alone
    # (discount_value 0) or together with a discount
    delivery_rule = models.CharField(
        max_length=10,
        choices=DELIVERY_RULE_CHOICES,
        default="normal",
        verbose_name="Delivery",
    )

    @property
    def free_delivery(self):
        return self.delivery_rule == "free"

    @property
    def charge_delivery(self):
        return self.delivery_rule == "charged"
    PAYMENT_MODE_CHOICES = [
        ("any", "Any payment method"),
        ("online", "Online payment only"),
        ("cod", "Cash on delivery only"),
    ]
    payment_mode = models.CharField(
        max_length=10,
        choices=PAYMENT_MODE_CHOICES,
        default="any"
    )
    min_order_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )
    max_discount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    valid_from = models.DateTimeField()
    valid_to = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    is_new_customer_only = models.BooleanField(default=False)
    apply_on = models.CharField(
        max_length=20,
        choices=APPLY_ON_CHOICES,
        default="order"
    )
    categories = models.ManyToManyField(
        Category,
        blank=True,
        related_name="coupons"
    )
    items = models.ManyToManyField(
        Item,
        blank=True,
        related_name="coupons"
    )
    PRICE_TYPE_CHOICES = [
        ("current", "Current Price"),
        ("mrp", "MRP"),
    ]

    price_basis = models.CharField(
        max_length=10,
        choices=PRICE_TYPE_CHOICES,
        default="current",
    )
    
    WEIGHT_CHOICES = [
        ("250", "250 g"),
        ("500", "500 g"),
        ("1000", "1 kg"),
        (PIECE, "By piece"),
    ]
    # comma separated values from WEIGHT_CHOICES; empty means every weight
    weights = models.CharField(
        max_length=50,
        blank=True,
        default=""
    )

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.discount_type == "bogo" and (not self.buy_quantity or not self.get_quantity):
            raise ValidationError("Buy and get quantities must be at least 1 for a Buy X Get Y Free coupon.")

    def allowed_weights(self):
        return {w for w in self.weights.split(",") if w}

    def allows_payment(self, payment_mode):
        """payment_mode as checkout sends it: "UPI" (online) or "CASH"."""
        if self.payment_mode == "online":
            return payment_mode in ("UPI", "ONLINE", "CARD")
        if self.payment_mode == "cod":
            return payment_mode == "CASH"
        return True

    def payment_mode_message(self):
        return {
            "online": f"Coupon {self.code} is valid only for online payment",
            "cod": f"Coupon {self.code} is valid only for cash on delivery",
        }.get(self.payment_mode, "")

    def is_valid(self):
        now = timezone.now()
        return (
            self.is_active and
            self.valid_from <= now <= self.valid_to
        )
    def __str__(self):
        return self.code

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
    # class Meta:
    #     unique_together = ('session_key', 'item')
    class Meta:
        ordering = ['-created_at']  

    def __str__(self):
        return f"{self.user} - {self.created_at} x {self.item.name} ({self.weight})"
    
    @property
    def total_price(self):
        item = self.item
        qty = self.quantity

        # bought by the piece: quantity is the number of pieces
        if self.weight == PIECE:
            if not item.piece_price:
                return Decimal("0.00")
            return Decimal(item.piece_price) * qty

        try:
            weight = int(self.weight)
        except (TypeError, ValueError):
            weight = 1000  # fallback to 1kg

        if weight == 250:
            unit_price = item.discounted_price_quarter or item.price_quarter
        elif weight == 500:
            unit_price = item.discounted_price_half or item.price_half
        else:
            unit_price = item.discounted_price or item.price

        if unit_price is None:
            return Decimal("0.00")

        return Decimal(unit_price) * qty



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
    
class Address(models.Model):
    session_key = models.CharField(max_length=40, db_index=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='addresses', null=True, blank=True)
    name = models.CharField(max_length=100)
    address1 = models.TextField()
    address2 = models.TextField(blank=True, null=True)
    phone_number = models.CharField(max_length=15)
    longitude = models.FloatField(blank=True, null=True)
    latitude = models.FloatField(blank=True, null=True)

    def __str__(self):
        return f"{self.name} - {self.user}"

def generate_tracking_token():
    return uuid.uuid4().hex


class Invoice(models.Model):
    PAYMENT_CHOICES = [
        ('CASH', 'Cash'),
        ('CARD', 'Card'),
        ('UPI', 'UPI'),
        ('ONLINE', 'Online'),
    ]

    STATUS_CHOICES = [
        ('ORDERED', 'Ordered'),
        ('IN_PROGRESS', 'In Progress'),
        ('SHIPPING', 'Shipping'),
        ('OUT_FOR_DELIVERY', 'Out for Delivery'),
        ('DELIVERED', 'Delivered'),
        ("CANCELLED", "Cancelled"),
    ]

    order_date = models.DateTimeField(auto_now_add=True)
    payment_mode = models.CharField(max_length=20, choices=PAYMENT_CHOICES)
    delivery_time = models.IntegerField()
    # day the customer gets the order: the fastest possible day, or a later
    # day they picked at checkout (is_scheduled). Empty on older orders.
    delivery_date = models.DateField(null=True, blank=True)
    is_scheduled = models.BooleanField(default=False)
    session_key = models.CharField(max_length=40, db_index=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)

    address = models.ForeignKey(
        Address,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoices"
    )
    
    coupon = models.ForeignKey(
        Coupon,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoices"
    )
    # store the order is prepared at and picked up from
    store = models.ForeignKey(
        "StoreLocation",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoices"
    )

    net_amount = models.DecimalField(max_digits=10, decimal_places=2)
    cgst = models.DecimalField(max_digits=6, decimal_places=2, blank=True, null=True)
    sgst = models.DecimalField(max_digits=6, decimal_places=2, blank=True, null=True)
    discount = models.DecimalField(max_digits=6, decimal_places=2, blank=True, null=True)
    # delivery charge paid, as at checkout. Empty on orders placed before it
    # was saved; those also have the coupon spread into their line prices.
    delivery_charge = models.DecimalField(max_digits=8, decimal_places=2, blank=True, null=True)
    # price breakdown as at checkout (empty on older orders):
    # items_mrp_total - item_discount = items_total
    # items_total - discount (coupon) + delivery_charge + packing_charge = net_amount
    items_mrp_total = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True,
                                          help_text="Items at their actual price (MRP).")
    item_discount = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True,
                                        help_text="Saved through the items' own offer prices.")
    items_total = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True,
                                      help_text="Items at their selling price, before the coupon.")
    packing_charge = models.DecimalField(max_digits=8, decimal_places=2, blank=True, null=True)
    # copied from the coupon so the order keeps them if the coupon is changed later
    coupon_code = models.CharField(max_length=50, blank=True, default="")
    coupon_type = models.CharField(max_length=10, blank=True, default="")
    # agent commission, when the order used an agent's coupon. Worked out on
    # what was paid for the items (items_total - coupon discount), without
    # delivery and packing, at the agent's rate when the order was placed.
    agent = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="agent_orders",
    )
    agent_commission_percent = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    agent_commission_base = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    agent_commission = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    # registration commission: the agent who registered this customer (found
    # by email or mobile), at their registration rate when the order was
    # placed. When the same agent also gets coupon commission on the order,
    # only the higher of the two is paid; the other is saved as 0.
    registration_agent = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="registration_orders",
    )
    registration_entry = models.ForeignKey(
        "AgentCustomerEntry",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders",
    )
    registration_commission_percent = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    registration_commission_base = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    registration_commission = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)

    # order number shown to customers and staff, e.g. VM2610240007: VM, the
    # order date (YYMMDD) and the order's number within that day
    order_number = models.CharField(max_length=20, unique=True, null=True, blank=True, editable=False)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ORDERED')
    # when the order was marked Delivered; set automatically on save. Empty on
    # orders delivered before this was recorded.
    delivered_at = models.DateTimeField(null=True, blank=True, editable=False)
    # secret part of the tracking link: order numbers are easy to guess, this is not
    tracking_token = models.CharField(max_length=32, null=True, unique=True, editable=False, default=generate_tracking_token)

    # Razorpay ids of the online payment; needed to refund a cancelled order
    razorpay_order_id = models.CharField(max_length=100, blank=True, null=True)
    razorpay_payment_id = models.CharField(max_length=100, blank=True, null=True, unique=True)

    REFUND_STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PROCESSED', 'Processed'),
        ('FAILED', 'Failed'),
    ]
    refund_id = models.CharField(max_length=100, blank=True, null=True)
    refund_status = models.CharField(max_length=20, choices=REFUND_STATUS_CHOICES, blank=True, null=True)
    refund_amount = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)

    @property
    def can_cancel(self):
        """Orders can be cancelled until they ship. Online orders also need the
        Razorpay payment id, otherwise there is nothing to refund against."""
        if self.status not in ('ORDERED', 'IN_PROGRESS'):
            return False
        if self.payment_mode == 'CASH':
            return True
        return self.payment_mode == 'UPI' and bool(self.razorpay_payment_id)

    ORDER_NUMBER_PREFIX = "VM"

    @classmethod
    def next_order_number(cls, day=None):
        """A random order number such as VM7F3A9C21B4: VM and 10 hex digits.
        Unlike a date and a running count it tells nothing about the order or
        how many orders there are, and cannot be guessed from another one.
        (`day` is no longer used; kept so older callers still work.)"""
        while True:
            number = f"{cls.ORDER_NUMBER_PREFIX}{secrets.token_hex(5).upper()}"
            if not cls.objects.filter(order_number=number).exists():
                return number

    def save(self, *args, **kwargs):
        # stamp the delivery time the first time the order is marked Delivered
        # (from the dashboards, the admin or anywhere else); clear it if the
        # status is moved back
        if self.status == "DELIVERED":
            if self.delivered_at is None:
                self.delivered_at = timezone.now()
        else:
            self.delivered_at = None
        if kwargs.get("update_fields") is not None:
            kwargs["update_fields"] = set(kwargs["update_fields"]) | {"delivered_at"}

        if self.order_number:
            return super().save(*args, **kwargs)
        # two orders placed at the same moment can pick the same number;
        # the unique constraint stops the second, which then takes the next
        for attempt in range(5):
            self.order_number = self.next_order_number()
            try:
                with transaction.atomic():
                    return super().save(*args, **kwargs)
            except IntegrityError:
                self.order_number = None
                if attempt == 4:
                    raise

    def __str__(self):
        return self.order_number or f"Invoice #{self.id}"
    
class Transaction(models.Model):
    session_key = models.CharField(max_length=40, db_index=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE,null=True, blank=True)
    item = models.ForeignKey(Item, on_delete=models.CASCADE)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='transactions')
    store = models.ForeignKey("StoreLocation", on_delete=models.SET_NULL, null=True, blank=True, related_name="transactions")
    item_amount = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField()
    weight = models.CharField(max_length=50)
    discounted = models.DecimalField(max_digits=6, decimal_places=2)
    # price breakdown of this line as at checkout (empty on older orders)
    mrp_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True,
                                    help_text="Actual price (MRP) of one unit.")
    coupon_discount = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True,
                                          help_text="Part of the order's coupon taken off this line.")
    free_quantity = models.PositiveIntegerField(default=0,
                                                help_text="Units given free by a Buy X Get Y Free coupon.")
    final_amount = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True,
                                       help_text="What was paid for this line: item_amount x quantity - coupon_discount.")

    def __str__(self):
        return f"{self.quantity} x {self.item.name} for Invoice #{self.invoice.id}"
    
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


class AgentCustomerEntry(models.Model):
    agent = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, default=1)

    customer_name = models.CharField(max_length=200)
    customer_phone = models.CharField(max_length=15)
    # the customer's orders are found by this email or the phone number
    customer_email = models.EmailField(blank=True, default="")
    area = models.CharField(max_length=200)
    pincode = models.CharField(max_length=10)
    notes = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.customer_name} ({self.customer_phone})"
    

class OfflineOrder(models.Model):

    customer_name = models.CharField(max_length=200)
    phone = models.CharField(max_length=20)

    coupon = models.CharField(max_length=50, blank=True, null=True)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    final_amount = models.DecimalField(max_digits=10, decimal_places=2)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Order {self.id} - {self.customer_name}"


class OfflineOrderItem(models.Model):

    order = models.ForeignKey(
        OfflineOrder,
        related_name="items",
        on_delete=models.CASCADE
    )

    item = models.ForeignKey(Item, on_delete=models.SET_NULL, null=True)

    name = models.CharField(max_length=200)

    weight = models.CharField(max_length=50)

    price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.name} - {self.weight}"


class Review(models.Model):
    item = models.ForeignKey("Item", on_delete=models.CASCADE, related_name="reviews")
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    invoice = models.ForeignKey("Invoice", on_delete=models.CASCADE,default=1)  
    session_key = models.CharField(max_length=40, null=True, blank=True)

    rating = models.IntegerField()  # 1 to 5
    review = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["item", "user"],
                condition=Q(user__isnull=False),
                name="unique_user_review"
            ),
            models.UniqueConstraint(
                fields=["item", "session_key"],
                condition=Q(session_key__isnull=False),
                name="unique_session_review"
            )
        ]

    def __str__(self):
        return f"{self.item.name} - {self.rating}"


class ReviewImage(models.Model):
    """A photo a customer added to their review (up to 3 per review)."""
    MAX_PER_REVIEW = 3

    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="reviews/")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"Photo for {self.review}"
    
class MobileNumber(models.Model):
    mobile = models.CharField(max_length=16, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.mobile
    
class DeliveryFeeConfig(models.Model):
    free_delivery_above = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=499
    )
    schedule_days_ahead = models.PositiveIntegerField(
        default=30,
        help_text="How many days after the fastest delivery date customers can schedule a delivery for."
    )

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Delivery Fee Configuration"
        verbose_name_plural = "Delivery Fee Configuration"

    def __str__(self):
        return f"Free Delivery Above Rs.{self.free_delivery_above}"

class StoreLocation(models.Model):
    """A store orders are sent from. Each order goes from the active store
    nearest to the delivery address (by road), within that store's radius."""
    name = models.CharField(max_length=100, default="Village Mitai")
    address = models.TextField(blank=True)
    latitude = models.FloatField()
    longitude = models.FloatField()
    max_delivery_km = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=40,
        help_text="Addresses further than this from the store cannot be delivered to."
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Inactive stores get no new orders."
    )

    class Meta:
        verbose_name = "Store Location"
        verbose_name_plural = "Store Locations"

    def __str__(self):
        return self.name


class DeliveryCharge(models.Model):
    """Delivery charge by distance. Each row covers distances up to up_to_km;
    the first row that covers the distance is used."""
    up_to_km = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        unique=True,
        help_text="This charge applies to distances up to this many km."
    )
    charge = models.DecimalField(max_digits=8, decimal_places=2)

    class Meta:
        ordering = ["up_to_km"]
        verbose_name = "Delivery Charge"
        verbose_name_plural = "Delivery Charges"

    def __str__(self):
        return f"Up to {self.up_to_km} km: Rs.{self.charge}"


class APIRequestLog(models.Model):
    session_id = models.CharField(max_length=255, null=True, blank=True)
    user_id = models.IntegerField(null=True, blank=True)

    api_path = models.TextField()
    method = models.CharField(max_length=10)

    status_code = models.IntegerField(null=True, blank=True)

    response_time_ms = models.FloatField()

    ip_address = models.CharField(max_length=100, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "api_request_logs"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.method} {self.api_path}"
    
class NotificationEmail(models.Model):
    email = models.EmailField(unique=True)

    def __str__(self):
        return self.email

class SiteConfig(models.Model):
    whatsapp_number = models.CharField(max_length=20)

    class Meta:
        db_table = "whatsapp_config"