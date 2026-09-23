"""
URL configuration for core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from chat.views import ChannelViewSet, MessageViewSet
from django.contrib import admin
from django.urls import include, path
from rest_framework import routers
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)
from api.views import NotificationViewSet
from users.views import FriendshipViewSet, RegisterView, UserViewSet, LogoutView, ChangePasswordView

from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)

router = routers.DefaultRouter()
router.register(r"channels", ChannelViewSet)
router.register(r"messages", MessageViewSet)
router.register(r"users", UserViewSet, basename="user")
router.register(r"friendships", FriendshipViewSet, basename="friendship")
router.register(r'notifications', NotificationViewSet, basename='notification')

urlpatterns = [
    path("admin/", admin.site.urls),
	path("api/users/change_password/", ChangePasswordView.as_view(), name='change_password'),
    path("api/", include(router.urls)),
    path("accounts/", include("allauth.urls")),
	path("api/logout/", LogoutView.as_view(), name='logout'),
    path("api/auth/oauth/", include("authentication.oauth_urls")),
    path("api/register/", RegisterView.as_view(), name="register"),
    path("api/token/verify/", TokenVerifyView.as_view(), name="token_verify"),
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # Documentation API
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]
