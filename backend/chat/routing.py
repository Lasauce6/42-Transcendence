from django.urls import path

from . import consumers

websocket_urlpatterns = [
    # Global socket for notifications
    path("ws/notifications/", consumers.ChatConsumer.as_asgi()),
    # Socket for channel
    path("ws/chat/<uuid:channel_id>/", consumers.ChatConsumer.as_asgi()),
]
