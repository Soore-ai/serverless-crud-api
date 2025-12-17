// Import AWS SDK v3 clients and marshall/unmarshall utilities
const {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  ScanCommand,
  DeleteItemCommand
} = require("@aws-sdk/client-dynamodb");

const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");

// Create DynamoDB client (region auto-detected from Lambda runtime)
const db = new DynamoDBClient({});

// Table name from environment variable defined in Terraform
const TABLE_NAME = process.env.TABLE_NAME;

// Lambda handler
exports.handler = async (event) => {
  console.log("EVENT RECEIVED:", JSON.stringify(event));

  const method = event.requestContext.http.method;
  const path = event.requestContext.http.path;
  const id = event.pathParameters ? event.pathParameters.id : null;

  let body = {};
  let statusCode = 200;

  try {
    // CREATE ITEM → POST /items
    if (method === "POST" && path === "/items") {
      const requestData = JSON.parse(event.body || "{}");

      // Generate a simple unique ID
      const newId = Date.now().toString() + "-" + Math.floor(Math.random() * 1000000);

      const item = {
        id: newId,
        ...requestData
      };

      const params = {
        TableName: TABLE_NAME,
        Item: marshall(item)
      };

      await db.send(new PutItemCommand(params));

      body = item;
      statusCode = 201;
    }

    // GET ALL ITEMS → GET /items
    else if (method === "GET" && path === "/items") {
      const result = await db.send(
        new ScanCommand({ TableName: TABLE_NAME })
      );

      const items = result.Items ? result.Items.map((i) => unmarshall(i)) : [];

      body = items;
    }

    // GET ONE ITEM → GET /items/{id}
    else if (method === "GET" && path.startsWith("/items/") && id) {
      const result = await db.send(
        new GetItemCommand({
          TableName: TABLE_NAME,
          Key: marshall({ id })
        })
      );

      if (!result.Item) {
        statusCode = 404;
        body = { message: "Item not found" };
      } else {
        body = unmarshall(result.Item);
      }
    }

    // UPDATE ITEM → PUT /items/{id}
    else if (method === "PUT" && path.startsWith("/items/") && id) {
      const requestData = JSON.parse(event.body || "{}");

      const updatedItem = {
        id,
        ...requestData
      };

      await db.send(
        new PutItemCommand({
          TableName: TABLE_NAME,
          Item: marshall(updatedItem)
        })
      );

      body = updatedItem;
    }

    // DELETE ITEM → DELETE /items/{id}
    else if (method === "DELETE" && path.startsWith("/items/") && id) {
      await db.send(
        new DeleteItemCommand({
          TableName: TABLE_NAME,
          Key: marshall({ id })
        })
      );

      body = { message: "Item deleted" };
    }

    // NO MATCHING ROUTE → 400 BAD REQUEST
    else {
      statusCode = 400;
      body = { message: "Unsupported route or method" };
    }
  } catch (err) {
    console.error("ERROR:", err);

    statusCode = 500;
    body = { message: "Internal server error", error: err.message };
  }

  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  };
};
