// Firebase 設定
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getDatabase, ref, get, set } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyD8N_guFTlHlRsq6G8tMRt5nVWLhsXLZEQ",
  authDomain: "the-simple---building-blocks.firebaseapp.com",
  databaseURL: "https://the-simple---building-blocks-default-rtdb.firebaseio.com/",
  projectId: "the-simple---building-blocks",
  storageBucket: "the-simple---building-blocks.firebasestorage.app",
  messagingSenderId: "160667698664",
  appId: "1:160667698664:web:bf4d52eed14a4e2979d05d"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
}

let todayWorldRecord = 0;
async function loadTodayRecord() {
  try {
    const snapshot = await get(ref(db,'worldRecord/'+getTodayString()));
    todayWorldRecord = snapshot.exists() ? snapshot.val() : 0;
  } catch(e){ todayWorldRecord = 0; }
}
async function updateTodayRecord(score) {
  try { await set(ref(db,'worldRecord/'+getTodayString()), score); todayWorldRecord = score; } 
  catch(e){ console.error(e); }
}

await loadTodayRecord();
window.firebaseStuff = { db, getTodayRecord:()=>todayWorldRecord, updateTodayRecord };

// Matter.js ゲーム
const { Engine, Render, Runner, Bodies, Composite, Body, Events, Vector } = Matter;

// フィールド固定
const fieldWidth = 360;
const fieldHeight = 640;

// Canvas
const canvas = document.getElementById("gameCanvas");
let canvasScale = 1;

function resizeCanvas(){
  const windowRatio = window.innerWidth / window.innerHeight;
  const fieldRatio = fieldWidth / fieldHeight;
  if(windowRatio > fieldRatio){
    canvasScale = window.innerHeight / fieldHeight;
  } else {
    canvasScale = window.innerWidth / fieldWidth;
  }
  canvas.style.width = `${fieldWidth*canvasScale}px`;
  canvas.style.height = `${fieldHeight*canvasScale}px`;
  canvas.style.left = "50%";
  canvas.style.top = "50%";
  canvas.style.transform = "translate(-50%,-50%)";
}
resizeCanvas();
window.addEventListener("resize",resizeCanvas);

const engine = Engine.create();
engine.world.gravity.y = 1;

const render = Render.create({
  canvas,
  engine,
  options:{ width: fieldWidth, height: fieldHeight, wireframes:false, background:"#fdf6e3" }
});
Render.run(render);
Render.lookAt(render, { min: { x:0, y:0 }, max: { x:fieldWidth, y:fieldHeight } });

(function fixedUpdate(){ Engine.update(engine, 1000/60); requestAnimationFrame(fixedUpdate); })();

const ground = Bodies.rectangle(fieldWidth/2, fieldHeight+10, fieldWidth, 20, {isStatic:true});
const leftWall = Bodies.rectangle(-10, fieldHeight/2, 20, fieldHeight*2, {isStatic:true});
const rightWall = Bodies.rectangle(fieldWidth+10, fieldHeight/2, 20, fieldHeight*2, {isStatic:true});
Composite.add(engine.world,[ground,leftWall,rightWall]);

// ゲーム設定
const pancakeH = 50;
const pancakeW = 160;
const spawnY = 100;
const connectCount = 5;
const scorePerShape = 2;
const gridMargin = 5;
const shapes = [
  {type:"rectangle", w:pancakeW*1, h:pancakeH*0.8},
  {type:"square", w:pancakeH*1.5, h:pancakeH*1.5},
  {type:"circle", r:pancakeH/1.2},
  {type:"triangle", w:pancakeH*2, h:pancakeH*1.7},
  {type:"hexagon", r:pancakeH*0.9}
];
const colors = ["#f4a261","#e76f51","#2a9d8f","#e9c46a","#264653"];

let score = 0;
const scoreDiv = document.getElementById("scoreDisplay");
let current = null;
let gameOver = false;
let canMove = false;
let dragging=false;

function spawn(){
  if(gameOver) return;
  const idx = Math.floor(Math.random()*shapes.length);
  const shape = shapes[idx];
  const color = colors[idx];
  let b;
  const initialX = fieldWidth/2;
  const initialY = spawnY;

  if(shape.type==="rectangle"||shape.type==="square"){
    b = Bodies.rectangle(initialX, initialY, shape.w, shape.h, {isStatic:true, render:{fillStyle:color, opacity:0.5}, isSensor:true});
  } else if(shape.type==="circle"){
    b = Bodies.circle(initialX, initialY, shape.r, {isStatic:true, render:{fillStyle:color, opacity:0.5}, isSensor:true});
  } else if(shape.type==="triangle"){
    b = Bodies.polygon(initialX, initialY, 3, shape.h/Math.sqrt(3), {isStatic:true, render:{fillStyle:color, opacity:0.5}, isSensor:true});
  } else if(shape.type==="hexagon"){
    b = Bodies.polygon(initialX, initialY, 6, shape.r, {isStatic:true, render:{fillStyle:color, opacity:0.5}, isSensor:true});
  }

  b.isDraggable = true;
  current = b;
  canMove = true;
  Composite.add(engine.world,b);
}
setTimeout(spawn,1000);

