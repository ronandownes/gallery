(function(){
"use strict";
const $=id=>document.getElementById(id),container=$("image-container"),pen=$("tool-pen"),viewer=document.querySelector(".viewer");
if(!container||!pen||!viewer)return;
window.galleryPenColour="#1a1a1a";
const colours=document.createElement("div");colours.className="gallery-pen-palette";colours.setAttribute("aria-label","Pen colours");
for(const [name,c] of [["Black","#1a1a1a"],["Blue","#205da9"],["Red","#e63329"],["Green","#3fae49"]]){
 const b=document.createElement("button");b.className="gallery-pen-swatch";b.type="button";b.style.setProperty("--ink",c);b.title=name;b.setAttribute("aria-label",name+" pen");b.setAttribute("aria-pressed",String(name==="Black"));
 b.onclick=()=>{window.galleryPenColour=c;colours.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));pen.classList.add("active")};
 colours.append(b);
}
pen.after(colours);
const button=(id,label,title)=>{const b=document.createElement("button");b.id=id;b.type="button";b.className="toolbar-btn gallery-tool-short";b.textContent=label;b.title=title;return b};
const workspaceButton=button("gallery-book-left","Left","Book left, whiteboard right");
const layoutButton=button("gallery-book-top","Top","Book top, whiteboard below");
const whiteButton=button("gallery-white-toggle","Full screen","Show the selected Whiteboard or Camera across the entire teaching area");
const clearButton=button("gallery-workspace-clear","Clear work","Clear writing surface");
const panButton=button("gallery-pan-toggle","Pan","Enable one-finger and mouse dragging to move the book or whiteboard");
window.galleryPanEnabled=true;
panButton.classList.add("active");
panButton.setAttribute("aria-pressed","true");
document.body.classList.add("gallery-pan-on");
panButton.title="Pan ON — click to disable mouse dragging";
panButton.onclick=()=>{window.galleryPanEnabled=!window.galleryPanEnabled;panButton.classList.toggle("active",window.galleryPanEnabled);panButton.setAttribute("aria-pressed",String(window.galleryPanEnabled));document.body.classList.toggle("gallery-pan-on",window.galleryPanEnabled);panButton.title=window.galleryPanEnabled?"Pan ON — click to disable dragging":"Pan OFF — click to enable dragging";};
const tools=document.querySelector(".controls-right")||pen.parentElement;
const leftTools=document.querySelector(".controls-left");
if(leftTools&&!document.getElementById("gallery-home")){
 const home=document.createElement("a");
 home.id="gallery-home";home.href="../index.html";home.title="Back to Gallery";home.setAttribute("aria-label","Home — Gallery");
 home.className="toolbar-btn gallery-home";
 home.innerHTML='<svg aria-hidden="true" viewBox="0 0 38 38" width="22" height="22"><circle cx="10" cy="10" r="7" fill="#E63329"/><circle cx="28" cy="10" r="7" fill="#3FAE49"/><circle cx="10" cy="28" r="7" fill="#205DA9"/><circle cx="28" cy="28" r="7" fill="#1A1A1A"/></svg>';
 leftTools.prepend(home);
}
// Keep both recording controls alongside Home at the visible start of the toolbar.
// Moving the existing elements preserves all event handlers in recorder.js.
if(leftTools){
 const home=document.getElementById("gallery-home");
 const rec=document.getElementById("gallery-record-voice");
 const silent=document.getElementById("gallery-record-silent");
 const timer=document.getElementById("gallery-record-timer");
 const mic=document.getElementById("gallery-mic-meter");
 if(home){
  let previous=home;
  for(const el of [rec,silent,timer,mic]){
   if(!el)continue;
   previous.after(el);previous=el;
  }
 }
}

tools.prepend(layoutButton,workspaceButton,whiteButton,panButton,clearButton);
pen.classList.add("active");
// Page arrows remain permanently visible, regardless of older saved settings.
const alwaysArrows=$("smart-nav");
if(alwaysArrows){
 alwaysArrows.classList.remove("hidden");
 if(window.MutationObserver)new MutationObserver(()=>{
  if(alwaysArrows.classList.contains("hidden"))alwaysArrows.classList.remove("hidden");
 }).observe(alwaysArrows,{attributes:true,attributeFilter:["class"]});
}

