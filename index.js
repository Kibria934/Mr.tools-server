const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_SECRET);
const app = express();

app.use(cors());
app.use(express.json());

// --------------- DB INFORMATION ------------
const uri = `mongodb+srv://kibriaHossain:${process.env.DB_PASS}@cluster0.rv53t.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// --------- jwt verify -----------===
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
    const paymentCollection = client.db("payments").collection("payment");
    const profileCollection = client.db("UserProfile").collection("profile");

    //  ------------- verifyAdmin -------------
    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({
        email: requester,
      });
      if (requesterAccount.rol === "admin") {
        next();
      } else {
        res.status(403).send({ message: "forbidden" });
      }
    };

    // ---------- TOOLS API --------------
    app.get("/get-tools", async (req, res) => {
      const result = await toolsCollection.find({}).sort({ _id: -1 }).toArray();
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

    app.delete("/delete-tool/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await toolsCollection.deleteOne(query);
      res.send(result);
    });

    app.post("/post-tools", verifyJWT, verifyAdmin, async (req, res) => {
      const product = req.body;
      const result = await toolsCollection.insertOne(product);
      res.send(result);
    });

    // -----------  ORDER API -----------------
    app.post("/post-order", async (req, res) => {
      const user = req.body;
      const auth = req.headers.authorization;
      const result = await orderCollection.insertOne(user);
      res.send(result);
    });

    app.get("/get-allOrder", verifyJWT, verifyAdmin, async (req, res) => {
      const result = await orderCollection.find().sort({ _id: -1 }).toArray();
      res.send(result);
    });

    app.put(
      "/update-allOrder/:id",
      verifyJWT,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: ObjectId(id) };
        const options = { upsert: true };
        updateDoc = {
          $set: {
            status: "shiped",
          },
        };
        const result = await orderCollection.updateOne(
          filter,
          updateDoc,
          options
        );
        res.send(result);
      }
    );

    app.get("/get-order", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email === decodedEmail) {
        const query = { email: email };
        const result = await orderCollection.find(query).toArray();
        res.send(result);
      } else {
        res.status(403).send({ message: "forbidden" });
      }
    });

    app.patch("/order/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        },
      };
      const result = await paymentCollection.insertOne(payment);
      const updatedBooking = await orderCollection.updateOne(
        filter,
        updatedDoc
      );
      res.send(updatedBooking);
    });

    app.delete("/delete-order/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.deleteOne(query);
      res.send(result);
    });

    // ------------- REVIEW API -------------
    app.put("/review", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const review = req.body;
      const filter = { email: email };
      options = { upsert: true };
      updateDoc = {
        $set: review,
      };
      const result = await reviewCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    app.get("/get-review", async (req, res) => {
      const result = await reviewCollection.find().sort({ _id: -1 }).toArray();
      res.send(result);
    });

    app.get("/get-order/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.findOne(query);
      res.send(result);
    });

    // ------------ payment method----------
    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const order = req.body;
      const price = order.totalPrice;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });

    // ------------ USER API ---------------
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

    app.put("/userProfile", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const profile = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: profile,
      };
      const result = await profileCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    app.get("/userProfile", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const filter = { email: email };
      const result = await profileCollection.findOne(filter);
      if (result) {
        res.send(result);
      } else {
        const user = await userCollection.findOne(filter);
        res.send(user);
      }
    });

    app.get("/user", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });


    // ------------- ADMIN API --------------
    app.put("/admin/:email", verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const options = { upsert: true };
      updateDoc = {
        $set: {
          rol: "admin",
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      res.send({ result, success: true });
    });

    app.get("/user/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user.rol === "admin";
      res.send({ admin: isAdmin });
    });



  } finally {
  }
}
run().catch((error) => console.log(error));

// -------------HOME API--------------

app.get("/", (req, res) => {
  res.send("Electro-Parts here");
});

app.listen(port, () => {
  console.log("electro-parts are running in port", port);
});
