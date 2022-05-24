const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://kibriaHossain:${process.env.DB_PASS}@cluster0.rv53t.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// --------- jwt verify -----------
const verifyJWT = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
  const token = auth.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    } else {
      req.decoded = decoded;
      next();
    }
  });
};

// =========== Database connection ===============
async function run() {
  try {
    await client.connect();
    const toolsCollection = client.db("allTools").collection("tools");
    const reviewCollection = client.db("reviews").collection("review");
    const orderCollection = client.db("orders").collection("order");
    const userCollection = client.db("users").collection("user");

    // ---------- getting tools API --------------
    app.get("/get-tools", async (req, res) => {
      const result = await toolsCollection.find({}).toArray();
      res.send(result);
    });

    app.get("/get-tools/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await toolsCollection.findOne(query);
      res.send(result);
    });

    app.put("/update-tools/:id", async (req, res) => {
      const id = req.params.id;
      const quantity = req.body.quantity;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          minOrQuantity: quantity,
        },
      };
      const result = await toolsCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    app.post("/post-order", async (req, res) => {
      const user = req.body;
      const auth = req.headers.authorization;
      console.log(auth);
      const result = await orderCollection.insertOne(user);
      res.send(result);
    });

    app.get("/get-order", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email === decodedEmail) {
        const query = { email: email };
        const result = await orderCollection.find(query).toArray();
        res.send(result);
      }else{
        res.status(403).send({message:'forbidden'})
      }
    });

    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updatedDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, {
        expiresIn: "1d",
      });

      res.send({ result, token });
    });
  } finally {
  }
}
run().catch((error) => console.log(error));

app.get("/", (req, res) => {
  res.send("Electro-Parts here");
});

app.listen(port, () => {
  console.log("electro-parts are running in port", port);
});
