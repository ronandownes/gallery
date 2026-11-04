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
const workspaceButton=button("gallery-book-left","Book Left","Textbook on the left; working on the right");
const layoutButton=button("gallery-book-top","Book Top","Textbook above; whiteboard below");layoutButton.setAttribute("aria-pressed","false");
const whiteButton=button("gallery-white-toggle","Whiteboard","Replace page with blank writing surface");
const eraseButton=button("gallery-erase-toggle","Eraser","Toggle pen-tip eraser");
const clearButton=button("gallery-workspace-clear","Clear work","Clear writing surface");
const tools=document.querySelector(".controls-right")||pen.parentElement;
tools.prepend(workspaceButton,layoutButton,whiteButton,eraseButton,clearButton);
const bookZoomControl=document.createElement("label");bookZoomControl.className="gallery-book-zoom";
bookZoomControl.innerHTML='<span>Book</span><input type="range" min="50" max="800" step="25" value="100" aria-label="Book zoom"><output>100%</output>';
tools.append(bookZoomControl);
const bookZoomSlider=bookZoomControl.querySelector("input");
bookZoomSlider.addEventListener("input",()=>{
 const z=Number(bookZoomSlider.value)/100;
 window.gallerySetBookZoom?.(z);
 bookZoomControl.querySelector("output").textContent=Math.round(z*100)+"%";
});
const panel=document.createElement("section");panel.className="gallery-workspace";panel.setAttribute("aria-label","Teaching writing surface");
panel.innerHTML='<div class="gallery-workspace-drag" title="Drag to resize writing area"></div><div class="gallery-workspace-title"><strong>Writing surface</strong><div class="gallery-zoom-controls"><label for="gallery-zoom">Zoom</label><input id="gallery-zoom" type="range" min="25" max="400" value="100" step="5"><span id="gallery-zoom-value">100%</span></div></div><canvas id="gallery-workspace-canvas" aria-label="Whiteboard"></canvas>';
viewer.append(panel);
const board=document.createElement("canvas");board.id="gallery-whiteboard";container.append(board);
const work=panel.querySelector("canvas"),all=[board,work],data=new Map(all.map(c=>[c,{strokes:[],active:null,mode:"draw",zoom:1,offsetX:0,offsetY:0,pointers:new Map(),gesture:null}]));let current="book",erase=false,stacked=false,sideRatio=.58,topRatio=.42;
function resize(c){const d=Math.max(1,devicePixelRatio||1),r=c.getBoundingClientRect();if(r.width<1||r.height<1)return;c.width=Math.round(r.width*d);c.height=Math.round(r.height*d);paint(c)}
function paint(c){const v=data.get(c),g=c.getContext("2d"),d=c.width/Math.max(1,c.clientWidth);g.clearRect(0,0,c.width,c.height);g.setTransform(d,0,0,d,0,0);g.lineCap="round";g.lineJoin="round";g.save();g.translate(v.offsetX,v.offsetY);g.scale(v.zoom,v.zoom);
for(const s of v.strokes){if(!s.points.length)continue;g.strokeStyle=s.colour;g.fillStyle=s.colour;g.lineWidth=s.width;g.beginPath();s.points.forEach((p,i)=>i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y));if(s.points.length===1){g.arc(s.points[0].x,s.points[0].y,Math.max(1,s.width/2),0,Math.PI*2);g.fill()}else g.stroke()}g.restore();window.gallerySeamInk?.redraw?.()}
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
function updateView(){
 const on=current==="workspace";
 document.body.classList.toggle("gallery-workspace-on",on);
 document.body.classList.toggle("gallery-whiteboard-on",current==="white");
 workspaceButton.classList.toggle("active",on&&!stacked);bookZoomControl.hidden=!on;
 layoutButton.classList.toggle("active",on&&stacked);
 workspaceButton.setAttribute("aria-pressed",String(on&&!stacked));
 whiteButton.classList.toggle("active",current==="white");
 layoutWorkspace();
 if(current==="white")requestAnimationFrame(()=>resize(board));
 if(on)requestAnimationFrame(()=>resize(work));
 requestAnimationFrame(()=>window.gallerySeamInk?.redraw?.());
}
function layoutWorkspace(){
 const on=current==="workspace",nav=$("smart-nav");
 layoutButton.setAttribute("aria-pressed",String(on&&stacked));
 document.body.classList.toggle("gallery-workspace-stacked",on&&stacked);
 if(!on){
  container.style.marginRight="";container.style.flex="";container.style.height="";
  if(nav){nav.style.right="";nav.style.top="";nav.style.bottom=""}
  return;
 }
 const top=document.querySelector(".controls")?.offsetHeight||42;
 const avail=Math.max(180,viewer.clientHeight-top);
 if(stacked){
  const bookH=Math.round(avail*topRatio),boardH=avail-bookH;
  container.style.marginRight="0";container.style.flex="0 0 "+bookH+"px";container.style.height=bookH+"px";
  panel.style.left="0";panel.style.right="0";panel.style.width="100%";
  panel.style.top=top+bookH+"px";panel.style.bottom="0";
  if(nav){nav.style.top=top+"px";nav.style.bottom=boardH+"px";nav.style.right="0"}
 }else{
  const pct=(sideRatio*100)+"%";
  container.style.flex="1 1 auto";container.style.height="";container.style.marginRight=pct;
  panel.style.left="auto";panel.style.right="0";panel.style.width=pct;
  panel.style.top=top+"px";panel.style.bottom="0";
  if(nav){nav.style.top=top+"px";nav.style.bottom="0";nav.style.right=pct}
 }
 requestAnimationFrame(()=>resize(work));
 requestAnimationFrame(()=>window.gallerySeamInk?.redraw?.());
}
function startLayout(top){
 const already=current==="workspace"&&stacked===top;
 current=already?"book":"workspace";stacked=top;
 updateView();
 if(!already&&top){
  // In a shallow top pane, fit *width*, not height. Preserve relative scroll position.
  const scrollFraction=(container.scrollTop+container.clientHeight/2)/Math.max(1,container.scrollHeight);
  $("fit-width")?.click();
  requestAnimationFrame(()=>{container.scrollTop=Math.max(0,scrollFraction*container.scrollHeight-container.clientHeight/2);});
 }
}
workspaceButton.onclick=()=>startLayout(false);
layoutButton.onclick=()=>startLayout(true);
whiteButton.onclick=()=>{current=current==="white"?"book":"white";updateView()};
eraseButton.onclick=()=>{erase=!erase;eraseButton.classList.toggle("active",erase);eraseButton.setAttribute("aria-pressed",String(erase))};
clearButton.onclick=()=>{
 // Always reset both sides, independently of the current layout.
 for(const c of all){data.get(c).strokes=[];data.get(c).active=null;paint(c)}
 window.galleryClearBookInk?.();window.gallerySeamInk?.clearAll?.();
 $("tool-clear-ink")?.click();
};
function syncZoom(c){if(c===work){$("gallery-zoom").value=String(Math.round(data.get(c).zoom*100));$("gallery-zoom-value").textContent=Math.round(data.get(c).zoom*100)+"%"}}
$("gallery-zoom").addEventListener("input",e=>{const v=data.get(work),z=Number(e.target.value)/100,cx=work.clientWidth/2,cy=work.clientHeight/2;v.offsetX=cx-(cx-v.offsetX)*z/v.zoom;v.offsetY=cy-(cy-v.offsetY)*z/v.zoom;v.zoom=z;syncZoom(work);paint(work)});
const drag=panel.querySelector(".gallery-workspace-drag");let dragOrigin=null;
drag.onpointerdown=e=>{
 const top=document.querySelector(".controls")?.offsetHeight||42;
 dragOrigin={x:e.clientX,y:e.clientY,side:panel.getBoundingClientRect().width,book:container.clientHeight,available:Math.max(180,viewer.clientHeight-top)};
 drag.setPointerCapture(e.pointerId);e.preventDefault();
};
drag.onpointermove=e=>{
 if(!dragOrigin||!drag.hasPointerCapture(e.pointerId))return;
 if(stacked){
  topRatio=Math.max(.2,Math.min(.8,(dragOrigin.book+e.clientY-dragOrigin.y)/dragOrigin.available));
 }else{
  sideRatio=Math.max(.2,Math.min(.85,(dragOrigin.side+dragOrigin.x-e.clientX)/Math.max(1,viewer.clientWidth)));
 }
 layoutWorkspace();
};
const stopDrag=()=>{dragOrigin=null};
drag.onpointerup=stopDrag;drag.onpointercancel=stopDrag;drag.onlostpointercapture=stopDrag;
new ResizeObserver(()=>{if(current==="workspace")resize(work);if(current==="white")resize(board)}).observe(container);
new ResizeObserver(()=>{if(current==="workspace")resize(work)}).observe(panel);
new ResizeObserver(()=>{if(current==="workspace")layoutWorkspace()}).observe(document.querySelector(".controls"));
window.addEventListener("resize",()=>{if(current==="workspace")layoutWorkspace()});

