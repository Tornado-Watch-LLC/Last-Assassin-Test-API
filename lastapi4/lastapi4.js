const express = require("express");
const bodyParser = require("body-parser");
var cors = require("cors");
var AWS = require("aws-sdk");

AWS.config.update({
  region,
});

const app = express();
var corsOptions = {
  origin: "*",
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.options("*", cors());

games = {};

/*
Game Schema
  GameCode: {
    Host: string
    Mode: string
    Delay: float
    AttemptCD: float
    TagCD: float
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
  PlayerName: {
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
