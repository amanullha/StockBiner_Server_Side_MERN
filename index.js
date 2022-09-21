const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;
require('dotenv').config();
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const jwt = require('jsonwebtoken');

// middleware
app.use(cors());
// help to convert data to json 
app.use(express.json());

// console.log('token: ', process.env.ACCESS_TOKEN_SECRET);
// verify access token 

function verifyJWT(req, res, next) {

    //bearer
    authHeader = req.headers.authorization;

    // if user haven't token/authHeader
    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' })
    }

    const token = authHeader.split(' ')[1];

    // jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {

        // if wrong token has been given by client side
        if (err) {
            return res.status(403).send({ message: "Forbidden access" });
        }

        req.decoded = decoded;

        // will go next if we get error
        next();
    })





}



app.get('/', (req, res) => {
    res.send('running server side for the warehouse(backend)')
})

app.listen(port, () => {
    console.log("listening warehouse(backend) with port :", port);
})



// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}.lda5x.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

// const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


// const uri = "mongodb+srv://<username>:<password>@cluster0.lda5x.mongodb.net/?retryWrites=true&w=majority";
// const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_USER_PASSWORD}@cluster0.3kvplsh.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });



async function run() {
    try {

        await client.connect();

        const phoneCollection = client.db("stockBinderProductsDB").collection("phones");
        const userCollection = client.db("stockBinderUsersDB").collection("users");


        // AUTH

        app.post('/login', async (req, res) => {

            const user = req.body;
            const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' })


            res.send({ accessToken });
        })


        app.post('/add-user', async (req, res) => {

            const user = req.body;
            // console.log("user : ", user);

            const query = { email: user.email }

            const cursor = await userCollection.countDocuments(query);

            console.log("finding user: ", cursor);

            if (cursor === 0) {
                const result = await userCollection.insertOne(user);
                res.send(result);
            }
            else {
                res.send({ user: 'exist' })
            }

        })


        // delete a user by user_id
        app.delete('/delete-user/:_id', async (req, res) => {

            const _id = req.params._id;

            const query = { _id: ObjectId(_id) };

            const result = await userCollection.deleteOne(query);

            res.send(result);

        })

        // get a user by gmail 
        app.get('/get-user/:email', async (req, res) => {

            const email = req.params.email;

            // console.log("gmail: ", email);

            const query = { email: email };

            const cursor = await userCollection.find(query).toArray();

            res.send(cursor)


        })
        // get all the users 
        app.get('/get-users', async (req, res) => {

            const query = {};

            const cursor = await userCollection.find(query).toArray();

            res.send(cursor)


        })

        // make a admin to supper admin by a supper admin
        app.put('/make-supperAdmin', async (req, res) => {


            const updatedUser = req.body;

            // console.log("id: ", updatedUser._id);
            // console.log("updare user : ", updatedUser);

            const filter = { _id: ObjectId(updatedUser._id) };

            const options = { upsert: true };

            const updatedDoc = {
                $set: {
                    rule: updatedUser.rule,
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc, options);

            res.send(result);

        })





        // get total phone count / get the total products
        app.get('/phones-count', async (req, res) => {

            const query = {};

            const phonesCount = await phoneCollection.estimatedDocumentCount();

            res.send({ phonesCount });

        })


        // get all the phone by filtering based on pagination 
        app.get('/phones', async (req, res) => {

            // console.log("query: ", req.query);

            const currentPageNbr = parseInt(req.query.currentPageNbr);
            const totalPhoneInPage = parseInt(req.query.totalPhoneInPage);

            const totalSkipPhones = (currentPageNbr - 1) * totalPhoneInPage;


            const query = {};

            const cursor = phoneCollection.find(query);


            if (currentPageNbr || totalPhoneInPage) {
                // console.log("hello um in ");
                const phones = await cursor.skip(totalSkipPhones).limit(totalPhoneInPage).toArray();
                res.send(phones);
            }
            else {
                const phones = await cursor.toArray();
                res.send(phones);
            }




        })

        // get all the phone based on email
        app.post('/productByEmail', async (req, res) => {

            const { email } = req.body;

            // console.log("in email : ", email);

            const query = { user: email };
            // console.log("query: ", query);

            const cursor = phoneCollection.find(query);
            const phones = await cursor.toArray();

            res.send(phones);




        })




        // get single phone by phone_id
        app.get('/phones/:_id', verifyJWT, async (req, res) => {

            const email = req.headers.email;

            const decodedEmail = req.decoded.email;

            if (email === decodedEmail) {
                const _id = req.params._id;
                // console.log(_id);

                const query = { _id: ObjectId(_id) };

                const cursor = phoneCollection.find(query);
                const phone = await cursor.toArray();

                res.send(phone);
            }
            else {
                return res.status(403).send({ message: "Forbidden access" });
            }




        })

        // update phone quantity and sold items
        app.put('/phones/:_id', async (req, res) => {

            const _id = req.params._id;
            // console.log(_id);

            const updatedPhone = req.body;

            const filter = { _id: ObjectId(_id) };
            const options = { upsert: true };

            const updatedDoc = {
                $set: {
                    quantity: updatedPhone.quantity,
                    soldItems: updatedPhone.soldItems
                }
            }
            const result = await phoneCollection.updateOne(filter, updatedDoc, options);

            res.send(result);



        })


        // Add item to the database
        app.post('/phones', async (req, res) => {

            const newPhone = req.body;
            const result = await phoneCollection.insertOne(newPhone);
            res.send(result);

        })

        // delete a phone by phone_id
        app.delete('/phones/:_id', async (req, res) => {

            const _id = req.params._id;
            // console.log(_id);

            const query = { _id: ObjectId(_id) };

            const result = await phoneCollection.deleteOne(query);

            res.send(result);

        })

    } finally {

    }

}
run().catch(console.dir);

// all api is done