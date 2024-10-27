const vec = (x, y) => ({ x: x, y: y });
const add = (a, b) => vec(a.x + b.x, a.y + b.y);
const neg = (v) => vec(-v.x, -v.y);

const newGame = str => {
  const board = str.split("\n").map((x) => x.split(""));
  return {
    board: board,
    moves: "",
    redo: "",
    won: won(board)
  }
};


const url = (() => {
  const a = [" ", "#", ".", "@", "+", "$", "*", "\n"];
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  return {
    read: (str) => {
      let res = "";
      for (const c of str) {
        const b = alphabet.indexOf(c)
        if (b >= 0) {
          const first = b >>> 3;
          res += a[first];
          const second = b & 0b111;
          res += a[second];
        } else {
          res += "  ";
        }
      }
      return res;
    },
    write: (str) => {
      let res = "";
      for (let i = 0; i < str.length; i+= 2) {
        let b = 0;
        const first = a.indexOf(str[i]);
        if (first >= 0) {
          b = first << 3;
        }
        if (i + 1 < str.length) {
          const second = a.indexOf(str[i + 1]);
          if (second >= 0) {
            b += second;
          }
        }
        res += alphabet[b];
      }
      return res;
    }
  };
})();

const at = (board, pos) => {
  if (pos.y < 0 || pos.y >= board.length) {
    return "#";
  }
  const row = board[pos.y];
  if (pos.x < 0 || pos.x >= row.length) {
    return "#";
  }
  return row[pos.x];
};

const won = (board) =>
  !board.some((row) => row.some((tile) => tile === "." || tile === "+"));

const put = (board, pos, tile) => (board[pos.y][pos.x] = tile);

const playerPos = (board) => {
  for (let y = 0; y < board.length; y++) {
    const row = board[y];
    for (let x = 0; x < row.length; x++) {
      const tile = row[x];
      if (tile === "@" || tile === "+") {
        return vec(x, y);
      }
    }
  }
  throw "no player on board? :(";
};

let game;

const startLevel = (str) => {
  game = newGame(str);
};

const player = ["@", "+"];
const box = ["$", "*"];

const step = (board, type, pos, dir) => {
  const tile = at(board, pos);
    if (tile !== type[0] && tile !== type[1]) {
    return false;
  }
  
  const nextPos = add(pos, dir);
  const nextTile = at(board, nextPos);
  if (nextTile !== " " && nextTile !== ".") {
    return false;
  }
  put(board, pos, tile === type[0] ? " " : ".");
  put(board, nextPos, nextTile === " " ? type[0] : type[1]);
  return true;
};

const dirs = [
  { name: "u", vec: vec(0, -1) },
  { name: "l", vec: vec(-1, 0) },
  { name: "d", vec: vec(0, 1) },
  { name: "r", vec: vec(1, 0) }
];

const move = (game, dir) => {
  if (game.won) {
    return;
  }
  const pos = playerPos(game.board);
  const boxMoved = step(game.board, box, add(pos, dir.vec), dir.vec);
  const playerMoved = step(game.board, player, pos, dir.vec);
  const moveMade = boxMoved
    ? dir.name.toUpperCase()
    : playerMoved
    ? dir.name
    : "";
  game.moves += moveMade;
  game.redo = "";
  game.won = won(game.board);
};

const undo = (game) => {
  if (game.moves === "") {
    return;
  }
  const pos = playerPos(game.board);
  const moveMade = game.moves.slice(-1);
  const forward = dirs[dirNum(moveMade)].vec;
  const back = neg(forward);
  if (!step(game.board, player, pos, back)) {
    throw "player won't move back :(";
  }

  if (moveMade === moveMade.toUpperCase()) {
    if (!step(game.board, box, add(pos, forward), back)) {
      throw "box won't move back :(";
    }
  }
  game.moves = game.moves.slice(0, -1);
  game.redo = moveMade + game.redo;
  game.won = won(game.board);
};

const restart = (game) => {
  while (game.moves !== "") {
    undo(game);
  }
};

const redo = (game) => {
  if (game.redo === "") {
    return;
  }
  const moveMade = game.redo.slice(0, 1);
  const newRedo = game.redo.slice(1);
  move(game, dirs[dirNum(moveMade)]);
  game.redo = newRedo;
};

