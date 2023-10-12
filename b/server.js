// server.js
//
// Use this sample code to handle webhook events in your integration.
//
// 1) Paste this code into a new file (server.js)
//
// 2) Install dependencies
//   npm install stripe
//   npm install express
//
// 3) Run the server on http://localhost:4242
//   node server.js

// The library needs to be configured with your account's secret key.
// Ensure the key is kept out of any version control system you might be using.
const stripe = require('stripe')('sk_test_51NqHYfSCss0aK4zsWsjQfTHHFhZqFC6D3ePr4lR3fahJ9CHjRYXjwb5TosqBx0bmf5BoNB21AxjN3HwX2o5SJpqR00VoGAQ9ys');
const endpointSecret = "whsec_589ec23fa939fd1904d76b685d871b4c3662fbec7ab76b2d8176b0f283ff8ec1";
const express = require('express');
const app = express();


app.post('/webhook', express.raw({type: 'application/json'}), (request, response) => {
  const sig = request.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
  } catch (err) {
    response.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }
//   console.log(event);
  // Handle the event
  switch (event.type) {
    case 'subscription_schedule.canceled':
      const subscriptionScheduleCanceled = event.data.object;
      // Then define and call a function to handle the event subscription_schedule.canceled
      console.log(subscriptionScheduleCanceled);
      break;
    // ... handle other event types
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  response.send();
});

app.listen(4242, () => console.log('Running on port 4242'));