/* Seamless Surface Pen path across the book and whiteboard. The whole stroke is
   captured once at document capture phase and rendered above both panes.
   Positions in the textbook use image coordinates; positions on the whiteboard
   use whiteboard world coordinates, so zoom/pan can re-project annotations. */
const seamCanvas=document.createElement("canvas");
seamCanvas.id="gallery-seam-ink";seamCanvas.setAttribute("aria-hidden","true");
viewer.append(seamCanvas);
function adjustSeamTop(){const h=toolbar?.offsetHeight||42;seamCanvas.style.top=h+"px";seamCanvas.style.height="calc(100% - "+h+"px)"}
adjustSeamTop();
if(window.ResizeObserver)new ResizeObserver(adjustSeamTop).observe(toolbar);
const seamContext=seamCanvas.getContext("2d");
const seamStrokes=[];let seamActive=null;
const pageImage=$("page-image"),toolbar=document.querySelector(".controls"),pageNumber=$("current-page");
const pageId=()=>pageNumber?.textContent?.trim()||"1";
function seamResize(){
 const rect=seamCanvas.getBoundingClientRect(),d=Math.min(2,window.devicePixelRatio||1);
 const w=Math.max(1,Math.round(rect.width*d)),h=Math.max(1,Math.round(rect.height*d));
 if(seamCanvas.width!==w||seamCanvas.height!==h){seamCanvas.width=w;seamCanvas.height=h}
 seamPaint();
}
function seamKind(x,y){
 const b=container.getBoundingClientRect(),w=work.getBoundingClientRect();
 if(x>=b.left&&x<=b.right&&y>=b.top&&y<=b.bottom)return "book";
 if(x>=w.left&&x<=w.right&&y>=w.top&&y<=w.bottom)return "work";
 return "gap";
}
function seamPoint(e){
 const k=seamKind(e.clientX,e.clientY),r=seamCanvas.getBoundingClientRect();
 if(k==="book"){
  const b=pageImage.getBoundingClientRect();
  return {k,x:(e.clientX-b.left)/Math.max(1,b.width),y:(e.clientY-b.top)/Math.max(1,b.height)};
 }
 if(k==="work"){
  const b=work.getBoundingClientRect(),v=data.get(work);
  return {k,x:(e.clientX-b.left-v.offsetX)/v.zoom,y:(e.clientY-b.top-v.offsetY)/v.zoom};
 }
 return {k,x:e.clientX-r.left,y:e.clientY-r.top};
}
function screenPoint(p){
 const r=seamCanvas.getBoundingClientRect();
 if(p.k==="book"){
  const b=pageImage.getBoundingClientRect();return {x:b.left-r.left+p.x*b.width,y:b.top-r.top+p.y*b.height};
 }
 if(p.k==="work"){
  const b=work.getBoundingClientRect(),v=data.get(work);
  return {x:b.left-r.left+v.offsetX+p.x*v.zoom,y:b.top-r.top+v.offsetY+p.y*v.zoom};
 }
 return {x:p.x,y:p.y};
}
function seamPaint(){
 const d=seamCanvas.width/Math.max(1,seamCanvas.clientWidth);
 seamContext.setTransform(1,0,0,1,0,0);
 seamContext.clearRect(0,0,seamCanvas.width,seamCanvas.height);
 seamContext.setTransform(d,0,0,d,0,0);
 seamContext.lineCap="round";seamContext.lineJoin="round";
 const currentPage=pageId();
 for(const s of seamStrokes){
  const visible=s.points.filter(p=>p.k!=="book"||s.page===currentPage);
  if(!visible.length)continue;
  seamContext.strokeStyle=s.colour;seamContext.fillStyle=s.colour;
  seamContext.lineWidth=s.width;seamContext.beginPath();
  for(const [i,p] of visible.entries()){
   const q=screenPoint(p);if(i===0)seamContext.moveTo(q.x,q.y);else seamContext.lineTo(q.x,q.y);
  }
  if(visible.length===1){const q=screenPoint(visible[0]);seamContext.arc(q.x,q.y,s.width/2,0,Math.PI*2);seamContext.fill()}
  else seamContext.stroke();
 }
}
function seamErase(e){
 const p={x:e.clientX-seamCanvas.getBoundingClientRect().left,y:e.clientY-seamCanvas.getBoundingClientRect().top};
 for(let i=seamStrokes.length-1;i>=0;i--){
  if(seamStrokes[i].points.some(q=>{if(q.k==="book"&&seamStrokes[i].page!==pageId())return false;
   const t=screenPoint(q);return Math.hypot(t.x-p.x,t.y-p.y)<22;}))seamStrokes.splice(i,1);
 }
 seamPaint();
}
function seamEraser(e){
 return erase||e.pointerType==="pen"&&(e.button===5||(e.buttons&32)!==0);
}
document.addEventListener("pointerdown",e=>{
 if(current!=="workspace"||e.pointerType==="touch"||!(e.pointerType==="pen"||(e.pointerType==="mouse"&&pen.classList.contains("active"))))return;
 if(e.target.closest("button,input,select,.controls,.gallery-workspace-title,.gallery-workspace-drag,.calculator-panel,.lb-handle"))return;
 const k=seamKind(e.clientX,e.clientY);
 if(k!=="book"&&k!=="work")return;
 e.preventDefault();e.stopImmediatePropagation();
 const erasing=seamEraser(e);
 seamActive={id:e.pointerId,erase:erasing};
 if(erasing)seamErase(e);
 else {
  const s={page:pageId(),colour:window.galleryPenColour||"#1a1a1a",width:3,points:[seamPoint(e)]};
  seamStrokes.push(s);seamActive.stroke=s;seamPaint();
 }
 try{viewer.setPointerCapture(e.pointerId)}catch(_){}
},true);
document.addEventListener("pointermove",e=>{
 if(!seamActive||seamActive.id!==e.pointerId)return;
 e.preventDefault();e.stopImmediatePropagation();
 if(seamActive.erase)seamErase(e);
 else{seamActive.stroke.points.push(seamPoint(e));seamPaint()}
},true);
function seamEnd(e){
 if(seamActive?.id===e.pointerId){seamActive=null;try{if(viewer.hasPointerCapture(e.pointerId))viewer.releasePointerCapture(e.pointerId)}catch(_){}}
}
document.addEventListener("pointerup",seamEnd,true);
document.addEventListener("pointercancel",seamEnd,true);
window.gallerySeamInk={clearAll(){seamStrokes.length=0;seamActive=null;seamPaint()},redraw:seamPaint};
if(window.ResizeObserver)new ResizeObserver(seamResize).observe(seamCanvas);
if(pageImage&&window.MutationObserver)new MutationObserver(seamPaint).observe(pageImage,{attributes:true,attributeFilter:["style","src"]});
if(pageNumber&&window.MutationObserver)new MutationObserver(seamPaint).observe(pageNumber,{subtree:true,childList:true,characterData:true});
container.addEventListener("scroll",seamPaint,{passive:true});
window.addEventListener("resize",seamResize);
seamResize();

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
 const ar=area.getBoundingClientRect();context.save();context.beginPath();context.rect(ar.left-cr.left,ar.top-cr.top,ar.width,ar.height);context.clip();
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
 context.restore();
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
if(window.ResizeObserver)new ResizeObserver(()=>redraw()).observe(area);
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

