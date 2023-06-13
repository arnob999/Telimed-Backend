const express = require('express');//express require krlam
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');//mongodb er package ba library destructure kore nilam
const port = 5000;//5000 port a run korche
const cors = require('cors');//front end back end error handling
const app = express();//express initialize krlam variable er naam app dilam....

app.use(cors());

const jwt = require("jsonwebtoken")

require('dotenv').config()
app.use(express.json())//server json akare kaj krar jnno...
app.use(express.urlencoded({ extended: false }));//web a pathanor jnno

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).send('unauthorized access');
    }


    const token = authHeader.split(" ")[1]

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: "forbidden access" })
        }

        req.decoded = decoded;

        next();
    })
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.xgfn0ly.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
//new client nilam.....

// async ektar por ekta run korbe....
async function run() {
    try {
        await client.connect();
        //await database connect howa chara porer line a jabena
        const productsCollection = client.db("telix").collection('products');

        const usersCollection = client.db('telix').collection('users');

        const bookingCollection = client.db('telix').collection('booking');

        const verifyAdmin = async (req, res, next) => {
            const decodedEmail = req.decoded.email;

            const query = { email: decodedEmail };
            const user = await usersCollection.findOne(query);

            if (user?.role !== "admin") {
                return res.status(403).send({ message: "forbidden access" })
            }

            next();
        }


        //generating jwt
        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);

            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: "23h" })

                return res.send({ accessToken: token });
            }
            res.status(403).send({ accessToken: "" })
        });


        // Add Product
        app.post('/addproduct', async (req, res) => {//path,request & response
            const tempdata = req.body;//front end theke j data gulo pathabo tar body....
            const data = { name: tempdata.name, price: tempdata.price, quan: tempdata.quan, img: tempdata.img, desc: tempdata.desc }//object create krlam
            const result = await productsCollection.insertOne(data);//insert krbo
            res.send(result);//result ta pabo
        })
        // Get All products
        app.get('/products', async (req, res) => {
            const querry = {};
            let cursor = productsCollection.find(querry);//userCollection query te diye dbe cursor shbkichute set hoye jabe
            const products = await cursor.toArray();
            res.send(products);
        })
        // Get Single Products
        app.get('/products/:id', async (req, res) => {//specific id
            if (req.params.id && ObjectId.isValid(req.params.id)) {
                const querry = { _id: ObjectId(req.params.id) };//object function er moddhe oi id ta pass koree object id te covert krlam
                const result = await productsCollection.findOne(querry);

                res.send(result);
            } else {
                res.status(400);
                res.send("Not valid id");
            }

        })
        // Update a product
        app.post('/updates', async (req, res) => {
            const id = req.body._id;//id alada krlam
            const newdetails = req.body;
            const querry = { _id: ObjectId(id) };
            const newvalue = { $set: { name: newdetails.name, price: newdetails.price, quan: newdetails.quan, img: newdetails.img, desc: newdetails.desc } };
            const result = await productsCollection.updateOne(querry, newvalue);
            // console.log(newdetails)
            res.send(result);
        })
        // Update quantity
        app.post('/update', async (req, res) => {
            const id = req.body._id;//request er moddhe body er id access

            const newquan = req.body.quan;
            // console.log(newquan);
            // console.log(id);
            const querry = { _id: ObjectId(id) };
            const newvalue = { $set: { quan: newquan } };
            const result = await productsCollection.updateOne(querry, newvalue);
            res.send(result);
        })
        // Delete a product 
        app.post('/products', async (req, res) => {
            // console.log(req.body);
            const querry = { _id: ObjectId(req.body._id) };
            const result = await productsCollection.deleteOne(querry);
            res.send(result);
        })



        //new start
        //user to database
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user)
            res.send(result);
        })


        app.delete("/user/delete/:id", async (req, res) => {

            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };

            const result = await usersCollection.deleteOne(filter);
            res.send(result)
        })



        app.post('/product', async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product)
            res.send(result);
        })

        app.get('/users/verification/:email', async (req, res) => {
            const email = req.params.email
            const query = { email };
            const users = await usersCollection.find(query).toArray();
            res.send(users);
        });

        //validate user as Admin with hook "useAdmin"
        app.get('/users/authorization/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send({ isAuthorized: user.role });
            // res.send(user.role);
        })


        //private route of dashboard for seller,buyer,admin with hook "useDashAuth"
        //role authorization
        app.get('/role/authorization/:role/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const role = req.params.role;
            const query = { email };
            const user = await usersCollection.findOne(query);
            if (user.role === role) {
                res.send({ acknowledge: true })
            }
            else {
                res.send({ acknowledge: false })
            }
        })



        //list of buyer or seller as an admin
        app.get('/users/authorized/:authorization', async (req, res) => {
            const authorization = req.params.authorization;
            const query = { role: authorization }
            const user = await usersCollection.find(query).toArray();
            res.send(user);
        })


        //fetch my product for seller email address
        app.get('/seller/product/:email', async (req, res) => {

            const email = req.params.email;
            const query = { sellerEmail: email }
            const result = await productsCollection.find(query).toArray();
            res.send(result)

        })

        app.delete('/product/delete/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const result = await productsCollection.deleteOne(filter);
            res.send(result)
        })

        //booking reqest to DB
        app.post('/booking', async (req, res) => {
            const booking = req.body;
            const result = await bookingCollection.insertOne(booking)
            res.send(result);
        })
        //fetch booking for buyer
        app.get('/booking/:email', async (req, res) => {

            const email = req.params.email;
            const query = { buyerEmail: email };
            const booking = await bookingCollection.find(query).toArray();
            res.send(booking)
        })

        //fetch booking for buyer
        app.get('/bookingId/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const booking = await bookingCollection.findOne(query);

            res.send(booking)
        })

        app.put('/quantity/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const option = { upsert: true }
            const updateQuantity = { $inc: { quan: -1 } };

            const result = await productsCollection.updateOne(filter, updateQuantity, option);

            res.send(result);
        })



    } finally {

    }
}

run().catch(console.dir);
app.listen(port, () => {
    console.log("Server is working");
})