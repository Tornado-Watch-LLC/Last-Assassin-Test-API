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
  const name = document.getElementById("hname").value;
  const mode = document.getElementById("mode").value;
  const delay = document.getElementById("delay").valueAsNumber;
  const attempt_cd = document.getElementById("attempt_cd").valueAsNumber;
  const tag_cd = document.getElementById("tag_cd").valueAsNumber;
  const tag_distance = document.getElementById("tag_distance").valueAsNumber;
  const lag_distance = document.getElementById("lag_distance").valueAsNumber;
  const request = {
    Game: code,
    Player: name,
    Mode: mode,
    Delay: delay,
    AttemptCD: attempt_cd,
    TagCD: tag_cd,
    TagDistance: tag_distance,
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
  const lat = document.getElementById("hlat").valueAsNumber;
  const long = document.getElementById("hlong").valueAsNumber;
  const request = {
    Game: code,
    Player: name,
    HomeLat: lat,
    HomeLong: long,
  };
  call(request, "start", "start_result");
}

function Game() {
  const code = document.getElementById("code").value;
  const name = document.getElementById("name").value;
  const lat = document.getElementById("lat").valueAsNumber;
  const long = document.getElementById("long").valueAsNumber;
  const request = {
    Game: code,
    Player: name,
    Latitude: lat,
    Longitude: long,
  };
  call(request, "game", "game_result");
}

function Tag() {
  const code = document.getElementById("acode").value;
  const name = document.getElementById("aname").value;
  const request = {
    Game: code,
    Player: name,
  };
  call(request, "tag", "tag_result");
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
  console.log("Request:", request);
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
      if (response.status == 200) {
        return response.json();
      } else if (response.status == 204) {
        return JSON.parse('{"Empty":"Response"}');
      }
    })
    .then((data) => {
      document.getElementById(result).innerHTML = JSON.stringify(data);
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}
