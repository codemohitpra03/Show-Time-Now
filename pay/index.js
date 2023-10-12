require('dotenv').config()

const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_API_KEY);
const axios = require('axios');
const EventSource = require('eventsource')
const app = express();
var cors=require('cors')
const port = 8000;
const pool = require('./db')

app.use(cors());
app.use(express.json());
const backend_events = new EventSource('http://localhost:5000/pay-events');

// Messi cus_OeLutAXHPbQGRM
// Ronaldo cus_OhEJMCpJPI2LSP
// Neymar cus_OhEKSg6ceIe85p


app.get('/get-cus', async (req,res)=>{
  console.log(backend_events);
  const customer = await stripe.customers.retrieve(
    'cus_OhEKSg6ceIe85p'
  );
  res.send(customer);
})


app.get('/create', async (req,res)=>{
  const customer = await stripe.customers.create({
    name:"Neymar",
        email:"neymar@gmail.com",
        phone:"1111222233",

        description: 'this is neymar',
  });
      res.send(customer);
})
    



const YOUR_DOMAIN = 'http://localhost:8000';
app.post('/create-checkout-session', async (req, res) => {
  console.log(req.body);
  const customer_id = req.body.refNum
  //add try catch here what if server dwown 
  //roll back
  
  //get product from main server pass to payment and meta
  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        // Provide the exact Price ID (for example, pr_1234) of the product you want to sell
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'T-shirt',
          },
          unit_amount: 2000,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    customer:customer_id,
    metadata:{...req.body},
    // success_url: `${YOUR_DOMAIN}/success`,
    // success_url: `http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}`,
    success_url: `http://localhost:3000/intermediate`,
    // success_url: `http://localhost:5000`,
    // cancel_url: `http://localhost:3000/intermediate`,  can pass the back or cancel flag as true in url to trigger the cancel session
    cancel_url: `${YOUR_DOMAIN}/cancel-session?session_id={CHECKOUT_SESSION_ID}`,
  });
  console.log(session);
  console.log(session.id);
  console.log(session.url);
  console.log(session.customer);
  
  res.send({url:session.url});
});







app.get('/cancel-session', async (req,res)=>{
  console.log(req.query);
  const session = await stripe.checkout.sessions.retrieve(req.query.session_id);

  const deleted_session = await stripe.checkout.sessions.expire(req.query.session_id);
  req.app.set('info', {
    metadata:session.metadata,
    session:deleted_session
  });
  res.redirect('http://localhost:3000/cancel') //redirect to front end cancel
  // that front end will request to backend server to give data that api will hit this down and chain will flow
})

app.get('/get-expired-session',(req,res)=>{
  const info = req.app.get('info');
  console.log(req.app.get('info'));
  res.json({expired_session:info});
})

app.post('/order/success', async (req, res) => {
  console.log(req.body);
  const session = await stripe.checkout.sessions.retrieve(req.body.id);
  console.log(session,"session");
  console.log(session.metadata,"metadata");
  const customer = await stripe.customers.retrieve(session.customer);
  console.log(customer,"get");

//   res.send(`<html><body><h1>Thanks for your order, ${customer.name}!</h1></body></html>`);
  res.send({
    customer_info:customer,
    session_info:session
  })
});


const handleCompletetion = async(charge) =>{
  console.log("in completeion");
    try {


        const response = await axios.post('http://localhost:5000/complete-transaction', {
            charge
        })
        // if(response.status===200){
        //   console.log(response.data);
        //   req.app.set("info",response.data);
          
        // }
        
    } catch (error) {
        // res.redirect(500,'http://localhost:3000')
    }
}



