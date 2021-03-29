const express = require("express");
const bodyParser = require("body-parser");
var cors = require("cors");
var AWS = require("aws-sdk");
var check = require("./word_check");
const { ConnectContactLens } = require("aws-sdk");

AWS.config.update({
  region: "us-west-2",
  endpoint: "http://localhost:8000",
});

var db = new AWS.DynamoDB();

const app = express();
var corsOptions = {
  origin: "*",
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.options("*", cors());

app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: false,
  })
);

/* Game Database Functions
Schema:
  code: string
  host: string
  players: [string]
  {token}name: string
  mode: string
  delay: float
  cooldown: float
  tagDistance: float
  lagDistance: float

  gameStarted: boolean
  
  tagStartTime: datetime
  playersAlive: int
  {token}living: boolean
  {token}target: string
  {token}score: int
  {token}lat: float
  {token}long: float
  {token}timestamp: datetime
  {token}lastAttempt: datetime
  {token}pending: [string]
  {token}attempted: boolean
  
  gameOver: boolean
  lastStanding: string
*/

function S(string) {
  return { S: string };
}

function SS(strings) {
  return { SS: strings };
}

function N(number) {
  return { N: number.toString() };
}

function B(boolean) {
  return { BOOL: boolean };
}

async function insertGame(game) {
  let params = {
    TableName: "Games",
    Item: game,
    ConditionExpression: "attribute_not_exists(code)",
  };
  return await db.putItem(params).promise();
}

async function getGame(gameCode) {
  let params = {
    TableName: "Games",
    Key: {
      code: S(gameCode),
    },
  };
  let game = (await db.getItem(params).promise())["Item"];
  if (game == null) {
    return game;
  }
  for (let [key, value] of Object.entries(game)) {
    if ("S" in value) {
      game[key] = game[key]["S"];
    } else if ("N" in value) {
      game[key] = Number(game[key]["N"]);
    } else if ("SS" in value) {
      game[key] = game[key]["SS"];
    }
  }
  return game;
}

async function addPlayerToGame(gameCode, playerToken, playerName) {
  let params = {
    TableName: "Games",
    Key: {
      code: S(gameCode),
    },
    UpdateExpression: "add players :p set " + playerToken + "name = :n",
    ExpressionAttributeValues: {
      ":p": {
        SS: [playerToken],
      },
      ":n": {
        S: playerName,
      },
    },
  };
  return await db.updateItem(params).promise();
}