const bookZoomControl=document.createElement("label");bookZoomControl.className="gallery-book-zoom";
bookZoomControl.innerHTML='<span>Book</span><input type="range" min="50" max="800" step="25" value="100" aria-label="Book zoom"><output>100%</output>';
tools.append(bookZoomControl);
const bookZoomSlider=bookZoomControl.querySelector("input");
bookZoomSlider.addEventListener("input",()=>{
 const z=Number(bookZoomSlider.value)/100;
 window.gallerySetBookZoom?.(z);
 bookZoomControl.querySelector("output").textContent=Math.round(z*100)+"%";
});
// Essential actions are always visible on the single toolbar.
for(const id of ["fit-height","fit-width","tool-undo","copy-link","print-range-btn","fullscreen"]){
 const el=$(id);
 if(el){el.hidden=false;el.style.display="";el.setAttribute("aria-label",el.title||id)}
}
const ico=document.querySelector('link[rel="icon"]');
if(!ico){const link=document.createElement("link");link.rel="icon";link.type="image/svg+xml";link.href="../favicon.svg?v=4dots";document.head.append(link)}
const panel=document.createElement("section");panel.className="gallery-workspace";panel.setAttribute("aria-label","Teaching writing surface");
panel.innerHTML='<div class="gallery-workspace-drag" title="Drag to resize writing area"></div><div class="gallery-workspace-title"><strong>Writing surface</strong><div class="gallery-zoom-controls"><label for="gallery-zoom">Zoom</label><input id="gallery-zoom" type="range" min="25" max="400" value="100" step="5"><span id="gallery-zoom-value">100%</span></div></div><canvas id="gallery-workspace-canvas" aria-label="Whiteboard"></canvas>';
viewer.append(panel);
// Shared workspace can display either the digital writing canvas or a document camera.
const cameraPanel=document.createElement("div");cameraPanel.id="gallery-camera-panel";
cameraPanel.innerHTML='<video id="gallery-camera-video" autoplay playsinline muted aria-label="Live document camera"></video><div id="gallery-camera-status">Select Camera to start your document camera.</div>';
panel.append(cameraPanel);
const cameraSelect=document.createElement("select");cameraSelect.id="gallery-workspace-source";cameraSelect.setAttribute("aria-label","Workspace source");
cameraSelect.innerHTML='<option value="whiteboard">Whiteboard</option><option value="camera">Camera</option>';
const cameraDevices=document.createElement("select");cameraDevices.id="gallery-camera-device";cameraDevices.setAttribute("aria-label","Choose camera");cameraDevices.hidden=true;
const cameraSnapshot=button("gallery-camera-snapshot","Photo","Save a still photograph of the document camera as PNG");cameraSnapshot.hidden=true;
const cameraFit=button("gallery-camera-fit","Fit","Fit whole camera image without cropping");cameraFit.hidden=true;
cameraFit.setAttribute("aria-pressed","false");
cameraFit.onclick=()=>{
 const fit=cameraVideo.classList.toggle("gallery-camera-contain");
 cameraFit.textContent=fit?"Fill":"Fit";
 cameraFit.title=fit?"Fill the available space (edges may be cropped)":"Fit whole camera image without cropping";
 cameraFit.setAttribute("aria-pressed",String(fit));
};
const cameraStatus=cameraPanel.querySelector("#gallery-camera-status");
const cameraVideo=cameraPanel.querySelector("video");
const titleBar=panel.querySelector(".gallery-workspace-title");
const zoomGroup=titleBar.querySelector(".gallery-zoom-controls");
titleBar.insertBefore(cameraSelect,zoomGroup);
titleBar.insertBefore(cameraDevices,zoomGroup);
titleBar.insertBefore(cameraSnapshot,zoomGroup);
titleBar.insertBefore(cameraFit,zoomGroup);
const workspaceTitle=titleBar.querySelector("strong");
const focusLock=button("gallery-camera-focus-lock","Lock focus","Lock focus at the current position");
const lightLock=button("gallery-camera-exposure-lock","Lock light","Lock exposure to stop brightness changes");
const cameraBrightness=document.createElement("label");cameraBrightness.id="gallery-camera-brightness";
cameraBrightness.title="Display-only brightness; does not lock camera hardware exposure";
cameraBrightness.innerHTML='<span>Bright</span><input type="range" min="80" max="180" step="5" value="120" aria-label="Camera image display brightness"><output>120%</output>';
for(const el of [focusLock,lightLock,cameraBrightness]){el.hidden=true;titleBar.insertBefore(el,zoomGroup)}
const brightSlider=cameraBrightness.querySelector("input");
// The likely subject is white paper. Start slightly brighter, but keep hardware auto-exposure enabled.
cameraVideo.style.filter="brightness(1.2)";
brightSlider.oninput=()=>{cameraVideo.style.filter="brightness("+Number(brightSlider.value)/100+")";cameraBrightness.querySelector("output").textContent=brightSlider.value+"%";};

