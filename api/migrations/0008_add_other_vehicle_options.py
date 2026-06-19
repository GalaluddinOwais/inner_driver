# Adds an "Other" model under every brand, plus a global "Other" brand (with an
# "Other" model), so drivers whose brand/model isn't in the catalog can still register.

from django.db import migrations


def add_other_options(apps, schema_editor):
    VehicleBrand = apps.get_model('api', 'VehicleBrand')
    VehicleModel = apps.get_model('api', 'VehicleModel')

    # An "Other" model for each existing brand.
    for brand in VehicleBrand.objects.all():
        VehicleModel.objects.get_or_create(brand=brand, name='Other')

    # A global "Other" brand with its own "Other" model.
    other_brand, _ = VehicleBrand.objects.get_or_create(name='Other')
    VehicleModel.objects.get_or_create(brand=other_brand, name='Other')


def remove_other_options(apps, schema_editor):
    VehicleModel = apps.get_model('api', 'VehicleModel')
    VehicleBrand = apps.get_model('api', 'VehicleBrand')
    # Only remove "Other" models that no driver is using (PROTECT would block anyway).
    VehicleModel.objects.filter(name='Other', drivers__isnull=True).delete()
    VehicleBrand.objects.filter(name='Other', models__isnull=True).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0007_vehiclebrand_alter_driver_vehicle_color_vehiclemodel_and_more'),
    ]

    operations = [
        migrations.RunPython(add_other_options, remove_other_options),
    ]
