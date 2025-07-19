const COLS = 10, ROWS = 20, BLOCK = 20;
const SHAPES = [
  // I
  [[1,1,1,1]],
  // J
  [[1,0,0],[1,1,1]],
  // L
  [[0,0,1],[1,1,1]],
  // O
  [[1,1],[1,1]],
  // S
  [[0,1,1],[1,1,0]],
  // Z
  [[1,1,0],[0,1,1]],
  // T
  [[0,1,0],[1,1,1]],
];
const COLORS = ['#00f0f0','#0000f0','#f0a000','#f0f000','#00f000','#f00000','#a000f0'];

let board = Array.from({length: ROWS},()=>Array(COLS).fill(0));
let curr, currX, currY, currShape, nextShape;
let running = true;
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nextCtx = nextCanvas.getContext('2d');

function randomShape() {
  const i = Math.floor(Math.random() * SHAPES.length);
  return {shape: SHAPES[i], color: COLORS[i], index: i};
}
function restart() {
  board = Array.from({length: ROWS},()=>Array(COLS).fill(0));
  running = true;
  currShape = randomShape();
  nextShape = randomShape();
  spawn();
  draw();
}
function spawn() {
  curr = currShape.shape.map(row=>row.slice());
  currX = Math.floor((COLS-curr[0].length)/2);
  currY = 0;
  currShape = nextShape;
  nextShape = randomShape();
  if (collide(curr, currX, currY)) {
    running = false;
    alert('Game Over!');
  }
}
function collide(shape,x,y) {
  for (let r=0;r<shape.length;r++) {
    for (let c=0;c<shape[r].length;c++) {
      if (shape[r][c] &&
         (board[y+r]?.[x+c] || x+c<0 || x+c>=COLS || y+r>=ROWS)) return true;
    }
  }
  return false;
}
function merge() {
  for (let r=0;r<curr.length;r++)
    for (let c=0;c<curr[r].length;c++)
      if (curr[r][c]) board[currY+r][currX+c]=currShape.index+1;
}
function rotate(shape) {
  return shape[0].map((_,i)=>shape.map(row=>row[i]).reverse());
}
function clearLines() {
  for (let y=ROWS-1;y>=0;y--) {
    if (board[y].every(v=>v)) {
      board.splice(y,1);
      board.unshift(Array(COLS).fill(0));
      y++;
    }
  }
}
function drawBlock(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x*BLOCK, y*BLOCK, BLOCK-1, BLOCK-1);
  ctx.strokeStyle = '#333';
  ctx.strokeRect(x*BLOCK, y*BLOCK, BLOCK, BLOCK);
}
function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  // draw board
  for(let r=0;r<ROWS;r++)
    for(let c=0;c<COLS;c++)
      if(board[r][c]) drawBlock(ctx, c, r, COLORS[board[r][c]-1]);
  // draw current
  for(let r=0;r<curr.length;r++)
    for(let c=0;c<curr[r].length;c++)
      if(curr[r][c]) drawBlock(ctx, currX+c, currY+r, currShape.color);

  // draw next
  nextCtx.clearRect(0,0,nextCanvas.width,nextCanvas.height);
  let ns = nextShape.shape;
  for(let r=0;r<ns.length;r++)
    for(let c=0;c<ns[r].length;c++)
      if(ns[r][c]) drawBlock(nextCtx, c+1, r+1, nextShape.color);
}
function tick() {
  if (!running) return;
  if (!collide(curr, currX, currY+1)) {
    currY++;
  } else {
    merge();
    clearLines();
    spawn();
  }
  draw();
}
document.addEventListener('keydown', e=>{
  if (!running) return;
  let nx=currX, ny=currY, ncurr=curr;
  if(e.key==='ArrowLeft') nx--;
  if(e.key==='ArrowRight') nx++;
  if(e.key==='ArrowDown') ny++;
  if(e.key==='ArrowUp') {
    let tryRot = rotate(curr);
    if (!collide(tryRot, currX, currY)) curr = tryRot;
  }
  if(!collide(curr, nx, ny)) {
    currX=nx; currY=ny;
    draw();
  }
  if(e.key===' ') { // Hard drop
    while(!collide(curr, currX, currY+1)) currY++;
    tick();
  }
});
restart();
setInterval(tick, 400);