let cameraStream=null,cameraRequest=0,workspaceSource="whiteboard";
let cameraLockBusy=false;
function cameraCapabilities(){
 const track=cameraStream?.getVideoTracks()[0];
 const caps=track?.getCapabilities?.()||{};
 return {track,caps};
}
function supportsMode(cap,name){return Array.isArray(cap)&&cap.includes(name)}
function syncCameraControls(){
 const {track,caps}=cameraCapabilities();
 const settings=track?.getSettings?.()||{};
 const focusOK=!!track&&supportsMode(caps.focusMode,"manual");
 const lightOK=!!track&&supportsMode(caps.exposureMode,"manual");
 focusLock.hidden=!focusOK||workspaceSource!=="camera";
 lightLock.hidden=!lightOK||workspaceSource!=="camera";
 cameraBrightness.hidden=workspaceSource!=="camera";
 const focusLocked=settings.focusMode==="manual";
 const lightLocked=settings.exposureMode==="manual";
 for(const [b,on,label] of [[focusLock,focusLocked,"focus"],[lightLock,lightLocked,"light"]]){
  b.classList.toggle("active",on);b.setAttribute("aria-pressed",String(on));
  b.textContent=on?"Unlock "+label:"Lock "+label;
  b.disabled=cameraLockBusy;
 }
}
async function setCameraMode(kind){
 const {track,caps}=cameraCapabilities();
 if(!track||cameraLockBusy)return;
 const focus=kind==="focus";const key=focus?"focusMode":"exposureMode";
 const modes=caps[key];
 if(!supportsMode(modes,"manual"))return;
 const settings=track.getSettings?.()||{};
 const manual=settings[key]==="manual";
 const next=manual?(supportsMode(modes,"continuous")?"continuous":supportsMode(modes,"single-shot")?"single-shot":null):"manual";
 if(!next){alert("This camera does not offer an automatic mode to restore.");return}
 cameraLockBusy=true;syncCameraControls();
 try{
  // Keep the current focus distance or exposure level when switching to manual.
  // Chromium support varies by camera: do not claim a lock until readback confirms it.
  await track.applyConstraints({advanced:[{[key]:next}]});
  const actual=track.getSettings?.()||{};
  if(actual[key]!==next){
   alert("Chrome did not confirm the "+(focus?"focus":"exposure")+" lock on this camera. You may need the camera's own controls.");
  }
 }catch(e){alert("Camera "+(focus?"focus":"exposure")+" control unavailable: "+e.message)}
 finally{cameraLockBusy=false;syncCameraControls()}
}
focusLock.onclick=()=>setCameraMode("focus");
lightLock.onclick=()=>setCameraMode("exposure");