async function updateGame(
  gameCode,
  changes,
  appends,
  removes,
  increment,
  decrement
) {
  let set_keys = [];
  let set_vals = [];
  let set_exps = [];
  let add_key, del_key, inc_key, dec_key;
  let add_val, del_val, inc_val, dec_val;
  let add_exp, del_exp, inc_exp, dec_exp;

  // Adds
  if (appends != null) {
    add_exp = "add " + appends.key + " :a";
    add_key = ":a";
    add_val = SS(appends.value);
  }

  // Deletes
  if (removes != null) {
    del_exp = "delete " + removes.key + " :r";
    del_key = ":r";
    del_val = SS(removes.value);
  }

  // Increment
  if (increment != null) {
    inc_key = ":i";
    inc_val = N(1);
    inc_exp = increment + " = " + increment + " + :i";
  }

  // Decrement
  if (decrement != null) {
    dec_key = ":d";
    dec_val = N(-1);
    dec_exp = decrement + " = " + decrement + " + :d";
  }

  // Sets
  if (changes != null) {
    let i = 0;
    for (const [key, value] of Object.entries(changes)) {
      set_keys.push(":c" + to_letters(i));
      set_vals.push(value);
      set_exps.push(key + " = :c" + to_letters(i));
      i += 1;
    }
  }

  // Build expression and value, packaged into limited sets
  let s = 0;
  let e = 0;
  let a = appends == null;
  let r = removes == null;
  let i = increment == null;
  let d = decrement == null;
  let set_this_time = false;
  const limit = 3950;
  let expressions = [""];
  let valuesets = [{}];
  while (!a || !r || !i || !d || s < set_exps.length) {
    if (!a) {
      a = true;
      if (expressions[e].length + add_exp.length > limit) {
        e++;
        expressions.push(add_exp);
        valuesets.push({ add_key: add_val });
      } else {
        expressions[e] += " " + add_exp;
        valuesets[e][add_key] = add_val;
      }
    } else if (!r) {
      r = true;
      if (expressions[e].length + del_exp.length > limit) {
        e++;
        expressions.push(del_exp);
        valuesets.push({ del_key: del_val });
      } else {
        expressions[e] += " " + del_exp;
        valuesets[e][del_key] = del_val;
      }
    } else if (!i) {
      i = true;
      if (expressions[e].length + inc_exp.length > limit) {
        e++;
        expressions.push(" set " + inc_exp);
        set_this_time = true;
        valuesets.push({ inc_key: inc_val });
      } else {
        if (set_this_time) {
          expressions[e] += ", " + inc_exp;
        } else {
          expressions[e] += " set " + inc_exp;
          set_this_time = true;
        }
        valuesets[e][inc_key] = inc_val;
      }
    } else if (!d) {
      d = true;
      if (expressions[e].length + dec_exp.length > limit) {
        e++;
        expressions.push(" set " + dec_exp);
        set_this_time = true;
        valuesets.push({ dec_key: dec_val });
      } else {
        if (set_this_time) {
          expressions[e] += ", " + dec_exp;
        } else {
          expressions[e] += " set " + dec_exp;
          set_this_time = true;
        }
        valuesets[e][dec_key] = dec_val;
      }
    } else if (s < set_exps.length) {
      if (expressions[e].length + set_exps[s].length > limit) {
        e++;
        expressions.push(" set " + set_exps[s]);
        valuesets.push({});
        valuesets[e][set_keys[s]] = set_vals[s];
      } else {
        if (set_this_time) {
          expressions[e] += ",  " + set_exps[s];
        } else {
          expressions[e] += " set " + set_exps[s];
          set_this_time = true;
        }
        valuesets[e][set_keys[s]] = set_vals[s];
      }
      s++;
    } else {
      break;
    }
  }

  let results = [];

  let j = 0;
  while (j < expressions.length) {
    // console.log("Expression " + j + expressions[j]);
    // console.log("Values " + j + JSON.stringify(valuesets[j]));
    let params = {
      TableName: "Games",
      Key: {
        code: S(gameCode),
      },
      UpdateExpression: expressions[j],
      ExpressionAttributeValues: valuesets[j],
    };
    results.push(await db.updateItem(params).promise());
    j++;
  }
  return results;
}

function to_letters(i) {
  let letters = "abcdefghijklmnopqrstuvwxyz";
  let result = "";
  while (i > 0) {
    result += letters[i % 26];
    i = Math.floor(i / 26);
  }
  return result;
}

// Database function testing:

// (async () => {
//   try {
//     let result = await getGame("ABC");
//     console.log(result);
//     result = await insertGame({
//       code: S("ABC"),
//       host: S("bob"),
//       up: N(0),
//       down: N(10),
//       players: SS(["token"]),
//       targets: SS(["target1", "target2"]),
//     });
//     result = await getGame("ABC");
//     console.log(result);
//     result = await addPlayerToGame("ABC", "newplayertoken", "newplayername");
//     console.log(result);
//     result = await getGame("ABC");
//     console.log(result);
//     result = await updateGame(
//       "ABC",
//       {
//         host: S("bill"),
//         newattr: S("newvalue"),
//         newattr2: S("newvalue2"),
//         newattr3: S("newvalue3"),
//         newattr4: S("newvalue4"),
//         newattr5: S("newvalue5"),
//         newattr6: S("newvalue6"),
//       },
//       {
//         key: "players",
//         value: ["bob", "bill"],
//       },
//       {
//         key: "targets",
//         value: ["target1"],
//       },
//       ["up"],
//       ["down"]
//     );
//     result = await getGame("ABC");
//     console.log(result);
//   } catch (e) {
//     console.log(e);
//   }
// })().catch((e) => {
//   console.log(e);
// });

// Create Game

app.post("/create", async (req, res) => {
  if (!req.body.Host) {
    return sendError(res, "Host is required.");
  } else {
    const host = req.body.Host;
    const code = makeid(5);
    const token = code + makeid(5);
    game = createGame(host, token, code);
    print(await insertGame(game));
    return res.send({
      Token: token,
    });
  }
});

