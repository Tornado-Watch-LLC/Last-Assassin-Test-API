const api_url = "http://lastapi.stevenrummler.com/";
//const api_url = "http://localhost:3000/";

function Create() {
  fetch(api_url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  })
    .then((response) => {
      console.log("Response: ", response);
      return response.json();
    })
    .then((data) => {
      document.getElementById("create_result").innerHTML = JSON.stringify(data);
      // Set other game code inputs to this code.
      console.log(data);
      document.getElementById("scode").value = data.Game;
      document.getElementById("lcode").value = data.Game;
      document.getElementById("code").value = data.Game;
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}

function Start() {
  const code = document.getElementById("scode").value;
  const delay = document.getElementById("delay").value;
  const request = {
    Game: code,
    Delay: delay,
  };
  fetch(api_url, {
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
      document.getElementById("start_result").innerHTML = JSON.stringify(data);
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}

function Lobby() {
  const code = document.getElementById("lcode").value;
  const name = document.getElementById("lname").value;
  document.getElementById("name").value = name;
  const request = {
    Game: code,
    Player: name,
  };
  fetch(api_url, {
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
      document.getElementById("lobby_result").innerHTML = JSON.stringify(data);
    })
    .catch((error) => {
      console.error("Error:", error);
    });
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
  fetch(api_url, {
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
      document.getElementById("game_result").innerHTML = JSON.stringify(data);
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}
