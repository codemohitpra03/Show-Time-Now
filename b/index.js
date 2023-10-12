require('dotenv').config()

const express = require('express');


const axios = require('axios');
const app = express();
var cors=require('cors')
const port = 5000;
const pool = require('./db')

app.use(cors());

app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

// ... (previous code)

app.get('/get-seats/:seatId', async (req, res) => {
  const seatId = req.params.seatId;

  try {
    const client = await pool.connect();
    const result = await client.query('SELECT is_booked FROM seats WHERE seat_id = $1', [seatId]);
    client.release();

    if (result.rows.length === 1) {
      const isBooked = result.rows[0].is_booked;
      res.json({ seatId, isBooked });
    } else {
      res.status(404).json({ message: 'Seat not found' });
    }
  } catch (error) {
    console.error('Error fetching seat status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
app.get('/get-seats', async (req, res) => {
  req.app.set("pm","cus_OeLutAXHPbQGRM")
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM seats');
    client.release();

    const seats = result.rows;
    res.json(seats);
  } catch (error) {
    console.error('Error fetching seats:', error);
    res.status(500).send('An error occurred while fetching seats.');
  }
});










// Define a map to store client references and their corresponding transactions
// const activeTransactions = new Map();
const activeTransactions = {};


app.post('/lock-seats', async (req, res) => {
  const selectedSeats = req.body.selectedSeats;
  const customer_id = req.body.customer_id;
  console.log(selectedSeats);
  console.log(customer_id);

  req.app.set("pm",customer_id)

  // const client = activeTransactions['cus_OeLutAXHPbQGRM'];
  // console.log(client,"the purpose");
  // client.write('event: custom\n');
  // client.write(`data: new custom pm!\n\n`);

  
  

  const client = await pool.connect();
  try {
    await client.query('BEGIN'); // Start the transaction

    const result = await client.query(
      'SELECT * FROM seats WHERE seat_id = ANY($1) FOR UPDATE SKIP LOCKED;',
      [selectedSeats]
    );

    if(result.rows.length===0){
      await client.query('ROLLBACK'); 
      res.status(403).json({ error: 'Selected seats are already booked or locked.' });
    }

    // Update the locked seats as booked
    await client.query(
      'UPDATE seats SET is_booked = true WHERE seat_id = ANY($1)',
      [selectedSeats]
    );

    // Store the client and transaction information
    // activeTransactions.set(client, true);

    // activeTransactions.set(client.processID, client);

    // activeTransactions[client.processID]=client
    // activeTransactions[customer_id]=client
    activeTransactions[customer_id]={
      postgres:client,
      
    }
    
    
    
    
    console.log(activeTransactions);
    // Send the client reference to the frontend
    // console.log(client.processID , "p id");
  



	  //here hit the create checkout api then recieve the reaponse url and send that url
    try {
      // const response = await fetch("http://localhost:8000/create-checkout-session", {
      
      // 	method: "POST",
      // 	body: JSON.stringify({...state}),
      // 	headers: {
      // 		"Content-type": "application/json; charset=UTF-8"
      // 	} 
      // })

      const response = await axios.post('http://localhost:8000/create-checkout-session', {
        // refNum:client.processID 
        
        refNum:customer_id 
      })

      // console.log(response);
      // res.status(200).send({...response.data,clientReference: client.processID });
      res.status(200).send({...response.data,clientReference: customer_id });
      
    } catch (error) {
      //hit the roll back
      res.status(500).send({error});
      console.log(error);
    }

  } catch (error) {
    await client.query('ROLLBACK'); // Rollback the transaction in case of error
    console.error('Error locking seats:', error);
    res.status(500).send('An error occurred while locking seats.');
  }
});


app.get('/expired-session',async (req,res)=>{
	try {
		const response = await axios.get('http://localhost:8000/get-expired-session')
		console.log(response.data);
		res.status(200).send(response.data);
	} catch (error) {
		res.status(500).send({error});
      	console.log(error);
	}
})

app.use(express.static('public'));

// ...

function payEventsHandler(request, response, next) {
  const headers = {
    'Content-Type': 'text/event-stream',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache'
  };
  response.writeHead(200, headers);
  console.log(response,"pay events");
  request.app.set('payment-server',response);

  

  request.on('close', () => {
    console.log(`Connection closed`);
  });
}

app.get('/pay-events', payEventsHandler);

app.get('/events',(request, response, next)=>{
  
  const headers = {
    'Content-Type': 'text/event-stream',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache'
  };

  response.writeHead(200, headers);
  const customer = request.app.get('pm')
  console.log(customer,"this");
  activeTransactions[customer].react = response
  console.log(activeTransactions[customer].react,"setted");
  
  const payment_server = request.app.get('payment-server');
  console.log(payment_server,"this is pay server");
  payment_server.write('event: ready\n');
  const confirmation = `data: ${{event_setup:true}}\n\n`;

  payment_server.write(confirmation);

  //get pay event and use that to emit





  let counter = 0;
  // response.write('event: connected\n');
  // response.write(`data: You are now subscribed!\n`);
  // response.write(`id: ${counter}\n\n`);




    // counter += 1;
//   setInterval(() => {
    // response.write('event: message\n');
//     response.write(`data: ${JSON.stringify({val:counter})}\n`);
//     response.write(`id: ${counter}\n\n`);
//     counter += 1;
// }, 5000);
  // request.on('close', () => response.end('OK'))

})


const sendEvent = (client) =>{
  console.log(client,"event sendng client");
  client.write('event: connected\n');
  
  client.write(`data: ${JSON.stringify({pm:"pm"})}\n\n`)

}

app.post('/complete-transaction', async (req, res) => {
  // const clientReference = req.body.clientReference;
  // const customer_id = req.body.customer_id;
  // console.log(customer_id);
  const payload = req.body;
  const customer_id = payload.charge.customer;
  console.log(payload,"payload");


  const front_client = activeTransactions[customer_id].react;
  // console.log(client,"the purpose");
  front_client.write('event: initiated\n');
  front_client.write(`data: completion initiated\n\n`);






  try {
    // Retrieve the client from the activeTransactions map
    // const client = activeTransactions.get(Number(clientReference));

    // const client = activeTransactions[Number(clientReference)];
    const client = activeTransactions[String(customer_id)].postgres;
    // console.log(activeTransactions);
    // console.log(client);
    
    
    if (!client) {
      // Handle the case when the client is not found (duplicate request or unauthorized)
      res.status(400).json({
        error: 'Client Does not exist',
      });
      return;

      // req.app.set('error_completetion_transaction',{
      //   status:400,
      //   type:"client not there",
      //   desc:"may be booking done"
      // })

      // res.redirect(400,'http://localhost:3000/cancel-new')

    }



    // Commit the transaction using the client's connection
    try {
      await client.query('COMMIT');
      // If the COMMIT is successful, proceed with the rest of the code.
    } catch (commitError) {
      // Handle errors specific to the COMMIT operation
      console.error('Error during COMMIT:', commitError);
      front_client.write('event: commit_error\n');
      front_client.write(`data: ${JSON.stringify({error:'error during commit, rollback initiated'})}\n\n`);
      try {
        await client.query('ROLLBACK');     //WHAT IF THIS FAILS TOO 
      } catch (rollbackError) {
        // Handle errors specific to the ROLLBACK operation
        console.error('Error during ROLLBACK:', rollbackError);
        front_client.write('event: rollback_error\n');
        front_client.write(`data: error during rollback\n\n`);
      }
      throw commitError; // Rethrow the error to trigger the catch block below
    }

    

    // Release the client back to the pool
    client.release();
    
    // Remove the client from the activeTransactions map
    // activeTransactions.delete(clientReference);
    
    // delete activeTransactions[clientReference+""]
    delete activeTransactions[customer_id+""]
    console.log(activeTransactions,"my map");
    
    // req.app.set('success_completion_transaction',{success:'Transaction completed successfully.'})
    
    front_client.write('event: completed\n');
    front_client.write(`data: ${JSON.stringify({
      data:payload.charge
    })}\n\n`);

    res.status(200).send({success:'Transaction completed successfully.'});
    // res.status(200).redirect(302, 'http://localhost:3000/success-new');
    // res.redirect(200,'http://localhost:3000/success-new')

  } catch (error) {
    console.error('Error completing transaction:', error);
    res.status(500).send({error,status:500,text:'An error occurred while completing the transaction.'});
    
  }
});


app.post('/cancel-transaction',async (req,res)=>{
	const clientReference = req.body.clientReference;
  	console.log(clientReference);
	  try {
		// Retrieve the client from the activeTransactions map
		// const client = activeTransactions.get(Number(clientReference));
		const client = activeTransactions[Number(clientReference)];
		console.log(activeTransactions);
		console.log(client);
		
		
		if (!client) {
		  // Handle the case when the client is not found (duplicate request or unauthorized)
		  res.status(400).json({
			error: 'Transaction already canceled or unauthorized request.',
		  });
		  return;
		}
	
	
	
		// Cancel the transaction using the client's connection
		try {
		  await client.query('ROLLBACK');
		  // If the ROLLBACK is successful, proceed with the rest of the code.
		} catch (commitError) {
		  // Handle errors specific to the ROLLBACK operation
		  console.error('Error during ROLLBACK:', rollbackError);
		  throw commitError; // Rethrow the error to trigger the catch block below
		}
	
		// Release the client back to the pool
		client.release();
		
		// Remove the client from the activeTransactions map
		// activeTransactions.delete(clientReference);
		delete activeTransactions[clientReference+""]
		console.log(activeTransactions,"my map");
		res.status(200).send({success:'Transaction canceled successfully.'});
	  } catch (error) {
		console.error('Error canceling transaction:', error);
		res.status(500).send({error,status:500,text:'An error occurred while canceling the transaction.'});
	  }
})



// ... (rest of the code)


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