app.post('/webhooks', express.raw({type: 'application/json'}), (request, response) => {
  const event = request.body;
  // console.log(event,"this is event");
  console.log(event.type);

  // handle pay related events activities error with these events 
  // error handling of stripe different from error handling of database
  

  //collective info
  //gather all info needed - charge details , session details

  // let charge;
  // let session;


  // Handle the event
  switch (event.type) {
    case 'charge.captured':
      const chargeCaptured = event.data.object;
      // Then define and call a function to handle the event charge.captured
      break;
    case 'charge.expired':
      const chargeExpired = event.data.object;
      // Then define and call a function to handle the event charge.expired
      break;
    case 'charge.failed':
      const chargeFailed = event.data.object;
      // Then define and call a function to handle the event charge.failed
      break;
    case 'charge.pending':
      const chargePending = event.data.object;
      // Then define and call a function to handle the event charge.pending
      break;
    case 'charge.refunded':
      const chargeRefunded = event.data.object;
      // Then define and call a function to handle the event charge.refunded
      break;
    case 'charge.succeeded':
        const chargeSucceeded = event.data.object;
        console.log(chargeSucceeded,"this is charge succeded");
        // Then define and call a function to handle the event charge.succeeded

        //hit the complete transaction endpoint
        
        backend_events.addEventListener('ready', (event) => {
            console.log('Listener setup successfull');
            console.log(event.data);
            handleCompletetion(chargeSucceeded);
        });



        
        





      break;
    case 'charge.updated':
      const chargeUpdated = event.data.object;
      // Then define and call a function to handle the event charge.updated
      break;
    case 'charge.dispute.closed':
      const chargeDisputeClosed = event.data.object;
      // Then define and call a function to handle the event charge.dispute.closed
      break;
    case 'charge.dispute.created':
      const chargeDisputeCreated = event.data.object;
      // Then define and call a function to handle the event charge.dispute.created
      break;
    case 'charge.dispute.funds_reinstated':
      const chargeDisputeFundsReinstated = event.data.object;
      // Then define and call a function to handle the event charge.dispute.funds_reinstated
      break;
    case 'charge.dispute.funds_withdrawn':
      const chargeDisputeFundsWithdrawn = event.data.object;
      // Then define and call a function to handle the event charge.dispute.funds_withdrawn
      break;
    case 'charge.dispute.updated':
      const chargeDisputeUpdated = event.data.object;
      // Then define and call a function to handle the event charge.dispute.updated
      break;
    case 'charge.refund.updated':
      const chargeRefundUpdated = event.data.object;
      // Then define and call a function to handle the event charge.refund.updated
      break;
    case 'checkout.session.async_payment_failed':
      const checkoutSessionAsyncPaymentFailed = event.data.object;
      // Then define and call a function to handle the event checkout.session.async_payment_failed
      break;
    case 'checkout.session.async_payment_succeeded':
      const checkoutSessionAsyncPaymentSucceeded = event.data.object;
      // Then define and call a function to handle the event checkout.session.async_payment_succeeded
      break;
    case 'checkout.session.completed':
      const checkoutSessionCompleted = event.data.object;
      
      // console.log(checkoutSessionCompleted,"this is an checkout");
      // Then define and call a function to handle the event checkout.session.completed
      //delete this session after succesful payment
      break;
    case 'checkout.session.expired':
      const checkoutSessionExpired = event.data.object;
      // Then define and call a function to handle the event checkout.session.expired
      break;
    case 'customer.created':
      const customerCreated = event.data.object;
      // Then define and call a function to handle the event customer.created
      break;
    case 'customer.deleted':
      const customerDeleted = event.data.object;
      // Then define and call a function to handle the event customer.deleted
      break;
    case 'customer.updated':
      const customerUpdated = event.data.object;
      // Then define and call a function to handle the event customer.updated
      break;
    case 'order.created':
      const orderCreated = event.data.object;
      // Then define and call a function to handle the event order.created
      break;
    case 'payment_intent.amount_capturable_updated':
      const paymentIntentAmountCapturableUpdated = event.data.object;
      // Then define and call a function to handle the event payment_intent.amount_capturable_updated
      break;
    case 'payment_intent.canceled':
      const paymentIntentCanceled = event.data.object;
      // Then define and call a function to handle the event payment_intent.canceled
      break;
    case 'payment_intent.created':
      const paymentIntentCreated = event.data.object;
      // Then define and call a function to handle the event payment_intent.created
      break;
    case 'payment_intent.partially_funded':
      const paymentIntentPartiallyFunded = event.data.object;
      // Then define and call a function to handle the event payment_intent.partially_funded
      break;
    case 'payment_intent.payment_failed':
      const paymentIntentPaymentFailed = event.data.object;
      // Then define and call a function to handle the event payment_intent.payment_failed
      break;
    case 'payment_intent.processing':
      const paymentIntentProcessing = event.data.object;
      // Then define and call a function to handle the event payment_intent.processing
      break;
    case 'payment_intent.requires_action':
      const paymentIntentRequiresAction = event.data.object;
      // Then define and call a function to handle the event payment_intent.requires_action
      break;
    case 'payment_intent.succeeded':
      const paymentIntentSucceeded = event.data.object;
      // Then define and call a function to handle the event payment_intent.succeeded
      break;
    case 'price.created':
      const priceCreated = event.data.object;
      // Then define and call a function to handle the event price.created
      break;
    case 'price.deleted':
      const priceDeleted = event.data.object;
      // Then define and call a function to handle the event price.deleted
      break;
    case 'price.updated':
      const priceUpdated = event.data.object;
      // Then define and call a function to handle the event price.updated
      break;
    case 'refund.created':
      const refundCreated = event.data.object;
      // Then define and call a function to handle the event refund.created
      break;
    case 'refund.updated':
      const refundUpdated = event.data.object;
      // Then define and call a function to handle the event refund.updated
      break;
    // ... handle other event types
    default:
      // console.log(`Unhandled event type ${event.type}`);
  }

  

  // Return a 200 response to acknowledge receipt of the event
  response.send();
});

app.get('/temp',(req,res)=>{
  console.log(req.app.get("info"));
  res.redirect('http://localhost:3000/success-new')
  // res.send({temp:"temp",info:req.app.get("info")})
})
  
app.get('/get-success',(req,res)=>{
  console.log(req.app.get("info"));
  res.send(req.app.get("info"));
})


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