function createGame(host, token, code) {
  game = {};
  game.code = S(code);
  game.host = S(token);
  game.players = SS([token]);
  game[token + "name"] = S(host);
  game.mode = S("Honor");
  game.delay = N(60);
  game.cooldown = N(5);
  game.tagDistance = N(1);
  game.lagDistance = N(3);
  return game;
}

function makeid(length) {
  var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  var charactersLength = characters.length;
  do {
    var result = "";
    for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
  } while (!check.code_okay(result));
  return result;
}

// Join Game

app.post("/join", async (req, res) => {
  // Request Validation
  if (!req.body.Game) {
    return sendError(res, "Game code is required.");
  }
  if (!req.body.Player) {
    return sendError(res, "Player is required.");
  }
  const code = decode(req.body.Game);
  let game = await getGame(code);
  if (game == null) {
    return sendError(res, "Game does not exist.");
  }
  if (game.gameStarted) {
    return sendError(res, "Cannot join in-progress game.");
  }
  let name = req.body.Player;
  for (let t of game.players) {
    if (game[t + "name"] == name) {
      name += Math.floor(Math.random() * 8999) + 1000;
    }
  }
  let token;
  do {
    token = code + makeid(5);
  } while (game.players.includes(token));
  addPlayerToGame(code, token, name);
  return res.send({
    Token: token,
    Player: name,
  });
});

// Lobby Heartbeats

app.post("/host", async (req, res) => {
  // Request Validation
  if (!req.body.Token) {
    return sendError(res, "Token is required.");
  }
  const token = req.body.Token;
  const code = decode(token);
  let game = await getGame(code);
  if (game == null) {
    return sendError(res, "Game does not exist.");
  }
  if (token != game.host) {
    return sendError(res, "You are not the host.");
  }

  // Change any settings that were sent
  let updates = {};
  if (req.body.Mode) {
    let valid_modes = ["Auto", "Manual", "Honor"];
    if (valid_modes.includes(req.body.Mode)) {
      if (game.mode != req.body.Mode) {
        game.mode = req.body.Mode;
        updates.push({ mode: S(req.body.Mode) });
      }
    } else {
      return sendError(res, "Invalid setting value.");
    }
  }
  if (req.body.Delay) {
    const delay = parseFloat(req.body.Delay);
    if (delay >= 0 && delay < 3600) {
      if (game.delay != delay) {
        game.delay = delay;
        updates.delay = N(delay);
      }
    } else {
      return sendError(res, "Invalid setting value.");
    }
  }
  if (req.body.Cooldown) {
    const cooldown = parseFloat(req.body.Cooldown);
    if (cooldown >= 0 && cooldown < 3600) {
      if (game.cooldown != cooldown) {
        game.cooldown = cooldown;
        updates.cooldown = N(cooldown);
      }
    } else {
      return sendError(res, "Invalid setting value.");
    }
  }
  if (req.body.TagDistance) {
    const tag_distance = parseFloat(req.body.TagDistance);
    if (tag_distance > 0 && tag_distance < 1600) {
      if (game.tagDistance != tag_distance) {
        game.tagDistance = tag_distance;
        updates.tagDistance = N(tag_distance);
      }
    } else {
      return sendError(res, "Invalid setting value.");
    }
  }
  if (req.body.LagDistance) {
    const lag_distance = parseFloat(req.body.LagDistance);
    if (lag_distance > 0 && lag_distance < 1600) {
      if (game.lagDistance != lag_distance) {
        game.lagDistance = lag_distance;
        updates.lagDistance = N(lag_distance);
      }
    } else {
      return sendError(res, "Invalid setting value.");
    }
  }

  if (Object.keys(updates).length > 0) {
    print(await updateGame(code, updates, null, null, null, null));
  }

  return LobbyResponse(game, res);
});

function LobbyResponse(game, res) {
  let players = [];
  for (let t of game.players) {
    players.push(game[t + "name"]);
  }
  return res.send({
    Players: players,
    Host: game[game.host + "name"],
    GameStarted: game.gameStarted,
    Mode: game.mode,
    Delay: game.delay,
    Cooldown: game.cooldown,
    TagDistance: game.tagDistance,
    LagDistance: game.lagDistance,
  });
}

