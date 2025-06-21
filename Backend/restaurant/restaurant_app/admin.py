from django.contrib import admin
from .models import Category, Item, Order, OrderItem, Banner, Invoice, Transaction, Address , Cart

# Register your models here.
admin.site.register(Category)
admin.site.register(Item)
admin.site.register(Banner)

admin.site.register(Order)
admin.site.register(OrderItem)

admin.site.register(Invoice)
admin.site.register(Transaction)

admin.site.register(Address)

admin.site.register(Cart)


