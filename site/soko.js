
const elem = (tagName, props, ...children) => {
  const el = Object.assign(document.createElement(tagName), props);
  el.replaceChildren(...children);
  return el;
};

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

const trimmed = (str) => str.match(/^\n*([\s\S]*?)\n*$/)[1];

const strLevel = str => {
  const rows = trimmed(str).split("\n").map((x) => x.trimEnd().split(""));
  const size = vec(Math.max(...rows.map(row => row.length)), rows.length);
  for (const row of rows) {
    while (row.length < size.x) {
      row.push(" ");
    }
  }
  return {
    rows: rows,
    size: size
  };
}

const levelStr = level =>
  trimmed(level.rows.map(row => row.join("").trimEnd()).join("\n"));

const newGame = str => {
  const level = strLevel(str);
  return {
    level: level,
    moves: "",
    redo: "",
    won: won(level)
  };
};

const levelpack = {
  read: str => {
    const res = { meta: new Map(), levels: [] };

    let current = null;

    const kv = (key, value) => {
      const o = current || res;
      if (o.meta.has(key)) {
        console.error(`not adding duplicate key: ${key} => ${value}`);
      } else {
      o.meta.set(key, value);
      }
    };

    const row = (str) => {
      if (current === null || current.meta.size > 0) {
        current = { meta: new Map(), content: "" };
        res.levels.push(current);
      }
      if (current.content !== "") {
        current.content += "\n";
      }
      current.content += str;
    };
  
    for (const line of str.split("\n")) {
      const l = line.trimEnd();
      if (l === "") {
        current = null;
      } else {
        const i = l.indexOf(":");
        if (i >= 0) {
          kv(l.substring(0, i), l.substring(i + 1).trim());
        } else {
          row(l);
        }
      }
    }
    return res;
  }
};

const metaHtml = (m) => {
  const title = m.has("Title") ? m.get("Title")  : "untitled";
  const res = [elem("h2", {}, title)];
  if (m.has("Description")) {
    res.push(elem("p", {}, m.get("Description")));
  }
  let ul = null;
  for ([k, v] of m) {
    if (k !== "Title" && k !== "Description") {
      if (ul === null) {
         ul = elem("ul", {});
         res.push(ul);
      }
      ul.appendChild(elem("li", {}, `${k}: ${v}`));
    }
  }
  return res;
};

