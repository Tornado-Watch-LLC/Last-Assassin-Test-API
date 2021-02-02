//const api_url = "http://lastapi.stevenrummler.com/";
const api_url = "http://localhost:3000/";

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
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}

function Start() {
  const code = document.getElementById("scode").value;
  const request = {
    Game: code,
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
  const timestamp = document.getElementById("timestamp").value;
  const request = {
    Game: code,
    Player: name,
    Latitude: lat,
    Longitude: long,
    Timestamp: timestamp,
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
