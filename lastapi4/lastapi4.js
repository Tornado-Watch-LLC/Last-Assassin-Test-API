// const express = require("express");
// const bodyParser = require("body-parser");
// var cors = require("cors");
var AWS = require("aws-sdk");

AWS.config.update({
  region: "us-west-2",
  endpoint: "http://localhost:8000",
});

var docClient = new AWS.DynamoDB.DocumentClient();

// const app = express();
// var corsOptions = {
//   origin: "*",
//   optionsSuccessStatus: 200,
// };
// app.use(cors(corsOptions));
// app.options("*", cors());

// General Database Functions
async function put(params) {
  const result = await docClient.put(params).promise();
  return result;
}

async function get(params) {
  const result = await docClient.get(params).promise();
  return result;
}

async function batchGet(params) {
  const result = await docClient.batchGet(params).promise();
  return result;
}

/* Game Database Functions
Schema:
  code: string
  Host: string
  Mode: string
  Delay: float
  Cooldown: float
  TagDistance: float
  LagDistance: float
  Players: [string]
  GameStarted: boolean
  PlayersAlive: int
  HomeLat: float
  HomeLong: float
  GameOver: boolean
  LastStanding: string
  FinalScores: {
    Player: Tags, ...
  }
*/

async function insertGame(game) {
  let params = {
    TableName: "Games",
    Item: game,
    ConditionExpression: "attribute_not_exists(code)",
  };
  return await put(params);
}

async function updateGame(game) {
  let params = {
    TableName: "Games",
    Item: game,
    ConditionExpression: "attribute_exists(code)",
  };
  return await put(params);
}

async function getGame(code) {
  let params = {
    TableName: "Games",
    Key: {
      Code: code,
    },
  };
  return await get(params);
}

/* Player Database Functions
Schema:
  Tkn: string
  Living: boolean
  Tags: int
  TargetName: string
  Latitude: float
  Longitude: float
  Timestamp: datetime
  LastAttempt: datetime
  LastTag: datetime
  PendingAttempts: [
    {
      Hunter: string
      Timestamp: datetime
    }
  ]
  AttemptStatus: string
*/

async function insertPlayer(player) {
  let params = {
    TableName: "Players",
    Item: player,
    ConditionExpression: "attribute_not_exists(Tkn)",
  };
  return await put(params);
}

async function updatePlayer(player) {
  let params = {
    TableName: "Players",
    Item: player,
    ConditionExpression: "attribute_exists(Tkn)",
  };
  return await put(params);
}

async function getPlayer(token) {
  let params = {
    TableName: "Players",
    Key: {
      Tkn: token,
    },
  };
  return await get(params);
}

// async function insertPlayers(player) {
//   let params = {
//     TableName: "Players",
//     Item: player,
//     ConditionExpression: "attribute_not_exists(Tkn)",
//   };
//   return await put(params);
// }

// async function updatePlayers(players) {
//   let params = {
//     TableName: "Players",
//     Item: player,
//     ConditionExpression: "attribute_exists(Tkn)",
//   };
//   return await put(params);
// }

async function getPlayers(tokens) {
  keys = [];
  console.log(tokens);
  for (token of tokens) {
    keys.push({ Tkn: token });
  }
  console.log(keys);
  let params = {
    RequestItems: {
      Players: {
        Keys: keys,
      },
    },
  };
  let result = await batchGet(params);
  return result["Responses"]["Players"];
}

(async () => {
  try {
    let result = await insertPlayer({
      Tkn: "ABC",
      Name: "123",
    });
    result = await getPlayer("ABC");
    console.log(result);
    result = await updatePlayer({
      Tkn: "ABC",
      Name: "456",
    });
    result = await getPlayer("ABC");
    console.log(result);
    result = await insertPlayer({
      Tkn: "DEF",
      Name: "123",
    });
    result = await getPlayers(["ABC", "DEF"]);
    console.log(result);
  } catch (e) {
    console.log(e);
  }
})().catch((e) => {
  console.log(e);
});

// app.use(bodyParser.json());
// app.use(
//   bodyParser.urlencoded({
//     extended: false,
//   })
// );

//app.listen(3001, () => console.log("Server listening on port 3001!"));
