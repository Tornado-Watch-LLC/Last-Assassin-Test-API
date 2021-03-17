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
players = {};

/*
Games = {
  Code: {
    Host: string
    Mode: string
    Delay: float
    Cooldown: float
    TagDistance: float
    LagDistance: float
    PlayerList: {
      Token: Name
    }
    GameStarted: boolean
    PlayersAlive: int
    GameOver: boolean
    LastStanding: string
    LastLat: float
    LastLong: float
    FinalScores: {
      PlayerName: Tags, ...
    }
  }, ...
}
Players = {
  Token: {
    Name: string
    Living: boolean
    Tags: int
    Target: string
    Latitude: float
    Longitude: float
    Timestamp: datetime
    LastAttempt: datetime
    PendingAttempts: {
      Name: Token
    }
    Attempted: boolean
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
    const token = code + makeid(50);
    createGame(host, token, code);
    return res.send({
      Token: token,
    });
  }
});

function createGame(host, token, code) {
  games[code] = {};
  let game = games[code];
  game.GameStarted = false;
  game.Host = token;
  game.PlayerList = {};
  game.PlayerList[token] = host;
  game.Mode = "Manual";
  game.Delay = 60;
  game.Cooldown = 5;
  game.TagDistance = 1;
  game.LagDistance = 3;
}

function decode(token) {
  return token.toUpperCase().substring(0, 5);
}

app.post("/join", async (req, res) => {
  // Request Validation
  if (!req.body.Game) {
    return sendError(res, "Game code is required.");
  }
  if (!req.body.Player) {
    return sendError(res, "Player is required.");
  }
  const code = decode(req.body.Game);
  if (!(code in games)) {
    return sendError(res, "Game does not exist.");
  }
  let game = games[code];
  if (game.GameStarted) {
    return sendError(res, "Cannot join in-progress game.");
  }
  let name = req.body.Player;
  const token = code + makeid(50);
  while (Object.values(game.PlayerList).includes(name)) {
    name += "2";
  }
  game.PlayerList[token] = name;
  return res.send({
    Token: token,
    Player: name,
  });
});

app.post("/host", async (req, res) => {
  // Request Validation
  if (!req.body.Token) {
    return sendError(res, "Token is required.");
  }
  const token = req.body.Token;
  const code = decode(token);
  if (!(code in games)) {
    return sendError(res, "Game does not exist.");
  }
  let game = games[code];
  if (token != game.Host) {
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
    const delay = parseFloat(req.body.Delay);
    if (delay >= 0 && delay < 3600) {
      game.Delay = delay;
    } else {
      return sendError(res, "Invalid setting value.");
    }
  }
  if (req.body.Cooldown) {
    const cooldown = parseFloat(req.body.Cooldown);
    if (cooldown >= 0 && cooldown < 3600) {
      game.Cooldown = cooldown;
    } else {
      return sendError(res, "Invalid setting value.");
    }
  }
  if (req.body.TagDistance) {
    const tag_distance = parseFloat(req.body.TagDistance);
    if (tag_distance > 0 && tag_distance < 1600) {
      game.TagDistance = tag_distance;
    } else {
      return sendError(res, "Invalid setting value.");
    }
  }
  if (req.body.LagDistance) {
    const lag_distance = parseFloat(req.body.LagDistance);
    if (lag_distance > 0 && lag_distance < 1600) {
      game.LagDistance = lag_distance;
    } else {
      return sendError(res, "Invalid setting value.");
    }
  }

  return LobbyResponse(game, res);
});

app.post("/lobby", async (req, res) => {
  // Request Validation
  if (!req.body.Token) {
    return sendError(res, "Token is required.");
  }
  const token = req.body.Token;
  const code = decode(token);
  if (!(code in games)) {
    return sendError(res, "Game does not exist.");
  }
  let game = games[code];
  if (!(token in game.PlayerList)) {
    return sendError(res, "Invalid token.");
  }

  return LobbyResponse(game, res);
});

function LobbyResponse(game, res) {
  return res.send({
    Players: Object.values(game.PlayerList),
    Host: game.PlayerList[game.Host],
    GameStarted: game.GameStarted,
    Mode: game.Mode,
    Delay: game.Delay,
    Cooldown: game.Cooldown,
    TagDistance: game.TagDistance,
    LagDistance: game.LagDistance,
  });
}

app.post("/start", async (req, res) => {
  // Request Validation
  if (!req.body.Token) {
    return sendError(res, "Token is required.");
  }
  const token = req.body.Token;
  const code = decode(token);
  if (!(code in games)) {
    return sendError(res, "Game does not exist.");
  }
  let game = games[code];
  if (token != game.Host) {
    return sendError(res, "You are not the host.");
  }
  if (game.GameStarted) {
    return sendError(res, "Game already started.");
  }
  if (Object.values(game.PlayerList).length < 3) {
    return sendError(res, "Cannot start game with fewer than 3 players.");
  }

  startGame(game);
  return res.send({ Success: true });
});

function startGame(game) {
  // Basic setup
  game.GameStarted = true;
  let now = new Date();
  game.TagStartTime = new Date(now.getTime() + game.Delay * 1000);
  game.GameOver = false;
  let tokens = Object.keys(game.PlayerList);
  const player_count = tokens.length;
  game.PlayersAlive = player_count;

  // Randomly shuffle the array of players
  shuffle(tokens);

  // Generate the players and give them targets
  for (let i = 0; i < player_count; i++) {
    const token = tokens[i];
    players[token] = {};
    let player = players[token];
    player.Name = game.PlayerList[token];
    player.Living = true;
    player.Tags = 0;
    player.Target = tokens[(i + 1) % player_count];
    player.Latitude = 0;
    player.Longitude = 0;
    player.Timestamp = 0;

    // For an honor game, add the PendingAttempts list
    if (game.Mode == "Honor") {
      player.PendingAttempts = {};
      player.Attempted = false;
    }
  }
}

app.post("/game", async (req, res) => {
  // Request Validation
  if (!req.body.Token) {
    return sendError(res, "Token is required.");
  }
  if (!req.body.Latitude || !req.body.Longitude) {
    return sendError(res, "Coordinates are required.");
  }
  const token = req.body.Token;
  const code = decode(token);
  if (!(code in games)) {
    return sendError(res, "Game does not exist.");
  }
  let game = games[code];
  if (!game.GameStarted) {
    return sendError(res, "Game not yet started.");
  }
  if (!(token in players)) {
    return sendError(res, "Invalid token.");
  }
  let player = players[token];

  // Update player info
  player.Timestamp = new Date();
  player.Latitude = parseFloat(req.body.Latitude);
  player.Longitude = parseFloat(req.body.Longitude);

  // Attempt tag in auto mode, return the relevant information
  let countdown = (game.TagStartTime - new Date()) / 1000;
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
    let target = players[player.Target];
    let response = {
      Living: player.Living,
      Tags: player.Tags,
      TargetName: target.Name,
      TargetLat: target.Latitude,
      TargetLong: target.Longitude,
      PlayersAlive: game.PlayersAlive,
    };
    if (game.Mode == "Honor") {
      response.Pending = Object.keys(player.PendingAttempts);
      response.Attempted = player.Attempted;
    }
    return res.send(response);
  } else {
    return gameOver(game, res);
  }
});

function gameOver(game, res) {
  return res.send({
    LastStanding: game.LastStanding,
    LastLat: game.LastLat,
    LastLong: game.LastLong,
    FinalScores: game.FinalScores,
  });
}

app.post("/tag", async (req, res) => {
  // Request Validation
  if (!req.body.Token) {
    return sendError(res, "Token is required.");
  }
  const token = req.body.Token;
  const code = decode(token);
  if (!(code in games)) {
    return sendError(res, "Game does not exist.");
  }
  let game = games[code];
  if (!game.GameStarted) {
    return sendError(res, "Game not yet started.");
  }
  if (!(token in players)) {
    return sendError(res, "Invalid token.");
  }
  let player = players[token];

  let countdown = (game.TagStartTime - new Date()) / 1000;
  if (countdown > 0) {
    return sendError(res, "Start delay not over.");
  }
  if (game.Mode == "Manual") {
    let now = new Date();
    if (now - player.LastAttempt < game.Cooldown * 1000) {
      return sendError(res, "Attempt on cooldown.");
    }
    player.LastAttempt = new Date();
    if (ProximityCheck(game, player)) {
      processTag(game, player);
    }
    return res.send({ Success: true });
  }
  if (game.Mode == "Honor") {
    let target = players[player.Target];
    if (player.Name in target.PendingAttempts) {
      player.Attempted = true;
      return sendError(res, "Previous attempt still pending.");
    } else {
      target.PendingAttempts[player.Name] = token;
      player.Attempted = true;
      return res.send({ Success: true });
    }
  }
});

app.post("/verify", async (req, res) => {
  // Request Validation
  if (!req.body.Token) {
    return sendError(res, "Token is required.");
  }
  const token = req.body.Token;
  const code = decode(token);
  if (!(code in games)) {
    return sendError(res, "Game does not exist.");
  }
  let game = games[code];
  if (!(token in players)) {
    return sendError(res, "Invalid token.");
  }
  let player = players[token];

  if (!req.body.Hunter) {
    return sendError(res, "Hunter is required.");
  }
  if (!req.body.Accept) {
    return sendError(res, "Response is required.");
  }
  if (!(req.body.Hunter in player.PendingAttempts)) {
    return sendError(res, "No matching tag attempt found.");
  }
  let hunter = players[player.PendingAttempts[req.body.Hunter]];
  if (req.body.Accept.toLowerCase() == "true") {
    hunter.AttemptStatus = "Accepted";
    processTag(game, hunter);
    return res.send({ Success: true });
  } else {
    delete player.PendingAttempts[hunter.Name];
    hunter.AttemptStatus = "Rejected";
    return res.send({ Success: true });
  }
});

function ProximityCheck(game, player) {
  let target = players[player.Target];
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
  let target = players[player.Target];

  target.Living = false;
  player.Tags += 1;
  player.Attempted = false;
  game.PlayersAlive -= 1;

  if (game.Mode == "Honor") {
    for (const [name, token] of Object.entries(target.PendingAttempts)) {
      players[token].Attempted = false;
    }
    target.PendingAttempts = [];
  }

  // If no more living players
  if (game.PlayersAlive < 2) {
    // End game, set winner and final scores
    game.GameOver = true;
    let results = {};
    for (let [token, name] of Object.entries(game.PlayerList)) {
      if (players[token].Living) {
        game.LastStanding = players[token].Name;
        game.LastLat = players[token].Latitude;
        game.LastLong = players[token].Longitude;
      }
      results[players[token].Name] = players[token].Tags;
    }
    game.FinalScores = results;
  } else {
    // Assign next target
    const newTarget = target.Target;
    player.Target = newTarget;
    for (let [t, p] of Object.entries(players)) {
      if (players[p.Target].Name == target.Name) {
        p.Target = newTarget;
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
