const express = require("express");
const { connectors } = require("googleapis/build/src/apis/connectors");
const mysql = require("mysql2/promise");
const app = express();
const port = 3000;

// ADD INTO THE DOC THE DATABASE INFORMATION AND DOCUMENTATION

const DOC = {
  "/uppgift1": `Hello World!, Lissening to port: ${port}`,

  "/uppgift2/name/:username/age/:age": "username and age",
  "/uppgift3": "query",
  "/database": `DATABASE INFORMATION: 
+  - Server: localhost
+  - User: root
+  - Password: root
+  - Database: node_school_db 
+  `,
};

// CTREATE DUMMY SQL DATA by this parameters username (varchar 255), fist_name (varchar 255), last_name (varchar 255), password(varchar 255 or null as standerd value) and add them in a dictonary called DUMMYDATA and each user is one key in the dictonary

const HOW_MANY_DUMMY_USERS = 10;

// !! DOCUMENTATION !!

function GenerateDocumentationString(DOC_VALUE) {
  let return_string = "WELLCOME TO THIS API, THIS IS THE DOCUMENTATION<br>";

  return_string += "{<br>";
  for (const [key, value] of Object.entries(DOC_VALUE)) {
    return_string += ` <p style="padding: 0px; margin: 0px; font-size: 16px">  ${key} : ${value} </p>`;
  }
  return_string += "}";
  return return_string;
}

app.get("/", function (_req, res) {
  res.send(GenerateDocumentationString(DOC));
});

async function createSQLString(queryParameters) {
  if (Object.keys(queryParameters).length == 0) {
    return "SELECT * FROM users";
  } else {
    let sql = "SELECT * FROM users WHERE ";

    for (const [key, value] of Object.entries(queryParameters)) {
      sql += `${key} = '${value}' AND `;
    }

    return sql.slice(0, -5);
  }
}
// ** DATABASE **
async function createConnectionToDataBase() {
  return mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "restapi",
  });
}

// GET ALL USERS IN THE DATABASE
app.get("/users", async function (_req, res) {
  let connection = await createConnectionToDataBase();
  let sql = await createSQLString(_req.query);
  let [result] = await connection.execute(sql);

  if (result.length == 0) {
    // send out to the user that the user in the database do not exist
    res.json({ error: "User not found", statusbar: 404 });
  }
  res.json(result);
});

// GET ONE USER BY ID OR USERNAME
app.get("/users/:username_id", async function (_req, res) {
  let con = await createConnectionToDataBase();
  let sql = `SELECT * FROM users WHERE username = '${_req.params.username_id}' OR id = "${_req.params.username_id}"`;
  let [result] = await con.execute(sql);

  if (result.length == 0) {
    // send out to the user that the user in the database do not exist
    res.json({ error: "User not found", statusbar: 404 });
  }
  res.json(result);
});

app.get("/users/last_name/", async function (_req, res) {
  let con = await createConnectionToDataBase();
  let sql = `SELECT * FROM users WHERE username = '${_req.query.username_id}'`;

  let [result] = await con.execute(sql);

  if (result.length == 0) {
    // send out to the user that the user in the database do not exist
    res.json({ error: "User not found", statusbar: 404 });
  }
  res.json(result);
});

// CREATE DUMMY SQL DATA
app.get("/users/db_dummydata/:amout", async function (_req, res) {
  console.log("HI DB_DUMMYDATA");
  // CREATE DUMMY SQL DATA
  let connection = await createConnectionToDataBase();
  let sql = "SELECT * FROM users";

  let [result] = await connection.execute(sql);

  if (result.length == 0) {
    console.log("DB IS EMPTY, INSERTING DATA");
    for (let i = 1; i < _req.params.amout; i++) {
      // CREATE DUMMY SQL DATA
      let sql = `INSERT INTO users (username, first_name, last_name, password) VALUES ('username_${i}', 'first_name_${i}', 'last_name_${i}', 'password_${i}')`;

      // INSERT DUMMY SQL DATA
      try {
        let [result] = await connection.execute(sql);
        res.redirect("/users");
      } catch (error) {
        throw error;
      }
    }
  }
  console.log("DB IS NOT EMPTY, NOT INSERTING DATA");
  res.redirect("/users");
});

app.get("/uppgift1", function (_req, res) {
  res.send("Hello World!, Lissening to port: " + port);
});

app.get("/uppgift2/name/:username/age/:age", function (req, res) {
  res.send(req.params);
});

app.get("/uppgift3", function (req, res) {
  res.send(req.query);
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
