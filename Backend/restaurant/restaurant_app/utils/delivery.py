import math
from decimal import Decimal

import requests
from django.conf import settings
from django.core.cache import cache

from restaurant_app.models import DeliveryCharge, StoreLocation

# charged when no distance-based charges have been set up in the admin
DEFAULT_DELIVERY_CHARGE = Decimal("40")


def straight_line_km(lat1, lng1, lat2, lng2):
    """Great-circle distance; only used when Mapbox cannot be reached."""
    lat1, lng1, lat2, lng2 = map(math.radians, [lat1, lng1, lat2, lng2])
    a = (
        math.sin((lat2 - lat1) / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin((lng2 - lng1) / 2) ** 2
    )
    return 6371 * 2 * math.asin(math.sqrt(a))


def road_distance_km(lat1, lng1, lat2, lng2):
    """Driving distance from the Mapbox Directions API, in km.

    Returns (distance, source) where source is "mapbox" or "straight_line".
    Results are cached for a day: the same address is checked on every visit
    to checkout and again when the order is placed.
    """
    key = f"road_km:{lat1:.5f},{lng1:.5f}:{lat2:.5f},{lng2:.5f}"
    cached = cache.get(key)
    if cached is not None:
        return cached, "mapbox"

    try:
        response = requests.get(
            "https://api.mapbox.com/directions/v5/mapbox/driving/"
            f"{lng1},{lat1};{lng2},{lat2}",
            params={"access_token": settings.MAPBOX_TOKEN, "overview": "false"},
            timeout=6,
        )
        response.raise_for_status()
        routes = response.json().get("routes") or []
        if routes:
            km = routes[0]["distance"] / 1000
            cache.set(key, km, 60 * 60 * 24)
            return km, "mapbox"
    except Exception as e:
        print(f"Mapbox distance lookup failed: {e}")

    return straight_line_km(lat1, lng1, lat2, lng2), "straight_line"


def charge_for_distance(distance_km):
    """Charge of the first slab that covers the distance. A distance beyond the
    last slab (but still inside the delivery radius) uses the last slab."""
    slabs = list(DeliveryCharge.objects.order_by("up_to_km"))
    if not slabs:
        return DEFAULT_DELIVERY_CHARGE
    for slab in slabs:
        if Decimal(str(distance_km)) <= slab.up_to_km:
            return slab.charge
    return slabs[-1].charge


def delivery_quote(latitude, longitude):
    """Whether we deliver to these coordinates, how far they are and what it costs.

    Until a store location is set up in the admin, everything is deliverable at
    the default charge, exactly as before this feature existed.
    """
    store = StoreLocation.objects.filter(is_active=True).first()

    if store is None or latitude is None or longitude is None:
        return {
            "deliverable": True,
            "distance_km": None,
            "delivery_charge": DEFAULT_DELIVERY_CHARGE,
            "max_delivery_km": store.max_delivery_km if store else None,
            "distance_source": None,
        }

    distance, source = road_distance_km(
        float(store.latitude), float(store.longitude), float(latitude), float(longitude)
    )
    deliverable = Decimal(str(distance)) <= store.max_delivery_km

    return {
        "deliverable": deliverable,
        "distance_km": round(distance, 1),
        "delivery_charge": charge_for_distance(distance) if deliverable else None,
        "max_delivery_km": store.max_delivery_km,
        "distance_source": source,
    }
