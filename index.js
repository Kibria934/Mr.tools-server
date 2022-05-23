const express = require("express");
const cors = require("cors");
require("dotenv").config();
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

// =========== Database connection ===============
async function run() {
  try {
    await client.connect();
    const toolsCollection = client.db("allTools").collection("tools");
    const reviewCollection = client.db("reviews").collection("review");

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
      // console.log(+quantity);

      
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