async function stopCamera(){
 ++cameraRequest;
 if(cameraStream){for(const t of cameraStream.getTracks())t.stop();cameraStream=null}
 cameraVideo.srcObject=null;
}
async function listCameraDevices(){
 if(!navigator.mediaDevices?.enumerateDevices)return;
 try{
  const devices=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==="videoinput");
  const prior=cameraDevices.value;
  cameraDevices.replaceChildren();
  for(let i=0;i<devices.length;i++){const o=document.createElement("option");o.value=devices[i].deviceId;o.textContent=devices[i].label||"Camera "+(i+1);cameraDevices.append(o)}
  if([...cameraDevices.options].some(o=>o.value===prior))cameraDevices.value=prior;
  cameraDevices.hidden=devices.length<2;
 }catch(e){cameraDevices.hidden=true}
}
async function startCamera(){
 const serial=++cameraRequest;
 if(!navigator.mediaDevices?.getUserMedia){cameraStatus.textContent="Camera access needs Chrome on HTTPS (or localhost).";return}
 cameraStatus.textContent="Starting camera…";cameraStatus.hidden=false;
 try{
  const constraint=cameraDevices.value?{deviceId:{ideal:cameraDevices.value}}:true;
  const stream=await navigator.mediaDevices.getUserMedia({video:constraint,audio:false});
  if(serial!==cameraRequest||workspaceSource!=="camera"){stream.getTracks().forEach(t=>t.stop());return}
  if(cameraStream)cameraStream.getTracks().forEach(t=>t.stop());
  cameraStream=stream;cameraVideo.srcObject=stream;
  await cameraVideo.play();
  cameraStatus.hidden=true;
  await listCameraDevices();
  syncCameraControls();
  const track=stream.getVideoTracks()[0];
  track?.addEventListener("ended",()=>{if(cameraStream===stream){cameraStatus.textContent="Camera disconnected. Choose Camera again to restart.";cameraStatus.hidden=false}}, {once:true});
 }catch(e){if(serial===cameraRequest){cameraStatus.hidden=false;cameraStatus.textContent="Camera unavailable: "+(e.message||e.name)}}
}
async function selectWorkspaceSource(source){
 workspaceSource=source==="camera"?"camera":"whiteboard";
 cameraSelect.value=workspaceSource;
 const isCam=workspaceSource==="camera";
 panel.classList.toggle("gallery-camera-mode",isCam);
 cameraSnapshot.hidden=!isCam;cameraFit.hidden=!isCam;zoomGroup.hidden=isCam;
  syncCameraControls();
 workspaceTitle.textContent=isCam?"Document camera":"Writing surface";
 if(isCam){await startCamera()}else{await stopCamera();requestAnimationFrame(()=>resize(work))}
}
cameraSelect.onchange=async()=>{
 const next=cameraSelect.value;
 if(current==="camera"||current==="white")showMode(next==="camera"?"camera":"white");
 await selectWorkspaceSource(next);
 syncSourceButton();
};
cameraDevices.onchange=()=>{if(workspaceSource==="camera")startCamera()};
cameraSnapshot.onclick=()=>{
 if(!cameraStream||!cameraVideo.videoWidth){alert("Start the document camera before taking a photo.");return}
 const cv=document.createElement("canvas");cv.width=cameraVideo.videoWidth;cv.height=cameraVideo.videoHeight;
 const photoCtx=cv.getContext("2d");photoCtx.filter="brightness("+Number(brightSlider.value)/100+")";photoCtx.drawImage(cameraVideo,0,0);
 cv.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="Gallery-Camera-"+new Date().toISOString().replace(/[:.]/g,"-")+".png";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)},"image/png");
};
document.addEventListener("visibilitychange",()=>{if(document.hidden&&cameraStream&&workspaceSource!=="camera")stopCamera()});
window.addEventListener("pagehide",()=>stopCamera());
const board=document.createElement("canvas");board.id="gallery-whiteboard";viewer.append(board);
const work=panel.querySelector("canvas"),all=[board,work],data=new Map(all.map(c=>[c,{strokes:[],active:null,mode:"draw",zoom:1,offsetX:0,offsetY:0,pointers:new Map(),gesture:null}]));let current="book",stacked=false,sideRatio=.58,topRatio=.42;
function resize(c){const d=Math.max(1,devicePixelRatio||1),r=c.getBoundingClientRect();if(r.width<1||r.height<1)return;c.width=Math.round(r.width*d);c.height=Math.round(r.height*d);paint(c)}
function paint(c){const v=data.get(c),g=c.getContext("2d"),d=c.width/Math.max(1,c.clientWidth);g.clearRect(0,0,c.width,c.height);g.setTransform(d,0,0,d,0,0);g.lineCap="round";g.lineJoin="round";g.save();g.translate(v.offsetX,v.offsetY);g.scale(v.zoom,v.zoom);
for(const s of v.strokes){if(!s.points.length)continue;g.strokeStyle=s.colour;g.fillStyle=s.colour;g.lineWidth=s.width;g.beginPath();s.points.forEach((p,i)=>i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y));if(s.points.length===1){g.arc(s.points[0].x,s.points[0].y,Math.max(1,s.width/2),0,Math.PI*2);g.fill()}else g.stroke()}g.restore();window.gallerySeamInk?.redraw?.()}
function position(c,e){const r=c.getBoundingClientRect(),v=data.get(c);return{x:(e.clientX-r.left-v.offsetX)/v.zoom,y:(e.clientY-r.top-v.offsetY)/v.zoom}}
function removeAt(c,p){const v=data.get(c),radius=14/v.zoom;v.strokes=v.strokes.filter(s=>!s.points.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<radius));paint(c)}
function down(c,e){const v=data.get(c);if(e.pointerType==="touch"){v.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(v.pointers.size===2){const p=[...v.pointers.values()],dist=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);v.gesture={dist,zoom:v.zoom,offX:v.offsetX,offY:v.offsetY,cx:(p[0].x+p[1].x)/2,cy:(p[0].y+p[1].y)/2}}c.setPointerCapture(e.pointerId);return}
e.preventDefault();const p=position(c,e),isErase=e.pointerType==="pen"&&(e.button===5||(e.buttons&32)!==0);
v.active={id:e.pointerId,erase:isErase};c.setPointerCapture(e.pointerId);
if(isErase)removeAt(c,p);else{const s={colour:window.galleryPenColour,width:3,points:[p]};v.strokes.push(s);v.active.stroke=s;paint(c)}}
function move(c,e){const v=data.get(c);if(e.pointerType==="touch"&&v.pointers.has(e.pointerId)){const old=v.pointers.get(e.pointerId);v.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(v.pointers.size===2&&v.gesture){const ps=[...v.pointers.values()],dist=Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y),z=Math.min(4,Math.max(.25,v.gesture.zoom*dist/Math.max(1,v.gesture.dist)));const r=c.getBoundingClientRect(),cx=(ps[0].x+ps[1].x)/2-r.left,cy=(ps[0].y+ps[1].y)/2-r.top,ox=v.gesture.cx-r.left,oy=v.gesture.cy-r.top;v.offsetX=cx-(ox-v.gesture.offX)*z/v.gesture.zoom;v.offsetY=cy-(oy-v.gesture.offY)*z/v.gesture.zoom;v.zoom=z;syncZoom(c);paint(c)}else if(v.pointers.size===1&&window.galleryPanEnabled){v.offsetX+=e.clientX-old.x;v.offsetY+=e.clientY-old.y;paint(c)}return}
if(!v.active||v.active.id!==e.pointerId)return;e.preventDefault();const p=position(c,e);if(v.active.erase)removeAt(c,p);else{v.active.stroke.points.push(p);paint(c)}}
function up(c,e){const v=data.get(c);if(e.pointerType==="touch"){v.pointers.delete(e.pointerId);v.gesture=null}else if(v.active&&v.active.id===e.pointerId)v.active=null}
for(const c of all){c.addEventListener("pointerdown",e=>down(c,e));c.addEventListener("pointermove",e=>move(c,e));c.addEventListener("pointerup",e=>up(c,e));c.addEventListener("pointercancel",e=>up(c,e));}
function activeCanvas(){return current==="workspace"?work:board}
function updateView(){
 const on=current==="workspace"||current==="camera";
 document.body.classList.toggle("gallery-camera-full",current==="camera");
 document.body.classList.toggle("gallery-workspace-on",on);
 document.body.classList.toggle("gallery-whiteboard-on",current==="white");
 workspaceButton.classList.toggle("active",current==="workspace"&&!stacked);bookZoomControl.hidden=current!=="workspace";
 layoutButton.classList.toggle("active",current==="workspace"&&stacked);
 workspaceButton.setAttribute("aria-pressed",String(current==="workspace"&&!stacked));
 layoutButton.setAttribute("aria-pressed",String(current==="workspace"&&stacked));
 whiteButton.setAttribute("aria-pressed",String(current==="white"||current==="camera"));
 whiteButton.classList.toggle("active",current==="white"||current==="camera");
 layoutWorkspace();
 if(current==="white")requestAnimationFrame(()=>resize(board));
 if(current==="workspace")requestAnimationFrame(()=>resize(work));
 requestAnimationFrame(()=>window.gallerySeamInk?.redraw?.());
}
function layoutWorkspace(){
 const on=current==="workspace"||current==="camera",nav=$("smart-nav");
 if(current==="camera"){
  const top=document.querySelector(".controls")?.offsetHeight||42;
  container.style.marginRight="";container.style.height="";container.style.flex="";
  panel.style.left="0";panel.style.right="0";panel.style.width="100%";panel.style.top=top+"px";panel.style.bottom="0";
  if(nav){nav.style.right="";nav.style.bottom="";nav.style.top=top+"px"}
  document.body.classList.remove("gallery-workspace-stacked");return;
 }
 layoutButton.setAttribute("aria-pressed",String(on&&stacked));
 document.body.classList.toggle("gallery-workspace-stacked",on&&stacked);
 if(!on){
  container.style.marginRight="";container.style.flex="";container.style.height="";
  if(nav){nav.style.right="";nav.style.top=(document.querySelector(".controls")?.offsetHeight||42)+"px";nav.style.bottom=""}
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
let wantTop=false;
let originalBookView=null;
function captureBookView(){
 const im=$("page-image").getBoundingClientRect(),rect=container.getBoundingClientRect();
 return {
  zoom:window.galleryGetBookZoom?.()||1,
  fit:container.classList.contains("fit-width")?"width":"height",
  scrollTop:container.scrollTop,scrollLeft:container.scrollLeft,
  x:(rect.left+rect.width*.5-im.left)/Math.max(1,im.width),
  y:(rect.top+rect.height*.5-im.top)/Math.max(1,im.height)
 };
}
function showMode(mode){
 // Layout changes do not change the selected Camera/Whiteboard source.
 if(mode===current&&!(mode==="workspace"&&stacked!==wantTop))return;
 if(current==="book"&&mode!=="book")originalBookView=captureBookView();
 const im=$("page-image").getBoundingClientRect(),cr=container.getBoundingClientRect();
 const isTop=mode==="workspace"&&wantTop;
 // Enter Top centred on the lower strip of the question. Do not reset its magnification.
 const ax=(cr.left+cr.width*.5-im.left)/Math.max(1,im.width);
 const ay=(cr.top+cr.height*(isTop?.82:.5)-im.top)/Math.max(1,im.height);
 const displayedWidth=im.width;
 current=mode;
 if(mode==="workspace")stacked=wantTop;
 updateView();
 if(mode==="white"||mode==="camera")return;
 const returningToBook=mode==="book"&&originalBookView!==null;
 const saved=returningToBook?{...originalBookView}:null;
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
  if(returningToBook){
   // Restore the original fit, zoom and focal point when Top or Left is switched off.
   const fitButton=$(saved.fit==="width"?"fit-width":"fit-height");
   fitButton?.click();
   window.gallerySetBookZoom?.(saved.zoom);
   container.scrollTop=saved.scrollTop;container.scrollLeft=saved.scrollLeft;
   const newRect=container.getBoundingClientRect();
   window.galleryAlignBookPoint?.(saved.x,saved.y,newRect.left+newRect.width*.5,newRect.top+newRect.height*.5);
   originalBookView=null;
  }else{
   window.gallerySetBookPixelWidth?.(displayedWidth,isTop);
   const newRect=container.getBoundingClientRect();
   window.galleryAlignBookPoint?.(ax,ay,newRect.left+newRect.width*.5,newRect.top+newRect.height*(isTop?.76:.5));
  }
  const percent=Math.round((window.galleryGetBookZoom?.()||1)*100);
  bookZoomSlider.value=String(Math.max(50,Math.min(800,Math.round(percent/25)*25)));
  bookZoomControl.querySelector("output").textContent=percent+"%";
 }));
}
// Layout (Top / Left / Full screen) and source (Camera / Whiteboard) are independent.
function fullWorkspace(){showMode(workspaceSource==="camera"?"camera":"white")}
layoutButton.onclick=()=>{
 const off=current==="workspace"&&stacked;
 wantTop=true;off?fullWorkspace():showMode("workspace");
};
workspaceButton.onclick=()=>{
 const off=current==="workspace"&&!stacked;
 wantTop=false;off?fullWorkspace():showMode("workspace");
};
whiteButton.onclick=()=>fullWorkspace();
const cameraTool=button("gallery-camera-toggle","Camera","Switch the current workspace between Camera and Whiteboard");
whiteButton.after(cameraTool);
function syncSourceButton(){
 const cam=workspaceSource==="camera";
 cameraTool.textContent=cam?"Whiteboard":"Camera";
 cameraTool.title=cam?"Switch this workspace to the Whiteboard":"Switch this workspace to the Camera";
 cameraTool.classList.toggle("active",cam);
 cameraTool.setAttribute("aria-pressed",String(cam));
}
cameraTool.onclick=async()=>{
 const next=workspaceSource==="camera"?"whiteboard":"camera";
 // Switch the source without changing the selected Top / Left / Full screen layout.
 if(current!=="workspace"&&current!=="camera"&&current!=="white")showMode(next==="camera"?"camera":"white");
 else if(current==="camera"||current==="white")showMode(next==="camera"?"camera":"white");
 await selectWorkspaceSource(next);
 syncSourceButton();
};
syncSourceButton();



