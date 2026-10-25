"""Finding the agent who registered a customer, and the commission that
agent earns on the customer's orders.

A customer is matched to an agent's registration by email or by mobile
number (last 10 digits), never by username or browser session, so orders
count whichever device or login the customer uses."""
import re
from datetime import timedelta
from decimal import Decimal

from django.db.models import Q

from ..models import AgentCustomerEntry, UserProfile


def normalize_phone(phone):
    """'+91 98765-43210' -> '9876543210'."""
    digits = re.sub(r"\D", "", phone or "")
    return digits[-10:] if len(digits) >= 10 else digits


def customer_contacts(user=None, address=None):
    """Emails and phone numbers that identify the customer of an order."""
    emails, phones = set(), set()
    if user is not None and getattr(user, "is_authenticated", False):
        if user.email:
            emails.add(user.email.strip().lower())
        profile = UserProfile.objects.filter(user=user).first()
        if profile and profile.phone:
            phones.add(normalize_phone(profile.phone))
        for phone in user.addresses.values_list("phone_number", flat=True):
            phones.add(normalize_phone(phone))
    if address is not None and address.phone_number:
        phones.add(normalize_phone(address.phone_number))
    phones.discard("")
    return emails, phones


def contact_filter(emails, phones, email_field, phone_field):
    """Q matching any of the emails (case-insensitive) or phone numbers
    (by their last 10 digits) on the given fields."""
    q = Q(pk__in=[])
    for email in emails:
        q |= Q(**{f"{email_field}__iexact": email})
    for phone in phones:
        if len(phone) == 10:
            q |= Q(**{f"{phone_field}__endswith": phone})
        else:
            q |= Q(**{phone_field: phone})
    return q


def find_registration(emails, phones, at):
    """The earliest agent registration of this customer made before `at`."""
    if not emails and not phones:
        return None
    return (
        AgentCustomerEntry.objects.filter(agent__isnull=False, created_at__lte=at)
        .filter(contact_filter(emails, phones, "customer_email", "customer_phone"))
        .select_related("agent")
        .order_by("created_at")
        .first()
    )


def registration_commission(entry, at, base):
    """(percent, commission) the registering agent earns on an order placed at
    `at` worth `base`, or None when there is nothing to pay (no rate set, or
    the registration is older than the agent's active days)."""
    if entry is None or entry.agent is None:
        return None
    profile = UserProfile.objects.filter(user=entry.agent, role="agent").first()
    if not profile or not profile.registration_commission_percent:
        return None
    days = profile.registration_commission_days
    if days and at > entry.created_at + timedelta(days=days):
        return None
    percent = profile.registration_commission_percent
    return percent, (base * percent / Decimal("100")).quantize(Decimal("0.01"))


def apply_registration_commission(invoice, emails, phones, at):
    """Sets the registration commission fields on `invoice` (not saved).
    When the registering agent also earns coupon commission on this order,
    only the higher of the two is kept; the other becomes 0."""
    entry = find_registration(emails, phones, at)
    base = invoice.agent_commission_base
    if base is None:
        base = max((invoice.items_total or Decimal("0")) - (invoice.discount or Decimal("0")), Decimal("0"))
    result = registration_commission(entry, at, base)
    if result is None:
        return
    percent, amount = result
    invoice.registration_agent = entry.agent
    invoice.registration_entry = entry
    invoice.registration_commission_percent = percent
    invoice.registration_commission_base = base
    invoice.registration_commission = amount

    if invoice.agent_id and invoice.agent_id == entry.agent_id:
        coupon_amount = invoice.agent_commission or Decimal("0")
        if amount > coupon_amount:
            invoice.agent_commission = Decimal("0")
        else:
            invoice.registration_commission = Decimal("0")
