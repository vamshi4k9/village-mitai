"""New-order email to the shop's notification addresses.

Shows the order as the customer saw it at checkout: items at MRP and offer
price, item discount, coupon, delivery and packing, plus when the order was
placed, how and when it is to be delivered, and which store sends it.
Built from tables with inline styles, which is what email apps display reliably.
"""
from decimal import Decimal
from html import escape

import sib_api_v3_sdk
from django.conf import settings
from django.utils import timezone
from sib_api_v3_sdk.rest import ApiException

from restaurant_app.models import NotificationEmail

SITE_URL = getattr(settings, "SITE_URL", "https://villagemitai.com").rstrip("/")

# site theme (same colours as the checkout page)
BROWN = "#3F2305"
TEXT = "#5e4632"
MUTED = "#7b7167"
BORDER = "#d8cfc4"
CARD = "#f9f9f9"
PAGE = "#f4f2f1"
GREEN = "#1e6331"

COUPON_TYPES = {"percent": "Percent off", "fixed": "Fixed amount off", "bogo": "Buy X Get Y Free"}
PAYMENT_LABELS = {"CASH": "Cash on Delivery", "UPI": "Paid online (UPI)", "CARD": "Card", "ONLINE": "Paid online"}


def rs(amount):
    return f"Rs.{Decimal(amount or 0):.2f}"


def format_weight(weight):
    """'250' -> '250 g', '1000' -> '1 KG'; anything else is shown as stored."""
    try:
        grams = int(weight)
    except (TypeError, ValueError):
        return weight or "-"
    return f"{grams / 1000:g} KG" if grams >= 1000 else f"{grams} g"


def describe_quantity(txn):
    """How a line was bought: by the piece or by weight, and how much."""
    if txn.weight == "piece":
        count = f"{txn.quantity} {'piece' if txn.quantity == 1 else 'pieces'}"
        each = f" ({txn.item.piece_weight} g each)" if txn.item.piece_weight else ""
        return f"By piece: {count}{each}"
    return f"By weight: {format_weight(txn.weight)} &times; {txn.quantity}"


def local_time(value):
    if value is None:
        return "-"
    if timezone.is_aware(value):
        value = timezone.localtime(value)
    return value.strftime("%a, %d %b %Y, %I:%M %p")


def info_row(label, value):
    return (
        f'<tr><td style="padding:6px 0;color:{MUTED};width:38%;vertical-align:top;">{label}</td>'
        f'<td style="padding:6px 0;color:{BROWN};font-weight:600;vertical-align:top;">{value}</td></tr>'
    )


