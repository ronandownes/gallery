(function(){
"use strict";
const $=id=>document.getElementById(id),container=$("image-container"),pen=$("tool-pen"),viewer=document.querySelector(".viewer");
if(!container||!pen||!viewer)return;
window.galleryPenColour="#1a1a1a";
const colours=document.createElement("div");colours.className="gallery-pen-palette";colours.setAttribute("aria-label","Pen colours");
for(const [name,c] of [["Black","#1a1a1a"],["Blue","#205da9"],["Red","#e63329"],["Green","#3fae49"]]){
 const b=document.createElement("button");b.className="gallery-pen-swatch";b.type="button";b.style.setProperty("--ink",c);b.title=name;b.setAttribute("aria-label",name+" pen");b.setAttribute("aria-pressed",String(name==="Black"));
 b.onclick=()=>{window.galleryPenColour=c;colours.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));if(!pen.classList.contains("active"))pen.click()};
 colours.append(b);
}
pen.after(colours);
const button=(id,label,title)=>{const b=document.createElement("button");b.id=id;b.type="button";b.className="toolbar-btn gallery-tool-short";b.textContent=label;b.title=title;return b};
const workspaceButton=button("gallery-workspace-toggle","Workspace","Open writing surface beside textbook");
const whiteButton=button("gallery-white-toggle","Whiteboard","Replace page with blank writing surface");
const eraseButton=button("gallery-erase-toggle","Eraser","Toggle pen-tip eraser");
const clearButton=button("gallery-workspace-clear","Clear work","Clear writing surface");
const tools=document.querySelector(".controls-right")||pen.parentElement;
tools.prepend(workspaceButton,whiteButton,eraseButton,clearButton);
const panel=document.createElement("section");panel.className="gallery-workspace";panel.setAttribute("aria-label","Teaching writing surface");
panel.innerHTML='<div class="gallery-workspace-drag" title="Drag to resize writing area"></div><div class="gallery-workspace-title"><strong>Writing surface</strong><div class="gallery-zoom-controls"><label for="gallery-zoom">Zoom</label><input id="gallery-zoom" type="range" min="25" max="400" value="100" step="5"><span id="gallery-zoom-value">100%</span></div></div><canvas id="gallery-workspace-canvas" aria-label="Whiteboard"></canvas>';
viewer.append(panel);
const board=document.createElement("canvas");board.id="gallery-whiteboard";container.append(board);
const work=panel.querySelector("canvas"),all=[board,work],data=new Map(all.map(c=>[c,{strokes:[],active:null,mode:"draw",zoom:1,offsetX:0,offsetY:0,pointers:new Map(),gesture:null}]));let current="book",erase=false;
function resize(c){const d=Math.max(1,devicePixelRatio||1),r=c.getBoundingClientRect();if(r.width<1||r.height<1)return;c.width=Math.round(r.width*d);c.height=Math.round(r.height*d);paint(c)}
function paint(c){const v=data.get(c),g=c.getContext("2d"),d=c.width/Math.max(1,c.clientWidth);g.clearRect(0,0,c.width,c.height);g.setTransform(d,0,0,d,0,0);g.lineCap="round";g.lineJoin="round";g.save();g.translate(v.offsetX,v.offsetY);g.scale(v.zoom,v.zoom);
for(const s of v.strokes){if(!s.points.length)continue;g.strokeStyle=s.colour;g.fillStyle=s.colour;g.lineWidth=s.width;g.beginPath();s.points.forEach((p,i)=>i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y));if(s.points.length===1){g.arc(s.points[0].x,s.points[0].y,Math.max(1,s.width/2),0,Math.PI*2);g.fill()}else g.stroke()}g.restore()}
function position(c,e){const r=c.getBoundingClientRect(),v=data.get(c);return{x:(e.clientX-r.left-v.offsetX)/v.zoom,y:(e.clientY-r.top-v.offsetY)/v.zoom}}
function removeAt(c,p){const v=data.get(c),radius=14/v.zoom;v.strokes=v.strokes.filter(s=>!s.points.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<radius));paint(c)}
function down(c,e){const v=data.get(c);if(e.pointerType==="touch"){v.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(v.pointers.size===2){const p=[...v.pointers.values()],dist=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);v.gesture={dist,zoom:v.zoom,offX:v.offsetX,offY:v.offsetY,cx:(p[0].x+p[1].x)/2,cy:(p[0].y+p[1].y)/2}}c.setPointerCapture(e.pointerId);return}
if(!pen.classList.contains("active"))pen.click();
e.preventDefault();const p=position(c,e),isErase=erase||(e.pointerType==="pen"&&(e.button===5||(e.buttons&32)!==0));
v.active={id:e.pointerId,erase:isErase};c.setPointerCapture(e.pointerId);
if(isErase)removeAt(c,p);else{const s={colour:window.galleryPenColour,width:3,points:[p]};v.strokes.push(s);v.active.stroke=s;paint(c)}}
function move(c,e){const v=data.get(c);if(e.pointerType==="touch"&&v.pointers.has(e.pointerId)){const old=v.pointers.get(e.pointerId);v.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(v.pointers.size===2&&v.gesture){const ps=[...v.pointers.values()],dist=Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y),z=Math.min(4,Math.max(.25,v.gesture.zoom*dist/Math.max(1,v.gesture.dist)));const r=c.getBoundingClientRect(),cx=(ps[0].x+ps[1].x)/2-r.left,cy=(ps[0].y+ps[1].y)/2-r.top,ox=v.gesture.cx-r.left,oy=v.gesture.cy-r.top;v.offsetX=cx-(ox-v.gesture.offX)*z/v.gesture.zoom;v.offsetY=cy-(oy-v.gesture.offY)*z/v.gesture.zoom;v.zoom=z;syncZoom(c);paint(c)}else if(v.pointers.size===1){v.offsetX+=e.clientX-old.x;v.offsetY+=e.clientY-old.y;paint(c)}return}
if(!v.active||v.active.id!==e.pointerId)return;e.preventDefault();const p=position(c,e);if(v.active.erase)removeAt(c,p);else{v.active.stroke.points.push(p);paint(c)}}
function up(c,e){const v=data.get(c);if(e.pointerType==="touch"){v.pointers.delete(e.pointerId);v.gesture=null}else if(v.active&&v.active.id===e.pointerId)v.active=null}
for(const c of all){c.addEventListener("pointerdown",e=>down(c,e));c.addEventListener("pointermove",e=>move(c,e));c.addEventListener("pointerup",e=>up(c,e));c.addEventListener("pointercancel",e=>up(c,e));}
function activeCanvas(){return current==="workspace"?work:board}
function updateView(){document.body.classList.toggle("gallery-workspace-on",current==="workspace");document.body.classList.toggle("gallery-whiteboard-on",current==="white");workspaceButton.classList.toggle("active",current==="workspace");whiteButton.classList.toggle("active",current==="white");if(current==="white")requestAnimationFrame(()=>resize(board));if(current==="workspace")requestAnimationFrame(()=>resize(work));}
workspaceButton.onclick=()=>{current=current==="workspace"?"book":"workspace";updateView()};
whiteButton.onclick=()=>{current=current==="white"?"book":"white";updateView()};
eraseButton.onclick=()=>{erase=!erase;eraseButton.classList.toggle("active",erase);eraseButton.setAttribute("aria-pressed",String(erase))};
clearButton.onclick=()=>{const c=activeCanvas();data.get(c).strokes=[];paint(c)};
function syncZoom(c){if(c===work){$("gallery-zoom").value=String(Math.round(data.get(c).zoom*100));$("gallery-zoom-value").textContent=Math.round(data.get(c).zoom*100)+"%"}}
$("gallery-zoom").addEventListener("input",e=>{const v=data.get(work),z=Number(e.target.value)/100,cx=work.clientWidth/2,cy=work.clientHeight/2;v.offsetX=cx-(cx-v.offsetX)*z/v.zoom;v.offsetY=cy-(cy-v.offsetY)*z/v.zoom;v.zoom=z;syncZoom(work);paint(work)});
let startWidth=58;const drag=panel.querySelector(".gallery-workspace-drag");drag.onpointerdown=e=>{startWidth=panel.getBoundingClientRect().width;drag.setPointerCapture(e.pointerId);drag.dataset.x=e.clientX};drag.onpointermove=e=>{if(!drag.hasPointerCapture(e.pointerId))return;const total=viewer.clientWidth,px=Math.min(total*.85,Math.max(total*.2,startWidth+Number(drag.dataset.x)-e.clientX)),percent=(px/total*100)+"%";panel.style.width=percent;container.style.marginRight=percent;const nav=$("smart-nav");if(nav)nav.style.right=percent;resize(work)};drag.onpointerup=()=>{};
new ResizeObserver(()=>{if(current==="workspace")resize(work);if(current==="white")resize(board)}).observe(container);
new ResizeObserver(()=>{if(current==="workspace")resize(work)}).observe(panel);
pen.addEventListener("click",()=>queueMicrotask(()=>{if(current==="workspace"||current==="white"){work.style.pointerEvents="auto";board.style.pointerEvents="auto"}}));
updateView();
})();
