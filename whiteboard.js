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


/* Gallery focus annotation and optional voice recording. All pen events are
   captured above the spotlight but anchored to textbook-image coordinates. */
(function(){
"use strict";
const viewer=document.querySelector(".viewer");
const image=document.getElementById("page-image");
const area=document.getElementById("image-container");
const toolbar=document.querySelector(".controls");
const menu=document.querySelector(".controls-right");
const pen=document.getElementById("tool-pen");
const spotlight=document.getElementById("lightbox");
if(!viewer||!image||!area||!toolbar||!menu||!pen)return;

const layer=document.createElement("canvas");
layer.id="gallery-focus-ink";
layer.setAttribute("aria-hidden","true");
viewer.append(layer);
const context=layer.getContext("2d");
const pages=new Map();
let pageKey=(document.getElementById("current-page")?.textContent||"1").trim();
let active=null;
const pageStrokes=()=>{if(!pages.has(pageKey))pages.set(pageKey,[]);return pages.get(pageKey)};
window.galleryClearBookInk=()=>{pages.set(pageKey,[]);redraw()};
const isBook=()=>!document.body.classList.contains("gallery-whiteboard-on"); // The textbook remains writable in Workspace mode.
const penEnabled=e=>isBook()&&(pen.classList.contains("active")||e?.pointerType==="pen"); // Surface Pen writes on the book even before tapping Pen.
const imageRect=()=>image.getBoundingClientRect();
const bounds=()=>area.getBoundingClientRect();
const inkColour=(x,y)=>{
 const base=window.galleryPenColour||"#1a1a1a";
 const inside=spotlight?.classList.contains("active")&&
  x>=spotlight.getBoundingClientRect().left&&x<=spotlight.getBoundingClientRect().right&&
  y>=spotlight.getBoundingClientRect().top&&y<=spotlight.getBoundingClientRect().bottom;
 if(spotlight?.classList.contains("active")&&!inside){
  const c=base.toLowerCase();
  if(c==="#1a1a1a"||c==="#111111")return "#ffffff";
  if(c==="#205da9"||c==="#1462ca")return "#94caff";
  if(c==="#e63329"||c==="#d32929")return "#ff9c94";
  if(c==="#3fae49"||c==="#168348")return "#abf7ad";
 }
 return base;
};
function coords(x,y){
 const r=imageRect();
 return {x:(x-r.left)/Math.max(1,r.width),y:(y-r.top)/Math.max(1,r.height)};
}
function sizeInk(){
 const r=layer.getBoundingClientRect(),d=window.devicePixelRatio||1;
 const w=Math.max(1,Math.round(r.width*d)),h=Math.max(1,Math.round(r.height*d));
 if(layer.width!==w||layer.height!==h){layer.width=w;layer.height=h}
 redraw();
}
function redraw(){
 const cr=layer.getBoundingClientRect(),im=imageRect(),d=layer.width/Math.max(1,cr.width);
 context.setTransform(1,0,0,1,0,0);
 context.clearRect(0,0,layer.width,layer.height);
 context.setTransform(d,0,0,d,0,0);
 context.lineCap="round";context.lineJoin="round";
 const rx=im.left-cr.left,ry=im.top-cr.top;
 for(const s of pageStrokes()){
  if(!s.points.length)continue;
  context.strokeStyle=s.colour;context.fillStyle=s.colour;
  context.lineWidth=Math.max(1.2,s.width*im.width);
  context.beginPath();
  s.points.forEach((p,i)=>{const x=rx+p.x*im.width,y=ry+p.y*im.height;i?context.lineTo(x,y):context.moveTo(x,y)});
  if(s.points.length===1){
   const p=s.points[0];context.arc(rx+p.x*im.width,ry+p.y*im.height,context.lineWidth/2,0,Math.PI*2);context.fill();
  }else context.stroke();
 }
}
function eraseAt(p){
 const cr=imageRect(),rad=20/Math.max(1,cr.width);
 const strokes=pageStrokes();
 for(let i=strokes.length-1;i>=0;i--){
  if(strokes[i].points.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<rad)){strokes.splice(i,1)}
 }
 redraw();
}
function within(e){if(document.querySelector(".gallery-question-stage.open")?.contains(e.target))return false;const r=bounds();return e.clientX>=r.left&&e.clientX<r.right&&e.clientY>=r.top&&e.clientY<r.bottom}
function usingEraser(e){
 const manual=document.getElementById("gallery-erase-toggle")?.getAttribute("aria-pressed")==="true";
 return manual||e.pointerType==="pen"&&(e.button===5||(e.buttons&32)!==0);
}
document.addEventListener("pointerdown",e=>{
 if(e.pointerType==="touch"||!penEnabled(e)||!within(e))return;
 if(e.target.closest(".calculator-panel,button,input,select"))return;
 e.preventDefault();e.stopImmediatePropagation();
 const p=coords(e.clientX,e.clientY),eraser=usingEraser(e);
 active={id:e.pointerId,eraser};
 if(eraser)eraseAt(p);
 else{
  const width=3/Math.max(1,imageRect().width);
  const stroke={colour:inkColour(e.clientX,e.clientY),width,points:[p]};
  pageStrokes().push(stroke);active.stroke=stroke;redraw();
 }
},true);
document.addEventListener("pointermove",e=>{
 if(!active||active.id!==e.pointerId)return;
 e.preventDefault();e.stopImmediatePropagation();
 const p=coords(e.clientX,e.clientY);
 if(active.eraser)eraseAt(p);
 else{active.stroke.points.push(p);redraw()}
},true);
const finish=e=>{if(active?.id===e.pointerId)active=null};
document.addEventListener("pointerup",finish,true);
document.addEventListener("pointercancel",finish,true);
const page=document.getElementById("current-page");
if(page)new MutationObserver(()=>{
 const n=(page.textContent||"1").trim();
 if(n!==pageKey){pageKey=n;active=null;redraw()}
}).observe(page,{childList:true,characterData:true,subtree:true});
area.addEventListener("scroll",()=>{redraw()},{passive:true});
image.addEventListener("load",()=>requestAnimationFrame(redraw));
window.addEventListener("resize",sizeInk);
if(window.ResizeObserver)new ResizeObserver(()=>{
 layer.style.top=toolbar.offsetHeight+"px";
 layer.style.height="calc(100% - "+toolbar.offsetHeight+"px)";
 sizeInk();
}).observe(toolbar);
layer.style.top=toolbar.offsetHeight+"px";
layer.style.height="calc(100% - "+toolbar.offsetHeight+"px)";
sizeInk();

// Share screen and explicitly mix microphone input into the recorded video.
const recBtn=document.createElement("button");
recBtn.id="gallery-record-voice";recBtn.className="toolbar-btn gallery-record-btn";
recBtn.type="button";recBtn.textContent="● Record + Mic";recBtn.title="Record a browser tab, window or screen with microphone narration";
const timer=document.createElement("span");timer.className="gallery-record-timer";timer.hidden=true;timer.textContent="00:00";
menu.append(recBtn,timer);
let recorder=null,videoSource=null,micSource=null,clock=null,t0=0,blobs=[],busy=false;
function cleanup(){
 if(clock){clearInterval(clock);clock=null}
 if(videoSource){videoSource.getTracks().forEach(t=>t.stop());videoSource=null}
 if(micSource){micSource.getTracks().forEach(t=>t.stop());micSource=null}
 recBtn.disabled=false;recBtn.classList.remove("gallery-recording");
 recBtn.textContent="● Record + Mic";timer.hidden=true;busy=false;
}
function save(){
 if(!blobs.length)return;
 const type=blobs[0].type||"video/webm";
 const blob=new Blob(blobs,{type});
 if(!blob.size)return;
 const url=URL.createObjectURL(blob);
 const a=document.createElement("a");a.href=url;
 a.download="Gallery-Lesson-"+new Date().toISOString().replace(/[:.]/g,"-")+".webm";
 document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),60000);
}
function endRecording(){
 if(recorder&&recorder.state!=="inactive"){recorder.stop()}
 else cleanup();
}
recBtn.onclick=async()=>{
 if(recorder&&recorder.state==="recording"){endRecording();return}
 if(busy)return;
 busy=true;recBtn.disabled=true;
 try{
  if(!navigator.mediaDevices?.getDisplayMedia||!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)
    throw Error("This browser does not support screen and microphone recording.");
  videoSource=await navigator.mediaDevices.getDisplayMedia({video:true,audio:false,preferCurrentTab:true});
  try{
   micSource=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
  }catch(e){throw Error("Microphone permission is required: "+e.message)}
  const tracks=[...videoSource.getVideoTracks(),...micSource.getAudioTracks()];
  const output=new MediaStream(tracks);
  const mime=["video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"].find(m=>MediaRecorder.isTypeSupported(m));
  recorder=new MediaRecorder(output,mime?{mimeType:mime}:undefined);
  blobs=[];
  recorder.ondataavailable=e=>{if(e.data.size)blobs.push(e.data)};
  recorder.onstop=()=>{save();cleanup();recorder=null};
  recorder.onerror=()=>{cleanup();recorder=null};
  videoSource.getVideoTracks()[0].addEventListener("ended",()=>{if(recorder&&recorder.state==="recording")endRecording()},{once:true});
  recorder.start(500);
  recBtn.disabled=false;recBtn.classList.add("gallery-recording");recBtn.textContent="■ Stop & Save";
  timer.hidden=false;t0=Date.now();
  clock=setInterval(()=>{
   const s=Math.floor((Date.now()-t0)/1000);
   timer.textContent=String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0");
  },500);
 }catch(e){cleanup();recorder=null;alert("Recording not started. "+e.message+"\nYou can still record Gallery with Snagit and Record Microphone enabled.")}
};
})();


