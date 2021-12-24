const express = require("express");
const bodyParser = require('body-parser');
const session = require('cookie-session');
const app = express();

const sess = {
  keys: [process.env.COOKIE_KEY || 'RANDOM_KEY'],
  httpOnly: false,
  sameSite: 'none',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};


app.use(bodyParser.json());
app.use(session(sess));
app.use(express.static('dist'));

const port = process.env.PORT || 3010;

app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Set-Cookie',
  );
  res.header('Access-Control-Allow-Methods', 'GET, POST');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); // trust first proxy
  sess.secure = true;
}

app.get("/api/loggedIn", (req, res) => {
  res.json({ loggedIn: req.session.loggedIn || false });
});

app.post("/api/level", (req, res) => {
  req.session.level = req.body.level;
  req.session.loggedIn = true;
  res.send("Ok");
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
express;
