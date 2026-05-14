from django.contrib import admin
from .models import Category, Item, Order, OrderItem, Banner, Invoice, Transaction, Address , Cart, UserProfile, Coupon

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


