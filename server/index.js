const express = require("express");
const fetch = require('node-fetch');
const _ = require("lodash");
const uuid = require("node-uuid");
const bodyParser = require("body-parser");
const session = require("cookie-session");
const app = express();
const { Pool } = require("pg");
const readSgf = require('./readSgf');


let pool;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });
} else {
  pool = new Pool({
    user: "dbuser",
    host: "localhost",
    database: "db",
    password: "password",
    port: 5433,
  });
}

const sess = {
  keys: [process.env.COOKIE_KEY || "RANDOLM"],
  httpOnly: false,
  sameSite: "none",
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

app.use(bodyParser.json());
app.use(session(sess));
app.use(express.static("build"));

const port = process.env.PORT || 3010;

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "http://localhost:3000");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Set-Cookie"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST");
  res.header("Access-Control-Allow-Credentials", "true");
  next();
});

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1); // trust first proxy
  sess.secure = true;
}

app.get("/api/loggedIn", (req, res) => {
  res.json({
    loggedIn: req.session.uuid !== undefined,
    isAdmin: req.session.isAdmin,
  });
});

app.get("/api/board", async (req, res) => {
  const gameIndex = req.query.gameIndex;
  const client = await pool.connect();
  if (gameIndex) {
    const result = await client.query(
      "select sgf from game where gameId = $1",
      [gameIndex]
    );
    if (result.rows.length) {
      const sgfText = result.rows[0].sgf;
      res.json(readSgf(sgfText));
    } else {
      res.json(null);
    }
  } else {
    res.json(null);
  }
  client.release();
});

app.post("/api/level", (req, res) => {
  req.session.level = req.body.level;
  req.session.uuid = uuid();
  res.send("Ok");
});

app.post("/api/index", async (req, res) => {
  const client = await pool.connect();
  const { gameIndex, lastMove } = req.body;
  if (!req.session.isAdmin || !gameIndex || lastMove === undefined) {
    res.json(null);
  } else {
    const result = await client.query(
      "Select lastMove from game where gameId = $1",
      [gameIndex]
    );
    if (result.rows.length >= 1) {
      const result = await fetch(`https://online-go.com/api/v1/games/${gameIndex}/sgf`);
      const sgfText = (await result.text());
      await client.query(
        "UPDATE game set lastmove=$1, sgf=$3 where gameId = $2",
        [lastMove, gameIndex, sgfText]
      );
    } else {
      const result = await fetch(`https://online-go.com/api/v1/games/${gameIndex}/sgf`);
      const sgfText = (await result.text());
      await client.query("INSERT INTO game VALUES ($2, $1, $3)", [
        lastMove,
        gameIndex,
        sgfText,
      ]);
    }
    res.json(null);
  }
  client.release();
});

app.post("/api/move", async (req, res) => {
  const { gameId, move } = req.body;
  const client = await pool.connect();
  const result = await client.query(
    "Select lastMove from game where gameId = $1",
    [gameId]
  );

  if (!result.rows.length) {
    res.status(400);
  }
  const lastmove = result.rows[0].lastmove;

  const existing = await client.query(
    "SELECT from move where playerId=$1 AND moveNumber=$2 AND gameId=$3",
    [req.session.uuid, lastmove, gameId]
  );
  if (existing.rows.length) {
    res.json({ done: true });
  } else {
    await client.query("INSERT INTO move VALUES ($1, $2, $3, $4, $5)", [
      req.session.uuid,
      gameId,
      move,
      req.session.level,
      lastmove,
    ]);
    res.json({ done: true });
  }
  client.release();
});

app.get("/api/moves", async (req, res) => {
  const gameIndex = req.query.gameIndex;
  const client = await pool.connect();
  if (!req.session.isAdmin || !gameIndex) {
    res.json({ moves: null });
  } else {
    const result = await client.query(
      "Select lastMove from game where gameId = $1",
      [gameIndex]
    );
    if (result.rows.length >= 1) {
      const result2 = await client.query(
        "Select move from move where gameId = $1 and moveNumber = $2",
        [gameIndex, result.rows[0].lastmove]
      );
      const moves = result2.rows.map((el) => el.move);

      _.groupBy(moves);

      const output = _.sortBy(
        Object.entries(_.mapValues(_.groupBy(moves), (el) => el.length)),
        (el) => -el[1]
      );
      res.json({ moves: output, lastMove: result.rows[0].lastmove });
    } else {
      res.json({ moves: null, lastMove: null });
    }
  }
  client.release();
});

app.get("/api/SECRET_ADMIN", (req, res) => {
  req.session.isAdmin = true;
  res.send("Ok");
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
