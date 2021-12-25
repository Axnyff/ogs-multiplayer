const sgf = require("@sabaki/sgf");
const GameTree = require("@sabaki/immutable-gametree");
const { fromDimensions } = require("@sabaki/go-board");

let boardCache = {};

const readSgf = (sgfStr) => {
  const rootNodes = sgf.parse(sgfStr);
  const root = rootNodes[0];
  let size = [19, 19];

  if (root.data.SZ != null) {
    let value = root.data.SZ[0];

    if (value.includes(":")) size = value.split(":");
    else size = [value, value];

    size = size.map((x) => (isNaN(x) ? 19 : +x));
  }

  const parseVictoryText = (re) => {
    if (re === "W+R") {
      return "Blanc gagne par abandon";
    }
    if (re === "B+R") {
      return "Noir gagne par abandon";
    }
    if (re.startsWith("B+")) {
      return `Noir gagne de ${parseFloat(re.slice(2))} points`;
    }
    if (re.startsWith("W+")) {
      return `Blanc gagne de ${parseFloat(re.slice(2))} points`;
    }
  };
  let board = fromDimensions(...size);
  let current = root;
  const victoryText =
    !!current.data?.RE.length && parseVictoryText(current.data.RE[0]);

  let lastMove;
  while (current?.children) {
    let { data } = current;
    if (data.W) {
      const move = data.W[0];
      const vertex = move.split("").map((letter) => letter.charCodeAt(0) - 97);
      lastMove = vertex;
      board = board.makeMove(-1, vertex);
    }
    if (data.B) {
      const move = data.B[0];
      const vertex = move.split("").map((letter) => letter.charCodeAt(0) - 97);
      lastMove = vertex;
      board = board.makeMove(1, vertex);
    }
    current = current.children[0];
  }
  return { ...board, lastMove, victoryText, komi: root.data.KM?.[0], black: root.data.PB[0], white: root.data.PW[0] };
};

module.exports = readSgf;
