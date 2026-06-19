from rest_framework import permissions


class IsDriver(permissions.BasePermission):
    """
    Custom permission to only allow users with user_type='driver' to access.
    """
    message = "You must be a driver to access this resource."

    def has_permission(self, request, view):
        # Check if user is authenticated
        if not request.user or not request.user.is_authenticated:
            return False

        # Check if user is a driver
        return request.user.user_type == 'driver'


class IsRider(permissions.BasePermission):
    """
    Custom permission to only allow users with user_type='rider' to access.
    """
    message = "You must be a rider to access this resource."

    def has_permission(self, request, view):
        # Check if user is authenticated
        if not request.user or not request.user.is_authenticated:
            return False

        # Check if user is a rider
        return request.user.user_type == 'rider'


class IsAdminUser(permissions.BasePermission):
    """
    Custom permission to only allow admin users (is_staff=True) to access.
    """
    message = "You must be an admin to access this resource."

    def has_permission(self, request, view):
        # Check if user is authenticated and is staff
        return request.user and request.user.is_authenticated and request.user.is_staff


class IsDriverOrAdmin(permissions.BasePermission):
    """
    Custom permission to allow drivers or admin users to access.
    """
    message = "You must be a driver or admin to access this resource."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        return request.user.user_type == 'driver' or request.user.is_staff


class IsRiderOrAdmin(permissions.BasePermission):
    """
    Custom permission to allow riders or admin users to access.
    """
    message = "You must be a rider or admin to access this resource."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        return request.user.user_type == 'rider' or request.user.is_staff


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object or admin users to access it.
    Requires the object to have a 'user' attribute.
    """
    message = "You must be the owner of this resource or an admin to access it."

    def has_object_permission(self, request, view, obj):
        # Check if user is authenticated
        if not request.user or not request.user.is_authenticated:
            return False

        # Admin users can access everything
        if request.user.is_staff:
            return True

        # Check if the object has a user attribute and if it matches the request user
        if hasattr(obj, 'user'):
            return obj.user == request.user

        # If object itself is a User instance
        if hasattr(obj, 'id') and hasattr(request.user, 'id'):
            return obj.id == request.user.id

        return False
