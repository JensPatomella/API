let express = require("express");
let app = express();
app.listen(3000);
console.log("Servern körs på port 3000");

app.get("/", function (req, res) {
  res.sendFile(__dirname + "/dokumentation.html");
});

const mysql = require("mysql");
con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "webbserverprogrammering2",
});

app.use(express.json());

const crypto = require("crypto");
function hash(data) {
  const hash = crypto.createHash("sha256");
  hash.update(data);
  return hash.digest("hex");
}


const jwt = require("jsonwebtoken");
const secret = "EnHemlighetSomIngenKanGissaXyz123%&/";

function isloggedin(req) {
  let authHeader = req.headers["authorization"];
  if (authHeader === undefined) {
    return false;
  }
  let token = authHeader.slice(7);
  try {
    decoded = jwt.verify(token, secret);
  } catch (err) {
    return false;
  }
  sql = `SELECT * FROM users WHERE userId='${decoded.userId}'`;
  con.query(sql, function (err, result, fields) {
    if (err) {
      return false;
    }
    if (result.length > 0) {
      return true;
    } else {
      return false;
    }
  }
  );
}

app.post("/users", function (req, res) {
  if (!req.body.userId) {
    res.status(400).send("userId required!");
    return;
  }
  let fields = ["firstname", "lastname", "userId", "passwd"];
  for (let key in req.body) {
    if (!fields.includes(key)) {
      res.status(400).send("Unknown field: " + key);
      return;
    }
  }
  
  let sql = `INSERT INTO users (firstname, lastname, userId, passwd)
    VALUES (?, ?, ?, '${hash(req.body.passwd)}')`;
  console.log(sql);

  con.query(sql, [req.body.firstname, req.body.lastname, req.body.userId], function (err, result, fields) {
    if (err) throw err;
    console.log(result);
    let output = {
      id: result.insertId,
      firstname: req.body.firstname,
      lastname: req.body.lastname,
      userId: req.body.userId,
    };
    res.send(output);
  });
});

app.post("/login", function (req, res) {
  console.log(req.body);
  let sql = `SELECT * FROM users WHERE userId=?`;

  con.query(sql, [req.body.userId], function (err, result, fields) {
    if (err) throw err;
    let passwordHash = hash(req.body.passwd);
    if (result[0].passwd == passwordHash) {
      let payload = {
        sub: result[0].userId,
        name: result[0].firstname,
        lastname: result[0].lastname,
      };
      let token = jwt.sign(payload, secret);
      res.json(token);
    } else {
      res.sendStatus(401);
    }
  });
});

app.put("/users/:id", function (req, res) {
  if (!(req.body && req.body.firstname && req.body.lastname && req.body.userId && req.body.passwd)) {
    res.sendStatus(400);
    return;
  }
  let sql = `UPDATE users 
        SET firstname = ?, lastname = ?, userId = ?, passwd = ?
        WHERE id = ?`;
  con.query(
    sql,
    [req.body.firstname, req.body.lastname, req.body.userId, req.body.passwd, req.params.id],
    function (err, result) {
      if (err) {
        throw err;
      } else {
        res.sendStatus(200);
      }
    }
  );
});

app.get("/users", function (req, res) {
  let sql = "SELECT * FROM users";
  let condition = createCondition(req.query);
  console.log(sql + condition);
  con.query(sql + condition, function (err, result, fields) {
    res.send(result);
  });
});

let createCondition = function (query) {
  console.log(query);
  let output = " WHERE ";
  for (let key in query) {
    if (COLUMNS.includes(key)) {
      output += `${key}="${query[key]}" OR `;
    }
  }
  if (output.length == 7) {
    return "";
  } else {
    return output.substring(0, output.length - 4);
  }
};

app.get("/users/:id", function (req, res) {
  let sql = "SELECT * FROM users WHERE id=" + req.params.id;
  console.log(sql);
  con.query(sql, function (err, result, fields) {
    if (result.length > 0) {
      res.send(result);
    } else {
      res.sendStatus(404);
    }
  });
});