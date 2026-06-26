from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import Driver, Ride, VehicleBrand, VehicleModel, Offer
from .serializers import (
    DriverRegistrationSerializer,
    RiderRegistrationSerializer,
    LoginSerializer,
    UserSerializer,
    DriverListSerializer,
    DriverDetailSerializer,
    DriverUpdateSerializer,
    RideRequestSerializer,
    RideSerializer,
    OfferSerializer,
    VehicleBrandSerializer,
    VehicleModelSerializer,
    NearbyDriverSerializer
)
from .permissions import IsAdminUser, IsOwnerOrAdmin, IsRider, IsDriver
from .utils import create_otp, send_otp_email


@api_view(['POST'])
@permission_classes([AllowAny])
def register_driver(request):
    """
    Register a new driver user
    POST /api/register/driver/
    Body: {
        "email": "driver@example.com",
        "password": "password123",
        "password_confirm": "password123",
        "full_name": "John Doe",
        "phone_number": "+1234567890",
        "vehicle_type": "Sedan"
    }
    """
    serializer = DriverRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()

        # Create and send OTP for registration
        otp = create_otp(user, 'registration')
        send_otp_email(user, otp.otp_code, 'registration')

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        return Response({
            'message': 'Driver registered successfully. Please check your email for OTP verification.',
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def register_rider(request):
    """
    Register a new rider user
    POST /api/register/rider/
    Body: {
        "email": "rider@example.com",
        "password": "password123",
        "password_confirm": "password123",
        "full_name": "Jane Smith",
        "phone_number": "+1234567890"
    }
    """
    serializer = RiderRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()

        # Create and send OTP for registration
        otp = create_otp(user, 'registration')
        send_otp_email(user, otp.otp_code, 'registration')

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        return Response({
            'message': 'Rider registered successfully. Please check your email for OTP verification.',
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """
    Login and get JWT tokens
    POST /api/login/
    Body: {
        "email": "user@example.com",
        "password": "password123"
    }
    """
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']

        # Authenticate user
        user = authenticate(request, email=email, password=password)

        if user is not None:
            if user.is_active:
                # Generate JWT tokens
                refresh = RefreshToken.for_user(user)
                return Response({
                    'message': 'Login successful',
                    'tokens': {
                        'refresh': str(refresh),
                        'access': str(refresh.access_token),
                    }
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'error': 'Account is disabled'
                }, status=status.HTTP_403_FORBIDDEN)
        else:
            return Response({
                'error': 'Invalid email or password'
            }, status=status.HTTP_401_UNAUTHORIZED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """
    Logout by blacklisting the refresh token
    POST /api/logout/
    Headers: Authorization: Bearer <access_token>
    Body: {
        "refresh": "<refresh_token>"
    }
    """
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({
                'message': 'Logout successful'
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'error': 'Refresh token is required'
            }, status=status.HTTP_400_BAD_REQUEST)
    except Exception:
        return Response({
            'error': 'Invalid token or token already blacklisted'
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_user(request):
    """
    Get current authenticated user with profile data
    GET /api/user/me/
    Headers: Authorization: Bearer <access_token>
    """
    serializer = UserSerializer(request.user)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET', 'PATCH', 'PUT'])
@permission_classes([IsAuthenticated])
def update_driver_profile(request):
    """
    Get or update the current driver's profile.
    Only drivers can update their own profile. Admins can update any driver profile.

    GET /api/driver/profile/ - Get current driver's profile
    PATCH /api/driver/profile/ - Partially update current driver's profile
    PUT /api/driver/profile/ - Fully update current driver's profile

    Headers: Authorization: Bearer <access_token>

    Body (for PATCH/PUT): {
        "vehicle_type_id": 1,
        "vehicle_color": "black",
        "is_available": true
    }
    """
    # Check if user is a driver
    if not hasattr(request.user, 'driver_profile'):
        return Response({
            'error': 'Only drivers can access this endpoint'
        }, status=status.HTTP_403_FORBIDDEN)

    driver = request.user.driver_profile

    # IsOwnerOrAdmin permission will be checked automatically by DRF
    # For object-level permissions, we need to check it manually
    permission = IsOwnerOrAdmin()
    if not permission.has_object_permission(request, None, driver):
        return Response({
            'error': 'You do not have permission to access this resource'
        }, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'GET':
        serializer = DriverDetailSerializer(driver)
        return Response(serializer.data, status=status.HTTP_200_OK)

    # For PATCH and PUT
    partial = request.method == 'PATCH'
    serializer = DriverUpdateSerializer(driver, data=request.data, partial=partial)

    if serializer.is_valid():
        serializer.save()
        # Return the updated driver data with full details
        response_serializer = DriverDetailSerializer(driver)
        return Response({
            'message': 'Driver profile updated successfully',
            'driver': response_serializer.data
        }, status=status.HTTP_200_OK)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Sort key that pushes a literal "Other" to the end while keeping the rest
# alphabetical (annotate is_other = 1 for "Other", 0 otherwise; order by it first).
from django.db.models import Case, When, IntegerField, Value


class VehicleBrandViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Public list of vehicle brands for the brand picker ("Other" sorts last).
    GET /api/vehicle-brands/
    GET /api/vehicle-brands/?search=Toyota
    """
    serializer_class = VehicleBrandSerializer
    permission_classes = [AllowAny]
    pagination_class = None  # full reference list — the picker needs every brand
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']

    def get_queryset(self):
        return VehicleBrand.objects.annotate(
            is_other=Case(When(name__iexact='Other', then=Value(1)), default=Value(0), output_field=IntegerField())
        ).order_by('is_other', 'name')


class VehicleModelViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Public list of vehicle models, filterable by brand ("Other" sorts last).
    GET /api/vehicle-models/                 - all models
    GET /api/vehicle-models/?brand=3         - models for brand id 3
    GET /api/vehicle-models/?search=Camry    - search by model name
    """
    serializer_class = VehicleModelSerializer
    permission_classes = [AllowAny]
    pagination_class = None  # full reference list — the picker needs every model
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = {
        'brand': ['exact'],
        'name': ['exact', 'icontains'],
    }
    search_fields = ['name', 'brand__name']

    def get_queryset(self):
        return VehicleModel.objects.select_related('brand').annotate(
            is_other=Case(When(name__iexact='Other', then=Value(1)), default=Value(0), output_field=IntegerField())
        ).order_by('brand__name', 'is_other', 'name')


class DriverViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for listing and retrieving drivers with filtering.
    Only authenticated users (admin, driver, or rider) can access.

    GET /api/drivers/ - List all drivers (uses DriverListSerializer - minimal data)
    GET /api/drivers/?vehicle_type=1 - Filter by vehicle type ID
    GET /api/drivers/?rating=4.5 - Filter by minimum rating
    GET /api/drivers/?vehicle_type__brand=Toyota - Filter by vehicle brand
    GET /api/drivers/?ordering=-rating - Order by rating (descending)
    GET /api/drivers/{id}/ - Get specific driver details (uses DriverDetailSerializer - full data)
    """
    queryset = Driver.objects.select_related('user', 'vehicle_type', 'vehicle_type__brand').all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]

    # Filter fields
    filterset_fields = {
        'vehicle_type': ['exact'],
        'vehicle_type__brand__name': ['exact', 'icontains'],
        'vehicle_type__name': ['exact', 'icontains'],
        'vehicle_color': ['exact'],
        'rating': ['gte', 'lte', 'exact'],
        'is_available': ['exact'],
    }

    # Ordering fields
    ordering_fields = ['rating', 'total_rides']
    ordering = ['-rating']  # Default ordering

    # Search fields
    search_fields = ['user__full_name', 'user__email']

    def get_serializer_class(self):
        """
        Return different serializers for list vs retrieve actions.
        - list: DriverListSerializer (minimal data for performance)
        - retrieve: DriverDetailSerializer (full data with nested objects)
        """
        if self.action == 'retrieve':
            return DriverDetailSerializer
        return DriverListSerializer

    def list(self, request, *args, **kwargs):
        """
        List drivers. When the rider passes their location via `lat` and `lng`
        query params, each driver is annotated with `distance_km` and the list is
        sorted nearest-first (drivers without a known location go last).

        GET /api/drivers/?is_available=true&lat=40.71&lng=-74.00
        """
        from .utils import haversine_km

        queryset = self.filter_queryset(self.get_queryset())

        lat = request.query_params.get('lat')
        lng = request.query_params.get('lng')

        if lat is None or lng is None:
            # No location supplied → default behaviour (rating/ordering as before).
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)

        try:
            r_lat, r_lng = float(lat), float(lng)
        except (TypeError, ValueError):
            return Response({'error': 'lat and lng must be numbers'},
                            status=status.HTTP_400_BAD_REQUEST)

        drivers = list(queryset)
        distances = {
            d.pk: haversine_km(r_lat, r_lng, d.current_latitude, d.current_longitude)
            for d in drivers
        }
        # Nearest first; drivers with unknown location sort to the end.
        drivers.sort(key=lambda d: (distances[d.pk] is None, distances[d.pk] or 0.0))

        serializer = self.get_serializer(drivers, many=True)
        data = serializer.data
        # Attach the computed distance to each serialized driver.
        for item, d in zip(data, drivers):
            km = distances[d.pk]
            item['distance_km'] = round(km, 2) if km is not None else None
        return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def nearby_drivers(request):
    """
    Anonymous list of currently-available drivers (with a known location) for the
    rider's discovery map, limited to those within `radius_km` of the rider.
    Returns only single_ride_mode + coordinates — no name, rating, vehicle, or price.

    Query params:
      - lat, lng:    rider's location. If omitted, ALL available drivers are
                     returned (legacy behaviour, e.g. before GPS is ready).
      - radius_km:   search radius in km (default 1).

    Filtering is two-stage for efficiency: a cheap bounding-box WHERE runs in the
    DB (indexable, so it never scans the whole table), then a precise haversine
    pass in Python trims the box corners to a true circle. Sorted nearest-first.

    GET /api/drivers/nearby/?lat=..&lng=..&radius_km=1
    """
    from math import cos, radians
    from .utils import haversine_km

    drivers = Driver.objects.filter(
        is_available=True,
        current_latitude__isnull=False,
        current_longitude__isnull=False,
    )

    # Parse rider location + radius. Bad/missing lat/lng -> no geo filter.
    try:
        rider_lat = float(request.query_params.get('lat'))
        rider_lng = float(request.query_params.get('lng'))
    except (TypeError, ValueError):
        rider_lat = rider_lng = None

    try:
        radius_km = float(request.query_params.get('radius_km', 1))
    except (TypeError, ValueError):
        radius_km = 1.0
    if radius_km <= 0:
        radius_km = 1.0

    if rider_lat is not None and rider_lng is not None:
        # Stage 1: bounding box (runs in DB). 1 deg latitude ~= 111 km; longitude
        # degrees shrink by cos(latitude). Pad slightly so the box never clips the
        # circle near its edges.
        lat_delta = radius_km / 111.0
        lng_delta = radius_km / (111.0 * max(cos(radians(rider_lat)), 1e-6))
        drivers = drivers.filter(
            current_latitude__range=(rider_lat - lat_delta, rider_lat + lat_delta),
            current_longitude__range=(rider_lng - lng_delta, rider_lng + lng_delta),
        )

        # Stage 2: precise haversine on the small candidate set; keep <= radius,
        # nearest first.
        within = []
        for d in drivers:
            km = haversine_km(rider_lat, rider_lng, d.current_latitude, d.current_longitude)
            if km is not None and km <= radius_km:
                within.append((km, d))
        within.sort(key=lambda pair: pair[0])
        drivers = [d for _, d in within]

    return Response(NearbyDriverSerializer(drivers, many=True).data, status=status.HTTP_200_OK)


# Confirmed rides older than this (since created_at) are auto-cleared for the
# driver, as if they'd tapped "Done, clear".
STALE_RIDE_HOURS = 24


def _auto_clear_stale_rides(driver):
    """Hide this driver's confirmed, not-hidden rides older than STALE_RIDE_HOURS
    and queue a rating request for the rider on each — same effect as the driver
    manually clearing a finished ride. Cheap: scoped to one driver's old rides."""
    from django.utils import timezone
    from datetime import timedelta
    from .models import RatingRequest

    cutoff = timezone.now() - timedelta(hours=STALE_RIDE_HOURS)
    stale = Ride.objects.filter(
        driver=driver, status__in=('confirmed', 'arrived'), is_hidden=False,
        created_at__lt=cutoff,
    ).select_related('rider')
    for ride in stale:
        ride.is_hidden = True
        ride.save(update_fields=['is_hidden'])
        RatingRequest.objects.get_or_create(ride=ride, rider=ride.rider, driver=driver)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_rides(request):
    """
    List the current user's rides.
    - Rider: their own ride requests.
    - Driver: rides they were assigned to.
    Hidden rides excluded unless ?include_hidden=true. Optional ?status= filter
    (open | assigned | cancelled), comma-separated for multiple.

    GET /api/rides/
    """
    user = request.user

    if hasattr(user, 'rider_profile'):
        rides = Ride.objects.filter(rider__user=user)
    elif hasattr(user, 'driver_profile'):
        # Auto-clear this driver's stale confirmed rides (>24h) before listing —
        # as if they'd tapped "Done, clear" (hides the ride + queues a rating
        # request for the rider). Runs lazily when the driver loads their rides.
        _auto_clear_stale_rides(user.driver_profile)
        rides = Ride.objects.filter(driver__user=user)
    else:
        return Response({'error': 'User has no driver or rider profile'},
                        status=status.HTTP_403_FORBIDDEN)

    if request.query_params.get('include_hidden', '').lower() != 'true':
        rides = rides.filter(is_hidden=False)

    status_filter = request.query_params.get('status')
    if status_filter:
        requested = [s.strip() for s in status_filter.split(',') if s.strip()]
        valid = dict(Ride.STATUS_CHOICES).keys()
        invalid = [s for s in requested if s not in valid]
        if invalid:
            return Response({'error': f'Invalid status: {", ".join(invalid)}. Choose from: {", ".join(valid)}'},
                            status=status.HTTP_400_BAD_REQUEST)
        rides = rides.filter(status__in=requested)

    rides = rides.select_related('rider__user', 'driver__user', 'driver__vehicle_type')
    serializer = RideSerializer(rides, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def hide_ride(request, ride_id):
    """
    Dismiss a finished ride from the caller's list ("Done" / "I arrived, clear").
    Only a party to the ride (its assigned driver or its rider) may hide it, and
    only once it is terminal — 'confirmed' (trip done) or 'cancelled'. Such rides
    are already invisible to every OTHER driver (only open requests are broadcast,
    and only the assigned driver sees their own rides), so hiding never affects them.
    POST /api/rides/<ride_id>/hide/
    """
    try:
        ride = Ride.objects.get(id=ride_id)
    except Ride.DoesNotExist:
        return Response({'error': 'Ride not found'}, status=status.HTTP_404_NOT_FOUND)

    is_party = (ride.driver and ride.driver.user_id == request.user.id) or ride.rider.user_id == request.user.id
    if not is_party:
        return Response({'error': 'This ride does not belong to you'}, status=status.HTTP_403_FORBIDDEN)

    if ride.status not in ('confirmed', 'arrived', 'cancelled'):
        return Response({
            'error': f'Only a confirmed, arrived or cancelled ride can be cleared (this one is {ride.status})'
        }, status=status.HTTP_400_BAD_REQUEST)

    ride.is_hidden = True
    ride.save(update_fields=['is_hidden'])

    # When the DRIVER ends a CONFIRMED/ARRIVED ride ("Done, clear"), queue a
    # pending rating request so the rider gets prompted to rate this driver later.
    is_driver = ride.driver and ride.driver.user_id == request.user.id
    if is_driver and ride.status in ('confirmed', 'arrived') and ride.driver_id:
        from .models import RatingRequest
        RatingRequest.objects.get_or_create(
            ride=ride, rider=ride.rider, driver=ride.driver,
        )

    return Response({'message': 'Ride hidden', 'id': ride.id}, status=status.HTTP_200_OK)


def _score_from_request(request):
    """Parse + validate a 1-5 integer score from the request body. Returns
    (score, error_response). score is None when the user ignored (no/blank score)."""
    raw = request.data.get('score', None)
    if raw in (None, ''):
        return None, None  # ignored
    try:
        score = int(raw)
    except (TypeError, ValueError):
        return None, Response({'error': 'score must be an integer 1-5'}, status=status.HTTP_400_BAD_REQUEST)
    if score < 1 or score > 5:
        return None, Response({'error': 'score must be between 1 and 5'}, status=status.HTTP_400_BAD_REQUEST)
    return score, None


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def rate_ride(request, ride_id):
    """
    Submit an IMMEDIATE rating for the other party on a ride.
      - Driver rates the rider (after "Done, clear" / "Clear").
      - Rider rates the driver (after cancelling a confirmed ride).
    Body: { "score": 1..5 }. Ignorable on the client (it just doesn't call this).
    The score updates the ratee's running average; nothing is stored per-rating.
    POST /api/rides/<ride_id>/rate/
    """
    from .models import apply_rating
    try:
        ride = Ride.objects.select_related('rider__user', 'driver__user').get(id=ride_id)
    except Ride.DoesNotExist:
        return Response({'error': 'Ride not found'}, status=status.HTTP_404_NOT_FOUND)

    score, err = _score_from_request(request)
    if err:
        return err
    if score is None:
        return Response({'message': 'No score given'}, status=status.HTTP_200_OK)

    uid = request.user.id
    if ride.driver and ride.driver.user_id == uid:
        # Driver is rating the rider.
        apply_rating(ride.rider, score)
        target = 'rider'
    elif ride.rider.user_id == uid:
        # Rider is rating the driver.
        if not ride.driver_id:
            return Response({'error': 'This ride has no driver to rate'}, status=status.HTTP_400_BAD_REQUEST)
        apply_rating(ride.driver, score)
        target = 'driver'
    else:
        return Response({'error': 'This ride does not belong to you'}, status=status.HTTP_403_FORBIDDEN)

    return Response({'message': f'Rated the {target}', 'score': score}, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsRider])
def list_pending_ratings(request):
    """
    The rider's pending rating prompts (driver ended a confirmed ride). The app
    shows these one at a time. Each: { id, ride, driver_name }.
    GET /api/ratings/pending/
    """
    from .models import RatingRequest
    rider = request.user.rider_profile
    qs = (RatingRequest.objects
          .filter(rider=rider, is_done=False)
          .select_related('driver__user', 'ride')
          .order_by('created_at'))
    data = [{
        'id': rr.id,
        'ride': rr.ride_id,
        'driver_name': rr.driver.user.full_name,
        'destination': rr.ride.dropoff_location or None,
    } for rr in qs]
    return Response(data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsRider])
def resolve_rating(request, rating_id):
    """
    Resolve a pending rating request: rate the driver (1-5) OR ignore. Either
    way it becomes is_done so it won't show again. If a score is given, it's
    folded into the driver's running average (not stored on the request).
    Body: { "score": 1..5 } to rate, or omit/blank to ignore.
    POST /api/ratings/<rating_id>/resolve/
    """
    from .models import RatingRequest, apply_rating
    rider = request.user.rider_profile
    try:
        rr = RatingRequest.objects.select_related('driver').get(id=rating_id, rider=rider)
    except RatingRequest.DoesNotExist:
        return Response({'error': 'Rating request not found'}, status=status.HTTP_404_NOT_FOUND)

    if rr.is_done:
        return Response({'message': 'Already resolved'}, status=status.HTTP_200_OK)

    score, err = _score_from_request(request)
    if err:
        return err
    if score is not None:
        apply_rating(rr.driver, score)

    rr.is_done = True
    rr.save(update_fields=['is_done'])
    return Response({'message': 'Resolved', 'rated': score is not None}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsRider])
def request_ride(request):
    """
    Rider posts a general ride request, broadcast to nearby drivers.
    POST /api/rides/request/
    Body: {
        "pickup_location": "123 Main St",
        "pickup_latitude": 40.7128,
        "pickup_longitude": -74.0060,
        "dropoff_location": "456 Market Ave"
    }
    """
    # A rider may only have one open request at a time.
    rider = request.user.rider_profile
    existing = Ride.objects.filter(rider=rider, status='open').first()
    if existing:
        return Response({
            'error': 'You already have an open ride request. Cancel it before posting a new one.',
            'ride': RideSerializer(existing).data,
        }, status=status.HTTP_400_BAD_REQUEST)

    serializer = RideRequestSerializer(data=request.data, context={'request': request})
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    ride = serializer.save()
    response_serializer = RideSerializer(ride)

    # Broadcast to all currently available drivers so they can offer.
    channel_layer = get_channel_layer()
    available_driver_user_ids = Driver.objects.filter(
        is_available=True
    ).values_list('user_id', flat=True)
    for driver_user_id in available_driver_user_ids:
        async_to_sync(channel_layer.group_send)(
            f'user_{driver_user_id}',
            {
                'type': 'ride_notification',
                'notification_type': 'ride_requested',
                'message': f'New ride request from {ride.rider.user.full_name}',
                'ride': response_serializer.data,
            }
        )

    return Response({
        'message': 'Ride request posted',
        'ride': response_serializer.data
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsDriver])
def list_open_requests(request):
    """
    Driver lists OPEN ride requests, sorted by the driver's distance to each
    request's pickup point (nearest first; requests with no pickup coords last).
    Each request includes distance_km and whether this driver already offered.

    GET /api/rides/open/
    """
    from .utils import haversine_km

    driver = request.user.driver_profile

    # If the driver isn't listening for requests, they see no open requests.
    if not driver.is_available:
        return Response([], status=status.HTTP_200_OK)

    rides = Ride.objects.filter(status='open', is_hidden=False).select_related('rider__user')

    d_lat = driver.current_latitude
    d_lng = driver.current_longitude

    rides = list(rides)
    distances = {
        r.pk: haversine_km(d_lat, d_lng, r.pickup_latitude, r.pickup_longitude)
        for r in rides
    }
    rides.sort(key=lambda r: (distances[r.pk] is None, distances[r.pk] or 0.0))

    # This driver's ACTIVE offer on each ride (declined/withdrawn excluded, so a
    # withdrawn request shows up fresh again).
    my_offers = {
        o.ride_id: o
        for o in Offer.objects.filter(driver=driver, ride__in=rides).exclude(status='declined')
    }

    serializer = RideSerializer(rides, many=True)
    data = serializer.data
    for item, r in zip(data, rides):
        km = distances[r.pk]
        item['distance_km'] = round(km, 2) if km is not None else None
        my = my_offers.get(r.pk)
        item['my_offer'] = OfferSerializer(my).data if my else None
    return Response(data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsDriver])
def create_offer(request, ride_id):
    """
    Driver submits (or updates) an offer on an open ride request.
    POST /api/rides/<ride_id>/offers/
    Body: { "price": 45.00 }
    """
    from decimal import Decimal, InvalidOperation

    try:
        ride = Ride.objects.get(id=ride_id)
    except Ride.DoesNotExist:
        return Response({'error': 'Ride not found'}, status=status.HTTP_404_NOT_FOUND)

    if ride.status != 'open':
        return Response({'error': f'Ride is {ride.status}, no longer open for offers'},
                        status=status.HTTP_400_BAD_REQUEST)

    driver = request.user.driver_profile
    if not driver.is_available:
        return Response({'error': 'You must be available to make offers'},
                        status=status.HTTP_400_BAD_REQUEST)
    if driver.current_balance < driver.price_per_trip:
        return Response({'error': 'Insufficient balance to offer (need at least the per-trip fee)'},
                        status=status.HTTP_400_BAD_REQUEST)

    price_raw = request.data.get('price')
    try:
        price = Decimal(str(price_raw))
        if price <= 0:
            raise InvalidOperation
    except (InvalidOperation, TypeError, ValueError):
        return Response({'error': 'A valid positive price is required'},
                        status=status.HTTP_400_BAD_REQUEST)

    # One offer per driver per ride: update if it exists, else create.
    offer, created = Offer.objects.update_or_create(
        ride=ride, driver=driver,
        defaults={'price': price, 'counter_price': None, 'status': 'pending'},
    )

    response = OfferSerializer(offer)

    # Notify the rider of the new/updated offer.
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f'user_{ride.rider.user_id}',
        {
            'type': 'ride_notification',
            'notification_type': 'offer_received',
            'message': f'{driver.user.full_name} offered ${price}',
            'ride': RideSerializer(ride).data,
            'offer': response.data,
        }
    )

    return Response({
        'message': 'Offer submitted' if created else 'Offer updated',
        'offer': response.data
    }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsRider])
def list_offers(request, ride_id):
    """
    Rider lists the offers on their ride request, with each driver's distance
    to the pickup point.
    GET /api/rides/<ride_id>/offers/
    """
    from .utils import haversine_km

    try:
        ride = Ride.objects.get(id=ride_id)
    except Ride.DoesNotExist:
        return Response({'error': 'Ride not found'}, status=status.HTTP_404_NOT_FOUND)

    if ride.rider.user_id != request.user.id:
        return Response({'error': 'This ride does not belong to you'},
                        status=status.HTTP_403_FORBIDDEN)

    offers = ride.offers.exclude(status='declined').select_related('driver__user', 'driver__vehicle_type')
    data = OfferSerializer(offers, many=True).data
    for item, offer in zip(data, offers):
        km = haversine_km(
            ride.pickup_latitude, ride.pickup_longitude,
            offer.driver.current_latitude, offer.driver.current_longitude,
        )
        item['driver_distance_km'] = round(km, 2) if km is not None else None
    return Response(data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsRider])
def counter_offer(request, offer_id):
    """
    Rider counters a driver's offer with a (typically lower) price.
    POST /api/offers/<offer_id>/counter/
    Body: { "price": 40.00 }
    """
    from decimal import Decimal, InvalidOperation

    try:
        offer = Offer.objects.select_related('ride', 'driver__user').get(id=offer_id)
    except Offer.DoesNotExist:
        return Response({'error': 'Offer not found'}, status=status.HTTP_404_NOT_FOUND)

    if offer.ride.rider.user_id != request.user.id:
        return Response({'error': 'This offer is not on your ride'},
                        status=status.HTTP_403_FORBIDDEN)
    if offer.status not in ('pending', 'countered'):
        return Response({'error': f'Cannot counter an offer that is {offer.status}'},
                        status=status.HTTP_400_BAD_REQUEST)

    price_raw = request.data.get('price')
    try:
        price = Decimal(str(price_raw))
        if price <= 0:
            raise InvalidOperation
    except (InvalidOperation, TypeError, ValueError):
        return Response({'error': 'A valid positive price is required'},
                        status=status.HTTP_400_BAD_REQUEST)

    offer.counter_price = price
    offer.status = 'countered'
    offer.save(update_fields=['counter_price', 'status', 'updated_at'])

    response = OfferSerializer(offer)
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f'user_{offer.driver.user_id}',
        {
            'type': 'ride_notification',
            'notification_type': 'offer_countered',
            'message': f'{offer.ride.rider.user.full_name} countered with ${price}',
            'ride': RideSerializer(offer.ride).data,
            'offer': response.data,
        }
    )

    return Response({'message': 'Counter sent', 'offer': response.data}, status=status.HTTP_200_OK)


def _assign_ride_from_offer(offer, agreed_price):
    """
    Finalize a ride from an accepted offer: assign the driver. NO fee is charged
    here and the status is only 'assigned' — the driver must still CONFIRM (see
    confirm_ride), which charges the fee, starts the trip, AND declines the other
    offers. The other offers are intentionally left standing until confirmation so
    that if this driver never confirms (or withdraws), the rider's other offers
    are still on the table when the ride reopens.
    Returns (ok, error_message).
    """
    driver = offer.driver
    ride = offer.ride
    ride.driver = driver
    ride.status = 'assigned'
    ride.final_price = agreed_price
    ride.save(update_fields=['driver', 'status', 'final_price'])

    offer.price = agreed_price
    offer.status = 'accepted'
    offer.save(update_fields=['price', 'status', 'updated_at'])
    return True, None


@api_view(['POST'])
@permission_classes([IsRider])
def accept_offer(request, offer_id):
    """
    Rider accepts a driver's offer (at its current price), assigning the driver.
    POST /api/offers/<offer_id>/accept/
    """
    try:
        offer = Offer.objects.select_related('ride', 'driver__user').get(id=offer_id)
    except Offer.DoesNotExist:
        return Response({'error': 'Offer not found'}, status=status.HTTP_404_NOT_FOUND)

    if offer.ride.rider.user_id != request.user.id:
        return Response({'error': 'This offer is not on your ride'},
                        status=status.HTTP_403_FORBIDDEN)
    if offer.ride.status != 'open':
        return Response({'error': f'Ride is already {offer.ride.status}'},
                        status=status.HTTP_400_BAD_REQUEST)
    if offer.status not in ('pending', 'countered'):
        return Response({'error': f'Cannot accept an offer that is {offer.status}'},
                        status=status.HTTP_400_BAD_REQUEST)

    ok, err = _assign_ride_from_offer(offer, offer.price)
    if not ok:
        return Response({'error': err}, status=status.HTTP_400_BAD_REQUEST)

    response = OfferSerializer(offer)
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f'user_{offer.driver.user_id}',
        {
            'type': 'ride_notification',
            'notification_type': 'offer_accepted',
            'message': f'{offer.ride.rider.user.full_name} accepted your offer of ${offer.price}',
            'ride': RideSerializer(offer.ride).data,
            'offer': response.data,
        }
    )

    return Response({
        'message': 'Offer accepted, driver assigned',
        'ride': RideSerializer(offer.ride).data,
        'offer': response.data,
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsRider])
def decline_offer(request, offer_id):
    """
    Rider declines a driver's offer on their ride. Drivers cannot change offer
    status — only the rider does (accept / counter / decline).
    POST /api/offers/<offer_id>/decline/
    """
    try:
        offer = Offer.objects.select_related('ride', 'driver__user').get(id=offer_id)
    except Offer.DoesNotExist:
        return Response({'error': 'Offer not found'}, status=status.HTTP_404_NOT_FOUND)

    ride = offer.ride
    if ride.rider.user_id != request.user.id:
        return Response({'error': 'This offer is not on your ride'}, status=status.HTTP_403_FORBIDDEN)
    if offer.status == 'declined':
        return Response({'error': 'Offer is already declined'}, status=status.HTTP_400_BAD_REQUEST)

    # Declining the ACCEPTED offer means un-accepting: the chosen driver is
    # dropped and the request reopens so other drivers' offers stand. Only allowed
    # before the driver confirms.
    if offer.status == 'accepted':
        if ride.status == 'confirmed':
            return Response({'error': 'The driver already confirmed; cancel the ride instead'},
                            status=status.HTTP_400_BAD_REQUEST)
        ride.driver = None
        ride.final_price = None
        ride.status = 'open'
        ride.save(update_fields=['driver', 'final_price', 'status'])

    offer.status = 'declined'
    offer.save(update_fields=['status', 'updated_at'])

    response = OfferSerializer(offer)
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f'user_{offer.driver.user_id}',
        {
            'type': 'ride_notification',
            'notification_type': 'offer_declined',
            'message': f'{ride.rider.user.full_name} declined your offer',
            'ride': RideSerializer(ride).data,
            'offer': response.data,
        }
    )

    return Response({'message': 'Offer declined', 'offer': response.data}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsDriver])
