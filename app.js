const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "userData.db");
let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`DB Error:${error.message}`);
    process.exit(1);
  }
};
initializeDbAndServer();

//POST(User Registration)
app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  let hashedPassword = null;

  if (password.length < 5) {
    response.status(400);
    response.send("Password is too short");
  } else {
    hashedPassword = await bcrypt.hash(password, 10);
    const selectUser = `
            SELECT
                *
            FROM
                user
            WHERE
                username = '${username}';
    `;
    const getUser = await db.get(selectUser);
    if (getUser === undefined) {
      const createUserQuery = `
            INSERT INTO
                user(username,name,password,gender,location)
            VALUES(
                 '${username}',
                 '${name}',
                 '${hashedPassword}',
                 '${gender}',
                 '${location}'
            );
        
        `;
      await db.run(createUserQuery);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("User already exists");
    }
  }
});

//POST(User Login)
app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `
            SELECT
                *
            FROM
                user
            WHERE
                username = '${username}';
    
    `;
  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      response.send("Login success!");
    } else {
      response.send("Invalid password");
    }
  }
});

//PUT(changing User Password)
app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const selectUser = `
        SELECT
            *
        FROM
            user
        WHERE
            username = '${username}';
  `;
  const dbUser = await db.get(selectUser);
  if (dbUser !== undefined) {
    const compareOldPassword = await bcrypt.compare(
      oldPassword,
      dbUser.password
    );
    if (compareOldPassword) {
      if (newPassword.length < 5) {
        response.status(400);
        response.send("Password is too short");
      } else {
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        const updatePasswordQuery = `
                    UPDATE 
                        user
                    SET
                        password = '${hashedNewPassword}';
                    WHERE
                        username = '${username}';
          
          `;
        const dbResponse = await db.run(updatePasswordQuery);
        response.send("Password updated");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  } else {
    response.status(400);
    response.send("Invalid User");
  }
});

module.exports = app;
