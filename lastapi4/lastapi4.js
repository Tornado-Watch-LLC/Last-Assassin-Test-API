const express = require("express");
const bodyParser = require("body-parser");
var cors = require("cors");
var AWS = require("aws-sdk");

AWS.config.update({
  region: "us-west-2",
  endpoint: "http://localhost:8000",
});

var docClient = new AWS.DynamoDB.DocumentClient();

const app = express();
var corsOptions = {
  origin: "*",
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.options("*", cors());

let host = "Host";

async function addGame(data) {
  let params = {
    TableName: "Games",
    Item: data,
    ConditionExpression: "attribute_not_exists(code)",
  };
  await docClient.put(params, function (err, data) {
    if (err) {
      console.error(
        "Unable to add game. Error JSON:",
        JSON.stringify(err, null, 2)
      );
      return false;
    } else {
      console.log("PutItem succeeded:", data);
      return true;
    }
  });
}
addGame({
  code: "ABCDE",
  host: host,
  mode: "Manual",
  delay: 30,
});

/*
Game Schema
  GameCode: {
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
  }
Player Schema
  GameCode/PlayerName: {
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
  }
*/

app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: false,
  })
);

app.listen(3001, () => console.log("Server listening on port 3001!"));
