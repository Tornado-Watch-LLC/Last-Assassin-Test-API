const api_url = "https://api.lastassassin.app/";
//const api_url = "http://localhost:3001/";

function Create() {
  const host = document.getElementById("host").value;
  const request = {
    Host: host,
  };
  call(request, "create", "create_result");
}

function Host() {
  const code = document.getElementById("hcode").value;
  const name = document.getElementById("lname").value;
  const mode = document.getElementById("mode").value;
  const delay = document.getElementById("delay").value;
  const attempt_cd = document.getElementById("attempt_cd").value;
  const kill_cd = document.getElementById("kill_cd").value;
  const kill_distance = document.getElementById("kill_distance").value;
  const lag_distance = document.getElementById("lag_distance").value;
  const request = {
    Game: code,
    Player: name,
    Mode: mode,
    Delay: delay,
    AttemptCD: attempt_cd,
    KillCD: kill_cd,
    KillDistance: kill_distance,
    LagDistance: lag_distance,
  };
  call(request, "host", "host_result");
}

function Lobby() {
  const code = document.getElementById("lcode").value;
  const name = document.getElementById("lname").value;
  const request = {
    Game: code,
    Player: name,
  };
  call(request, "lobby", "lobby_result");
}

function Start() {
  const code = document.getElementById("scode").value;
  const name = document.getElementById("sname").value;
  const lat = document.getElementById("hlat").value;
  const long = document.getElementById("hlong").value;
  const request = {
    Game: code,
    Player: name,
    HomeLat: lat,
    HomeLong: long,
  };
  console.log(request);
  call(request, "start", "start_result");
}

function Game() {
  const code = document.getElementById("code").value;
  const name = document.getElementById("name").value;
  const lat = document.getElementById("lat").value;
  const long = document.getElementById("long").value;
  const request = {
    Game: code,
    Player: name,
    Latitude: lat,
    Longitude: long,
  };
  call(request, "game", "game_result");
}

function Kill() {
  const code = document.getElementById("acode").value;
  const name = document.getElementById("aname").value;
  const request = {
    Game: code,
    Player: name,
  };
  call(request, "kill", "kill_result");
}

function Verify() {
  const code = document.getElementById("vcode").value;
  const name = document.getElementById("vname").value;
  const hunter = document.getElementById("hunter").value;
  const verify = document.getElementById("verify").value;
  const request = {
    Game: code,
    Player: name,
    Hunter: hunter,
    Accept: verify,
  };
  call(request, "verify", "verify_result");
}

function call(request, route, result) {
  fetch(api_url + route, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(request),
  })
    .then((response) => {
      console.log("Response: ", response);
      return response.json();
    })
    .then((data) => {
      document.getElementById(result).innerHTML = JSON.stringify(data);
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}
