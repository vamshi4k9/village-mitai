from django.contrib import admin
from .models import Category, DeliveryFeeConfig, Item, NotificationEmail, Order, OrderItem, Banner, Invoice, Transaction, Address , Cart, UserProfile, Coupon
from .models import APIRequestLog
from django.utils.html import format_html
# Register your models here.
admin.site.register(Category)
admin.site.register(Item)
admin.site.register(Banner)

admin.site.register(Order)
admin.site.register(OrderItem)

admin.site.register(Invoice)
admin.site.register(Transaction)

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
admin.site.register(Coupon)

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'role', 'created_at', 'updated_at']
    search_fields = ['user__username', 'role']


@admin.register(DeliveryFeeConfig)
class DeliveryFeeConfigAdmin(admin.ModelAdmin):
    list_display = (
        "free_delivery_above",
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