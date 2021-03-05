const express = require("express");
const bodyParser = require("body-parser");
var cors = require("cors");

const app = express();
var corsOptions = {
  origin: "*",
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.options("*", cors());

games = {};

/*
Games = {
    GameCode: {
        Host: string
        Mode: string
        Delay: float
        AttemptCD: float
        TagCD: float
        TagDistance: float
        LagDistance: float
        PlayerList: [strings]
        GameStarted: boolean
        Players: {
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
            }, ...
        }
        PlayersAlive: int
        HomeLat: float
        HomeLong: float
        GameOver: boolean
        LastStanding: string
        FinalScores: {
          PlayerName: Tags, ...
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

app.post("/create", async (req, res) => {
  if (!req.body.Host) {
    return sendError(res, "Host is required.");
  } else {
    const host = req.body.Host;
    const code = makeid(5);
    let game = createGame(host, code);
    return res.send({
      Game: code,
      Players: game.PlayerList,
      Host: game.Host,
      Mode: game.Mode,
      Delay: game.Delay,
      AttemptCD: game.AttemptCD,
      TagCD: game.TagCD,
      TagDistance: game.TagDistance,
      LagDistance: game.LagDistance,
    });
  }
});

function createGame(host, code) {
  games[code] = {};
  let game = games[code];
  game.GameStarted = false;
  game.Host = host;
  game.PlayerList = [];
  game.PlayerList.push(host);
  game.Mode = "Manual";
  game.Delay = 60;
  game.AttemptCD = 5;
  game.TagCD = 20;
  game.TagDistance = 1;
  game.LagDistance = 3;
  return game;
}

app.post("/host", async (req, res) => {
  console.log(req.body);
  // Request Validation
  if (!req.body.Game) {
    return sendError(res, "Game code is required.");
  }
  if (!req.body.Player) {
    return sendError(res, "Player is required.");
  }
  if (!(req.body.Game in games)) {
    return sendError(res, "Game does not exist.");
  }
  let game = games[req.body.Game];
  let player = req.body.Player;
  if (player != game.Host) {
    return sendError(res, "You are not the host.");
  }

  // Change any settings that were sent
  if (req.body.Mode) {
    let valid_modes = ["Auto", "Manual", "Honor"];
    if (valid_modes.includes(req.body.Mode)) {
      game.Mode = req.body.Mode;
    } else {
      return sendError(res, "Invalid setting value.");
    }
  }
  if (req.body.Delay) {
    if (req.body.Delay >= 0 && req.body.Delay < 3600) {
      console.log(typeof req.body.Delay);
      game.Delay = req.body.Delay;
      console.log(typeof game.Delay);
    } else {
      return sendError(res, "Invalid setting value.");
    }
  }
  if (req.body.AttemptCD) {
    if (req.body.AttemptCD >= 0 && req.body.AttemptCD < 3600) {
      game.AttemptCD = req.body.AttemptCD;
    } else {
      return sendError(res, "Invalid setting value.");
    }
  }
  if (req.body.TagCD) {
    if (req.body.TagCD >= 0 && req.body.TagCD < 3600) {
      game.TagCD = req.body.TagCD;
    } else {
      return sendError(res, "Invalid setting value.");
    }
  }
  if (req.body.TagDistance) {
    if (req.body.TagDistance > 0 && req.body.TagDistance < 1600) {
      game.TagDistance = req.body.TagDistance;
    } else {
      return sendError(res, "Invalid setting value.");
    }
  }
  if (req.body.LagDistance) {
    if (req.body.LagDistance > 0 && req.body.LagDistance < 1600) {
      game.LagDistance = req.body.LagDistance;
    } else {
      return sendError(res, "Invalid setting value.");
    }
  }

  return LobbyResponse(game, res);
});

app.post("/lobby", async (req, res) => {
  // Request Validation
  if (!req.body.Game) {
    return sendError(res, "Game code is required.");
  }
  if (!req.body.Player) {
    return sendError(res, "Player is required.");
  }
  if (!(req.body.Game in games)) {
    return sendError(res, "Game does not exist.");
  }
  let game = games[req.body.Game];
  if (!game.PlayerList.includes(req.body.Player)) {
    if (game.GameStarted) {
      return sendError(res, "Cannot join in-progress game.");
    } else {
      game.PlayerList.push(req.body.Player);
    }
  }

  return LobbyResponse(game, res);
});

function LobbyResponse(game, res) {
  return res.send({
    Players: game.PlayerList,
    Host: game.Host,
    GameStarted: game.GameStarted,
    Mode: game.Mode,
    Delay: game.Delay,
    AttemptCD: game.AttemptCD,
    TagCD: game.TagCD,
    TagDistance: game.TagDistance,
    LagDistance: game.LagDistance,
  });
}

app.post("/start", async (req, res) => {
  console.log(req.body);
  // Request Validation
  if (!req.body.Game) {
    return sendError(res, "Game code is required.");
  }
  if (!req.body.Player) {
    return sendError(res, "Player is required.");
  }
  if (!req.body.HomeLat || !req.body.HomeLong) {
    return sendError(res, "Home coordinates are required.");
  }
  if (!(req.body.Game in games)) {
    return sendError(res, "Game does not exist.");
  }
  let game = games[req.body.Game];
  let player = req.body.Player;
  if (player != game.Host) {
    return sendError(res, "You are not the host.");
  }
  if (game.GameStarted) {
    return sendError(res, "Game already started.");
  }
  if (game.PlayerList.length < 3) {
    return sendError(res, "Cannot start game with fewer than 3 players.");
  }

  game.HomeLat = req.body.HomeLat;
  game.HomeLong = req.body.HomeLong;

  startGame(game);
  return res.setStatus(204).send({});
});

function startGame(game) {
  // Basic setup
  game.GameStarted = true;
  let now = new Date();
  game.TagStartTime = new Date(now.getTime() + game.Delay * 1000);
  game.GameOver = false;
  game.Players = {};
  const player_count = game.PlayerList.length;
  game.PlayersAlive = player_count;

  // Randomly shuffle the array of players
  console.log(game.PlayerList);
  shuffle(game.PlayerList);
  console.log(game.PlayerList);

  // Generate the players and give them targets
  for (let i = 0; i < player_count; i++) {
    const player_name = game.PlayerList[i];
    game.Players[player_name] = {};
    let player = game.Players[player_name];
    player.Living = true;
    player.Tags = 0;
    player.Target = game.PlayerList[(i + 1) % player_count];
    player.Latitude = 0;
    player.Longitude = 0;
    player.Timestamp = 0;

    // For an honor game, add the PendingAttempts list
    if (game.Mode == "Honor") {
      player.PendingAttempts = [];
      player.AttemptStatus = "None";
    }
  }
}

app.post("/game", async (req, res) => {
  // Request Validation
  if (!req.body.Game) {
    return sendError(res, "Game code is required.");
  }
  if (!req.body.Player) {
    return sendError(res, "Player is required.");
  }
  if (!req.body.Latitude || !req.body.Longitude) {
    return sendError(res, "Coordinates are required.");
  }
  if (!(req.body.Game in games)) {
    return sendError(res, "Game does not exist.");
  }
  let game = games[req.body.Game];
  if (!game.GameStarted) {
    return sendError(res, "Game not yet started.");
  }
  if (!game.PlayerList.includes(req.body.Player)) {
    return sendError(res, "Player not in game.");
  }

  // Update player info
  let player = game.Players[req.body.Player];
  player.Timestamp = new Date();
  player.Latitude = req.body.Latitude;
  player.Longitude = req.body.Longitude;

  // Attempt tag in auto mode, return the relevant information
  let countdown = game.TagStartTime - new Date();
  if (countdown > 0) {
    return res.send({
      Countdown: countdown,
    });
  } else if (!game.GameOver) {
    if (game.Mode == "Auto") {
      if (ProximityCheck(game, player)) {
        processTag(game, player);
      }
      if (game.GameOver) {
        return gameOver(game, res);
      }
    }
    let target = game.Players[player.Target];
    let response = {
      Living: player.Living,
      Tags: player.Tags,
      TargetName: player.Target,
      TargetLat: target.Latitude,
      TargetLong: target.Longitude,
      PlayersAlive: game.PlayersAlive,
    };
    if (game.Mode == "Honor") {
      response.Pending = player.PendingAttempts;
      response.Status = player.AttemptStatus;
    }
    return res.send(response);
  } else {
    return gameOver(game, res);
  }
});

function gameOver(game, res) {
  return res.send({
    LastStanding: game.LastStanding,
    LastStandingLat: game.Players[game.LastStanding].Latitude,
    LastStandingLong: game.Players[game.LastStanding].Longitude,
    HomeLat: game.HomeLat,
    HomeLong: game.HomeLong,
    FinalScores: game.FinalScores,
  });
}

app.post("/tag", async (req, res) => {
  // Request Validation
  if (!req.body.Game) {
    return sendError(res, "Game code is required.");
  }
  if (!req.body.Player) {
    return sendError(res, "Player is required.");
  }
  if (!(req.body.Game in games)) {
    return sendError(res, "Game does not exist.");
  }
  let game = games[req.body.Game];
  if (!game.GameStarted) {
    return sendError(res, "Game not yet started.");
  }
  if (!game.PlayerList.includes(req.body.Player)) {
    return sendError(res, "Player not in game.");
  }
  let countdown = game.TagStartTime - new Date();
  if (countdown > 0) {
    return sendError(res, "Start delay not over.");
  }
  let player = game.Players[req.body.Player];
  let now = new Date();
  if (now - player.LastAttempt < game.AttemptCD * 1000) {
    return sendError(res, "Attempt on cooldown.");
  }
  if (now - player.LastTag < game.TagCD * 1000) {
    return sendError(res, "Tag on cooldown.");
  }
  if (game.Mode == "Manual") {
    if (ProximityCheck(game, player)) {
      processTag(game, player);
    }
    return res.setStatus(204).send({});
  }
  if (game.Mode == "Honor") {
    let target = game.Players[player.Target];
    if (target.PendingAttempts.includes(req.body.Player)) {
      player.AttemptStatus = "Pending";
      return sendError(res, "Previous attempt still pending.");
    } else {
      target.PendingAttempts.push(req.body.Player);
      player.AttemptStatus = "Pending";
      return res.setStatus(204).send({});
    }
  }
});

app.post("/verify", async (req, res) => {
  // Request Validation
  if (!req.body.Game) {
    return sendError(res, "Game code is required.");
  }
  if (!req.body.Player) {
    return sendError(res, "Player is required.");
  }
  if (!req.body.Hunter) {
    return sendError(res, "Hunter is required.");
  }
  if (!req.body.Accept) {
    return sendError(res, "Response is required.");
  }
  if (!(req.body.Game in games)) {
    return sendError(res, "Game does not exist.");
  }
  let game = games[req.body.Game];
  if (!game.GameStarted) {
    return sendError(res, "Game not yet started.");
  }
  if (!game.PlayerList.includes(req.body.Player)) {
    return sendError(res, "Player not in game.");
  }
  let player = game.Players[req.body.Player];
  if (!player.PendingAttempts.includes(req.body.Hunter)) {
    return sendError(res, "No matching tag attempt found.");
  }
  let hunter = game.Players[req.body.Hunter];
  if (req.body.Accept) {
    hunter.AttemptStatus = "Accepted";
    processTag(game, hunter);
    return res.setStatus(204).send({});
  } else {
    player.PendingAttempts = player.PendingAttempts.filter(
      (value, index, arr) => {
        return value != req.body.Hunter;
      }
    );
    hunter.AttemptStatus = "Rejected";
    return res.setStatus(204).send({});
  }
});

function ProximityCheck(game, player) {
  let targetName = player.Target;
  let target = game.Players[targetName];
  let targetLat = target.Latitude;
  let targetLong = target.Longitude;
  let targetTimestamp = target.Timestamp;

  // Calculate tag distance based on time since target update
  const targetVulnerableRange =
    (game.LagDistance * (player.Timestamp - targetTimestamp)) / 1000;
  const tagDistance = game.TagDistance + targetVulnerableRange;

  // Calculate distance to target
  const targetDistance = haversine(
    player.Latitude,
    player.Longitude,
    targetLat,
    targetLong
  );

  return targetDistance < tagDistance;
}

function processTag(game, player) {
  let target = game.Players[player.Target];

  target.Living = false;
  player.Tags += 1;
  game.PlayersAlive -= 1;

  if (game.Mode == "Honor") {
    target.PendingAttempts = [];
  }

  // If no more living players
  if (game.PlayersAlive < 2) {
    // End game, set winner and final scores
    game.GameOver = true;
    let results = {};
    for (let [key, value] of Object.entries(players)) {
      if (value.Living) {
        game.LastStanding = key;
      }
      results[key] = value.Tags;
    }
    game.FinalScores = results;
  } else {
    // Assign next target
    const newTarget = target.Target;
    player.Target = newTarget;
    for (let [key, value] of Object.entries(players)) {
      if (value.Target == targetName) {
        value.Target = newTarget;
      }
    }
  }
}

function makeid(length) {
  var result = "";
  var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
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

function sendError(res, error) {
  return res.send({
    Error: error,
  });
}

app.listen(3001, () => console.log("Server listening on port 3001!"));
