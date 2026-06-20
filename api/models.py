from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.core.validators import RegexValidator
from django.conf import settings


class BaseModel(models.Model):
    """Abstract base model with common fields."""
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(class)s_created"
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(class)s_updated"
    )

    class Meta:
        abstract = True


class UserManager(BaseUserManager):
    """
    Custom user manager for User model with email as username
    """
    def create_user(self, email, password=None, **extra_fields):
        """
        Create and save a regular user with the given email and password
        """
        if not email:
            raise ValueError('The Email field must be set')

        email = self.normalize_email(email)
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        extra_fields.setdefault('is_active', True)

        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        """
        Create and save a superuser with the given email and password
        """
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        # Set default values for required fields if not provided
        extra_fields.setdefault('full_name', 'Admin')
        extra_fields.setdefault('user_type', 'rider')

        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, BaseModel, PermissionsMixin):
    """
    Custom User model with user_type field for riders and drivers
    """
    USER_TYPE_CHOICES = [
        ('driver', 'Driver'),
        ('rider', 'Rider'),
    ]

    user_type = models.CharField(max_length=10, choices=USER_TYPE_CHOICES)
    email = models.EmailField(unique=True, db_index=True)
    phone_number = models.CharField(
        max_length=15,
        blank=True,
        null=True,
        validators=[RegexValidator(
            regex=r'^\+?1?\d{9,15}$',
            message="Phone number must be entered in the format: '+999999999'. Up to 15 digits allowed."
        )]
    )
    full_name = models.CharField(max_length=255)
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    # Set email as the USERNAME_FIELD for authentication
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name', 'user_type']

    # Use custom manager
    objects = UserManager()

    def __str__(self):
        return f"{self.full_name} ({self.email})"

    def get_full_name(self):
        return self.full_name

    def get_short_name(self):
        return self.full_name


class VehicleBrand(models.Model):
    """Vehicle brand (e.g., Toyota, Honda)."""
    name = models.CharField(max_length=50, unique=True, help_text="Brand name, e.g. Toyota")

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class VehicleModel(models.Model):
    """A specific model under a brand (e.g., Camry under Toyota)."""
    brand = models.ForeignKey(VehicleBrand, on_delete=models.CASCADE, related_name='models')
    name = models.CharField(max_length=50, help_text="Model name, e.g. Camry")

    class Meta:
        unique_together = ['brand', 'name']
        ordering = ['brand__name', 'name']

    def __str__(self):
        return f"{self.brand.name} {self.name}"


class Driver(models.Model):
    """
    Driver profile with one-to-one relationship to User
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True, related_name='driver_profile')
    # FK to the specific vehicle model (which knows its brand). Field kept named
    # `vehicle_type` to avoid churn across the API/frontend.
    vehicle_type = models.ForeignKey('VehicleModel', on_delete=models.PROTECT, related_name='drivers')
    # Hex color string, e.g. "#C0C0C0". The frontend renders a swatch palette.
    vehicle_color = models.CharField(max_length=9, default='#FFFFFF', help_text="Vehicle color as hex, e.g. #C0C0C0")
    price_per_trip = models.DecimalField(max_digits=10, decimal_places=2, default=50.00, help_text="Price paid to company per trip")
    current_balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="رصيد الاستقلالات")
    is_available = models.BooleanField(default=False)
    # When True ("one ride at a time"), confirming a ride auto-declines the
    # driver's other hanging offers. When False ("multi"), the app asks first.
    single_ride_mode = models.BooleanField(default=True, help_text="One ride at a time: auto-decline other offers on confirm")
    total_rides = models.PositiveIntegerField(default=0)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    # Internal: number of ratings averaged into `rating` (for correct running
    # average). Not exposed in the API — visibility is gated on total_rides.
    ratings_count = models.PositiveIntegerField(default=0)

    # Location tracking fields
    current_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, help_text="Current latitude coordinate")
    current_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, help_text="Current longitude coordinate")
    location_updated_at = models.DateTimeField(null=True, blank=True, help_text="Last time location was updated")

    class Meta:
        ordering = ['-rating', '-total_rides']
        indexes = [
            # Speeds up the nearby-drivers bounding-box query
            # (WHERE current_latitude BETWEEN .. AND current_longitude BETWEEN ..).
            models.Index(fields=['current_latitude', 'current_longitude'],
                         name='driver_lat_lng_idx'),
        ]

    def __str__(self):
        return f"Driver: {self.user.full_name} - {self.vehicle_type} ({self.vehicle_color})"


class Rider(models.Model):
    """
    Rider profile with one-to-one relationship to User
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True, related_name='rider_profile')
    total_rides = models.PositiveIntegerField(default=0)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    # Internal: number of ratings averaged into `rating` (not exposed in the API).
    ratings_count = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"Rider: {self.user.full_name}"


