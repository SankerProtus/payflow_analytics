export const webhooksController = {
    stripe: (req, res) => {
        res.send('Stripe Webhook Received!');
    }
};