def withdraw_offer(request, ride_id):
    """
    Driver withdraws their own offer on a ride. Allowed while the offer is still
    on the table — i.e. the ride is 'open' (pending/countered offer) or 'assigned'
    (the rider accepted this driver but they haven't CONFIRMED yet). Not allowed
    once confirmed (the trip is committed).

    The offer is marked declined. If the ride was assigned to this driver it
    reopens (back to 'open') so other drivers can offer and the rider keeps their
    request. The request then appears fresh to this driver.
    POST /api/rides/<ride_id>/withdraw/
    """
    driver = request.user.driver_profile
    try:
        offer = Offer.objects.select_related('ride', 'driver__user', 'ride__rider__user').get(
            ride_id=ride_id, driver=driver
        )
    except Offer.DoesNotExist:
        return Response({'error': 'You have no offer on this ride'}, status=status.HTTP_404_NOT_FOUND)

    ride = offer.ride
    if ride.status == 'confirmed':
        return Response({'error': 'You already confirmed this ride; it cannot be withdrawn'},
                        status=status.HTTP_400_BAD_REQUEST)
    if ride.status not in ('open', 'assigned'):
        return Response({'error': f'Cannot withdraw on a ride that is {ride.status}'},
                        status=status.HTTP_400_BAD_REQUEST)

    was_assigned_to_me = ride.status == 'assigned' and ride.driver_id == offer.driver_id

    offer.status = 'declined'
    offer.save(update_fields=['status', 'updated_at'])

    notify_rider = False
    if was_assigned_to_me:
        # Reopen the request so the rider keeps it and other drivers can offer.
        ride.driver = None
        ride.final_price = None
        ride.status = 'open'
        ride.save(update_fields=['driver', 'final_price', 'status'])
        notify_rider = True

    channel_layer = get_channel_layer()
    if notify_rider:
        async_to_sync(channel_layer.group_send)(
            f'user_{ride.rider.user_id}',
            {
                'type': 'ride_notification',
                'notification_type': 'offer_withdrawn',
                'message': f'{offer.driver.user.full_name} withdrew — your request is open again',
                'ride': RideSerializer(ride).data,
            }
        )

    return Response({'message': 'Offer withdrawn', 'ride': RideSerializer(ride).data},
                    status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsRider])