/* Question -> whiteboard: a clean working page with the chosen exact question.
   Ink is independent of the book image; fingers scroll, pens write/erase. */
(function(){
"use strict";
const viewer=document.querySelector(".viewer"),area=document.getElementById("image-container");
const image=document.getElementById("page-image"),spotlight=document.getElementById("lightbox");
const tools=document.querySelector(".controls-right"),pen=document.getElementById("tool-pen");
if(!viewer||!area||!image||!spotlight||!tools||!pen)return;
const focusBtn=document.createElement("button");
focusBtn.className="toolbar-btn gallery-tool-short";focusBtn.type="button";
focusBtn.textContent="Question ↑";focusBtn.title="Place the selected textbook question at the top of a clean white writing page";
const clearBook=document.getElementById("gallery-workspace-clear");
const clearNative=document.getElementById("tool-clear-ink");
if(clearBook)clearBook.title="Clear writing on the current question or workspace";
tools.prepend(focusBtn);
const stage=document.createElement("section");
stage.className="gallery-question-stage";stage.setAttribute("aria-label","Question and whiteboard");
stage.innerHTML='<div class="gallery-question-bar"><strong id="gallery-question-title">Question and working</strong><button type="button" id="gallery-question-back">← Book</button><button type="button" id="gallery-question-clear">Clear writing</button><button type="button" id="gallery-question-next">New question</button></div><div class="gallery-question-scroll"><div class="gallery-question-sheet"><canvas class="gallery-question-clip" aria-label="Selected question"></canvas><canvas class="gallery-question-ink" aria-label="Write over the question and below"></canvas></div></div>';
viewer.append(stage);
const cropped=stage.querySelector(".gallery-question-clip");
const sheet=stage.querySelector(".gallery-question-sheet");
const ink=stage.querySelector(".gallery-question-ink"),g=ink.getContext("2d");
const scroll=stage.querySelector(".gallery-question-scroll");
const strokes=[];let active=null,eraserMode=false;
const activeStage=()=>stage.classList.contains("open");
const pos=e=>{const r=ink.getBoundingClientRect();return{x:(e.clientX-r.left)/Math.max(1,r.width),y:(e.clientY-r.top)/Math.max(1,r.height)}};
const eraseMode=e=>eraserMode||document.getElementById("gallery-erase-toggle")?.getAttribute("aria-pressed")==="true"||(e.pointerType==="pen"&&(e.button===5||(e.buttons&32)!==0));
function redraw(){
 const r=ink.getBoundingClientRect(),d=ink.width/Math.max(1,r.width);
 g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,ink.width,ink.height);
 g.setTransform(d,0,0,d,0,0);g.lineCap="round";g.lineJoin="round";
 for(const s of strokes){
  if(!s.points.length)continue;
  g.strokeStyle=s.colour;g.fillStyle=s.colour;g.lineWidth=s.width;
  g.beginPath();
  s.points.forEach((p,i)=>{const x=p.x*r.width,y=p.y*r.height;i?g.lineTo(x,y):g.moveTo(x,y)});
  if(s.points.length===1){const p=s.points[0];g.arc(p.x*r.width,p.y*r.height,s.width/2,0,Math.PI*2);g.fill()}
  else g.stroke();
 }
}
function resize(){
 if(!activeStage())return;
 const r=ink.getBoundingClientRect(),d=Math.min(window.devicePixelRatio||1,2);
 const w=Math.max(1,Math.round(r.width*d)),h=Math.max(1,Math.round(r.height*d));
 if(ink.width!==w||ink.height!==h){ink.width=w;ink.height=h}redraw();
}
function eraseAt(p){
 const r=ink.getBoundingClientRect(),rx=18/Math.max(r.width,1),ry=18/Math.max(r.height,1);
 for(let i=strokes.length-1;i>=0;i--){
  if(strokes[i].points.some(q=>Math.hypot((q.x-p.x)/rx,(q.y-p.y)/ry)<1))strokes.splice(i,1);
 }redraw();
}
ink.addEventListener("pointerdown",e=>{
 if(e.pointerType==="touch")return;
 e.preventDefault();e.stopPropagation();
 if(!pen.classList.contains("active"))pen.click();
 const erase=eraseMode(e),p=pos(e);
 active={id:e.pointerId,erase};ink.setPointerCapture(e.pointerId);
 if(erase)eraseAt(p);
 else{
  const r=ink.getBoundingClientRect();
  const s={colour:window.galleryPenColour||"#1a1a1a",width:3,points:[p]};
  strokes.push(s);active.stroke=s;redraw();
 }
});
ink.addEventListener("pointermove",e=>{
 if(!active||active.id!==e.pointerId)return;
 e.preventDefault();e.stopPropagation();
 const p=pos(e);if(active.erase)eraseAt(p);else{active.stroke.points.push(p);redraw()}
});
const stop=e=>{if(active&&active.id===e.pointerId)active=null};
ink.addEventListener("pointerup",stop);ink.addEventListener("pointercancel",stop);
function close(){stage.classList.remove("open");active=null;focusBtn.classList.remove("active")}
function open(){
 if(!image.complete||!image.naturalWidth){alert("The textbook page has not finished loading.");return}
 if(!spotlight.classList.contains("active")){
  document.getElementById("tool-lightbox")?.click();
  alert("Move and resize the yellow spotlight around the question, then select Question ↑ again.");
  return;
 }
 const a=spotlight.getBoundingClientRect(),b=image.getBoundingClientRect();
 const x0=Math.max(a.left,b.left),y0=Math.max(a.top,b.top),x1=Math.min(a.right,b.right),y1=Math.min(a.bottom,b.bottom);
 if(x1<=x0||y1<=y0){alert("Move the yellow spotlight over the textbook question.");return}
 const fX=image.naturalWidth/Math.max(1,b.width),fY=image.naturalHeight/Math.max(1,b.height);
 const sx=Math.max(0,Math.floor((x0-b.left)*fX)),sy=Math.max(0,Math.floor((y0-b.top)*fY));
 const sw=Math.min(image.naturalWidth-sx,Math.max(1,Math.ceil((x1-x0)*fX)));
 const sh=Math.min(image.naturalHeight-sy,Math.max(1,Math.ceil((y1-y0)*fY)));
 cropped.width=sw;cropped.height=sh;cropped.getContext("2d").drawImage(image,sx,sy,sw,sh,0,0,sw,sh);
 document.getElementById("gallery-question-title").textContent="Textbook question · page "+(document.getElementById("current-page")?.textContent||"");
 strokes.length=0;stage.classList.add("open");focusBtn.classList.add("active");scroll.scrollTop=0;
 const top=document.querySelector(".controls")?.offsetHeight||42;
 stage.style.top=top+"px";
 requestAnimationFrame(resize);
}
focusBtn.onclick=()=>activeStage()?close():open();
document.getElementById("gallery-question-back").onclick=close;
document.getElementById("gallery-question-clear").onclick=()=>{strokes.length=0;redraw()};
document.getElementById("gallery-question-next").onclick=()=>{if(strokes.length&&!confirm("Start a new question? This clears the current whiteboard working."))return;strokes.length=0;close()};
if(clearBook)clearBook.addEventListener("click",e=>{
 if(activeStage()){e.preventDefault();e.stopImmediatePropagation();strokes.length=0;redraw();return}
 if(!document.body.classList.contains("gallery-whiteboard-on")&&!document.body.classList.contains("gallery-workspace-on")){
  e.preventDefault();e.stopImmediatePropagation();
  window.galleryClearBookInk?.();
  clearNative?.click();
 }
},true);
if(clearNative)clearNative.addEventListener("click",()=>{if(activeStage()){strokes.length=0;redraw()}else window.galleryClearBookInk?.()},true);
if(window.ResizeObserver)new ResizeObserver(()=>{if(activeStage())resize()}).observe(sheet);
window.addEventListener("resize",()=>{if(activeStage()){stage.style.top=(document.querySelector(".controls")?.offsetHeight||42)+"px";resize()}});
})();
