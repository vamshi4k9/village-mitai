"""`migrate`, but a change that is already in the database is skipped instead
of stopping the deploy.

MySQL cannot undo table changes, so a migration that fails halfway leaves some
of its columns behind while staying "not applied"; the next `migrate` then
fails on the first column that already exists. Here those statements are
skipped (column / table / index / key already there, or already gone) and
the rest of the migration runs.

Afterwards it fills in what older orders may be missing: an order number, and
the store when there is only one.

Usage: python manage.py migrate_safe   (same arguments as migrate)
"""
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import OperationalError, connection
from django.db.backends.base.schema import BaseDatabaseSchemaEditor

# MySQL errors that mean "this change is already done"
ALREADY_DONE = {
    1050: "table already exists",
    1060: "column already exists",
    1061: "index already exists",
    1091: "column or key already removed",
    1826: "foreign key already exists",
}


class Command(BaseCommand):
    help = "Run migrations, skipping changes that are already in the database."

    def add_arguments(self, parser):
        parser.add_argument("args", nargs="*")
        parser.add_argument("--fake", action="store_true")
        parser.add_argument("--plan", action="store_true")

    def handle(self, *args, **options):
        skipped = []
        original_execute = BaseDatabaseSchemaEditor.execute

        def execute(editor, sql, params=()):
            try:
                return original_execute(editor, sql, params)
            except OperationalError as error:
                code = error.args[0] if error.args else None
                if connection.vendor == "mysql" and code in ALREADY_DONE:
                    skipped.append(f"{ALREADY_DONE[code]}: {str(sql)[:120]}")
                    self.stdout.write(self.style.WARNING(f"  skipped ({ALREADY_DONE[code]})"))
                    return None
                raise

        if not options["plan"]:
            self.fix_shared_tracking_tokens()

        BaseDatabaseSchemaEditor.execute = execute
        try:
            call_command(
                "migrate", *args,
                fake=options["fake"], plan=options["plan"],
                verbosity=options["verbosity"], interactive=False,
            )
        finally:
            BaseDatabaseSchemaEditor.execute = original_execute

        if skipped:
            self.stdout.write(self.style.WARNING(f"{len(skipped)} change(s) were already in the database:"))
            for line in skipped:
                self.stdout.write(f"  - {line}")

        if not options["plan"]:
            self.fill_missing_order_details()

    def fix_shared_tracking_tokens(self, table="restaurant_app_invoice"):
        """Give every order that shares its tracking token with another order
        a token of its own. When the column was first added on the server,
        existing orders all got the same value, which stops the column being
        made unique (and lets one tracking link open other orders). Raw SQL,
        because the table may not match the model yet."""
        import uuid

        with connection.cursor() as cursor:
            tables = connection.introspection.table_names(cursor)
            if table not in tables:
                return
            columns = [c.name for c in connection.introspection.get_table_description(cursor, table)]
            if "tracking_token" not in columns:
                return

            qn = connection.ops.quote_name
            cursor.execute(
                f"SELECT {qn('tracking_token')} FROM {qn(table)} "
                f"WHERE {qn('tracking_token')} IS NOT NULL "
                f"GROUP BY {qn('tracking_token')} HAVING COUNT(*) > 1"
            )
            shared = [row[0] for row in cursor.fetchall()]
            fixed = 0
            for token in shared:
                cursor.execute(
                    f"SELECT {qn('id')} FROM {qn(table)} WHERE {qn('tracking_token')} = %s", [token]
                )
                # every order in the group gets a new token: the shared one
                # may already have been sent to more than one customer
                for (row_id,) in cursor.fetchall():
                    cursor.execute(
                        f"UPDATE {qn(table)} SET {qn('tracking_token')} = %s WHERE {qn('id')} = %s",
                        [uuid.uuid4().hex, row_id],
                    )
                    fixed += 1

        if fixed:
            self.stdout.write(self.style.WARNING(
                f"{fixed} order(s) shared a tracking token and got a new one "
                "(their old tracking links no longer open them)."
            ))

    def fill_missing_order_details(self):
        """Order numbers and stores for orders placed before those existed.
        Safe to run on every deploy: only empty values are filled."""
        from restaurant_app.models import Invoice, StoreLocation, Transaction

        numbered = 0
        for invoice in Invoice.objects.filter(order_number__isnull=True):
            # same random format as new orders (Invoice.next_order_number)
            invoice.order_number = Invoice.next_order_number()
            invoice.save(update_fields=["order_number"])
            numbered += 1

        # orders without a tracking token cannot be opened from a tracking link
        import uuid
        for invoice in Invoice.objects.filter(tracking_token__isnull=True):
            invoice.tracking_token = uuid.uuid4().hex
            invoice.save(update_fields=["tracking_token"])

        stores = list(StoreLocation.objects.all()[:2])
        stored = 0
        if len(stores) == 1:
            stored = Invoice.objects.filter(store__isnull=True).update(store=stores[0])
            Transaction.objects.filter(store__isnull=True).update(store=stores[0])

        self.stdout.write(self.style.SUCCESS(
            f"Older orders: {numbered} given an order number, {stored} linked to the store."
        ))
