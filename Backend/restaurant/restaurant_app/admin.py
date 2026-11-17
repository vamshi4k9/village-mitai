from django import forms
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.forms import UserChangeForm, UserCreationForm
from django.contrib.auth.models import User
from django.db.models import Q
from .models import Customer, StaffUser, STAFF_ACCOUNT_ROLES
from .models import Category, DeliveryFeeConfig, Item, NotificationEmail, Order, OrderItem, Banner, Invoice, Transaction, Address , Cart, UserProfile, Coupon
from .models import APIRequestLog, SiteConfig, StoreLocation, DeliveryCharge, Review, ReviewImage, AgentCustomerEntry, ItemImage
from django.utils.html import format_html, format_html_join
# Register your models here.
admin.site.register(Category)

class ItemImageInline(admin.TabularInline):
    # extra photos shown after the main image on the product page
    model = ItemImage
    extra = 1
    readonly_fields = ("preview",)
    fields = ("image", "preview", "sort_order")

    def preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="height:80px;border-radius:4px">', obj.image.url)
        return "-"


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    inlines = [ItemImageInline]
    # sort_order, bestseller and available can be edited straight from the list
    list_display = ("name", "category", "sort_order", "bestseller", "available", "piece_weight", "piece_price")
    list_editable = ("sort_order", "bestseller", "available", "piece_weight", "piece_price")
    list_filter = ("category", "bestseller", "available")
    search_fields = ("name",)
    ordering = ("sort_order", "name")

admin.site.register(Banner)

admin.site.register(Order)
admin.site.register(OrderItem)

@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    readonly_fields = ("delivered_at", "delivery_proof_preview", "delivered_location_link")
    exclude = ("delivered_by",)
    list_display = ("id", "order_number", "order_date", "order_type", "store", "status", "payment_mode", "net_amount",
                    "coupon_code", "agent", "agent_commission", "registration_agent", "registration_commission")
    list_filter = ("order_type", "store", "status", "payment_mode", "agent", "registration_agent")
    search_fields = ("order_number", "coupon_code")

    @admin.display(description="Delivery photos")
    def delivery_proof_preview(self, obj):
        photos = list(obj.delivery_photos.all())
        if not photos:
            return "-"
        by = obj.delivered_by
        who = format_html("<p>By {}</p>", by.get_full_name() or by.username) if by else ""
        return format_html("{}{}", who, format_html_join(
            "", '<a href="{0}" target="_blank"><img src="{0}" style="height:140px;border-radius:6px;margin:0 6px 6px 0"></a>',
            ((p.image.url,) for p in photos)))

    @admin.display(description="Delivered at location")
    def delivered_location_link(self, obj):
        if obj.delivered_latitude is None:
            return "Not shared"
        return format_html('<a href="https://www.google.com/maps?q={},{}" target="_blank">Open in Google Maps</a>',
                           obj.delivered_latitude, obj.delivered_longitude)


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ("id", "invoice", "item", "store", "quantity", "weight", "item_amount")
    list_filter = ("store",)

admin.site.register(Address)

@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        # 'user',
        # 'session_key',
        'item',
        # 'quantity',
        # 'weight',
        'created_at',
        # 'updated_at',
    )

    readonly_fields = (
        'created_at',
        'updated_at',
    )    
class CouponAdminForm(forms.ModelForm):
    # shown as tick boxes; stored on the coupon as "250,1000,piece"
    weights = forms.MultipleChoiceField(
        choices=Coupon.WEIGHT_CHOICES,
        widget=forms.CheckboxSelectMultiple,
        required=False,
    )

    class Meta:
        model = Coupon
        fields = "__all__"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.pk:
            self.initial["weights"] = sorted(self.instance.allowed_weights())

    def clean_weights(self):
        return ",".join(self.cleaned_data["weights"])


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    form = CouponAdminForm
    list_display = ("code", "order_type", "discount_type", "discount_value", "apply_on", "weights", "payment_mode", "delivery_rule", "agent", "is_active", "valid_to")
    list_filter = ("order_type", "is_active", "apply_on", "payment_mode", "delivery_rule", "agent")
    search_fields = ("code",)
    filter_horizontal = ("categories", "items")


@admin.register(StoreLocation)
class StoreLocationAdmin(admin.ModelAdmin):
    list_display = ("name", "address", "latitude", "longitude", "max_delivery_km", "is_active")
    list_editable = ("max_delivery_km", "is_active")
    search_fields = ("name", "address")


@admin.register(DeliveryCharge)
class DeliveryChargeAdmin(admin.ModelAdmin):
    # the charge can be edited straight from the list
    list_display = ("__str__", "up_to_km", "charge")
    list_editable = ("up_to_km", "charge")
    ordering = ("up_to_km",)

# ---- people -------------------------------------------------------------
# Staff and customers share Django's user table (one login system) but are
# listed and created on separate admin pages.

STAFF_ROLE_CHOICES = [c for c in UserProfile.ROLE_CHOICES if c[0] in STAFF_ACCOUNT_ROLES]


