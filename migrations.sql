CREATE TABLE GAME(
  gameId VARCHAR PRIMARY KEY,
  lastMove Int
);

CREATE TABLE MOVE(
  playerId VARCHAR,
  gameId VARCHAR,
  move VARCHAR,
  level VARCHAR,
  moveNumber Int
);

