import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError
from django.contrib.auth import get_user_model
from django.core.serializers.json import DjangoJSONEncoder
from django.utils import timezone
from decimal import Decimal


def ws_json(payload):
    """json.dumps that can serialize Decimal/dates from DRF serializer output."""
    return json.dumps(payload, cls=DjangoJSONEncoder)

User = get_user_model()


class RideNotificationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time ride notifications.
    Handles connections from both drivers and riders.
    """

    async def connect(self):
        """
        Handle WebSocket connection.
        Authenticate user via JWT token and add to their personal group.
        """
        # Get token from query string
        query_string = self.scope['query_string'].decode()
        token = None

        # Parse query string for token
        for param in query_string.split('&'):
            if param.startswith('token='):
                token = param.split('=')[1]
                break

        if not token:
            await self.close()
            return

        # Authenticate user
        user = await self.get_user_from_token(token)
        if not user:
            await self.close()
            return

        self.user = user
        self.user_group_name = f'user_{user.id}'

        # Join user-specific group
        await self.channel_layer.group_add(
            self.user_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        """
        Handle WebSocket disconnection.
        Remove user from their personal group.
        """
        if hasattr(self, 'user_group_name'):
            await self.channel_layer.group_discard(
                self.user_group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        """
        Handle messages from WebSocket (currently not used, but can be extended).
        """
        pass

    async def ride_notification(self, event):
        """
        Handle ride notification messages sent to the group.
        Forward the notification to the WebSocket client.
        """
        payload = {
            'type': event['notification_type'],
            'message': event['message'],
            'ride': event.get('ride'),
        }
        if 'offer' in event:
            payload['offer'] = event['offer']
        await self.send(text_data=ws_json(payload))

    @database_sync_to_async
    def get_user_from_token(self, token):
        """
        Authenticate user from JWT token.
        Returns User object if valid, None otherwise.
        """
        try:
            access_token = AccessToken(token)
            user_id = access_token['user_id']
            user = User.objects.get(id=user_id)
            return user
        except (TokenError, User.DoesNotExist):
            return None


class DriverLocationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time driver location tracking.
    Drivers send location updates, riders receive location broadcasts.
    """

    async def connect(self):
        """
        Handle WebSocket connection.
        Authenticate user and add to appropriate groups.
        """
        # Get token from query string
        query_string = self.scope['query_string'].decode()
        token = None

        for param in query_string.split('&'):
            if param.startswith('token='):
                token = param.split('=')[1]
                break

        if not token:
            await self.close()
            return

        # Authenticate user
        user = await self.get_user_from_token(token)
        if not user:
            await self.close()
            return

        self.user = user

        # Check if user is a driver
        is_driver = await self.check_if_driver(user)
        self.is_driver = is_driver

        if is_driver:
            # Driver: join their own location broadcast group
            self.driver_group_name = f'driver_location_{user.id}'
            await self.channel_layer.group_add(
                self.driver_group_name,
                self.channel_name
            )
        else:
            # Rider: join groups for drivers they're tracking
            tracking_drivers = await self.get_tracking_drivers(user)
            self.tracking_groups = []
            for driver_id in tracking_drivers:
                group_name = f'driver_location_{driver_id}'
                self.tracking_groups.append(group_name)
                await self.channel_layer.group_add(
                    group_name,
                    self.channel_name
                )

        await self.accept()

    async def disconnect(self, close_code):
        """
        Handle WebSocket disconnection.
        Remove from all groups.
        """
        if self.is_driver and hasattr(self, 'driver_group_name'):
            await self.channel_layer.group_discard(
                self.driver_group_name,
                self.channel_name
            )
        elif hasattr(self, 'tracking_groups'):
            for group_name in self.tracking_groups:
                await self.channel_layer.group_discard(
                    group_name,
                    self.channel_name
                )

    async def receive(self, text_data):
        """
        Handle messages from WebSocket.
        Only drivers can send location updates.
        """
        if not self.is_driver:
            await self.send(text_data=ws_json({
                'error': 'Only drivers can send location updates'
            }))
            return

        try:
            data = json.loads(text_data)

            if data.get('type') == 'location_update':
                latitude = data.get('latitude')
                longitude = data.get('longitude')

                # Validate coordinates
                if latitude is None or longitude is None:
                    await self.send(text_data=ws_json({
                        'error': 'Latitude and longitude are required'
                    }))
                    return

                # Convert to Decimal for validation
                try:
                    lat_decimal = Decimal(str(latitude))
                    lon_decimal = Decimal(str(longitude))

                    # Validate ranges
                    if not (-90 <= lat_decimal <= 90):
                        raise ValueError("Latitude must be between -90 and 90")
                    if not (-180 <= lon_decimal <= 180):
                        raise ValueError("Longitude must be between -180 and 180")

                except (ValueError, TypeError) as e:
                    await self.send(text_data=ws_json({
                        'error': f'Invalid coordinates: {str(e)}'
                    }))
                    return

                # Save location to database
                await self.save_driver_location(lat_decimal, lon_decimal)

                # Broadcast to all riders tracking this driver
                await self.channel_layer.group_send(
                    self.driver_group_name,
                    {
                        'type': 'location_broadcast',
                        'driver_id': self.user.id,
                        'latitude': str(lat_decimal),
                        'longitude': str(lon_decimal),
                        'timestamp': timezone.now().isoformat()
                    }
                )

                # Confirm to driver
                await self.send(text_data=ws_json({
                    'status': 'success',
                    'message': 'Location updated'
                }))

        except json.JSONDecodeError:
            await self.send(text_data=ws_json({
                'error': 'Invalid JSON'
            }))

    async def location_broadcast(self, event):
        """
        Handle location broadcast messages from the group.
        Send to WebSocket client (rider).
        """
        await self.send(text_data=ws_json({
            'type': 'location_update',
            'driver_id': event['driver_id'],
            'latitude': event['latitude'],
            'longitude': event['longitude'],
            'timestamp': event['timestamp']
        }))

    @database_sync_to_async
    def get_user_from_token(self, token):
        """Authenticate user from JWT token."""
        try:
            access_token = AccessToken(token)
            user_id = access_token['user_id']
            user = User.objects.get(id=user_id)
            return user
        except (TokenError, User.DoesNotExist):
            return None

    @database_sync_to_async
    def check_if_driver(self, user):
        """Check if user is a driver."""
        return hasattr(user, 'driver_profile')

    @database_sync_to_async
    def save_driver_location(self, latitude, longitude):
        """Save driver location to database."""
        from .models import Driver
        driver = Driver.objects.get(user_id=self.user.id)
        driver.current_latitude = latitude
        driver.current_longitude = longitude
        driver.location_updated_at = timezone.now()
        driver.save(update_fields=['current_latitude', 'current_longitude', 'location_updated_at'])

    @database_sync_to_async
    def get_tracking_drivers(self, user):
        """Get list of driver IDs that this rider is tracking (has active/pending rides with)."""
        from .models import Ride
        # Get all rides where rider is tracking (pending or accepted status)
        rides = Ride.objects.filter(
            rider__user=user,
            status__in=['pending', 'accepted']
        ).values_list('driver_id', flat=True)
        return list(rides)
