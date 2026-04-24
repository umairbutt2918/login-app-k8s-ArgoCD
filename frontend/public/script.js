//const API = "http://localhost:5000";
//const API = "http://backend-service:5000";
//const API = "http://127.0.0.1:49896";
const API = "/api";
//const API = "http://localhost:5000";

function signup() {
  const username = document.getElementById("username").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  fetch(API + "/signup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ username, email, password })
  })
  .then(res => res.text())
  .then(data => {
    alert(data);
    window.location.href = "login.html";
  });
}

function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  fetch(API + "/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      localStorage.setItem("token", data.token); // ✅ FIX
      window.location.href = "index.html";
    } else {
      alert("Invalid login");
    }
  });
}

function logout() {
  localStorage.removeItem("token"); // ✅ FIX
  window.location.replace("login.html");
}