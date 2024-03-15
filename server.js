const express = require("express");
const mysql = require("mysql2/promise");
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// !! DOCUMENTATION !!

app.get("/", function (_req, res) {
  res.send(`
  <style>  
    p {
      font-size: 20px;
    }

    span {
      font-weight: bold;
    }
    
    </style>
    <h1>API DOCUMENTATION</h1>
    <h2>GET</h2>
    <ul>
      <li><p><span>/ :</span> Send out this API documentation</p></li>
      <li><p><span>/users :</span> Send out all users in the database</p></li>
      <li><p><span>/users/:username_id :</span> Send out a specific user by id or username</p></li>
      <li><p><span>/users/last_name/?username_id= :</span> Send out a specific user by username</p></li>
      <li><p><span>/users/db_dummydata/:amount :</span> Insert dummy data into the users table, the amount parameter is required and should be an integer</p></li>
    </ul>
    <h2>POST</h2>
    <ul>
      <li><p><span>/insert :</span> Insert dummy data into the users table, the data should be sent as a json object with the following keys: username (varchar 255), first_name (varchar 255), last_name (varchar 255), password(varchar 255 or null as standerd value)</p></li>
    </ul>
  `);
});

//& CREATE SQL STRING
async function createSQLString(queryParameters) {
  if (Object.keys(queryParameters).length == 0) {
    return "SELECT * FROM users";
  }

  let sql = "SELECT * FROM users WHERE ";

  for (const [key, value] of Object.entries(queryParameters)) {
    sql += `${key} = '${value}' AND `;
  }

  return sql.slice(0, -5);
}

//& CREATE CONNECTION
async function createConnectionToDataBase() {
  return mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "restapi",
  });
}

//* VALADATION FUNCTIONS

//! VALIDATE USER
async function userInDatabaseById(id) {
  let connection = await createConnectionToDataBase();

  let sql = `SELECT * FROM users WHERE id = ${id} `;

  let [result] = await connection.execute(sql);

  if (result.length > 0) {
    return false; // Data does exists
  }

  return true; // Data does not exist
}

//! VALIDATE USERNAME
async function userInDatabaseByUsername(username) {
  let connection = await createConnectionToDataBase();

  let sql = ` SELECT * FROM users WHERE username = '${username}'`;

  let [result] = await connection.execute(sql);

  if (result.length > 0) {
    return true; // Data already exists
  }
  return false; // Data does not exist
}

//! VALIDATE USER DATA
function isInvalidUserData(body) {
  return !(
    body &&
    body.username &&
    body.first_name &&
    body.last_name &&
    body.password
  );
}

//! VALIDATE FORMATED DATA
function isInvalidFormatedData(body) {
  if (
    typeof body.username != "string" ||
    typeof body.first_name != "string" ||
    typeof body.last_name != "string" ||
    typeof body.password != "string"
  ) {
    return true;
  }
  return false;
}

//! VALIDATE USER DATA FOR UPDATING USER
function isInvalidUserDataForUpdating(body) {
  if (
    typeof body.username != "string" ||
    typeof body.first_name != "string" ||
    typeof body.last_name != "string"
  ) {
    return true;
  }
  return false;
}

//? GET ALL USERS IN THE DATABASE
app.get("/users", async function (_req, res) {
  let connection = await createConnectionToDataBase();
  let sql = await createSQLString(_req.query);
  console.log(sql);
  let [result] = await connection.execute(sql);

  if (result.length == 0) {
    // send out to the user that the user in the database do not exist
    res.json({ error: "User not found", statusbar: 404 });
  }
  res.json(result);
});

//? GET ONE USER BY ID OR USERNAME
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

//? GET ONE USER BY USERNAME
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

//? GET CREATE DUMMY SQL DATA
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
      let sql = `
      INSERT INTO users 
      (username, first_name, last_name, password) VALUES 
      ('username_${i}', 'first_name_${i}', 'last_name_${i}', 'password_${i}')`;

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

//~  POSTS inserting a new user
app.post("/users", async function (_req, res) {
  try {
    let connection = await createConnectionToDataBase();
    if (isInvalidUserData(_req.body)) {
      res
        .status(404)
        .json({ error: "Invalid formated user data", statusbar: 404 });
      return;
    }

    if (isInvalidFormatedData(_req.body)) {
      res.status(404).json({ error: "Invalid formated data", statusbar: 404 });
      return;
    }

    if (await userInDatabaseByUsername(_req.body.username)) {
      res.status(400).json({ error: "Bad request", statusbar: 400 });
      return;
    }

    let sql = `
      INSERT INTO users
      (username, first_name, last_name, password) VALUES
      (?,?, ?,?)`;
    await connection.execute(sql, [
      _req.body.username,
      _req.body.first_name,
      _req.body.last_name,
      _req.body.password,
    ]);

    res.json({ serverMessage: "User inserted", statusbar: 200 });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal Server Error", statusbar: 500 });
  }
});

//^ PUTS updating a user
app.put("/users/:id", async function (_req, res) {
  try {
    let connection = await createConnectionToDataBase();

    //! VALIDATE USER DATA FOR UPDATING USER
    if (isInvalidUserDataForUpdating(_req.body)) {
      res.status(404).json({ error: "Invalid formated data", statusbar: 404 });
      return;
    }

    //! VALIDATE USER EXISTENCE IN DATABASE
    if (await userInDatabaseById(_req.params.id)) {
      res.status(404).json({ error: "User not found", statusbar: 404 });
      return;
    }

    //! VALIDATE USERNAME
    if (await userInDatabaseByUsername(_req.body.username)) {
      res
        .status(400)
        .json({ error: "A username already exists", statusbar: 400 });
      return;
    }
    res.status(200).json({ serverMessage: "User updated", statusbar: 200 });

    let sql = `
    UPDATE users
    SET username = ?, first_name = ?, last_name = ?
    WHERE id = ?`;

    await connection.execute(sql, [
      _req.body.username,
      _req.body.first_name,
      _req.body.last_name,
      _req.params.id,
    ]);
    res.json({ serverMessage: "User updated", statusbar: 200 });
  } catch (error) {
    console.log(error);
    res.json({ error: "Internal Server Error Try ", statusbar: 500 });
  }
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