def cancel_ride(request, ride_id):
    """
    Rider cancels their own ride request. Allowed at any live stage:
      - open: no commitment; notify drivers so it leaves their open list.
      - assigned: a driver was chosen but hasn't confirmed (no fee charged);
                  notify that driver.
      - confirmed: the driver committed and was charged. The fee is NOT refunded
                   and the driver is sent a "Sorry" notification. The cancelled
                   ride stays visible to that driver until they dismiss it.
    POST /api/rides/<ride_id>/cancel/
    """
    try:
        ride = Ride.objects.get(id=ride_id)
    except Ride.DoesNotExist:
        return Response({'error': 'Ride not found'}, status=status.HTTP_404_NOT_FOUND)

    if ride.rider.user_id != request.user.id:
        return Response({'error': 'This ride does not belong to you'}, status=status.HTTP_403_FORBIDDEN)
    if ride.status not in ('open', 'assigned', 'confirmed'):
        return Response({'error': f'Cannot cancel a ride that is {ride.status}'},
                        status=status.HTTP_400_BAD_REQUEST)

    prev_status = ride.status
    rider_name = ride.rider.user.full_name
    channel_layer = get_channel_layer()

    if prev_status == 'open':
        ride.status = 'cancelled'
        ride.save(update_fields=['status'])

        offered_driver_user_ids = set(
            ride.offers.exclude(status='declined').values_list('driver__user_id', flat=True)
        )
        ride.offers.exclude(status='declined').update(status='declined')
        response_serializer = RideSerializer(ride)

        # Broadcast so the request leaves every driver's open list.
        available_driver_user_ids = set(
            Driver.objects.filter(is_available=True).values_list('user_id', flat=True)
        )
        for driver_user_id in (available_driver_user_ids | offered_driver_user_ids):
            async_to_sync(channel_layer.group_send)(
                f'user_{driver_user_id}',
                {
                    'type': 'ride_notification',
                    'notification_type': 'ride_cancelled',
                    'message': f'{rider_name} cancelled a request',
                    'ride': response_serializer.data,
                }
            )
        return Response({'message': 'Ride cancelled'}, status=status.HTTP_200_OK)

    # assigned or confirmed: there is a chosen driver. No refund on confirmed.
    driver_user_id = ride.driver.user_id if ride.driver else None
    ride.status = 'cancelled'
    ride.save(update_fields=['status'])
    ride.offers.exclude(status='declined').update(status='declined')

    # Undo the ride count for both parties: only a 'confirmed' ride was counted
    # (confirm_ride increments total_rides). 'assigned' was never counted.
    if prev_status == 'confirmed':
        if ride.driver:
            ride.driver.total_rides = max(0, ride.driver.total_rides - 1)
            ride.driver.save(update_fields=['total_rides'])
        ride.rider.total_rides = max(0, ride.rider.total_rides - 1)
        ride.rider.save(update_fields=['total_rides'])

    response_serializer = RideSerializer(ride)

    if driver_user_id:
        if prev_status == 'confirmed':
            msg = f'Sorry — {rider_name} cancelled the ride. The fee is not refunded.'
        else:
            msg = f'{rider_name} cancelled the ride.'
        async_to_sync(channel_layer.group_send)(
            f'user_{driver_user_id}',
            {
                'type': 'ride_notification',
                'notification_type': 'ride_cancelled_by_rider',
                'message': msg,
                'ride': response_serializer.data,
            }
        )

    return Response({'message': 'Ride cancelled'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsRider])
