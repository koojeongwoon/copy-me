const COLS = 10, ROWS = 20, BLOCK = 20;

const SHAPES = [
  [[1,1,1,1]],                        // I
  [[1,0,0],[1,1,1]],                  // J
  [[0,0,1],[1,1,1]],                  // L
  [[1,1],[1,1]],                      // O
  [[0,1,1],[1,1,0]],                  // S
  [[1,1,0],[0,1,1]],                  // Z
  [[0,1,0],[1,1,1]],                  // T
];

const COLORS = [
  '#00f0f0','#0000f0','#f0a000',
  '#f0f000','#00f000','#f00000','#a000f0'
];

let board, curr, currX, currY, currIndex;
let nextIndex;
let running, score;

let flashingLines = [];
let flashFrame = 0;
let flashInterval = null;

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nextCtx = nextCanvas.getContext('2d');

// 점수 업데이트
function updateScore(delta) {
  score += delta;
  document.getElementById('score').innerText = `점수: ${score}`;
}

// 블록 인덱스 랜덤 뽑기
function randomIndex() {
  return Math.floor(Math.random() * SHAPES.length);
}

// 게임 재시작
function restart() {
  board = Array.from({length: ROWS},()=>Array(COLS).fill(0));
  running = true;
  score = 0;
  updateScore(0);
  flashingLines = [];
  flashFrame = 0;
  if (flashInterval) {
    clearInterval(flashInterval);
    flashInterval = null;
  }
  currIndex = randomIndex();
  nextIndex = randomIndex();
  spawn();
  draw();
}

// 새 블록 등장
function spawn() {
  curr = SHAPES[currIndex].map(row => row.slice());
  currX = Math.floor((COLS-curr[0].length)/2);
  currY = 0;
  currIndex = nextIndex;
  nextIndex = randomIndex();

  // 블록이 처음부터 충돌하면 게임오버
  if (collide(curr, currX, currY)) {
    running = false;
    draw();
    setTimeout(()=>alert('Game Over!'), 10);
  }
}

// 충돌 체크
function collide(shape,x,y) {
  for (let r=0;r<shape.length;r++) {
    for (let c=0;c<shape[r].length;c++) {
      if (shape[r][c] &&
         (board[y+r]?.[x+c] || x+c<0 || x+c>=COLS || y+r>=ROWS)) return true;
    }
  }
  return false;
}

// 현재 블록을 보드에 고정
function merge() {
  for (let r=0;r<curr.length;r++)
    for (let c=0;c<curr[r].length;c++)
      if (curr[r][c]) board[currY+r][currX+c]=currIndex+1; // currIndex가 컬러 인덱스!
}

// 블록 회전 (우측 90도)
function rotate(shape) {
  return shape[0].map((_,i)=>shape.map(row=>row[i]).reverse());
}

// 줄 삭제 + 반짝이 효과
function clearLines() {
  let lines = [];
  for (let y=ROWS-1; y>=0; y--) {
    if (board[y].every(v=>v)) lines.push(y);
  }
  if (lines.length > 0) {
    // 큰 인덱스부터(여러줄 splice 시 안전)
    flashingLines = lines.sort((a,b)=>b-a);
    flashFrame = 0;
    if (!flashInterval) {
      flashInterval = setInterval(flashLines, 60);
    }
    // 점수
    const points = [0, 100, 300, 500, 800];
    updateScore(points[lines.length] || lines.length * 200);
    return true;
  }
  return false;
}

// 줄 반짝이 애니메이션
function flashLines() {
  flashFrame++;
  draw();
  if (flashFrame >= 4) {
    // 큰 줄 인덱스부터 삭제
    flashingLines.forEach(y => {
      board.splice(y,1);
      board.unshift(Array(COLS).fill(0));
    });
    flashingLines = [];
    clearInterval(flashInterval);
    flashInterval = null;
    draw();
  }
}

// 블록(칸) 그리기
function drawBlock(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x*BLOCK, y*BLOCK, BLOCK-1, BLOCK-1);
  ctx.strokeStyle = '#333';
  ctx.strokeRect(x*BLOCK, y*BLOCK, BLOCK, BLOCK);
}

// 전체 그리기
function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // 1. 고정된 블록
  for(let r=0;r<ROWS;r++) {
    for(let c=0;c<COLS;c++) {
      let color = board[r][c] ? COLORS[board[r][c]-1] : null;
      if (flashingLines.includes(r)) {
        // 반짝이 효과
        color = (flashFrame%2===0) ? '#fff' : COLORS[board[r][c]-1];
      }
      if(color) drawBlock(ctx, c, r, color);
    }
  }

  // 2. 현재 떨어지는 블록 (반짝이 중엔 안 그림)
  if (!flashingLines.length && running) {
    for(let r=0;r<curr.length;r++)
      for(let c=0;c<curr[r].length;c++)
        if(curr[r][c]) drawBlock(ctx, currX+c, currY+r, COLORS[currIndex]);
  }

  // 3. 넥스트 블록 (항상 nextIndex 기준)
  nextCtx.clearRect(0,0,nextCanvas.width,nextCanvas.height);
  let ns = SHAPES[nextIndex];
  let nc = COLORS[nextIndex];
  // 4x4 중앙 정렬
  let offsetX = Math.floor((4-ns[0].length)/2), offsetY = Math.floor((4-ns.length)/2);
  for(let r=0;r<ns.length;r++)
    for(let c=0;c<ns[r].length;c++)
      if(ns[r][c]) drawBlock(nextCtx, c+offsetX, r+offsetY, nc);
}

// 한 프레임 진행
function tick() {
  // 반짝이 중에는 멈춤
  if (!running || flashingLines.length) return;

  if (!collide(curr, currX, currY+1)) {
    currY++;
  } else {
    merge();
    if (!clearLines()) {
      spawn();
    }
  }
  draw();
}

// 키 입력 핸들링
document.addEventListener('keydown', e=>{
  if (!running || flashingLines.length) return;
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
