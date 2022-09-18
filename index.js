const express = require('express')
const cors = require('cors');
const app = express();
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config()
const port = 5000

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.prsjhpn.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


app.use(cors())
app.use(express.json())

async function run(){

  try{
    await client.connect();
    const database=client.db("doctor");
    const appoinmenst=database.collection('appoinments');
    const  dataOfUser=database.collection('dataOfUser');


  //  in case of you want to make a url or api you need to get here 

  app.get('/services',async(req,res)=>{

    const query={};
    const cursor =appoinmenst.find(query);
    const services= await cursor.toArray();
    res.send(services);
  })

// getting the person data who have take any appoinment 
app.post('/appoinment',async(req,res)=>{
  const userData=req.body;

  const query={treatment:userData.treatment,date:userData.date,name:userData.name};
  const patient= await dataOfUser.findOne(query);
  if(patient){
    return res.send({success:false})
  }

  const result=await dataOfUser.insertOne(userData)
  res.send({success:true})
  })

// Now another way to delete the booked slots from database

  app.get('/avaiable', async(req,res)=>{

    const date=req.query.date || 'Sep 15, 2022' ;
    // step : 1 : get all the services available their 
    const services= await appoinmenst.find().toArray();
    
    // step:2 --- get the services have been booked that day 
    const query={date:date};
    const bookings=await dataOfUser.find(query).toArray();

    // step :3 -- for each service find bookings for that services 
    services.forEach(service=>{
    // step:4-- find bookings for that service 
      const servicesBookings=bookings.filter(book=>book.treatment===service.name)
      // service.booked=servicsBooking.map(s=>s.appoinmentTime)
      // step:5 -- select slots for the service bookings 
      const bookedSlots =servicesBookings.map(s=>s.appoinmentTime)
      const available =service.slots.filter(slot=> !bookedSlots.includes(slot));
      service.slots=available;

    })
    

    res.send(services)
  }
  )

  }
  finally {

  }

}

run().catch();

app.get('/', (req, res) => {
  res.send('Hello from doctor server account  World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})