function getPos(e){
  const rect = canvas.getBoundingClientRect();
  let x = e.touches ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
  let y = e.touches ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
  return { x: x / canvasScale, y: y / canvasScale };
}

canvas.addEventListener("mousedown",()=>{ if(current) dragging=true; });
canvas.addEventListener("mousemove",(e)=>{
  if(dragging && current && current.isDraggable && !gameOver && canMove){
    const pos = getPos(e);
    Body.setPosition(current,{x:pos.x, y:current.position.y});
  }
});
canvas.addEventListener("mouseup",()=>{ dropCurrent(); });

canvas.addEventListener("touchstart",(e)=>{ e.preventDefault(); if(current) dragging=true; },{passive:false});
canvas.addEventListener("touchmove",(e)=>{ 
  e.preventDefault();
  if(dragging && current && current.isDraggable && !gameOver && canMove){
    const pos = getPos(e);
    Body.setPosition(current,{x:pos.x, y:current.position.y});
  }
},{passive:false});
canvas.addEventListener("touchend",(e)=>{ e.preventDefault(); dropCurrent(); },{passive:false});

// 重なりを解除して少し上に上げる関数
function liftCurrent(current){
  if(!current) return;
  const all = Composite.allBodies(engine.world).filter(b=>!b.isStatic && b!==current);
  const step = 5;
  const extraStep = 5;

  let overlapExists = false;

  // 重なりがある限り上に移動
  let moved;
  do{
    moved = false;
    for(let b of all){
      if(Matter.Bounds.overlaps(current.bounds,b.bounds)){
        overlapExists = true;
        Body.translate(current,{x:0,y:-step});
        moved = true;
      }
    }
  }while(moved);

  // 重なりがあった場合のみ少し上げてバグ防止
  if(overlapExists){
    Body.translate(current,{x:0,y:-extraStep});
  }
}

function dropCurrent(){
  if(!current) return;
  current.render.opacity = 1;
  current.isSensor = false;
  dragging = false;
  canMove = false;
  Body.setStatic(current,false);
  current.isDraggable=false;

  liftCurrent(current); // 重なり解除処理

  current=null;
  if(!gameOver) setTimeout(spawn,500);
}

function checkConnected(){
  if(gameOver) return;
  const all = Composite.allBodies(engine.world).filter(b=>!b.isStatic && !b.isSensor);
  const visited = new Set();
  function neighbors(body){
    return all.filter(other=>other!==body && other.render.fillStyle===body.render.fillStyle &&
      Vector.magnitude(Vector.sub(body.position,other.position)) < pancakeH*2+gridMargin);
  }
  function dfs(body,group){
    if(visited.has(body)) return;
    visited.add(body);
    group.push(body);
    for(let n of neighbors(body)) dfs(n,group);
  }
  for(let b of all){
    if(visited.has(b)) continue;
    const group=[];
    dfs(b,group);
    if(group.length>=connectCount){
      for(let g of group) Composite.remove(engine.world,g);
      score += group.length*scorePerShape;
      scoreDiv.innerText=`Score: ${score}`;
    }
  }
}

function restartGame(){
  gameOver=false;
  const panel = document.getElementById("gameOverPanel");
  panel.style.opacity="0";
  panel.style.top="-200px";
  const allBodies = Composite.allBodies(engine.world);
  for(let b of allBodies){
    if(!b.isStatic) Composite.remove(engine.world,b);
  }
  score=0;
  scoreDiv.innerText=`Score: ${score}`;
  setTimeout(spawn,1000);
}

async function checkGameOver(){
  if(gameOver) return;
  const all = Composite.allBodies(engine.world).filter(b=>!b.isStatic && !b.isSensor);
  let minY = fieldHeight;
  for(let b of all){
    if(b===current) continue;
    if(b.position.y<minY) minY=b.position.y;
  }
  if(minY <= spawnY - 15){
    gameOver=true;
    if(score > window.firebaseStuff.getTodayRecord()){
      await window.firebaseStuff.updateTodayRecord(score);
    }
    const panel = document.getElementById("gameOverPanel");
    panel.innerHTML = `
      <h2>ゲームオーバー！</h2>
      <p>あなたの記録: ${score}</p>
      <p>今日の世界記録: ${window.firebaseStuff.getTodayRecord()}</p>
      <button id="restartBtn">リスタート</button>
    `;
    panel.style.top="200px";
    panel.style.opacity="1";
    document.getElementById("restartBtn").addEventListener("click",restartGame);
  }
}

Events.on(engine,"afterUpdate",()=>{ checkConnected(); checkGameOver(); });