// Mouse wheel over the book zooms around the pointer, while touch pinch remains intact.
// Capturing prevents the previous Ctrl+wheel viewer handler from applying a second zoom.
container.addEventListener("wheel",event=>{
 if(current==="white")return;
 if(event.altKey||event.shiftKey)return; // Keep an escape hatch for page scrolling.
 const image=$("page-image"),before=image?.getBoundingClientRect();
 if(!before||before.width<1||!window.gallerySetBookZoom)return;
 event.preventDefault();event.stopImmediatePropagation();
 const x=(event.clientX-before.left)/before.width;
 const y=(event.clientY-before.top)/before.height;
 const currentZoom=window.galleryGetBookZoom?.()||1;
 const dy=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?container.clientHeight:1);
 const factor=Math.exp(-Math.max(-240,Math.min(240,dy))*.002);
 const next=Math.max(.25,Math.min(8,currentZoom*factor));
 window.gallerySetBookZoom(next);
 window.galleryAlignBookPoint?.(x,y,event.clientX,event.clientY);
 const percent=Math.round((window.galleryGetBookZoom?.()||1)*100);
 bookZoomSlider.value=String(Math.max(50,Math.min(800,Math.round(percent/25)*25)));
 bookZoomControl.querySelector("output").textContent=percent+"%";
},{capture:true,passive:false});
// One clear action resets EVERY drawing store, regardless of Book Left / Book Top.
let clearingAll=false;
const nativeClearButton=$("tool-clear-ink");
function clearAllTeachingInk(){
 if(clearingAll)return;
 clearingAll=true;
 try {
  // Top / left: the modern image-anchored pen strokes and bridging strokes.
  window.galleryClearBookInk?.();
  window.gallerySeamInk?.clearAll?.();
  // Bottom / right and independent whiteboard: reset both drawing stores.
  for(const c of all){
   const v=data.get(c);
   v.strokes.length=0;v.active=null;
   const g=c.getContext("2d");
   g.setTransform(1,0,0,1,0,0);
   g.clearRect(0,0,c.width,c.height);
   paint(c);
  }
  // The original textbook viewer also has a separate older pen canvas.
  // Reset its backing array, not merely its visible pixels.
  if(typeof window.galleryClearNativeInk==="function"){
   window.galleryClearNativeInk();
  }else if(nativeClearButton){
   // Other Gallery viewers get the same behaviour without needing an update.
   nativeClearButton.click();
  }
  // Redraw cleared overlays once at the end to avoid stale ink reappearing.
  window.galleryClearBookInk?.();
  window.gallerySeamInk?.clearAll?.();
 }finally{clearingAll=false}
}
clearButton.onclick=clearAllTeachingInk;
if(nativeClearButton){
 nativeClearButton.addEventListener("click",e=>{
  if(clearingAll)return; // Programmatic click: let the viewer's native clear run.
  e.preventDefault();e.stopImmediatePropagation();
  clearAllTeachingInk();
 },true);
}
window.galleryClearAllTeachingInk=clearAllTeachingInk;
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
new ResizeObserver(()=>{
 const top=document.querySelector(".controls")?.offsetHeight||42;
 board.style.top=top+"px";board.style.height="calc(100% - "+top+"px)";
 layoutWorkspace();
 if(current==="white")resize(board);
}).observe(document.querySelector(".controls"));
window.addEventListener("resize",()=>{if(current==="workspace")layoutWorkspace()});

