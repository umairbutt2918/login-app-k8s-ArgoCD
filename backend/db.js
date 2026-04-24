const mysql = require("mysql2");

const db = mysql.createPool({
  host: "mysql-service",
  user: "root",
  password: "12345678",
  database: "loginapp",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = db;