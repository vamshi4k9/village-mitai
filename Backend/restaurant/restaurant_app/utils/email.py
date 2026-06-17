import os

from restaurant_app.models import NotificationEmail
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException
from django.conf import settings


def send_order_confirmation_email(
    invoice,
    transactions
):
    configuration = sib_api_v3_sdk.Configuration()
    configuration.api_key['api-key'] = settings.BREVO_API_KEY
    api_instance = sib_api_v3_sdk.TransactionalEmailsApi(
        sib_api_v3_sdk.ApiClient(configuration)
    )

    items_html = ""
    address_html = ""
    coupon_html = ""

    if invoice.coupon:
        coupon_html = f"""
        <div class="summary-row">
            <span>Coupon</span>
            <span>{invoice.coupon.code}</span>
        </div>
        """

    if invoice.address:
        address = invoice.address

        maps_link = ""
        if address.latitude and address.longitude:
            maps_link = (
                f"https://maps.google.com/?q="
                f"{address.latitude},{address.longitude}"
            )

        address_html = f"""
        <div class="card">
        <h3 style="margin-top:0;color:#3F2305;">
            Delivery Address
        </h3>

        <table class="info-grid">
            <tr>
                <td><strong>Name</strong></td>
                <td>{address.name}</td>
            </tr>

            <tr>
                <td><strong>Phone</strong></td>
                <td>{address.phone_number}</td>
            </tr>

            <tr>
                <td><strong>Address</strong></td>
                <td>
                    {address.address1}
                    <br>
                    {address.address2 or ""}
                </td>
            </tr>

            <tr>
                <td><strong>Latitude</strong></td>
                <td>{address.latitude or "-"}</td>
            </tr>

            <tr>
                <td><strong>Longitude</strong></td>
                <td>{address.longitude or "-"}</td>
            </tr>

            {
                f'''
                <tr>
                    <td><strong>Map</strong></td>
                    <td>
                        <a href="{maps_link}">
                            Open Location
                        </a>
                    </td>
                </tr>
                '''
                if maps_link else ""
            }
        </table>
    </div>
    """

    for txn in transactions:
        item = txn.item
        effective_price = (
            txn.discounted
            if txn.discounted and txn.discounted > 0
            else txn.item_amount
        )

        items_html += f"""
        <tr>
            <td>
                <strong>{item.name}</strong><br>
                <small style="color:#666;">
                    Category: {item.category.name}
                </small>
            </td>

            <td>
    {txn.quantity} × {txn.weight or '-'}
            </td>

            <td>
                {
                    f'''
                    <span style="text-decoration:line-through;color:#999;">
                        Rs.{txn.item_amount}
                    </span><br>
                    <strong>₹{effective_price}</strong>
                    '''
                    if txn.discounted and txn.discounted > 0
                    else f'Rs.{txn.item_amount}'
                }
            </td>

            <td>
                {txn.quantity}
            </td>

            <td>
                Rs.{effective_price * txn.quantity}
            </td>
        </tr>
        """

    html_content = f"""
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">

<style>

body {{
    margin:0;
    padding:0;
    background:#f7f3ef;
    font-family:Arial, sans-serif;
}}

.wrapper {{
    max-width:850px;
    margin:auto;
    background:white;
}}

.header {{
    background:#3F2305;
    color:white;
    padding:30px;
}}

.header h1 {{
    margin:0;
    font-size:28px;
}}

.header p {{
    margin-top:10px;
    opacity:0.9;
}}

.section {{
    padding:25px;
}}

.card {{
    background:#faf7f4;
    border-left:5px solid #3F2305;
    padding:18px;
    margin-bottom:20px;
    border-radius:8px;
}}

.info-grid {{
    width:100%;
}}

.info-grid td {{
    padding:8px;
}}

table.items {{
    width:100%;
    border-collapse:collapse;
    margin-top:15px;
}}

table.items th {{
    background:#3F2305;
    color:white;
    padding:12px;
    text-align:left;
}}

table.items td {{
    padding:12px;
    border-bottom:1px solid #e5e5e5;
}}

.summary {{
    margin-top:20px;
    background:#faf7f4;
    padding:20px;
    border-radius:8px;
}}

.summary-row {{
    display:flex;
    justify-content:space-between;
    margin-bottom:10px;
}}

.total {{
    font-size:22px;
    font-weight:bold;
    color:#3F2305;
    border-top:2px solid #ddd;
    padding-top:12px;
}}

.footer {{
    background:#f4f4f4;
    padding:15px;
    text-align:center;
    color:#666;
    font-size:12px;
}}

.badge {{
    background:#3F2305;
    color:white;
    padding:6px 12px;
    border-radius:20px;
    font-size:12px;
}}

</style>

</head>

<body>

<div class="wrapper">

    <div class="header">
        <h1>New Order Received</h1>
        <p>A new customer order has been placed and requires processing.</p>
    </div>

    <div class="section">

        <div class="card">

            <h3 style="margin-top:0;color:#3F2305;">
                Order Information
            </h3>

            <table class="info-grid">
                <tr>
                    <td><strong>Order ID</strong></td>
                    <td>#{invoice.id}</td>
                </tr>

                <tr>
                    <td><strong>Payment Mode</strong></td>
                    <td>
                        <span class="badge">
                            {invoice.payment_mode}
                        </span>
                    </td>
                </tr>

                <tr>
                    <td><strong>Order Total</strong></td>
                    <td>₹{invoice.net_amount}</td>
                </tr>
            </table>

        </div>
        {coupon_html}
{address_html}

        <h3 style="color:#3F2305;">
            Ordered Items
        </h3>

        <table class="items">

            <thead>
                <tr>
                    <th>Item</th>
                    <th>Weight</th>
                    <th>Unit Price</th>
                    <th>Qty</th>
                    <th>Total</th>
                </tr>
            </thead>

            <tbody>
                {items_html}
            </tbody>

        </table>

        <div class="summary">
            <div class="summary-row">
                <span>Discount</span>
                <span>₹{invoice.discount}</span>
            </div>

            <div class="summary-row total">
                <span>Grand Total</span>
                <span>₹{invoice.net_amount}</span>
            </div>

        </div>

    </div>
    
    <div class="footer">
        This notification was automatically generated by the ordering system.
    </div>

</div>

</body>
</html>
"""
    recipient_emails = list(
        NotificationEmail.objects.values_list(
            "email",
            flat=True
        )
    )
    send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
        to=[
        {"email": email}
        for email in recipient_emails
    ],
        sender=settings.BREVO_SENDER,
        subject=(
            f"New Order #{invoice.id}"
            f" | {invoice.address.name if invoice.address else 'Guest'}"
            f" | ₹{invoice.net_amount}"
        ),
        html_content=html_content
    )

    try:
        api_instance.send_transac_email(send_smtp_email)
        return True
    except ApiException as e:
        print("Brevo Email Error:", e)
        return False