def apply_rating(profile, score):
    """Fold a new 1-5 `score` into a Driver/Rider profile's running average.
    new_avg = (old_avg * count + score) / (count + 1). Saves rating + ratings_count."""
    from decimal import Decimal, ROUND_HALF_UP
    try:
        score = int(score)
    except (TypeError, ValueError):
        return
    if score < 1 or score > 5:
        return
    count = profile.ratings_count or 0
    old = Decimal(profile.rating or 0)
    new_avg = (old * count + score) / (count + 1)
    profile.rating = new_avg.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    profile.ratings_count = count + 1
    profile.save(update_fields=['rating', 'ratings_count'])


class Ride(models.Model):
    """
    A general ride request posted by a rider and broadcast to nearby drivers.
    Drivers submit Offers; when the rider accepts one, that driver is assigned.
    """
    STATUS_CHOICES = [
        ('open', 'Open'),            # awaiting / collecting driver offers
        ('assigned', 'Assigned'),    # rider accepted an offer; awaiting the driver's confirmation (no fee yet)
        ('confirmed', 'Confirmed'),  # driver confirmed they're coming (fee charged, location + phones shared)
        ('cancelled', 'Cancelled'),  # cancelled by rider (open) or driver (assigned)
    ]

    rider = models.ForeignKey(Rider, on_delete=models.CASCADE, related_name='rides')
    # Driver is unset until the rider accepts an offer.
    driver = models.ForeignKey(Driver, on_delete=models.SET_NULL, null=True, blank=True, related_name='rides')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    final_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Agreed price once assigned")
    # Pickup & dropoff are GPS coordinates; the text labels are optional (human-readable).
    pickup_location = models.CharField(max_length=255, blank=True, default='', help_text="Optional pickup address label")
    pickup_latitude = models.DecimalField(max_digits=9, decimal_places=6)
    pickup_longitude = models.DecimalField(max_digits=9, decimal_places=6)
    dropoff_location = models.CharField(max_length=255, blank=True, default='', help_text="Optional drop-off address label")
    dropoff_latitude = models.DecimalField(max_digits=9, decimal_places=6)
    dropoff_longitude = models.DecimalField(max_digits=9, decimal_places=6)
    is_hidden = models.BooleanField(default=False, help_text="Dismissed from the user's list")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        driver = self.driver.user.full_name if self.driver else 'unassigned'
        price = f"${self.final_price}" if self.final_price is not None else "no agreed price"
        return f"Ride #{self.id}: {self.rider.user.full_name} -> {driver} ({self.status}) - {price}"


class Offer(models.Model):
    """
    A driver's offer on an open ride request. Many offers per ride; the rider
    accepts one (or counters it) to assign a driver.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),      # driver offered, awaiting rider
        ('countered', 'Countered'),  # rider countered with a lower price, awaiting driver
        ('accepted', 'Accepted'),    # accepted -> ride assigned to this driver
        ('declined', 'Declined'),    # declined/withdrawn by either side
    ]

    ride = models.ForeignKey(Ride, on_delete=models.CASCADE, related_name='offers')
    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, related_name='offers')
    price = models.DecimalField(max_digits=10, decimal_places=2, help_text="Current price on the table")
    counter_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Rider's counter price, if any")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['price', 'created_at']
        # One active offer per driver per ride.
        unique_together = ['ride', 'driver']

    def __str__(self):
        return f"Offer #{self.id} on Ride #{self.ride_id} by {self.driver.user.full_name} - ${self.price} ({self.status})"


class RatingRequest(models.Model):
    """
    A pending prompt for the RIDER to rate the DRIVER of a finished ride.
    Created when the driver ends a confirmed ride ("Done, clear"). The rider
    sees not-done requests in their app and can rate (1-5) or ignore — either
    way it becomes is_done so it never re-appears. The score is NOT stored here;
    it's applied directly to the driver's running average on resolve.
    """
    ride = models.ForeignKey(Ride, on_delete=models.CASCADE, related_name='rating_requests')
    rider = models.ForeignKey(Rider, on_delete=models.CASCADE, related_name='rating_requests')
    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, related_name='rating_requests')
    is_done = models.BooleanField(default=False, help_text="Rated or ignored — no longer shown")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        # One rating prompt per ride (a finished ride asks the rider once).
        unique_together = ['ride', 'rider', 'driver']

    def __str__(self):
        state = 'done' if self.is_done else 'pending'
        return f"RatingRequest ride#{self.ride_id}: {self.rider.user.full_name} -> {self.driver.user.full_name} ({state})"


class OTP(models.Model):
    """
    OTP model for email verification during registration and password change
    """
    OTP_TYPE_CHOICES = [
        ('registration', 'Registration'),
        ('password_change', 'Password Change'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='otps')
    otp_code = models.CharField(max_length=6)
    otp_type = models.CharField(max_length=20, choices=OTP_TYPE_CHOICES)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"OTP for {self.user.email} - {self.otp_type} ({'Verified' if self.is_verified else 'Pending'})"