def staff_filter():
    return Q(is_staff=True) | Q(is_superuser=True) | Q(userprofile__role__in=STAFF_ACCOUNT_ROLES)


def save_staff_profile(user, data):
    UserProfile.objects.update_or_create(
        user=user,
        defaults={
            "role": data["role"],
            "phone": data.get("phone") or None,
            "commission_percent": data.get("commission_percent") or 0,
            "registration_commission_percent": data.get("registration_commission_percent") or 0,
            "registration_commission_days": data.get("registration_commission_days") or None,
        },
    )
    profile = UserProfile.objects.get(user=user)
    profile.stores.set(data.get("stores") or [])


class StaffFieldsMixin(forms.Form):
    role = forms.ChoiceField(choices=STAFF_ROLE_CHOICES)
    stores = forms.ModelMultipleChoiceField(
        queryset=StoreLocation.objects.order_by("name"),
        required=False,
        widget=forms.CheckboxSelectMultiple,
        help_text="Orders from these stores show on this person's dashboard. "
                  "Admin: leave all unticked to see every store. "
                  "Maker: usually one store. Delivery: one or more.",
    )

    def clean(self):
        data = super().clean()
        if data.get("role") in ("maker", "delivery") and not data.get("stores"):
            self.add_error("stores", "Pick at least one store for a maker or delivery person.")
        return data
    phone = forms.CharField(max_length=15, required=False)
    commission_percent = forms.DecimalField(
        max_digits=5, decimal_places=2, required=False, initial=0, label="Coupon commission %",
        help_text="Agents: % of the items paid, on orders placed with the agent's coupons.",
    )
    registration_commission_percent = forms.DecimalField(
        max_digits=5, decimal_places=2, required=False, initial=0, label="Registration commission %",
        help_text="Agents: % of the items paid, on orders from customers the agent registered "
                  "(matched by email or mobile). If an order also uses the agent's coupon, only the higher one is paid.",
    )
    registration_commission_days = forms.IntegerField(
        min_value=1, required=False, label="Registration commission active days",
        help_text="Orders within this many days of the registration earn registration commission. Leave empty for no limit.",
    )


class StaffCreationForm(StaffFieldsMixin, UserCreationForm):
    class Meta(UserCreationForm.Meta):
        model = StaffUser
        fields = ("username", "first_name", "last_name", "email", "is_staff")

    def save(self, commit=True):
        # Staff status is ticked by hand; the staff login needs it
        user = super().save(commit=False)
        user.save()
        save_staff_profile(user, self.cleaned_data)
        return user


class StaffChangeForm(StaffFieldsMixin, UserChangeForm):
    class Meta(UserChangeForm.Meta):
        model = StaffUser
        fields = "__all__"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        profile = UserProfile.objects.filter(user=self.instance).first()
        if profile:
            if profile.role in STAFF_ACCOUNT_ROLES:
                self.initial["role"] = profile.role
            self.initial["phone"] = profile.phone
            self.initial["commission_percent"] = profile.commission_percent
            self.initial["registration_commission_percent"] = profile.registration_commission_percent
            self.initial["registration_commission_days"] = profile.registration_commission_days
            self.initial["stores"] = list(profile.stores.values_list("id", flat=True))

    def save(self, commit=True):
        user = super().save(commit=False)
        user.save()
        self.save_m2m()
        save_staff_profile(user, self.cleaned_data)
        return user


@admin.register(StaffUser)
class StaffUserAdmin(UserAdmin):
    form = StaffChangeForm
    add_form = StaffCreationForm
    add_fieldsets = (
        (None, {"fields": ("username", "role", "stores", "commission_percent", "registration_commission_percent",
                           "registration_commission_days", "phone", "first_name",
                           "last_name", "email", "is_staff", "password1", "password2")}),
    )
    fieldsets = (
        (None, {"fields": ("username", "password")}),
        ("Details", {"fields": ("role", "stores", "commission_percent", "registration_commission_percent",
                           "registration_commission_days", "phone", "first_name", "last_name",
                                "email", "is_staff", "is_active")}),
        ("Django admin access", {"classes": ("collapse",),
                                 "fields": ("is_superuser", "groups", "user_permissions")}),
        ("Activity", {"fields": ("last_login", "date_joined")}),
    )
    list_display = ("username", "first_name", "last_name", "staff_role", "staff_stores", "commission",
                    "staff_phone", "is_active", "last_login")
    list_filter = ("userprofile__role", "userprofile__stores", "is_active")
    search_fields = ("username", "first_name", "last_name", "email", "userprofile__phone")

    def get_queryset(self, request):
        return super().get_queryset(request).filter(staff_filter()).select_related("userprofile").distinct()

    @admin.display(description="Role", ordering="userprofile__role")
    def staff_role(self, obj):
        profile = getattr(obj, "userprofile", None)
        return profile.get_role_display() if profile else "-"

    @admin.display(description="Stores")
    def staff_stores(self, obj):
        profile = getattr(obj, "userprofile", None)
        if not profile:
            return "-"
        names = [st.name for st in profile.stores.all()]
        if names:
            return ", ".join(names)
        return "All stores" if profile.role == "admin" or obj.is_superuser else "None"

    @admin.display(description="Commission % (coupon / registration)")
    def commission(self, obj):
        profile = getattr(obj, "userprofile", None)
        if not profile or profile.role != "agent":
            return "-"
        days = f", {profile.registration_commission_days} days" if profile.registration_commission_days else ""
        return f"{profile.commission_percent} / {profile.registration_commission_percent}{days}"

    @admin.display(description="Phone")
    def staff_phone(self, obj):
        profile = getattr(obj, "userprofile", None)
        return profile.phone if profile and profile.phone else "-"