app.post("/lobby", async (req, res) => {
  // Request Validation
  if (!req.body.Token) {
    return sendError(res, "Token is required.");
  }
  const token = req.body.Token;
  const code = decode(token);
  let game = await getGame(code);
  if (game == null) {
    return sendError(res, "Game does not exist.");
  }
  if (!game.players.includes(token)) {
    return sendError(res, "Invalid token.");
  }

  return LobbyResponse(game, res);
});

// Start Game

app.post("/start", async (req, res) => {
  // Request Validation
  if (!req.body.Token) {
    return sendError(res, "Token is required.");
  }
  const token = req.body.Token;
  const code = decode(token);
  let game = await getGame(code);
  if (game == null) {
    return sendError(res, "Game does not exist.");
  }
  if (token != game.host) {
    return sendError(res, "You are not the host.");
  }
  if (game.gameStarted) {
    return sendError(res, "Game already started.");
  }
  if (game.players.length < 3) {
    return sendError(res, "Cannot start game with fewer than 3 players.");
  }

  print(await startGame(game));
  return res.send({ Success: true });
});

async function startGame(game) {
  // Basic setup
  updates = {};
  updates.gameStarted = B(true);
  updates.tagStartTime = S(
    JSON.stringify(new Date(new Date().getTime() + game.delay * 1000))
  );
  updates.GameOver = B(false);
  let tokens = game.players;
  const player_count = tokens.length;
  updates.playersAlive = N(player_count);

  // Randomly shuffle the array of players
  shuffle(tokens);

  // Generate the players and give them targets
  for (let i = 0; i < player_count; i++) {
    const token = tokens[i];
    updates[token + "living"] = B(true);
    updates[token + "score"] = N(0);
    updates[token + "target"] = S(tokens[(i + 1) % player_count]);
    updates[token + "lat"] = N(0);
    updates[token + "long"] = N(0);
    updates[token + "timestamp"] = N(0);

    // For an honor game, add the PendingAttempts list
    if (game.mode == "Honor") {
      updates[token + "pending"] = SS(["noneyet"]);
      updates[token + "attempted"] = B(false);
    }
  }

  return await updateGame(game.code, updates, null, null, null, null);
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// In-Game Heartbeat

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
  let game = await getGame(code);
  if (game == null) {
    return sendError(res, "Game does not exist.");
  }
  if (!game.gameStarted) {
    return sendError(res, "Game not yet started.");
  }
  if (!game.players.includes(token)) {
    return sendError(res, "Invalid token.");
  }
  assert_pending(game);

  // Update player info
  let updates = {};
  let increment = null;
  let decrement = null;
  let timestamp = new Date();
  updates[token + "timestamp"] = S(JSON.stringify(timestamp));
  updates[token + "lat"] = N(parseFloat(req.body.Latitude));
  updates[token + "long"] = N(parseFloat(req.body.Longitude));

  // Attempt tag in auto mode, return the relevant information
  let countdown = (new Date(JSON.parse(game.tagStartTime)) - new Date()) / 1000;
  if (countdown > 0) {
    return res.send({
      Countdown: countdown,
    });
  } else if (!game.gameOver) {
    if (game.mode == "Auto") {
      if (ProximityCheck(game, token)) {
        // Start Process Tag Block
        let targetToken = game[token + "target"];
        game[targetToken + "living"] = false;
        updates[targetToken + "living"] = B(false);
        game[token + "score"] += 1;
        increment = token + "score";
        game.playersAlive -= 1;
        decrement = "playersAlive";

        // If no more living players
        if (game.playersAlive < 2) {
          // End game, set winner and final scores
          game.gameOver = true;
          updates.gameOver = B(true);
          for (let t of game.players) {
            if (game[t + "living"]) {
              game.lastStanding = t;
              updates.lastStanding = S(t);
              break;
            }
          }
        } else {
          // Assign next target
          const newTarget = game[targetToken + "target"];
          game[token + "target"] = newTarget;
          updates[token + "target"] = S(newTarget);
          for (let t of game.players) {
            if (game[t + "target"] == targetToken) {
              game[t + "target"] = newTarget;
              updates[t + "target"] = S(newTarget);
            }
          }
        }
        // End Process Tag Block
      }
      if (game.gameOver) {
        print(
          await updateGame(code, updates, null, null, increment, decrement)
        );
        return gameOver(game, res);
      }
    }
    let targetToken = game[token + "target"];
    let response = {
      Living: game[token + "living"].BOOL,
      Tags: game[token + "score"],
      TargetName: game[targetToken + "name"],
      TargetLat: game[targetToken + "lat"],
      TargetLong: game[targetToken + "long"],
      PlayersAlive: game.playersAlive,
    };
    if (game.mode == "Honor") {
      let hunters = [];
      // console.log(token);
      // po(game);
      for (let t of game[token + "pending"]) {
        if (t != "noneyet") {
          hunters.push(game[t + "name"]);
        }
      }
      response.Pending = hunters;
      response.Attempted = game[token + "attempted"].BOOL;
    }
    print(await updateGame(code, updates, null, null, increment, decrement));
    return res.send(response);
  } else {
    print(await updateGame(code, updates, null, null, increment, decrement));
    return gameOver(game, res);
  }
});

