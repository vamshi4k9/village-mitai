from django.urls import path, include
from .views import CategoryViewSet, InvoiceDetailView, ItemViewSet, ItemsByCategoryAPIView, CartViewSet, BestsellerItemsAPIView, PastOrdersView, SubmitRatingView,upload_image, search_items, create_order
from rest_framework.routers import DefaultRouter
from .views import SendOTPView, VerifyOTPView, RegisterView, ProfileView, AddressView, CreateOrderView, get_user_orders, get_total_order_value, get_order_details
from rest_framework_simplejwt.views import TokenObtainPairView



router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'items', ItemViewSet)
router.register(r'cart', CartViewSet, basename='cart')


urlpatterns = [
    path('api/', include(router.urls)),
    path('api/category/<str:category_name>', ItemsByCategoryAPIView.as_view(), name='items_by_category_api'),
    path('api/bestsellers/', BestsellerItemsAPIView.as_view(), name='bestsellers_api'),
    path("api/upload-image/", upload_image, name="upload-image"),
    path('api/search/', search_items, name='search-items'),
    # path('api/create-order/', create_order, name='create_order'),
    path('api/send-otp/', SendOTPView.as_view()),
    path('api/verify-otp/', VerifyOTPView.as_view()),
    path('api/addresses/', AddressView.as_view()),
    path('api/register/', RegisterView.as_view()),
    path('api/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/profile/', ProfileView.as_view()),
    path("api/create-order/", CreateOrderView.as_view(), name="create-order"),
    path('api/orders/', get_user_orders, name='user-orders'),
    path('api/orders/total/', get_total_order_value, name='total-order-value'),
    path('api/orders/<int:invoice_id>/', get_order_details, name='order-details'),
    path('api/past-orders/', PastOrdersView.as_view(), name='past-orders'),
    path('api/order-detail/<int:invoice_id>/', InvoiceDetailView.as_view(), name='invoice-detail'),
    path('api/submit-rating/', SubmitRatingView.as_view(), name='submit-rating'),
]