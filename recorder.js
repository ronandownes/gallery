/* Gallery's independent microphone + screen recorder.
   The control is permanent HTML, not created by the drawing scripts. */
(()=>{"use strict";
const button=document.getElementById("gallery-record-voice");
const timer=document.getElementById("gallery-record-timer");
if(!button||!timer)return;
let display=null,microphone=null,recorder=null,chunks=[],tick=null,started=0,busy=false,finishing=false;
function setStatus(mode,label){
 button.classList.toggle("gallery-recording",mode==="recording");
 button.classList.toggle("gallery-record-pending",mode==="pending");
 button.disabled=(mode==="pending"||mode==="saving");
 button.textContent=label;
 button.setAttribute("aria-pressed",mode==="recording"?"true":"false");
 timer.hidden=mode!=="recording";
}
function stopTracks(){
 for(const source of [display,microphone]){
  if(source)for(const track of source.getTracks())try{track.stop()}catch(_){}
 }
 display=null;microphone=null;
 if(tick!==null){clearInterval(tick);tick=null}
}
function reset(label="● Record + Mic"){
 stopTracks();busy=false;finishing=false;recorder=null;setStatus("ready",label);
}
function timeStamp(){
 const seconds=Math.floor((Date.now()-started)/1000);
 timer.textContent=String(Math.floor(seconds/60)).padStart(2,"0")+":"+String(seconds%60).padStart(2,"0");
}
function saveRecording(){
 const mime=recorder?.mimeType||"video/webm";
 const blob=new Blob(chunks,{type:mime});
 if(blob.size>0){
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="Gallery-Lesson-"+new Date().toISOString().replace(/[:.]/g,"-")+".webm";
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
  reset("● Record + Mic");
 }else{
  reset();
  alert("No video data was captured. Please try a short test recording.");
 }
}
function stop(){
 if(!recorder||recorder.state==="inactive"||finishing)return;
 finishing=true;setStatus("saving","Saving…");
 try{recorder.requestData()}catch(_){}
 recorder.stop();
}
async function start(){
 if(busy)return;
 busy=true;setStatus("pending","Choose screen…");
 try{
  if(!navigator.mediaDevices?.getDisplayMedia||!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)
   throw new Error("Recording requires a supported browser on HTTPS.");
  // Browser security requires a fresh sharing choice for each recording.
  display=await navigator.mediaDevices.getDisplayMedia({video:{frameRate:30},audio:false,preferCurrentTab:true,selfBrowserSurface:"include"});
  // Request narration separately: tab-sharing permission does not grant microphone access.
  setStatus("pending","Enabling mic…");
  microphone=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
  const video=display.getVideoTracks()[0],audio=microphone.getAudioTracks()[0];
  if(!video||!audio||audio.readyState!=="live")throw new Error("The video or microphone is unavailable.");
  const source=new MediaStream([video,audio]);
  const mime=["video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"].find(type=>MediaRecorder.isTypeSupported(type));
  recorder=new MediaRecorder(source,mime?{mimeType:mime}:undefined);chunks=[];
  recorder.addEventListener("dataavailable",event=>{if(event.data&&event.data.size>0)chunks.push(event.data)});
  recorder.addEventListener("stop",saveRecording,{once:true});
  recorder.addEventListener("error",event=>{const message=event.error?.message||"Recording error";reset();alert(message)});
  video.addEventListener("ended",()=>{if(recorder?.state==="recording")stop()},{once:true});
  recorder.start(500);
  started=Date.now();timeStamp();tick=setInterval(timeStamp,500);
  busy=false;finishing=false;setStatus("recording","■ Stop & Save");
 }catch(error){
  reset();
  if(error?.name==="NotAllowedError")return; // Cancelled browser chooser.
  alert("Recording could not start with your microphone. "+(error?.message||String(error)));
 }
}
button.addEventListener("click",()=>{
 if(recorder?.state==="recording")stop();
 else if(!busy)start();
});
setStatus("ready","● Record + Mic");
})();