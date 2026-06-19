from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from api.models import Driver, Rider, VehicleBrand, VehicleModel, Ride
from decimal import Decimal

User = get_user_model()


class Command(BaseCommand):
    help = 'Populate database with fake data for testing'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS('Starting to populate fake data...'))

        # Create Vehicle Brands + Models
        self.stdout.write('Creating vehicle brands & models...')
        vehicle_models = []  # flat list, used by drivers below

        catalog = {
            # --- The Market Kings (Top Selling / Most Common) ---
            'Nissan': ['Sunny', 'Sentra', 'Qashqai', 'Juke', 'X-Trail','Other'],
            'Hyundai': ['Verna', 'Elantra', 'Tucson', 'Accent', 'Matrix', 'Creta', 'I10','Other'],
            'Chery': ['Tiggo 3', 'Tiggo 4 Pro', 'Tiggo 7', 'Tiggo 8', 'Arrizo 5', 'Envy', 'Other'],
            'MG': ['MG 5', 'MG ZS', 'MG 6', 'MG RX5', 'MG HS', 'MG GT'],
            
            # --- Japanese Staples ---
            'Toyota': ['Corolla', 'Yaris', 'Hilux', 'Fortuner', 'Belta', 'Rumion','Other'],
            'Mitsubishi': ['Lancer', 'Xpander', 'Eclipse Cross', 'Attrage', 'Mirage','Other'],
            'Suzuki': ['Swift', 'Maruti', 'Alto', 'Ciaz', 'Ertiga', 'Dzire', 'Baleno','Other'],

            # --- Korean Twins ---
            'Kia': ['Cerato', 'Sportage', 'Rio', 'Picanto', 'Carens', 'Xceed','Other'],

            # --- American & Commercial ---
            'Chevrolet': ['Optra', 'Aveo', 'Cruze', 'T-Series', 'Lanos', 'Captiva','Other'], 

            # --- European Mainstays ---
            'Renault': ['Logan', 'Duster', 'Sandero', 'Stepway', 'Megane', 'Kadjar','Other'],
            'Peugeot': ['301', '3008', '5008', '2008', '508','Other'],
            'Fiat': ['Shahin', 'Tipo', '500', 'Punto'],
            'Opel': ['Astra', 'Insignia', 'Corsa', 'Crossland', 'Grandland','Other'],
            'Skoda': ['Octavia', 'Superb', 'Kodiaq', 'A7','Other'],
            'Volkswagen': ['Passat', 'Golf', 'Tiguan', 'Jetta','Other'],
            'Seat': ['Ibiza', 'Leon', 'Ateca', 'Tarraco','Other'],

            # --- Premium Segment ---
            'Mercedes': ['C-Class', 'E-Class', 'A-Class', 'GLC', 'CLA','Other'],
            'BMW': ['3 Series', '5 Series', 'X3', 'X5', '320i','Other'],

            # --- New Chinese Wave (Rapidly growing in Egypt) ---
            'BYD': ['F3', 'Atto 3'],
            'Jetour': ['X70', 'X90 Plus', 'Dashing','Other'],
            'Geely': ['Coolray', 'Emgrand', 'Okavango','Other'],
            'BAIC': ['X35', 'BJ40','Other'],
            'Soueast': ['DX3', 'DX7','Other'],

            # --- Egyptian Classics & Older Used Market ---
            'Daewoo': ['Lanos', 'Nubira','Other'],
            'Lada': ['2107', 'Granta','Other'],
            
            # --- Fallback ---
            'Other': ['Other'],  # global fallback brand
        }

        for brand_name, models in catalog.items():
            brand, _ = VehicleBrand.objects.get_or_create(name=brand_name)
            # Every brand gets an "Other" model for vehicles not in the catalog.
            for model_name in [*models, 'Other']:
                vm, created = VehicleModel.objects.get_or_create(brand=brand, name=model_name)
                vehicle_models.append(vm)
                if created:
                    self.stdout.write(self.style.SUCCESS(f'  [+] Created: {brand_name} {model_name}'))

        # Create Drivers
        self.stdout.write('\nCreating drivers...')

        drivers_data = [
            {
                'email': 'galaluddinowais@gmail.com',
                'password': '123',
                'full_name': 'Galaluddin Owais',
                'phone_number': '+201234567890',
                'vehicle_type': vehicle_models[0],
                'vehicle_color': '#111827',  # black
                'balance': 500.00,
                'is_available': True,
            },
            {
                'email': 'driver2@example.com',
                'password': '123',
                'full_name': 'Ahmed Hassan',
                'phone_number': '+201234567891',
                'vehicle_type': vehicle_models[1],
                'vehicle_color': '#FFFFFF',  # white
                'balance': 300.00,
                'is_available': True,
            },
            {
                'email': 'driver3@example.com',
                'password': '123',
                'full_name': 'Mohamed Ali',
                'phone_number': '+201234567892',
                'vehicle_type': vehicle_models[2],
                'vehicle_color': '#C0C0C0',  # silver
                'balance': 400.00,
                'is_available': False,
            },
        ]

        created_drivers = []
        for driver_data in drivers_data:
            # Check if user already exists
            if User.objects.filter(email=driver_data['email']).exists():
                self.stdout.write(f'  - Driver already exists: {driver_data["email"]}')
                user = User.objects.get(email=driver_data['email'])
                created_drivers.append(user.driver_profile)
                continue

            # Create user
            user = User.objects.create_user(
                email=driver_data['email'],
                password=driver_data['password'],
                full_name=driver_data['full_name'],
                phone_number=driver_data['phone_number'],
                user_type='driver'
            )

            # Create driver profile
            driver = Driver.objects.create(
                user=user,
                vehicle_type=driver_data['vehicle_type'],
                vehicle_color=driver_data['vehicle_color'],
                current_balance=Decimal(str(driver_data['balance'])),
                is_available=driver_data['is_available'],
                rating=Decimal('4.5'),
                total_rides=0
            )
            created_drivers.append(driver)

            self.stdout.write(self.style.SUCCESS(
                f'  [+] Created driver: {driver_data["full_name"]} ({driver_data["email"]})'
            ))

        # Create Rider
        self.stdout.write('\nCreating rider...')

        rider_data = {
            'email': 'leonilandrismessi@gmail.com',
            'password': '123',
            'full_name': 'Leonil Andris Messi',
            'phone_number': '+201234567893',
        }

        # Check if rider already exists
        if User.objects.filter(email=rider_data['email']).exists():
            self.stdout.write(f'  - Rider already exists: {rider_data["email"]}')
            rider_user = User.objects.get(email=rider_data['email'])
            created_rider = rider_user.rider_profile
        else:
            # Create rider user
            rider_user = User.objects.create_user(
                email=rider_data['email'],
                password=rider_data['password'],
                full_name=rider_data['full_name'],
                phone_number=rider_data['phone_number'],
                user_type='rider'
            )

            # Create rider profile
            created_rider = Rider.objects.create(
                user=rider_user,
                total_rides=0
            )

            self.stdout.write(self.style.SUCCESS(
                f'  [+] Created rider: {rider_data["full_name"]} ({rider_data["email"]})'
            ))

        # Create some sample rides
        self.stdout.write('\nCreating sample rides...')

        # Note: a rider may only have ONE open request at a time, so seed just one
        # open request plus one already-assigned ride.
        rides_data = [
            {
                'rider': created_rider,
                'status': 'open',
                'pickup_location': '123 Main St, Cairo',
                'pickup_latitude': Decimal('30.044400'),
                'pickup_longitude': Decimal('31.235700'),
                'dropoff_location': '456 Nile Ave, Cairo',
                'dropoff_latitude': Decimal('30.060000'),
                'dropoff_longitude': Decimal('31.249000'),
            },
            {
                'rider': created_rider,
                'driver': created_drivers[1],
                'status': 'assigned',
                'final_price': Decimal('75.00'),
                'pickup_location': '789 Tahrir Square, Cairo',
                'pickup_latitude': Decimal('30.044200'),
                'pickup_longitude': Decimal('31.235400'),
                'dropoff_location': '321 Zamalek St, Cairo',
                'dropoff_latitude': Decimal('30.065000'),
                'dropoff_longitude': Decimal('31.220000'),
            },
        ]

        for ride_data in rides_data:
            # Check if similar ride already exists (to avoid duplicates on re-run)
            existing_ride = Ride.objects.filter(
                rider=ride_data['rider'],
                pickup_location=ride_data['pickup_location']
            ).first()

            if existing_ride:
                self.stdout.write(f'  - Ride already exists: {ride_data["pickup_location"]} -> {ride_data["dropoff_location"]}')
            else:
                ride = Ride.objects.create(**ride_data)
                self.stdout.write(self.style.SUCCESS(
                    f'  [+] Created ride: {ride_data["pickup_location"]} -> {ride_data["dropoff_location"]} ({ride_data["status"]})'
                ))

        # Summary
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('[SUCCESS] Fake data population completed!'))
        self.stdout.write('='*60)

        self.stdout.write('\n[SUMMARY]:')
        self.stdout.write(f'  - Vehicle Brands: {VehicleBrand.objects.count()}  Models: {VehicleModel.objects.count()}')
        self.stdout.write(f'  - Drivers: {Driver.objects.count()}')
        self.stdout.write(f'  - Riders: {Rider.objects.count()}')
        self.stdout.write(f'  - Rides: {Ride.objects.count()}')

        self.stdout.write('\n[USER CREDENTIALS]:')
        self.stdout.write(self.style.SUCCESS('  DRIVERS:'))
        self.stdout.write('  - Email: galaluddinowais@gmail.com | Password: 123')
        self.stdout.write('  - Email: driver2@example.com | Password: 123')
        self.stdout.write('  - Email: driver3@example.com | Password: 123')

        self.stdout.write(self.style.SUCCESS('\n  RIDER:'))
        self.stdout.write('  - Email: leonilandrismessi@gmail.com | Password: 123')

        self.stdout.write('\n[DRIVER DETAILS]:')
        for i, driver in enumerate(created_drivers, 1):
            self.stdout.write(f'  Driver {i}: {driver.user.full_name}')
            self.stdout.write(f'    - Vehicle: {driver.vehicle_type} ({driver.vehicle_color})')
            self.stdout.write(f'    - Balance: ${driver.current_balance}')
            self.stdout.write(f'    - Available: {"Yes [+]" if driver.is_available else "No [-]"}')
            self.stdout.write(f'    - Rating: {driver.rating} stars')

        self.stdout.write('\n[SUCCESS] You can now login with these credentials!')
        self.stdout.write('='*60 + '\n')
