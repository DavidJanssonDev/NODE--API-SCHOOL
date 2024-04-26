const express = require("express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = express();
const port = 9000;
const amountOfRange = Math.floor(Math.random()) + 1;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

//! DOCUMENTATION
app.get("/", function (_req, res) {
  res.send(`
  <style>  
    p {
      font-size: 20px;
    }

    span {
      font-weight: bold;
    }
    
    .option-text,  h2 {
      text-decoration: underline;
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
      <li><p><span>/uppgift1 :</span> Send out a hello world message with a listening port</p></li>
      <li><p><span>/uppgift2/name/:username/age/:age :</span> Send out a json object with the given username and age parameters</p></li>
    </ul>
    <h2>PUT</h2>
    <ul>
      <li>
          <p>
            <span>/users/:id :</span>
            Update a user in the database, the user data should be sent as a json object with the following keys:
          </p>
          <ul>
            <li><p> <span class="option-text"> username parameter </span> (varchar 255) </p></li>
            <li><p> <span class="option-text"> first_name parameter </span> (varchar 255)</p> </li>
            <li><p> <span class="option-text"> last_name parameter </span> (varchar 255)</p> </li>
            <li><p> <span class="option-text"> password parameter </span>(varchar 255 or null as standerd value)</p> </li> 
            <li><p> <span class="option-text"> ID parameter </span>  is required and should be a valid user id</p></li>
          </ul>
      </li>
    </ul>
    <h2>POST</h2>
    <ul>
      <li>
        <p><span>/login : </span> Log in, the data should be sent as a json object with the following keys: </span></p>
        <ul>
          <li><p> <span class="option-text"> username parameter </span> (varchar 255) </p></li>
          <li><p> <span class="option-text"> password parameter </span> (varchar 255) </p></li>
        </ul>
      </li>
      <li><p><span>/insert :</span> Insert data into the users table, the data should be sent as a json object with the following keys:</p>
        <ul>
          <li><p><span class="option-text"> username parameter </span> (varchar 255) </p></li>
          <li><p><span class="option-text"> first_name parameter </span> (varchar 255) </p></li>
          <li><p><span class="option-text"> last_name parameter </span> (varchar 255) </p></li>
          <li><p><span class="option-text"> password parameter </span> (varchar 255) </p></li>
      </li>
    </ul>
  `);
});

//& CREATE SQL STRING
async function createSQLString(queryParameters) {
  if (Object.keys(queryParameters).length == 0) {
    return "SELECT * FROM users";
  }

  const sql = "SELECT * FROM users WHERE ";

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

//region VALADATION FUNCTIONS

//! VALIDATE USER
async function userInDatabaseById(id) {
  const connection = await createConnectionToDataBase();

  const sql = `SELECT * FROM users WHERE id = ${id} `;

  let [result] = await connection.execute(sql);

  if (result.length > 0) {
    return false; // Data does exists
  }

  return true; // Data does not exist
}

//! VALIDATE USERNAME
async function userInDatabaseByUsername(username) {
  const connection = await createConnectionToDataBase();

  const sql = ` SELECT * FROM users WHERE username = '${username}'`;

  let [result] = await connection.execute(sql);

  if (result.length > 0) {
    return true; // Data already exists
  }
  return false; // Data does not exist
}

//! VALIDATE USER DATA
function isValidUserData(body) {
  return (
    body && body.username && body.first_name && body.last_name && body.password
  );
}

//! VALIDATE FORMATED DATA
function isValidFormatedData(body) {
  for (let i = 0; i < body.length; i++) {
    let element = body[i].username;
    console.log(`
      username: ${element},    
    `);
  }

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
function isValidUserDataForUpdating(body) {
  console.log(typeof body.username);
  console.log(typeof body.last_name);
  console.log(typeof body.first_name);
  if (
    typeof body.username == "string" &&
    typeof body.first_name == "string" &&
    typeof body.last_name == "string"
  ) {
    console.log("User data is valid");
    return false;
  }
  console.log("User data is not valid");
  return true;
}

//! VALIDATE USER TOKEN
async function isValidToken(token, role_required) {
  if (token === undefined) {
    return { message: "Auth header not found", statusbar: 401, valid: false };
  }

  let decoded_token = jwt.verify(token.slice(7), "secret of secrets");

  for (let i = 0; i < role_required.length; i++) {
    if (decoded_token.role === role_required[i]) {
      return { statusbar: 200, valid: true };
    }
  }

  return {
    message: "Auth header do not have access",
    statusbar: 401,
    valid: false,
  };
}

//region GET

//? GET ALL USERS IN THE DATABASE [ADMIN, STANDARD]
app.get("/users", async function (_req, res) {
  const ROLE_REQUIREMENT = ["admin", "standard"];
  const { message, statusbar, valid } = await isValidToken(
    _req.headers["authorization"],
    ROLE_REQUIREMENT
  );
  if (!valid && statusbar !== 200) {
    res.status(statusbar).json({ error: message, statusbar: 401 });
    return;
  }

  const connection = await createConnectionToDataBase();
  const sql = await createSQLString(_req.query);

  let [result] = await connection.execute(sql);

  if (result.length == 0) {
    // send out to the user that the user in the database do not exist
    res.status(404).json({ error: "User not found", statusbar: 404 });
  }
  res.json(result);
});

//? GET ONE USER BY ID OR USERNAME [ADMIN, STANDARD]
app.get("/users/:username_id", async function (_req, res) {
  const ROLE_REQUIREMENT = ["admin", "standard"];
  const { message, statusbar, valid } = await isValidToken(
    _req.headers["authorization"],
    ROLE_REQUIREMENT
  );
  if (!valid && statusbar !== 200) {
    res.status(statusbar).json({ error: message, statusbar: 401 });
    return;
  }

  const connection = await createConnectionToDataBase();
  const sql = `
  SELECT * FROM users 
  WHERE username = '${_req.params.username_id}' OR
  id = "${_req.params.username_id}"
  `;

  let [result] = await connection.execute(sql);

  if (result.length == 0) {
    // send out to the user that the user in the database do not exist
    res.status(404).json({ error: "User not found", statusbar: 404 });
  }
  res.json(result);
});

//? GET ONE USER BY USERNAME [ADMIN, STANDARD]
app.get("/users/last_name/", async function (_req, res) {
  const ROLE_REQUIREMENT = ["admin", "standard"];
  const { message, statusbar, valid } = await isValidToken(
    _req.headers["authorization"],
    ROLE_REQUIREMENT
  );
  if (!valid && statusbar !== 200) {
    res.status(statusbar).json({ error: message, statusbar: 401 });
    return;
  }

  const connection = await createConnectionToDataBase();
  const sql = `SELECT * FROM users WHERE username = '${_req.query.username_id}'`;

  let [result] = await connection.execute(sql);

  if (result.length == 0) {
    res.status(404).json({ error: "User not found", statusbar: 404 });
  }
  res.json(result);
});

//? GET CREATE DUMMY SQL DATA [ADMIN ONLY]
app.get("/users/db_dummydata/:amout", async function (_req, res) {
  const ROLE_REQUIREMENT = ["admin"];

  const { message, statusbar, valid } = await isValidToken(
    _req.headers["authorization"],
    ROLE_REQUIREMENT
  );
  if (!valid && statusbar !== 200) {
    res.status(statusbar).json({ error: message, statusbar: 401 });
    return;
  }

  //* CREATE DUMMY SQL DATA
  const connection = await createConnectionToDataBase();
  const sql = "SELECT * FROM users";

  let [result] = await connection.execute(sql);

  if (result.length == 0) {
    console.log("DB IS EMPTY, INSERTING DATA");
    for (let i = 1; i < _req.params.amout; i++) {
      //* CREATE DUMMY SQL DATA
      const sql = `
      INSERT INTO users 
      (username, first_name, last_name, password) VALUES 
      ('username_${i}', 'first_name_${i}', 'last_name_${i}', 'password_${i}')`;

      //* INSERT DUMMY SQL DATA
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

//region POST
//~ POSTS inserting a new user [ADMIN, STANDARD]
app.post("/users", async function (_req, res) {
  const ROLE_REQUIREMENT = ["admin", "standerd"];

  const { message, statusbar, valid } = await isValidToken(
    _req.headers["authorization"],
    ROLE_REQUIREMENT
  );
  if (!valid && statusbar !== 200) {
    res.status(statusbar).json({ error: message, statusbar: 401 });
    return;
  }

  try {
    const connection = await createConnectionToDataBase();
    if (!isValidUserData(_req.body)) {
      res
        .status(404)
        .json({ error: "Invalid formated user data", statusbar: 404 });
      return;
    }
    console.log("User data is valid");

    if (!isValidFormatedData(_req.body)) {
      res.status(404).json({ error: "Invalid formated data", statusbar: 404 });
      return;
    }
    console.log("Formated data is valid");

    if (await userInDatabaseByUsername(_req.body.username)) {
      res.status(400).json({ error: "Bad request", statusbar: 400 });
      return;
    }
    console.log("Username is not in database");

    const sql = `
      INSERT INTO users
      (username, first_name, last_name, password) VALUES
      (?,?, ?,?)
      `;

    let amountOfSalt = Math.floor(Math.random() * amountOfRange) + 1;
    let crypt_password = await bcrypt.hash(_req.body.password, amountOfSalt);

    await connection.execute(sql, [
      _req.body.username,
      _req.body.first_name,
      _req.body.last_name,
      crypt_password,
    ]);

    res.json({ message: "User inserted", statusbar: 200 });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal Server Error", statusbar: 500 });
  }
});

//~ POST login [LOGIN]
app.post("/login", async function (_req, res) {
  const connection = await createConnectionToDataBase();

  const sql = `SELECT * FROM users WHERE username = '${_req.body.username}'`;
  const [result] = await connection.execute(sql);

  if (result.length == 0) {
    res.status(404).json({ error: "Unauthorized", statusbar: 404 });
    return;
  }

  const isPasswordValid = await bcrypt.compare(
    _req.body.password,
    result[0].password
  );

  if (!isPasswordValid) {
    res.status(404).json({ error: "Unauthorized", statusbar: 404 });
    return;
  }
  let { id, username, role } = result[0];

  const jwt_paylod = {
    sub: id,
    name: username,
    role: role,
  };

  res.json({
    serverMessage: "User Loged in",
    toke: jwt.sign(jwt_paylod, "secret of secrets"),
    statusbar: 200,
    user: {
      id: result[0].id,
      username: result[0].username,
      first_name: result[0].first_name,
      last_name: result[0].last_name,
    },
  });
});

//region PUTS updating a user [ADMIN ONLY]
app.put("/users/:id", async function (_req, res) {
  const ROLE_REQUIREMENT = ["admin"];

  const { message, statusbar, valid } = await isValidToken(
    _req.headers["authorization"],
    ROLE_REQUIREMENT
  );
  if (!valid && statusbar !== 200) {
    res.status(statusbar).json({ error: message, statusbar: 401 });
    return;
  }

  try {
    const connection = await createConnectionToDataBase();

    //! VALIDATE USER DATA FOR UPDATING USER
    if (isValidUserDataForUpdating(_req.body)) {
      res.status(404).json({ error: "Invalid formated data", statusbar: 404 });
      return;
    }

    //! VALIDATE USER EXISTENCE IN DATABASE
    if (await userInDatabaseById(_req.params.id)) {
      res.status(404).json({ error: "User not found", statusbar: 404 });
      return;
    }

    //! VALIDATE USERNAME
    if (await userInDatabaseById(_req.params.id)) {
      res
        .status(400)
        .json({ error: "A username already exists", statusbar: 400 });
      return;
    }

    const sql = `
    UPDATE users
    SET username = ?, first_name = ?, last_name = ?
    WHERE id = ?
    `;

    await connection.execute(sql, [
      _req.body.username,
      _req.body.first_name,
      _req.body.last_name,
      _req.params.id,
    ]);
    res.json({ message: "User updated", statusbar: 200 });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal Server Error", statusbar: 500 });
  }
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
