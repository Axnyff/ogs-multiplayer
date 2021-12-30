const express = require("express");
const request = require("./request");
const io = require("socket.io-client");
const fetch = require("node-fetch");
const _ = require("lodash");
const uuid = require("node-uuid");
const bodyParser = require("body-parser");
const session = require("cookie-session");
const app = express();
const { Pool } = require("pg");
const readSgf = require("./readSgf");

const io_config = {
  reconnection: true,
  reconnectionDelay: 750,
  reconnectionDelayMax: 10000,
  transports: ["websocket"],
  upgrade: false,
};
let player_id;
let auth;
const username = process.env.OGS_USERNAME;
let pool;
let comm_socket;

request("https://online-go.com/api/v0/login", {
  method: "POST",
  body: {
    username,
    password: process.env.OGS_PASSWORD,
  },
}).then(async (data) => {
  const {
    user_jwt: jwt,
    user: { id },
    chat_auth,
  } = data;
  player_id = id;
  auth = chat_auth;
  comm_socket = io("wss://online-go.com", io_config);
  await new Promise((res) => {
    comm_socket.on("connect", () => {
      res();
    });
  });
  comm_socket.emit("authenticate", {
    player_id,
    username,
    jwt,
    auth,
  });
  comm_socket.emit("chat/connect", {
    player_id,
    username,
    auth,
  });
});

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
  keys: [process.env.COOKIE_KEY || "RANDOM3"],
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
      "select sgf, lastmove from game where gameId = $1",
      [gameIndex]
    );
    if (result.rows.length) {
      const sgfText = result.rows[0].sgf;
      const moveNumber = result.rows[0].lastmove;
      try {
        const data = readSgf(sgfText);
        data.isCurrentTurn =
          data.lastPlayer === (username === data.black ? "W" : "B");
        data.lastMoveTime = timers[gameIndex];
        res.json({ ...data, moveNumber });
      } catch (e) {
        res.json(null);
      }
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
  res.json({});
});

const currentGames = {};
const timers = {};
const listenToGame = (game_id) => {
  if (currentGames[game_id] || !comm_socket) {
    return;
  }
  currentGames[game_id] = true;
  comm_socket.emit("game/connect", {
    player_id,
    game_id,
    chat: false,
  });
  comm_socket.on(`game/${game_id}/clock`, async (data) => {
    timers[game_id] = data.last_move;
  });
  comm_socket.on(`game/${game_id}/gamedata`, async (data) => {
    const move_number = data.moves.length;
    const client = await pool.connect();
    const result = await client.query(
      "Select lastMove from game where gameId = $1",
      [game_id]
    );
    if (result.rows.length >= 1) {
      const result = await fetch(
        `https://online-go.com/api/v1/games/${game_id}/sgf`
      );
      const sgfText = await result.text();
      await client.query(
        "UPDATE game set lastmove=$1, sgf=$3 where gameId = $2",
        [move_number, game_id, sgfText]
      );
    } else {
      const result = await fetch(
        `https://online-go.com/api/v1/games/${game_id}/sgf`
      );
      const sgfText = await result.text();
      await client.query("INSERT INTO game VALUES ($2, $1, $3)", [
        move_number,
        game_id,
        sgfText,
      ]);
    }
    client.release();
  });
  comm_socket.on(`game/${game_id}/move`, async (data) => {
    const { move_number } = data;
    const client = await pool.connect();
    const result = await client.query(
      "Select lastMove from game where gameId = $1",
      [game_id]
    );
    if (result.rows.length >= 1) {
      const result = await fetch(
        `https://online-go.com/api/v1/games/${game_id}/sgf`
      );
      const sgfText = await result.text();
      await client.query(
        "UPDATE game set lastmove=$1, sgf=$3 where gameId = $2",
        [move_number, game_id, sgfText]
      );
    } else {
      const result = await fetch(
        `https://online-go.com/api/v1/games/${game_id}/sgf`
      );
      const sgfText = await result.text();
      await client.query("INSERT INTO game VALUES ($2, $1, $3)", [
        move_number,
        game_id,
        sgfText,
      ]);
    }
    client.release();
  });
};

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
    listenToGame(gameIndex);
    const result = await client.query(
      "Select lastMove from game where gameId = $1",
      [gameIndex]
    );
    if (result.rows.length >= 1) {
      const result2 = await client.query(
        "Select move from move where gameId = $1 and moveNumber = $2 AND TO_NUMBER(level, '99') <= 15",
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

const getOGSMove = (moveInput) => {
  let result = "";
  let code = moveInput.toUpperCase().charCodeAt(0);
  if (code > 72) code -= 1;
  if (code > 64 && code < 91) result = code - 64;

  const x = result - 1;
  const y = 19 - parseInt(moveInput.slice(1));
  return [x, y];
};

app.post("/api/submitMove", async (req, res) => {
  const { move, gameIndex } = req.body;
  if (!req.session.isAdmin || !gameIndex || !move) {
    res.json({ moves: null });
  } else {
    if (move === "Resign") {
      comm_socket.emit("game/resign", {
        game_id: Number(gameIndex),
        player_id,
      });
    } else if (move === "Pass") {
      comm_socket.emit("game/move", {
        game_id: Number(gameIndex),
        player_id,
        move: [-1, -1]
      });
    } else {
      comm_socket.emit("game/move", {
        game_id: Number(gameIndex),
        player_id,
        move: getOGSMove(move),
      });
    }

    res.json(null);
  }
});

app.get("/api/SECRET_ADMIN", (req, res) => {
  req.session.isAdmin = true;
  res.send("Ok");
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
