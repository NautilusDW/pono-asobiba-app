const chapters=[
  {word:"かさ",story:"あめで ぬれちゃう！<br>「かさ」を つくろう",object:"☂️",done:"かさが ひらいた！<br>もう ぬれないね"},
  {word:"はし",story:"たにを わたれない！<br>「はし」を つくろう",object:"🌉",done:"はしが かかった！<br>むこうへ いけるよ"},
  {word:"かぎ",story:"たからばこが あかない！<br>「かぎ」を つくろう",object:"🔑",done:"かぎで あいた！<br>たからを みつけた！"}
];
const extras=["ぬ","ほ","み","ら","せ","と"];
let chapter=0,placed=0,locked=false;
const $=s=>document.querySelector(s);
function fitStage(){document.documentElement.style.setProperty("--stage-scale",Math.min(innerWidth/1280,innerHeight/720))}
addEventListener("resize",fitStage);fitStage();
function shuffle(a){return a.sort(()=>Math.random()-.5)}
function render(){
  const c=chapters[chapter];placed=0;locked=false;
  $("#progress").textContent=`${chapter+1} / ${chapters.length}`;
  $("#story").innerHTML=c.story;$("#resultObject").textContent=c.object;
  $("#resultObject").className="result-object";$("#nextBtn").classList.add("hidden");
  $("#forgeText").textContent="もじを じゅんばんに いれよう";
  $("#slots").innerHTML=[...c.word].map(()=>'<span class="slot"></span>').join("");
  $("#belt").innerHTML="";
  shuffle([...c.word,...extras.slice(0,3)]).forEach(letter=>{
    const b=document.createElement("button");b.className="tile";b.textContent=letter;
    b.type="button";b.draggable=true;b.setAttribute("aria-label",`${letter}を いれる`);
    b.addEventListener("click",()=>choose(b,letter));
    b.addEventListener("dragstart",e=>e.dataTransfer.setData("text/plain",letter));
    $("#belt").append(b);
  });
  $("#rain").style.display=chapter===0?"block":"none";
  document.querySelectorAll(".land").forEach(x=>x.style.display=chapter===1?"block":"none");
  $("#chest").style.display=chapter===2?"block":"none";
}
function choose(button,letter){
  if(locked||button.classList.contains("used"))return;
  const expected=[...chapters[chapter].word][placed];
  if(letter!==expected){
    button.classList.add("shake");setTimeout(()=>button.classList.remove("shake"),400);
    $("#forgeText").textContent=`つぎは「${expected}」だよ`;
    return;
  }
  button.classList.add("used");
  document.querySelectorAll(".slot")[placed].textContent=letter;
  document.querySelectorAll(".slot")[placed].classList.add("filled");placed++;
  $("#forgeText").textContent=placed===chapters[chapter].word.length?"ことばの まほう！":`つぎは「${[...chapters[chapter].word][placed]}」`;
  if(placed===chapters[chapter].word.length)setTimeout(complete,350);
}
function complete(){
  locked=true;const c=chapters[chapter];
  $("#resultObject").classList.add("show");$("#story").innerHTML=c.done;
  $("#sparkles").classList.add("show");setTimeout(()=>$("#sparkles").classList.remove("show"),900);
  if(chapter===0)$("#rain").style.display="none";
  if(chapter===1){const o=$("#resultObject");o.style.left="43%";o.style.bottom="15px"}
  if(chapter===2)$("#chest").textContent="🎁";
  $("#nextBtn").textContent=chapter===2?"もういちど ↻":"つぎへ ▶";
  $("#nextBtn").classList.remove("hidden");
}
$("#hintBtn").addEventListener("click",()=>{
  if(locked)return;const expected=[...chapters[chapter].word][placed];
  document.querySelectorAll(".tile").forEach(b=>b.classList.toggle("hinted",!b.classList.contains("used")&&b.textContent===expected));
  $("#forgeText").textContent=`「${expected}」を さがそう`;
});
$("#nextBtn").addEventListener("click",()=>{chapter=chapter===2?0:chapter+1;$("#resultObject").removeAttribute("style");render()});
$("#forge").addEventListener("dragover",e=>e.preventDefault());
$("#forge").addEventListener("drop",e=>{e.preventDefault();const l=e.dataTransfer.getData("text/plain");const b=[...document.querySelectorAll(".tile")].find(x=>x.textContent===l&&!x.classList.contains("used"));if(b)choose(b,l)});
render();
