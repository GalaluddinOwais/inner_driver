from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Driver, Rider, OTP, VehicleBrand, VehicleModel, Ride, Offer


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['phone_number', 'full_name', 'user_type', 'email', 'is_active', 'is_staff', 'created_at']
    list_filter = ['user_type', 'is_active', 'is_staff', 'created_at']
    search_fields = ['phone_number', 'full_name', 'email']
    ordering = ['-created_at']

    fieldsets = (
        (None, {'fields': ('phone_number', 'password')}),
        ('Personal info', {'fields': ('full_name', 'email', 'user_type')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'created_at', 'updated_at')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('phone_number', 'full_name', 'user_type', 'password1', 'password2'),
        }),
    )

    readonly_fields = ['created_at', 'updated_at', 'last_login']


@admin.register(Driver)
class DriverAdmin(admin.ModelAdmin):
    list_display = ['get_full_name', 'get_phone_number', 'vehicle_type', 'vehicle_color',
                    'is_available', 'total_rides', 'rating', 'current_balance']
    list_filter = ['is_available', 'vehicle_type', 'vehicle_color']
    search_fields = ['user__phone_number', 'user__full_name', 'user__email']
    readonly_fields = ['total_rides', 'rating', 'current_balance']

    def get_full_name(self, obj):
        return obj.user.full_name
    get_full_name.short_description = 'Full Name'

    def get_phone_number(self, obj):
        return obj.user.phone_number
    get_phone_number.short_description = 'Phone Number'


@admin.register(Rider)
class RiderAdmin(admin.ModelAdmin):
    list_display = ['get_full_name', 'get_phone_number', 'total_rides']
    search_fields = ['user__phone_number', 'user__full_name', 'user__email']
    readonly_fields = ['total_rides']

    def get_full_name(self, obj):
        return obj.user.full_name
    get_full_name.short_description = 'Full Name'

    def get_phone_number(self, obj):
        return obj.user.phone_number
    get_phone_number.short_description = 'Phone Number'


@admin.register(VehicleBrand)
class VehicleBrandAdmin(admin.ModelAdmin):
    list_display = ['name']
    search_fields = ['name']
    ordering = ['name']


@admin.register(VehicleModel)
class VehicleModelAdmin(admin.ModelAdmin):
    list_display = ['brand', 'name']
    list_filter = ['brand']
    search_fields = ['name', 'brand__name']
    ordering = ['brand__name', 'name']


@admin.register(Ride)
class RideAdmin(admin.ModelAdmin):
    list_display = ['id', 'get_rider_name', 'get_driver_name', 'status',
                    'final_price', 'pickup_location', 'dropoff_location', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['rider__user__full_name', 'driver__user__full_name',
                     'pickup_location', 'dropoff_location']
    readonly_fields = ['created_at']
    ordering = ['-created_at']

    def get_rider_name(self, obj):
        return obj.rider.user.full_name
    get_rider_name.short_description = 'Rider'

    def get_driver_name(self, obj):
        return obj.driver.user.full_name if obj.driver else '—'
    get_driver_name.short_description = 'Driver'


@admin.register(Offer)
class OfferAdmin(admin.ModelAdmin):
    list_display = ['id', 'ride_id', 'get_driver_name', 'price', 'counter_price', 'status', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['driver__user__full_name', 'ride__id']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']

    def get_driver_name(self, obj):
        return obj.driver.user.full_name
    get_driver_name.short_description = 'Driver'


@admin.register(OTP)
class OTPAdmin(admin.ModelAdmin):
    list_display = ['user', 'otp_type', 'otp_code', 'is_verified', 'created_at', 'expires_at']
    list_filter = ['otp_type', 'is_verified', 'created_at']
    search_fields = ['user__email', 'user__full_name', 'otp_code']
    readonly_fields = ['created_at']
    ordering = ['-created_at']
