import math
from datetime import date, timedelta
from decimal import Decimal

import requests
from django.conf import settings
from django.core.cache import cache

from restaurant_app.models import DeliveryCharge, DeliveryFeeConfig, StoreLocation

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
    """Driving distance from the Mapbox Directions API, in km, along the
    fastest route in current traffic (the one a rider would actually take).

    Returns (distance, source) where source is "mapbox" or "straight_line".
    Results are cached for an hour: the same address is checked on every visit
    to checkout and again when the order is placed, and the traffic route
    can change through the day.
    """
    key = f"traffic_km:{lat1:.5f},{lng1:.5f}:{lat2:.5f},{lng2:.5f}"
    cached = cache.get(key)
    if cached is not None:
        return cached, "mapbox"

    try:
        response = requests.get(
            "https://api.mapbox.com/directions/v5/mapbox/driving-traffic/"
            f"{lng1},{lat1};{lng2},{lat2}",
            params={"access_token": settings.MAPBOX_TOKEN, "overview": "false"},
            timeout=6,
        )
        response.raise_for_status()
        routes = response.json().get("routes") or []
        if routes:
            km = routes[0]["distance"] / 1000
            cache.set(key, km, 60 * 60)
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


# road distance is only looked up for this many stores, the nearest in a
# straight line; a road is never shorter than the straight line
ROAD_LOOKUPS = 3


def store_info(store):
    return {
        "store_id": store.id,
        "store_name": store.name,
        "store_address": store.address,
    }


def delivery_quote(latitude, longitude):
    """Which store delivers to these coordinates, how far it is and what it costs.

    The store is the active one nearest by road whose radius covers the
    address. If none covers it, the nearest store is returned with
    deliverable False. Until a store is set up in the admin, everything is
    deliverable at the default charge.
    """
    stores = list(StoreLocation.objects.filter(is_active=True))

    if not stores or latitude is None or longitude is None:
        return {
            "deliverable": True,
            "distance_km": None,
            "delivery_charge": DEFAULT_DELIVERY_CHARGE,
            "max_delivery_km": stores[0].max_delivery_km if stores else None,
            "distance_source": None,
            "store_id": None,
            "store_name": None,
            "store_address": None,
        }

    lat, lng = float(latitude), float(longitude)
    stores.sort(key=lambda st: straight_line_km(st.latitude, st.longitude, lat, lng))

    best = None  # (deliverable, distance, store, source)
    for store in stores[:ROAD_LOOKUPS]:
        distance, source = road_distance_km(store.latitude, store.longitude, lat, lng)
        deliverable = Decimal(str(distance)) <= store.max_delivery_km
        # a store that can deliver beats one that cannot, then the nearer wins
        if best is None or (deliverable, -distance) > (best[0], -best[1]):
            best = (deliverable, distance, store, source)

    deliverable, distance, store, source = best
    return {
        "deliverable": deliverable,
        "distance_km": round(distance, 1),
        "delivery_charge": charge_for_distance(distance) if deliverable else None,
        "max_delivery_km": store.max_delivery_km,
        "distance_source": source,
        **store_info(store),
    }


def delivery_window(items):
    """Earliest and latest delivery date for an order of these items.

    The earliest is today plus the slowest item's delivery_time (days; 0 means
    same day). Customers can schedule up to schedule_days_ahead days after it.
    """
    days = max((item.delivery_time or 0 for item in items), default=0)
    earliest = date.today() + timedelta(days=max(days, 0))

    config = DeliveryFeeConfig.objects.first()
    days_ahead = config.schedule_days_ahead if config else 30
    return earliest, earliest + timedelta(days=days_ahead)


def pick_delivery_date(requested, earliest, latest):
    """The date to save for an order: the requested one, moved into the
    allowed window if needed.

    A date is moved rather than refused because online orders are created
    after payment: a customer who picked the fastest date just before
    midnight must still get an order, just one day later.
    """
    if requested is None:
        return earliest
    return min(max(requested, earliest), latest)

