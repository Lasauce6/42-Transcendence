from django.urls import path

from . import views

urlpatterns = [
    path("login/", views.oauth2_login, name="login"),
    path("callback/", views.oauth2_callback, name="callback"),
]
