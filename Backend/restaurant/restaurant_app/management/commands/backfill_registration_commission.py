"""Works out registration commission for orders placed before it existed.

    python manage.py backfill_registration_commission            # preview
    python manage.py backfill_registration_commission --apply    # save

Only orders without a registration agent are looked at. Each order is matched
to the agent who registered the customer (by email or mobile) before the
order was placed, at the agent's current registration rate and active days.
If the same agent already got coupon commission on the order, only the
higher of the two is kept.
"""
from django.core.management.base import BaseCommand
from django.db import transaction

from restaurant_app.models import Invoice
from restaurant_app.utils.agents import apply_registration_commission, customer_contacts


class Command(BaseCommand):
    help = "Work out registration commission for older orders (preview unless --apply)."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true", help="Save the changes.")

    def handle(self, *args, **options):
        found = 0
        orders = Invoice.objects.filter(registration_agent__isnull=True).select_related("user", "address")
        with transaction.atomic():
            for invoice in orders.iterator():
                emails, phones = customer_contacts(invoice.user, invoice.address)
                apply_registration_commission(invoice, emails, phones, invoice.order_date)
                if not invoice.registration_agent_id:
                    continue
                found += 1
                self.stdout.write(
                    f"{invoice.order_number}: {invoice.registration_agent} "
                    f"{invoice.registration_commission_percent}% = Rs.{invoice.registration_commission}"
                    f" (coupon commission now Rs.{invoice.agent_commission})" if invoice.agent_id else
                    f"{invoice.order_number}: {invoice.registration_agent} "
                    f"{invoice.registration_commission_percent}% = Rs.{invoice.registration_commission}"
                )
                if options["apply"]:
                    invoice.save(update_fields=[
                        "registration_agent", "registration_entry", "registration_commission_percent",
                        "registration_commission_base", "registration_commission", "agent_commission",
                    ])
        verb = "Saved" if options["apply"] else "Would save (run with --apply to save)"
        self.stdout.write(self.style.SUCCESS(f"{verb}: {found} orders"))
