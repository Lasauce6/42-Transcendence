from django.urls import path

from . import consumers

websocket_urlpatterns = [
    # Socket global pour les notifications personnelles
    path("ws/notifications/", consumers.NotificationConsumer.as_asgi()),
    # Socket pour un channel précis
    path("ws/chat/<uuid:channel_id>/", consumers.ChatConsumer.as_asgi()),
]