def card(title, body):
    return f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
           style="background:{CARD};border:1px solid {BORDER};border-radius:6px;margin:0 0 14px;">
      <tr><td style="padding:14px 16px;">
        <div style="font-size:16px;font-weight:600;color:{BROWN};margin:0 0 8px;">{title}</div>
        {body}
      </td></tr>
    </table>"""


def summary_row(label, value, color=TEXT, bold=False, top_border=False):
    border = f"border-top:1px solid {BORDER};" if top_border else ""
    weight = "font-weight:700;font-size:17px;" if bold else ""
    return (
        f'<tr><td style="padding:5px 0;color:{color};{border}{weight}">{label}</td>'
        f'<td align="right" style="padding:5px 0;color:{color};{border}{weight}">{value}</td></tr>'
    )


def agent_name(user):
    return escape(user.get_full_name() or user.username)


def build_agent_commission(invoice):
    """Card with what agents earn on this order: coupon commission (the
    coupon's agent) and registration commission (the agent who registered
    the customer), each with its rate and the amount it is worked out on.
    Empty when no agent earns anything on the order."""
    rows = []
    total = Decimal("0")
    same_agent = invoice.agent_id and invoice.agent_id == invoice.registration_agent_id

    if invoice.agent_id:
        amount = invoice.agent_commission or Decimal("0")
        value = (
            f"{rs(amount)}"
            f'<br><span style="font-weight:400;color:{MUTED};">'
            f"{agent_name(invoice.agent)} &middot; {invoice.agent_commission_percent or 0}% "
            f"of {rs(invoice.agent_commission_base)} (coupon {escape(invoice.coupon_code or '-')})</span>"
        )
        if same_agent and not amount:
            value += f'<br><span style="font-weight:400;color:{MUTED};">Not paid: registration commission is higher</span>'
        rows.append(info_row("Coupon commission", value))
        total += amount

    if invoice.registration_agent_id:
        amount = invoice.registration_commission or Decimal("0")
        entry = invoice.registration_entry
        registered = f", registered {entry.created_at.strftime('%d %b %Y')}" if entry else ""
        value = (
            f"{rs(amount)}"
            f'<br><span style="font-weight:400;color:{MUTED};">'
            f"{agent_name(invoice.registration_agent)} &middot; {invoice.registration_commission_percent or 0}% "
            f"of {rs(invoice.registration_commission_base)}{registered}</span>"
        )
        if same_agent and not amount:
            value += f'<br><span style="font-weight:400;color:{MUTED};">Not paid: coupon commission is higher</span>'
        rows.append(info_row("Registration commission", value))
        total += amount

    if not rows:
        return ""
    rows.append(
        f'<tr><td style="padding:8px 0 2px;color:{BROWN};font-weight:700;border-top:1px solid {BORDER};">'
        f"Total agent commission</td>"
        f'<td style="padding:8px 0 2px;color:{BROWN};font-weight:700;border-top:1px solid {BORDER};">'
        f"{rs(total)}</td></tr>"
    )
    return card("Agent Commission", f'<table role="presentation" width="100%">{"".join(rows)}</table>')


def build_order_email(invoice, transactions):
    """(subject, html) of the new-order email."""
    order_no = invoice.order_number or f"#{invoice.id}"
    tracking_url = f"{SITE_URL}/order_status?order={invoice.order_number or invoice.id}&token={invoice.tracking_token}"
    catalogue_url = f"{SITE_URL}/catalogue"

    # ---- order details
    if invoice.delivery_date:
        delivery_date = invoice.delivery_date.strftime("%a, %d %b %Y")
    else:
        delivery_date = "Fastest available"
    delivery_type = "Scheduled by customer" if invoice.is_scheduled else "Fastest delivery"

    store_html = "-"
    if invoice.store:
        store_html = escape(invoice.store.name)
        if invoice.store.address:
            store_html += f'<br><span style="font-weight:400;color:{MUTED};">{escape(invoice.store.address)}</span>'

    order_rows = "".join([
        info_row("Order number", escape(order_no)),
        info_row("Ordered on", local_time(invoice.order_date)),
        info_row("Payment", escape(PAYMENT_LABELS.get(invoice.payment_mode, invoice.payment_mode or "-"))),
        info_row("Delivery type", delivery_type),
        info_row("Delivery date", delivery_date),
        info_row("Store (pick up from)", store_html),
    ])

    # ---- coupon
    coupon_html = ""
    coupon_code = invoice.coupon_code or (invoice.coupon.code if invoice.coupon else "")
    if coupon_code:
        coupon_type = invoice.coupon_type or (invoice.coupon.discount_type if invoice.coupon else "")
        rows = [
            info_row("Code", escape(coupon_code)),
            info_row("Type", COUPON_TYPES.get(coupon_type, coupon_type or "-")),
            info_row("Discount", f'<span style="color:{GREEN};">- {rs(invoice.discount)}</span>'),
        ]
        if invoice.coupon and invoice.coupon.delivery_rule != "normal":
            rows.append(info_row("Delivery with this coupon", invoice.coupon.get_delivery_rule_display()))
        coupon_html = card("Coupon Applied", f'<table role="presentation" width="100%">{"".join(rows)}</table>')

    # ---- agent commission (coupon and registration)
    agent_html = build_agent_commission(invoice)

    # ---- customer
    address_html = ""
    if invoice.address:
        a = invoice.address
        lines = escape(a.address1 or "")
        if a.address2:
            lines += "<br>" + escape(a.address2)
        rows = [
            info_row("Name", escape(a.name or "-")),
            info_row("Phone", f'<a href="tel:{escape(a.phone_number or "")}" style="color:{BROWN};">{escape(a.phone_number or "-")}</a>'),
            info_row("Address", lines or "-"),
        ]
        if a.latitude and a.longitude:
            maps = f"https://www.google.com/maps/dir/?api=1&destination={a.latitude},{a.longitude}"
            if invoice.store:
                maps += f"&origin={invoice.store.latitude},{invoice.store.longitude}"
            rows.append(info_row("Map", f'<a href="{maps}" style="color:{BROWN};">Open route from the store</a>'))
        address_html = card("Delivery Address", f'<table role="presentation" width="100%">{"".join(rows)}</table>')

    # ---- items, with the prices saved at checkout
    item_rows = ""
    mrp_total = Decimal("0")
    selling_total = Decimal("0")
    item_count = 0
    for txn in transactions:
        qty = txn.quantity
        selling = txn.item_amount * qty
        mrp_unit = txn.mrp_price if txn.mrp_price is not None else txn.item_amount
        mrp = mrp_unit * qty
        mrp_total += mrp
        selling_total += selling
        item_count += qty

        notes = []
        if txn.free_quantity:
            notes.append(f"{txn.free_quantity} free (offer)")
        elif txn.coupon_discount:
            notes.append(f"Coupon - {rs(txn.coupon_discount)}")
        note_html = (
            f'<br><span style="color:{GREEN};font-size:12px;">{"; ".join(notes)}</span>' if notes else ""
        )
        old_html = (
            f'<span style="color:#9a8f84;text-decoration:line-through;font-size:12px;">{rs(mrp)}</span><br>'
            if mrp > selling else ""
        )
        item_rows += f"""
        <tr>
          <td style="padding:10px 8px;border-bottom:1px solid {BORDER};color:{BROWN};">
            <strong>{escape(txn.item.name)}</strong><br>
            <span style="color:{MUTED};font-size:12px;">{describe_quantity(txn)}</span>
          </td>
          <td align="right" style="padding:10px 8px;border-bottom:1px solid {BORDER};color:{BROWN};white-space:nowrap;">
            {old_html}<strong>{rs(selling)}</strong>{note_html}
          </td>
        </tr>"""

    # ---- totals: saved breakdown, or worked out from the lines for older orders
    if invoice.items_mrp_total is not None:
        mrp_total = invoice.items_mrp_total
        item_discount = invoice.item_discount or Decimal("0")
    else:
        item_discount = max(mrp_total - selling_total, Decimal("0"))
    coupon = invoice.discount or Decimal("0")

    summary = [summary_row(f"Items ({item_count})", rs(mrp_total))]
    if item_discount > 0:
        summary.append(summary_row("Item Discount", f"- {rs(item_discount)}", GREEN))
    if coupon > 0:
        summary.append(summary_row(f"Coupon Discount ({escape(coupon_code)})", f"- {rs(coupon)}", GREEN))
    if invoice.delivery_charge is not None:
        summary.append(summary_row(
            "Delivery Charges",
            rs(invoice.delivery_charge) if invoice.delivery_charge > 0 else f'<span style="color:{GREEN};">FREE</span>',
        ))
    if invoice.packing_charge is not None:
        summary.append(summary_row(
            "Packing &amp; Handling",
            rs(invoice.packing_charge) if invoice.packing_charge > 0 else f'<span style="color:{GREEN};">FREE</span>',
        ))
    summary.append(summary_row("Total", rs(invoice.net_amount), BROWN, bold=True, top_border=True))

    button = (
        f'display:inline-block;padding:10px 16px;border-radius:6px;font-weight:600;'
        f'font-size:14px;text-decoration:none;'
    )

    html_content = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:{PAGE};font-family:Arial,Helvetica,sans-serif;color:{TEXT};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{PAGE};">
<tr><td align="center" style="padding:20px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;">

  <tr><td style="background:{BROWN};color:#f9f9f9;padding:20px 22px;border-radius:6px 6px 0 0;">
    <div style="font-size:22px;font-weight:700;">New Order {escape(order_no)}</div>
    <div style="font-size:14px;opacity:0.9;margin-top:6px;">
      {rs(invoice.net_amount)} &middot; {local_time(invoice.order_date)}
    </div>
  </td></tr>

  <tr><td style="background:#ffffff;padding:18px 16px;border:1px solid {BORDER};border-top:none;border-radius:0 0 6px 6px;">

    {card("Order Details", f'<table role="presentation" width="100%">{order_rows}</table>')}
    {coupon_html}
    {address_html}

    <div style="font-size:16px;font-weight:600;color:{BROWN};margin:4px 0 8px;">Ordered Items</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
           style="border:1px solid {BORDER};border-radius:6px;margin:0 0 14px;">
      <tr>
        <th align="left" style="background:{BROWN};color:#f9f9f9;padding:10px 8px;font-size:13px;">Item</th>
        <th align="right" style="background:{BROWN};color:#f9f9f9;padding:10px 8px;font-size:13px;">Price</th>
      </tr>
      {item_rows}
    </table>

    {card("Price Summary", f'<table role="presentation" width="100%" cellpadding="0" cellspacing="0">{"".join(summary)}</table>')}
    {agent_html}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:6px;">
      <tr><td align="center" style="padding:4px;">
        <a href="{catalogue_url}" style="{button}background:{BROWN};color:#f9f9f9;">Open Catalogue</a>
        &nbsp;
        <a href="{tracking_url}" style="{button}background:#ebe5df;color:{BROWN};">Track Order</a>
      </td></tr>
      <tr><td align="center" style="padding:10px 4px 0;font-size:12px;color:{MUTED};">
        Catalogue: <a href="{catalogue_url}" style="color:{BROWN};">{catalogue_url}</a>
      </td></tr>
    </table>

  </td></tr>

  <tr><td align="center" style="padding:14px;font-size:12px;color:{MUTED};">
    Sent automatically by the Village Mitai ordering system.
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>"""

    who = invoice.address.name if invoice.address else "Guest"
    store = f" | {invoice.store.name}" if invoice.store else ""
    subject = f"New Order {order_no} | {who} | {rs(invoice.net_amount)}{store}"
    return subject, html_content


def send_order_confirmation_email(invoice, transactions):
    subject, html_content = build_order_email(invoice, transactions)

    recipient_emails = list(NotificationEmail.objects.values_list("email", flat=True))
    if not recipient_emails:
        print("No notification emails set up; order email not sent")
        return False

    configuration = sib_api_v3_sdk.Configuration()
    configuration.api_key["api-key"] = settings.BREVO_API_KEY
    api_instance = sib_api_v3_sdk.TransactionalEmailsApi(sib_api_v3_sdk.ApiClient(configuration))

    send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
        to=[{"email": email} for email in recipient_emails],
        sender=settings.BREVO_SENDER,
        subject=subject,
        html_content=html_content,
    )

    try:
        api_instance.send_transac_email(send_smtp_email)
        return True
    except ApiException as e:
        print("Brevo Email Error:", e)
        return False
