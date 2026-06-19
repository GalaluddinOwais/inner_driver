from django.urls import path
from .consumers import RideNotificationConsumer, DriverLocationConsumer

websocket_urlpatterns = [
    path('ws/notifications/', RideNotificationConsumer.as_asgi()),
    path('ws/location/', DriverLocationConsumer.as_asgi()),
]
