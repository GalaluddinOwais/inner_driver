# Splits VehicleType (brand+model on one table) into VehicleBrand + VehicleModel,
# re-points Driver.vehicle_type at VehicleModel, and converts vehicle_color from
# named slugs to hex. Order matters: create new tables, copy data + re-point
# drivers, THEN drop the old table — so no driver→vehicle link is lost.

import django.db.models.deletion
from django.db import migrations, models


# Map the old named colors to hex so existing drivers keep a sensible color.
COLOR_NAME_TO_HEX = {
    'black': '#111827',
    'white': '#FFFFFF',
    'silver': '#C0C0C0',
    'gray': '#6B7280',
    'grey': '#6B7280',
    'red': '#DC2626',
    'blue': '#2563EB',
    'green': '#16A34A',
    'yellow': '#FACC15',
    'other': '#9CA3AF',
}


def migrate_vehicles_forward(apps, schema_editor):
    VehicleType = apps.get_model('api', 'VehicleType')
    VehicleBrand = apps.get_model('api', 'VehicleBrand')
    VehicleModel = apps.get_model('api', 'VehicleModel')
    Driver = apps.get_model('api', 'Driver')

    # Build VehicleModel (with its brand) from each old VehicleType row, keeping
    # a map old_vehicletype_id -> new_vehiclemodel so we can re-point drivers.
    old_to_new = {}
    for vt in VehicleType.objects.all():
        brand, _ = VehicleBrand.objects.get_or_create(name=vt.brand)
        vm, _ = VehicleModel.objects.get_or_create(brand=brand, name=vt.model)
        old_to_new[vt.id] = vm.id

    # Re-point each driver. At this point Driver.vehicle_type_id still holds the
    # OLD VehicleType id (column not yet altered), so translate via the map.
    for driver in Driver.objects.all():
        new_id = old_to_new.get(driver.vehicle_type_id)
        if new_id is not None:
            driver.vehicle_type_id = new_id
        # Convert color slug -> hex (leave already-hex values untouched).
        color = (driver.vehicle_color or '').strip()
        if not color.startswith('#'):
            driver.vehicle_color = COLOR_NAME_TO_HEX.get(color.lower(), '#FFFFFF')
        driver.save(update_fields=['vehicle_type', 'vehicle_color'])


def migrate_vehicles_backward(apps, schema_editor):
    # Best-effort reverse: recreate VehicleType rows from models and re-point.
    VehicleType = apps.get_model('api', 'VehicleType')
    VehicleModel = apps.get_model('api', 'VehicleModel')
    Driver = apps.get_model('api', 'Driver')
    new_to_old = {}
    for vm in VehicleModel.objects.select_related('brand').all():
        vt, _ = VehicleType.objects.get_or_create(brand=vm.brand.name, model=vm.name)
        new_to_old[vm.id] = vt.id
    for driver in Driver.objects.all():
        old_id = new_to_old.get(driver.vehicle_type_id)
        if old_id is not None:
            driver.vehicle_type_id = old_id
            driver.save(update_fields=['vehicle_type'])


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0006_remove_ride_offered_price'),
    ]

    operations = [
        # 1. Create the new tables.
        migrations.CreateModel(
            name='VehicleBrand',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='Brand name, e.g. Toyota', max_length=50, unique=True)),
            ],
            options={'ordering': ['name']},
        ),
        migrations.CreateModel(
            name='VehicleModel',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='Model name, e.g. Camry', max_length=50)),
                ('brand', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='models', to='api.vehiclebrand')),
            ],
            options={'ordering': ['brand__name', 'name'], 'unique_together': {('brand', 'name')}},
        ),
        # 2. Widen vehicle_color (still slugs at this point; data migration converts).
        migrations.AlterField(
            model_name='driver',
            name='vehicle_color',
            field=models.CharField(default='#FFFFFF', help_text='Vehicle color as hex, e.g. #C0C0C0', max_length=9),
        ),
        # 3. Copy data + re-point drivers + convert colors (while vehicle_type still
        #    references the old VehicleType ids).
        migrations.RunPython(migrate_vehicles_forward, migrate_vehicles_backward),
        # 4. Now switch the FK target to VehicleModel and drop the old table.
        migrations.AlterField(
            model_name='driver',
            name='vehicle_type',
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='drivers', to='api.vehiclemodel'),
        ),
        migrations.DeleteModel(name='VehicleType'),
    ]