class CustomerCreationForm(UserCreationForm):
    phone = forms.CharField(max_length=15, required=False)

    class Meta(UserCreationForm.Meta):
        model = Customer
        fields = ("username", "first_name", "last_name", "email")

    def save(self, commit=True):
        user = super().save(commit=False)
        user.is_staff = False
        user.is_superuser = False
        user.save()
        UserProfile.objects.update_or_create(
            user=user, defaults={"role": "user", "phone": self.cleaned_data["phone"] or None}
        )
        return user


class CustomerChangeForm(UserChangeForm):
    phone = forms.CharField(max_length=15, required=False)

    class Meta(UserChangeForm.Meta):
        model = Customer
        fields = "__all__"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        profile = UserProfile.objects.filter(user=self.instance).first()
        if profile:
            self.initial["phone"] = profile.phone

    def save(self, commit=True):
        user = super().save(commit=False)
        user.save()
        profile, _ = UserProfile.objects.get_or_create(user=user, defaults={"role": "user"})
        profile.phone = self.cleaned_data["phone"] or None
        profile.save(update_fields=["phone"])
        return user


@admin.register(Customer)
class CustomerAdmin(UserAdmin):
    form = CustomerChangeForm
    add_form = CustomerCreationForm
    add_fieldsets = (
        (None, {"fields": ("username", "phone", "first_name", "last_name", "email",
                           "password1", "password2")}),
    )
    fieldsets = (
        (None, {"fields": ("username", "password")}),
        ("Details", {"fields": ("phone", "first_name", "last_name", "email", "is_active")}),
        ("Activity", {"fields": ("last_login", "date_joined")}),
    )
    list_display = ("username", "first_name", "last_name", "email", "customer_phone",
                    "is_active", "date_joined")
    list_filter = ("is_active",)
    search_fields = ("username", "first_name", "last_name", "email", "userprofile__phone")

    def get_queryset(self, request):
        return super().get_queryset(request).exclude(staff_filter()).select_related("userprofile").distinct()

    @admin.display(description="Phone")
    def customer_phone(self, obj):
        profile = getattr(obj, "userprofile", None)
        return profile.phone if profile and profile.phone else "-"


# the shared Users page is replaced by the two above
if admin.site.is_registered(User):
    admin.site.unregister(User)


@admin.register(DeliveryFeeConfig)
class DeliveryFeeConfigAdmin(admin.ModelAdmin):
    list_display = (
        "free_delivery_above",
        "schedule_days_ahead",
        "updated_at",
    )

@admin.register(APIRequestLog)
class APIRequestLogAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "api_path",
        "method",
        "colored_status",
        "response_time_ms",
        "session_id",
        "user_id",
        "ip_address",
        "created_at",
    )

    search_fields = (
        "api_path",
        "session_id",
        "ip_address",
    )

    list_filter = (
        "method",
        "status_code",
        "created_at",
    )

    ordering = ("-created_at",)

    readonly_fields = (
        "session_id",
        "user_id",
        "api_path",
        "method",
        "status_code",
        "response_time_ms",
        "ip_address",
        "created_at",
    )

    list_per_page = 50
    
    def colored_status(self, obj):

        color = "green"

        if obj.status_code >= 400:
            color = "red"

        elif obj.status_code >= 300:
            color = "orange"

        return format_html(
            '<b style="color:{};">{}</b>',
            color,
            obj.status_code
        )

    colored_status.short_description = "Status"

admin.site.register(NotificationEmail)
admin.site.register(SiteConfig)


class ReviewImageInline(admin.TabularInline):
    model = ReviewImage
    extra = 0
    readonly_fields = ("preview",)
    fields = ("image", "preview")

    def preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="height:80px;border-radius:4px">', obj.image.url)
        return "-"


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    # delete a review (or one of its photos) here to hide it from the product page
    list_display = ("item", "rating", "short_review", "photo_count", "user", "created_at")
    list_filter = ("rating", "item__category")
    search_fields = ("item__name", "review", "user__email")
    inlines = [ReviewImageInline]

    def short_review(self, obj):
        return (obj.review or "")[:60]

    def photo_count(self, obj):
        return obj.images.count()



@admin.register(AgentCustomerEntry)
class AgentCustomerEntryAdmin(admin.ModelAdmin):
    # customers registered by agents; their orders are matched by email or mobile
    list_display = ("customer_name", "customer_phone", "customer_email", "agent", "area", "pincode", "created_at")
    list_filter = ("agent",)
    search_fields = ("customer_name", "customer_phone", "customer_email", "agent__username")
