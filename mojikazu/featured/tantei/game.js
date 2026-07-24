const cases=[
  {target:"sign",before:"6",after:"9",found:"かんばんが「6」から「9」に かわった！",icon:"🔢"},
  {target:"poster",before:"ねこ",after:"こ",found:"「ねこ」の「ね」が なくなった！",icon:"🔤"},
  {target:"fruit",before:"🍎 🍎 🍎 🍎 🍎",after:"🍎 🍎 🍎 🍎",found:"りんごが 5こから 4こに なった！",icon:"🍎"}
];
let caseIndex=0,phase="observe",evidence=0;
const $=s=>document.querySelector(s);
const targets=["sign","poster","fruit"];
function fitStage(){document.documentElement.style.setProperty("--stage-scale",Math.min(innerWidth/1280,innerHeight/720))}
addEventListener("resize",fitStage);fitStage();
function setup(){
  phase="observe";const c=cases[caseIndex];
  $("#caseNo").textContent=`じけん ${caseIndex+1}`;
  $("#mission").textContent="おへやを よく みて おぼえよう";
  targets.forEach((id,i)=>{$("#"+id).textContent=cases[i].before;$("#"+id).classList.remove("changed","wrong")});
  $("#observeBtn").style.display="block";$("#curtain").classList.remove("show");$("#focus").classList.remove("show");
  $("#result").classList.add("hidden");
}
function changeRoom(){
  if(phase!=="observe")return;phase="curtain";$("#observeBtn").style.display="none";
  $("#curtain").classList.add("show");
  setTimeout(()=>{
    $("#"+cases[caseIndex].target).textContent=cases[caseIndex].after;
    $("#curtain").classList.remove("show");phase="find";
    $("#mission").textContent="どこが かわった？ タッチして みつけよう";
  },900);
}
function inspect(id){
  if(phase!=="find")return;
  if(id!==cases[caseIndex].target){
    const el=$("#"+id);el.classList.add("wrong");setTimeout(()=>el.classList.remove("wrong"),350);
    $("#mission").textContent="そこは おなじだよ。もういちど みてみよう";
    return;
  }
  phase="result";evidence++;const c=cases[caseIndex];
  $("#"+id).classList.add("changed");
  $("#evidence").textContent=[0,1,2].map(i=>i<evidence?"★":"☆").join(" ");
  setTimeout(()=>{
    $("#resultIcon").textContent=c.icon;$("#resultTitle").textContent="しょうこを みつけた！";
    $("#resultText").textContent=c.found;
    $("#nextBtn").textContent=caseIndex===2?"じけんを かいけつ！":"つぎの じけんへ ▶";
    $("#result").classList.remove("hidden");
  },450);
}
$("#observeBtn").addEventListener("click",changeRoom);
targets.forEach(id=>$("#"+id).addEventListener("click",()=>inspect(id)));
$("#hintBtn").addEventListener("click",()=>{
  if(phase==="observe"){$("#mission").textContent="かず・ことば・りんごを よく みよう";return}
  if(phase!=="find")return;
  const el=$("#"+cases[caseIndex].target),room=$("#room").getBoundingClientRect(),r=el.getBoundingClientRect(),f=$("#focus");
  f.style.left=(r.left-room.left-12)+"px";f.style.top=(r.top-room.top-12)+"px";f.style.width=(r.width+24)+"px";f.style.height=(r.height+24)+"px";f.classList.add("show");
  $("#mission").textContent="ひかっている ところを みてみよう";
});
$("#nextBtn").addEventListener("click",()=>{
  if(caseIndex<2){caseIndex++;setup();return}
  $("#resultIcon").textContent="🐶";$("#resultTitle").textContent="じけん かいけつ！";
  $("#resultText").textContent="3つの しょうこで まいごの こいぬを みつけたよ！";
  $("#nextBtn").textContent="もういちど ↻";
  $("#nextBtn").onclick=()=>{caseIndex=0;evidence=0;$("#evidence").textContent="☆ ☆ ☆";$("#nextBtn").onclick=null;setup()};
});
setup();
