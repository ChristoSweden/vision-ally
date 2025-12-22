/**
 * VISIONALLY STRIPE WEBHOOK HANDLER (Serverless Template)
 * 
 * Deployment: This can be deployed to Vercel, Netlify, or Firebase Functions.
 * Requirement: npm install stripe
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

exports.handler = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        // 1. Verify that the event came from Stripe
        event = stripe.webhooks.constructEvent(req.rawBody, sig, endpointSecret);
    } catch (err) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // 2. Handle the event types
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;
            const customerEmail = session.customer_details.email;

            // Check what was purchased via metadata or line items
            if (session.mode === 'subscription') {
                console.log(`User ${customerEmail} SUBSCRIBED to PRO.`);
                // TODO: Update your database (e.g. Firebase Firestore)
                // db.users.update({ email: customerEmail, tier: 'pro' });
            } else if (session.mode === 'payment') {
                console.log(`User ${customerEmail} PURCHASED CREDITS.`);
                // db.users.update({ email: customerEmail, credits: credits + 50 });
            }
            break;

        case 'customer.subscription.deleted':
            const subscription = event.data.object;
            console.log(`Subscription DELETED for customer ${subscription.customer}`);
            // TODO: Update database to set user to 'free' tier
            break;

        case 'invoice.payment_failed':
            // Handle failed payment for recurring subscriptions
            const failedInvoice = event.data.object;
            console.log(`Payment FAILED for invoice ${failedInvoice.id}`);
            break;

        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    // 3. Return a 200 response to acknowledge receipt of the event
    res.json({ received: true });
};
