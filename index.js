const express = require('express')
const cors = require('cors');
const app = express();
var jwt = require('jsonwebtoken');

const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config()
const port = process.env.PORT || 5000

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.prsjhpn.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


app.use(cors())
app.use(express.json())

function secureUrl(req,res,next){
  // console.log('secureurl');
  const accessHeaders=req?.headers.authorization;
  if(!accessHeaders){
  return res.status(401).send({message:'unauthorized access bro please go back '})
  }
  const realToken=accessHeaders.split(' ')[1];
  // console.log(realToken ,'dekah baki ');
  jwt.verify(realToken, process.env.ACCESS_TOKEN, function(err, decoded) {
    if(err){
     return res.status(403).send({message:'Forbidded access bro'})
    }
    req.decoded=decoded;
    next();
  });
}

async function run(){

  try{
    await client.connect();
    const database=client.db("doctor");
    const appoinmenst=database.collection('appoinments');
    const  dataOfUser=database.collection('dataOfUser');
    const  addDoctors=database.collection('doctorsCollection');
    const  usersInformation=database.collection('usersData');


  //  in case of you want to make a url or api you need to get here 

  app.get('/services',async(req,res)=>{

    const query={};
    const cursor =appoinmenst.find(query).project({name:1});
    const services= await cursor.toArray();
    res.send(services);
  });

  //  updating or adding users information in our own server 

  app.put('/users/:email',async(req,res)=>{
    const email=req.params.email;
    const user=req.body;
    const filter={email:email}
    const options={upsert:true}
    const updateDoc={$set:user}
    const token=jwt.sign({email:email},process.env.ACCESS_TOKEN,{expiresIn:'10h'})
    const result=await usersInformation.updateOne(filter,updateDoc,options);
    if(email){
      res.send({result,accessToken:token});
    }
  })
 
  // check whether he is a admin or not after login  

  app.get('/admin/:email',async(req,res)=>{
    const email=req.params.email;
    // console.log(email,'as a admin checker')
    console.log(email,'admin email')
    const result =await usersInformation.findOne({email:email})
    const isAdmin=result.role=='admin';
    res.send({admin:isAdmin})
    // console.log(admin)
    // console.log(isAdmin,'dekhau ektu kore dekhale ki ba hobe ar ')
  })

  // now making admin the users 
  app.put('/users/admin/:email',secureUrl, async(req,res)=>{
    const email=req.params.email;
    // const user=req.body;
    // console.log(email)
    const requester=req.decoded.email;

    const checkAdmin=await usersInformation.findOne({email:requester});
    if(checkAdmin.role=='admin'){
      const filter={email:email}
      // const options={upsert:true}
      const updateDoc={$set:{role:'admin'}}
      // const token=jwt.sign({email:email},process.env.ACCESS_TOKEN,{expiresIn:'10h'})
      const result=await usersInformation.updateOne(filter,updateDoc);
      
        res.send({result});
    }
    else{
      res.status(401).send({message:'you are not validated '})
    }
    
    
  })

  // filtering data of a every single user based on their email address for dashboard 
//  NOW  we will secure the url with our token by taking it from the client side 
  app.get('/dashboard',secureUrl, async(req,res)=>{
  
    const email=req.query.email;
    const accessToken=req.headers.authorization;
    const decodedEmail=req.decoded.email;
    if(email==decodedEmail){
      const query={email:email}; 
      const appoinmentData=await dataOfUser.find(query).toArray();
      res.send(appoinmentData);
    }
    else{
      res.status(403).send({message:'may Allah bless you '})
    }
    // console.log(accessToken,'ami tqlhahl');
    // console.log(email)
    

  })

  app.post('/doctors',async(req,res)=>{
   
    const information =req.body;
    const result = await addDoctors.insertOne(information);
    res.send(result);

  })

  // fetching the users data only for admin table  
 
  app.get('/allusers',secureUrl, async(req,res)=>{
   
    const result=await usersInformation.find().toArray();
    res.send(result)
    // console.log(result,'fekho ')

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

    const date=req.query.date ;
    // console.log(date,'check kor ')
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