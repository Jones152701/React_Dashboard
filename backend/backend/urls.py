from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from Dashboard.views import CookieTokenObtainPairView ,protected_view ,logout_view

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('Dashboard.urls')),
    path("api/token/", CookieTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("protected/", protected_view),
    path("logout/", logout_view),
    # path("user-info/", user_info),
]