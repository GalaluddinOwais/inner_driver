from rest_framework import serializers
from django.contrib.auth import get_user_model
from decimal import Decimal, ROUND_HALF_UP
from .models import Driver, Rider, VehicleType, Ride, Offer

User = get_user_model()


class VehicleTypeSerializer(serializers.ModelSerializer):
    """Serializer for VehicleType"""
    class Meta:
        model = VehicleType
        fields = ['id', 'brand', 'model']
        read_only_fields = ['id']


class DriverProfileSerializer(serializers.ModelSerializer):
    """Serializer for Driver profile"""
    vehicle_type = VehicleTypeSerializer(read_only=True)

    class Meta:
        model = Driver
        fields = ['vehicle_type', 'vehicle_color', 'price_per_trip', 'current_balance', 'is_available', 'total_rides', 'rating']
        read_only_fields = ['current_balance', 'total_rides', 'rating']


class RiderProfileSerializer(serializers.ModelSerializer):
    """Serializer for Rider profile"""
    class Meta:
        model = Rider
        fields = ['total_rides']
        read_only_fields = ['total_rides']


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User with nested profile"""
    driver_profile = DriverProfileSerializer(read_only=True)
    rider_profile = RiderProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'phone_number', 'user_type',
                  'is_active', 'created_at', 'driver_profile', 'rider_profile']
        read_only_fields = ['id', 'created_at', 'is_active']


class DriverRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for Driver registration"""
    password = serializers.CharField(write_only=True, min_length=8, style={'input_type': 'password'})
    password_confirm = serializers.CharField(write_only=True, min_length=8, style={'input_type': 'password'})
    vehicle_type_id = serializers.IntegerField(required=True, write_only=True)
    vehicle_color = serializers.ChoiceField(choices=Driver.COLOR_CHOICES, required=True)

    class Meta:
        model = User
        fields = ['email', 'password', 'password_confirm', 'full_name', 'phone_number', 'vehicle_type_id', 'vehicle_color']

    def validate(self, attrs):
        """Validate that passwords match and vehicle type exists"""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})

        # Validate vehicle type exists
        vehicle_type_id = attrs.get('vehicle_type_id')
        if not VehicleType.objects.filter(id=vehicle_type_id).exists():
            raise serializers.ValidationError({"vehicle_type_id": "Vehicle type does not exist."})

        return attrs

    def create(self, validated_data):
        """Create User and Driver profile"""
        # Extract driver-specific data
        vehicle_type_id = validated_data.pop('vehicle_type_id')
        vehicle_color = validated_data.pop('vehicle_color')
        validated_data.pop('password_confirm')

        # Create user with driver type
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            full_name=validated_data['full_name'],
            phone_number=validated_data.get('phone_number'),
            user_type='driver'
        )

        # Create driver profile
        Driver.objects.create(
            user=user,
            vehicle_type_id=vehicle_type_id,
            vehicle_color=vehicle_color
        )

        return user


class RiderRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for Rider registration"""
    password = serializers.CharField(write_only=True, min_length=8, style={'input_type': 'password'})
    password_confirm = serializers.CharField(write_only=True, min_length=8, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = ['email', 'password', 'password_confirm', 'full_name', 'phone_number']

    def validate(self, attrs):
        """Validate that passwords match"""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        """Create User and Rider profile"""
        validated_data.pop('password_confirm')

        # Create user with rider type
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            full_name=validated_data['full_name'],
            phone_number=validated_data.get('phone_number'),
            user_type='rider'
        )

        # Create rider profile
        Rider.objects.create(user=user)

        return user


class LoginSerializer(serializers.Serializer):
    """Serializer for user login"""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})


class NearbyDriverSerializer(serializers.ModelSerializer):
    """Anonymous driver info for the rider's discovery map: just mode + location.
    No name, rating, vehicle, or price — riders see only an icon (car for
    single-ride, bus for multi) and compute distance client-side."""
    class Meta:
        model = Driver
        fields = ['single_ride_mode', 'is_available', 'current_latitude', 'current_longitude']
        read_only_fields = fields


class DriverListSerializer(serializers.ModelSerializer):
    """Minimal serializer for listing drivers (used in list view)"""
    full_name = serializers.CharField(source='user.full_name', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    vehicle_brand = serializers.CharField(source='vehicle_type.brand', read_only=True)
    vehicle_model = serializers.CharField(source='vehicle_type.model', read_only=True)

    class Meta:
        model = Driver
        fields = [
            'user',  # This is the user ID (primary key)
            'full_name',
            'email',
            'vehicle_brand',
            'vehicle_model',
            'vehicle_color',
            'price_per_trip',
            'is_available',
            'rating',
            'total_rides',
            'current_latitude',
            'current_longitude',
            'location_updated_at'
        ]
        read_only_fields = fields


class DriverDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for retrieving individual driver (used in retrieve view)"""
    user = UserSerializer(read_only=True)
    vehicle_type = VehicleTypeSerializer(read_only=True)

    class Meta:
        model = Driver
        fields = [
            'user',
            'vehicle_type',
            'vehicle_color',
            'price_per_trip',
            'current_balance',
            'is_available',
            'single_ride_mode',
            'total_rides',
            'rating',
            'current_latitude',
            'current_longitude',
            'location_updated_at'
        ]
        read_only_fields = fields


class DriverUpdateSerializer(serializers.ModelSerializer):
    """Serializer for drivers to update their own profile"""
    vehicle_type_id = serializers.IntegerField(required=False, write_only=True)
    vehicle_type = VehicleTypeSerializer(read_only=True)

    class Meta:
        model = Driver
        fields = [
            'vehicle_type_id',
            'vehicle_type',
            'vehicle_color',
            'is_available',
            'single_ride_mode',
        ]
        read_only_fields = ['vehicle_type']

    def validate_vehicle_type_id(self, value):
        """Validate that the vehicle type exists"""
        if not VehicleType.objects.filter(id=value).exists():
            raise serializers.ValidationError("Vehicle type does not exist.")
        return value

    def validate(self, attrs):
        """Validate that driver can't be available without enough balance to cover price per trip"""
        is_available = attrs.get('is_available')

        # If is_available is being set to True, check the balance
        if is_available is True:
            # Check if balance is enough to cover at least one trip
            if self.instance.current_balance < self.instance.price_per_trip:
                raise serializers.ValidationError({
                    "is_available": f"Cannot set availability to true. Current balance ({self.instance.current_balance}) must be at least equal to price per trip ({self.instance.price_per_trip})."
                })

        return attrs

    def update(self, instance, validated_data):
        """Update driver profile - only updates fields that are present in validated_data"""
        # Handle vehicle_type_id if provided
        vehicle_type_id = validated_data.pop('vehicle_type_id', None)
        if vehicle_type_id is not None:
            instance.vehicle_type_id = vehicle_type_id

        # Note: the per-trip fee is NOT charged here. The balance is deducted
        # when the driver ACCEPTS a ride (see accept_ride view). Setting
        # availability only requires enough balance to cover one trip (validated above).

        # Update other fields only if they're in validated_data
        for field, value in validated_data.items():
            setattr(instance, field, value)

        instance.save()
        return instance


class CoordinateField(serializers.DecimalField):
    """A lat/lng field that rounds raw GPS to 6 decimal places BEFORE validation,
    so extra-precision input from phones isn't rejected."""
    def __init__(self, **kwargs):
        kwargs.setdefault('max_digits', 9)
        kwargs.setdefault('decimal_places', 6)
        super().__init__(**kwargs)

    def to_internal_value(self, data):
        try:
            data = Decimal(str(data)).quantize(Decimal('0.000001'), rounding=ROUND_HALF_UP)
        except Exception:
            pass  # let the parent raise a clean validation error
        return super().to_internal_value(data)


class RideRequestSerializer(serializers.ModelSerializer):
    """Serializer for a rider posting a general ride request. Pickup & dropoff
    coordinates are required; the address text labels are optional."""
    pickup_latitude = CoordinateField()
    pickup_longitude = CoordinateField()
    dropoff_latitude = CoordinateField()
    dropoff_longitude = CoordinateField()
    pickup_location = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    dropoff_location = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')

    class Meta:
        model = Ride
        fields = ['pickup_location', 'pickup_latitude', 'pickup_longitude',
                  'dropoff_location', 'dropoff_latitude', 'dropoff_longitude']

    def create(self, validated_data):
        rider = self.context['request'].user.rider_profile
        return Ride.objects.create(rider=rider, status='open', **validated_data)


