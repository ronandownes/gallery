(function(){
"use strict";
const $=id=>document.getElementById(id),container=$("image-container"),pen=$("tool-pen");
if(!container||!pen)return;
window.galleryPenColour="#111111";
let on=false,strokes=[],drawing=null,ctx=null;
const canvas=document.createElement("canvas");canvas.id="gallery-whiteboard";container.append(canvas);
const toggle=document.createElement("button");toggle.id="gallery-whiteboard-toggle";toggle.type="button";toggle.className="toolbar-btn";toggle.textContent="□";toggle.title="White screen / book";toggle.setAttribute("aria-pressed","false");pen.before(toggle);
const colours=document.createElement("div");colours.className="gallery-pen-palette";colours.setAttribute("role","group");colours.setAttribute("aria-label","Pen colour");
for(const [name,colour] of [["Black","#111111"],["Blue","#1462ca"],["Red","#d32929"],["Green","#168348"]]){
 const b=document.createElement("button");b.className="gallery-pen-swatch";b.type="button";b.style.setProperty("--ink",colour);b.title=name;b.setAttribute("aria-label",name+" pen");b.setAttribute("aria-pressed",String(name==="Black"));
 b.onclick=()=>{window.galleryPenColour=colour;colours.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));if(!pen.classList.contains("active"))pen.click();input()};
 colours.append(b);
}
pen.after(colours);
function paint(){
 if(!ctx)return;const w=canvas.clientWidth,h=canvas.clientHeight;ctx.clearRect(0,0,w,h);ctx.lineCap="round";ctx.lineJoin="round";ctx.lineWidth=3;
 for(const s of strokes){ctx.strokeStyle=s.colour;ctx.fillStyle=s.colour;ctx.beginPath();s.points.forEach((p,i)=>i?ctx.lineTo(p.x*w,p.y*h):ctx.moveTo(p.x*w,p.y*h));if(s.points.length===1){const p=s.points[0];ctx.beginPath();ctx.arc(p.x*w,p.y*h,1.5,0,Math.PI*2);ctx.fill()}else ctx.stroke()}
}
function resize(){const d=window.devicePixelRatio||1;canvas.width=Math.round(canvas.clientWidth*d);canvas.height=Math.round(canvas.clientHeight*d);ctx=canvas.getContext("2d");ctx.setTransform(d,0,0,d,0,0);paint()}
function point(e){const r=canvas.getBoundingClientRect();return{x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))}}
function input(){canvas.style.pointerEvents=on&&pen.classList.contains("active")?"auto":"none"}
toggle.onclick=()=>{on=!on;document.body.classList.toggle("gallery-whiteboard-on",on);toggle.classList.toggle("active",on);toggle.setAttribute("aria-pressed",String(on));if(on){if(!pen.classList.contains("active"))pen.click();resize()}input()};
pen.addEventListener("click",()=>queueMicrotask(input));
canvas.addEventListener("pointerdown",e=>{if(!on||!pen.classList.contains("active"))return;e.preventDefault();drawing={id:e.pointerId,colour:window.galleryPenColour,points:[point(e)]};strokes.push(drawing);canvas.setPointerCapture(e.pointerId);paint()});
canvas.addEventListener("pointermove",e=>{if(!drawing||drawing.id!==e.pointerId)return;e.preventDefault();drawing.points.push(point(e));paint()});
const end=e=>{if(drawing&&drawing.id===e.pointerId)drawing=null};
canvas.addEventListener("pointerup",end);canvas.addEventListener("pointercancel",end);canvas.addEventListener("lostpointercapture",end);
$("tool-undo").addEventListener("click",e=>{if(!on)return;e.preventDefault();e.stopImmediatePropagation();strokes.pop();paint()},true);
$("tool-clear-ink").addEventListener("click",e=>{if(!on)return;e.preventDefault();e.stopImmediatePropagation();strokes=[];paint()},true);
window.addEventListener("resize",()=>{if(on)resize()});
})();