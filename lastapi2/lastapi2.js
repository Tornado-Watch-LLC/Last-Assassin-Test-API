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
        FinalScores: {
          PlayerName: Kills, ...
        }
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
    Game: code,
  });
});

app.post("/", async (req, res) => {
  // Logging
  console.log(req.body);

  // Bad Request
  if (!req.body.Game) {
    return sendError(res, "Game code is required.");
  }

  // Logging
  console.log(games);

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
  const offset = Math.floor(Math.random() * (player_count - 1)) + 1;

  // Generate the players and give them targets
  for (let i = 0; i < player_count; i++) {
    const player_name = game.PlayerList[i];
    game.Players[player_name] = {};
    let player = game.Players[player_name];
    player.Living = true;
    player.Kills = 0;
    player.Target = game.PlayerList[(i + offset) % player_count];
    player.Latitude = 0;
    player.Longitude = 0;
    player.Timestamp = 0;
    console.log(player);
  }
}

function InGameHeartbeat(code, name, lat, long, timestamp, res) {
  // Confirm valid game and player
  if (!(code in games)) return sendError(res, "Game does not exist.");
  let game = games[code];
  if (!game.PlayerList.includes(name))
    return sendError(res, "Player not in game.");
  if (!game.GameStarted) return sendError(res, "Game not yet started.");

  // Logging
  console.log(typeof game.Players);
  for (let [key, value] of Object.entries(game.Players)) {
    console.log(key, value);
  }

  // Get player status
  let players = game.Players;
  let player = players[name];
  const living = player.Living;

  // Check if game is over, if so stop and send game over data
  if (game.GameEnded) {
    return gameOver(game, player);
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
  if (target.Latitude != 0) {
    // Calculate kill distance based on time since target update
    const targetVulnerableRange = (timestamp - targetTimestamp) / 150;
    const killDistance = 10 + targetVulnerableRange;

    // Calculate distance to target
    const targetDistance = haversine(lat, long, targetLat, targetLong);

    console.log("Player:", lat, long, timestamp);
    console.log("Target:", targetLat, targetLong, targetTimestamp);
    console.log("Target Vulnerable Range:", targetVulnerableRange);
    console.log("Kill Distance:", killDistance);
    console.log("Target Distance:", targetDistance);

    // If successful
    if (targetDistance < killDistance) {
      // Update target status and living player count
      target.Living = false;
      player.Kills += 1;
      game.LivingPlayers -= 1;

      // If no more living players
      if (game.LivingPlayers < 2) {
        // End game, set winner and final scores
        game.GameOver = true;
        let results = {};
        for (let [key, value] of Object.entries(players)) {
          if (value.Living) {
            game.LastStanding = key;
          }
          results[key] = value.Kills;
        }
        game.FinalScores = results;
        return gameOver(game, player);
      } else {
        // Assign next target
        player.Target = target.target;
      }
    }
  }

  target = player.Target;
  // Send ongoing game data
  return res.send({
    CurrentlyAlive: living,
    CurrentKills: player.Kills,
    TargetName: player.Target,
    TargetLatitude: target.Latitude,
    TargetLongitude: target.Longitude,
    TargetTimestamp: target.Timestamp,
    PlayersAlive: game.PlayersAlive,
  });
}

function gameOver(game, player) {
  return res.send({
    CurrentlyAlive: player.Living,
    CurrentKills: player.Kills,
    LastStanding: game.LastStanding,
    FinalScores: game.FinalScores,
  });
}

function haversine(lat1, long1, lat2, long2) {
  const R = 6371e3;
  const latRad1 = (lat1 * Math.PI) / 180;
  const latRad2 = (lat2 * Math.PI) / 180;
  const deltaLat = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLong = ((long2 - long1) * Math.PI) / 180;
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(latRad1) *
      Math.cos(latRad2) *
      Math.sin(deltaLong / 2) *
      Math.sin(deltaLong / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
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
