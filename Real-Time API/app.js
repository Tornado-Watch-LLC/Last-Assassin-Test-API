var app = require("express")();
var http = require("http").Server(app);
var io = require("socket.io")(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

var clients = 0;

// I should have a list of clients with their
// session IDs and use that to handle updates

//Whenever someone connects this gets executed
io.on("connection", function (socket) {
  // Lobby Client -> Server Messages
  socket.on("createLobby", (data) => {
    console.log(data);
  });
  socket.on("joinLobby", (data) => {
    console.log(data);
  });
  socket.on("leaveLobby", (data) => {
    console.log(data);
  });
  socket.on("updateRuleset", (data) => {
    console.log(data);
  });
  socket.on("startGame", (data) => {
    console.log(data);
  });

  // Lobby Server -> Client Messages
  socket.on("requestRulesetUpdate", (data) => {
    socket.emit("rulesetUpdate", {
      update: "rule updates go here",
    });
  });
  socket.on("requestOtherPlayerJoinsLobby", (data) => {
    socket.emit("otherPlayerJoinsLobby", {
      player: "player name",
    });
  });
  socket.on("requestOtherPlayerLeavesLobby", (data) => {
    socket.emit("otherPlayerLeavesobby", {
      player: "player name",
    });
  });
  socket.on("requestGameStart", (data) => {
    socket.emit("gameStart");
  });

  // In-Game Client-Server Messages
  socket.on("sendLocation", (data) => {
    console.log(data);
  });
  socket.on("usePowerup", (data) => {
    console.log(data);
  });
  socket.on("attemptAssassination", (data) => {
    console.log(data);
  });

  // In-Game Server -> Client Messages
  socket.on("requestRecieveTarget", (data) => {
    socket.emit("recieveTarget", {
      player: "player name",
    });
  });
  socket.on("requestTargetLocation", (data) => {
    socket.emit("targetLocation", {
      lat: 5,
      long: 5,
    });
  });
  socket.on("requestYouWereAssassinated", (data) => {
    socket.emit("youWereAssassinated", {
      player: "player name",
    });
  });
  socket.on("requestOtherPlayerAssassinated", (data) => {
    socket.emit("otherPlayerAssassinated", {
      player: "player name",
      target: "target name",
    });
  });
  socket.on("requestOtherPlayerAssassinated", (data) => {
    socket.emit("otherPlayerAssassinated", {
      player: "player name",
      target: "target name",
    });
  });
  socket.on("requestGameEnd", (data) => {
    socket.emit("gameEnd");
  });

  // //Sending an object when emmiting an event
  // socket.emit("serverEvent", {
  //   description: "A custom event from the server!",
  // });

  // //Handle a custom event from the client
  // socket.on("clientEvent", (data) => {
  //   console.log(data);
  // });
});

http.listen(3001, function () {
  console.log("listening on *:3001");
});
