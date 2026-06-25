from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    register_driver,
    register_rider,
    login,
    logout,
    get_current_user,
    update_driver_profile,
    DriverViewSet,
    VehicleBrandViewSet,
    VehicleModelViewSet,
    list_rides,
    hide_ride,
    rate_ride,
    list_pending_ratings,
    resolve_rating,
    request_ride,
    nearby_drivers,
    list_open_requests,
    create_offer,
    list_offers,
    counter_offer,
    accept_offer,
    decline_offer,
    withdraw_offer,
    cancel_ride,
    arrive_ride,
    confirm_ride,
    recharge_balance,
    update_driver_location,
    request_password_change,
    verify_and_change_password,
    request_password_reset,
    verify_password_reset,
    update_user_profile
)

app_name = 'api'

# Router for ViewSets
router = DefaultRouter()
router.register(r'drivers', DriverViewSet, basename='driver')
router.register(r'vehicle-brands', VehicleBrandViewSet, basename='vehicle-brand')
router.register(r'vehicle-models', VehicleModelViewSet, basename='vehicle-model')

urlpatterns = [
    # Registration endpoints
    path('register/driver/', register_driver, name='register_driver'),
    path('register/rider/', register_rider, name='register_rider'),

    # Authentication endpoints
    path('login/', login, name='login'),
    path('logout/', logout, name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Public forgot-password (no auth)
    path('password-reset/request/', request_password_reset, name='request_password_reset'),
    path('password-reset/verify/', verify_password_reset, name='verify_password_reset'),

    # User profile endpoints
    path('user/me/', get_current_user, name='current_user'),
    path('user/profile/', update_user_profile, name='update_user_profile'),
    path('user/password-change/request/', request_password_change, name='request_password_change'),
    path('user/password-change/verify/', verify_and_change_password, name='verify_and_change_password'),
    path('driver/profile/', update_driver_profile, name='driver_profile'),
    path('driver/recharge/', recharge_balance, name='recharge_balance'),
    path('driver/location/', update_driver_location, name='update_driver_location'),

    # Rider discovery
    path('drivers/nearby/', nearby_drivers, name='nearby_drivers'),

    # Ride (request) endpoints
    path('rides/', list_rides, name='list_rides'),
    path('rides/request/', request_ride, name='request_ride'),
    path('rides/open/', list_open_requests, name='list_open_requests'),
    path('rides/<int:ride_id>/hide/', hide_ride, name='hide_ride'),
    path('rides/<int:ride_id>/rate/', rate_ride, name='rate_ride'),
    path('rides/<int:ride_id>/cancel/', cancel_ride, name='cancel_ride'),
    path('rides/<int:ride_id>/arrive/', arrive_ride, name='arrive_ride'),
    # Rating prompts (rider rates driver after the driver ends a confirmed ride)
    path('ratings/pending/', list_pending_ratings, name='list_pending_ratings'),
    path('ratings/<int:rating_id>/resolve/', resolve_rating, name='resolve_rating'),
    path('rides/<int:ride_id>/confirm/', confirm_ride, name='confirm_ride'),
    path('rides/<int:ride_id>/withdraw/', withdraw_offer, name='withdraw_offer'),
    path('rides/<int:ride_id>/offers/', list_offers, name='list_offers'),
    path('rides/<int:ride_id>/offers/create/', create_offer, name='create_offer'),

    # Offer endpoints
    path('offers/<int:offer_id>/counter/', counter_offer, name='counter_offer'),
    path('offers/<int:offer_id>/accept/', accept_offer, name='accept_offer'),
    path('offers/<int:offer_id>/decline/', decline_offer, name='decline_offer'),

    # Include router URLs for ViewSets
    path('', include(router.urls)),
]
