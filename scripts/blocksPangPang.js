// === 블록, 게임판 설정 ===
const COLS = 10, ROWS = 20, BLOCK = 20;
// 테트리스 7종 블록 정의 (2차원 배열)
const SHAPES = [
  [[1,1,1,1]],                        // I
  [[1,0,0],[1,1,1]],                  // J
  [[0,0,1],[1,1,1]],                  // L
  [[1,1],[1,1]],                      // O
  [[0,1,1],[1,1,0]],                  // S
  [[1,1,0],[0,1,1]],                  // Z
  [[0,1,0],[1,1,1]],                  // T
];
// 각 블록별 색상 (인덱스 대응)
const COLORS = [
  '#00f0f0','#0000f0','#f0a000',
  '#f0f000','#00f000','#f00000','#a000f0'
];

// === 게임 상태 ===
let board = Array.from({length: ROWS},()=>Array(COLS).fill(0)); // 0:빈칸
let curr, currX, currY, currShape, nextShape;
let running = true;
let score = 0;

let flashingLines = []; // 삭제(반짝) 대기 줄 인덱스
let flashFrame = 0;     // 반짝이 프레임 카운트
let flashInterval = null;

// === 캔버스/DOM 요소 ===
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nextCtx = nextCanvas.getContext('2d');

// === 점수 업데이트 ===
function updateScore(delta) {
  score += delta;
  document.getElementById('score').innerText = `점수: ${score}`;
}

// === 블록 랜덤 생성 ===
function randomShape() {
  const i = Math.floor(Math.random() * SHAPES.length);
  return {shape: SHAPES[i], color: COLORS[i], index: i};
}

// === 게임 재시작 ===
function restart() {
  board = Array.from({length: ROWS},()=>Array(COLS).fill(0));
  running = true;
  score = 0;
  updateScore(0);
  currShape = randomShape();     // 첫 블록
  nextShape = randomShape();     // 다음 블록
  flashingLines = [];
  flashFrame = 0;
  if (flashInterval) {
    clearInterval(flashInterval); // 혹시 남아있으면 해제
    flashInterval = null;
  }
  spawn();
  draw();
}

// === 새 블록 등장 ===
function spawn() {
  curr = currShape.shape.map(row=>row.slice());
  currX = Math.floor((COLS-curr[0].length)/2);
  currY = 0;
  currShape = nextShape;      // 다음 블록을 현재로
  nextShape = randomShape();  // 또 새로운 블록 미리 뽑아둠
  // 충돌(블록 놓을 자리가 없으면 게임 오버)
  if (collide(curr, currX, currY)) {
    running = false;
    draw(); // 마지막 상태 그려줌
    setTimeout(() => alert('Game Over!'), 10);
  }
}

// === 충돌 체크 (블록이 경계나 기존 블록과 겹치면 true) ===
function collide(shape,x,y) {
  for (let r=0;r<shape.length;r++) {
    for (let c=0;c<shape[r].length;c++) {
      if (shape[r][c] &&
         (board[y+r]?.[x+c] || x+c<0 || x+c>=COLS || y+r>=ROWS)) return true;
    }
  }
  return false;
}

// === 현재 블록을 보드에 고정 ===
function merge() {
  for (let r=0;r<curr.length;r++)
    for (let c=0;c<curr[r].length;c++)
      if (curr[r][c]) board[currY+r][currX+c]=currShape.index+1;
}

// === 블록 회전 (우측 90도) ===
function rotate(shape) {
  return shape[0].map((_,i)=>shape.map(row=>row[i]).reverse());
}

// === 줄 삭제 검사 및 반짝이 애니메이션 시작 ===
function clearLines() {
  let lines = [];
  for (let y=ROWS-1; y>=0; y--) {
    if (board[y].every(v=>v)) lines.push(y);
  }
  if (lines.length > 0) {
    // 큰 인덱스부터 정렬(여러 줄 삭제할 때 splice 안전하게)
    flashingLines = lines.sort((a,b)=>b-a);
    flashFrame = 0;
    if (!flashInterval) {
      flashInterval = setInterval(flashLines, 60); // 60ms마다 draw, 4프레임 깜빡임
    }
    // 점수 지급
    const points = [0, 100, 300, 500, 800];
    updateScore(points[lines.length] || lines.length * 200);
    return true;
  }
  return false;
}

// === 줄 반짝이(깜빡) 애니메이션 ===
function flashLines() {
  flashFrame++;
  draw();
  if (flashFrame >= 4) { // 4번 깜빡이면 실제 삭제
    // 큰 줄부터 순서대로 삭제
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

// === 블록(칸) 그리기 ===
function drawBlock(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x*BLOCK, y*BLOCK, BLOCK-1, BLOCK-1);
  ctx.strokeStyle = '#333';
  ctx.strokeRect(x*BLOCK, y*BLOCK, BLOCK, BLOCK);
}

// === 전체 그리기 ===
function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // --- 1. 보드 내 고정 블록 ---
  for(let r=0;r<ROWS;r++) {
    for(let c=0;c<COLS;c++) {
      let color = board[r][c] ? COLORS[board[r][c]-1] : null;
      // 반짝이 효과 중이면 해당 라인만 번갈아 흰색
      if (flashingLines.includes(r)) {
        color = (flashFrame%2===0) ? '#fff' : COLORS[board[r][c]-1];
      }
      if(color) drawBlock(ctx, c, r, color);
    }
  }

  // --- 2. 현재 떨어지는 블록 ---
  // (줄 반짝이 중에는 새 블록 그리지 않음)
  if (!flashingLines.length && running) {
    for(let r=0;r<curr.length;r++)
      for(let c=0;c<curr[r].length;c++)
        if(curr[r][c]) drawBlock(ctx, currX+c, currY+r, currShape.color);
  }

  // --- 3. 다음 블록(Next) ---
  nextCtx.clearRect(0,0,nextCanvas.width,nextCanvas.height);
  let ns = nextShape.shape;
  // 가운데 정렬 (2x2~4x1 모두 대응)
  let offsetX = Math.floor((4-ns[0].length)/2), offsetY = Math.floor((4-ns.length)/2);
  for(let r=0;r<ns.length;r++)
    for(let c=0;c<ns[r].length;c++)
      if(ns[r][c]) drawBlock(nextCtx, c+offsetX, r+offsetY, nextShape.color);
}

// === 한 프레임 진행 ===
function tick() {
  // 줄 삭제 반짝이 중엔 동작 멈춤
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

// === 키 입력 핸들링 ===
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

// === 게임 시작 ===
restart();
setInterval(tick, 400);
