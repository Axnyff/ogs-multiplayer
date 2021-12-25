const sgf = require("@sabaki/sgf");
const GameTree = require("@sabaki/immutable-gametree");
const { fromDimensions } = require("@sabaki/go-board");

let boardCache = {}

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

  let board = fromDimensions(...size);
  let current = root;
  let lastMove;
  while (current?.children) {
    let { data } = current;
    if (data.W) {
      const move = data.W[0];
      const vertex = move.split('').map(letter => letter.charCodeAt(0) - 97);
      lastMove = vertex;
      board = board.makeMove(-1, vertex);
    }
    if (data.B) {
      const move = data.B[0];
      const vertex = move.split('').map(letter => letter.charCodeAt(0) - 97);
      lastMove = vertex;
      board = board.makeMove(1, vertex);
    }
    current = current.children[0];
  }
  return { signMap: board.signMap, lastMove, width: board.width};
};

module.exports = readSgf;
