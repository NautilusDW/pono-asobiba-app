(() => {"use strict";
const words=[{w:"ねこ",e:"🐈",next:["こあら","こま","こい"]},{w:"こあら",e:"🐨",next:["らっぱ","らいおん","らくだ"]},{w:"らっぱ",e:"🎺",next:["ぱん","ぱんだ","ぱせり"]},{w:"ぱん",e:"🍞",next:["ねこ","ねぎ","ねずみ"]}];
const icons={"こあら":"🐨","こま":"🪀","こい":"🐟","らっぱ":"🎺","らいおん":"🦁","らくだ":"🐪","ぱん":"🍞","ぱんだ":"🐼","ぱせり":"🌿","ねこ":"🐈","ねぎ":"🌱","ねずみ":"🐭"};
const decoys=["りんご","すいか","うさぎ","きつね","くるま"];const train=document.querySelector("#train"),choices=document.querySelector("#choices"),head=document.querySelector("#head"),message=document.querySelector("#message");let current,step=0;
function shuffle(a){return a.sort(()=>Math.random()-.5);}
function find(w){return words.find(x=>x.w===w)||{w,e:icons[w]||"🎁",next:["ねこ"]};}
function drawChoices(){const answer=current.next[step%current.next.length],first=answer[0],opts=shuffle([answer,...shuffle(decoys.filter(x=>x[0]!==first)).slice(0,2)]);head.textContent=first;choices.replaceChildren();opts.forEach(w=>{const b=document.createElement("button");b.type="button";b.className="choice";b.dataset.word=w;b.innerHTML=`<span>${icons[w]||"🎁"}</span>${w}`;b.addEventListener("click",()=>choose(b,w,answer));choices.append(b);});message.textContent=`「${first}」から はじまるのは どれ？`;}
function addCar(item){const c=document.createElement("div");c.className="car";c.innerHTML=`<span>${item.e}</span>${item.w}`;train.append(c);}
function choose(b,w,answer){if(w!==answer){b.classList.remove("wrong");void b.offsetWidth;b.classList.add("wrong");message.textContent="えを よく みてみよう";return;}current=find(w);addCar(current);step+=1;if(step>=3){setTimeout(()=>document.querySelector("#finish").hidden=false,350);return;}drawChoices();}
function start(){step=0;current=words[0];train.replaceChildren();addCar(current);document.querySelector("#finish").hidden=true;drawChoices();}
document.querySelector("#play").addEventListener("click",()=>{document.querySelector("#start").hidden=true;start();});document.querySelector("#again").addEventListener("click",start);document.querySelector("#hint").addEventListener("click",()=>{const first=head.textContent,b=[...choices.children].find(x=>x.dataset.word[0]===first);if(b){b.classList.add("hint");setTimeout(()=>b.classList.remove("hint"),1400);}});document.addEventListener("keydown",e=>{if(["1","2","3"].includes(e.key))choices.children[Number(e.key)-1]?.click();});
})();
