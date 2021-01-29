var socket = io("localhost:3001");

// Lobby Client -> Server Messages

function CreateLobby() {
  let data = {
    rule1: document.getElementById("rule1").value,
    rule2: document.getElementById("rule2").value,
    rule3: document.getElementById("rule3").value,
  };
  socket.emit("createLobby", data);
}
function JoinLobby() {
  let data = {
    code: document.getElementById("code").value,
  };
  socket.emit("joinLobby", data);
}
function LeaveLobby() {
  socket.emit("leaveLobby");
}
function UpdateRuleset() {
  let data = {
    rule1: document.getElementById("u_rule1").value,
    rule2: document.getElementById("u_rule2").value,
    rule3: document.getElementById("u_rule3").value,
  };
  socket.emit("updateRuleset", data);
}
function StartGame() {
  socket.emit("startGame");
}

// Lobby Server -> Client Messages

socket.on("rulesetUpdate", function (data) {
  document.getElementById("ruleset_update_message").innerHTML = data;
});
socket.on("otherPlayerJoinsLobby", function (data) {
  document.getElementById("other_player_joins_lobby_message").innerHTML = data;
});
socket.on("otherPlayerLeavesLobby", function (data) {
  document.getElementById("other_player_leaves_lobby_message").innerHTML = data;
});
socket.on("gameStart", function (data) {
  document.getElementById("game_start_message").innerHTML = data;
});

// The following functions are for the demo site and are not part of the actual API specification.
function RulesetUpdate() {
  socket.emit("requestRulesetUpdate");
}
function OtherPlayerJoinsLobby() {
  socket.emit("requestOtherPlayerJoinsLobby");
}
function OtherPlayerLeavesLobby() {
  socket.emit("requestOtherPlayerLeavesLobby");
}
function GameStart() {
  socket.emit("requestGameStart");
}
// End non-API functions

// In-Game Client -> Server Messages

function SendLocation() {
  let data = {
    lat: document.getElementById("lat").value,
    long: document.getElementById("long").value,
  };
  socket.emit("sendLocation", data);
}
function UsePowerup() {
  let data = {
    powerup: document.getElementById("powerup").value,
  };
  socket.emit("usePowerup", data);
}
function AttemptAssassination() {
  socket.emit("attemptAssassination");
}

// In-Game Server -> Client Messages

socket.on("receiveTarget", function (data) {
  document.getElementById("recieve_target_message").innerHTML = data;
});
socket.on("targetLocation", function (data) {
  document.getElementById("target_location_message").innerHTML = data;
});
socket.on("youWereAssassinated", function (data) {
  document.getElementById("you_were_assassinated_message").innerHTML = data;
});
socket.on("otherPlayerAssassinated", function (data) {
  document.getElementById("other_player_assassinated_message").innerHTML = data;
});
socket.on("gameEnd", function (data) {
  document.getElementById("game_end_message").innerHTML = data;
});

// The following functions are for the demo site and are not part of the actual API specification.
function RecieveTarget() {
  socket.emit("requestRecieveTarget");
}
function TargetLocation() {
  socket.emit("requestTargetLocation");
}
function YouWereAssassinated() {
  socket.emit("requestYouWereAssassinated");
}
function OtherPlayerAssassinated() {
  socket.emit("requestOtherPlayerAssassinated");
}
function GameEnd() {
  socket.emit("requestGameEnd");
}
// End non-API functions

// socket.on("message", function (data) {
//   document.getElementwrite(data);
//   document.write("<br/>");
// });
// socket.on("serverEvent", function (data) {
//   document.write(data.description);
//   document.write("<br/>");
// });
// socket.on("broadcast", function (data) {
//   document.write(data.description);
//   document.write("<br/>");
// });
// socket.on("newclientconnect", function (data) {
//   document.write(data.description);
//   document.write("<br/>");
// });
// setTimeout(function () {
//   //Emit a client event and send an object with it
//   socket.emit("clientEvent", {
//     description: "A custom event from the client!",
//   });
// }, 6000);
