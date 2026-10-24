from django import forms
from django.contrib import admin
from .models import Category, DeliveryFeeConfig, Item, NotificationEmail, Order, OrderItem, Banner, Invoice, Transaction, Address , Cart, UserProfile, Coupon
from .models import APIRequestLog, SiteConfig, StoreLocation, DeliveryCharge
from django.utils.html import format_html
# Register your models here.
admin.site.register(Category)

@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
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
    list_display = ("id", "order_date", "store", "status", "payment_mode", "net_amount")
    list_filter = ("store", "status", "payment_mode")


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
        help_text="Leave all unticked to allow every weight.",
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
    list_display = ("code", "discount_type", "discount_value", "apply_on", "weights", "payment_mode", "free_delivery", "is_active", "valid_to")
    list_filter = ("is_active", "apply_on", "payment_mode", "free_delivery")
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

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'role', 'created_at', 'updated_at']
    search_fields = ['user__username', 'role']


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