class RideSerializer(serializers.ModelSerializer):
    """Serializer for viewing ride (request) details."""
    # Name AND phone of each party are shared ONLY once the driver has confirmed
    # the ride — to keep both anonymous and prevent off-app contact before commitment.
    rider_name = serializers.SerializerMethodField()
    rider_phone = serializers.SerializerMethodField()
    driver_name = serializers.SerializerMethodField()
    driver_phone = serializers.SerializerMethodField()
    driver_vehicle = serializers.CharField(source='driver.vehicle_type', read_only=True, default=None)
    driver_vehicle_color = serializers.CharField(source='driver.vehicle_color', read_only=True, default=None)
    driver_single_ride_mode = serializers.BooleanField(source='driver.single_ride_mode', read_only=True, default=None)
    # Driver's live location — shared with the rider only once confirmed.
    driver_latitude = serializers.SerializerMethodField()
    driver_longitude = serializers.SerializerMethodField()
    driver_location_updated_at = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    offers_count = serializers.IntegerField(source='offers.count', read_only=True)

    class Meta:
        model = Ride
        fields = ['id', 'rider', 'driver', 'rider_name', 'rider_phone',
                  'driver_name', 'driver_phone', 'driver_vehicle', 'driver_vehicle_color',
                  'driver_single_ride_mode',
                  'driver_latitude', 'driver_longitude', 'driver_location_updated_at',
                  'status', 'status_display', 'final_price',
                  'pickup_location', 'pickup_latitude', 'pickup_longitude',
                  'dropoff_location', 'dropoff_latitude', 'dropoff_longitude',
                  'offers_count', 'is_hidden', 'created_at']
        read_only_fields = ['id', 'rider', 'driver', 'status', 'final_price', 'created_at']

    def get_rider_name(self, obj):
        return obj.rider.user.full_name if obj.status == 'confirmed' else None

    def get_rider_phone(self, obj):
        return obj.rider.user.phone_number if obj.status == 'confirmed' else None

    def get_driver_name(self, obj):
        if obj.status == 'confirmed' and obj.driver:
            return obj.driver.user.full_name
        return None

    def get_driver_phone(self, obj):
        if obj.status == 'confirmed' and obj.driver:
            return obj.driver.user.phone_number
        return None

    def get_driver_latitude(self, obj):
        return obj.driver.current_latitude if (obj.status == 'confirmed' and obj.driver) else None

    def get_driver_longitude(self, obj):
        return obj.driver.current_longitude if (obj.status == 'confirmed' and obj.driver) else None

    def get_driver_location_updated_at(self, obj):
        return obj.driver.location_updated_at if (obj.status == 'confirmed' and obj.driver) else None


class OfferSerializer(serializers.ModelSerializer):
    """Serializer for a driver's offer on a ride request.
    Driver identity (name/phone) is intentionally NOT exposed here — both parties
    stay anonymous until the ride is confirmed (see RideSerializer). Only rating,
    vehicle, and price are shown to help the rider choose."""
    driver_rating = serializers.DecimalField(source='driver.rating', max_digits=3, decimal_places=2, read_only=True)
    driver_vehicle = serializers.CharField(source='driver.vehicle_type', read_only=True)
    driver_vehicle_color = serializers.CharField(source='driver.vehicle_color', read_only=True)
    driver_single_ride_mode = serializers.BooleanField(source='driver.single_ride_mode', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Offer
        fields = ['id', 'ride', 'driver', 'driver_rating',
                  'driver_vehicle', 'driver_vehicle_color', 'driver_single_ride_mode',
                  'price', 'counter_price',
                  'status', 'status_display', 'created_at', 'updated_at']
        read_only_fields = ['id', 'ride', 'driver', 'status', 'created_at', 'updated_at']