def arrive_ride(request, ride_id):
    """
    Rider marks their confirmed ride as arrived (the driver reached them). The
    ride stays "on going" on the driver's side (confirmed + arrived both show as
    On going) until the driver clears it. Notifies the driver.
    POST /api/rides/<ride_id>/arrive/
    """
    try:
        ride = Ride.objects.get(id=ride_id)
    except Ride.DoesNotExist:
        return Response({'error': 'Ride not found'}, status=status.HTTP_404_NOT_FOUND)

    if ride.rider.user_id != request.user.id:
        return Response({'error': 'This ride does not belong to you'}, status=status.HTTP_403_FORBIDDEN)
    if ride.status != 'confirmed':
        return Response({'error': f'Cannot mark a ride that is {ride.status} as arrived'},
                        status=status.HTTP_400_BAD_REQUEST)

    ride.status = 'arrived'
    ride.save(update_fields=['status'])
    response_serializer = RideSerializer(ride)

    if ride.driver:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'user_{ride.driver.user_id}',
            {
                'type': 'ride_notification',
                'notification_type': 'ride_arrived',
                'message': f'{ride.rider.user.full_name} marked you as arrived.',
                'ride': response_serializer.data,
            }
        )

    return Response(response_serializer.data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsDriver])
def confirm_ride(request, ride_id):
    """
    Driver confirms an assigned ride ("I'm coming"). This is the real commitment:
    the per-trip fee is charged, the trip starts (status -> confirmed), and from
    now on location + phone numbers are shared with the rider.
    POST /api/rides/<ride_id>/confirm/
    """
    try:
        ride = Ride.objects.get(id=ride_id)
    except Ride.DoesNotExist:
        return Response({'error': 'Ride not found'}, status=status.HTTP_404_NOT_FOUND)

    if not ride.driver or ride.driver.user_id != request.user.id:
        return Response({'error': 'This ride is not assigned to you'}, status=status.HTTP_403_FORBIDDEN)
    if ride.status != 'assigned':
        return Response({'error': f'Ride is {ride.status}, cannot confirm'},
                        status=status.HTTP_400_BAD_REQUEST)

    driver = ride.driver
    if driver.current_balance < driver.price_per_trip:
        return Response({
            'error': 'Not enough balance — recharge to confirm the ride, or cancel.'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Charge the fee now, count the ride for both parties, and start the trip.
    driver.current_balance -= driver.price_per_trip
    driver.total_rides += 1
    driver.save(update_fields=['current_balance', 'total_rides'])
    rider = ride.rider
    rider.total_rides += 1
    rider.save(update_fields=['total_rides'])
    ride.status = 'confirmed'
    ride.save(update_fields=['status'])

    # Decline any other live offers on this ride (pending/countered) — the ride is
    # now committed to this driver. Notify those drivers so it leaves their list.
    losing_driver_user_ids = set(
        ride.offers.exclude(driver=driver).exclude(status='declined')
                   .values_list('driver__user_id', flat=True)
    )
    ride.offers.exclude(driver=driver).exclude(status='declined').update(status='declined')

    response_serializer = RideSerializer(ride)
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f'user_{ride.rider.user_id}',
        {
            'type': 'ride_notification',
            'notification_type': 'ride_confirmed',
            'message': f'{driver.user.full_name} is coming!',
            'ride': response_serializer.data,
        }
    )
    for losing_user_id in losing_driver_user_ids:
        async_to_sync(channel_layer.group_send)(
            f'user_{losing_user_id}',
            {
                'type': 'ride_notification',
                'notification_type': 'offer_declined',
                'message': 'This request was taken by another driver',
                'ride': response_serializer.data,
            }
        )

    # Withdraw THIS driver's other live offers on OTHER requests when:
    #  - the driver is in single_ride_mode (always, automatically), or
    #  - the request explicitly asks (withdraw_others — the "multi" mode popup).
    withdrawn_count = 0
    asked = str(request.data.get('withdraw_others', '')).lower() in ('true', '1')
    if driver.single_ride_mode or asked:
        my_other_offers = Offer.objects.filter(driver=driver).exclude(ride_id=ride.id).exclude(
            status='declined'
        ).select_related('ride__rider__user')
        for o in my_other_offers:
            other_ride = o.ride
            # Don't touch a ride that's already past negotiation (confirmed/cancelled).
            if other_ride.status not in ('open', 'assigned'):
                continue
            o.status = 'declined'
            o.save(update_fields=['status', 'updated_at'])
            withdrawn_count += 1
            # If this driver was the assigned one, reopen that request for others.
            if other_ride.status == 'assigned' and other_ride.driver_id == driver.pk:
                other_ride.driver = None
                other_ride.final_price = None
                other_ride.status = 'open'
                other_ride.save(update_fields=['driver', 'final_price', 'status'])
                async_to_sync(channel_layer.group_send)(
                    f'user_{other_ride.rider.user_id}',
                    {
                        'type': 'ride_notification',
                        'notification_type': 'offer_withdrawn',
                        'message': f'{driver.user.full_name} withdrew — your request is open again',
                        'ride': RideSerializer(other_ride).data,
                    }
                )

    return Response({
        'message': 'Ride confirmed, trip started',
        'withdrawn_other_offers': withdrawn_count,
        'ride': response_serializer.data
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsDriver])
def recharge_balance(request):
    """
    Driver recharges their balance
    POST /api/driver/recharge/
    Headers: Authorization: Bearer <access_token>
    Body: {
        "amount": 100.00
    }
    """
    # Check if user is a driver
    if not hasattr(request.user, 'driver_profile'):
        return Response({
            'error': 'Only drivers can recharge balance'
        }, status=status.HTTP_403_FORBIDDEN)

    driver = request.user.driver_profile

    # Get amount from request
    amount = request.data.get('amount')

    if not amount:
        return Response({
            'error': 'Amount is required'
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        from decimal import Decimal
        amount_decimal = Decimal(str(amount))

        if amount_decimal <= 0:
            return Response({
                'error': 'Amount must be greater than zero'
            }, status=status.HTTP_400_BAD_REQUEST)

    except (ValueError, TypeError):
        return Response({
            'error': 'Invalid amount format'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Add amount to driver's balance
    driver.current_balance += amount_decimal
    driver.save(update_fields=['current_balance'])

    return Response({
        'message': f'Balance recharged successfully with ${amount_decimal}',
        'current_balance': str(driver.current_balance)
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsDriver])
def update_driver_location(request):
    """
    Driver updates their current GPS location.
    POST /api/driver/location/
    Headers: Authorization: Bearer <access_token>
    Body: { "latitude": 40.7128, "longitude": -74.0060 }
    """
    from decimal import Decimal, InvalidOperation
    from django.utils import timezone

    if not hasattr(request.user, 'driver_profile'):
        return Response({
            'error': 'Only drivers can update location'
        }, status=status.HTTP_403_FORBIDDEN)

    driver = request.user.driver_profile

    lat = request.data.get('latitude')
    lng = request.data.get('longitude')
    if lat is None or lng is None:
        return Response({
            'error': 'latitude and longitude are required'
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Quantize to 6 decimal places (the model's precision) so raw GPS with
        # more digits doesn't fail validation.
        q = Decimal('0.000001')
        lat_d = Decimal(str(lat)).quantize(q)
        lng_d = Decimal(str(lng)).quantize(q)
    except (InvalidOperation, TypeError, ValueError):
        return Response({'error': 'Invalid coordinates'}, status=status.HTTP_400_BAD_REQUEST)

    if not (-90 <= lat_d <= 90) or not (-180 <= lng_d <= 180):
        return Response({
            'error': 'Coordinates out of range (lat -90..90, lng -180..180)'
        }, status=status.HTTP_400_BAD_REQUEST)

    driver.current_latitude = lat_d
    driver.current_longitude = lng_d
    driver.location_updated_at = timezone.now()
    driver.save(update_fields=['current_latitude', 'current_longitude', 'location_updated_at'])

    return Response({
        'message': 'Location updated',
        'latitude': str(lat_d),
        'longitude': str(lng_d),
        'location_updated_at': driver.location_updated_at.isoformat(),
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def request_password_reset(request):
    """
    Public "forgot password" — send a reset OTP to the given email.
    Always returns the same success message whether or not the email exists
    (so we don't reveal which emails are registered).
    POST /api/password-reset/request/
    Body: { "email": "user@example.com" }
    """
    email = (request.data.get('email') or '').strip()
    if not email:
        return Response({'error': 'Email is required'}, status=status.HTTP_400_BAD_REQUEST)

    from django.contrib.auth import get_user_model
    User = get_user_model()
    user = User.objects.filter(email__iexact=email).first()
    if user:
        otp = create_otp(user, 'password_change')
        send_otp_email(user, otp.otp_code, 'password_change')

    # Same response either way.
    return Response({
        'message': 'If an account exists for that email, a reset code has been sent.'
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_password_reset(request):
    """
    Public "forgot password" — verify the reset OTP and set a new password.
    POST /api/password-reset/verify/
    Body: { "email", "otp_code", "new_password", "new_password_confirm" }
    """
    from django.contrib.auth import get_user_model
    from .utils import verify_otp

    email = (request.data.get('email') or '').strip()
    otp_code = request.data.get('otp_code')
    new_password = request.data.get('new_password')
    new_password_confirm = request.data.get('new_password_confirm')

    if not all([email, otp_code, new_password, new_password_confirm]):
        return Response({'error': 'All fields are required'}, status=status.HTTP_400_BAD_REQUEST)
    if new_password != new_password_confirm:
        return Response({'error': 'Passwords do not match'}, status=status.HTTP_400_BAD_REQUEST)
    if len(new_password) < 8:
        return Response({'error': 'Password must be at least 8 characters long'}, status=status.HTTP_400_BAD_REQUEST)

    User = get_user_model()
    user = User.objects.filter(email__iexact=email).first()
    # Generic error so we don't reveal whether the email exists.
    invalid = Response({'error': 'Invalid code or email'}, status=status.HTTP_400_BAD_REQUEST)
    if not user:
        return invalid

    success, message = verify_otp(user, otp_code, 'password_change')
    if not success:
        return invalid

    user.set_password(new_password)
    user.save()
    return Response({'message': 'Password reset successfully. You can now log in.'},
                    status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def request_password_change(request):
    """
    Request a password change - sends OTP to user's email
    POST /api/user/password-change/request/
    Headers: Authorization: Bearer <access_token>
    """
    user = request.user

    # Create and send OTP for password change
    otp = create_otp(user, 'password_change')
    email_sent = send_otp_email(user, otp.otp_code, 'password_change')

    if email_sent:
        return Response({
            'message': 'OTP has been sent to your email. Please check your inbox.'
        }, status=status.HTTP_200_OK)
    else:
        return Response({
            'error': 'Failed to send OTP email. Please try again.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_and_change_password(request):
    """
    Verify OTP and change password
    POST /api/user/password-change/verify/
    Headers: Authorization: Bearer <access_token>
    Body: {
        "otp_code": "123456",
        "new_password": "newpassword123",
        "new_password_confirm": "newpassword123"
    }
    """
    from .utils import verify_otp

    user = request.user
    otp_code = request.data.get('otp_code')
    new_password = request.data.get('new_password')
    new_password_confirm = request.data.get('new_password_confirm')

    # Validate inputs
    if not otp_code or not new_password or not new_password_confirm:
        return Response({
            'error': 'OTP code, new password, and password confirmation are required'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Check if passwords match
    if new_password != new_password_confirm:
        return Response({
            'error': 'Passwords do not match'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Validate password length
    if len(new_password) < 8:
        return Response({
            'error': 'Password must be at least 8 characters long'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Verify OTP
    success, message = verify_otp(user, otp_code, 'password_change')

    if not success:
        return Response({
            'error': message
        }, status=status.HTTP_400_BAD_REQUEST)

    # Change password
    user.set_password(new_password)
    user.save()

    return Response({
        'message': 'Password changed successfully'
    }, status=status.HTTP_200_OK)


@api_view(['PATCH', 'PUT'])
@permission_classes([IsAuthenticated])
def update_user_profile(request):
    """
    Update user profile (full_name, email, phone_number)
    Only the account owner can update their own profile

    PATCH /api/user/profile/ - Partially update profile
    PUT /api/user/profile/ - Fully update profile

    Headers: Authorization: Bearer <access_token>
    Body: {
        "full_name": "New Name",
        "email": "newemail@example.com",
        "phone_number": "+1234567890"
    }
    """
    user = request.user
    data = request.data

    # Only allow updating specific fields
    allowed_fields = ['full_name', 'email', 'phone_number']

    # Validate that only allowed fields are being updated
    for field in data.keys():
        if field not in allowed_fields:
            return Response({
                'error': f'Field "{field}" cannot be updated through this endpoint'
            }, status=status.HTTP_400_BAD_REQUEST)

    # Update full_name if provided
    if 'full_name' in data:
        if not data['full_name'] or len(data['full_name'].strip()) == 0:
            return Response({
                'error': 'Full name cannot be empty'
            }, status=status.HTTP_400_BAD_REQUEST)
        user.full_name = data['full_name']

    # Update email if provided
    if 'email' in data:
        # Check if email is already taken by another user
        from django.contrib.auth import get_user_model
        User = get_user_model()
        if User.objects.filter(email=data['email']).exclude(id=user.id).exists():
            return Response({
                'error': 'Email is already in use by another account'
            }, status=status.HTTP_400_BAD_REQUEST)
        user.email = data['email']

    # Update phone_number if provided
    if 'phone_number' in data:
        user.phone_number = data['phone_number']

    try:
        user.save()
        serializer = UserSerializer(user)
        return Response({
            'message': 'Profile updated successfully',
            'user': serializer.data
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({
            'error': f'Failed to update profile: {str(e)}'
        }, status=status.HTTP_400_BAD_REQUEST)
