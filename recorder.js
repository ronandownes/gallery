/* Independent Gallery recorder; Chrome's screen-sharing indicator is browser controlled. */
(()=>{"use strict";
const voiceButton=document.getElementById("gallery-record-voice");
const silentButton=document.getElementById("gallery-record-silent");
const timer=document.getElementById("gallery-record-timer");
const meter=document.getElementById("gallery-mic-meter"),meterFill=document.getElementById("gallery-mic-fill");
if(!voiceButton||!silentButton||!timer)return;
let phase="ready",mode=null,display=null,mic=null,recorder=null,chunks=[],clock=null,started=0;
let audioCtx=null,analyser=null,samples=null,levelFrame=null,finishing=false;
const title={voice:"● REC",silent:"🔇 REC"};
function ui(){
 const active=phase==="recording";
 for(const [button,kind] of [[voiceButton,"voice"],[silentButton,"silent"]]){
  const itsTurn=mode===kind;
  button.disabled=(phase!=="ready"&&!itsTurn)||phase==="pending"||phase==="saving";
  button.classList.toggle("gallery-recording",active&&itsTurn);
  button.classList.toggle("gallery-record-pending",phase==="pending"&&itsTurn);
  button.setAttribute("aria-pressed",String(active&&itsTurn));
  button.textContent=phase==="recording"&&itsTurn?"■ Stop":
                     phase==="saving"&&itsTurn?"Saving…":
                     phase==="pending"&&itsTurn?"Choose screen…":title[kind];
 }
 timer.hidden=!active;
 if(meter)meter.hidden=!(active&&analyser);
}
function closeAudio(){
 if(levelFrame!==null){cancelAnimationFrame(levelFrame);levelFrame=null}
 analyser=null;samples=null;
 if(audioCtx){const c=audioCtx;audioCtx=null;c.close().catch(()=>{})}
 if(meterFill)meterFill.style.width="0%";
 if(meter)meter.setAttribute("aria-valuenow","0");
}
function cleanup(){
 if(clock!==null){clearInterval(clock);clock=null}
 closeAudio();
 for(const stream of [mic,display])if(stream)for(const track of stream.getTracks())try{track.stop()}catch(_){}
 mic=null;display=null;recorder=null;chunks=[];mode=null;phase="ready";finishing=false;ui();
}
async function startMeter(){
 if(!mic||!meter||!meterFill)return;
 const Context=window.AudioContext||window.webkitAudioContext;
 if(!Context)return;
 try{
  audioCtx=new Context();
  const source=audioCtx.createMediaStreamSource(mic);
  analyser=audioCtx.createAnalyser();analyser.fftSize=512;
  source.connect(analyser);samples=new Uint8Array(analyser.fftSize);
  if(audioCtx.state==="suspended")await audioCtx.resume();
  const draw=()=>{
   if(phase!=="recording"||!analyser)return;
   analyser.getByteTimeDomainData(samples);
   let sum=0;for(const a of samples){const x=(a-128)/128;sum+=x*x}
   const level=Math.min(100,Math.round(Math.sqrt(sum/samples.length)*650));
   meterFill.style.width=level+"%";
   meter.setAttribute("aria-valuenow",String(level));
   levelFrame=requestAnimationFrame(draw);
  };
  draw();ui();
 }catch(_){closeAudio()}
}
function updateTime(){
 const s=Math.max(0,Math.floor((Date.now()-started)/1000));
 timer.textContent=String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0");
}
function download(){
 const type=recorder?.mimeType||"video/webm",blob=new Blob(chunks,{type});
 if(blob.size>0){
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="Gallery-"+(mode==="silent"?"Silent":"Voice")+"-"+new Date().toISOString().replace(/[:.]/g,"-")+".webm";
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
 }else alert("The recording was empty. Please test again.");
 cleanup();
}
function stop(){
 if(phase!=="recording"||!recorder||finishing)return;
 finishing=true;phase="saving";ui();
 try{recorder.requestData()}catch(_){}
 try{recorder.stop()}catch(e){cleanup();alert("Could not finish recording: "+e.message)}
}
async function start(kind){
 if(phase!=="ready")return;
 mode=kind;phase="pending";ui();
 try{
  if(!navigator.mediaDevices?.getDisplayMedia||!window.MediaRecorder)
   throw Error("This browser cannot record the screen from Gallery.");
  display=await navigator.mediaDevices.getDisplayMedia({video:{frameRate:30},audio:false,preferCurrentTab:true});
  const video=display.getVideoTracks()[0];if(!video)throw Error("No screen or tab was selected.");
  if(kind==="voice"){
   if(!navigator.mediaDevices?.getUserMedia)throw Error("Microphone capture is unsupported.");
   mic=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
  }else if(navigator.mediaDevices?.getUserMedia){
   // Meter only: silent recordings NEVER contain a microphone audio track.
   // Permission rejection simply hides the meter; recording continues silently.
   try{mic=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});}catch(_){}
  }
  const audio=kind==="voice"?mic?.getAudioTracks()[0]:null;
  if(kind==="voice"&&(!audio||audio.readyState!=="live"))throw Error("Microphone is unavailable.");
  const tracks=audio?[video,audio]:[video];
  const supported=["video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"].find(x=>MediaRecorder.isTypeSupported(x));
  recorder=new MediaRecorder(new MediaStream(tracks),supported?{mimeType:supported}:undefined);
  recorder.addEventListener("dataavailable",e=>{if(e.data?.size)chunks.push(e.data)});
  recorder.addEventListener("stop",download,{once:true});
  recorder.addEventListener("error",e=>{const message=e.error?.message||"MediaRecorder error";cleanup();alert(message)});
  video.addEventListener("ended",()=>{if(phase==="recording")stop()},{once:true});
  recorder.start(500);started=Date.now();updateTime();clock=setInterval(updateTime,500);
  phase="recording";ui();
  if(mic)startMeter();
 }catch(e){
  cleanup();
  if(e?.name!=="NotAllowedError")alert("Recording could not start: "+(e?.message||String(e)));
 }
}
voiceButton.addEventListener("click",()=>phase==="recording"&&mode==="voice"?stop():start("voice"));
silentButton.addEventListener("click",()=>phase==="recording"&&mode==="silent"?stop():start("silent"));
ui();
})();