function ProximityCheck(game, token) {
  const lat = game[token + "lat"];
  const long = game[token + "long"];
  const timestamp = new Date(JSON.parse(game[token + "timestamp"]));
  const targetToken = game[token + "target"];
  const targetLat = game[targetToken + "lat"];
  const targetLong = game[targetToken + "long"];
  const targetTimestamp = new Date(JSON.parse(game[targetToken + "timestamp"]));

  // Calculate tag distance based on time since target update
  const targetVulnerableRange =
    (game.lagDistance * (timestamp - targetTimestamp)) / 1000;
  const tagDistance = game.tagDistance + targetVulnerableRange;

  // Calculate distance to target
  const targetDistance = haversine(lat, long, targetLat, targetLong);

  return targetDistance < tagDistance;
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

function gameOver(game, res) {
  const lastStandingToken = game.lastStanding;
  let finalScores = {};
  for (let t of game.players) {
    finalScores[game[t + "name"]] = game[t + "score"];
  }
  return res.send({
    LastStanding: game[lastStandingToken + "name"],
    LastLat: game[lastStandingToken + "lat"],
    LastLong: game[lastStandingToken + "long"],
    FinalScores: finalScores,
  });
}

// Tag

app.post("/tag", async (req, res) => {
  // Request Validation
  if (!req.body.Token) {
    return sendError(res, "Token is required.");
  }
  const token = req.body.Token;
  const code = decode(token);
  let game = await getGame(code);
  if (game == null) {
    return sendError(res, "Game does not exist.");
  }
  if (!game.gameStarted) {
    return sendError(res, "Game not yet started.");
  }
  if (!game.players.includes(token)) {
    return sendError(res, "Invalid token.");
  }
  if (game[token + "attempted"].BOOL) {
    return sendError(res, "Previous attempt still pending.");
  }
  let updates = {};

  let countdown = (new Date(JSON.parse(game.tagStartTime)) - new Date()) / 1000;
  if (countdown > 0) {
    return sendError(res, "Start delay not over.");
  }
  if (game.mode == "Manual") {
    let now = new Date();
    if (
      now - new Date(JSON.parse(game[token + "lastAttempt"])) <
      game.cooldown * 1000
    ) {
      return sendError(res, "Attempt on cooldown.");
    }
    game[token + "lastAttempt"] = new Date();
    updates[token + "lastAttempt"] = JSON.stringify(new Date());
    if (ProximityCheck(game, token)) {
      // Start Process Tag Block
      let targetToken = game[token + "target"];
      game[targetToken + "living"] = false;
      updates[targetToken + "living"] = B(false);
      game[token + "score"] += 1;
      increment = token + "score";
      game.playersAlive -= 1;
      decrement = "playersAlive";

      // If no more living players
      if (game.playersAlive < 2) {
        // End game, set winner and final scores
        game.gameOver = true;
        updates.gameOver = B(true);
        for (let t of game.players) {
          if (game[t + "living"]) {
            game.lastStanding = t;
            updates.lastStanding = S(t);
            break;
          }
        }
      } else {
        // Assign next target
        const newTarget = game[targetToken + "target"];
        game[token + "target"] = newTarget;
        updates[token + "target"] = S(newTarget);
        for (let t of game.players) {
          if (game[t + "target"] == targetToken) {
            game[t + "target"] = newTarget;
            updates[t + "target"] = S(newTarget);
          }
        }
      }
      // End Process Tag Block
    }
    return res.send({ Success: true });
  }
  if (game.mode == "Honor") {
    let targetToken = game[token + "target"];
    if (token in game[targetToken + "pending"]) {
      return sendError(res, "Previous attempt still pending.");
    } else {
      game[targetToken + "pending"].push(token);
      let appends = {};
      appends.key = targetToken + "pending";
      appends.value = [token];
      game[token + "attempted"] = true;
      updates[token + "attempted"] = B(true);
      print(await updateGame(code, updates, appends, null, null, null));
      return res.send({ Success: true });
    }
  }
});

// Verify

app.post("/verify", async (req, res) => {
  // Request Validation
  if (!req.body.Token) {
    return sendError(res, "Token is required.");
  }
  let token = req.body.Token;
  const code = decode(token);
  let game = await getGame(code);
  if (game == null) {
    return sendError(res, "Game does not exist.");
  }
  if (!game.players.includes(token)) {
    return sendError(res, "Invalid token.");
  }
  if (!req.body.Hunter) {
    return sendError(res, "Hunter is required.");
  }
  if (!req.body.Accept) {
    return sendError(res, "Response is required.");
  }
  let hunterName = req.body.Hunter;
  let hunterToken = null;
  for (let t of game.players) {
    if (game[t + "name"] == hunterName) {
      hunterToken = t;
    }
  }
  if (hunterToken == null) {
    return sendError(res, "Unknown hunter.");
  }
  if (!game[token + "pending"].includes(hunterToken)) {
    return sendError(res, "No matching tag attempt found.");
  }

  let updates = {};
  game[hunterToken + "attempted"] = false;
  updates[hunterToken + "attempted"] = B(false);

  if (req.body.Accept.toLowerCase() == "true") {
    // Start Process Tag Block
    let targetToken = token;
    token = hunterToken;
    game[targetToken + "living"] = false;
    updates[targetToken + "living"] = B(false);
    game[token + "score"] += 1;
    let increment = token + "score";
    game.playersAlive -= 1;
    let decrement = "playersAlive";

    for (let t of game[targetToken + "pending"]) {
      if (t != "noneyet") {
        game[t + "attempted"] = false;
        updates[t + "attempted"] = B(false);
      }
    }
    let removes = {};
    removes.key = targetToken + "pending";
    removes.value = removeItem(game[targetToken + "pending"], "noneyet");
    game[targetToken + "pending"] = ["noneyet"];

    // If no more living players
    if (game.playersAlive < 2) {
      // End game, set winner and final scores
      game.gameOver = true;
      updates.gameOver = B(true);
      for (let t of game.players) {
        if (game[t + "living"]) {
          game.lastStanding = t;
          updates.lastStanding = S(t);
          break;
        }
      }
    } else {
      // Assign next target
      const newTarget = game[targetToken + "target"];
      game[token + "target"] = newTarget;
      updates[token + "target"] = S(newTarget);
      for (let t of game.players) {
        if (game[t + "target"] == targetToken) {
          game[t + "target"] = newTarget;
          updates[t + "target"] = S(newTarget);
        }
      }
    }
    // End Process Tag Block
    print(await updateGame(code, updates, null, removes, increment, decrement));
    return res.send({ Success: true });
  } else {
    let removes = {};
    removes.key = token + "pending";
    removes.value = [hunterToken];
    print(await updateGame(code, updates, null, removes, null, null));
    return res.send({ Success: true });
  }
});

// General Helper Functions

function decode(token) {
  return token.toUpperCase().substring(0, 5);
}

function sendError(res, error) {
  return res.send({
    Error: error,
  });
}

function po(unordered) {
  const ordered = Object.keys(unordered)
    .sort()
    .reduce((obj, key) => {
      obj[key] = unordered[key];
      return obj;
    }, {});

  //console.log(ordered);
  return ordered;
}

function pends(game) {
  pendings = {};
  for (let t of game.players) {
    pendings[t] = game[t + "pending"];
  }
  return po(pendings);
}

function assert_pending(game) {
  for (let t of game.players) {
    console.assert(game[t + "pending"] != null, pends(game));
  }
}

function print(thing) {
  console.log(thing);
}

function removeItem(arr, value) {
  var index = arr.indexOf(value);
  if (index > -1) {
    arr.splice(index, 1);
  }
  return arr;
}

app.listen(3001, () => console.log("Server listening on port 3001!"));
