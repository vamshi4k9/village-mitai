
import "../styles/Privacy.css";

const PrivacyPolicy = () => {
    return (
        <div className="container mt-4 d-flex flex-column align-items-center">

            <h2 className="text-center mb-4 contact">Privacy Policy</h2>

            <p className="text-center w-75">
                <strong>Effective Date:</strong> 2029-12-31
            </p>

            <p className="text-center w-75">
                At <strong>Village Mitai</strong>, we value your trust and are committed
                to protecting your personal information. This Privacy Policy explains how
                we collect, use, and safeguard your data when you visit our website or
                place an order with us.
            </p>

            <div className="policy-wrapper">

                <div className="policy-card">

                    <h5>1. Information We Collect</h5>
                    <p>We may collect the following information:</p>
                    <ul>
                        <li>Name</li>
                        <li>Mobile number</li>
                        <li>Email address</li>
                        <li>Delivery address</li>
                        <li>Order details</li>
                        <li>Feedback and reviews</li>
                        <li>Payment information (processed through secure payment gateways)</li>
                    </ul>

                    <h5 className="mt-4">2. How We Use Your Information</h5>
                    <p>We use your information to:</p>
                    <ul>
                        <li>Process and deliver orders</li>
                        <li>Respond to inquiries</li>
                        <li>Improve our products and services</li>
                        <li>Send order updates</li>
                        <li>Share promotional offers (only if you opt-in)</li>
                    </ul>

                    <p>
                        We do <strong>not sell, rent, or trade</strong> your personal information
                        to third parties.
                    </p>

                    <h5 className="mt-4">3. Payment Security</h5>
                    <p>
                        All online payments are processed through secure third-party payment
                        gateways. We do not store your card or banking details on our servers.
                    </p>

                    <h5 className="mt-4">4. Data Protection</h5>
                    <p>
                        We implement reasonable security measures to protect your personal
                        information from unauthorized access, misuse, or disclosure.
                    </p>

                    <h5 className="mt-4">5. Cookies</h5>
                    <p>
                        Our website may use cookies to improve user experience and analyze
                        website traffic.
                    </p>
                    <p>
                        You may choose to disable cookies through your browser settings.
                    </p>

                    <h5 className="mt-4">6. Third-Party Services</h5>
                    <p>We may use trusted third-party services for:</p>
                    <ul>
                        <li>Payment processing</li>
                        <li>Delivery services</li>
                        <li>Website analytics</li>
                    </ul>

                    <p>
                        These providers only access information necessary to perform their
                        services.
                    </p>

                    <h5 className="mt-4">7. Your Consent</h5>
                    <p>
                        By using our website, you consent to our Privacy Policy.
                    </p>

                </div>
            </div>

        </div>
    );
};

export default PrivacyPolicy;