/* Seamless Surface Pen path across the book and whiteboard. The whole stroke is
   captured once at document capture phase and rendered above both panes.
   Positions in the textbook use image coordinates; positions on the whiteboard
   use whiteboard world coordinates, so zoom/pan can re-project annotations. */
const toolbar=document.querySelector(".controls");
const seamCanvas=document.createElement("canvas");
seamCanvas.id="gallery-seam-ink";seamCanvas.setAttribute("aria-hidden","true");
viewer.append(seamCanvas);
function adjustSeamTop(){const h=toolbar?.offsetHeight||42;seamCanvas.style.top=h+"px";seamCanvas.style.height="calc(100% - "+h+"px)"}
adjustSeamTop();
if(window.ResizeObserver)new ResizeObserver(adjustSeamTop).observe(toolbar);
const seamContext=seamCanvas.getContext("2d");
const seamStrokes=[];let seamActive=null;
const pageImage=$("page-image"),pageNumber=$("current-page");
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
 const zone=seamKind(e.clientX,e.clientY);
 if(zone==="book")window.galleryEraseBookInkAtClient?.(e.clientX,e.clientY);
 if(zone==="work")removeAt(work,position(work,e));
 const p={x:e.clientX-seamCanvas.getBoundingClientRect().left,y:e.clientY-seamCanvas.getBoundingClientRect().top};
 for(let i=seamStrokes.length-1;i>=0;i--){
  if(seamStrokes[i].points.some(q=>{if(q.k==="book"&&seamStrokes[i].page!==pageId())return false;
   const t=screenPoint(q);return Math.hypot(t.x-p.x,t.y-p.y)<22;}))seamStrokes.splice(i,1);
 }
 seamPaint();
}
function seamEraser(e){
 return e.pointerType==="pen"&&(e.button===5||(e.buttons&32)!==0);
}
document.addEventListener("pointerdown",e=>{
 if(current==="white"||e.pointerType!=="pen")return; // Surface Pen always draws on Book, Top and Left.
 if(e.target.closest("button,input,select,.controls,.gallery-workspace-title,.gallery-workspace-drag,.calculator-panel,.lb-handle"))return;
 const k=seamKind(e.clientX,e.clientY);
 if(k!=="book"&&(current!=="workspace"||k!=="work"))return;
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
window.galleryGetSeamPageInk=key=>seamStrokes.filter(s=>s.page===String(key)).map(s=>({colour:s.colour,width:s.width,points:s.points.filter(p=>p.k==='book').map(p=>({x:p.x,y:p.y}))})).filter(s=>s.points.length);
window.gallerySeamDebug=()=>({view:current,strokes:seamStrokes.length,active:!!seamActive,page:pageId()});
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
window.galleryEraseBookInkAtClient=(x,y)=>eraseAt(coords(x,y));
window.galleryGetFocusPageInk=key=>(pages.get(String(key))||[]).map(s=>({colour:s.colour,width:s.width,points:s.points.map(p=>({x:p.x,y:p.y}))}));
function within(e){if(document.querySelector(".gallery-question-stage.open")?.contains(e.target))return false;const r=bounds();return e.clientX>=r.left&&e.clientX<r.right&&e.clientY>=r.top&&e.clientY<r.bottom}
function usingEraser(e){
 return e.pointerType==="pen"&&(e.button===5||(e.buttons&32)!==0);
}
document.addEventListener("pointerdown",e=>{
 if(e.pointerType!=="mouse"||window.galleryPanEnabled||!penEnabled(e)||!within(e))return; // Explicit Pan mode must not create mouse ink.
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

// Legacy dynamic recorder for textbook viewers without a permanent recording control.
if(!document.getElementById("gallery-record-voice")){
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
}
})();


/* Export only pages with book handwriting, retaining the original examination pages.
   If nothing has been written, export the current page. Browser Save as PDF. */
(function(){
"use strict";
const bar=document.querySelector(".controls-right")||document.querySelector(".controls");
const pageImage=document.getElementById("page-image");
const current=document.getElementById("current-page");
const total=document.getElementById("total-pages");
if(!bar||!pageImage||!current||!total)return;
const button=document.createElement("button");
button.type="button";button.className="toolbar-btn";button.textContent="PDF + ink";
button.title="Save pages from first to last handwritten page, including untouched pages between (or current page if none)";
button.setAttribute("aria-label","Print first through last handwritten page as one PDF");
bar.append(button);
function inkOn(n){
 const k=String(n);
 return {focus:window.galleryGetFocusPageInk?.(k)||[],seam:window.galleryGetSeamPageInk?.(k)||[]};
}
function applyStrokes(ctx,strokes,w,h,seam,displayWidth){
 ctx.lineCap="round";ctx.lineJoin="round";
 for(const stroke of strokes){
  const points=stroke.points||[];if(!points.length)continue;
  ctx.strokeStyle=stroke.colour||"#1a1a1a";ctx.fillStyle=ctx.strokeStyle;
  ctx.lineWidth=seam?Math.max(1,(stroke.width||3)*w/Math.max(1,displayWidth)):Math.max(1,(stroke.width||.003)*w);
  ctx.beginPath();
  points.forEach((p,i)=>i?ctx.lineTo(p.x*w,p.y*h):ctx.moveTo(p.x*w,p.y*h));
  if(points.length===1){ctx.arc(points[0].x*w,points[0].y*h,ctx.lineWidth/2,0,Math.PI*2);ctx.fill()}
  else ctx.stroke();
 }
}
const loadImage=url=>new Promise((resolve,reject)=>{
 const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error("Could not load "+url));img.src=url;
});
button.addEventListener("click",async()=>{
 if(button.disabled)return;
 const totalPages=Number.parseInt(total.textContent||"0",10);
 const currentPage=Number.parseInt(current.textContent||"1",10);
 if(!Number.isInteger(totalPages)||totalPages<1)return alert("Page count is unavailable.");
 const written=[];
 for(let n=1;n<=totalPages;n++){
  const ink=inkOn(n);
  if(ink.focus.length||ink.seam.length)written.push(n);
 }
 // Preserve untouched pages between first and last annotated pages.
 // Example: work on pages 3 and 7 exports pages 3, 4, 5, 6, 7.
 const first=written.length?written[0]:currentPage;
 const last=written.length?written[written.length-1]:currentPage;
 const selected=[];
 for(let n=first;n<=last;n++)selected.push({n,ink:inkOn(n)});
 // Create synchronously during a user click to avoid popup blockers.
 const printWindow=window.open("","_blank");
 if(!printWindow)return alert("Please allow pop-ups to save the annotated PDF.");
 button.disabled=true;
 printWindow.document.open();
 printWindow.document.write('<!doctype html><html><head><title>Gallery annotated pages</title><style>@page{size:A4;margin:0}html,body{margin:0;padding:0;background:white}.sheet{width:210mm;height:297mm;display:flex;align-items:center;justify-content:center;break-after:page;page-break-after:always;overflow:hidden}.sheet:last-child{break-after:auto;page-break-after:auto}.sheet img{max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;display:block}@media screen{.sheet{margin:0 auto;border-bottom:1px solid #ddd}}</style></head><body><p id="status" style="padding:1rem">Preparing '+selected.length+' annotated page(s)…</p><main id="sheets"></main></body></html>');
 printWindow.document.close();
 const objectUrls=[];
 try{
  const base=new URL(pageImage.currentSrc||pageImage.src,location.href);
  const currentFilename=(base.pathname.split("/").pop()||"001.webp");
  const match=currentFilename.match(/^(\d+)(\.[^.]+)$/);
  if(!match)throw Error("Unknown Gallery page naming convention.");
  const widthDigits=match[1].length,extension=match[2];
  const displayWidth=pageImage.getBoundingClientRect().width;
  for(const {n,ink} of selected){
   const url=new URL(base.href);
   url.pathname=url.pathname.replace(/[^/]+$/,String(n).padStart(widthDigits,"0")+extension);
   const img=await loadImage(url.href);
   const canvas=document.createElement("canvas");canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
   const ctx=canvas.getContext("2d");ctx.drawImage(img,0,0);
   applyStrokes(ctx,ink.focus,canvas.width,canvas.height,false,displayWidth);
   applyStrokes(ctx,ink.seam,canvas.width,canvas.height,true,displayWidth);
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/png"));
   if(!blob)throw Error("Image export failed for page "+n);
   const objectUrl=URL.createObjectURL(blob);objectUrls.push(objectUrl);
   const section=printWindow.document.createElement("section");section.className="sheet";
   const out=printWindow.document.createElement("img");out.alt="Gallery page "+n;out.src=objectUrl;
   section.append(out);printWindow.document.getElementById("sheets").append(section);
   await new Promise((resolve,reject)=>{if(out.complete&&out.naturalWidth)return resolve();out.onload=resolve;out.onerror=reject;});
  }
  printWindow.document.getElementById("status").remove();
  printWindow.focus();printWindow.print();
  // Keep image assets valid through the browser print dialogue.
  printWindow.addEventListener("afterprint",()=>objectUrls.forEach(URL.revokeObjectURL),{once:true});
 }catch(error){
  printWindow.document.getElementById("status").textContent="Export failed: "+error.message;
  objectUrls.forEach(URL.revokeObjectURL);
 }finally{button.disabled=false;}
});
})();

// F2 opens/closes the embedded calculator without changing the lesson or recorder.
window.addEventListener("keydown",e=>{if(e.key==="F2"&&!e.ctrlKey&&!e.altKey&&!e.metaKey){e.preventDefault();document.getElementById("calculator-toggle")?.click();}},true);