const packHtml = (pack, selectLevel) => {  
  const res = metaHtml(pack.meta);
  res.push(elem("h3", {}, `${pack.levels.length} levels`));
  const ol = elem("ol");
  res.push(ol);
  pack.levels.forEach((level, i) => {
    const title = level.meta.has("Title") ? ": " + level.meta.get("Title") : "";
    const button = elem(
      "button",
      { onclick: () => selectLevel(i) },
      `Level ${i + 1}${title}`
    );
    ol.appendChild(elem("li", {}, button));
  });
  return res;
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
      background-color: ${bc};
    }
    button.tile {
      padding: 0;
      margin: 0;
      height: ${tileSize.x}px;
      width: ${tileSize.y}px;
    }
    button.square {
      padding: 0;
      margin: 0;
      height: ${tileSize.x}px;
      width: ${tileSize.y}px;
    }
    button:hover {
      background-color: ${hc};
    }
    button:active, button.active {
      background-color: ${ac};
    }
    button img {
      mix-blend-mode: multiply;
    }`;

const at = (level, pos, notfound = "#") => {
  if (
    pos.y < 0 || pos.y >= level.size.y
    || pos.x < 0 || pos.x >= level.size.x
  ) {
    return notfound;
  }
  return level.rows[pos.y][pos.x];
};

const won = (level) =>
  !level.rows.some((row) => row.some((tile) => tile === "." || tile === "+"));

const put = (level, pos, tile) => (level.rows[pos.y][pos.x] = tile);

const playerPos = (level) => {
  for (let y = 0; y < level.size.y; y++) {
    const row = level.rows[y];
    for (let x = 0; x < level.size.x; x++) {
      const tile = row[x];
      if (tile === "@" || tile === "+") {
        return vec(x, y);
      }
    }
  }
  throw "no player in level? :(";
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
  const canvas = document.body.appendChild(elem("canvas"));
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

const img = (tile, sprites) =>
  elem("img", { src: sprites.get(tile), alt: "" });

const button = (tile, sprites) => elem("button", { className: "tile" }, img(tile, sprites));

const tilemap = () => elem("pre", { style: "line-height: 0;" });

const play = (pack, sprites) => {

  let game;
  
  document.head.appendChild(elem(
    "style",
    {},
    style("#AAAAAA", "#888888", "#444444")
  ));
  
  let touch = false;

  const gameEl = document.querySelector("#game");
  gameEl.replaceChildren();
  const gamePre = gameEl.appendChild(tilemap());
  const solutionEl = gameEl.appendChild(elem("p"));
  const wonEl = gameEl.appendChild(elem("p"));
  const controlsEl = gameEl.appendChild(elem("table"));
  const link = gameEl.appendChild(elem("p"));
  gameEl.appendChild(elem("hr"));
  const levelMeta = gameEl.appendChild(elem("div"));
  gameEl.appendChild(elem("hr"));
  const packMeta = gameEl.appendChild(elem("div"));

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

  const draw = () => {
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
    game.level.rows.forEach((row, y) => {
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
      gamePre.appendChild(elem("br"));
    });
    const a = elem("a");
    a.href = `?level=${url.write(pack.levels[0].content)}&edit`;
    a.innerText = "Edit!";
    link.replaceChildren(a);
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
        draw();
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
      const tr = controlsEl.appendChild(elem("tr"));
      for (const c of row) {
        const td = tr.appendChild(elem("td"));
        if (c === "t") {
          td.appendChild(elem(
            "button",
            {
              className: "square",
              style: "width: 200px;",
              onclick: () => { touch = !touch; draw(); }
            },
            "Toggle particularly good touch controls!"
          ));
        } else if (c !== " ") {
          td.appendChild(elem(
            "button",
            {
              className: "square",
              title: descriptions[c],
              onclick: perform(c)
            },
            c.toUpperCase()
          ));
        }
      }
    }
  })();

  const selectLevel = i => {
    const level = pack.levels[i];
    game = newGame(level.content);
    levelMeta.replaceChildren(...metaHtml(level.meta));
    draw();
  };

  packMeta.append(...packHtml(pack, selectLevel));
  document.onkeypress = event => perform(event.key.toLowerCase())();
  selectLevel(0);
};

const edit = (pack, sprites) => {

  const level = strLevel(pack.levels[0].content);
  document.head.appendChild(elem("style", {}, style("#FFFFFF", "#888888", "#444444")));
  
  const gameEl = document.querySelector("#game");
  gameEl.replaceChildren();
  const palette = gameEl.appendChild(elem("p"));
  gameEl.appendChild(elem("hr"));
  const gamePre = gameEl.appendChild(tilemap());
  gameEl.appendChild(elem("hr"));
  const link = gameEl.appendChild(elem("p"));

  let selected = " ";
  const draw = () => {
    gamePre.replaceChildren();
    level.rows.forEach((row, y) => {
      row.forEach((tile, x) => {
        const pos = vec(x, y);
        const btn = gamePre.appendChild(button(tile, sprites));
        btn.onclick = () => {
          put(level, pos, selected);
          draw();
        };
      });
      const addCol = gamePre.appendChild(button(" ", sprites));
      addCol.onclick = () => {
        const x = level.size.x;
        level.rows.forEach(row => row.push(" "));
        level.size.x++;
        put(level, vec(x, y), selected);
        draw();
      };
      gamePre.appendChild(elem("br"));
    });

    for (let i = 0; i < level.size.x; i++) {
      const x = i;
      const addRow = gamePre.appendChild(button(" ", sprites));
      addRow.onclick = () => {
        const y = level.size.y;
        level.rows.push(new Array(level.size.x).fill(" "));;
        level.size.y++;
        put(level, vec(x, y), selected);
        draw();
      };
    }
    
    link.replaceChildren(elem(
      "a",
      { href: `?level=${url.write(levelStr(level))}` },
      "Play!"
    ));
  };

  let buttons;
  buttons = [" ", "#", ".", "@", "+", "$", "*"].map(tile => {
    const btn = palette.appendChild(button(tile, sprites));
    btn.onclick = () => {
      buttons.forEach(b => (b.className = ""));
      btn.className = "active";
      selected = tile;
    };
    return btn;
  });
  buttons[0].className = "active";
  draw();
};

window.onload = () => {

  const levelsEl = document.querySelector("#levels");
  let pack = levelpack.read(levelsEl.innerText);
  levelsEl.remove();
  const img = document.querySelector("#sprites");
  img.remove()
  const sprites = makeSprites(img);

  const params = new URLSearchParams(location.search);
  const urlLevel = params.get("level");
  if (urlLevel !== null) {
    try {
      pack = levelpack.read(url.read(urlLevel));
    } catch (e) {
      console.error(e);
    }
  }
  if (params.has("edit")) {
    edit(pack, sprites);
  } else {
    play(pack, sprites);
  }
};