const dirNum = (str) => {
  const s = str.toLowerCase();
  return s === "u" ? 0 : s === "l" ? 1 : s === "d" ? 2 : s === "r" ? 3 : false;
};


const colors = [
  "#000000", "#1D2B53", "#7E2553", "#008751",
  "#AB5236", "#5F574F", "#C2C3C7", "#FFF1E8",
  "#FF004D", "#FFA300", "#FFEC27", "#00E436",
  "#29ADFF", "#83769C", "#FF77A8", "#FFCCAA"
];

const start = (str) => {
  const gameEl = document.querySelector("#game");
  const canvas = gameEl.appendChild(document.createElement("canvas"));
  const ctx = canvas.getContext("2d");
  const solutionEl = gameEl.appendChild(document.createElement("p"));
  const wonEl = gameEl.appendChild(document.createElement("p"));
  const controlsEl = gameEl.appendChild(document.createElement("table"));

  const drawTile = (() => {
    const img = document.querySelector("#sprites");
    img.remove();
    const draw = (sprite, x, y) =>
      ctx.drawImage(
        img,
        sprite.x * 16,
        sprite.y * 16,
        16,
        16,
        x * 48,
        y * 48,
        48,
        48
      );
    const map = new Map([
      [" ", vec(0, 0)],
      ["#", vec(1, 0)],
      ["@", vec(0, 1)],
      ["+", vec(0, 1)],
      ["$", vec(1, 1)],
      [".", vec(0, 2)],
      ["*", vec(1, 2)],
    ]);
    return (s, x, y) => draw(map.has(s) ? map.get(s) : vec(0, 0), x, y);
  })();

  const draw = (game) => {
    game.board.forEach((row, y) => row.forEach((tile, x) => drawTile(tile, x, y)));
    solutionEl.innerText = game.moves === "" ? "..." : game.moves;
    wonEl.innerText = game.won ? "Yay!" : "...";
  };

  const perform = (() => {
    const makeMove = dirNum => move(game, dirs[dirNum]);
    const commands = new Map([
      ["w", () => makeMove(0)],
      ["a", () => makeMove(1)],
      ["s", () => makeMove(2)],
      ["d", () => makeMove(3)],
      ["z", () => undo(game)],
      ["y", () => redo(game)],
      ["r", () => restart(game)],
    ]);
    return (c) => () => {
      if (commands.has(c)) {
        commands.get(c)();
        draw(game);
      }
    };
  })();

  (() => {
    const descriptions = {
      w: "Up",
      a: "Left",
      s: "Down",
      d: "Right",
      z: "Undo",
      y: "Redo",
      r: "Restart"
    };
  
    const layout = `
 w r y
asd
z
`.split("\n").map((x) => x.split(""));
    layout.pop();
    layout.shift();
    for (const row of layout) {
      const tr = controlsEl.appendChild(document.createElement("tr"));
      for (const c of row) {
        const td = tr.appendChild(document.createElement("td"));
        if (c !== " ") {
          const button = td.appendChild(document.createElement("button"));
          button.style = "width: 48px; height: 48px;";
          button.innerText = c.toUpperCase();
          button.title = descriptions[c];
          button.onclick = perform(c);
        }
      }
    }
  })();

  document.onkeypress = (event) => perform(event.key.toLowerCase())();
  startLevel(str);
  canvas.width = Math.max(...game.board.map((row) => row.length)) * 48;
  canvas.height = game.board.length * 48;
  ctx.imageSmoothingEnabled = false;
  draw(game);
};

const defaultLevel = `
    #####
    #   #
    #$  #
  ###  $##
  #  $ $ #
### # ## #   ######
#   # ## #####  ..#
# $  $          ..#
##### ### #@##  ..#
    #     #########
    #######
`;

window.onload = () => {
  let levelStr = defaultLevel;
  const params = new URLSearchParams(location.search);
  const urlLevel = params.get("level");
  if (urlLevel !== null) {
    try {
      levelStr = url.read(urlLevel);
    } catch (e) {
      console.error(e);
    }
  }
  start(levelStr);
};

