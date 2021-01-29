const api_url = "http://la-testapi-rest.stevenrummler.com/";

function Register() {
  const fname = document.getElementById("fname").value;
  const lname = document.getElementById("lname").value;
  const username = document.getElementById("r_username").value;
  const password = document.getElementById("r_password").value;
  const request = {
    firstName: fname,
    lastName: lname,
    username: username,
    password: password,
  };
  fetch(api_url + "register", {
    method: "POST",
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
      Accept: "*/*",
    },
    body: JSON.stringify(request),
  })
    .then((response) => {
      console.log("Response: ", response);
      return response.json();
    })
    .then((data) => {
      document.getElementById("register_result").innerHTML =
        "Response: " + JSON.stringify(data);
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}

function Login() {
  const username = document.getElementById("l_username").value;
  const password = document.getElementById("l_password").value;
  const request = {
    username: username,
    password: password,
  };
  fetch(api_url + "login", {
    method: "POST",
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
      Accept: "*/*",
    },
    body: JSON.stringify(request),
  })
    .then((response) => {
      console.log("Response: ", response);
      return response.json();
    })
    .then((data) => {
      document.getElementById("login_result").innerHTML =
        "Response: " + JSON.stringify(data);
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}

function Logout() {
  const username = document.getElementById("o_username").value;
  const token = document.getElementById("o_token").value;
  const request = {
    username: username,
    token: token,
  };
  fetch(api_url + "logout", {
    method: "POST",
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
      Accept: "*/*",
    },
    body: JSON.stringify(request),
  })
    .then((response) => {
      console.log("Response: ", response);
      return response.json();
    })
    .then((data) => {
      document.getElementById("logout_result").innerHTML =
        "Response: " + JSON.stringify(data);
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}

function Stats() {
  const username = document.getElementById("s_username").value;
  const token = document.getElementById("s_token").value;
  const request = {
    username: username,
    token: token,
  };
  fetch(api_url + "stats", {
    method: "POST",
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
      Accept: "*/*",
    },
    body: JSON.stringify(request),
  })
    .then((response) => {
      console.log("Response: ", response);
      return response.json();
    })
    .then((data) => {
      document.getElementById("stats_result").innerHTML =
        "Response: " + JSON.stringify(data);
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}
