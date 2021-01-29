const express = require("express");
const bodyParser = require("body-parser");
var cors = require("cors");

const app = express();
app.use(cors());

app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: false,
  })
);

// const cookieParser = require("cookie-parser");
// app.use(cookieParser());

// const cookieSession = require("cookie-session");
// app.use(
//   cookieSession({
//     name: "session",
//     keys: ["secretValue"],
//     cookie: {
//       maxAge: 24 * 60 * 60 * 1000, // 24 hours
//     },
//   })
// );

let users = {};
let auth_tokens = {};

app.post("/register", async (req, res) => {
  console.log(req.body);
  if (
    !req.body.firstName ||
    !req.body.lastName ||
    !req.body.username ||
    !req.body.password
  )
    return res.status(400).send({
      message: "first name, last name, username and password are required",
    });

  if (req.body.username in users) {
    return res.status(403).send({
      message: "username already exists",
    });
  }
  let new_user = {
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    username: req.body.username,
    password: req.body.password,
  };
  users[req.body.username] = new_user;
  const new_token = makeid(64);
  auth_tokens[req.body.username] = new_token;

  return res.send({
    token: new_token,
  });
});

app.post("/login", async (req, res) => {
  console.log(req.body);
  if (!req.body.username || !req.body.password) return res.sendStatus(400);

  const user = users[req.body.username];
  if (!user)
    return res.status(403).send({
      message: "username or password is wrong",
    });
  if (user.password != req.body.password) {
    return res.status(403).send({
      message: "username or password is wrong",
    });
  }
  const new_token = makeid(64);
  auth_tokens[req.body.username] = new_token;

  return res.send({
    token: new_token,
  });
});

app.post("/logout", async (req, res) => {
  console.log(req.body);
  if (!req.body.username || !req.body.token) return res.sendStatus(400);
  if (auth_tokens[req.body.username] != req.body.token) {
    return res.status(403).send({
      message: "invalid token",
    });
  }
  delete auth_tokens[req.body.username];
  return res.send({
    stats: "User " + req.body.username + " successfully logged out.",
  });
});

app.post("/stats", async (req, res) => {
  console.log(req.body);
  if (!req.body.username || !req.body.token) return res.sendStatus(400);
  if (auth_tokens[req.body.username] != req.body.token) {
    return res.status(403).send({
      message: "invalid token",
    });
  }
  return res.send({
    stats: "Here is the statistical data for user " + req.body.username,
  });
});

function makeid(length) {
  var result = "";
  var characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

app.listen(3000, () => console.log("Server listening on port 3000!"));
