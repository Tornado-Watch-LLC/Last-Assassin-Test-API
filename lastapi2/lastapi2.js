const express = require("express");
const bodyParser = require("body-parser");
var cors = require("cors");

const app = express();
app.use(cors());

games = {};

/*
Games = {
    GameCode: {
        PlayerList: [strings]
        GameStarted: boolean
        Players: {
            PlayerName: {
                Living: boolean
                Kills: int
                TargetName: string
                Latitude: float
                Longitude: float
                Timestamp: datetime
            }, ...
        }
        PlayersAlive: int
        GameOver: boolean
        LastStanding: string
        KillLeader: string
        LeaderKills: int
    }, ...
}
*/

app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: false,
  })
);

app.get("/", async (req, res) => {
  const code = makeid(5);
  games[code] = {};
  games[code].GameStarted = false;
  games[code].PlayerList = [];
  return res.send({
    Code: code,
  });
});

app.post("/", async (req, res) => {
  // Logging
  console.log(req.body);
  console.log(games);

  // Bad Request
  if (!req.body.Game) {
    return sendError(res, "Game code is required.");
  }

  // Start Game Request
  if (!req.body.Player) {
    const code = req.body.Game;
    return startGame(code, res);
  }

  // In-Game Heartbeat
  if (req.body.Latitude && req.body.Longitude && req.body.Timestamp) {
    const code = req.body.Game;
    const name = req.body.Player;
    const lat = req.body.Latitude;
    const long = req.body.Longitude;
    const timestamp = new Date(req.body.Timestamp);
    return InGameHeartbeat(code, name, lat, long, timestamp, res);
  }

  // Lobby Heartbeat
  else {
    const code = req.body.Game;
    const name = req.body.Player;
    return LobbyHeartbeat(code, name, res);
  }
});

function makeid(length) {
  var result = "";
  var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

function startGame(code, res) {
  if (code in games) {
    if (games[code].GameStarted) return sendError(res, "Game already started.");
    else {
      setupGame(code);
      return res.send({ GameStarted: true });
    }
  } else return sendError(res, "Game does not exist.");
}

function setupGame(code) {
  // Basic setup
  let game = games[code];
  game.GameStarted = true;
  game.GameOver = false;
  game.Players = {};
  const player_count = game.PlayerList.length;
  game.PlayersAlive = player_count;

  // Pick a random number between 0 and the number of players
  const offset = Math.floor(Math.random() * player_count);

  // Generate the players and give them targets
  for (let i = 0; i < player_count; i++) {
    const player_name = game.PlayerList[i];
    game.Players[player_name] = {};
    let player = game.Players[player_name];
    player.Living = true;
    player.Kills = 0;
    player.Target = game.PlayerList[(i + offset) % player_count];
    player.Latitude = null;
    player.Longitude = null;
    player.Timestamp = null;
  }
}

function InGameHeartbeat(code, name, lat, long, timestamp, res) {
  // Confirm valid game and player
  if (!(code in games)) return sendError(res, "Game does not exist.");
  let game = games[code];
  if (!game.PlayerList.includes(name))
    return sendError(res, "Player not in game.");
  if (!game.GameStarted) return sendError(res, "Game not yet started.");

  // Get player status
  let players = game.Players;
  let player = players[name];
  const living = player.Living;

  // Check if game is over, if so stop and send game over data
  if (game.GameEnded) {
    return res.send({
      CurrentlyAlive: living,
      CurrentKills: kills,
      LastStanding: game.LastStanding,
      KillLeader: game.KillLeader,
      LeaderKill: players[game.KillLeader].Kills,
    });
  }

  // Update player data
  player.Latitude = lat;
  player.Longitude = long;
  player.Timestamp = timestamp;

  // Get target data
  let targetName = player.Target;
  let target = players[targetName];
  let targetLat = target.Latitude;
  let targetLong = target.Longitude;
  let targetTimestamp = target.Timestamp;

  // Attempt assassination

  // Calculate kill range and current distance
  // If successful
  // Update target status and living player count
  // If no more living players
  // End game, set winner and killleader
  // Else
  // Assign next target

  // Send ongoing game data
  return res.send({
    CurrentlyAlive: living,
    CurrentKills: player.Kills,
    TargetName: targetName,
    TargetLatitude: targetLat,
    TargetLongitude: targetLong,
    TargetTimestamp: targetTimestamp,
    PlayersAlive: game.PlayersAlive,
  });
}

function LobbyHeartbeat(code, name, res) {
  // Confirm valid game
  if (!(code in games)) {
    return sendError(res, "Game does not exist.");
  }
  game = games[code];
  // New player
  if (!game.PlayerList.includes(name)) {
    // New player trying to join game that already started
    if (game.GameStarted) {
      return sendError(res, "Cannot join in-progress game.");
    }
    // New player joining lobby
    else {
      game.PlayerList.push(name);
      return res.send({
        Players: game.PlayerList,
        GameStarted: game.GameStarted,
      });
    }
  }
  // Player in lobby
  else {
    return res.send({
      Players: game.PlayerList,
      GameStarted: game.GameStarted,
    });
  }
}

function sendError(res, error) {
  return res.status(400).send({
    Error: error,
  });
}

app.listen(3000, () => console.log("Server listening on port 3000!"));
