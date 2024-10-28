
const vecs = new Map();
const vec = (x, y) => {
  const key = `${x},${y}`;
  if (!vecs.has(key)) {
    vecs.set(key, { x: x, y: y });
  }
  return vecs.get(key);
}

const tileSize = vec(48, 48);

const add = (a, b) => vec(a.x + b.x, a.y + b.y);
const neg = (v) => vec(-v.x, -v.y);

const newGame = str => {
  const level = str.split("\n").map((x) => x.split(""));
  return {
    level: level,
    moves: "",
    redo: "",
    won: won(level)
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

const style = (bc, hc, ac) => `button {
      display: inline-block; border-style: none;
      padding: 0;
      margin: 0;
      height: ${tileSize.x}px;
      width: ${tileSize.y}px;
      background-color: ${bc};
    }
    button:hover {
      background-color: ${hc};
    }
    button:active {
      background-color: ${ac};
    }
    button img {
      mix-blend-mode: multiply;
    }`;

const at = (level, pos, notfound = "#") => {
  if (pos.y < 0 || pos.y >= level.length) {
    return notfound;
  }
  const row = level[pos.y];
  if (pos.x < 0 || pos.x >= row.length) {
    return notfound;
  }
  return row[pos.x];
};

const won = (level) =>
  !level.some((row) => row.some((tile) => tile === "." || tile === "+"));

const put = (level, pos, tile) => (level[pos.y][pos.x] = tile);

const playerPos = (level) => {
  for (let y = 0; y < level.length; y++) {
    const row = level[y];
    for (let x = 0; x < row.length; x++) {
      const tile = row[x];
      if (tile === "@" || tile === "+") {
        return vec(x, y);
      }
    }
  }
  throw "no player on level? :(";
};

let game;

const startLevel = (str) => {
  game = newGame(str);
};

const player = ["@", "+"];
const box = ["$", "*"];

const step = (level, type, pos, dir) => {
  const tile = at(level, pos);
    if (tile !== type[0] && tile !== type[1]) {
    return false;
  }
  
  const nextPos = add(pos, dir);
  const nextTile = at(level, nextPos);
  if (nextTile !== " " && nextTile !== ".") {
    return false;
  }
  put(level, pos, tile === type[0] ? " " : ".");
  put(level, nextPos, nextTile === " " ? type[0] : type[1]);
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
  const pos = playerPos(game.level);
  const boxMoved = step(game.level, box, add(pos, dir.vec), dir.vec);
  const playerMoved = step(game.level, player, pos, dir.vec);
  const moveMade = boxMoved
    ? dir.name.toUpperCase()
    : playerMoved
    ? dir.name
    : "";
  game.moves += moveMade;
  game.redo = "";
  game.won = won(game.level);
};

const undo = (game) => {
  if (game.moves === "") {
    return;
  }
  const pos = playerPos(game.level);
  const moveMade = game.moves.slice(-1);
  const forward = dirs[dirNum(moveMade)].vec;
  const back = neg(forward);
  if (!step(game.level, player, pos, back)) {
    throw "player won't move back :(";
  }

  if (moveMade === moveMade.toUpperCase()) {
    if (!step(game.level, box, add(pos, forward), back)) {
      throw "box won't move back :(";
    }
  }
  game.moves = game.moves.slice(0, -1);
  game.redo = moveMade + game.redo;
  game.won = won(game.level);
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

const makeSprites = (img) => {
  const canvas = document.body.appendChild(document.createElement("canvas"));
  const ctx = canvas.getContext("2d");;
  canvas.width = tileSize.x;
  canvas.height = tileSize.y;
  ctx.imageSmoothingEnabled = false;

  const sprites = new Map(
    [
      [" ", vec(0, 0)],
      ["#", vec(1, 0)],
      ["@", vec(0, 1)],
      ["+", vec(0, 1)],
      ["$", vec(1, 1)],
      [".", vec(0, 2)],
      ["*", vec(1, 2)]
    ].map((a) => {
      ctx.drawImage(img, a[1].x * 16, a[1].y * 16, 16, 16, 0, 0, tileSize.x, tileSize.y);
      return [a[0], canvas.toDataURL()];
    })
  );
  canvas.remove();
  return sprites;
};

const img = (tile, sprites) => {
  const img = document.createElement("img");
  img.src = sprites.get(tile);
  img.alt = "";
  return img;
};

const button = (tile, sprites) => {
  const button = document.createElement("button");
  button.appendChild(img(tile, sprites));
  return button;
};

const tilemap = () => {
  const pre = document.createElement("pre");
  pre.style = "line-height: 0;";
  return pre;
};

const start = (str, sprites) => {

  document.head.appendChild(document.createElement("style")).innerText = style("#AAAAAA", "#888888", "#444444");
  let touch = false;

  const gameEl = document.querySelector("#game");
  const gamePre = gameEl.appendChild(tilemap());
  const solutionEl = gameEl.appendChild(document.createElement("p"));
  const wonEl = gameEl.appendChild(document.createElement("p"));
  const controlsEl = gameEl.appendChild(document.createElement("table"));

  const descriptions = {
    w: "Up",
    a: "Left",
    s: "Down",
    d: "Right",
    z: "Undo",
    y: "Redo",
    r: "Restart"
  };
  let perform;

  const draw = (game) => {
    solutionEl.innerText = game.moves === "" ? "..." : game.moves;
    wonEl.innerText = game.won ? "Yay!" : "...";

    gamePre.replaceChildren();
    const player = playerPos(game.level);
    const buttons = new Map(
      [
        [add(player, vec(0, -1)), "w"],
        [add(player, vec(-1, 0)), "a"],
        [add(player, vec(0, 1)), "s"],
        [add(player, vec(1, 0)), "d"]
      ]
    );
    game.level.forEach((row, y) => {
      row.forEach((tile, x) => {
        const pos = vec(x, y);
        if (touch && buttons.has(pos)) {
          const command = buttons.get(pos);
          const btn = gamePre.appendChild(button(tile, sprites));
          btn.title = `${descriptions[command]} (${command})`;
          btn.onclick = perform(command);
        } else {
          gamePre.appendChild(img(tile, sprites));
        }
      });
      gamePre.appendChild(document.createElement("br"));
    });
  };

  perform = (() => {
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
  
    const layout = `
 w r y t
asd
z
`.split("\n").map((x) => x.split(""));
    layout.pop();
    layout.shift();
    for (const row of layout) {
      const tr = controlsEl.appendChild(document.createElement("tr"));
      for (const c of row) {
        const td = tr.appendChild(document.createElement("td"));
        if (c === "t") {
          const button = td.appendChild(document.createElement("button"));
          button.style = "width: 200px;";
          button.innerText = "Toggle particularly good touch controls!";
          button.onclick = () => {
            touch = !touch;
            draw(game);
          };
        } else if (c !== " ") {
          const button = td.appendChild(document.createElement("button"));
          button.innerText = c.toUpperCase();
          button.title = descriptions[c];
          button.onclick = perform(c);
        }
      }
    }
  })();

  document.onkeypress = event => perform(event.key.toLowerCase())();
  startLevel(str);
  draw(game);
};

const edit = (str, sprites) => {

  document.head.appendChild(document.createElement("style")).innerText = style("#FFFFFF", "#888888", "#444444");

  startLevel(str);
  
  const gameEl = document.querySelector("#game");
  const palette = gameEl.appendChild(document.createElement("p"));
  const gamePre = gameEl.appendChild(tilemap());

  let selected = " ";
  const draw = () => {
    gamePre.replaceChildren();
    game.level.forEach((row, y) => {
      row.forEach((tile, x) => {
        const pos = vec(x, y);
        const btn = gamePre.appendChild(button(tile, sprites));
        btn.onclick = () => {
          put(game.level, pos, selected);
          draw();
        };
      });
    gamePre.appendChild(document.createElement("br"));
    });
  };

  [" ", "#", ".", "@", "+", "$", "*"].forEach(tile => {
    const btn = palette.appendChild(button(tile, sprites));
    btn.onclick = () => (selected = tile);
  });
  
  
  draw();
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

  const img = document.querySelector("#sprites");
  img.remove()
  const sprites = makeSprites(img);

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
  if (params.has("edit")) {
    edit(levelStr, sprites);
  } else {
    start(levelStr, sprites);
  }
  
};

