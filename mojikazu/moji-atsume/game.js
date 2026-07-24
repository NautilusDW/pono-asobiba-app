(() => {
  "use strict";
  const rounds = [{word:"りんご",picture:"🍎"},{word:"ねこ",picture:"🐈"},{word:"くるま",picture:"🚗"},{word:"すいか",picture:"🍉"}];
  const extras = "あおきけさたぬひめもゆらわ";
  const field = document.querySelector("#field");
  const slots = document.querySelector("#slots");
  const word = document.querySelector("#word");
  const picture = document.querySelector("#picture");
  const message = document.querySelector("#message");
  const finish = document.querySelector("#finish");
  let round = -1, step = 0, current = null;
  function shuffle(a){for(let i=a.length-1;i;i-=1){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  function place(button,index,total){const cols=Math.max(5,Math.floor(innerWidth/110));const row=Math.floor(index/cols),col=index%cols;const x=5+(col+Math.random()*.45)*(90/Math.min(cols,total));const y=8+row*28+Math.random()*8;button.style.left=`${Math.min(90,x)}%`;button.style.top=`${Math.min(67,y)}%`;button.style.animationDelay=`-${Math.random()*2}s`;}
  function render(){
    current=rounds[round%rounds.length];step=0;word.textContent=current.word;picture.textContent=current.picture;finish.hidden=true;slots.replaceChildren();
    [...current.word].forEach((char,i)=>{const s=document.createElement("span");s.className=`slot${i===0?" next":""}`;s.dataset.char=char;slots.append(s);});
    field.replaceChildren();const letters=shuffle([...current.word,...shuffle([...extras]).slice(0,8)]);
    letters.forEach((char,i)=>{const b=document.createElement("button");b.type="button";b.className="letter";b.textContent=char;b.dataset.char=char;b.setAttribute("aria-label",`${char}を えらぶ`);b.addEventListener("click",()=>choose(b));place(b,i,letters.length);field.append(b);});
    message.textContent=`「${current.word[step]}」を みつけよう`;
  }
  function choose(button){
    if(button.disabled)return;
    if(button.dataset.char!==current.word[step]){button.classList.remove("wrong");void button.offsetWidth;button.classList.add("wrong");message.textContent=`つぎは「${current.word[step]}」だよ`;return;}
    button.disabled=true;button.style.visibility="hidden";const all=[...slots.children];all[step].textContent=current.word[step];all[step].classList.remove("next");step+=1;
    if(step===current.word.length){document.querySelector("#made").textContent=`${current.picture} ${current.word}`;message.textContent="できた！";setTimeout(()=>{finish.hidden=false;},350);return;}
    all[step].classList.add("next");message.textContent=`「${current.word[step]}」を みつけよう`;
  }
  document.querySelector("#play").addEventListener("click",()=>{document.querySelector("#start").hidden=true;round+=1;render();});
  document.querySelector("#again").addEventListener("click",()=>{round+=1;render();});
  document.querySelector("#hint").addEventListener("click",()=>{const b=[...field.querySelectorAll(".letter:not(:disabled)")].find(x=>x.dataset.char===current.word[step]);if(!b)return;b.classList.add("hint");setTimeout(()=>b.classList.remove("hint"),1400);});
  document.addEventListener("keydown",e=>{if(/^[ぁ-ん]$/.test(e.key)){const b=[...field.querySelectorAll(".letter:not(:disabled)")].find(x=>x.dataset.char===e.key);if(b)b.click();}});
})();
