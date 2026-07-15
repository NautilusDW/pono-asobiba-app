"use strict";
(function() {
  const data = window.PonoNazonazoQuestionData || {};
  const {
    TOWN, JUNGLE, SEA, FUTURE, SPACE, WORDPLAY,
    KANJI_NUM, CNT_EMO, JLEGS, SLEGS, JSIZE, SSIZE, SPEED
  } = data;

/* ================= generated quiz illustrations ================= */
function quizArtKey(emoji,label){return String(emoji||"")+"|"+String(label||"");}
function quizArtItems(){
 const registry=window.PonoNazonazoQuizArt||{};
 return registry.items&&typeof registry.items==="object"?registry.items:registry;
}
function uiArtItems(){
 const registry=window.PonoNazonazoQuizArt||{};
 return registry.ui&&typeof registry.ui==="object"?registry.ui:{};
}
function resolveQuizArt(emoji,label){
 const item=quizArtItems()[quizArtKey(emoji,label)];
 const src=typeof item==="string"?item:(item&&item.src);
 return typeof src==="string"&&src?src:"";
}
function resolveUiArt(id){
 const item=uiArtItems()[String(id||"")];
 const src=typeof item==="string"?item:(item&&item.src);
 return typeof src==="string"&&src?src:"";
}
function fillArtHolder(holder,src,key){
 holder.replaceChildren();holder.dataset.artKey=String(key||"");holder.setAttribute("aria-hidden","true");
 const image=document.createElement("img");
 image.className="art-image quiz-art-image ui-art-image";image.alt="";image.decoding="async";image.loading=holder.dataset.uiArtEager==="1"?"eager":"lazy";image.draggable=false;
 const fallback=document.createElement("span");
 fallback.className="art-fallback quiz-art-fallback ui-art-fallback";fallback.textContent="?";fallback.hidden=true;
 const revealFallback=()=>{image.hidden=true;fallback.hidden=false;holder.classList.add("is-fallback");};
 image.addEventListener("error",revealFallback,{once:true});
 if(src)image.src=src;else revealFallback();
 holder.append(image,fallback);return holder;
}
function createQuizArt(emoji,label,extraClass,srcOverride){
 const holder=document.createElement("span");
 holder.className="em quiz-art"+(extraClass?" "+extraClass:"");
 holder.dataset.quizArtKey=quizArtKey(emoji,label);
 const src=typeof srcOverride==="string"&&srcOverride?srcOverride:resolveQuizArt(emoji,label);
 return fillArtHolder(holder,src,quizArtKey(emoji,label));
}
function createUiArt(id,extraClass,srcOverride){
 const holder=document.createElement("span");
 holder.className="ui-art"+(extraClass?" "+extraClass:"");
 const src=typeof srcOverride==="string"&&srcOverride?srcOverride:resolveUiArt(id);
 return fillArtHolder(holder,src,"ui:"+String(id||""));
}
function hydrateStaticUiArt(root){
 (root||document).querySelectorAll("[data-ui-art]").forEach(holder=>{
  const id=holder.dataset.uiArt;
  if(holder.dataset.uiArtReady===id)return;
  holder.dataset.uiArtReady=id;
  fillArtHolder(holder,resolveUiArt(id),"ui:"+id);
 });
}
function illustratedText(element,artId,textValue,extraClass){
 if(!element)return;
 const content=String(textValue||""),key=String(artId||"")+"|"+content;
 const currentText=element.querySelector(".ui-art-text"),currentArt=element.querySelector('[data-art-key="ui:'+String(artId||'')+'"]');
 if(element.dataset.illustratedText===key&&currentText&&currentText.textContent===content&&currentArt)return;
 element.dataset.illustratedText=key;
 const text=document.createElement("span");text.className="ui-art-text";text.textContent=content;
 element.replaceChildren(createUiArt(artId,"inline-ui-art"+(extraClass?" "+extraClass:"")),text);
}
function illustratedCounter(element,art,count,extraClass){
 if(!element)return;
 const value=document.createElement("span");value.className="ui-art-count";value.textContent="×"+Math.max(0,Number(count)||0);
 const visual=art&&art.nodeType===1?art:createUiArt(String(art||""),extraClass||"counter-ui-art");
 element.replaceChildren(visual,value);
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>hydrateStaticUiArt(),{once:true});
else hydrateStaticUiArt();

/* ================= seeded rng & svg helpers ================= */
function mulberry32(s){return function(){s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}
function svgURI(w,h,body){
 const s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none">'+body+'</svg>';
 return 'url("data:image/svg+xml,'+encodeURIComponent(s)+'")';
}
function gMountains(w,h,color,base,amp,n,seed,op){
 const r=mulberry32(seed);let pts="0,"+h;
 for(let i=0;i<=n;i++){const x=i*(w/n);const y=h-base-r()*amp;pts+=" "+x.toFixed(0)+","+y.toFixed(0);}
 pts+=" "+w+","+h;
 return '<polygon points="'+pts+'" fill="'+color+'" opacity="'+(op||1)+'"/>';
}
function gSkyline(w,h,color,seed,win){
 const r=mulberry32(seed);let b="",x=0;
 while(x<w){const bw=30+r()*50,bh=h*(.25+r()*.45);
  b+='<rect x="'+x.toFixed(0)+'" y="'+(h-bh).toFixed(0)+'" width="'+bw.toFixed(0)+'" height="'+bh.toFixed(0)+'" fill="'+color+'"/>';
  if(win){for(let k=0;k<4;k++){const wx=x+6+r()*(bw-12),wy=h-bh+8+r()*(bh-20);
   b+='<rect x="'+wx.toFixed(0)+'" y="'+wy.toFixed(0)+'" width="5" height="7" fill="'+win+'" opacity="'+(0.5+r()*0.5)+'"/>';}}
  x+=bw+8+r()*24;}
 return b;
}
function gTreeRow(w,h,leaf,trunk,n,size,seed){
 const r=mulberry32(seed);let b="";
 for(let i=0;i<n;i++){const x=(i+0.5)*(w/n)+(r()-0.5)*30,s=size*(0.75+r()*0.5),y=h-s*0.32;
  b+='<rect x="'+(x-s*0.06).toFixed(0)+'" y="'+(y-s*0.35).toFixed(0)+'" width="'+(s*0.12).toFixed(0)+'" height="'+(s*0.7).toFixed(0)+'" fill="'+trunk+'"/>';
  b+='<circle cx="'+x.toFixed(0)+'" cy="'+(y-s*0.5).toFixed(0)+'" r="'+(s*0.34).toFixed(0)+'" fill="'+leaf+'"/>';
  b+='<circle cx="'+(x-s*0.22).toFixed(0)+'" cy="'+(y-s*0.34).toFixed(0)+'" r="'+(s*0.24).toFixed(0)+'" fill="'+leaf+'"/>';
  b+='<circle cx="'+(x+s*0.22).toFixed(0)+'" cy="'+(y-s*0.34).toFixed(0)+'" r="'+(s*0.24).toFixed(0)+'" fill="'+leaf+'"/>';}
 return b;
}
function gHouses(w,h,body,roof,n,seed){
 const r=mulberry32(seed);let b="";
 for(let i=0;i<n;i++){const x=(i+0.2)*(w/n)+(r()-0.5)*24,hw=46+r()*22,hh=40+r()*24,y=h-hh;
  b+='<rect x="'+x.toFixed(0)+'" y="'+y.toFixed(0)+'" width="'+hw.toFixed(0)+'" height="'+hh.toFixed(0)+'" fill="'+body+'"/>';
  b+='<polygon points="'+(x-6).toFixed(0)+','+y.toFixed(0)+' '+(x+hw/2).toFixed(0)+','+(y-24).toFixed(0)+' '+(x+hw+6).toFixed(0)+','+y.toFixed(0)+'" fill="'+roof+'"/>';}
 return b;
}
function gBumps(w,h,color,n,amp,seed){
 const r=mulberry32(seed);let d="M0 "+h+" L0 "+(h-amp*0.5);
 for(let i=0;i<n;i++){const x1=(i+0.5)*(w/n),x2=(i+1)*(w/n),y=h-amp*(0.5+r()*0.7);
  d+=" Q"+x1.toFixed(0)+" "+y.toFixed(0)+" "+x2.toFixed(0)+" "+(h-amp*0.45).toFixed(0);}
 d+=" L"+w+" "+h+" Z";
 return '<path d="'+d+'" fill="'+color+'"/>';
}
function gGrassSpikes(w,h,color,n,amp,seed){
 const r=mulberry32(seed);let pts="0,"+h;
 for(let i=0;i<=n;i++){const x=i*(w/n);pts+=" "+x.toFixed(0)+","+(h-(i%2?amp*(0.5+r()*0.6):amp*0.15)).toFixed(0);}
 pts+=" "+w+","+h;
 return '<polygon points="'+pts+'" fill="'+color+'"/>';
}
function gKelp(w,h,color,n,seed){
 const r=mulberry32(seed);let b="";
 for(let i=0;i<n;i++){const x=(i+0.5)*(w/n)+(r()-0.5)*20,ht=h*(0.5+r()*0.45),sw=8+r()*8;
  b+='<path d="M'+x.toFixed(0)+' '+h+' Q'+(x-18).toFixed(0)+' '+(h-ht*0.5).toFixed(0)+' '+x.toFixed(0)+' '+(h-ht).toFixed(0)+'" stroke="'+color+'" stroke-width="'+sw.toFixed(0)+'" fill="none" stroke-linecap="round"/>';}
 return b;
}
function gDigitsFloat(w,h,color,n,seed,size){
 const r=mulberry32(seed);let b="";
 for(let i=0;i<n;i++){const x=r()*w,y=h*(0.15+r()*0.55),d=Math.floor(r()*10);
  b+='<text x="'+x.toFixed(0)+'" y="'+y.toFixed(0)+'" font-size="'+size+'" font-family="sans-serif" font-weight="bold" fill="'+color+'" opacity="'+(0.35+r()*0.4)+'">'+d+'</text>';}
 return b;
}
function gBlocksRow(w,h,cols,n,seed,digits){
 const r=mulberry32(seed);let b="";
 for(let i=0;i<n;i++){const s=52+r()*36,x=(i+0.15)*(w/n),y=h-s;
  const c=cols[i%cols.length];
  b+='<rect x="'+x.toFixed(0)+'" y="'+y.toFixed(0)+'" width="'+s.toFixed(0)+'" height="'+s.toFixed(0)+'" rx="10" fill="'+c+'"/>';
  if(digits)b+='<text x="'+(x+s*0.3).toFixed(0)+'" y="'+(y+s*0.72).toFixed(0)+'" font-size="'+(s*0.6).toFixed(0)+'" font-family="sans-serif" font-weight="bold" fill="#fff" opacity="0.85">'+Math.floor(r()*10)+'</text>';}
 return b;
}
function gStars(w,h,n,seed){
 const r=mulberry32(seed);let b="";
 for(let i=0;i<n;i++){b+='<circle cx="'+(r()*w).toFixed(0)+'" cy="'+(r()*h).toFixed(0)+'" r="'+(1+r()*2.4).toFixed(1)+'" fill="#fff" opacity="'+(0.3+r()*0.7)+'"/>';}
 return b;
}
function gPlanet(x,y,rr,c1,ring){
 let b='<circle cx="'+x+'" cy="'+y+'" r="'+rr+'" fill="'+c1+'"/>';
 if(ring)b+='<ellipse cx="'+x+'" cy="'+y+'" rx="'+(rr*1.7)+'" ry="'+(rr*0.5)+'" fill="none" stroke="'+ring+'" stroke-width="6" opacity="0.85"/>';
 return b;
}
function gRail(w,h,tie,railC,ground1){
 let b='<rect x="0" y="0" width="'+w+'" height="'+h+'" fill="'+ground1+'"/>';
 for(let x=6;x<w;x+=46)b+='<rect x="'+x+'" y="'+(h*0.18)+'" width="26" height="'+(h*0.3)+'" rx="4" fill="'+tie+'"/>';
 b+='<rect x="0" y="'+(h*0.22)+'" width="'+w+'" height="6" fill="'+railC+'"/>';
 return b;
}
function gChecker(w,h,c1,c2){
 let b='<rect width="'+w+'" height="'+h+'" fill="'+c1+'"/>';
 for(let x=0;x<w;x+=60)b+='<rect x="'+x+'" y="0" width="30" height="'+h+'" fill="'+c2+'"/>';
 return b;
}
function gSand(w,h,c1,c2,seed){
 const r=mulberry32(seed);
 let b='<rect width="'+w+'" height="'+h+'" fill="'+c1+'"/>';
 for(let i=0;i<9;i++)b+='<ellipse cx="'+(r()*w).toFixed(0)+'" cy="'+(h*0.4+r()*h*0.5).toFixed(0)+'" rx="'+(10+r()*22).toFixed(0)+'" ry="4" fill="'+c2+'"/>';
 return b;
}
function gNeonGround(w,h,base,line,tick){
 let b='<rect width="'+w+'" height="'+h+'" fill="'+base+'"/>';
 b+='<rect x="0" y="'+(h*0.2)+'" width="'+w+'" height="8" fill="'+line+'"/>';
 for(let x=10;x<w;x+=70)b+='<rect x="'+x+'" y="'+(h*0.2+14)+'" width="34" height="6" rx="3" fill="'+tick+'" opacity="0.8"/>';
 return b;
}

/* ================= stages: パレット2種(1周目/2周目)対応 ================= */
const H=300, HW=1700;
const TOWN_HORIZON_PARALLAX=.16;
const FUTURE_HORIZON_PARALLAX=.10,FUTURE_MID_PARALLAX=.32,FUTURE_FOREGROUND_PARALLAX=1.12;
const FUTURE_HORIZON_HEIGHT=.68,FUTURE_HORIZON_ASPECT=2096/594;
const FUTURE_MID_HEIGHT=.56,FUTURE_MID_ASPECT=2136/532;
const FUTURE_FOREGROUND_HEIGHT=.092,FUTURE_FOREGROUND_ASPECT=2400/430;
const SPACE_PLANET_PARALLAX=.12,SPACE_FOREGROUND_PARALLAX=.66;
const SPACE_PLANET_HEIGHT=1,SPACE_PLANET_ASPECT=2172/724;
const SPACE_FOREGROUND_HEIGHT=.76,SPACE_FOREGROUND_ASPECT=2172/724;
const ASSETS={
  town:{
   sky:"../assets/images/nazonazo-tunnel/town_sky_back_20260703.webp",
   horizon:"../assets/images/nazonazo-tunnel/town_horizon_layer_whiteback_20260712_v2.webp",
   mid:"../assets/images/nazonazo-tunnel/town_mid_layer_whiteback_20260713_v3.webp",
   ground:"../assets/images/nazonazo-tunnel/rail_track_loop_jungle_style_bright_20260705.webp",
   fg:"../assets/images/nazonazo-tunnel/town_foreground_grass_20260703_v2.webp",
   station:"../assets/images/nazonazo-tunnel/town_station_checkpoint_20260703.webp",
   decor:"../assets/images/nazonazo-tunnel/town_station_line_trees_20260713_v2.webp"
 },
 jungle:{
  sky:"../assets/images/nazonazo-tunnel/jungle_sky_back_20260703.webp",
  horizon:"../assets/images/nazonazo-tunnel/jungle_horizon_layer_whiteback_20260712_v2.webp",
  mid:"../assets/images/nazonazo-tunnel/jungle_mid_layer_20260703.webp",
  habitat:"../assets/images/nazonazo-tunnel/jungle_habitat_loop_whiteback_20260712.webp",
  ground:"../assets/images/nazonazo-tunnel/rail_track_loop_jungle_style_bright_20260705.webp",
  fg:"../assets/images/nazonazo-tunnel/jungle_foreground_layer_20260703.webp",
  station:"../assets/images/nazonazo-tunnel/jungle_station_checkpoint_20260713_v2.webp",
  decor:"../assets/images/nazonazo-tunnel/jungle_station_line_trees_20260713_v2.webp",
  animals:{
   toucans:"../assets/images/nazonazo-tunnel/jungle_animal_toucans_livedin_20260712.webp",
   sloth:"../assets/images/nazonazo-tunnel/jungle_animal_sloth_livedin_20260712.webp",
   crocodile:"../assets/images/nazonazo-tunnel/jungle_animal_crocodile_livedin_20260712.webp",
   elephant:"../assets/images/nazonazo-tunnel/jungle_animal_elephant_trunk_3frame_20260712.webp",
   giraffe:"../assets/images/nazonazo-tunnel/jungle_animal_giraffe_full_20260712.webp"
  },
  flight:{
   birds:[
    {id:"toucan",src:"../assets/images/nazonazo-tunnel/jungle_flying_toucan_3frame_20260712.webp",width:"clamp(58px,9vmin,100px)",speed:1},
    {id:"macaw",src:"../assets/images/nazonazo-tunnel/jungle_flying_macaw_3frame_20260712.webp",width:"clamp(72px,11vmin,118px)",speed:.9},
    {id:"hummingbird",src:"../assets/images/nazonazo-tunnel/jungle_flying_hummingbird_3frame_20260712.webp",width:"clamp(42px,6.5vmin,72px)",speed:1.35}
   ],
   butterflies:[
    {id:"blue",src:"../assets/images/nazonazo-tunnel/jungle_flying_butterfly_3frame_20260712_v2.webp",width:"clamp(40px,6.5vmin,68px)",speed:1},
    {id:"orange",src:"../assets/images/nazonazo-tunnel/jungle_flying_butterfly_orange_3frame_20260712.webp",width:"clamp(43px,7vmin,72px)",speed:.94},
    {id:"yellow",src:"../assets/images/nazonazo-tunnel/jungle_flying_butterfly_yellow_3frame_20260712.webp",width:"clamp(38px,6.2vmin,66px)",speed:1.08}
   ]
  }
 },
 sea:{
  sky:"../assets/images/nazonazo-tunnel/sea_parallax_sky_back_20260706.webp",
  horizon:"../assets/images/nazonazo-tunnel/sea_parallax_horizon_loop_20260706.webp",
  mid:"../assets/images/nazonazo-tunnel/sea_parallax_mid_loop_20260706.webp",
  ground:"../assets/images/nazonazo-tunnel/sea_parallax_ground_loop_20260706.webp",
  fg:"../assets/images/nazonazo-tunnel/sea_parallax_foreground_alpha_loop_20260706.webp",
  station:"../assets/images/nazonazo-tunnel/sea_station_checkpoint_20260712.webp",
  boss:"../assets/images/nazonazo-tunnel/sea_boss_anglerfish_20260713.png",
  habitat:"../assets/images/nazonazo-tunnel/sea_habitat_creatures_sheet_20260713.webp",
  fish:[
   "../assets/images/nazonazo-tunnel/sea_fish_01_20260706.webp",
   "../assets/images/nazonazo-tunnel/sea_fish_02_20260706.webp",
   "../assets/images/nazonazo-tunnel/sea_fish_03_20260706.webp",
   "../assets/images/nazonazo-tunnel/sea_fish_04_20260706.webp",
   "../assets/images/nazonazo-tunnel/sea_fish_05_20260706.webp",
   "../assets/images/nazonazo-tunnel/sea_fish_06_20260706.webp",
   "../assets/images/nazonazo-tunnel/sea_fish_07_20260706.webp",
   "../assets/images/nazonazo-tunnel/sea_fish_08_20260706.webp"
  ]
 },
 number:{
  sky:"../assets/images/nazonazo-tunnel/number_room_sky_back_20260707.webp",
  horizon:"../assets/images/nazonazo-tunnel/number_room_horizon_loop_20260707.webp",
  mid:"../assets/images/nazonazo-tunnel/number_room_mid_loop_20260707.webp",
  ground:"../assets/images/nazonazo-tunnel/number_room_ground_track_loop_20260707.webp",
  fg:"../assets/images/nazonazo-tunnel/number_room_foreground_loop_20260707.webp",
  decor:"../assets/images/nazonazo-tunnel/number_room_decor_20260713_v2.webp"
 },
 future:{
  sky:"../assets/images/nazonazo-tunnel/future_city_sky_back_20260707.webp",
  horizon:"../assets/images/nazonazo-tunnel/future_city_horizon_cutout_loop_20260712.webp",
  mid:"../assets/images/nazonazo-tunnel/future_city_mid_cutout_loop_20260712.webp",
  ground:"../assets/images/nazonazo-tunnel/future_city_ground_track_loop_20260707.webp",
  fg:"../assets/images/nazonazo-tunnel/future_city_foreground_loop_20260707.webp",
  station:"../assets/images/nazonazo-tunnel/future_city_station_checkpoint_20260712.webp",
   decor:"../assets/images/nazonazo-tunnel/future_city_station_line_decor_20260713_v2.webp"
 },
 space:{
  sky:"../assets/images/nazonazo-tunnel/space_nebula_sky_back_20260713.webp",
  horizon:"../assets/images/nazonazo-tunnel/space_planets_cutout_loop_20260713.png",
  fg:"../assets/images/nazonazo-tunnel/space_asteroids_cutout_loop_20260713.png",
  station:"../assets/images/nazonazo-tunnel/space_constellation_checkpoint_20260713.png",
  rocket:"../assets/images/nazonazo-tunnel/space_vehicle_exploration_rocket_pono_20260713.png"
 }
};
const bgUrl=src=>'url("'+src+'")';
const STAGES=[
 {id:"town",icon:"🏘️",art:"stageTown",veh:"train",bank:TOWN,gens:[],skyPosition:"center calc(100% - var(--town-sky-lift,42vh))",
  names:["まちはずれ","ゆうやけの まちはずれ"],
  assets:ASSETS.town,
  pals:[
   {sky:["#8ed6f5","#eaf6d8"],haze:"#c3dbc8",skyl:"#b7cfe0",hill:"#a8cf9a",house:"#9fb98a",roof:"#7fa06a",leaf:"#7fae6f",trunk:"#5c8a4e",grass:"#6db850",tie:"#6b4a2f",rail:"#4a4a4a",fgA:"#3e7a34",fgB:"#2c5a24",mount:"#a9765a"},
   {sky:["#ff9d5c","#ffe0b0"],haze:"#e8b088",skyl:"#c9856a",hill:"#b0764f",house:"#8a5a48",roof:"#6a4034",leaf:"#5a4630",trunk:"#3e2f20",grass:"#c08a4a",tie:"#4a3020",rail:"#333333",fgA:"#4a3220",fgB:"#332114",mount:"#8a5540"}],
  horizon(P,NP){return svgURI(HW,H,
    gMountains(HW,H,P.haze,40,70,18,11,0.9)+
    gSkyline(1150,H,P.skyl,12,null)+
    gMountains(HW,H,P.hill,10,55,22,13,0.95)+
    '<rect x="1290" y="0" width="410" height="'+H+'" fill="'+NP.mid1+'" opacity="0.28"/>'+
    '<g transform="translate(1330,0)">'+gMountains(370,H,NP.mid1,30,110,7,17,0.9)+'</g>'+
    '<g transform="translate(1470,0)">'+gTreeRow(230,H,NP.fgA,NP.fgB,3,150,19)+'</g>');},
  mid(P){return svgURI(1400,H,gHouses(1400,H,P.house,P.roof,7,21)+gTreeRow(1400,H,P.leaf,P.trunk,8,120,23));},
  ground(P){return svgURI(600,90,gRail(600,90,P.tie,P.rail,P.grass));},
  fg(P){return svgURI(900,220,gBumps(900,220,P.fgA,7,150,25)+gGrassSpikes(900,220,P.fgB,40,90,27));},
  decor(P,r){return bgUrl(ASSETS.town.decor);}},
 {id:"jungle",icon:"🌴",art:"stageJungle",veh:"train",bank:JUNGLE,gens:["legsJ","sizeJ"],skyPosition:"center calc(100% - 22vh)",
  names:["ジャングル","よるの ジャングル"],
 pals:[
   {sky:["#cfe8b0","#7cc06e"],far1:"#aed69c",far2:"#8cc47c",mid1:"#4f8f42",mid2:"#5c9a4c",trunk:"#35652c",grass:"#6a9e54",tie:"#5a4630",rail:"#3c3c3c",fgA:"#2e6b28",fgB:"#245a1e",mount:"#5f9e4e",fx:"none"},
   {sky:["#16302a","#0d1f1a"],far1:"#24443a",far2:"#1c3a30",mid1:"#173026",mid2:"#1d3a2c",trunk:"#0f241c",grass:"#1e3a2c",tie:"#142418",rail:"#222222",fgA:"#0b1f16",fgB:"#071710",mount:"#2c5044",fx:"fireflies"}],
  assets:ASSETS.jungle,
  horizon(P,NP){return svgURI(HW,H,
    gMountains(HW,H,P.far1,50,90,14,41,0.85)+
    gMountains(1200,H,P.far2,25,80,16,43,0.95)+
    '<rect x="1290" y="0" width="410" height="'+H+'" fill="'+NP.sky[0]+'" opacity="0.35"/>'+
    '<g transform="translate(1340,0)">'+gBlocksRow(340,H,NP.blocks,3,47,true)+'</g>'+
    '<g transform="translate(1380,0)">'+gDigitsFloat(300,H,"#ffffff",4,49,40)+'</g>');},
  mid(P){return svgURI(1400,H,gTreeRow(1400,H,P.mid1,P.trunk,10,170,51)+gBumps(1400,H,P.mid2,9,90,53));},
  ground(P){return svgURI(600,90,gRail(600,90,P.tie,P.rail,P.grass));},
  fg(P){return svgURI(900,220,gBumps(900,220,P.fgA,6,170,55)+gKelp(900,220,P.fgB,5,57));},
 decor(P,r){return bgUrl(ASSETS.jungle.decor);}},
 {id:"number",icon:"🎲",art:"stageNumber",veh:"train",bank:null,gens:[],
  names:["すうじのへや","ゆめの すうじのへや"],
  assets:ASSETS.number,
  pals:[
   {sky:["#f3e9ff","#dfe9ff"],dig1:"#b39ce8",dig2:"#9a7fd8",blocks:["#d9c6f5","#f5c6e0","#c6e0f5"],blocks2:["#c0a8ee","#eea8cc","#a8ccee"],fgBlocks:["#8f76d0","#c06aa8","#6a8fc0"],flo1:"#e8ddfa",flo2:"#cfc0f0",mount:"#b79ae8"},
   {sky:["#ffd9ec","#d9c6ff"],dig1:"#c98ad0",dig2:"#b070c0",blocks:["#f5a8c6","#c6a8f5","#a8d0f5"],blocks2:["#eb90b8","#b890eb","#90b8eb"],fgBlocks:["#d06aa0","#8a6ad0","#6aa0d0"],flo1:"#f5e0f0",flo2:"#e0c8ea",mount:"#d08ab8"}],
  horizon(P,NP){return svgURI(HW,H,
    gDigitsFloat(HW,H,P.dig1,20,71,44)+
    gBlocksRow(HW,H,P.blocks,9,73,false));},
  mid(P){return svgURI(1400,H,gDigitsFloat(1400,H,P.dig2,12,81,64)+gBlocksRow(1400,H,P.blocks2,6,83,true));},
  ground(P){return svgURI(600,90,gChecker(600,90,P.flo1,P.flo2));},
  fg(P){return svgURI(900,220,gBlocksRow(900,220,P.fgBlocks,5,85,true));},
 decor(P,r){return bgUrl(ASSETS.number.decor);}},
 {id:"sea",icon:"🌊",art:"stageSea",veh:"sub",bank:SEA,gens:["legsS","sizeS"],
  names:["ふかいうみ","よるの ふかいうみ"],
  assets:ASSETS.sea,
  pals:[
   {sky:["#2a7fc9","#0b3d6e"],far1:"#144a80",far2:"#123f6e",mid1:"#1d5c96",mid2:"#17548c",sand1:"#e6cf9a",sand2:"#d4ba80",fgA:"#0a3158",fgB:"#0d3a64",mount:"#4a6a8a",fx:"bubbles"},
   {sky:["#07284d","#02101f"],far1:"#0a3158",far2:"#0a2a4a",mid1:"#0d3a64",mid2:"#0c3458",sand1:"#8a7a5a",sand2:"#6a5e46",fgA:"#052038",fgB:"#04182c",mount:"#26425e",fx:"bubbles_glow"}],
  horizon(P,NP){return svgURI(HW,H,
    gBumps(1250,H,P.far1,10,100,91)+
    gSkyline(1000,H,P.far2,93,null)+
    '<rect x="1290" y="0" width="410" height="'+H+'" fill="'+NP.sky[0]+'" opacity="0.55"/>'+
    '<g transform="translate(1310,0)">'+gSkyline(390,H,NP.far1,95,NP.win1)+'</g>');},
  mid(P){return svgURI(1400,H,gBumps(1400,H,P.mid1,9,110,101)+gKelp(1400,H,P.mid2,8,103));},
  ground(P){return svgURI(600,90,gSand(600,90,P.sand1,P.sand2,105));},
  fg(P){return svgURI(900,220,gKelp(900,220,P.fgA,6,107)+gBumps(900,220,P.fgB,5,120,109));},
 decor(P,r){return svgURI(180,300,gKelp(180,300,P.mid2,2,111+r)+gBumps(180,300,P.far1,2,80,113+r));}},
 {id:"future",icon:"🌆",art:"stageFuture",veh:"train",bank:FUTURE,gens:["speedF"],
  names:["みらいシティ","あさやけの みらいシティ"],
  assets:ASSETS.future,
  pals:[
   {sky:["#3b2b63","#7b4fa0"],far1:"#241a45",far2:"#2e2258",win1:"#ffd97d",win2:"#67e8f9",mid1:"#332a5e",mid2:"#3a2f6a",gBase:"#1c1440",gLine:"#67e8f9",gTick:"#8e7cf0",fgA:"#120d2a",fgB:"#0e0a22",fgWin:"#8e7cf0",mount:"#5b4b8a",fx:"stars"},
   {sky:["#ffb0c8","#8a7ad0"],far1:"#4a3a78",far2:"#5a4a90",win1:"#ffd97d",win2:"#ffffff",mid1:"#6a5aa8",mid2:"#7a68b8",gBase:"#3a2f6a",gLine:"#ffd97d",gTick:"#ffb0c8",fgA:"#2a2050",fgB:"#241a48",fgWin:"#ffd97d",mount:"#7a68b0",fx:"none"}],
  horizon(P,NP){return svgURI(HW,H,
    gSkyline(1250,H,P.far1,121,P.win1)+
    gSkyline(1100,H,P.far2,123,P.win2)+
    '<rect x="1290" y="0" width="410" height="'+H+'" fill="'+NP.sky[0]+'" opacity="0.6"/>'+
    '<g transform="translate(1290,0)">'+gStars(410,H,26,125)+'</g>'+
    gPlanet(1560,90,34,"#e8b06a","#f5d9a0"));},
  mid(P){return svgURI(1400,H,gSkyline(1400,H,P.mid1,131,P.win2)+gBumps(1400,H,P.mid2,8,70,133));},
  ground(P){return svgURI(600,90,gNeonGround(600,90,P.gBase,P.gLine,P.gTick));},
  fg(P){return svgURI(900,220,gSkyline(900,220,P.fgA,135,P.fgWin)+gBumps(900,220,P.fgB,6,90,137));},
  decor(P,r){return bgUrl(ASSETS.future.decor);}},
 {id:"space",icon:"🌌",art:"stageSpace",veh:"rocket",bank:SPACE,gens:[],
  names:["うちゅう","ぎんがの おく"],
  assets:ASSETS.space,
  pals:[
   {sky:["#0b1030","#1a1145"],mid1:"#2a2560",mid2:"#3a3660",fgA:"#141030",fgB:"#26215a",p1:"#e07a6a",p2:"#e8b06a",p3:"#9a7fd8",mount:"#3a3660"},
   {sky:["#150024","#3a0150"],mid1:"#4a2160",mid2:"#5a2a70",fgA:"#26073a",fgB:"#38104e",p1:"#ff8ab0",p2:"#ffd06a",p3:"#8ad0ff",mount:"#5a3a78"}],
  horizon(P,NP){return svgURI(HW,H,
    gStars(1250,H,60,151)+
    gPlanet(300,80,28,P.p1,null)+gPlanet(760,150,40,P.p2,"#f5d9a0")+gPlanet(1080,70,22,P.p3,null)+
    '<g transform="translate(1290,0)">'+gStars(410,H,20,153)+'</g>'+
    '<circle cx="1560" cy="150" r="80" fill="#4aa3e8"/>'+
    '<ellipse cx="1535" cy="125" rx="30" ry="18" fill="#79d67f"/>'+
    '<ellipse cx="1590" cy="170" rx="24" ry="14" fill="#79d67f"/>'+
    '<circle cx="1560" cy="150" r="80" fill="none" stroke="#bfe6ff" stroke-width="5" opacity="0.6"/>');},
  mid(P){return svgURI(1400,H,gStars(1400,H,40,161)+gBumps(1400,H,P.mid1,7,60,163));},
  ground(P){return svgURI(600,90,'<rect width="600" height="90" fill="'+P.sky[0]+'"/>'+gStars(600,90,10,165));},
  fg(P){return svgURI(900,220,gBumps(900,220,P.fgA,5,110,167)+gStars(900,120,14,169));},
  decor(P,r){return svgURI(140,240,gBumps(140,240,P.fgB,3,90,171+r)+gStars(140,240,6,173+r));}}
];
const RARES=[["🕊️","しろい はと"],["🦜","にじいろ おうむ"],["💯","ひゃくてんまん"],["🐳","そらとぶ くじら"],["🛸","なぞの ゆーふぉー"],["☄️","おおながれぼし"]];
const RUN_EVENTS={town:[["🦋","ちょう"],["🌼","おはな"],["🍀","よつば"],["🎈","ふうせん"],["🐦","ことり"]]};
const JUNGLE_MID_TILE_ASPECT=2,JUNGLE_MID_TILE_SCALE=1.16;
const JUNGLE_ANIMAL_LAYOUT={
 far:[
  {id:"toucans-loop",asset:"toucans",species:"toucans",anchor:"perch",x:104,y:34,anchorY:74,w:14,min:46,max:126,depth:.25,opacity:1,motion:"sway",flip:-1,origin:"50% 74%",moveY:0,loop:"mid"},
  {id:"elephant-far-a",role:"distant",asset:"elephant",species:"elephant",anchor:"habitat",stageX:296,align:"right",inset:8,y:74.5,anchorY:80.9,wCss:"min(9vw,23vmin)",min:58,max:92,depth:.28,opacity:1,motion:"breathe",flip:-1,origin:"50% 80.9%",moveY:0,loop:"stage",frames:3,fixedFrame:0},
  {id:"giraffe-far-a",role:"distant",asset:"giraffe",species:"giraffe",anchor:"habitat",stageX:1156,align:"left",inset:8,y:73.5,anchorY:86.8,wCss:"min(8vw,20vmin)",min:52,max:88,depth:.3,opacity:1,motion:"breathe",flip:-1,origin:"50% 86.8%",moveY:0,loop:"stage"}
 ],
 mid:[
  {id:"sloth-loop",asset:"sloth",species:"sloth",anchor:"hang",x:6,y:37,anchorY:10,w:10.5,min:31,max:92,depth:.25,opacity:1,motion:"sway",flip:1,origin:"50% 10%",moveY:0,loop:"mid"},
  {id:"crocodile-loop",asset:"crocodile",species:"crocodile",anchor:"understory",x:70,y:80,anchorY:98,w:25.5,min:80,max:225,depth:.92,opacity:1,motion:"breathe",flip:1,origin:"50% 98%",moveY:0},
  {id:"elephant-mid-b",role:"distant",asset:"elephant",species:"elephant",anchor:"habitat",stageX:2016,align:"left",inset:8,y:78,anchorY:80.9,wCss:"min(13vw,34vmin)",min:88,max:150,depth:.55,opacity:1,motion:"breathe",flip:1,origin:"50% 80.9%",moveY:0,loop:"stage",frames:3,fixedFrame:2},
  {id:"giraffe-mid-b",role:"distant",asset:"giraffe",species:"giraffe",anchor:"habitat",stageX:2016,align:"right",inset:7,y:78,anchorY:86.8,wCss:"min(12vw,30vmin)",min:78,max:138,depth:.55,opacity:1,motion:"breathe",flip:1,origin:"50% 86.8%",moveY:0,loop:"stage"}
 ],
 near:[
  {id:"elephant-hero",role:"hero",asset:"elephant",species:"elephant",anchor:"ground",stageX:726,align:"right",inset:2,y:80,anchorY:80.9,wCss:"min(28vw,72vmin)",min:190,max:340,depth:.94,opacity:1,motion:"breathe",flip:1,origin:"50% 80.9%",moveY:0,loop:"stage",frames:3,frameDuration:3.2},
  {id:"giraffe-hero",role:"hero",asset:"giraffe",species:"giraffe",anchor:"ground",stageX:1586,align:"right",inset:2,y:80,anchorY:86.8,wCss:"min(22vw,54vmin)",min:150,max:280,depth:.9,opacity:1,motion:"breathe",flip:1,origin:"50% 86.8%",moveY:0,loop:"stage"}
 ]
};
const NPC_BASE="../assets/images/bento/npc/";
const NPC_VER="20260617-risu-bright-set";
const npcSrc=(id,mood)=>NPC_BASE+id+"_"+mood+".png?v="+encodeURIComponent(NPC_VER);
const STATION_HELPERS=[
 {id:"risu",e:"🐿️",name:"りすちゃん",request:npcSrc("risu","request"),normal:npcSrc("risu","normal"),happy:npcSrc("risu","super_happy")},
 {id:"inu",e:"🐶",name:"わんちゃん",request:npcSrc("inu","request"),normal:npcSrc("inu","normal"),happy:npcSrc("inu","super_happy")},
 {id:"ahiru",e:"🦆",name:"あひるさん",request:npcSrc("ahiru","request"),normal:npcSrc("ahiru","normal"),happy:npcSrc("ahiru","super_happy")},
 {id:"shika",e:"🦌",name:"しかさん",request:npcSrc("shika","request"),normal:npcSrc("shika","normal"),happy:npcSrc("shika","super_happy")},
 {id:"araiguma",e:"🦝",name:"あらいぐまくん",request:npcSrc("araiguma","request"),normal:npcSrc("araiguma","normal"),happy:npcSrc("araiguma","super_happy")},
 {id:"neko",e:"🐱",name:"ねこさん",request:npcSrc("neko","request"),normal:npcSrc("neko","normal"),happy:npcSrc("neko","super_happy")}
];
const HELP_MAX=3;
const SCORE_POINTS={correct:100,firstTry:50,stageClear:300,noMiss:200,helpPickup:50,helpOverflow:50,rare:300,tunnelFriend:100,tunnelPerfect:200};
const QN=5, SPAN=2860, INTRO=320, GAP=430, DROP_OFF=2260, COVER_OFF=2480, COVER_LEN=560;
const TRAIN_WIDTH_MIN_PX=190, TRAIN_WIDTH_VW=30.9, TRAIN_WIDTH_MAX_PX=331, TRAIN_RIGHT_SHIFT_VW=5, DEFAULT_VEHICLE_LEFT_VW=28;
const TRAIN_CAR_WIDTH_MIN_PX=300, TRAIN_CAR_WIDTH_VW=47, TRAIN_CAR_WIDTH_MAX_PX=480;
const TRAIN_CAR_HEIGHT_MIN_PX=83, TRAIN_CAR_HEIGHT_VW=13.1, TRAIN_CAR_HEIGHT_MAX_PX=133;
const TRAIN_CAR_ART_ASPECT=1853/636;
const CHECKPOINT_STOP_LEFT_VW=24, TUNNEL_ENTRY_CAMERA_LEFT_VW=28, TUNNEL_INTERIOR_RUN_VW=360;
const TUNNEL_EXIT_APPROACH_RUN_VW=135;
const TUNNEL_ENTRY_FADE_DELAY_MS=900, TUNNEL_ENTRY_SWITCH_MS=1320, TUNNEL_ENTRY_BLACK_HOLD_MS=420;
const TUNNEL_EXIT_FADE_SETUP_MS=420, TUNNEL_EXIT_BLACK_HOLD_MS=320, TUNNEL_EXIT_RUN_MS=1250, TUNNEL_EXIT_CLEAR_MS=1600;
const TUNNEL_GAME_MAX_V=32,TUNNEL_TRANSIT_MAX_V=58,TUNNEL_GAME_WHEEL_PERIOD=1.45,TUNNEL_WALL_PARALLAX=.55,TUNNEL_FRIEND_CALM_PARALLAX=.26,TUNNEL_WALL_ASPECT=1600/900,TUNNEL_WALL_BAYS=4,TUNNEL_FRIEND_GAP_TARGET_VW=55;
const TUNNEL_FRIEND_LIMIT=3,TUNNEL_FRIEND_Y=[50,61,55],TUNNEL_FRIEND_STATIC_SLOTS=[{x:18,y:68},{x:32,y:70},{x:90,y:68}];
const STOP_SETTLE_MS=230, WHEEL_FAST_PERIOD=0.98, WHEEL_SLOW_PERIOD=2.05, WHEEL_STOP_EASE_VW=82;
const SMOKE_INTERVAL_MIN_MS=70,SMOKE_INTERVAL_JITTER_MS=40;
const SMOKE_LIFE_MIN_MS=4800,SMOKE_LIFE_JITTER_MS=1400;
const SMOKE_MAX_PUFFS=48,SMOKE_WARM_START_COUNT=18,SMOKE_WARM_MAX_AGE_MS=1600;
function trainLeftVw(){
 const vw=window.innerWidth||844;
 const w=Math.max(TRAIN_WIDTH_MIN_PX,Math.min(TRAIN_WIDTH_MAX_PX,vw*TRAIN_WIDTH_VW/100));
 return 50-(w/vw*50)+TRAIN_RIGHT_SHIFT_VW;
}
function trainCarWidthVw(){
 const vw=window.innerWidth||844;
 const w=Math.max(TRAIN_CAR_WIDTH_MIN_PX,Math.min(TRAIN_CAR_WIDTH_MAX_PX,vw*TRAIN_CAR_WIDTH_VW/100));
 return w/vw*100;
}
function trainCarHeightVh(){
 const vh=window.innerHeight||390;
 return trainCarHeightPx()/vh*100;
}
function trainCarHeightPx(){
 const vw=window.innerWidth||844;
 return Math.max(TRAIN_CAR_HEIGHT_MIN_PX,Math.min(TRAIN_CAR_HEIGHT_MAX_PX,vw*TRAIN_CAR_HEIGHT_VW/100));
}
function trainCarVisualWidthVw(){
 return trainCarHeightPx()*TRAIN_CAR_ART_ASPECT/(window.innerWidth||844)*100;
}
function trainBottomVh(){
 const st=STAGES[stg];
 if(st&&st.id==="jungle")return 13.3;
 return st&&(st.id==="town"||st.id==="number"||st.id==="future")?9.8:9.1;
}
const vehicleLeftVw=()=>STAGES[stg]&&STAGES[stg].veh==="train"?trainLeftVw():DEFAULT_VEHICLE_LEFT_VW;
const stops=(o,i)=>o+INTRO+i*GAP-CHECKPOINT_STOP_LEFT_VW;
const tunX=(o,i)=>o+INTRO+i*GAP;
const dropStop=o=>o+DROP_OFF;
const dropX=o=>o+DROP_OFF+CHECKPOINT_STOP_LEFT_VW;

/* ================= collection registry ================= */
const zkGroups=[]; const zkReg=new Set(); // key: e|t (メモリ内のみ・本番はセーブ実装)
function buildRegistry(){
 const extra={jungle:JLEGS.map(x=>[x[0],x[1]]).concat(JSIZE),sea:SLEGS.map(x=>[x[0],x[1]]).concat(SSIZE),future:SPEED,town:[],number:[],space:[]};
 STAGES.forEach(st=>{
  const seen=new Set(),items=[];
  const add=(e,t)=>{const k=e+"|"+t;if(!seen.has(k)){seen.add(k);items.push({e,t});}};
  if(st.bank)st.bank.forEach(q=>add(q.a[0],q.a[1]));
  (extra[st.id]||[]).forEach(x=>add(x[0],x[1]));
  if(st.id==="number"){CNT_EMO.forEach(x=>add(x[0],x[1]));for(let n=1;n<=10;n++)add(String(n),KANJI_NUM[n-1]);}
  zkGroups.push({key:st.id,label:st.names[0],art:st.art,items});
 });
 zkGroups.push({key:"wp",label:"なぞなぞマスター",art:"master",items:WORDPLAY.map(q=>({e:q.a[0],t:q.a[1]}))});
 zkGroups.push({key:"station",label:"えきの ともだち",art:"station",items:STATION_HELPERS.map(h=>({e:h.e,t:h.name,img:h.normal}))});
 zkGroups.push({key:"rare",label:"めずらしい ともだち",art:"rare",items:RARES.map(x=>({e:x[0],t:x[1]})),rare:true});
}
function zkKey(e,t){return e+"|"+t;}
function zkTotal(){let n=0;const s=new Set();zkGroups.forEach(g=>g.items.forEach(it=>s.add(zkKey(it.e,it.t))));return s.size;}
function zkCount(){let n=0;const s=new Set();zkGroups.forEach(g=>g.items.forEach(it=>{const k=zkKey(it.e,it.t);if(zkReg.has(k))s.add(k);}));return s.size;}
function registerZk(e,t){const k=zkKey(e,t);const isNew=!zkReg.has(k);zkReg.add(k);if(isNew)saveGame();return isNew;}
function openZukan(){
 const body=document.getElementById("zkBody");body.innerHTML="";
 zkGroups.forEach(g=>{
  const gd=document.createElement("div");gd.className="zkGroup";
  const gn=document.createElement("div");gn.className="zkGName";
  const gnLabel=document.createElement("span");gnLabel.textContent=g.label;
  gn.append(createUiArt(g.art,"zukan-group-art"),gnLabel);gd.appendChild(gn);
  const gr=document.createElement("div");gr.className="zkGrid";
  g.items.forEach(it=>{
   const c=document.createElement("div");
   const has=zkReg.has(zkKey(it.e,it.t));
   c.className="zkCell"+(has?"":" no")+(g.rare?" rareC":"");
   const visual=has?createQuizArt(it.e,it.t,"ze",it.img):document.createElement("span");
   if(!has){visual.className="ze";visual.textContent="？";visual.setAttribute("aria-hidden","true");}
   const label=document.createElement("span");label.className="zt";label.textContent=has?it.t:"？？？";
   c.append(visual,label);
   gr.appendChild(c);
  });
  gd.appendChild(gr);body.appendChild(gd);
 });
 document.getElementById("zkProg").textContent="あつめた ともだち "+zkCount()+" / "+zkTotal();
 document.getElementById("zukan").classList.remove("hidden");
}

/* ================= state ================= */
let level=0,stg=0,loop=0,unlockedLoop=0,cleared=[],qSeg=0,qList=[],cur=null,missInQ=0,stageMiss=0,totalStars=0;
let worldX=0,vel=0,target=0,pending=null,driving=false,swapReady=false,swapped=false,coverEl=null,dropEl=null,transitCover=null;
let tunnels=[],playing=false,cars=[],helpItems=[],rareCount=0,rareEl=null,rareSpawned=false,rareSpawnTimer=0;
let journeyScore=0,highScore=0,stageScore=0,stageScoreBreakdown=emptyStageScoreBreakdown(),stageClearScoreGranted=false,stageCompletionHandled=false;
let tunnelFriendCandidates=[],tunnelFriendsFound=0,tunnelFriendTotalFound=0,tunnelFriendRewardGranted=false,tunnelFriendPerfectScoreGranted=false,tunnelFriendGameActive=false,tunnelFriendStartWorldX=0;
let bestStarsByStage={},answerLocked=false,portalEditHolding=false,nextMagicPuffAt=0,smokeRunning=false,smokeSerial=0,exitPortalBaseWorldX=0;
let numberCargoPicked=[],numberCargoGoalShown=false;
let numberCargoTheme=null;
const SEA_FIRE_INTERVAL_MS=90;
const SEA_SHOT_LIMIT=56;
const SEA_COMPANION_LIMIT=3;
const SEA_TARGET_HIT_GOALS=[16,20,24];
const SEA_TARGET_MAX_SCALE=2.2;
const SEA_TARGET_REDUCED_SCALE=1.34;
const SEA_ASSIST_FIRE_MS=3600;
const SEA_BURST_TENSION_MS=140;
const SEA_BURST_VISUAL_MS=380;
const SEA_BURST_PARTICLE_MS=720;
const SEA_READY_MS=700;
const SEA_GO_MS=500;
const SEA_BOSS_HP=[144,192,240];
const SEA_BOSS_INTRO_MS=650;
const SEA_BOSS_VICTORY_MS=1050;
const SEA_DECOYS=[["🐔","にわとり"],["🐝","はち"],["🐘","ぞう"],["🦒","きりん"],["🐿️","りす"],["🐰","うさぎ"],["🦉","ふくろう"],["🐞","てんとうむし"]];
const SEA_RESCUE_LINES=[
 "たすかった！ ぼくも てつだうよ！",
 "ありがとう！ いっしょに いくよ！",
 "この おくは あぶないよ！",
 "あわを つくる ぬしが いるよ！",
 "おおきな ひかりが ちかいよ！"
];
let steerTargetX=0,steerX=0,steerTargetY=0,steerY=0,seaSteerPointerId=null,seaSteerUsed=false;
let seaBubbleLaunchPending=false,seaBubbleLaunchTimer=0,seaShooterResumeTimer=0,seaAssistFireTimer=0,seaBubbleOptions=[];
let seaShooterEpoch=0,seaShots=[],seaCompanionSprites=[],seaCompanionKey="",seaTrail=[];
let seaFirePointerId=null,seaFireSources=new Set(),seaMoveKeys=new Set(),seaKeyboardAim=null,seaKeyboardAimStartedAt=0;
let seaLastVolleyAt=0,seaShooterFrameAt=0,seaVolleyCount=0,seaSalvoHits=new Set();
let seaRoundPhase="idle",seaRoundCountdownTimer=0;
let seaBossPhase="idle",seaBossHp=0,seaBossMaxHp=0,seaBossX=0,seaBossY=0,seaBossRadiusX=0,seaBossRadiusY=0,seaBossWidth=0;
let seaBossEpoch=0,seaBossTimer=0,seaBossFlashUntil=0,seaBossSalvos=new Set(),seaBossThresholds=new Set(),seaBossDefeated=false;
let seaBossEnemyShots=[],seaBossNextAttackAt=0,seaBossAttackAt=0,seaBossInvulnerableUntil=0,seaBossStunUntil=0;
let seaRescueMessageTimer=0,seaDecoysSeen=new Set();
const FUTURE_CRANE_RAIL_PER_TURN=[.80,.75,.70];
const FUTURE_CRANE_DESCENT_SPEED=[120,130,140];
const FUTURE_CRANE_SLOW_RADIUS=[28,24,20];
const FUTURE_CRANE_SLOW_SPEED=[40,48,55];
const FUTURE_CRANE_PICKUP_Y_TOLERANCE=[20,15,12];
const FUTURE_CRANE_PICKUP_X_TOLERANCE=[32,24,18];
const FUTURE_CRANE_CORE_SNAP_X=[34,26,20];
const FUTURE_CRANE_CORE_TOLERANCE=[16,12,8];
const FUTURE_CRANE_KEY_ANGLE=Math.PI/10;
const FUTURE_CRANE_KEY_FAST_ANGLE=Math.PI/4;
const FUTURE_CRANE_EVENT_ANGLE_CAP=Math.PI/3;
const FUTURE_CRANE_CRANK_DEADZONE=14;
const FUTURE_CRANE_GRIP_ARM_MS=120;
const FUTURE_CRANE_GRIP_GOAL=3;
const FUTURE_CRANE_AUTO_LIFT_MS=420;
const FUTURE_CRANE_RETURN_MS=260;
const FUTURE_CRANE_RETURN_REDUCED_MS=70;
const FUTURE_CRANE_PULSE_MS=110;
let futureCapsuleOptions=[],futureCapsuleResolving=false,futureCapsuleAssisted=false;
let futureCapsuleSelectedIndex=-1,futureCapsuleEnergy=0,futureCapsuleTimers=new Set(),futureCapsuleEpoch=0;
let futureCranePhase="idle",futureCranePointerId=null,futureCranePointerRole="",futureCranePointerCaptureTarget=null;
let futureCranePointerPhaseAtDown="",futureCraneHeldIndex=-1,futureCraneTargetIndex=-1,futureCraneX=0,futureCraneY=0;
let futureCraneLastPointerX=0,futureCraneLastPointerY=0,futureCraneCrankLastAngle=null,futureCraneCrankRotation=0;
let futureCraneActionHeld=false,futureCraneKeyboardActionHeld=false,futureCraneGripTapEligible=false;
let futureCraneGripCount=0,futureCraneGripArmedAt=0,futureCraneLastTickAt=0,futureCraneSkipSnapKey="";
let futureCraneFollowX=0,futureCraneFollowY=0,futureCraneLifted=false,futureCraneCoreReady=false;
let futureCraneSubmissionCommitted=false,futureCraneKeyboardActive=false,futureCraneGeometry=null,futureCraneGeometryDirty=true;
let futureCraneGeometryFrame=0;
const SPACE_GALAXY_WIND_GOAL=Math.PI*2*3.25;
let spaceGalaxyOptions=[],spaceGalaxyRotation=0,spaceGalaxyPhase="idle",spaceGalaxyPointerId=null,spaceGalaxyPointerAngle=0;
let spaceGalaxyPointerX=0,spaceGalaxyPointerY=0,spaceGalaxyDragged=false,spaceGalaxySuppressClick=false,spaceGalaxyWind=0,spaceGalaxyWindStage=0;
let spaceGalaxySelectedIndex=-1,spaceGalaxyTurnsAnnounced=0,spaceGalaxyResolving=false,spaceGalaxyAssisted=false,spaceGalaxyKeyboardTarget=-1,spaceGalaxyTimer=0,spaceGalaxyEpoch=0;
let spaceSteerTargetX=0,spaceSteerX=0,spaceSteerTargetY=0,spaceSteerY=0,spaceSteerPointerId=null,spaceSteerUsed=false,spaceSteerFrameAt=0;
const spaceMoveKeys=new Set();
let nazonazoAdminPreviewMode=false;
const NUMBER_CARGO_THEMES=[
 {e:"⭐",name:"おほしさま"},{e:"🎈",name:"ふうせん"},{e:"🌼",name:"おはな"},
 {e:"🍎",name:"りんご"},{e:"🌰",name:"どんぐり"},{e:"🍓",name:"いちご"}
];
const SAVE_KEY="pono_nazonazo_tunnel_v1";
const FAST=(location.hash==="#fast")?6:1;
const FORCERARE=(location.hash==="#fast");

/* ================= weather gameplay ================= */
const JOURNEY_SHOWER_CHANCE=.25;
const SHOWER_FIRST_DELAY_MS=[2500,6000];
const SHOWER_RAIN_DURATION_MS=[6000,10000];
const SHOWER_CLEAR_DURATION_MS=[12000,20000];
const RAIN_TRAIN_SPEED_MULTIPLIER=.92;
const RARE_CHANCE_CLEAR=.25;
const RARE_CHANCE_RAIN=.4;
let journeyWeatherPlan="clear",currentStageWeather="clear",showerSchedulerActive=false,showerPhaseElapsedMs=0,showerPhaseDurationMs=0;
let rainNoticeShownForJourney=false;
function forcedWeather(){
 try{
  const debug=window.PonoDebugMode;
  if(!debug||typeof debug.isAllowed!=="function"||!debug.isAllowed())return "";
  const value=new URLSearchParams(location.search).get("weather");
  return value==="rain"||value==="clear"?value:"";
 }catch(_){return "";}
}
function weatherRandomUnit(){
 try{
  if(window.crypto&&typeof window.crypto.getRandomValues==="function"){
   const value=new Uint32Array(1);window.crypto.getRandomValues(value);
   return value[0]/4294967296;
  }
 }catch(_){/* Math.random fallback */}
 return Math.random();
}
function showerRandomRange(range,randomFn){
 const unit=typeof randomFn==="function"?randomFn():weatherRandomUnit();
 return range[0]+(range[1]-range[0])*Math.max(0,Math.min(.999999,Number(unit)||0));
}
function rollJourneyWeather(randomFn){
 const forced=forcedWeather();
 if(forced)journeyWeatherPlan=forced==="rain"?"showers":"clear";
 else if(FAST>1)journeyWeatherPlan="clear";
 else journeyWeatherPlan=(typeof randomFn==="function"?randomFn():weatherRandomUnit())<JOURNEY_SHOWER_CHANCE?"showers":"clear";
 rainNoticeShownForJourney=false;
 return journeyWeatherPlan;
}
function weatherForStage(stage){
 if(!stage||stage.id!=="town")return "clear";
 return currentStageWeather;
}
function stopStageWeather(){
 currentStageWeather="clear";
 showerSchedulerActive=false;
 showerPhaseElapsedMs=0;
 showerPhaseDurationMs=0;
 return currentStageWeather;
}
function startStageWeather(stage,randomFn){
 stopStageWeather();
 if(!stage||stage.id!=="town")return currentStageWeather;
 const forced=forcedWeather();
 if(forced){currentStageWeather=forced;return currentStageWeather;}
 if(FAST>1||journeyWeatherPlan!=="showers")return currentStageWeather;
 showerSchedulerActive=true;
 showerPhaseDurationMs=showerRandomRange(SHOWER_FIRST_DELAY_MS,randomFn);
 return currentStageWeather;
}
function advanceStageWeather(dtMs,state,randomFn){
 if(!showerSchedulerActive)return null;
 const context=state||{};
 if(!context.playing||context.tunnelRun)return null;
 if(currentStageWeather==="clear"&&!context.driving)return null;
 showerPhaseElapsedMs+=Math.max(0,Number(dtMs)||0);
 if(showerPhaseElapsedMs<showerPhaseDurationMs)return null;
 showerPhaseElapsedMs=0;
 if(currentStageWeather==="rain"){
  currentStageWeather="clear";
  showerPhaseDurationMs=showerRandomRange(SHOWER_CLEAR_DURATION_MS,randomFn);
 }else{
  currentStageWeather="rain";
  showerPhaseDurationMs=showerRandomRange(SHOWER_RAIN_DURATION_MS,randomFn);
 }
 return currentStageWeather;
}
function rareSpawnChance(){
 return currentStageWeather==="rain"?RARE_CHANCE_RAIN:RARE_CHANCE_CLEAR;
}
function rainTrainSpeedMultiplier(stage,tunnelRun){
 return !tunnelRun&&stage&&stage.veh==="train"&&currentStageWeather==="rain"?RAIN_TRAIN_SPEED_MULTIPLIER:1;
}

/* ================= device & portal ================= */
const IOS_DEVICE=/iPad|iPhone|iPod/.test(navigator.userAgent)||
 (navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
const FRAME_DT_MAX_SECONDS=IOS_DEVICE?.1:.05;
function prefersReducedMotionActive(){
 try{return !!(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches);}catch(_){return false;}
}
const TRAIN_DRIVER_ID="pono";
const PORTAL_EDIT_ENABLED=false;
const PORTAL_TUNING_KEY="pono_nazonazo_portal_tuning_v1";
const PORTAL_POINT_MIN=-120,PORTAL_POINT_MAX=220;
const PORTAL_DEFAULTS={
 schemaVersion:1,
 gateScale:1,
 inLeftVh:.3,
 outRightVh:.88,
 coreSideVw:100,
 entryStopOffsetVw:28,
 swapOffsetVw:30,
 pauseMs:560,
 inMask:[[14,37],[35,37],[35,49],[26,49],[26,83],[42,83],[42,98],[13,98],[13,49],[14,49]],
 outMask:[[54,42],[65,42],[65,97],[54,97]]
};
let portalTuning=clonePortalTuning(PORTAL_DEFAULTS),portalEditor=null,tunnelInteriorMode=false;
if(IOS_DEVICE)document.body.classList.add("ios-device");

function cssXFromVw(vw){
 const px=(window.innerWidth||844)*vw/100;
 return (IOS_DEVICE?Math.round(px):Number(px.toFixed(2)))+"px";
}
function cssYFromVh(vh){
 const px=(window.innerHeight||390)*vh/100;
 return (IOS_DEVICE?Math.round(px):Number(px.toFixed(2)))+"px";
}

function setDriverForStage(){
 document.body.dataset.driver=TRAIN_DRIVER_ID;
}
function setDriverMood(mood){
 document.body.dataset.driverMood=mood||"happy";
}

/* ================= dom ================= */
const $=id=>document.getElementById(id);
const world=$("world"),veh=$("veh"),horizon=$("horizon"),midT=$("midT"),groundT=$("groundT"),fgT=$("fgT"),seaFishLayer=$("seaFishLayer"),seaHabitatLayer=$("seaHabitatLayer"),smokeLayer=$("smokeLayer"),townHorizonLoop=$("townHorizonLoop"),townMidLoop=$("townMidLoop"),futureHorizonLoop=$("futureHorizonLoop"),futureMidLoop=$("futureMidLoop"),futureForegroundLoop=$("futureForegroundLoop"),spaceHorizonLoop=$("spaceHorizonLoop"),spaceForegroundLoop=$("spaceForegroundLoop"),jungleHabitatBack=$("jungleHabitatBack");
const vehicleSteerShell=$("vehicleSteerShell"),seaSteerSurface=$("seaSteerSurface"),spaceSteerSurface=$("spaceSteerSurface"),seaAnswerLayer=$("seaAnswerLayer"),seaBossLayer=$("seaBossLayer"),seaRescueMessage=$("seaRescueMessage"),seaArenaShade=$("seaArenaShade"),seaRoundCountdown=$("seaRoundCountdown"),seaQuizGuide=$("seaQuizGuide"),seaSteerHint=$("seaSteerHint"),spaceSteerHint=$("spaceSteerHint");
const futureCapsuleLayer=$("futureCapsuleLayer"),spaceGalaxyLayer=$("spaceGalaxyLayer");
const seaCompanionLayer=$("seaCompanionLayer"),seaShotLayer=$("seaShotLayer"),seaFireButton=$("seaFireButton");
const jungleAnimalLayers={far:$("jungleAnimalsFar"),mid:$("jungleAnimalsMid"),near:$("jungleAnimalsNear")};
const jungleFlightLayers={bird:$("jungleBirdFlightLayer"),butterfly:$("jungleButterflyFlightLayer")};
const skyA=$("skyA"),skyB=$("skyB"),carsEl=$("cars"),carBadge=$("carBadge"),helpBadge=$("helpBadge"),helpBtn=$("helpBtn"),settingsBtn=$("settingsBtn"),settingsDropdown=$("settingsDropdown"),mapMenuBtn=$("mapMenuBtn"),returnHomeLink=$("returnHomeLink"),gameSettings=$("gameSettings");
const quiz=$("quiz"),qText=$("qText"),hintText=$("hintText"),choicesEl=$("choices");
const dotsEl=$("dots"),stamp=$("stamp"),weatherNotice=$("weatherNotice"),scoreCurrentPill=$("scoreCurrentPill"),scoreHudValue=$("scoreHudValue"),highScorePill=$("highScorePill"),highScoreValue=$("highScoreValue");
const tunnelFriendGame=$("tunnelFriendGame"),tunnelFriendGuide=$("tunnelFriendGuide"),tunnelFriendCounter=$("tunnelFriendCounter"),tunnelFriendLayer=$("tunnelFriendLayer"),tunnelFriendResult=$("tunnelFriendResult");
const tunnelStageScore=$("tunnelStageScore"),tunnelJourneyScore=$("tunnelJourneyScore"),tunnelResultStage=$("tunnelResultStage"),tunnelResultBreakdown=$("tunnelResultBreakdown"),tunnelResultTotal=$("tunnelResultTotal");
const portalMaskLayer=$("portalMaskLayer"),portalEditOverlay=$("portalEditOverlay");
const portalOccIn=portalMaskLayer&&portalMaskLayer.querySelector(".portal-occluder-in");
const portalOccOut=portalMaskLayer&&portalMaskLayer.querySelector(".portal-occluder-out");
const rainLayerElements={far:$("rainFar"),mid:$("rainMid"),near:$("rainNear")};
const spaceStarLayers={far:$("spaceStarFar"),mid:$("spaceStarMid"),near:$("spaceStarNear")};
let seaFishSprites=[];
let seaHabitatSprites=[];
let jungleAnimalSprites=[];
let jungleFlightSprites=[];
const jungleFlightBags={bird:[],butterfly:[]};
const jungleFlightLast={bird:"",butterfly:""};
let lastJungleAnimalRenderKey="";
let lastJungleFlightRenderAt=0;
let spaceStarSprites=[];
let lastWheelPeriod=0;
let weatherNoticeTimer=0;
let stampFeedbackTimer=0;

function hideWeatherNotice(){
 clearTimeout(weatherNoticeTimer);weatherNoticeTimer=0;
 if(!weatherNotice)return;
 weatherNotice.hidden=true;weatherNotice.replaceChildren();
}
function showRainNotice(){
 if(!weatherNotice)return;
 clearTimeout(weatherNoticeTimer);
 weatherNotice.replaceChildren();weatherNotice.hidden=false;
 requestAnimationFrame(()=>{
  if(weatherNotice.hidden)return;
  const slow=document.createElement("span");illustratedText(slow,"umbrella","あめだ！ ゆっくり はしるよ","weather-art");
  const benefit=document.createElement("span");benefit.className="weather-benefit";
  illustratedText(benefit,"star","めずらしい ともだちに あえるかも","weather-art");
  weatherNotice.replaceChildren(slow,benefit);
 });
 weatherNoticeTimer=setTimeout(hideWeatherNotice,3600);
}
function setWeatherPresentation(next,options){
 const weather=next==="rain"?"rain":"clear";
 currentStageWeather=weather;
 document.body.classList.remove("weather-rain","weather-clear");
 document.body.classList.add("weather-"+weather);
 document.body.dataset.weather=weather;
 if(weather==="rain"){
  if(options&&options.announce&&!rainNoticeShownForJourney){rainNoticeShownForJourney=true;showRainNotice();}
 }else hideWeatherNotice();
 return weather;
}

/* ================= weather particles ================= */
const RAIN_PARTICLE_PROFILES=[
 {depth:"far",base:30,max:48,iosMax:34,seed:0x11f4a7c3,length:[8,18],width:[.55,.9],duration:[1.55,2.25],opacity:[.14,.3],drift:[-11,-6],angle:[5,9]},
 {depth:"mid",base:22,max:36,iosMax:25,seed:0x65bd1e37,length:[18,34],width:[.8,1.35],duration:[.95,1.48],opacity:[.26,.48],drift:[-18,-10],angle:[8,14]},
 {depth:"near",base:14,max:24,iosMax:15,seed:0xa7c3e91d,length:[38,72],width:[1.3,2.2],duration:[.58,.98],opacity:[.38,.64],drift:[-28,-17],angle:[12,19]}
];
function createRainParticleSeed(){
 try{
  const values=new Uint32Array(1);
  if(window.crypto&&typeof window.crypto.getRandomValues==="function"){
   window.crypto.getRandomValues(values);
   if(values[0])return values[0];
  }
 }catch(_){}
 return ((Date.now()^(Math.floor((performance.now?performance.now():0)*1000)))>>>0)||0x51f15e;
}
function makeRainRandom(seed){
 let value=seed>>>0;
 return function(){
  value=(value+0x6d2b79f5)>>>0;
  let mixed=value;
  mixed=Math.imul(mixed^(mixed>>>15),mixed|1);
  mixed^=mixed+Math.imul(mixed^(mixed>>>7),mixed|61);
  return ((mixed^(mixed>>>14))>>>0)/4294967296;
 };
}
function rainRange(random,range){return range[0]+(range[1]-range[0])*random();}
const RAIN_PARTICLE_SEED=createRainParticleSeed();
let rainParticleCountKey="",rainParticleResizeTimer=0;
function rainParticleActiveCount(profile){
 const viewportWidth=Math.max(320,window.innerWidth||844);
 const viewportHeight=Math.max(280,window.innerHeight||390);
 const scale=Math.max(.82,Math.min(1.6,Math.sqrt((viewportWidth*viewportHeight)/(844*390))));
 const limit=IOS_DEVICE?profile.iosMax:profile.max;
 return Math.min(limit,Math.round(profile.base*scale));
}
function updateRainParticleVisibility(force){
 if(window.__PONO_TIER_LOCKED__)return;
 const counts=RAIN_PARTICLE_PROFILES.map(rainParticleActiveCount);
 const countKey=counts.join(":");
 if(!force&&countKey===rainParticleCountKey)return;
 rainParticleCountKey=countKey;
 RAIN_PARTICLE_PROFILES.forEach((profile,depthIndex)=>{
  const layer=rainLayerElements[profile.depth];
  if(!layer)return;
  const activeCount=counts[depthIndex];
  Array.from(layer.children).forEach((particle,index)=>{particle.hidden=index>=activeCount;});
  layer.dataset.particleCount=String(activeCount);
 });
}
function buildRainParticles(force,seedOverride){
 if(window.__PONO_TIER_LOCKED__){
  Object.values(rainLayerElements).forEach(layer=>{if(layer)layer.replaceChildren();});
  return;
 }
 const baseSeed=Number.isFinite(seedOverride)?seedOverride>>>0:RAIN_PARTICLE_SEED;
 RAIN_PARTICLE_PROFILES.forEach(profile=>{
  const layer=rainLayerElements[profile.depth];
  if(!layer)return;
  const poolSize=IOS_DEVICE?profile.iosMax:profile.max;
  if(force||layer.children.length!==poolSize){
   const random=makeRainRandom((baseSeed^profile.seed)>>>0);
   const fragment=document.createDocumentFragment();
   for(let i=0;i<poolSize;i++){
    const particle=document.createElement("span");
    particle.className="rain-particle";
    particle.dataset.depth=profile.depth;
    particle.dataset.particleIndex=String(i);
    const duration=rainRange(random,profile.duration);
    const xPhase=(((i+1)*.61803398875+random()*.18)%1);
    const timePhase=(((i+1)*.754877666+random()*.2)%1);
    const restPhase=(((i+1)*.41421356237+random()*.2)%1);
    particle.style.setProperty("--rain-left",(xPhase*112-6).toFixed(2)+"%");
    particle.style.setProperty("--rain-rest-x",(restPhase*104-2).toFixed(2)+"%");
    particle.style.setProperty("--rain-rest-y",(random()*94+3).toFixed(2)+"%");
    particle.style.setProperty("--rain-length",rainRange(random,profile.length).toFixed(2)+"px");
    particle.style.setProperty("--rain-width",rainRange(random,profile.width).toFixed(2)+"px");
    particle.style.setProperty("--rain-duration",duration.toFixed(3)+"s");
    particle.style.setProperty("--rain-delay",(-timePhase*duration).toFixed(3)+"s");
    particle.style.setProperty("--rain-opacity",rainRange(random,profile.opacity).toFixed(3));
    particle.style.setProperty("--rain-drift",rainRange(random,profile.drift).toFixed(2)+"vw");
    particle.style.setProperty("--rain-angle",rainRange(random,profile.angle).toFixed(2)+"deg");
    fragment.appendChild(particle);
   }
   layer.replaceChildren(fragment);
  }
 });
 rainParticleCountKey="";
 updateRainParticleVisibility(true);
}
function scheduleRainParticleRebuild(){
 clearTimeout(rainParticleResizeTimer);
 rainParticleResizeTimer=setTimeout(()=>updateRainParticleVisibility(false),120);
}

/* ================= audio & speech ================= */
let ac=null;
let acStatechangeAttached=false;
// running 遷移を待つ tone キュー。suspended/interrupted の間にスケジュールした音が silent-drop するのを防ぐ。
// 古い予約が interrupted 復帰後に遅延爆発するのを避けるため TTL でカリング。
let pendingTones=[];
const PENDING_TONE_MAX=32;
const PENDING_TONE_TTL_MS=800;
let trainNoiseBuffer=null,nextTrainSeAt=0,trainSeStep=0;
function _nowMs(){
 return (typeof performance!=="undefined"&&performance.now)?performance.now():Date.now();
}
function attachAcStatechange(){
 if(!ac||acStatechangeAttached)return;
 try{
  ac.addEventListener("statechange",()=>{
   if(ac&&ac.state==="running"){
    try{primeAC();}catch(_){}
    flushPendingTones();
   }
  });
  acStatechangeAttached=true;
 }catch(_){}
}
function safeSuspend(){
 // ac.suspend() は Promise を返し closed/interrupted 遷移レースで reject し得るので unhandled rejection を必ず捕捉
 try{
  if(!ac||ac.state!=="running")return;
  const p=ac.suspend();
  if(p&&p.catch)p.catch(()=>{});
 }catch(_){}
}
// iOS Safari は state に 'interrupted'/'closed' も出るので両方対応。closed なら作り直し。
// resume の Promise が settle した時点で primeAC + pendingTones の flush を行い、非 gesture 経路の silent-drop を極小化する。
function ensureAC(){
 try{
  if(!ac||ac.state==="closed"){
   const A=window.AudioContext||window.webkitAudioContext;
   if(!A)return null;
   try{ac=new A();acStatechangeAttached=false;}catch(e){ac=null;return null;}
  }
  attachAcStatechange();
  if(ac&&(ac.state==="suspended"||ac.state==="interrupted")){
   let p=null;
   try{p=ac.resume();}catch(_){p=null;}
   if(p&&p.then){
    p.then(()=>{
     if(ac&&ac.state==="running"){
      try{primeAC();}catch(_){}
      flushPendingTones();
     }
    },()=>{/* interrupted は reject し得る。statechange listener 側で running 遷移を拾う */});
   }
   return p||null;
  }
 }catch(e){}
 return null;
}
function primeAC(){
 // iOS で resume 直後の最初の oscillator が silent drop する対策の 1ms 0-gain unlock
 try{if(!ac||ac.state!=="running")return;
  const o=ac.createOscillator(),g=ac.createGain();
  g.gain.value=0.0001;o.connect(g).connect(ac.destination);
  o.start();o.stop(ac.currentTime+0.01);
 }catch(e){}
}
function scheduleTone(f,t0,dur,type,vol){
 try{
  if(!ac||ac.state!=="running")return;
  const o=ac.createOscillator(),g=ac.createGain();
  o.type=type||"sine";o.frequency.setValueAtTime(f,ac.currentTime+t0);
  g.gain.setValueAtTime(.0001,ac.currentTime+t0);
  g.gain.linearRampToValueAtTime(vol||.18,ac.currentTime+t0+.02);
  g.gain.exponentialRampToValueAtTime(.0001,ac.currentTime+t0+dur);
  o.connect(g).connect(ac.destination);o.start(ac.currentTime+t0);o.stop(ac.currentTime+t0+dur+.05);
 }catch(e){}
}
function getTrainNoiseBuffer(){
 if(!ac)return null;
 if(trainNoiseBuffer&&trainNoiseBuffer.sampleRate===ac.sampleRate)return trainNoiseBuffer;
 try{
  const len=Math.max(1,Math.floor(ac.sampleRate*.16));
  const buf=ac.createBuffer(1,len,ac.sampleRate);
  const data=buf.getChannelData(0);
  for(let i=0;i<len;i++)data[i]=(Math.random()*2-1)*(1-i/len);
  trainNoiseBuffer=buf;
  return buf;
 }catch(_){return null;}
}
function scheduleTrainChuff(t0,vol,tunnel){
 try{
  if(!ac||ac.state!=="running")return;
  const buf=getTrainNoiseBuffer();
  if(buf){
   const src=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();
   src.buffer=buf;
   f.type="bandpass";f.frequency.setValueAtTime(tunnel?430:560,ac.currentTime+t0);f.Q.setValueAtTime(.72,ac.currentTime+t0);
   g.gain.setValueAtTime(.0001,ac.currentTime+t0);
   g.gain.linearRampToValueAtTime(vol,ac.currentTime+t0+.018);
   g.gain.exponentialRampToValueAtTime(.0001,ac.currentTime+t0+.14);
   src.connect(f).connect(g).connect(ac.destination);
   src.start(ac.currentTime+t0);src.stop(ac.currentTime+t0+.17);
  }
  tone(tunnel?86:96,t0,.07,"triangle",vol*.42);
  if(trainSeStep%2===0)tone(520,t0+.028,.028,"square",vol*.22);
 }catch(_){}
}
function flushPendingTones(){
 if(!pendingTones.length)return;
 const now=_nowMs();
 const q=pendingTones;pendingTones=[];
 for(let i=0;i<q.length;i++){
  const t=q[i];
  // TTL 越えの古い予約は破棄 (interrupted 復帰後に遅延して一斉爆発するのを防ぐ)
  if(now-t.at>PENDING_TONE_TTL_MS)continue;
  scheduleTone(t.f,t.t0,t.dur,t.type,t.vol);
 }
}
function tone(f,t0,dur,type,vol){
 try{
  if(!ac||ac.state==="closed")return;
  if(ac.state!=="running"){
   // resume を投げつつ pending queue に積む。running 遷移で statechange listener が flush する。
   let p=null;try{p=ac.resume();}catch(_){p=null;}
   if(p&&p.catch)p.catch(()=>{});
   attachAcStatechange();
   if(pendingTones.length<PENDING_TONE_MAX){
    pendingTones.push({f:f,t0:t0,dur:dur,type:type,vol:vol,at:_nowMs()});
   }
   return;
  }
  scheduleTone(f,t0,dur,type,vol);
 }catch(e){}
}
const sndOK=()=>{tone(660,0,.15,"triangle");tone(880,.13,.2,"triangle");tone(1320,.28,.3,"triangle")};
const sndNG=()=>{tone(220,0,.25,"square",.08);tone(180,.18,.3,"square",.08)};
const sndOpen=()=>{tone(400,0,.3,"sine",.1);tone(600,.15,.3,"sine",.1)};
const sndFan=()=>{[523,659,784,1047].forEach((f,i)=>tone(f,i*.16,.4,"triangle"))};
const sndNew=()=>{[784,988,1175,1568].forEach((f,i)=>tone(f,i*.1,.25,"sine",.14))};
function sndGo(){ensureAC();const v=STAGES[stg].veh;
 if(v==="train"){tone(520,0,.2,"square",.12);tone(520,.25,.35,"square",.12);}
 else if(v==="sub"){tone(300,0,.5,"sine",.12);tone(360,.4,.5,"sine",.12);}
 else{tone(120,0,.7,"sawtooth",.1);tone(90,.1,.8,"sawtooth",.08);}}
function tickTrainSe(now){
 if(!playing||!driving||!document.body.classList.contains("v-train")||!veh.classList.contains("go")){
  nextTrainSeAt=now+120;
  return;
 }
 if(!ac||ac.state!=="running")return;
 if(now<nextTrainSeAt)return;
 const tunnel=document.body.classList.contains("tunnel-interior")||veh.classList.contains("inTun");
 const rawPeriod=parseFloat(veh.style.getPropertyValue("--wheel-period"))||WHEEL_FAST_PERIOD;
 const interval=clamp(rawPeriod*430,400,680)/FAST;
 scheduleTrainChuff(0,tunnel?.13:.16,tunnel);
 trainSeStep++;
 nextTrainSeAt=now+interval;
}
function announce(t){const live=$("liveRegion");if(live)live.textContent=t||"";}
function speak(t){announce(t);}
function showHint(){
 if(!cur)return;
 if(isNumberCargoQuestion()){showNumberCargoHint(false);return;}
 illustratedText(hintText,"hint","ヒント： "+cur.h,"hint-inline-art");
 announce("ヒント。"+cur.h);
}

/* ================= helpers ================= */
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const rnd=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const pick=a=>a[rnd(0,a.length-1)];
function stationHelperFor(i){
 return STATION_HELPERS[(loop*QN+stg*2+i)%STATION_HELPERS.length];
}
function addStationHelpersToQuestions(){
 if(!STAGES[stg]||STAGES[stg].id!=="town")return;
 qList=qList.map((q,i)=>Object.assign({},q,{helper:stationHelperFor(i)}));
}
function bindTap(el,fn){
 let down=false,sx=0,sy=0;
 el.addEventListener("pointerdown",ev=>{
  down=true;sx=ev.clientX;sy=ev.clientY;
  // AC unlock は fn 実行の可否に関わらず必ず走らせる (ドリフトタップでも音を戻す)
  ensureAC();
  try{el.setPointerCapture(ev.pointerId);}catch(_){}
 });
 el.addEventListener("pointerup",ev=>{
  if(!down)return;
  down=false;
  const dx=ev.clientX-sx,dy=ev.clientY-sy;
  // 幼児タップは指ずれが大きいので閾値 36px
  if(Math.hypot(dx,dy)<=36)fn(ev);
 });
 el.addEventListener("pointercancel",()=>{down=false;});
 el.addEventListener("click",ev=>{
  if(ev.detail===0){
   // AT/キーボード合成 click では pointerdown が出ないので ensureAC を明示的に走らせる
   ensureAC();
   fn(ev);
  }
  else ev.preventDefault();
 });
}

/* ================= game settings menu ================= */
let settingsOutsideClickUntil=0;
let settingsOutsideClickTarget=null;
function gameSettingsMenuItems(){
 return [mapMenuBtn,returnHomeLink].filter(item=>item&&item.isConnected);
}
function gameSettingsMenuIsOpen(){
 return !!(settingsDropdown&&!settingsDropdown.hidden);
}
function focusGameSettingsItem(item){
 if(!item)return;
 try{item.focus({preventScroll:true});}catch(_){item.focus();}
}
function setGameSettingsOpen(open,options){
 if(!settingsBtn||!settingsDropdown)return;
 const next=!!open,opts=options||{};
 settingsDropdown.hidden=!next;
 settingsDropdown.setAttribute("aria-hidden",next?"false":"true");
 settingsBtn.setAttribute("aria-expanded",next?"true":"false");
 document.body.classList.toggle("game-settings-open",next);
 gameSettingsMenuItems().forEach(item=>{item.tabIndex=next?0:-1;});
 if(next&&opts.focusFirst){
  requestAnimationFrame(()=>{if(gameSettingsMenuIsOpen())focusGameSettingsItem(gameSettingsMenuItems()[0]);});
 }else if(!next&&opts.restoreFocus){
  focusGameSettingsItem(settingsBtn);
 }
}
function closeGameSettings(options){
 setGameSettingsOpen(false,options);
}
function initGameSettingsMenu(){
 if(!gameSettings||!settingsBtn||!settingsDropdown||!mapMenuBtn||!returnHomeLink||gameSettings.dataset.ready==="1")return;
 gameSettings.dataset.ready="1";
 setGameSettingsOpen(false);
 bindTap(settingsBtn,event=>{
  const opening=!gameSettingsMenuIsOpen();
  setGameSettingsOpen(opening,{focusFirst:opening&&!event.pointerType,restoreFocus:!opening});
 });
 settingsBtn.addEventListener("keydown",event=>{
  if(event.key==="Escape"&&gameSettingsMenuIsOpen()){
   event.preventDefault();event.stopPropagation();closeGameSettings({restoreFocus:true});return;
  }
  if(gameSettingsMenuIsOpen()&&(event.key==="ArrowDown"||event.key==="ArrowUp")){
   event.preventDefault();event.stopPropagation();
   const items=gameSettingsMenuItems();focusGameSettingsItem(event.key==="ArrowUp"?items[items.length-1]:items[0]);return;
  }
  if(event.key==="Enter"||event.key===" ")event.stopPropagation();
 });
 settingsDropdown.addEventListener("keydown",event=>{
  event.stopPropagation();
  if(event.key==="Escape"){
   event.preventDefault();closeGameSettings({restoreFocus:true});return;
  }
  const items=gameSettingsMenuItems();
  if(!items.length)return;
  const current=Math.max(0,items.indexOf(document.activeElement));
  let next=-1;
  if(event.key==="ArrowDown")next=(current+1)%items.length;
  else if(event.key==="ArrowUp")next=(current-1+items.length)%items.length;
  else if(event.key==="Home")next=0;
  else if(event.key==="End")next=items.length-1;
  if(next>=0){event.preventDefault();focusGameSettingsItem(items[next]);}
 });
 gameSettings.addEventListener("focusout",()=>{
  setTimeout(()=>{if(gameSettingsMenuIsOpen()&&!gameSettings.contains(document.activeElement))closeGameSettings();},0);
 });
 document.addEventListener("pointerdown",event=>{
  if(!gameSettingsMenuIsOpen()||gameSettings.contains(event.target))return;
  settingsOutsideClickUntil=Date.now()+500;
  settingsOutsideClickTarget=event.target;
  event.preventDefault();event.stopImmediatePropagation();closeGameSettings();
 },true);
 document.addEventListener("click",event=>{
  if(event.detail===0||Date.now()>settingsOutsideClickUntil||event.target!==settingsOutsideClickTarget)return;
  settingsOutsideClickTarget=null;
  event.preventDefault();event.stopImmediatePropagation();
 },true);
 returnHomeLink.addEventListener("click",()=>{closeGameSettings();});
}
function clonePortalTuning(src){
 return JSON.parse(JSON.stringify(src));
}
function cleanPortalPoints(points,fallback){
 const fb=clonePortalTuning(fallback);
 if(!Array.isArray(points)||points.length<3)return fb;
 const out=[];
 points.slice(0,12).forEach(p=>{
  if(!Array.isArray(p)||p.length<2)return;
  const x=clamp(Number(p[0]),PORTAL_POINT_MIN,PORTAL_POINT_MAX),y=clamp(Number(p[1]),PORTAL_POINT_MIN,PORTAL_POINT_MAX);
  if(Number.isFinite(x)&&Number.isFinite(y))out.push([x,y]);
 });
 return out.length>=3?out:fb;
}
function cleanPortalNumber(value,fallback,min,max){
 const n=Number(value);
 return Number.isFinite(n)?clamp(n,min,max):fallback;
}
function normalizePortalTuning(raw){
 const t=clonePortalTuning(PORTAL_DEFAULTS);
 if(raw&&typeof raw==="object"){
  t.gateScale=cleanPortalNumber(raw.gateScale,t.gateScale,.55,1.6);
  t.inLeftVh=cleanPortalNumber(raw.inLeftVh,t.inLeftVh,-1.2,2.2);
  t.outRightVh=cleanPortalNumber(raw.outRightVh,t.outRightVh,-1.2,2.2);
  t.coreSideVw=cleanPortalNumber(raw.coreSideVw,t.coreSideVw,16,150);
  t.entryStopOffsetVw=cleanPortalNumber(raw.entryStopOffsetVw,t.entryStopOffsetVw,0,90);
  t.swapOffsetVw=cleanPortalNumber(raw.swapOffsetVw,t.swapOffsetVw,0,100);
  t.pauseMs=cleanPortalNumber(raw.pauseMs,t.pauseMs,120,1800);
  t.inMask=cleanPortalPoints(raw.inMask,PORTAL_DEFAULTS.inMask);
  t.outMask=cleanPortalPoints(raw.outMask,PORTAL_DEFAULTS.outMask);
 }
 return t;
}
function portalClip(points){
 return "polygon("+points.map(p=>Number(p[0]).toFixed(2)+"% "+Number(p[1]).toFixed(2)+"%").join(",")+")";
}
function applyPortalTuning(){
 const st=document.documentElement.style;
 st.setProperty("--portal-gate-scale",String(portalTuning.gateScale));
 st.setProperty("--portal-in-left-vh",String(portalTuning.inLeftVh));
 st.setProperty("--portal-out-right-vh",String(portalTuning.outRightVh));
 st.setProperty("--portal-core-side-vw",String(portalTuning.coreSideVw));
 st.setProperty("--portal-mask-in",portalClip(portalTuning.inMask));
 st.setProperty("--portal-mask-out",portalClip(portalTuning.outMask));
}
function loadPortalTuning(){
 if(!PORTAL_EDIT_ENABLED){
  portalTuning=clonePortalTuning(PORTAL_DEFAULTS);
  applyPortalTuning();
  return;
 }
 try{
  const raw=localStorage.getItem(PORTAL_TUNING_KEY);
  portalTuning=normalizePortalTuning(raw?JSON.parse(raw):null);
 }catch(_){
  portalTuning=clonePortalTuning(PORTAL_DEFAULTS);
 }
 applyPortalTuning();
}
function savePortalTuning(quiet){
 try{localStorage.setItem(PORTAL_TUNING_KEY,JSON.stringify(portalTuning));}catch(_){}
 if(!quiet)setPortalEditStatus("保存しました");
}
function portalMaskKey(){
 return portalEditor&&portalEditor.mode==="out"?"outMask":"inMask";
}
function activePortalOcc(){
 return portalEditor&&portalEditor.mode==="out"?portalOccOut:portalOccIn;
}
function portalPointText(points){
 return points.map(p=>Math.round(p[0]*10)/10+","+Math.round(p[1]*10)/10).join(" ");
}
function parsePortalPointText(text,fallback){
 const pts=[];
 String(text||"").split(/\s+/).forEach(pair=>{
  if(!pair)return;
  const m=pair.split(",");
  if(m.length<2)return;
  const x=Number(m[0]),y=Number(m[1]);
  if(Number.isFinite(x)&&Number.isFinite(y))pts.push([clamp(x,PORTAL_POINT_MIN,PORTAL_POINT_MAX),clamp(y,PORTAL_POINT_MIN,PORTAL_POINT_MAX)]);
 });
 return cleanPortalPoints(pts,fallback);
}
function placePortalOccluder(gate,occ,mode){
 if(!gate||!occ)return false;
 const scene=$("scene");
 const sr=scene.getBoundingClientRect();
 const r=gate.getBoundingClientRect();
 const visible=r.right>sr.left-24&&r.left<sr.right+24&&r.bottom>sr.top&&r.top<sr.bottom;
 if(!visible){
  occ.style.display="none";
  return false;
 }
 if(mode==="in"&&!document.body.classList.contains("tunnel-enter-run")){
  occ.style.display="none";
  return false;
 }
 occ.classList.remove("wide-portal-mask");
 occ.style.removeProperty("--portal-wide-bg-w");
 occ.style.removeProperty("--portal-wide-bg-h");
 occ.style.removeProperty("--portal-wide-bg-x");
 occ.style.removeProperty("--portal-wide-bg-y");
 occ.style.display="block";
 if(mode==="in"&&document.body.classList.contains("tunnel-enter-run")){
  const maskLeft=clamp(r.left+r.width*.32,sr.left,sr.right);
  const maskTop=clamp(r.top+r.height*.38,sr.top,sr.bottom);
  occ.classList.add("wide-portal-mask");
  occ.style.left=(maskLeft-sr.left)+"px";
  occ.style.top=(maskTop-sr.top)+"px";
  occ.style.width=Math.max(0,sr.right-maskLeft)+"px";
  occ.style.height=Math.max(0,sr.bottom-maskTop)+"px";
  occ.style.setProperty("--portal-wide-bg-w",r.width+"px");
  occ.style.setProperty("--portal-wide-bg-h",r.height+"px");
  occ.style.setProperty("--portal-wide-bg-x",(-(r.width*.32))+"px");
  occ.style.setProperty("--portal-wide-bg-y",(-(r.height*.38))+"px");
  return true;
 }
 occ.style.left=(r.left-sr.left)+"px";
 occ.style.top=(r.top-sr.top)+"px";
 occ.style.width=r.width+"px";
 occ.style.height=r.height+"px";
 return true;
}
function renderPortalMasks(cv){
 if(!portalMaskLayer)return;
 if(!cv){
  portalMaskLayer.style.display="none";
  if(portalEditOverlay)portalEditOverlay.innerHTML="";
  return;
 }
 const anyIn=placePortalOccluder(cv.querySelector(".cover-gate-in"),portalOccIn,"in");
 const anyOut=placePortalOccluder(cv.querySelector(".cover-gate-out"),portalOccOut,"out");
 portalMaskLayer.style.display=(anyIn||anyOut)?"block":"none";
 if(PORTAL_EDIT_ENABLED)drawPortalEditorOverlay();
 else if(portalEditOverlay)portalEditOverlay.innerHTML="";
}
function setPortalEditStatus(txt){
 if(!portalEditor||!portalEditor.panel)return;
 const s=portalEditor.panel.querySelector(".status");
 if(s)s.textContent=txt||"";
}
function syncPortalEditorPanel(){
 if(!portalEditor||!portalEditor.panel)return;
 const panel=portalEditor.panel;
 panel.querySelectorAll("[data-portal-mode]").forEach(b=>b.classList.toggle("active",b.dataset.portalMode===portalEditor.mode));
 panel.querySelectorAll("[data-portal-key]").forEach(input=>{
  const key=input.dataset.portalKey;
  input.value=String(portalTuning[key]);
 });
 const text=panel.querySelector("#portalMaskText");
 if(text)text.value=portalPointText(portalTuning[portalMaskKey()]);
}
function portalRange(label,key,min,max,step){
 return '<label>'+label+'</label><div class="row"><input type="range" data-portal-key="'+key+'" min="'+min+'" max="'+max+'" step="'+step+'"><input type="number" data-portal-key="'+key+'" min="'+min+'" max="'+max+'" step="'+step+'"></div>';
}
function initPortalEditor(){
 if(!PORTAL_EDIT_ENABLED)return;
 document.body.classList.add("portal-edit");
 const panel=document.createElement("div");
 panel.id="portalEditPanel";
 panel.innerHTML=
  '<h2>トンネル入口/出口 調整</h2>'+
  '<div class="row"><button type="button" data-portal-mode="in">入口</button><button type="button" data-portal-mode="out">出口</button><span class="status"></span></div>'+
  portalRange("ゲートの大きさ","gateScale",".55","1.6",".01")+
  portalRange("入口の横位置 (vh)","inLeftVh","-1.2","2.2",".01")+
  portalRange("出口の横位置 (vh)","outRightVh","-1.2","2.2",".01")+
  portalRange("中トンネルの余白 (vw)","coreSideVw","16","150","1")+
  portalRange("入口で止まる位置 (vw)","entryStopOffsetVw","0","90","1")+
  portalRange("背景を切り替える位置 (vw)","swapOffsetVw","0","100","1")+
  portalRange("入口停止時間 (ms)","pauseMs","120","1800","20")+
  '<label>選択中マスクの点 (x,y %)</label><textarea id="portalMaskText" spellcheck="false"></textarea>'+
  '<div class="row"><button type="button" id="portalNudgeLeft">←</button><button type="button" id="portalNudgeUp">↑</button><button type="button" id="portalNudgeDown">↓</button><button type="button" id="portalNudgeRight">→</button><button type="button" id="portalAddPoint">点を追加</button><button type="button" id="portalRemovePoint">点を削除</button><button type="button" id="portalResetMask">マスクを戻す</button></div>'+
  '<div class="row"><button type="button" id="portalResume">トンネルへ進む</button><button type="button" id="portalCopyJson">JSONコピー</button><button type="button" id="portalResetAll">全部リセット</button></div>'+
  '<div class="note">ピンクの面をドラッグするとマスク全体、点をドラッグすると形を調整できます。点は画像の外側にも動かせます。値はこの端末の localStorage に保存されます。</div>';
 $("app").appendChild(panel);
 portalEditor={mode:"in",selectedIdx:0,dragIdx:null,dragMode:null,dragStartX:0,dragStartY:0,dragStartPoints:null,panel};
 panel.querySelectorAll("[data-portal-mode]").forEach(b=>b.addEventListener("click",()=>{
  portalEditor.mode=b.dataset.portalMode;
  portalEditor.selectedIdx=0;
  syncPortalEditorPanel();
  drawPortalEditorOverlay();
 }));
 panel.querySelectorAll("[data-portal-key]").forEach(input=>input.addEventListener("input",()=>{
  const key=input.dataset.portalKey;
  portalTuning[key]=Number(input.value);
  portalTuning=normalizePortalTuning(portalTuning);
  applyPortalTuning();
  savePortalTuning(true);
  syncPortalEditorPanel();
 }));
 const txt=panel.querySelector("#portalMaskText");
 txt.addEventListener("input",()=>{
  const key=portalMaskKey();
  portalTuning[key]=parsePortalPointText(txt.value,PORTAL_DEFAULTS[key]);
  applyPortalTuning();
  savePortalTuning(true);
  drawPortalEditorOverlay();
 });
 panel.querySelector("#portalNudgeLeft").addEventListener("click",()=>translatePortalMask(-6,0));
 panel.querySelector("#portalNudgeRight").addEventListener("click",()=>translatePortalMask(6,0));
 panel.querySelector("#portalNudgeUp").addEventListener("click",()=>translatePortalMask(0,-6));
 panel.querySelector("#portalNudgeDown").addEventListener("click",()=>translatePortalMask(0,6));
 panel.querySelector("#portalAddPoint").addEventListener("click",()=>{
  const key=portalMaskKey(),pts=portalTuning[key];
  const idx=clamp(portalEditor.selectedIdx||0,0,pts.length-1);
  pts.splice(idx+1,0,[50,50]);
  portalEditor.selectedIdx=idx+1;
  applyPortalTuning();savePortalTuning();syncPortalEditorPanel();drawPortalEditorOverlay();
 });
 panel.querySelector("#portalRemovePoint").addEventListener("click",()=>{
  const key=portalMaskKey(),pts=portalTuning[key];
  if(pts.length<=3){setPortalEditStatus("3点は残します");return;}
  pts.splice(clamp(portalEditor.selectedIdx||0,0,pts.length-1),1);
  portalEditor.selectedIdx=clamp(portalEditor.selectedIdx||0,0,pts.length-1);
  applyPortalTuning();savePortalTuning();syncPortalEditorPanel();drawPortalEditorOverlay();
 });
 panel.querySelector("#portalResetMask").addEventListener("click",()=>{
  const key=portalMaskKey();
  portalTuning[key]=clonePortalTuning(PORTAL_DEFAULTS[key]);
  portalEditor.selectedIdx=0;
  applyPortalTuning();savePortalTuning();syncPortalEditorPanel();drawPortalEditorOverlay();
 });
 panel.querySelector("#portalResetAll").addEventListener("click",()=>{
  portalTuning=clonePortalTuning(PORTAL_DEFAULTS);
  portalEditor.selectedIdx=0;
  applyPortalTuning();savePortalTuning();syncPortalEditorPanel();drawPortalEditorOverlay();
 });
 panel.querySelector("#portalResume").addEventListener("click",()=>{
 ensureAC();
 if(!transitCover||driving||pending)return;
 portalEditHolding=false;
  showTunnelRunIn();
 });
 panel.querySelector("#portalCopyJson").addEventListener("click",()=>{
  const text=JSON.stringify(portalTuning,null,2);
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).then(()=>setPortalEditStatus("コピーしました"),()=>setPortalEditStatus(text));
  else setPortalEditStatus(text);
 });
 window.addEventListener("pointermove",movePortalPoint);
 window.addEventListener("pointerup",stopPortalPoint);
 window.addEventListener("pointercancel",stopPortalPoint);
 syncPortalEditorPanel();
}
function drawPortalEditorOverlay(){
 if(!PORTAL_EDIT_ENABLED||!portalEditor||!portalEditOverlay)return;
 const occ=activePortalOcc();
 if(!occ||occ.style.display==="none"){
  portalEditOverlay.innerHTML="";
  return;
 }
 const r=occ.getBoundingClientRect();
 if(r.width<4||r.height<4){
  portalEditOverlay.innerHTML="";
  return;
 }
 portalEditOverlay.setAttribute("viewBox","0 0 "+window.innerWidth+" "+window.innerHeight);
 const pts=portalTuning[portalMaskKey()];
 const pointString=pts.map(p=>(r.left+r.width*p[0]/100)+","+(r.top+r.height*p[1]/100)).join(" ");
 let html='<polygon class="portal-edit-poly" points="'+pointString+'"></polygon>';
 pts.forEach((p,i)=>{
  html+='<circle class="portal-edit-point" data-idx="'+i+'" cx="'+(r.left+r.width*p[0]/100)+'" cy="'+(r.top+r.height*p[1]/100)+'" r="'+(i===portalEditor.selectedIdx?8:6)+'"></circle>';
 });
 portalEditOverlay.innerHTML=html;
 const poly=portalEditOverlay.querySelector(".portal-edit-poly");
 if(poly)poly.addEventListener("pointerdown",startPortalShapeDrag);
 portalEditOverlay.querySelectorAll(".portal-edit-point").forEach(c=>c.addEventListener("pointerdown",startPortalPointDrag));
}
function startPortalPointDrag(ev){
 if(!portalEditor)return;
 portalEditor.dragIdx=Number(ev.currentTarget.dataset.idx);
 portalEditor.dragMode="point";
 portalEditor.selectedIdx=portalEditor.dragIdx;
 ev.preventDefault();
 drawPortalEditorOverlay();
}
function startPortalShapeDrag(ev){
 if(!portalEditor)return;
 portalEditor.dragIdx=null;
 portalEditor.dragMode="shape";
 portalEditor.dragStartX=ev.clientX;
 portalEditor.dragStartY=ev.clientY;
 portalEditor.dragStartPoints=clonePortalTuning(portalTuning[portalMaskKey()]);
 ev.preventDefault();
}
function translatePortalMask(dx,dy){
 if(!portalEditor)return;
 const key=portalMaskKey();
 portalTuning[key]=portalTuning[key].map(p=>[
  clamp(p[0]+dx,PORTAL_POINT_MIN,PORTAL_POINT_MAX),
  clamp(p[1]+dy,PORTAL_POINT_MIN,PORTAL_POINT_MAX)
 ]);
 applyPortalTuning();savePortalTuning();syncPortalEditorPanel();drawPortalEditorOverlay();
}
function movePortalPoint(ev){
 if(!portalEditor||!portalEditor.dragMode)return;
 const occ=activePortalOcc();
 if(!occ)return;
 const r=occ.getBoundingClientRect();
 const pts=portalTuning[portalMaskKey()];
 if(portalEditor.dragMode==="shape"&&portalEditor.dragStartPoints){
  const dx=(ev.clientX-portalEditor.dragStartX)/r.width*100;
  const dy=(ev.clientY-portalEditor.dragStartY)/r.height*100;
  portalTuning[portalMaskKey()]=portalEditor.dragStartPoints.map(p=>[
   clamp(p[0]+dx,PORTAL_POINT_MIN,PORTAL_POINT_MAX),
   clamp(p[1]+dy,PORTAL_POINT_MIN,PORTAL_POINT_MAX)
  ]);
  applyPortalTuning();
  savePortalTuning(true);
  syncPortalEditorPanel();
  drawPortalEditorOverlay();
  return;
 }
 const x=clamp((ev.clientX-r.left)/r.width*100,PORTAL_POINT_MIN,PORTAL_POINT_MAX);
 const y=clamp((ev.clientY-r.top)/r.height*100,PORTAL_POINT_MIN,PORTAL_POINT_MAX);
 if(portalEditor.dragIdx!==null&&pts[portalEditor.dragIdx]){
  pts[portalEditor.dragIdx]=[x,y];
  applyPortalTuning();
  savePortalTuning(true);
  syncPortalEditorPanel();
  drawPortalEditorOverlay();
 }
}
function stopPortalPoint(){
 if(!portalEditor||!portalEditor.dragMode)return;
 portalEditor.dragIdx=null;
 portalEditor.dragMode=null;
 portalEditor.dragStartPoints=null;
 savePortalTuning();
}
function saveGame(){
 if(typeof nazonazoAdminPreviewMode!=="undefined"&&nazonazoAdminPreviewMode)return;
 try{
  const payload={
   schemaVersion:1,
   lastLevel:level,
   unlockedLoop,
   highScore,
   bestStarsByStage,
   collectedFriends:[...zkReg]
  };
  localStorage.setItem(SAVE_KEY,JSON.stringify(payload));
 }catch(_){}
}
function loadGame(){
 try{
  const raw=localStorage.getItem(SAVE_KEY);
  if(!raw)return;
  const data=JSON.parse(raw);
  if(!data||data.schemaVersion!==1)return;
  level=clamp(Number(data.lastLevel)||0,0,2);
  unlockedLoop=clamp(Number(data.unlockedLoop)||0,0,1);
  highScore=Math.max(0,Math.round(Number(data.highScore)||0));
  bestStarsByStage=(data.bestStarsByStage&&typeof data.bestStarsByStage==="object")?data.bestStarsByStage:{};
  if(Array.isArray(data.collectedFriends)){
   data.collectedFriends.forEach(k=>{if(typeof k==="string"&&k.includes("|"))zkReg.add(k);});
  }
 }catch(_){}
}
function applyLevelSelection(){
 document.querySelectorAll("#lvSel .selBtn").forEach(b=>{
  b.classList.toggle("sel",+b.dataset.l===level);
 });
}

/* ================= question generators ================= */
function genCount(){
 const max=[3,5,9][level];
 const [e,name]=pick(CNT_EMO);
 const n=rnd(1,max);
 const wrong=new Set();
 while(wrong.size<2){const w=n+(Math.random()<.5?-1:1)*rnd(1,2);if(w>=1&&w<=10&&w!==n)wrong.add(w);}
 const [w1,w2]=[...wrong];
 return {q:e.repeat(n)+"　"+name+"は いくつ かな？",s:name+"は、いくつかな？ ゆびで かぞえてね",
  a:[String(n),KANJI_NUM[n-1]],d:[[String(w1),KANJI_NUM[w1-1]],[String(w2),KANJI_NUM[w2-1]]],
  h:"ゆびで ひとつずつ かぞえてみよう",pe:[e,name]};
}
function genNext(){
 const max=[3,5,9][level];
 const n=rnd(1,max-1);
 const wrong=new Set();
 while(wrong.size<2){const w=n+1+(Math.random()<.5?-1:1)*rnd(1,2);if(w>=1&&w<=10&&w!==n+1)wrong.add(w);}
 const [w1,w2]=[...wrong];
 return {q:n+" の つぎの かずは なあに？",s:n+"の、つぎの かずは なあに？",
  a:[String(n+1),KANJI_NUM[n]],d:[[String(w1),KANJI_NUM[w1-1]],[String(w2),KANJI_NUM[w2-1]]],
  h:"1つ ふえるよ"};
}
function genLegs(list){
 const groups={};list.forEach(x=>{(groups[x[2]]=groups[x[2]]||[]).push(x);});
 const counts=Object.keys(groups);
 const N=pick(counts);
 const ans=pick(groups[N]);
 const others=list.filter(x=>String(x[2])!==String(N));
 const ds=shuffle(others).slice(0,2).map(x=>[x[0],x[1]]);
 const qn=(N==="0")?"あしが ない いきものは だあれ？":"あしが "+N+"ほんの いきものは だあれ？";
 return {q:qn,s:qn,a:[ans[0],ans[1]],d:ds,h:"あしを よーく かぞえてみて"};
}
function genCompare(list,word){
 if(level===0){
  const i=rnd(0,list.length-4),j=i+3;
  const A=list[i],B=list[j];
  return {q:"どっちが "+word+"？",a:[B[0],B[1]],d:[[A[0],A[1]]],h:B[1]+"は とっても "+word+"よ"};
 }else{
  const i=rnd(0,list.length-3);
  const tri=[list[i],list[i+1],list[i+2]];
  const ans=tri[2];
  return {q:"いちばん "+word+"のは だあれ？",a:[ans[0],ans[1]],d:[[tri[0][0],tri[0][1]],[tri[1][0],tri[1][1]]],h:"3つを くらべてみよう"};
 }
}
const GENS={
 legsJ:()=>genLegs(JLEGS), sizeJ:()=>genCompare(JSIZE,"おおきい"),
 legsS:()=>genLegs(SLEGS), sizeS:()=>genCompare(SSIZE,"おおきい"),
 speedF:()=>genCompare(SPEED,"はやい"), legsJ_none:null
};
function seaRescueQuestionKey(question){
 return question&&question.a?String(question.a[1]||question.a[0]||""):"";
}
function buildSeaRescueList(stage){
 const selected=[],seen=new Set(),generators=(stage.gens||[]).filter(name=>GENS[name]);
 const add=question=>{
  const key=seaRescueQuestionKey(question);
  if(!key||seen.has(key)||selected.length>=QN)return false;
  seen.add(key);selected.push(question);return true;
 };
 const wantedGenerated=level===0?1:2;
 let generated=0;
 for(let attempt=0;attempt<32&&generated<wantedGenerated;attempt++){
  const name=generators.length?pick(generators):null;
  if(name&&add(GENS[name]()))generated++;
 }
 shuffle(stage.bank.filter(question=>(question.min||0)<=level)).forEach(add);
 for(let attempt=0;attempt<32&&selected.length<QN;attempt++){
  const name=generators.length?pick(generators):null;
  if(name)add(GENS[name]());
 }
 return shuffle(selected.slice(0,QN));
}
function questionAnswerKey(question){
 return question&&question.a?String(question.a[1]||question.a[0]||"").trim():"";
}
function buildJungleQuestionList(stage){
 const selected=[],seen=new Set(),generators=(stage.gens||[]).filter(name=>GENS[name]);
 const add=question=>{
  const key=questionAnswerKey(question);
  if(!key||seen.has(key)||selected.length>=QN)return false;
  seen.add(key);selected.push(question);return true;
 };
 const wantedGenerated=level===0?1:2;
 let generated=0;
 for(let attempt=0;attempt<64&&generated<wantedGenerated;attempt++){
  const name=generators.length?pick(generators):null;
  if(name&&add(GENS[name]()))generated++;
 }
 if(level===2)shuffle(WORDPLAY).some(question=>add(question));
 shuffle(stage.bank.filter(question=>(question.min||0)<=level)).forEach(add);
 for(let attempt=0;attempt<64&&selected.length<QN;attempt++){
  const name=generators.length?pick(generators):null;
  if(name)add(GENS[name]());
 }
 return shuffle(selected.slice(0,QN));
}
function buildQList(){
 const st=STAGES[stg];
 if(st.id==="number"){qList=[];for(let i=0;i<QN;i++)qList.push(Math.random()<0.6?genCount():genNext());return;}
 if(st.id==="sea"){seaBossDefeated=false;seaDecoysSeen.clear();qList=buildSeaRescueList(st);return;}
 if(st.id==="jungle"){qList=buildJungleQuestionList(st);return;}
 let statics=shuffle(st.bank.filter(x=>(x.min||0)<=level));
 const gens=(st.gens||[]).filter(g=>GENS[g]);
 let nGen=gens.length?(level===0?1:2):0;
 let nWp=(level===2)?1:0;
 const nStatic=QN-nGen-nWp;
 qList=statics.slice(0,nStatic);
 for(let i=0;i<nGen;i++)qList.push(GENS[pick(gens)]());
 if(nWp)qList.push(pick(WORDPLAY));
 qList=shuffle(qList);
 addStationHelpersToQuestions();
}

/* ================= stage build ================= */
function origin(s){return (loop*STAGES.length+s)*SPAN;}
function palOf(s){return STAGES[s].pals[loop%2];}
function hasStationArt(st){return !!(st&&st.assets&&st.assets.station);}
function applySkin(weatherReady){
 const st=STAGES[stg],P=palOf(stg);
 const nIdx=Math.min(stg+1,STAGES.length-1);
 const NP=STAGES[nIdx].pals[loop%2];
 const wasGameReady=document.body.classList.contains("pono-game-ready");
 const wasAdminPreview=document.body.classList.contains("nazonazo-admin-stage-preview");
 const weather=weatherReady?weatherForStage(st):startStageWeather(st);
 if(weather!=="rain")hideWeatherNotice();
 document.body.className=(IOS_DEVICE?"ios-device ":"")+"st-"+st.id+" v-"+st.veh+" weather-"+weather+(PORTAL_EDIT_ENABLED?" portal-edit":"");
 // 画面スキンの全置換で、初期描画ガードを解除する永続クラスまで消さない。
 if(wasGameReady)document.body.classList.add("pono-game-ready");
 if(wasAdminPreview)document.body.classList.add("nazonazo-admin-stage-preview");
 document.body.dataset.weather=weather;
 setDriverForStage(stg);
 skyA.style.background=st.assets&&st.assets.sky?bgUrl(st.assets.sky)+" "+(st.skyPosition||"center bottom")+" / cover no-repeat":"linear-gradient("+P.sky[0]+","+P.sky[1]+")";
 skyA.style.backgroundColor=st.id==="town"?"#c7d659":(st.id==="jungle"?"#34793f":"transparent");
 skyB.style.background="linear-gradient("+NP.sky[0]+","+NP.sky[1]+")";
 skyB.style.opacity="0";
 horizon.style.backgroundImage=st.assets&&st.assets.horizon?bgUrl(st.assets.horizon):st.horizon(P,NP);
 midT.style.backgroundImage=st.assets&&st.assets.mid?bgUrl(st.assets.mid):st.mid(P);
 groundT.style.backgroundImage=st.assets&&st.assets.ground?bgUrl(st.assets.ground):st.ground(P);
 fgT.style.backgroundImage=st.assets&&st.assets.fg?bgUrl(st.assets.fg):st.fg(P);
 if(jungleHabitatBack)jungleHabitatBack.style.backgroundImage=st.id==="jungle"&&st.assets&&st.assets.habitat?bgUrl(st.assets.habitat):"none";
 buildAmbient(P);
 buildSeaFish();
 buildSeaHabitat();
 buildJungleAnimals();
 buildJungleFlights();
 buildSpaceStars();
}
function buildWorld(keepCover){
 world.innerHTML="";
 if(keepCover&&transitCover)world.appendChild(transitCover);
 tunnels=[];
 const o=origin(stg),st=STAGES[stg],P=palOf(stg);
 for(let i=0;i<QN;i++){
 const t=document.createElement("div");t.className="tun";
  const stationStage=hasStationArt(st);
  t.classList.add(st.id+"-gate");
  if(stationStage)t.classList.add("station",st.id+"-station");
  t.style.left=tunX(o,i)+"vw";
  t.innerHTML=stationStage
   ? '<div class="station-art"></div><div class="station-name">えき</div><div class="sign">？</div>'
   : '<div class="mount" style="background:'+P.mount+'"></div><div class="sign">？</div><div class="hole"><div class="door l"></div><div class="door r"></div></div>';
  if(stationStage){
   const art=t.querySelector(".station-art");
   if(art)art.style.backgroundImage=bgUrl(st.assets.station);
  }
  if(st.id==="town"&&qList[i]&&qList[i].helper){
   const h=qList[i].helper;
   const hp=document.createElement("div");
   hp.className="station-helper";
   const im=document.createElement("img");
   im.src=h.request;im.alt="";
   hp.appendChild(im);
   t.appendChild(hp);
  }
  world.appendChild(t);tunnels.push(t);
  for(let k=0;k<((st.id==="space"||st.id==="sea")?0:2);k++){
   const d=document.createElement("div");d.className="decor";
   const imageDecor=!!(st.assets&&st.assets.decor);
   const wv=imageDecor?(st.id==="jungle"?68+((i+k)%3)*7:80+((i+k)%3)*7):(8+((i*7+k*5)%8));
   const aspect=st.id==="jungle"?3.4:3.78;
   d.style.width=wv+"vw";
   d.style.height=(imageDecor?wv/aspect:wv*(st.id==="town"?1.25:1.6))+"vw";
   d.style.left=(tunX(o,i)-(imageDecor?142:70)+k*(imageDecor?89:38)+((i*13)%14))+"vw";
   d.style.backgroundImage=st.decor(P,i*2+k);
   if(imageDecor){
    d.classList.add("image-decor",st.id+"-decor");
    d.style.backgroundSize="contain";
    d.style.backgroundRepeat="no-repeat";
    d.style.backgroundPosition="center bottom";
   }else d.style.backgroundSize="100% 100%";
   world.appendChild(d);
  }
  const evs=RUN_EVENTS[st.id];
  if(evs){
   for(let j=0;j<2;j++){
    const ev=evs[(i*2+j)%evs.length];
    const b=document.createElement("button");
    b.type="button";b.className="runEvent";b.appendChild(createQuizArt(ev[0],ev[1],"run-event-art"));
    b.setAttribute("aria-label",ev[1]+"を みつけた");
    const lead=i===0?230:408;
    const step=i===0?116:176;
    b.style.left=(tunX(o,i)-lead+j*step+(i%2)*14)+"vw";
    b.style.bottom=(42+((i+j)%3)*6)+"vh";
    bindTap(b,()=>onRunEvent(b,ev));
    world.appendChild(b);
   }
  }
 }
 if(stg<STAGES.length-1){
  dropEl=document.createElement("div");
  dropEl.className="dropStation";
  dropEl.style.left=dropX(o)+"vw";
  dropEl.innerHTML='<div class="drop-station-art"></div><div class="drop-station-name">おりるえき</div><div class="drop-station-friends" data-ui-art="friends" aria-hidden="true"></div>';
  hydrateStaticUiArt(dropEl);
  world.appendChild(dropEl);
  coverEl=document.createElement("div");
  coverEl.className="cover";
  coverEl.style.left=(o+COVER_OFF)+"vw";
  coverEl.style.width=COVER_LEN+"vw";
  let lamps='<div class="cover-core" aria-hidden="true"></div><div class="cover-gate cover-gate-in" aria-hidden="true"></div><div class="cover-gate cover-gate-out" aria-hidden="true"></div><div class="rim rimL"></div><div class="rim rimR"></div>';
  for(let x=16;x<COVER_LEN-8;x+=24)lamps+='<div class="lamp" style="left:'+x+'vw"></div>';
  coverEl.innerHTML=lamps;
  world.appendChild(coverEl);
 } else {coverEl=null;dropEl=null;}
}
function buildAmbient(P){
 document.querySelectorAll(".bub,.twk,.fly,.numfx").forEach(n=>n.remove());
 const sc=$("scene"),st=STAGES[stg];
 const fx=(P&&P.fx)||"";
 if(st.id==="number")buildNumberFx(sc);
 if(st.id==="sea"){for(let i=0;i<8;i++){const b=document.createElement("div");b.className="bub";
  b.style.left=(5+i*12)+"%";b.style.animationDuration=(7+(i%4)*2.5)+"s";b.style.animationDelay=(-i*1.7)+"s";sc.appendChild(b);}}
 if(st.id==="future"){for(let i=0;i<10;i++){const t=document.createElement("div");t.className="twk";t.textContent="✦";
  t.style.left=(3+i*10)+"%";t.style.top=(5+((i*23)%40))+"%";t.style.animationDelay=(-i*.4)+"s";sc.appendChild(t);}}
 if(fx==="fireflies"){for(let i=0;i<12;i++){const f=document.createElement("div");f.className="fly";f.textContent="●";
  f.style.left=(3+i*8)+"%";f.style.top=(30+((i*17)%45))+"%";f.style.animationDelay=(-i*.6)+"s";sc.appendChild(f);}}
}
const SPACE_STAR_PROFILES={
 far:{count:28,iosCount:20,reducedCount:12,depth:.04,size:[1,2.4],opacity:[.35,.7],drift:[.18,.42],seed:0x4a19b2d3},
 mid:{count:22,iosCount:16,reducedCount:9,depth:.24,size:[1.8,4.2],opacity:[.48,.84],drift:[.45,.9],seed:0x73c8e541},
 near:{count:15,iosCount:10,reducedCount:6,depth:.48,size:[3,7],opacity:[.58,.94],drift:[.85,1.65],seed:0xa53fd287}
};
function buildSpaceStars(){
 spaceStarSprites=[];
 Object.values(spaceStarLayers).forEach(layer=>{if(layer)layer.replaceChildren();});
 const st=STAGES[stg];if(!st||st.id!=="space")return;
 const reduced=seaReducedMotion();
 const colors=["#ffffff","#bcefff","#fff1a8","#d9c8ff"];
 Object.entries(SPACE_STAR_PROFILES).forEach(([depthName,profile],profileIndex)=>{
  const layer=spaceStarLayers[depthName];if(!layer)return;
  const count=reduced?profile.reducedCount:(IOS_DEVICE?profile.iosCount:profile.count);
  const random=mulberry32((profile.seed+loop*97)>>>0);
  for(let i=0;i<count;i++){
   const el=document.createElement("span");
   const size=profile.size[0]+random()*(profile.size[1]-profile.size[0]);
   const opacity=profile.opacity[0]+random()*(profile.opacity[1]-profile.opacity[0]);
   el.className="space-star-particle"+(i%7===0?" is-cross":"");
   el.style.setProperty("--space-star-size",size.toFixed(2)+"px");
   el.style.setProperty("--space-star-opacity",opacity.toFixed(2));
   el.style.setProperty("--space-star-glow",(size*(1.8+random()*1.6)).toFixed(1)+"px");
   el.style.setProperty("--space-star-color",colors[(i+profileIndex)%colors.length]);
   el.style.setProperty("--space-star-twinkle",(1.6+random()*2.8).toFixed(2)+"s");
   el.style.setProperty("--space-star-delay",(-random()*3.4).toFixed(2)+"s");
   layer.appendChild(el);
   spaceStarSprites.push({
    el,baseX:random()*1.18-.08,baseY:.06+random()*.7,depth:profile.depth,
    drift:profile.drift[0]+random()*(profile.drift[1]-profile.drift[0]),phase:random()*80
   });
  }
 });
}
function renderSpaceStars(now){
 if(!spaceStarSprites.length||!document.body.classList.contains("st-space")||tunnelInteriorMode)return;
 const width=Math.max(320,window.innerWidth||844),height=Math.max(240,window.innerHeight||390);
 const stageTravel=(worldX-origin(stg))*width/100,t=(now||_nowMs())/1000;
 spaceStarSprites.forEach(star=>{
  const period=width*1.24;
  let x=star.baseX*width-stageTravel*star.depth-(t+star.phase)*star.drift;
  x=((x+width*.12)%period+period)%period-width*.12;
  const y=star.baseY*height;
  star.el.style.transform="translate3d("+(IOS_DEVICE?Math.round(x):x.toFixed(2))+"px,"+(IOS_DEVICE?Math.round(y):y.toFixed(2))+"px,0)";
 });
}
function buildNumberFx(sc){
 const layer=document.createElement("div");
 layer.className="numfx num-scene";
 layer.setAttribute("aria-hidden","true");
 const reduced=prefersReducedMotionActive();
 const cards=[
  [8,16,1,.92,0,0,7.2],[22,8,7,.74,-18,.45,8.4],[38,19,3,.86,14,.9,7.8],
  [58,10,9,.78,-8,1.35,9.1],[75,20,5,.88,22,1.8,7.4],[90,8,2,.72,-24,2.25,8.2],
  [14,52,6,.7,18,2.7,6.8],[48,48,0,.8,-14,3.15,7.6],[82,54,4,.68,10,3.6,6.9]
 ];
 cards.forEach((c,i)=>{
  const el=document.createElement("div");
  el.className="num-card";
  el.textContent=String(c[2]);
  el.style.cssText="--x:"+c[0]+"%;--y:"+c[1]+"%;--scale:"+c[3]+";--rot:"+c[4]+"deg;--delay:"+c[5]+"s;--dur:"+c[6]+"s;--hue:"+(34+i*31)+";";
  if(reduced)el.style.setProperty("animation","none","important");
  layer.appendChild(el);
 });
 const shapes=["triangle","diamond","hex","circle","triangle","diamond","hex"];
 const pos=[[18,32,.8,0],[33,58,.64,.7],[51,31,.74,1.4],[68,45,.7,2.1],[86,34,.82,2.8],[7,68,.58,3.5],[63,67,.62,4.2]];
 pos.forEach((p,i)=>{
  const el=document.createElement("div");
  el.className="num-poly "+shapes[i];
  el.style.cssText="--x:"+p[0]+"%;--y:"+p[1]+"%;--scale:"+p[2]+";--delay:"+p[3]+"s;--dur:"+(9.5+i*.7)+"s;--hue:"+(185+i*24)+";";
  if(reduced)el.style.setProperty("animation","none","important");
  layer.appendChild(el);
 });
 for(let i=0;i<4;i++){
  const el=document.createElement("div");
  el.className="num-ring";
  el.style.cssText="--x:"+(21+i*19)+"%;--y:"+(25+(i%2)*18)+"%;--scale:"+(0.72+i*.12)+";--delay:"+(i*.85)+"s;--dur:"+(12+i*1.8)+"s;--hue:"+(48+i*58)+";";
  if(reduced)el.style.setProperty("animation","none","important");
  layer.appendChild(el);
 }
 sc.appendChild(layer);
}
function seaReducedMotion(){
 return prefersReducedMotionActive();
}
function seaRoundPlayable(){
 return !window.__PONO_TIER_LOCKED__&&seaRoundPhase==="active"&&document.body.classList.contains("sea-quiz-active")&&quiz.classList.contains("show");
}
function seaBossPlayable(){
 return !window.__PONO_TIER_LOCKED__&&seaBossPhase==="active"&&document.body.classList.contains("sea-boss-active")&&seaBossLayer&&!seaBossLayer.hidden;
}
function setSeaRoundPhase(phase){
 seaRoundPhase=phase;
 const inRound=phase!=="idle";
 document.body.classList.toggle("sea-arena-active",inRound);
 document.body.classList.toggle("sea-round-ready",phase==="ready");
 document.body.classList.toggle("sea-round-go",phase==="go");
 if(seaRoundCountdown){
  seaRoundCountdown.classList.remove("is-ready","is-go");
  if(phase==="ready"||phase==="go"){
   seaRoundCountdown.hidden=false;
   seaRoundCountdown.textContent=phase==="ready"?"ようい":"ドン！";
   void seaRoundCountdown.offsetWidth;
   seaRoundCountdown.classList.add(phase==="ready"?"is-ready":"is-go");
  }else{
   seaRoundCountdown.hidden=true;seaRoundCountdown.textContent="";
  }
 }
 const playable=phase==="active";
 activeChoiceButtons().forEach(choice=>{
  if(choice.classList.contains("dim")||choice.classList.contains("is-popped")||choice.classList.contains("is-bursting"))return;
  choice.disabled=!playable;
 });
 if(helpBtn)helpBtn.disabled=phase==="ready"||phase==="go";
 if(!playable){cancelSeaPointer();cancelSeaFirePointer();stopSeaFiring();seaMoveKeys.clear();removeAllSeaShots();}
 if(phase==="ready"){illustratedText(hintText,"target","ようい…","hint-inline-art");announce("ようい");}
 else if(phase==="go"){illustratedText(hintText,"target","ドン！","hint-inline-art");tone(880,0,.09,"triangle",.08);announce("ドン！");}
 else if(phase==="active")illustratedText(hintText,"target","おしながら うごかして こたえを うとう","hint-inline-art");
}
function clearSeaRoundCountdown(){
 clearTimeout(seaRoundCountdownTimer);seaRoundCountdownTimer=0;seaRoundPhase="idle";
 document.body.classList.remove("sea-arena-active","sea-round-ready","sea-round-go");
 if(helpBtn)helpBtn.disabled=false;
 if(seaRoundCountdown){seaRoundCountdown.hidden=true;seaRoundCountdown.textContent="";seaRoundCountdown.classList.remove("is-ready","is-go");}
}
function positionSeaArenaStart(){
 if(!isSeaStage())return;
 seaTrail=[];
 setSeaSteerTarget((window.innerWidth||844)*.23,(window.innerHeight||390)*.47,true);
 applySeaSteerVisual();
}
function startSeaRoundCountdown(){
 if(window.__PONO_TIER_LOCKED__)return;
 clearTimeout(seaRoundCountdownTimer);seaRoundCountdownTimer=0;
 const epoch=seaShooterEpoch;
 positionSeaArenaStart();setSeaRoundPhase("ready");updateSeaAnswerTargets(_nowMs());
 seaRoundCountdownTimer=setTimeout(()=>{
  seaRoundCountdownTimer=0;
  if(epoch!==seaShooterEpoch||!isSeaStage()||!quiz.classList.contains("show"))return;
  setSeaRoundPhase("go");
  seaRoundCountdownTimer=setTimeout(()=>{
   seaRoundCountdownTimer=0;
   if(epoch!==seaShooterEpoch||!isSeaStage()||!quiz.classList.contains("show"))return;
   setSeaRoundPhase("active");
  },SEA_GO_MS);
 },SEA_READY_MS);
}
function seaQuestionOptions(question){
 const friends=cars.filter(friend=>friend&&!friend.pending),rescuedLabels=new Set(friends.map(friend=>passengerLabel(friend))),rescuedEmoji=new Set(friends.map(friend=>friend.e).filter(Boolean));
 const reservedLabels=new Set(qList.map(item=>seaRescueQuestionKey(item))),reservedEmoji=new Set(qList.map(item=>item&&item.a&&item.a[0]).filter(Boolean));
 const candidates=shuffle(((question&&question.d)||[]).concat(SEA_DECOYS)).filter(item=>item&&item[1]&&item[1]!==question.a[1]&&!rescuedLabels.has(item[1])&&!rescuedEmoji.has(item[0])&&!reservedLabels.has(item[1])&&!reservedEmoji.has(item[0]));
 const wrong=candidates.find(item=>!seaDecoysSeen.has(item[1]))||candidates[0]||["?","ちがうもの"];
 seaDecoysSeen.add(wrong[1]);
 return shuffle([
  {e:question.a[0],t:question.a[1],ok:true,mode:"sea"},
  {e:wrong[0],t:wrong[1],ok:false,mode:"sea"}
 ]);
}
function snapSeaReducedMotion(){
 if(seaReducedMotion()){steerX=steerTargetX;steerY=steerTargetY;}
}
function isSeaStage(){return !!(STAGES[stg]&&STAGES[stg].id==="sea");}
function seaLandscapeReady(){return (window.innerWidth||844)>=(window.innerHeight||390);}
function seaControlAvailable(){
 return !window.__PONO_TIER_LOCKED__&&seaLandscapeReady()&&isSeaStage()&&playing&&!tunnelInteriorMode&&
  !document.body.classList.contains("tunnel-enter-run")&&!document.body.classList.contains("tunnel-exit-run")&&
  !seaBubbleLaunchPending&&(driving||seaRoundPlayable()||seaBossPlayable());
}
function seaShooterActive(){
 if(!seaControlAvailable()||driving||answerLocked)return false;
 if(seaBossPlayable()&&_nowMs()<seaBossStunUntil)return false;
 if(seaBossPlayable())return true;
 return seaRoundPlayable()&&document.body.classList.contains("sea-quiz-active")&&
  seaBubbleOptions.some(entry=>entry.button&&!entry.button.disabled&&!entry.button.classList.contains("dim"));
}
function seaSteerBounds(){
 const viewportWidth=window.innerWidth||844;
 const viewportHeight=window.innerHeight||390;
 const width=Math.max(1,veh.offsetWidth||viewportWidth*.16);
 const height=Math.max(1,veh.offsetHeight||viewportHeight*.24);
 const baseCenterX=(veh.offsetLeft||viewportWidth*.28)+width*.5;
 const baseCenterY=(veh.offsetTop>0?veh.offsetTop+height*.5:viewportHeight-viewportHeight*.124-height*.5);
 const scoreHud=document.getElementById("scoreHud");
 const hudBottom=scoreHud?scoreHud.getBoundingClientRect().bottom:viewportHeight*.14;
 const quizTop=quiz.classList.contains("show")?quiz.getBoundingClientRect().top:viewportHeight;
 const rawMaxY=Math.min(viewportHeight-height*.5-8,quizTop-height*.5-10);
 const maxCenterY=Math.max(height*.5+20,rawMaxY);
 const wantedMinY=Math.max(hudBottom+height*.5+8,viewportHeight*.17);
 const minCenterY=Math.max(height*.5+8,Math.min(maxCenterY-12,wantedMinY));
 const minCenterX=Math.max(width*.5+8,viewportWidth*.08);
 const maxCenterRatio=document.body.classList.contains("sea-quiz-active") ? .46 : .5;
 const maxCenterX=Math.max(minCenterX+12,Math.min(viewportWidth*maxCenterRatio,viewportWidth-width*.5-8));
 return {
  baseCenterX,baseCenterY,
  minX:minCenterX-baseCenterX,maxX:maxCenterX-baseCenterX,
  minY:minCenterY-baseCenterY,maxY:Math.max(minCenterY+12,maxCenterY)-baseCenterY
 };
}
function clampSeaSteerOffsets(){
 if(!isSeaStage())return;
 const bounds=seaSteerBounds();
 steerTargetX=clamp(steerTargetX,bounds.minX,bounds.maxX);
 steerX=clamp(steerX,bounds.minX,bounds.maxX);
 steerTargetY=clamp(steerTargetY,bounds.minY,bounds.maxY);
 steerY=clamp(steerY,bounds.minY,bounds.maxY);
}
function applySeaSteerVisual(){
 if(!vehicleSteerShell)return;
 const x=IOS_DEVICE?Math.round(steerX):Number(steerX.toFixed(2));
 const y=IOS_DEVICE?Math.round(steerY):Number(steerY.toFixed(2));
 const tilt=seaReducedMotion()?0:clamp((steerTargetY-steerY)*-.055,-5,5);
 vehicleSteerShell.style.setProperty("--sea-steer-x",x+"px");
 vehicleSteerShell.style.setProperty("--sea-steer-y",y+"px");
 vehicleSteerShell.style.setProperty("--sea-steer-tilt",tilt.toFixed(2)+"deg");
 carsEl.style.setProperty("--sea-steer-x",x+"px");
 carsEl.style.setProperty("--sea-steer-y",y+"px");
}
function setSeaSteerTarget(clientX,clientY,immediate){
 if(!isSeaStage())return;
 const bounds=seaSteerBounds();
 const x=Number.isFinite(clientX)?clientX:bounds.baseCenterX+steerTargetX;
 const y=Number.isFinite(clientY)?clientY:bounds.baseCenterY+steerTargetY;
 steerTargetX=clamp(x-bounds.baseCenterX,bounds.minX,bounds.maxX);
 steerTargetY=clamp(y-bounds.baseCenterY,bounds.minY,bounds.maxY);
 if(immediate||seaReducedMotion()){steerX=steerTargetX;steerY=steerTargetY;applySeaSteerVisual();}
}
function nudgeSeaSteerTarget(dx,dy){
 if(!isSeaStage())return;
 const bounds=seaSteerBounds();
 steerTargetX=clamp(steerTargetX+dx,bounds.minX,bounds.maxX);
 steerTargetY=clamp(steerTargetY+dy,bounds.minY,bounds.maxY);
 seaSteerUsed=true;
}
function setSeaFireSource(source,active){
 if(active)seaFireSources.add(source);else seaFireSources.delete(source);
 if(seaFireButton)seaFireButton.classList.toggle("is-firing",seaFireSources.size>0&&seaShooterActive());
}
function stopSeaFiring(){
 seaFireSources.clear();seaKeyboardAim=null;seaKeyboardAimStartedAt=0;seaLastVolleyAt=0;
 clearTimeout(seaAssistFireTimer);seaAssistFireTimer=0;
 if(seaFireButton)seaFireButton.classList.remove("is-firing");
}
function cancelSeaPointer(){
 if(seaSteerPointerId===null)return;
 const pointerId=seaSteerPointerId;
 seaSteerPointerId=null;
 setSeaFireSource("steer",false);
 if(seaSteerSurface){try{seaSteerSurface.releasePointerCapture(pointerId);}catch(_){}}
}
function cancelSeaFirePointer(){
 if(seaFirePointerId===null)return;
 const pointerId=seaFirePointerId;
 seaFirePointerId=null;
 setSeaFireSource("button",false);
 if(seaFireButton){try{seaFireButton.releasePointerCapture(pointerId);}catch(_){}}
}
function removeAllSeaShots(){
 seaShots.forEach(shot=>{if(shot.el)shot.el.remove();});
 seaShots=[];
}
function clearSeaShotLayer(){
 removeAllSeaShots();
 if(seaShotLayer)seaShotLayer.replaceChildren();
}
function clearSeaRescueMessage(){
 clearTimeout(seaRescueMessageTimer);seaRescueMessageTimer=0;
 if(seaRescueMessage){seaRescueMessage.hidden=true;seaRescueMessage.replaceChildren();}
}
function showSeaRescueMessage(passenger,index){
 if(!seaRescueMessage||!passenger)return;
 clearSeaRescueMessage();
 const friend=createQuizArt(passenger.e||"🐟",passengerLabel(passenger)||"うみの ともだち","sea-rescue-friend",passenger.img||passenger.normal||passenger.happy);
 const line=document.createElement("span");line.textContent=SEA_RESCUE_LINES[index%SEA_RESCUE_LINES.length];
 seaRescueMessage.append(friend,line);seaRescueMessage.hidden=false;
 announce((passengerLabel(passenger)||"うみの ともだち")+"。"+line.textContent);
 const timer=setTimeout(()=>{if(seaRescueMessageTimer!==timer)return;seaRescueMessageTimer=0;if(seaRescueMessage){seaRescueMessage.hidden=true;seaRescueMessage.replaceChildren();}},1450);
 seaRescueMessageTimer=timer;
}
function clearSeaBossEnemyShots(){
 seaBossEnemyShots.forEach(shot=>{if(shot.el)shot.el.remove();});seaBossEnemyShots=[];
}
function clearSeaBossEncounter(){
 seaBossEpoch++;clearTimeout(seaBossTimer);seaBossTimer=0;
 seaBossPhase="idle";seaBossHp=0;seaBossMaxHp=0;seaBossX=0;seaBossY=0;seaBossRadiusX=0;seaBossRadiusY=0;seaBossWidth=0;
 seaBossFlashUntil=0;seaBossSalvos.clear();seaBossThresholds.clear();
 seaBossNextAttackAt=0;seaBossAttackAt=0;seaBossInvulnerableUntil=0;seaBossStunUntil=0;clearSeaBossEnemyShots();
 document.body.classList.remove("sea-boss-active","sea-sub-hit");
 if(seaRoundPhase==="idle")document.body.classList.remove("sea-arena-active");
 if(seaBossLayer){seaBossLayer.hidden=true;seaBossLayer.replaceChildren();seaBossLayer.removeAttribute("style");}
 if(helpBtn)helpBtn.disabled=false;
 cancelSeaPointer();cancelSeaFirePointer();stopSeaFiring();seaMoveKeys.clear();removeAllSeaShots();
}
function seaBossDamagePerVolley(){return 1+Math.min(SEA_COMPANION_LIMIT,seaCompanionSprites.length);}
function updateSeaBossProgress(){
 if(!seaBossLayer||seaBossLayer.hidden)return;
 const meter=seaBossLayer.querySelector(".sea-boss-meter"),fill=meter&&meter.querySelector("span"),wrap=seaBossLayer.querySelector(".sea-boss-wrap");
 const ratio=seaBossMaxHp?clamp(seaBossHp/seaBossMaxHp,0,1):0;
 if(meter){meter.setAttribute("aria-valuemax",String(seaBossMaxHp));meter.setAttribute("aria-valuenow",String(Math.ceil(seaBossHp)));meter.setAttribute("aria-valuetext","たいりょく のこり "+Math.ceil(ratio*100)+"ぱーせんと");}
 if(fill)fill.style.setProperty("--sea-boss-hp",(ratio*100).toFixed(1)+"%");
 if(wrap){wrap.classList.toggle("damage-1",ratio<=.75);wrap.classList.toggle("damage-2",ratio<=.5);wrap.classList.toggle("damage-3",ratio<=.25);}
}
function buildSeaBossEncounter(){
 if(!seaBossLayer)return;
 seaBossLayer.replaceChildren();seaBossLayer.hidden=false;
 const wrap=document.createElement("div");wrap.className="sea-boss-wrap";
 const art=document.createElement("img");art.className="sea-boss-art";art.src=ASSETS.sea.boss;art.alt="";art.decoding="async";
 wrap.appendChild(art);
 const hud=document.createElement("div");hud.className="sea-boss-hud";
 const title=document.createElement("strong");title.textContent="おおあわぬし";
 const meter=document.createElement("div");meter.className="sea-boss-meter";meter.setAttribute("role","progressbar");meter.setAttribute("aria-label","おおあわぬしの たいりょく");meter.setAttribute("aria-valuemin","0");
 const fill=document.createElement("span");meter.appendChild(fill);
 const guide=document.createElement("small");guide.className="sea-boss-guide";guide.textContent="ねらって れんしゃ！";
 hud.append(title,meter,guide);seaBossLayer.append(wrap,hud);updateSeaBossProgress();
}
function updateSeaBossVisual(now){
 if(seaBossPhase==="idle"||!seaBossLayer||seaBossLayer.hidden)return;
 const safe=seaAnswerSafeRect(),width=clamp(safe.sceneRect.width*.31,180,320),height=width/1.5;
 const top=safe.top+44,bottom=Math.max(top+height,safe.bottom-4);
 const time=(now||_nowMs())/1000;
 const centerBase=safe.sceneRect.width*.76;
 const centerX=clamp(centerBase+(seaReducedMotion()?0:Math.sin(time*.9)*safe.sceneRect.width*.085),safe.sceneRect.width*.58,safe.sceneRect.width-width*.48-8);
 const baseY=clamp((top+bottom)*.5,top+height*.5,bottom-height*.5);
 const bob=seaReducedMotion()||seaBossPhase!=="active"?0:Math.sin(time*1.8)*Math.min(34,safe.height*.2);
 seaBossWidth=width;seaBossX=centerX;seaBossY=baseY+bob;seaBossRadiusX=width*.43;seaBossRadiusY=height*.4;
 const wrap=seaBossLayer.querySelector(".sea-boss-wrap");
 if(wrap){
  wrap.style.setProperty("--sea-boss-width",width.toFixed(1)+"px");
  wrap.style.setProperty("--sea-boss-left",(seaBossX-width*.5).toFixed(1)+"px");
  wrap.style.setProperty("--sea-boss-top",(seaBossY-height*.5).toFixed(1)+"px");
  wrap.classList.toggle("is-hit",seaBossPhase==="active"&&(now||_nowMs())<seaBossFlashUntil);
  wrap.classList.toggle("is-attacking",seaBossAttackAt>0&&(now||_nowMs())<seaBossAttackAt);
 }
 seaBossLayer.style.setProperty("--sea-boss-hud-x",seaBossX.toFixed(1)+"px");
 seaBossLayer.style.setProperty("--sea-boss-hud-y",Math.max(safe.top,safe.sceneRect.height*.12).toFixed(1)+"px");
}
function spawnSeaBossBubbleShot(angleOffset){
 if(!seaBossPlayable()||!seaBossLayer||!vehicleSteerShell)return;
 const scene=document.getElementById("scene"),sceneRect=scene.getBoundingClientRect(),sub=vehicleSteerShell.getBoundingClientRect();
 const startX=seaBossX-seaBossRadiusX*.72,startY=seaBossY;
 const targetX=sub.left-sceneRect.left+sub.width*.52,targetY=sub.top-sceneRect.top+sub.height*.52;
 const base=Math.atan2(targetY-startY,targetX-startX)+(angleOffset||0),speed=clamp((window.innerWidth||844)*.29,190,285);
 const el=document.createElement("span");el.className="sea-boss-bubble-shot";el.setAttribute("aria-hidden","true");seaBossLayer.appendChild(el);
 seaBossEnemyShots.push({el,x:startX,y:startY,vx:Math.cos(base)*speed,vy:Math.sin(base)*speed,radius:clamp((window.innerWidth||844)*.026,15,24)});
}
function hitSeaSubmarineWithBossBubble(shot,now){
 if(!shot||!vehicleSteerShell||now<seaBossInvulnerableUntil)return false;
 const scene=document.getElementById("scene"),sceneRect=scene.getBoundingClientRect(),sub=vehicleSteerShell.getBoundingClientRect();
 const hull={left:sub.left-sceneRect.left+sub.width*.1,right:sub.right-sceneRect.left-sub.width*.08,top:sub.top-sceneRect.top+sub.height*.18,bottom:sub.bottom-sceneRect.top-sub.height*.14};
 if(shot.x+shot.radius<hull.left||shot.x-shot.radius>hull.right||shot.y+shot.radius<hull.top||shot.y-shot.radius>hull.bottom)return false;
 seaBossInvulnerableUntil=now+900;seaBossStunUntil=now+420;stopSeaFiring();cancelSeaFirePointer();
 nudgeSeaSteerTarget(-clamp((window.innerWidth||844)*.035,18,34),0);document.body.classList.add("sea-sub-hit");
 tone(190,0,.12,"triangle",.055);tone(145,.08,.2,"sine",.05);showStamp("あわを よけよう！","ng");
 const epoch=seaBossEpoch;setTimeout(()=>{if(epoch===seaBossEpoch)document.body.classList.remove("sea-sub-hit");},450);return true;
}
function updateSeaBossEnemyShots(now,dt){
 if(!seaBossPlayable()){clearSeaBossEnemyShots();return;}
 if(!seaBossAttackAt&&now>=seaBossNextAttackAt){
  seaBossAttackAt=now+(seaReducedMotion()?120:360);seaBossGuide("あわが くるよ！ よけて！",false);tone(210,0,.11,"sine",.035);
 }
 if(seaBossAttackAt&&now>=seaBossAttackAt){
  seaBossAttackAt=0;const ratio=seaBossMaxHp?seaBossHp/seaBossMaxHp:1;
  spawnSeaBossBubbleShot(ratio<.48?-.14:0);if(ratio<.48)spawnSeaBossBubbleShot(.14);
  seaBossNextAttackAt=now+clamp(1700-(1-ratio)*520,1050,1700);seaBossGuide("うごいて よけながら れんしゃ！",false);
 }
 const width=window.innerWidth||844,height=window.innerHeight||390;
 for(let index=seaBossEnemyShots.length-1;index>=0;index--){
  const shot=seaBossEnemyShots[index];shot.x+=shot.vx*dt;shot.y+=shot.vy*dt;
  shot.el.style.transform="translate3d("+shot.x.toFixed(2)+"px,"+shot.y.toFixed(2)+"px,0) translate(-50%,-50%)";
  if(hitSeaSubmarineWithBossBubble(shot,now)||shot.x<-40||shot.x>width+40||shot.y<-40||shot.y>height+40){shot.el.remove();seaBossEnemyShots.splice(index,1);}
 }
}
function seaBossShotHits(shot){
 if(!shot||!seaBossPlayable()||seaBossRadiusX<=0||seaBossRadiusY<=0)return false;
 const crossed=shot.x+8>=seaBossX-seaBossRadiusX&&shot.prevX-8<=seaBossX+seaBossRadiusX;
 if(!crossed)return false;
 const y=(shot.y-seaBossY)/seaBossRadiusY;
 const x=(Math.min(seaBossX+seaBossRadiusX,Math.max(seaBossX-seaBossRadiusX,shot.x))-seaBossX)/seaBossRadiusX;
 return x*x+y*y<=1.08;
}
function seaBossGuide(message,announceMessage){
 const guide=seaBossLayer&&seaBossLayer.querySelector(".sea-boss-guide");if(guide)guide.textContent=message;
 if(announceMessage)announce(message);
}
function finishSeaBossVictory(){
 if(seaBossPhase!=="active")return;
 seaBossPhase="defeated";seaBossDefeated=true;clearSeaBossEnemyShots();stopSeaFiring();cancelSeaPointer();cancelSeaFirePointer();seaMoveKeys.clear();removeAllSeaShots();
 const wrap=seaBossLayer&&seaBossLayer.querySelector(".sea-boss-wrap");if(wrap)wrap.classList.add("is-defeated");
 createSeaBurstParticles({x:seaBossX,y:seaBossY,size:Math.min(seaBossWidth,190),scale:1.24});
 seaBossGuide("まいった〜！ みんなを はなすよ！",true);showStamp("みんなを たすけた！","clear");
 tone(170,0,.2,"sine",.09);tone(523,.08,.18,"triangle",.08);tone(784,.19,.22,"triangle",.08);tone(1175,.31,.28,"sine",.07);confetti(18);
 const epoch=seaBossEpoch;
 seaBossTimer=setTimeout(()=>{
  seaBossTimer=0;if(epoch!==seaBossEpoch||!playing||!isSeaStage()||!seaBossDefeated)return;
  clearSeaBossEncounter();completeCurrentStage(origin(stg));
 },seaReducedMotion()?80:SEA_BOSS_VICTORY_MS);
}
function hitSeaBoss(salvoId,x,y){
 if(!seaBossPlayable()||seaBossSalvos.has(salvoId))return false;
 seaBossSalvos.add(salvoId);seaBossHp=Math.max(0,seaBossHp-seaBossDamagePerVolley());seaBossFlashUntil=_nowMs()+155;
 createSeaHitSpark(x,y);tone(360+(seaBossMaxHp-seaBossHp)*2.4,0,.045,"triangle",.035);updateSeaBossProgress();
 const ratio=seaBossMaxHp?seaBossHp/seaBossMaxHp:0;
 [[.75,"きいてる！"],[.5,"あと はんぶん！"],[.25,"もう すこし！"]].forEach(([mark,message])=>{
  if(ratio<=mark&&!seaBossThresholds.has(mark)){seaBossThresholds.add(mark);seaBossGuide(message,true);tone(740+(1-mark)*520,0,.1,"sine",.055);}
 });
 if(seaBossHp<=0)finishSeaBossVictory();
 return true;
}
function showSeaBossEncounter(){
 if(window.__PONO_TIER_LOCKED__||!isSeaStage()||!playing||seaBossDefeated)return;
 clearSeaRescueMessage();clearSeaBubbleGame();clearSeaBossEncounter();
 seaBossPhase="intro";seaBossMaxHp=SEA_BOSS_HP[level]||SEA_BOSS_HP[0];seaBossHp=seaBossMaxHp;seaBossSalvos.clear();seaBossThresholds.clear();answerLocked=false;
 if(helpBtn)helpBtn.disabled=true;
 document.body.classList.add("sea-boss-active","sea-arena-active");buildSeaBossEncounter();positionSeaArenaStart();updateSeaBossVisual(_nowMs());
 showStamp("おおあわぬしが きた！","ng");seaBossGuide("みんなを とじこめた ぬしだ！",true);tone(120,0,.45,"sawtooth",.07);tone(82,.18,.55,"sine",.08);
 const epoch=seaBossEpoch;
 seaBossTimer=setTimeout(()=>{
  seaBossTimer=0;if(epoch!==seaBossEpoch||!playing||!isSeaStage()||seaBossPhase!=="intro")return;
  seaBossPhase="active";seaBossNextAttackAt=_nowMs()+760;seaBossGuide("よけながら ねらって れんしゃ！",true);seaSteerUsed=false;
 },seaReducedMotion()?30:SEA_BOSS_INTRO_MS);
}
function clearSeaBubbleGame(){
 seaShooterEpoch++;
 clearSeaRoundCountdown();
 clearTimeout(seaBubbleLaunchTimer);seaBubbleLaunchTimer=0;
 clearTimeout(seaShooterResumeTimer);seaShooterResumeTimer=0;
 clearTimeout(seaAssistFireTimer);seaAssistFireTimer=0;
 cancelSeaPointer();cancelSeaFirePointer();stopSeaFiring();
 seaBubbleLaunchPending=false;seaBubbleOptions=[];seaMoveKeys.clear();seaSalvoHits.clear();
 seaLastVolleyAt=0;seaShooterFrameAt=0;
 document.body.classList.remove("sea-quiz-active");
 quiz.classList.remove("sea-quiz");choicesEl.classList.remove("sea-mode");
 choicesEl.setAttribute("aria-label","こたえを えらぶ");
 if(seaAnswerLayer)seaAnswerLayer.replaceChildren();
 clearSeaShotLayer();
 if(seaFireButton){seaFireButton.hidden=true;seaFireButton.classList.remove("is-firing");}
 clampSeaSteerOffsets();
}
function resetSeaInteraction(){
 clearSeaBubbleGame();clearSeaBossEncounter();clearSeaRescueMessage();
 steerTargetX=0;steerX=0;steerTargetY=0;steerY=0;seaSteerUsed=false;
 seaCompanionSprites=[];seaCompanionKey="";seaTrail=[];
 if(seaCompanionLayer)seaCompanionLayer.replaceChildren();
 if(vehicleSteerShell){
  vehicleSteerShell.style.setProperty("--sea-steer-x","0px");
  vehicleSteerShell.style.setProperty("--sea-steer-y","0px");
  vehicleSteerShell.style.setProperty("--sea-steer-tilt","0deg");
 }
 carsEl.style.setProperty("--sea-steer-x","0px");
 carsEl.style.setProperty("--sea-steer-y","0px");
 document.body.classList.remove("sea-steer-active");
 if(seaSteerHint)seaSteerHint.hidden=true;
}
function seaAnswerSafeRect(){
 const scene=document.getElementById("scene");
 const sceneRect=scene?scene.getBoundingClientRect():{left:0,top:0,width:window.innerWidth||844,height:window.innerHeight||390};
 const scoreHud=document.getElementById("scoreHud");
 const hudRect=scoreHud?scoreHud.getBoundingClientRect():{bottom:sceneRect.top+sceneRect.height*.14};
 const quizRect=quiz.classList.contains("show")?quiz.getBoundingClientRect():{top:sceneRect.top+sceneRect.height*.82};
 const top=clamp(hudRect.bottom-sceneRect.top+8,42,sceneRect.height*.48);
 const bottom=Math.max(top+90,Math.min(sceneRect.height-12,quizRect.top-sceneRect.top-9));
 return {sceneRect,top,bottom,height:Math.max(90,bottom-top)};
}
function separateSeaAnswerTargets(entries){
 if(!entries||entries.length<2)return;
 const a=entries[0],b=entries[1],gap=a._boundaryHalf+b._boundaryHalf+12;
 const dy=Math.abs(a.y-b.y),neededX=Math.sqrt(Math.max(0,gap*gap-dy*dy));
 if(Math.abs(a.x-b.x)+.5>=neededX)return;
 const left=a,right=b;
 let leftX=clamp((a.x+b.x-neededX)*.5,left._minX,left._maxX);
 let rightX=clamp((a.x+b.x+neededX)*.5,right._minX,right._maxX);
 let missing=Math.max(0,neededX-(rightX-leftX));
 if(missing>0){const next=clamp(leftX-missing,left._minX,left._maxX);missing-=leftX-next;leftX=next;}
 if(missing>0)rightX=clamp(rightX+missing,right._minX,right._maxX);
 left.x=leftX;right.x=rightX;
 const actualX=Math.abs(a.x-b.x),neededY=Math.sqrt(Math.max(0,gap*gap-actualX*actualX));
 if(Math.abs(a.y-b.y)+.5>=neededY)return;
 const top=a.y<=b.y?a:b,bottom=top===a?b:a;
 let topY=clamp((a.y+b.y-neededY)*.5,top._laneMin,top._laneMax);
 let bottomY=clamp((a.y+b.y+neededY)*.5,bottom._laneMin,bottom._laneMax);
 missing=Math.max(0,neededY-(bottomY-topY));
 if(missing>0){const next=clamp(topY-missing,top._laneMin,top._laneMax);missing-=topY-next;topY=next;}
 if(missing>0)bottomY=clamp(bottomY+missing,bottom._laneMin,bottom._laneMax);
 top.y=topY;bottom.y=bottomY;
}
function updateSeaAnswerTargets(now){
 if(!seaBubbleOptions.length)return;
 const safe=seaAnswerSafeRect();
 const reduced=seaReducedMotion();
 const t=(now||_nowMs())/1000;
 seaBubbleOptions.forEach(entry=>{
  if(!entry.button||!entry.button.isConnected)return;
  const focused=document.activeElement===entry.button;
  const moving=seaRoundPlayable()&&!reduced&&!focused&&!entry.bursting;
  const ratio=clamp(entry.hits/entry.hitGoal,0,1);
  const balloonCurve=.28*ratio+.72*ratio*ratio;
  const maxScale=reduced?SEA_TARGET_REDUCED_SCALE:SEA_TARGET_MAX_SCALE;
  const flash=entry.flashUntil>now?(reduced?0:.045):0;
  entry.scale=1+(maxScale-1)*balloonCurve+flash;
  entry.button.style.setProperty("--sea-captive-scale",((.66+.34*ratio)/entry.scale).toFixed(4));
  entry.button.style.setProperty("--sea-label-scale",(1/entry.scale).toFixed(4));
  const movementScale=1-balloonCurve*.85;
  const wave=moving?Math.sin(t*entry.rate+entry.phase)*movementScale:0;
  const cross=moving?Math.sin(t*entry.rate*1.47+entry.phase*.63)*movementScale:0;
  const visualHalf=entry.size*entry.scale*.5;
  const boundaryHalf=visualHalf*(1+.12*balloonCurve);
  const laneCenter=safe.top+safe.height*(entry.index===0?.34:.76);
  const laneMin=Math.min(safe.bottom,safe.top+boundaryHalf+4),laneMax=Math.max(laneMin,safe.bottom-boundaryHalf-4);
  entry.y=clamp(laneCenter+cross*entry.ampY,laneMin,laneMax);
  const minX=Math.max(boundaryHalf+8,safe.sceneRect.width*.66);
  let maxX=Math.min(safe.sceneRect.width-boundaryHalf-10,safe.sceneRect.width*.92);
  if(settingsBtn&&entry.index===0){
   const settingsRect=settingsBtn.getBoundingClientRect(),settingsLeft=settingsRect.left-safe.sceneRect.left,settingsTop=settingsRect.top-safe.sceneRect.top,settingsBottom=settingsRect.bottom-safe.sceneRect.top;
   if(entry.y-boundaryHalf<settingsBottom+8&&entry.y+boundaryHalf>settingsTop-8)maxX=Math.min(maxX,settingsLeft-boundaryHalf-8);
  }
  const laneSpread=safe.sceneRect.width*.14*Math.sqrt(balloonCurve)*(entry.index===0?-1:1);
  maxX=Math.max(minX,maxX);entry.x=clamp(safe.sceneRect.width*entry.baseX+wave*entry.ampX+laneSpread,minX,maxX);
  entry._boundaryHalf=boundaryHalf;entry._minX=minX;entry._maxX=maxX;entry._laneMin=laneMin;entry._laneMax=laneMax;entry._rotation=moving?wave*entry.rotation:0;
  entry.radius=entry.size*entry.scale*.47;
  entry.button.classList.toggle("is-inflated",ratio>=.28);
  entry.button.classList.toggle("is-taut",ratio>=.82&&!entry.bursting);
 });
 separateSeaAnswerTargets(seaBubbleOptions);
 seaBubbleOptions.forEach(entry=>{
  if(!entry.button||!entry.button.isConnected)return;
  entry.button.style.transform="translate3d("+entry.x.toFixed(2)+"px,"+entry.y.toFixed(2)+"px,0) translate(-50%,-50%) rotate("+entry._rotation.toFixed(2)+"deg) scale("+entry.scale.toFixed(3)+")";
 });
}
function syncSeaCompanions(){
 if(!seaCompanionLayer||window.__PONO_TIER_LOCKED__||!isSeaStage())return;
 const friends=[],seen=new Set();
 for(let index=cars.length-1;index>=0&&friends.length<SEA_COMPANION_LIMIT;index--){
  const friend=cars[index];if(!friend||friend.pending||!(friend.img||friend.e))continue;
  const species=(friend.t||friend.e||friend.img||"").trim();if(!species||seen.has(species))continue;
  seen.add(species);friends.unshift(friend);
 }
 const key=friends.map(friend=>(friend.img||friend.e||"")+"|"+(friend.t||"")).join("||");
 if(key===seaCompanionKey)return;
 seaCompanionKey=key;seaCompanionSprites=[];seaTrail=[];seaCompanionLayer.replaceChildren();
 friends.forEach((friend,index)=>{
  const el=document.createElement("span");el.className="sea-companion";el.dataset.companionIndex=String(index);
  if(friend.img){const img=document.createElement("img");img.src=friend.img;img.alt="";img.decoding="async";el.appendChild(img);}
  else el.appendChild(createQuizArt(friend.e,passengerLabel(friend)||"うみの ともだち","sea-companion-art"));
  seaCompanionLayer.appendChild(el);seaCompanionSprites.push({el,index,x:-80,y:-80,size:40});
 });
}
function seaTrailPointAt(time,fallback){
 if(!seaTrail.length)return fallback;
 for(let i=seaTrail.length-1;i>=0;i--){
  const older=seaTrail[i];
  if(older.t<=time){
   const newer=seaTrail[i+1];
   if(!newer||newer.t===older.t)return older;
   const p=clamp((time-older.t)/(newer.t-older.t),0,1);
   return {x:older.x+(newer.x-older.x)*p,y:older.y+(newer.y-older.y)*p,t:time};
  }
 }
 return seaTrail[0];
}
function renderSeaCompanions(now){
 if(window.__PONO_TIER_LOCKED__||!isSeaStage()||tunnelInteriorMode||!seaCompanionLayer)return;
 syncSeaCompanions();
 const scene=document.getElementById("scene");
 const sceneRect=scene.getBoundingClientRect(),shellRect=vehicleSteerShell.getBoundingClientRect();
 const subPoint={x:shellRect.left-sceneRect.left+shellRect.width*.42,y:shellRect.top-sceneRect.top+shellRect.height*.54,t:now};
 seaTrail.push(subPoint);
 while(seaTrail.length>2&&seaTrail[0].t<now-1250)seaTrail.shift();
 const gap=clamp((window.innerWidth||844)*.05,40,54);
 const reduced=seaReducedMotion();
 seaCompanionSprites.forEach((companion,index)=>{
  const point=reduced?subPoint:seaTrailPointAt(now-135*(index+1),subPoint);
  const size=companion.el.offsetWidth||clamp((window.innerWidth||844)*.051,34,48);
  const fanY=[-12,10,-7][index]||0,bob=reduced?0:Math.sin(now/650+index*.9)*2;
  companion.size=size;companion.x=clamp(point.x-gap*(index+1.38),size*.55,sceneRect.width-size*.55);companion.y=point.y+fanY+bob;
  companion.el.style.transform="translate3d("+(companion.x-size*.5).toFixed(2)+"px,"+(companion.y-size*.5).toFixed(2)+"px,0)";
 });
}
function spawnSeaShot(x,y,companion,salvoId,aimY){
 if(!seaShotLayer||seaShots.length>=SEA_SHOT_LIMIT||window.__PONO_TIER_LOCKED__)return;
 const el=document.createElement("span");el.className="sea-shot"+(companion?" is-companion":"");
 seaShotLayer.appendChild(el);
 seaShots.push({el,x,y,aimY:Number.isFinite(aimY)?aimY:y,companion,prevX:x,speed:Math.max(560,(window.innerWidth||844)*1.1),salvoId});
}
function spawnSeaVolley(now){
 if(!seaShooterActive()||!vehicleSteerShell||seaShots.length>=SEA_SHOT_LIMIT)return;
 const scene=document.getElementById("scene"),sceneRect=scene.getBoundingClientRect(),shellRect=vehicleSteerShell.getBoundingClientRect();
 const salvoId=++seaVolleyCount;
 const aimY=shellRect.top-sceneRect.top+shellRect.height*.51;
 spawnSeaShot(shellRect.right-sceneRect.left-shellRect.width*.06,aimY,false,salvoId,aimY);
 seaCompanionSprites.forEach(companion=>{
  spawnSeaShot(companion.x+companion.size*.45,companion.y,true,salvoId,aimY);
  companion.el.classList.remove("is-firing");void companion.el.offsetWidth;companion.el.classList.add("is-firing");
  setTimeout(()=>companion.el&&companion.el.classList.remove("is-firing"),130);
 });
 seaVolleyCount=salvoId;
 if(salvoId%3===1)tone(760+(salvoId%5)*42,0,.04,"sine",.022);
 seaLastVolleyAt=now;
}
function createSeaHitSpark(x,y){
 if(!seaShotLayer)return;
 const spark=document.createElement("span");spark.className="sea-hit-spark";
 spark.style.setProperty("--spark-x",x.toFixed(1)+"px");spark.style.setProperty("--spark-y",y.toFixed(1)+"px");
 seaShotLayer.appendChild(spark);setTimeout(()=>spark.remove(),320);
}
function createSeaBurstParticles(entry){
 if(!seaShotLayer)return;
 const colors=["#baf7ff","#fff39a","#8ee7ff","#d7b9ff","#ffffff","#8fffb2"];
 const flash=document.createElement("span");flash.className="sea-burst-flash";
 flash.style.setProperty("--flash-x",entry.x.toFixed(1)+"px");flash.style.setProperty("--flash-y",entry.y.toFixed(1)+"px");
 flash.style.setProperty("--flash-size",Math.max(92,entry.size*entry.scale*.72).toFixed(1)+"px");seaShotLayer.appendChild(flash);setTimeout(()=>flash.remove(),500);
 const ring=document.createElement("span");ring.className="sea-burst-ring";
 ring.style.setProperty("--ring-x",entry.x.toFixed(1)+"px");ring.style.setProperty("--ring-y",entry.y.toFixed(1)+"px");
 ring.style.setProperty("--ring-size",Math.max(120,entry.size*entry.scale*1.08).toFixed(1)+"px");seaShotLayer.appendChild(ring);
 setTimeout(()=>ring.remove(),SEA_BURST_PARTICLE_MS+40);
 for(let i=0;i<36;i++){
  const drop=document.createElement("span"),angle=Math.PI*2*i/36+(i%4)*.055,distance=94+(i%9)*12;
  drop.className="sea-burst-drop"+(i%3===0?" is-star":"");drop.style.setProperty("--drop-x",entry.x.toFixed(1)+"px");drop.style.setProperty("--drop-y",entry.y.toFixed(1)+"px");
  drop.style.setProperty("--drop-dx",(Math.cos(angle)*distance).toFixed(1)+"px");drop.style.setProperty("--drop-dy",(Math.sin(angle)*distance).toFixed(1)+"px");
  drop.style.setProperty("--drop-size",(12+(i%6)*2.4).toFixed(1)+"px");drop.style.setProperty("--drop-delay",((i%7)*9)+"ms");
  drop.style.setProperty("--drop-rot",(120+(i%8)*37)+"deg");drop.style.setProperty("--drop-color",colors[i%colors.length]);seaShotLayer.appendChild(drop);
  setTimeout(()=>drop.remove(),SEA_BURST_PARTICLE_MS+90);
 }
}
function hitSeaAnswerTarget(entry,salvoId,x,y){
 if(!entry||!seaRoundPlayable()||seaSalvoHits.has(salvoId)||seaBubbleLaunchPending||answerLocked||entry.bursting||entry.button.disabled||entry.button.classList.contains("dim"))return false;
 seaSalvoHits.add(salvoId);entry.hits=Math.min(entry.hitGoal,entry.hits+1);entry.flashUntil=_nowMs()+120;
 entry.button.dataset.hits=String(entry.hits);entry.button.classList.add("is-hit");
 const epoch=seaShooterEpoch;setTimeout(()=>{if(epoch===seaShooterEpoch&&entry.button)entry.button.classList.remove("is-hit");},130);
 createSeaHitSpark(x,y);
 const hitRatio=clamp(entry.hits/entry.hitGoal,0,1),pitch=500+620*Math.pow(hitRatio,.72);
 tone(pitch,0,.048,"triangle",.038);if(entry.hits%4===0)tone(Math.min(1480,pitch*1.32),.015,.052,"sine",.027);
 if(entry.hits>=entry.hitGoal)beginSeaTargetBurst(entry);
 return true;
}
function removeSeaShotsForSalvo(salvoId){
 for(let i=seaShots.length-1;i>=0;i--){if(seaShots[i].salvoId===salvoId){seaShots[i].el.remove();seaShots.splice(i,1);}}
}
function updateSeaShots(dt){
 if(!seaShots.length)return;
 const width=window.innerWidth||844;
 for(let index=seaShots.length-1;index>=0;index--){
  const shot=seaShots[index];shot.prevX=shot.x;shot.x+=shot.speed*dt;
  if(shot.companion)shot.y+=(shot.aimY-shot.y)*clamp(dt*8,0,1);
  shot.el.style.transform="translate3d("+shot.x.toFixed(2)+"px,"+shot.y.toFixed(2)+"px,0) translate(-50%,-50%)";
  if(shot.x>width+28){shot.el.remove();seaShots.splice(index,1);continue;}
  if(seaBossShotHits(shot)&&hitSeaBoss(shot.salvoId,shot.x,shot.y)){
   removeSeaShotsForSalvo(shot.salvoId);return;
  }
  if(seaBubbleLaunchPending||answerLocked)continue;
  const targetEntry=seaBubbleOptions.find(entry=>{
   if(!entry.button||entry.button.disabled||entry.button.classList.contains("dim")||entry.bursting)return false;
   const crossed=shot.x+8>=entry.x-entry.radius&&shot.prevX-8<=entry.x+entry.radius;
   return crossed&&Math.abs(shot.y-entry.y)<=entry.radius+6;
  });
  if(targetEntry&&hitSeaAnswerTarget(targetEntry,shot.salvoId,shot.x,shot.y)){
   removeSeaShotsForSalvo(shot.salvoId);
   return;
  }
 }
}
function beginSeaTargetBurst(entry){
 if(!entry||!seaRoundPlayable()||seaBubbleLaunchPending||answerLocked||driving||!quiz.classList.contains("show")||entry.button.disabled||entry.button.classList.contains("dim"))return;
 seaBubbleLaunchPending=true;entry.bursting=true;stopSeaFiring();cancelSeaPointer();cancelSeaFirePointer();seaMoveKeys.clear();removeAllSeaShots();
 activeChoiceButtons().forEach(choice=>{choice.disabled=true;});
 if(entry.value.ok)seaBubbleOptions.forEach(other=>{if(other!==entry)other.button.classList.add("is-dismissed");});
 entry.button.classList.remove("is-taut");entry.button.classList.add("is-tensing");
 tone(720,0,.08,"sine",.06);tone(920,.055,.1,"triangle",.055);
 const epoch=seaShooterEpoch;
 const finish=()=>{
  seaBubbleLaunchTimer=0;
  if(epoch!==seaShooterEpoch||!entry.button.isConnected||!quiz.classList.contains("show")||!document.body.classList.contains("sea-quiz-active"))return;
  entry.button.classList.remove("is-tensing","is-bursting");entry.button.classList.add(entry.value.ok?"is-popped":"is-repelled");
  onPick(entry.button,entry.value);
  if(entry.value.ok){
   seaShooterResumeTimer=setTimeout(()=>{seaShooterResumeTimer=0;if(epoch===seaShooterEpoch)clearSeaBubbleGame();},420);
  }else{
   seaShooterResumeTimer=setTimeout(()=>{
    seaShooterResumeTimer=0;if(epoch!==seaShooterEpoch||!quiz.classList.contains("show"))return;
    seaBubbleLaunchPending=false;entry.bursting=false;
    activeChoiceButtons().forEach(choice=>{if(!choice.classList.contains("dim"))choice.disabled=false;});
   },620);
  }
 };
 if(!entry.value.ok){
  entry.button.classList.remove("is-tensing");entry.button.classList.add("is-repelled");tone(260,0,.12,"sine",.055);tone(190,.08,.16,"triangle",.04);
  if(seaReducedMotion())finish();else seaBubbleLaunchTimer=setTimeout(finish,220);return;
 }
 const explode=()=>{
  seaBubbleLaunchTimer=0;
  if(epoch!==seaShooterEpoch||!entry.button.isConnected)return;
  entry.button.classList.remove("is-tensing");entry.button.classList.add("is-bursting");createSeaBurstParticles(entry);
  tone(170,0,.18,"sine",.085);tone(360,.025,.16,"triangle",.06);tone(1040,.04,.1,"triangle",.075);tone(1320,.09,.16,"sine",.06);tone(1660,.14,.18,"triangle",.04);
  seaBubbleLaunchTimer=setTimeout(finish,SEA_BURST_VISUAL_MS);
 };
 if(seaReducedMotion())finish();else seaBubbleLaunchTimer=setTimeout(explode,SEA_BURST_TENSION_MS);
}
function startSeaKeyboardTargetFire(button,o){
 const entry=seaBubbleOptions.find(item=>item.button===button&&item.value===o);
 if(!entry||!seaShooterActive()||button.disabled||button.classList.contains("dim"))return;
 ensureAC();seaKeyboardAim=entry;seaKeyboardAimStartedAt=_nowMs();seaSteerUsed=true;setSeaFireSource("auto",true);
 announce(o.t+"を ねらって うつよ");
}
function updateSeaKeyboardAim(now){
 if(!seaKeyboardAim)return;
 if(!seaShooterActive()||seaKeyboardAim.button.disabled||seaKeyboardAim.button.classList.contains("dim")||now-seaKeyboardAimStartedAt>6000){
  seaKeyboardAim=null;seaKeyboardAimStartedAt=0;setSeaFireSource("auto",false);return;
 }
 setSeaSteerTarget(NaN,seaKeyboardAim.y,seaReducedMotion());
}
function updateSeaKeyboardMovement(dt){
 if(!seaMoveKeys.size||!seaControlAvailable())return;
 const left=seaMoveKeys.has("ArrowLeft")||seaMoveKeys.has("KeyA"),right=seaMoveKeys.has("ArrowRight")||seaMoveKeys.has("KeyD");
 const up=seaMoveKeys.has("ArrowUp")||seaMoveKeys.has("KeyW"),down=seaMoveKeys.has("ArrowDown")||seaMoveKeys.has("KeyS");
 const axisX=(right?1:0)-(left?1:0),axisY=(down?1:0)-(up?1:0);
 const magnitude=Math.hypot(axisX,axisY)||1;
 const speed=clamp(Math.min(window.innerWidth||844,window.innerHeight||390)*.55,180,360);
 const dx=axisX/magnitude*speed*dt,dy=axisY/magnitude*speed*dt;
 if(dx||dy)nudgeSeaSteerTarget(dx,dy);
}
function handleSeaPointerDown(ev){
 if(!seaControlAvailable()||seaSteerPointerId!==null||ev.isPrimary===false||(ev.pointerType==="mouse"&&ev.button!==0))return;
 ev.preventDefault();
 ensureAC();seaSteerPointerId=ev.pointerId;seaSteerUsed=true;
 if(seaSteerHint)seaSteerHint.hidden=true;
 try{seaSteerSurface.setPointerCapture(ev.pointerId);}catch(_){}
 setSeaSteerTarget(ev.clientX,ev.clientY,seaReducedMotion());
 if(seaShooterActive())setSeaFireSource("steer",true);
}
function handleSeaPointerMove(ev){
 if(ev.pointerId!==seaSteerPointerId)return;
 ev.preventDefault();setSeaSteerTarget(ev.clientX,ev.clientY,false);
}
function handleSeaPointerUp(ev){
 if(ev.pointerId!==seaSteerPointerId)return;
 ev.preventDefault();setSeaSteerTarget(ev.clientX,ev.clientY,seaReducedMotion());
 cancelSeaPointer();
}
function handleSeaPointerCancel(ev){
 if(ev.pointerId===seaSteerPointerId)cancelSeaPointer();
}
function handleSeaFirePointerDown(ev){
 if(!seaShooterActive()||seaFirePointerId!==null||ev.isPrimary===false||(ev.pointerType==="mouse"&&ev.button!==0))return;
 ev.preventDefault();ensureAC();seaFirePointerId=ev.pointerId;
 try{seaFireButton.setPointerCapture(ev.pointerId);}catch(_){}
 setSeaFireSource("button",true);
}
function handleSeaFirePointerUp(ev){
 if(ev.pointerId!==seaFirePointerId)return;
 ev.preventDefault();cancelSeaFirePointer();
}
function handleSeaFirePointerCancel(ev){if(ev.pointerId===seaFirePointerId)cancelSeaFirePointer();}
function handleSeaFireClick(ev){
 if(ev.detail!==0){ev.preventDefault();return;}
 if(!seaShooterActive())return;
 ensureAC();setSeaFireSource("assist",true);clearTimeout(seaAssistFireTimer);
 seaAssistFireTimer=setTimeout(()=>{seaAssistFireTimer=0;setSeaFireSource("assist",false);},SEA_ASSIST_FIRE_MS);
}
function handleSeaKeyDown(ev){
 if(ev.target&&ev.target.classList&&ev.target.classList.contains("sea-answer-bubble"))return;
 const code=ev.code||ev.key;
 const movement=["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","KeyA","KeyD","KeyW","KeyS"];
 if(movement.includes(code)&&seaControlAvailable()){
  ev.preventDefault();seaMoveKeys.add(code);seaSteerUsed=true;return;
 }
 if((code==="Space"||ev.key===" ")&&seaShooterActive()){
  ev.preventDefault();ensureAC();setSeaFireSource("keyboard",true);
 }
}
function handleSeaKeyUp(ev){
 if(ev.target&&ev.target.classList&&ev.target.classList.contains("sea-answer-bubble"))return;
 const code=ev.code||ev.key;
 seaMoveKeys.delete(code);
 if(code==="Space"||ev.key===" "){ev.preventDefault();setSeaFireSource("keyboard",false);}
}
function pauseSeaInput(){
 cancelSeaPointer();cancelSeaFirePointer();stopSeaFiring();seaMoveKeys.clear();removeAllSeaShots();
}
function handleSeaViewportChange(){
 if(!isSeaStage())return;
 pauseSeaInput();seaTrail=[];
 if(seaRoundPhase==="ready"||seaRoundPhase==="go")positionSeaArenaStart();else clampSeaSteerOffsets();
 updateSeaAnswerTargets(_nowMs());updateSeaBossVisual(_nowMs());
}
function renderSeaSteering(){
 const now=_nowMs();
 const dt=seaShooterFrameAt?clamp((now-seaShooterFrameAt)/1000,0,.05):0;
 seaShooterFrameAt=now;
 const active=seaControlAvailable(),shooter=seaShooterActive();
 document.body.classList.toggle("sea-steer-active",active);
 if(seaSteerHint){
  illustratedText(seaSteerHint,"touch","タッチした ばしょへ うごくよ","steer-hint-art");
  seaSteerHint.hidden=!active||seaSteerUsed||quiz.classList.contains("show");
 }
 if(seaFireButton){
  seaFireButton.hidden=!shooter;
  if(shooter){
   const quizRect=quiz.getBoundingClientRect();
   seaFireButton.style.bottom=Math.max(9,(window.innerHeight||390)-quizRect.top+8)+"px";
  }
  seaFireButton.classList.toggle("is-firing",shooter&&seaFireSources.size>0);
 }
 if(!isSeaStage()||!vehicleSteerShell)return;
 updateSeaAnswerTargets(now);
 updateSeaKeyboardMovement(dt);
 updateSeaKeyboardAim(now);
 clampSeaSteerOffsets();
 if(seaReducedMotion())snapSeaReducedMotion();
 else{
  const ease=clamp(dt*9,.12,.34);
  steerX+=(steerTargetX-steerX)*ease;steerY+=(steerTargetY-steerY)*ease;
 }
 if(Math.abs(steerTargetX-steerX)<.08)steerX=steerTargetX;
 if(Math.abs(steerTargetY-steerY)<.08)steerY=steerTargetY;
 applySeaSteerVisual();collectSeaRareCollision();renderSeaCompanions(now);
 if(shooter&&seaFireSources.size>0&&(seaLastVolleyAt===0||now-seaLastVolleyAt>=SEA_FIRE_INTERVAL_MS))spawnSeaVolley(now);
 updateSeaShots(dt);updateSeaBossEnemyShots(now,dt);
}
function activeChoiceButtons(){
 if(document.body.classList.contains("sea-quiz-active")&&seaAnswerLayer)return [...seaAnswerLayer.querySelectorAll(".sea-answer-bubble")];
 if(document.body.classList.contains("future-capsule-active")&&futureCapsuleLayer)return [...futureCapsuleLayer.querySelectorAll(".future-capsule-lane")];
 if(document.body.classList.contains("space-galaxy-active")&&spaceGalaxyLayer)return [...spaceGalaxyLayer.querySelectorAll(".space-galaxy-planet-choice")];
 return [...choicesEl.querySelectorAll(".choice")];
}
function renderSeaBubbleGame(){
 const opts=seaQuestionOptions(cur);
 document.body.classList.add("sea-quiz-active");quiz.classList.add("sea-quiz");choicesEl.classList.add("sea-mode");
 choicesEl.setAttribute("aria-label","せんすいかんで こたえを うちぬく");
 seaAnswerLayer.replaceChildren();seaBubbleOptions=[];seaSalvoHits.clear();seaLastVolleyAt=0;
 const layout=[[.79,.25],[.79,.75]];
 const viewportWidth=window.innerWidth||844,viewportHeight=window.innerHeight||390;
 const baseSize=clamp(Math.min(window.innerWidth||844,window.innerHeight||390)*.12,64,96);
 opts.forEach((o,index)=>{
  const button=document.createElement("button");button.type="button";button.className="sea-answer-bubble";
  button.disabled=true;
  button.dataset.ok=o.ok?"1":"0";button.dataset.hits="0";button.setAttribute("aria-label",o.ok?("あわの なかで ちいさくされた "+o.t+"を ねらって うつ"):("にせものの あわ "+o.t));
  const size=clamp(baseSize+[-3,3][index],64,96);button.style.setProperty("--sea-target-size",size.toFixed(1)+"px");
  button.style.setProperty("--sea-target-hue",String(184+index*24));
  const visual=document.createElement("span");visual.className="sea-answer-visual";
  const art=createQuizArt(o.e,o.t,"sea-captive");
  const label=document.createElement("span");label.className="lb";label.textContent=o.t;
  visual.append(art,label);button.appendChild(visual);
  bindTap(button,()=>startSeaKeyboardTargetFire(button,o));
  seaAnswerLayer.appendChild(button);
  const period=[5.8,5.1,4.5][level]||5.1;
  seaBubbleOptions.push({
   button,value:o,index,baseX:layout[index][0],baseY:layout[index][1],size,
   ampX:clamp(viewportWidth*(.045+index*.012),26,58),ampY:clamp(viewportHeight*(.045+index*.014),14,29),
   rate:Math.PI*2/(period-index*.22),phase:(qSeg+1)*.63+index*2.07,
   rotation:2.2+index*.7,hits:0,hitGoal:SEA_TARGET_HIT_GOALS[level]||4,flashUntil:0,scale:1,radius:size*.43,x:0,y:0,bursting:false
  });
 });
 startSeaRoundCountdown();
 if(seaFireButton)seaFireButton.hidden=true;
}
if(seaSteerSurface){
 seaSteerSurface.addEventListener("pointerdown",handleSeaPointerDown);
 seaSteerSurface.addEventListener("pointermove",handleSeaPointerMove);
 seaSteerSurface.addEventListener("pointerup",handleSeaPointerUp);
 seaSteerSurface.addEventListener("pointercancel",handleSeaPointerCancel);
 seaSteerSurface.addEventListener("lostpointercapture",handleSeaPointerCancel);
}
if(seaFireButton){
 seaFireButton.addEventListener("pointerdown",handleSeaFirePointerDown);
 seaFireButton.addEventListener("pointerup",handleSeaFirePointerUp);
 seaFireButton.addEventListener("pointercancel",handleSeaFirePointerCancel);
 seaFireButton.addEventListener("lostpointercapture",handleSeaFirePointerCancel);
 seaFireButton.addEventListener("click",handleSeaFireClick);
}
window.addEventListener("keydown",handleSeaKeyDown);
window.addEventListener("keyup",handleSeaKeyUp);
function handleFutureCapsuleKeyDown(event){
 if(!futureCraneScreenActive()||event.defaultPrevented)return;
 const target=event.target,board=target&&typeof target.closest==="function"?target.closest(".future-capsule-board"):null;
 const isArrow=event.key==="ArrowUp"||event.key==="ArrowDown"||event.key==="ArrowLeft"||event.key==="ArrowRight";
 const isAction=event.code==="Space"||event.key===" ";
 if(event.key==="Escape"&&futureCranePhase!=="seek"){
  if(futureCapsuleResolving)return;
  event.preventDefault();cancelFutureCraneInteraction("だいじょうぶ。もう いちど！");return;
 }
 if(!board)return;
 if(answerLocked||futureCapsuleResolving||futureCranePhase==="auto-lift"||futureCranePhase==="auto-rise"||futureCranePhase==="returning"||futureCranePhase==="resolving"||futureCranePhase==="complete"){
  if(isArrow||isAction)event.preventDefault();return;
 }
 if(isArrow){
  event.preventDefault();
  if(event.key==="ArrowUp"||event.key==="ArrowDown"){futureCapsuleGuide("ハンドルは ひだりと みぎで まわすよ");return;}
  if(event.repeat)return;
  const angle=event.shiftKey?FUTURE_CRANE_KEY_FAST_ANGLE:FUTURE_CRANE_KEY_ANGLE;
  futureCraneKeyboardActive=true;prepareFutureCraneSnapDeparture();turnFutureCraneByAngle((event.key==="ArrowRight"?1:-1)*angle);
  return;
 }
 if(event.key==="Enter"&&!event.repeat&&futureCranePhase==="grip"){
  event.preventDefault();performFutureCraneGripTap();return;
 }
 if(!isAction||event.repeat)return;
 event.preventDefault();
 futureCraneKeyboardActive=true;futureCraneKeyboardActionHeld=true;startFutureCraneAction("keyboard");
}
function handleFutureCapsuleKeyUp(event){
 if((event.code!=="Space"&&event.key!==" ")||!futureCraneKeyboardActionHeld)return;
 event.preventDefault();futureCraneKeyboardActionHeld=false;finishFutureCraneAction(false,"keyboard");
}
window.addEventListener("keydown",handleFutureCapsuleKeyDown);
window.addEventListener("keyup",handleFutureCapsuleKeyUp);
function handleSpaceGalaxyKeyDown(event){
 if(!spaceGalaxyPlayable()||event.defaultPrevented)return;
 const target=event.target,inside=target&&typeof target.closest==="function"?target.closest(".space-galaxy-planet-choice"):null;
 const engine=target&&typeof target.closest==="function"?target.closest(".space-galaxy-engine"):null;
 if(!inside&&!engine&&target&&typeof target.matches==="function"&&target.matches("button,a,input,select,textarea,[contenteditable='true']"))return;
 if(!engine&&(event.key==="ArrowUp"||event.key==="ArrowDown")){
  event.preventDefault();const enabled=spaceGalaxyOptions.filter(entry=>!entry.button.disabled);if(!enabled.length)return;
  const current=enabled.findIndex(entry=>entry.button===inside),direction=event.key==="ArrowUp"?-1:1;
  const entry=enabled[(current+direction+enabled.length)%enabled.length];spaceGalaxyKeyboardTarget=entry.index;entry.button.focus({preventScroll:true});
  return;
 }
 if(engine&&(event.key==="ArrowLeft"||event.key==="ArrowRight"||event.code==="Space"||event.key===" "||event.key==="Enter")&&!event.repeat){
  event.preventDefault();windSpaceGalaxy(event.key==="ArrowLeft"?-Math.PI/2:Math.PI/2);
 }
}
window.addEventListener("keydown",handleSpaceGalaxyKeyDown);
window.addEventListener("pointermove",handleSpaceGalaxyPointerMove,{passive:false});
window.addEventListener("pointerup",finishSpaceGalaxyPointer,{passive:true});
window.addEventListener("pointercancel",finishSpaceGalaxyPointer,{passive:true});

function buildSeaFish(){
 seaFishSprites=[];
 if(!seaFishLayer)return;
 seaFishLayer.innerHTML="";
 const st=STAGES[stg];
 const fish=(st&&st.id==="sea"&&st.assets&&st.assets.fish)||[];
 if(!fish.length)return;
 const count=seaReducedMotion()?6:(IOS_DEVICE?10:14);
 for(let i=0;i<count;i++){
  const el=document.createElement("div");
  const img=fish[i%fish.length];
  const size=3.8+(i%5)*.55+(i%2)*.25;
  const y=17+((i*13)%42);
  const baseX=(i*23)%142;
  const dir=i%3===0?1:-1;
  el.className="sea-fish";
  el.style.backgroundImage=bgUrl(img);
  el.style.setProperty("--fish-w",size.toFixed(2)+"vw");
  el.style.setProperty("--fish-ratio",(1.22+(i%4)*.05).toFixed(2));
  el.style.setProperty("--fish-opacity",(0.58+(i%4)*.09).toFixed(2));
  seaFishLayer.appendChild(el);
  seaFishSprites.push({
   el,
   baseX,
   y,
   dir,
   depth:.12+(i%5)*.045,
   speed:1.8+(i%6)*.42,
   bob:.45+(i%4)*.17,
   bobRate:.65+(i%5)*.12,
   phase:i*.83
  });
 }
}
function renderSeaFish(now){
 if(!seaFishSprites.length)return;
 const t=((now||_nowMs())/1000);
 const reduced=seaReducedMotion();
 seaFishSprites.forEach(f=>{
  const swim=reduced?0:t*f.speed*f.dir;
  let x=f.baseX-worldX*f.depth+swim;
  x=((x+20)%150+150)%150-20;
  const bob=reduced?0:Math.sin(t*f.bobRate+f.phase)*f.bob;
  const y=f.y+bob;
  const flip=f.dir>0?-1:1;
  f.el.style.transform="translate3d("+cssXFromVw(x)+","+cssYFromVh(y)+",0) scaleX("+flip+")";
 });
}

function buildSeaHabitat(){
 seaHabitatSprites=[];
 if(!seaHabitatLayer)return;
 seaHabitatLayer.replaceChildren();
 const st=STAGES[stg];
 if(window.__PONO_TIER_LOCKED__||!st||st.id!=="sea"||!st.assets||!st.assets.habitat)return;
 [
  {kind:"moray",cell:0,baseX:10,depth:.78},
  {kind:"seahorse",cell:1,baseX:48,depth:.84},
  {kind:"clownfish",cell:2,baseX:86,depth:.8}
 ].forEach((spec,index)=>{
  const sprite=document.createElement("span");sprite.className="sea-habitat-creature sea-habitat-"+spec.kind;
  const art=document.createElement("span");art.className="sea-habitat-art";art.style.backgroundImage=bgUrl(st.assets.habitat);
  art.style.setProperty("--sea-habitat-cell",String(spec.cell));art.style.setProperty("--sea-habitat-delay",(-index*.9)+"s");
  sprite.appendChild(art);seaHabitatLayer.appendChild(sprite);seaHabitatSprites.push({sprite,baseX:spec.baseX,depth:spec.depth});
 });
}
function renderSeaHabitat(){
 if(!seaHabitatSprites.length||!isSeaStage()||tunnelInteriorMode)return;
 const local=worldX-origin(stg);
 seaHabitatSprites.forEach(item=>{
  let x=item.baseX-local*item.depth;
  x=((x+24)%132+132)%132-24;
  item.sprite.style.transform="translate3d("+cssXFromVw(x)+",0,0)";
 });
}

function buildJungleAnimals(){
 jungleAnimalSprites=[];
 lastJungleAnimalRenderKey="";
 Object.values(jungleAnimalLayers).forEach(layer=>{if(layer)layer.replaceChildren();});
 if(window.__PONO_TIER_LOCKED__)return;
 const st=STAGES[stg];
 const animalAssets=st&&st.id==="jungle"&&st.assets&&st.assets.animals;
 if(!animalAssets)return;
 const layerNames=["far","mid","near"];
 layerNames.forEach((layerName,layerIndex)=>{
  const layer=jungleAnimalLayers[layerName];
  const layout=JUNGLE_ANIMAL_LAYOUT[layerName]||[];
  if(!layer||!layout.length)return;
  const limit=IOS_DEVICE?Math.min(5,layout.length):layout.length;
  const fragment=document.createDocumentFragment();
  layout.slice(0,limit).forEach((spec,index)=>{
   const src=animalAssets[spec.asset];
   if(!src)return;
   const sprite=document.createElement("span");
   const art=document.createElement("img");
   const frameClip=spec.frames>1?document.createElement("span"):null;
   const move=layerName==="far"?1.5:(layerName==="mid"?2.6:3.5);
   sprite.className="jungle-animal-sprite"+(frameClip?" has-frame-sheet":"");
   sprite.dataset.animalDepth=layerName;
   sprite.dataset.animalSpecies=spec.species;
   sprite.dataset.animalId=spec.id||spec.species;
   sprite.dataset.animalRole=spec.role||"ambient";
   sprite.dataset.animalAnchor=spec.anchor;
   sprite.dataset.animalAnchorY=String(spec.anchorY);
   sprite.style.setProperty("--animal-width",spec.wCss||spec.w+"vmin");
   sprite.style.setProperty("--animal-min",spec.min+"px");
   sprite.style.setProperty("--animal-max",spec.max+"px");
   sprite.style.setProperty("--animal-opacity",String(spec.opacity));
   art.className="jungle-animal-art"+(frameClip?" jungle-animal-frame-sheet":" motion-"+spec.motion)+(Number.isFinite(spec.fixedFrame)?" is-fixed-frame":"");
   art.src=src;art.alt="";art.draggable=false;art.decoding="async";
   const motionTarget=frameClip||art;
   motionTarget.style.setProperty("--animal-duration",(5.6+((index*17+layerIndex*11)%34)/10).toFixed(1)+"s");
   motionTarget.style.setProperty("--animal-delay",(-(index*.93+layerIndex*.61)).toFixed(2)+"s");
   motionTarget.style.setProperty("--animal-move-x",(move*(index%2?-.55:.45)).toFixed(1)+"px");
   motionTarget.style.setProperty("--animal-move-y",(Number.isFinite(spec.moveY)?spec.moveY:-move).toFixed(1)+"px");
   motionTarget.style.setProperty("--animal-rotate",(layerName==="far"?.65:(layerName==="mid"?.85:1.05))+"deg");
   if(spec.origin)motionTarget.style.setProperty("--animal-origin",spec.origin);
   if(frameClip){
    frameClip.className="jungle-animal-frame motion-"+spec.motion;
    art.style.setProperty("--animal-frame-duration",(spec.frameDuration||3.2)+"s");
    if(Number.isFinite(spec.fixedFrame))art.style.setProperty("--animal-fixed-frame",(-33.3333*spec.fixedFrame)+"%");
    frameClip.appendChild(art);sprite.appendChild(frameClip);
   }else sprite.appendChild(art);
   fragment.appendChild(sprite);
   jungleAnimalSprites.push({el:sprite,id:spec.id||spec.species,role:spec.role||"ambient",baseX:spec.x,stageX:spec.stageX,align:spec.align||"left",inset:spec.inset||0,y:spec.y,anchorY:Number.isFinite(spec.anchorY)?spec.anchorY:0,depth:spec.depth,flip:spec.flip||1,loop:spec.loop||"world"});
  });
  layer.appendChild(fragment);
 });
}
function renderJungleAnimals(){
 if(!jungleAnimalSprites.length||tunnelInteriorMode||!document.body.classList.contains("st-jungle"))return;
 const localWorldX=worldX-origin(stg);
 const renderKey=localWorldX.toFixed(3)+"|"+(window.innerWidth||0)+"x"+(window.innerHeight||0);
 if(renderKey===lastJungleAnimalRenderKey)return;
 lastJungleAnimalRenderKey=renderKey;
 const midPeriod=((window.innerHeight||1)*JUNGLE_MID_TILE_ASPECT*JUNGLE_MID_TILE_SCALE/(window.innerWidth||1))*100;
 jungleAnimalSprites.forEach(animal=>{
  if(animal.loop==="stage"){
   const widthVw=(animal.el.offsetWidth/(window.innerWidth||1))*100;
   const homeX=animal.align==="right"?100-animal.inset-widthVw:animal.inset;
   const x=homeX+(animal.stageX-localWorldX)*animal.depth;
   animal.el.style.visibility=(x+widthVw<-12||x>112)?"hidden":"visible";
   animal.el.style.transform="translate3d("+cssXFromVw(x)+","+cssYFromVh(animal.y)+",0) translateY(-"+animal.anchorY+"%) scaleX("+animal.flip+")";
   return;
  }
  animal.el.style.visibility="visible";
  const period=animal.loop==="mid"?midPeriod:128;
  const baseX=animal.loop==="mid"?animal.baseX/128*period:animal.baseX;
  const scrollX=animal.loop==="mid"?worldX:localWorldX;
  let x=baseX-scrollX*animal.depth;
  x=((x+18)%period+period)%period-18;
  animal.el.style.transform="translate3d("+cssXFromVw(x)+","+cssYFromVh(animal.y)+",0) translateY(-"+animal.anchorY+"%) scaleX("+animal.flip+")";
 });
}

function jungleFlightReducedMotion(){
 try{return !!(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches);}catch(_){return false;}
}
function jungleFlightRandom(min,max){return min+(max-min)*Math.random();}
function jungleFlightVariants(type){
 const st=STAGES[stg],flight=st&&st.id==="jungle"&&st.assets&&st.assets.flight;
 if(!flight)return [];
 return type==="bird"?(flight.birds||[]):(flight.butterflies||[]);
}
function nextJungleFlightVariant(type){
 const variants=jungleFlightVariants(type);
 if(!variants.length)return null;
 if(!jungleFlightBags[type].length){
  const bag=shuffle(variants);
  if(bag.length>1&&bag[0].id===jungleFlightLast[type]){
   const swap=bag[0];bag[0]=bag[1];bag[1]=swap;
  }
  jungleFlightBags[type]=bag;
 }
 const variant=jungleFlightBags[type].shift();
 jungleFlightLast[type]=variant.id;
 return variant;
}
function prepareJungleFlightVariant(flight,type){
 const variant=nextJungleFlightVariant(type);
 if(!variant||!flight)return null;
 flight.variant=variant;
 flight.speedScale=variant.speed||1;
 flight.el.dataset.flightType=type;
 flight.el.dataset.flightSpecies=variant.id;
 flight.el.style.width=variant.width||"";
 const sheet=flight.el.querySelector(".jungle-flight-sheet");
 if(sheet&&sheet.getAttribute("src")!==variant.src)sheet.src=variant.src;
 return variant;
}
function resetJungleFlight(flight,now,initial){
 flight.active=false;
 flight.el.hidden=true;
 flight.el.classList.remove("is-flying");
 if(!initial||!flight.variant)prepareJungleFlightVariant(flight,flight.type);
 const gap=flight.type==="bird"?(initial?[2000,5000]:[5000,10000]):(initial?[1000,4000]:[6000,13000]);
 flight.nextAt=now+jungleFlightRandom(gap[0],gap[1]);
}
function buildJungleFlights(){
 jungleFlightSprites=[];lastJungleFlightRenderAt=0;
 jungleFlightBags.bird=[];jungleFlightBags.butterfly=[];
 Object.values(jungleFlightLayers).forEach(layer=>{if(layer)layer.replaceChildren();});
 if(window.__PONO_TIER_LOCKED__||jungleFlightReducedMotion())return;
 const st=STAGES[stg];
 const assets=st&&st.id==="jungle"&&st.assets&&st.assets.flight;
 if(!assets)return;
 const now=_nowMs();
 [
  {type:"bird",variants:assets.birds,layer:jungleFlightLayers.bird},
  {type:"butterfly",variants:assets.butterflies,layer:jungleFlightLayers.butterfly}
 ].forEach(spec=>{
  if(!spec.variants||!spec.variants.length||!spec.layer)return;
  const sprite=document.createElement("span");
  const sheet=document.createElement("img");
  sprite.className="jungle-flight jungle-flight-"+spec.type;
  sprite.dataset.flightType=spec.type;
  sprite.hidden=true;
  sheet.className="jungle-flight-sheet";
  sheet.alt="";sheet.draggable=false;sheet.decoding="async";
  sprite.appendChild(sheet);spec.layer.appendChild(sprite);
  const flight={type:spec.type,el:sprite,active:false,sceneActive:false,nextAt:now};
  prepareJungleFlightVariant(flight,spec.type);
  jungleFlightSprites.push(flight);
 });
}
function beginJungleFlight(flight,now){
 const bird=flight.type==="bird";
 const direction=bird?-1:(Math.random()<.5?-1:1);
 const startX=direction<0?112:-18;
 const endX=direction<0?-18:112;
 const speed=(bird?jungleFlightRandom(9,13):jungleFlightRandom(5.5,8))*(flight.speedScale||1);
 flight.direction=direction;
 flight.startX=startX;flight.endX=endX;
 flight.baseY=bird?jungleFlightRandom(18,38):jungleFlightRandom(22,56);
 flight.amplitude=bird?jungleFlightRandom(.8,1.4):jungleFlightRandom(4,5);
 flight.slowAmplitude=bird?0:jungleFlightRandom(2,3);
 flight.waveCycles=bird?jungleFlightRandom(2.2,3.6):jungleFlightRandom(4.2,6.4);
 flight.startAt=now;
 flight.duration=Math.abs(endX-startX)/speed*1000;
 flight.active=true;
 flight.el.hidden=false;
 flight.el.classList.add("is-flying");
}
function renderJungleFlights(now){
 if(!jungleFlightSprites.length)return;
 const tick=Number.isFinite(now)?now:_nowMs();
 const sceneActive=playing&&!tunnelInteriorMode&&!document.hidden&&STAGES[stg]&&STAGES[stg].id==="jungle";
 jungleFlightSprites.forEach(flight=>{
  if(!sceneActive){
   if(flight.sceneActive){flight.sceneActive=false;resetJungleFlight(flight,tick,true);}
   return;
  }
  if(!flight.sceneActive){flight.sceneActive=true;resetJungleFlight(flight,tick,true);}
 });
 if(!sceneActive)return;
 if(IOS_DEVICE&&tick-lastJungleFlightRenderAt<32)return;
 lastJungleFlightRenderAt=tick;
 jungleFlightSprites.forEach(flight=>{
  if(!flight.active){if(tick>=flight.nextAt)beginJungleFlight(flight,tick);else return;}
  const progress=Math.max(0,Math.min(1,(tick-flight.startAt)/flight.duration));
  if(progress>=1){resetJungleFlight(flight,tick,false);return;}
  let x=flight.startX+(flight.endX-flight.startX)*progress;
  let y=flight.baseY;
  let rotation=0;
  if(flight.type==="bird"){
   y+=Math.sin(progress*Math.PI*2*flight.waveCycles)*flight.amplitude;
  }else{
   y+=Math.sin(progress*Math.PI*2*flight.waveCycles)*flight.amplitude;
   y+=Math.sin(progress*Math.PI*2*1.7+.8)*flight.slowAmplitude;
   x+=Math.sin(progress*Math.PI*2*2.3)*1.4;
   rotation=Math.sin(progress*Math.PI*2*flight.waveCycles)*4;
  }
  const flip=flight.direction>0?-1:1;
  flight.el.style.transform="translate3d("+cssXFromVw(x)+","+cssYFromVh(y)+",0) rotate("+rotation.toFixed(2)+"deg) scaleX("+flip+")";
 });
}

/* ================= passengers ================= */
function carGap(){return STAGES[stg]&&STAGES[stg].veh==="train"?trainCarVisualWidthVw():8.8;}
function visibleCarGroups(){
 const groupSize=STAGES[stg]&&STAGES[stg].veh==="train"?4:2;
 const start=Math.max(0,cars.length-groupSize*3);
 const aligned=start%groupSize?start-(start%groupSize):start;
 const groups=[];
 for(let i=aligned;i<cars.length;i+=groupSize)groups.push(cars.slice(i,i+groupSize));
 return groups.slice(-3);
}
function renderPassengerSeat(c,seatName){
 const seat=document.createElement("div");
 seat.className="car-seat "+seatName;
 if(c&&c.pending){
  seat.classList.add("pending-seat");
  return seat;
 }
 if(c.img){
  const im=document.createElement("img");
  im.className="pas-img";im.src=c.img;im.alt="";
  seat.appendChild(im);
 }else seat.appendChild(createQuizArt(c.e,passengerLabel(c)||"ともだち","pas passenger-art"));
 return seat;
}
function renderCars(){
 const restartRollingCars=IOS_DEVICE&&carsEl.classList.contains("go");
 carsEl.innerHTML="";
 const groups=visibleCarGroups();
 groups.forEach((group,i)=>{
  const idx=groups.length-1-i; // 0=newest group (先頭車のすぐ後ろ)
  const el=document.createElement("div");el.className="car";
  el.style.left=(vehicleLeftVw()-carGap()*(idx+1))+"vw";
  const seatNames=STAGES[stg]&&STAGES[stg].veh==="train"?["seat-d","seat-c","seat-b","seat-a"]:["seat-a","seat-b"];
  group.forEach((c,seat)=>el.appendChild(renderPassengerSeat(c,seatNames[seat]||"seat-a")));
  const body=document.createElement("div");
  body.className="car-body-img";
  el.appendChild(body);
  (STAGES[stg]&&STAGES[stg].veh==="train"?["a","b","c"]:["a","b"]).forEach(k=>{
   const w=document.createElement("div");
   w.className="car-wheel car-wheel-"+k;
   el.appendChild(w);
  });
  if(cars.length>8&&i===0)el.classList.add("fade");
  carsEl.appendChild(el);
 });
 const realCount=cars.filter(c=>!c.pending).length;
 carBadge.style.display=realCount?"flex":"none";
 illustratedCounter(carBadge,"friends",realCount,"hud-counter-art");
 carBadge.setAttribute("aria-label","ともだち "+realCount+"にん");
 // iOS Safari は .go の付いた親へ車輪を後挿入すると、まれに新しい客車だけ
 // CSS animation が開始されない。走行中の再描画時だけ selector を再評価させる。
 if(restartRollingCars){
  carsEl.classList.remove("go");void carsEl.offsetWidth;
  requestAnimationFrame(()=>{
   if(playing&&driving&&document.body.classList.contains("v-train"))carsEl.classList.add("go");
  });
 }
}
function passengerSeatTargetAt(index){
 if(STAGES[stg]&&STAGES[stg].veh==="train"){
  const seatCenters=[.755,.585,.415,.245];
  const carLeft=vehicleLeftVw()-carGap();
  const x=carLeft+trainCarWidthVw()*seatCenters[index%4];
  const y=trainBottomVh()+trainCarHeightVh()*.37;
  return {left:x+"vw",bottom:y+"vh"};
 }
 if(isSeaStage()&&vehicleSteerShell){
  const viewportWidth=window.innerWidth||844,viewportHeight=window.innerHeight||390;
  const shellRect=vehicleSteerShell.getBoundingClientRect();
  const gap=clamp(viewportWidth*.045,34,52);
  const slot=Math.min(Math.max(0,index),SEA_COMPANION_LIMIT-1)+1;
  const centerX=clamp(shellRect.left+shellRect.width*.42-gap*slot,24,viewportWidth-24);
  const centerY=clamp(shellRect.top+shellRect.height*.54,24,viewportHeight-24);
  return {left:centerX.toFixed(1)+"px",bottom:(viewportHeight-centerY).toFixed(1)+"px"};
 }
 const pendingSeat=carsEl.querySelector(".pending-seat");
 if(pendingSeat){
  const rect=pendingSeat.getBoundingClientRect();
  return {left:(rect.left+rect.width*.5)+"px",bottom:((window.innerHeight||390)-(rect.top+rect.height*.45))+"px"};
 }
 return {left:(vehicleLeftVw()-carGap())+"vw",bottom:"14vh"};
}
function updateScreenExitShift(){
 const active=document.body.classList.contains("tunnel-exit-setup")||
  document.body.classList.contains("tunnel-exit-run")||
  document.body.classList.contains("tunnel-exit-clear");
 const shift=active?(exitPortalBaseWorldX-worldX):0;
 document.documentElement.style.setProperty("--screen-exit-shift-vw",shift.toFixed(2)+"vw");
 document.documentElement.style.setProperty("--screen-exit-shift-x",cssXFromVw(shift));
}
function coverEntryStop(){
 if(!coverEl)return worldX;
 return parseFloat(coverEl.style.left)-TUNNEL_ENTRY_CAMERA_LEFT_VW;
}
function showTunnelRunIn(){
 setDriverMood("happy");
 document.body.classList.remove("tunnel-exit-setup","tunnel-exit-run","tunnel-exit-approach","tunnel-exit-brighten");
 clearMagicPuffs();
 document.body.classList.add("tunnel-enter-run");
 renderPortalMasks(transitCover||coverEl);
 veh.classList.add("go");carsEl.classList.add("go");
 setTimeout(()=>document.body.classList.add("tunnel-fade-dark"),TUNNEL_ENTRY_FADE_DELAY_MS);
 setTimeout(()=>{
  if(!playing||driving||pending!=="tunnelSwitch")return;
  enterTunnelInterior();
 },TUNNEL_ENTRY_SWITCH_MS);
 pending="tunnelSwitch";
}
function enterTunnelInterior(){
 stopStageWeather();setWeatherPresentation("clear");
 if(transitCover){transitCover.remove();transitCover=null;}
 document.body.classList.remove("tunnel-enter-run");
 clearMagicPuffs();
 tunnelInteriorMode=true;
 document.body.classList.add("tunnel-interior");
 world.innerHTML="";tunnels=[];coverEl=null;dropEl=null;
 worldX=origin(stg)+COVER_OFF;
 tunnelFriendStartWorldX=worldX;
 prepareTunnelInteriorBackdrop();
 setTunnelInteriorBackdrop();
 startTunnelFriendGame();
 target=worldX+TUNNEL_INTERIOR_RUN_VW;
 pending="tunnelExit";driving=true;swapReady=false;swapped=false;
 veh.classList.add("go","inTun");veh.classList.remove("idle");
 carsEl.classList.add("go","inTun");
 sndGo();
 setTimeout(()=>{
  if(!playing)return;
  requestAnimationFrame(()=>document.body.classList.remove("tunnel-fade-dark"));
  },TUNNEL_ENTRY_BLACK_HOLD_MS);
}
function startTunnelExitApproach(){
 showTunnelFriendResult();
 veh.classList.add("go","inTun");carsEl.classList.add("go","inTun");
 veh.classList.remove("idle");
 document.body.classList.add("tunnel-exit-approach");
 target=worldX+TUNNEL_EXIT_APPROACH_RUN_VW;
 pending="tunnelExitApproach";
 driving=true;
 sndGo();
}
function finishTunnelInterior(){
 stopStageWeather();setWeatherPresentation("clear");
 clearTunnelFriendGame();
 veh.classList.add("go","inTun");carsEl.classList.add("go","inTun");
 clearMagicPuffs();
 document.body.classList.remove("tunnel-enter-run","tunnel-exit-setup","tunnel-exit-run","tunnel-exit-clear","tunnel-exit-brighten");
 document.body.classList.add("tunnel-fade-dark","tunnel-exit-white");
 setTimeout(()=>{
  if(!playing)return;
  tunnelInteriorMode=false;
  document.body.classList.remove("tunnel-interior","tunnel-exit-approach");
  stg++;resetStageScore();buildQList();qSeg=0;stageMiss=0;rareSpawned=false;
  applySkin();buildWorld(false);drawDots();
  document.body.classList.add("tunnel-fade-dark","tunnel-exit-white","tunnel-exit-setup");
  worldX=origin(stg);target=stops(origin(stg),0);
  exitPortalBaseWorldX=worldX;
  updateScreenExitShift();
  pending="quiz";driving=true;swapReady=false;swapped=false;
  veh.classList.add("go");veh.classList.remove("idle");
  carsEl.classList.add("go");
  sparkOnVeh();sndGo();
  speak("トンネルを ぬけたら、"+STAGES[stg].names[loop%2]+"だ！");
  render();
  void veh.offsetWidth;
  setTimeout(()=>{
   if(!playing)return;
   document.body.classList.remove("tunnel-exit-setup","tunnel-exit-clear");
   document.body.classList.add("tunnel-exit-run","tunnel-exit-brighten");
   requestAnimationFrame(()=>document.body.classList.remove("tunnel-fade-dark"));
   setTimeout(()=>{
    if(!playing)return;
    document.body.classList.add("tunnel-exit-clear");
    setTimeout(()=>{
     if(!playing)return;
     document.body.classList.remove("tunnel-exit-run","tunnel-exit-clear","tunnel-exit-brighten","tunnel-exit-white");
     updateScreenExitShift();
    },TUNNEL_EXIT_CLEAR_MS);
   },TUNNEL_EXIT_RUN_MS);
  },TUNNEL_EXIT_BLACK_HOLD_MS);
 },TUNNEL_EXIT_FADE_SETUP_MS);
}
function beginStageTransit(){
 if(!coverEl)return;
 clearRareEvent();
 resetSeaInteraction();
 resetSpaceSteering();
 stopStageWeather();setWeatherPresentation("clear");
 transitCover=coverEl;
 swapReady=false;swapped=false;
 target=coverEntryStop();
 pending="tunnelEntry";driving=true;
 sndGo();
}
function showDropoff(){
 setDriverMood("happy");
 const hadCars=cars.length>0;
 if(hadCars)prepareTunnelFriends();else tunnelFriendCandidates=[];
 if(dropEl)dropEl.classList.add("open");
 if(hadCars){
  carsEl.classList.add("unloading");
  cars=[];
  carBadge.style.display="none";
  illustratedCounter(carBadge,"friends",0,"hud-counter-art");
  carBadge.setAttribute("aria-label","ともだち 0にん");
  showStamp("みんな またね！","new");
  speak("みんなが えきで おりたよ！");
  setTimeout(()=>{
   renderCars();
   carsEl.classList.remove("unloading");
   if(dropEl)dropEl.classList.add("done");
   sndNew();
  },620);
 }else{
  showStamp("しゅっぱつ！","ok");
 }
 setTimeout(()=>{beginStageTransit();},hadCars?1250:520);
}
function passengerLabel(p){return p.name||p.t||"";}
function boardPassenger(p,learned,stationEl){
 const passenger=typeof p==="object"?p:{e:p,t:learned&&learned[1]};
 const isNew=registerZk(passenger.e,passengerLabel(passenger));
 if(learned)registerZk(learned[0],learned[1]);
 const seatIndex=cars.length;
 const pendingSeat={pending:true,e:"",t:""};
 cars.push(pendingSeat);
 renderCars();
 const fl=document.createElement("div");fl.className="flyer";
 if(passenger.happy||passenger.img||passenger.normal){
  const im=document.createElement("img");
  im.src=passenger.happy||passenger.img||passenger.normal;im.alt="";
  fl.appendChild(im);
 }else fl.appendChild(createQuizArt(passenger.e,passengerLabel(passenger)||"ともだち","flyer-art"));
 const src=stationEl&&(stationEl.classList&&stationEl.classList.contains("sea-answer-bubble")?stationEl:stationEl.querySelector(".station-helper img"));
 if(src){
  const r=src.getBoundingClientRect();
  fl.style.left=(r.left+r.width*.5)+"px";
  fl.style.bottom=(window.innerHeight-r.bottom)+"px";
 }else{
  fl.style.left="50vw";fl.style.bottom="30vh";
 }
 $("app").appendChild(fl);
 const targetSeat=passengerSeatTargetAt(seatIndex);
 requestAnimationFrame(()=>{requestAnimationFrame(()=>{
  fl.style.left=targetSeat.left;fl.style.bottom=targetSeat.bottom;
  });});
 setTimeout(()=>{
  fl.remove();
  const seated={e:passenger.e,t:passengerLabel(passenger),img:passenger.normal||passenger.img||passenger.happy};
  const idx=cars.indexOf(pendingSeat);
  if(idx>=0)cars[idx]=seated;
  else cars.push(seated);
  renderCars();
  if(isNew){sndNew();showStamp("あたらしい ともだち！","new");}
 },780);
 return isNew;
}

/* ================= rare events ================= */
function clearRareEvent(){
 clearTimeout(rareSpawnTimer);rareSpawnTimer=0;
 if(rareEl){rareEl.remove();rareEl=null;}
}
function scheduleRareSpawn(){
 clearTimeout(rareSpawnTimer);
 const scheduledStage=stg,scheduledLoop=loop;
 rareSpawnTimer=setTimeout(()=>{
  rareSpawnTimer=0;
  if(!playing||!driving||stg!==scheduledStage||loop!==scheduledLoop)return;
  maybeSpawnRare();
 },600);
}
function maybeSpawnRare(){
 if(!playing||!driving||rareEl)return;
 if(!FORCERARE&&Math.random()>rareSpawnChance())return;
 const [e,t]=RARES[stg];
 rareEl=document.createElement("button");rareEl.type="button";
 rareEl.className="rare";rareEl.setAttribute("aria-label",t+"を みつける");
 rareEl.appendChild(createQuizArt(e,t,"rare-art"));
 rareEl.style.left="104vw";rareEl.style.top=(10+rnd(0,18))+"vh";
 $("app").appendChild(rareEl);
 rareSpawned=true;
 const born=performance.now();
 const el=rareEl;
 bindTap(el,()=>collectRareEvent(el,e,t));
 (function fly(){
  if(!el.parentNode)return;
  const dt=(performance.now()-born)/1000*FAST;
  const x=104-dt*26;
  el.style.left=x+"vw";
  if(x<-12){el.remove();if(rareEl===el)rareEl=null;return;}
  requestAnimationFrame(fly);
 })();
}
function collectRareEvent(el,e,t){
 if(!el||!el.parentNode||el.dataset.collected==="1")return false;
 el.dataset.collected="1";el.remove();if(rareEl===el)rareEl=null;
 rareCount++;addScore(SCORE_POINTS.rare,"rare");
 const isNew=registerZk(e,t);sndNew();confetti(8);
 showStamp((isNew?"めずらしい ともだち！":"また あえたね！")+" +"+SCORE_POINTS.rare+"てん","new");
 speak(t+"を みつけた！");return true;
}
function collectSeaRareCollision(){
 if(!rareEl||!rareEl.parentNode||!isSeaStage()||!driving||tunnelInteriorMode||!vehicleSteerShell)return false;
 const item=rareEl.getBoundingClientRect(),sub=vehicleSteerShell.getBoundingClientRect();
 const hull={left:sub.left+sub.width*.1,right:sub.right-sub.width*.08,top:sub.top+sub.height*.18,bottom:sub.bottom-sub.height*.14};
 const overlap=hull.left<item.right&&hull.right>item.left&&hull.top<item.bottom&&hull.bottom>item.top;
 if(!overlap)return false;
 const rare=RARES[stg]||["","めずらしい ともだち"];
 return collectRareEvent(rareEl,rare[0],rare[1]);
}

/* ================= hud/fx ================= */
function drawDots(){
 dotsEl.innerHTML="";
 const sp=document.createElement("span");sp.id="stgName";
 sp.append(createUiArt(STAGES[stg].art,"stage-hud-art"),document.createTextNode(STAGES[stg].names[loop%2]));
 dotsEl.appendChild(sp);
 for(let i=0;i<QN;i++){const d=document.createElement("div");d.className="dot"+(i<qSeg?" on":"");
  if(i<qSeg)d.appendChild(createUiArt("star","progress-star-art"));dotsEl.appendChild(d);}
}
function clearReducedStampPresentation(){
 clearTimeout(stampFeedbackTimer);stampFeedbackTimer=0;
 stamp.style.removeProperty("animation");
 stamp.style.removeProperty("transform");
 stamp.style.removeProperty("opacity");
}
function showStamp(txt,cls){
 clearReducedStampPresentation();
 stamp.textContent=txt;announce(txt);stamp.className="";void stamp.offsetWidth;stamp.className=cls;
 if(prefersReducedMotionActive()){
  // 「動きを減らす」でも結果自体は消さない。動かさず約1.2秒読めるようにする。
  stamp.style.setProperty("animation","none","important");
  stamp.style.setProperty("transform","translate(-50%,-50%) scale(1)","important");
  stamp.style.setProperty("opacity","1","important");
  stampFeedbackTimer=setTimeout(()=>{
   stampFeedbackTimer=0;stamp.className="";
   stamp.style.removeProperty("animation");stamp.style.removeProperty("transform");stamp.style.removeProperty("opacity");
  },1250);
 }
}
function showPickupScoreFeedback(rect,points){
 if(!rect||!Number.isFinite(points)||points<=0)return;
 const feedback=document.createElement("div");
 feedback.className="pickup-score-feedback";
 feedback.textContent="+"+formatScore(points)+"てん";
 feedback.setAttribute("aria-hidden","true");
 Object.assign(feedback.style,{
  position:"fixed",left:(rect.left+rect.width*.5)+"px",top:(rect.top+rect.height*.15)+"px",zIndex:"31",
  transform:"translate(-50%,-50%)",color:"#fff",background:"rgba(75,151,86,.94)",border:"3px solid rgba(255,255,255,.92)",
  borderRadius:"999px",padding:"5px 11px",fontSize:"clamp(18px,3.8vw,32px)",fontWeight:"900",lineHeight:"1",
  whiteSpace:"nowrap",textShadow:"0 2px 0 rgba(37,91,48,.35)",boxShadow:"0 4px 12px rgba(38,74,43,.26)",pointerEvents:"none"
 });
 $("app").appendChild(feedback);
 if(!prefersReducedMotionActive()&&typeof feedback.animate==="function"){
  const animation=feedback.animate([
   {transform:"translate(-50%,-35%) scale(.72)",opacity:0},
   {transform:"translate(-50%,-50%) scale(1.08)",opacity:1,offset:.2},
   {transform:"translate(-50%,-115%) scale(1)",opacity:1,offset:.76},
   {transform:"translate(-50%,-145%) scale(.96)",opacity:0}
  ],{duration:1050,easing:"cubic-bezier(.2,.8,.3,1)",fill:"forwards"});
  animation.onfinish=()=>feedback.remove();animation.oncancel=()=>feedback.remove();
 }else setTimeout(()=>feedback.remove(),1250);
}
function updateHelpHud(){
 const n=helpItems.length;
 if(helpBadge){
  helpBadge.style.display=n?"flex":"none";
  const item=n?helpItems[n-1]:null;
  const itemArt=item?createQuizArt(item.e,item.t,"hud-counter-art",item.img||(item.e==="🍀"?resolveUiArt("help"):"")):null;
  illustratedCounter(helpBadge,itemArt||"help",n,"hud-counter-art");
  helpBadge.setAttribute("aria-label","おたすけ "+n+"こ");
 }
 if(helpBtn){illustratedCounter(helpBtn,"help",n,"help-button-art");helpBtn.setAttribute("aria-label","おたすけ "+n+"こ");helpBtn.classList.toggle("empty",!n);helpBtn.disabled=false;}
}
function emptyStageScoreBreakdown(){return {quiz:0,clear:0,help:0,rare:0,tunnel:0};}
function formatScore(value){return Math.max(0,Math.round(Number(value)||0)).toLocaleString("ja-JP");}
function resetStageScore(){
 stageScore=0;stageScoreBreakdown=emptyStageScoreBreakdown();stageClearScoreGranted=false;stageCompletionHandled=false;
 drawTunnelScoreHud();
}
function resetJourneyScore(){journeyScore=0;resetStageScore();}
function addScore(points,key){
 const value=Math.max(0,Math.round(Number(points)||0));
 if(!value)return 0;
 journeyScore+=value;stageScore+=value;
 if(Object.prototype.hasOwnProperty.call(stageScoreBreakdown,key))stageScoreBreakdown[key]+=value;
 const isNewHigh=journeyScore>highScore;
 if(isNewHigh)highScore=journeyScore;
 drawTunnelScoreHud();
 if(isNewHigh)saveGame();
 return value;
}
function collectHelpItem(item){
 if(helpItems.length>=HELP_MAX){
  addScore(SCORE_POINTS.helpOverflow,"help");
  updateHelpHud();
  return {stored:false,points:SCORE_POINTS.helpOverflow};
 }
 helpItems.push(item);updateHelpHud();
 return {stored:true,points:0};
}
function drawPersistentScoreHud(){
 if(scoreHudValue)scoreHudValue.textContent=formatScore(journeyScore);
 if(highScoreValue)highScoreValue.textContent=formatScore(highScore);
 const scoreText=formatScore(journeyScore);
 const highText=formatScore(highScore);
 if(scoreCurrentPill)scoreCurrentPill.setAttribute("aria-label","スコア "+scoreText+"てん");
 if(highScorePill)highScorePill.setAttribute("aria-label","ハイスコア "+highText+"てん");
}
function drawTunnelScoreHud(){
 drawPersistentScoreHud();
 if(tunnelStageScore)tunnelStageScore.textContent=formatScore(stageScore)+"てん";
 if(tunnelJourneyScore)tunnelJourneyScore.textContent=formatScore(journeyScore)+"てん";
}
function tunnelScoreBreakdownText(){
 const labels=[
  ["quiz","なぞなぞ"],
  ["clear","クリア"],
  ["help","おたすけ"],
  ["rare","めずらしい ともだち"],
  ["tunnel","かくれともだち"]
 ];
 return labels.filter(([key])=>stageScoreBreakdown[key]>0)
  .map(([key,label])=>label+" +"+formatScore(stageScoreBreakdown[key])).join(" ・ ");
}
function prepareTunnelFriends(){
 tunnelFriendCandidates=cars
  .filter(passenger=>passenger&&!passenger.pending&&(passenger.img||passenger.e))
  .slice(-TUNNEL_FRIEND_LIMIT)
  .map(passenger=>({e:passenger.e||"",t:passengerLabel(passenger)||"ともだち",img:passenger.img||""}));
}
function drawTunnelFriendHud(){
 if(tunnelFriendCounter)tunnelFriendCounter.textContent="みつけた "+tunnelFriendsFound+" / "+tunnelFriendCandidates.length;
 drawTunnelScoreHud();
}
function tunnelFriendStaticMode(){
 try{return FAST>1||!!(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches);}catch(_){return FAST>1;}
}
function tunnelFriendVisualVariation(index,randomFn){
 if(tunnelFriendStaticMode()){
  const scales=[.84,1.12,.96],rotations=[-8,7,-3];
  return {scale:scales[index%scales.length],rotation:rotations[index%rotations.length]};
 }
 const draw=typeof randomFn==="function"?randomFn:Math.random;
 return {scale:.78+draw()*.4,rotation:-10+draw()*20};
}
function tunnelWallBayWidthVw(){
 return (window.innerHeight||390)/(window.innerWidth||844)*100*TUNNEL_WALL_ASPECT/TUNNEL_WALL_BAYS;
}
function tunnelFriendWallSlots(){
 if(tunnelFriendStaticMode())return TUNNEL_FRIEND_STATIC_SLOTS.map(slot=>Object.assign({},slot));
 const bay=Math.max(1,tunnelWallBayWidthVw());
 const pan=-worldX*TUNNEL_WALL_PARALLAX;
 const firstIndex=Math.ceil((94-pan)/bay-.5);
 const gapBays=Math.max(1,Math.round(TUNNEL_FRIEND_GAP_TARGET_VW/bay));
 return TUNNEL_FRIEND_Y.map((y,index)=>({x:pan+(firstIndex+index*gapBays+.5)*bay,y}));
}
function updateTunnelFriendWallMotion(){
 if(!tunnelFriendLayer||!tunnelFriendGameActive)return;
 const parallax=tunnelFriendStaticMode()?TUNNEL_FRIEND_CALM_PARALLAX/Math.max(1,FAST):TUNNEL_WALL_PARALLAX;
 const shift=(worldX-tunnelFriendStartWorldX)*parallax;
 tunnelFriendLayer.querySelectorAll(".tunnel-friend").forEach(button=>{
  const startX=Number(button.dataset.wallStartX)||0;
  button.style.setProperty("--friend-screen-x",(startX-shift).toFixed(2)+"vw");
 });
}
function startTunnelFriendGame(){
 if(!tunnelFriendGame||!tunnelFriendLayer||!tunnelFriendCandidates.length)return;
 tunnelFriendsFound=0;tunnelFriendRewardGranted=false;tunnelFriendPerfectScoreGranted=false;tunnelFriendGameActive=true;
 tunnelFriendLayer.replaceChildren();
 tunnelFriendGame.classList.remove("is-result");
 tunnelFriendGame.classList.toggle("is-static",tunnelFriendStaticMode());
 tunnelFriendGame.setAttribute("aria-hidden","false");
 if(tunnelFriendGuide)tunnelFriendGuide.textContent="1にん +"+SCORE_POINTS.tunnelFriend+"てん　ぜんぶ +"+SCORE_POINTS.tunnelPerfect+"てん";
 if(tunnelFriendResult)tunnelFriendResult.hidden=true;
 if(tunnelResultStage)tunnelResultStage.textContent="";
 if(tunnelResultBreakdown)tunnelResultBreakdown.textContent="";
 if(tunnelResultTotal)tunnelResultTotal.textContent="";
 const slots=tunnelFriendWallSlots();
 tunnelFriendCandidates.forEach((friend,index)=>{
  const button=document.createElement("button");
  const slot=slots[index%slots.length];
  const variation=tunnelFriendVisualVariation(index);
  button.type="button";button.className="tunnel-friend";
  button.dataset.friendIndex=String(index);
  button.dataset.wallStartX=String(slot.x);
  button.dataset.visualScale=variation.scale.toFixed(3);
  button.dataset.visualRotate=variation.rotation.toFixed(2);
  button.dataset.score="";
  button.setAttribute("aria-label",friend.t+"を みつける。"+SCORE_POINTS.tunnelFriend+"てん");
  button.style.setProperty("--friend-screen-x",slot.x+"vw");
  button.style.setProperty("--friend-y",slot.y+"%");
  button.style.setProperty("--friend-scale",variation.scale.toFixed(3));
  button.style.setProperty("--friend-rotate",variation.rotation.toFixed(2)+"deg");
  const visual=document.createElement("span");visual.className="tunnel-friend-visual";
  if(friend.img){
   const img=document.createElement("img");img.src=friend.img;img.alt="";img.draggable=false;img.decoding="async";
   visual.appendChild(img);
  }else visual.appendChild(createQuizArt(friend.e,friend.t,"tunnel-friend-art"));
  button.appendChild(visual);
  bindTap(button,()=>findTunnelFriend(button,friend));
  tunnelFriendLayer.appendChild(button);
 });
 updateTunnelFriendWallMotion();
 drawTunnelFriendHud();
}
function findTunnelFriend(button,friend){
 if(!tunnelFriendGameActive||!button||button.disabled||button.dataset.found==="1")return;
 button.dataset.found="1";
 tunnelFriendsFound++;tunnelFriendTotalFound++;
 let gained=addScore(SCORE_POINTS.tunnelFriend,"tunnel");
 if(tunnelFriendsFound===TUNNEL_FRIEND_LIMIT&&!tunnelFriendPerfectScoreGranted){
  tunnelFriendPerfectScoreGranted=true;
  gained+=addScore(SCORE_POINTS.tunnelPerfect,"tunnel");
 }
 button.dataset.score="+"+formatScore(gained);
 requestAnimationFrame(()=>{button.disabled=true;button.classList.add("found");});
 drawTunnelFriendHud();
 tone(1047,0,.1,"triangle",.12);tone(1319,.08,.14,"triangle",.1);
 showStamp("みーつけた！ +"+gained+"てん","new");
 announce(friend.t+"を みつけた。+"+gained+"てん。"+tunnelFriendsFound+" / "+tunnelFriendCandidates.length);
 if(tunnelFriendsFound===tunnelFriendCandidates.length)confetti(8);
}
function showTunnelFriendResult(){
 if(!tunnelFriendGame||!tunnelFriendGameActive)return;
 tunnelFriendGameActive=false;
 tunnelFriendLayer.querySelectorAll(".tunnel-friend").forEach(button=>{button.disabled=true;});
 const total=tunnelFriendCandidates.length;
 let message=tunnelFriendsFound? tunnelFriendsFound+"にん みつけた！":"また こんど さがしてみよう！";
 if(total===TUNNEL_FRIEND_LIMIT&&tunnelFriendsFound===total){
  let helpResult={stored:false,points:0};
  if(!tunnelFriendRewardGranted){
   helpResult=collectHelpItem({e:"🍀",t:"かくれともだち"});
   tunnelFriendRewardGranted=true;
  }
  message="ぜんぶ みつけた！\n"+(helpResult.stored?"おたすけ ゲット！":"おたすけ いっぱい +"+helpResult.points+"てん！");
 }
 tunnelFriendGame.classList.add("is-result");
 if(tunnelResultStage)tunnelResultStage.textContent="この めん　"+formatScore(stageScore)+"てん";
 if(tunnelResultBreakdown)tunnelResultBreakdown.textContent=message+"\n"+tunnelScoreBreakdownText();
 if(tunnelResultTotal)tunnelResultTotal.textContent="ぜんぶ　"+formatScore(journeyScore)+"てん";
 if(tunnelFriendResult)tunnelFriendResult.hidden=false;
 announce(message);
}
function clearTunnelFriendGame(){
 tunnelFriendGameActive=false;tunnelFriendsFound=0;tunnelFriendRewardGranted=false;tunnelFriendPerfectScoreGranted=false;tunnelFriendCandidates=[];tunnelFriendStartWorldX=0;
 if(tunnelFriendLayer)tunnelFriendLayer.replaceChildren();
 if(tunnelFriendResult)tunnelFriendResult.hidden=true;
 if(tunnelResultStage)tunnelResultStage.textContent="";
 if(tunnelResultBreakdown)tunnelResultBreakdown.textContent="";
 if(tunnelResultTotal)tunnelResultTotal.textContent="";
 if(tunnelFriendGame){tunnelFriendGame.classList.remove("is-result","is-static");tunnelFriendGame.setAttribute("aria-hidden","true");}
}
function confetti(n){const art=[["⭐","ほし"],["🎈","ふうせん"],["🌼","おはな"],["☄️","ながれぼし"],["🦋","ちょうちょ"]];
 for(let i=0;i<(n||24);i++){const c=document.createElement("div");c.className="conf";
  const item=art[i%art.length];c.appendChild(createQuizArt(item[0],item[1],"confetti-art"));c.style.left=(Math.random()*96)+"vw";
  c.style.animationDelay=(Math.random()*.8)+"s";$("app").appendChild(c);
  setTimeout(()=>c.remove(),3400);}}
function sparkOnVeh(){
 for(let i=0;i<5;i++){const s=document.createElement("div");s.className="spark";s.appendChild(createUiArt("star","spark-art"));
  s.style.left="calc("+vehicleLeftVw()+"vw + "+(i*4)+"vw)";s.style.bottom=(16+((i*7)%12))+"vh";
  $("app").appendChild(s);setTimeout(()=>s.remove(),900);}
}
function clearMagicPuffs(){
 const box=veh.querySelector(".puff");
 if(box)box.replaceChildren();
 if(smokeLayer)smokeLayer.replaceChildren();
 nextMagicPuffAt=0;
 smokeRunning=false;
 smokeSerial=0;
}
function smokeCanRun(){
 return !!(playing&&veh.classList.contains("go")&&document.body.classList.contains("v-train")&&
  !document.body.classList.contains("tunnel-enter-run")&&
  !document.body.classList.contains("tunnel-exit-run")&&
  !document.body.classList.contains("tunnel-interior"));
}
function recycleOldestMagicPuff(box){
 if(!box||box.children.length<SMOKE_MAX_PUFFS)return;
 const oldest=box.firstElementChild;
 if(oldest)oldest.remove();
}
function spawnMagicPuff(box,useSceneSmoke,ageMs){
 if(!box)return null;
 const reduced=prefersReducedMotionActive();
 const p=document.createElement("span");
 p.className="magic-puff";
 const serial=smokeSerial++;
 if(serial%4===0)p.classList.add("magic-puff--triple");
 p.dataset.smokeSerial=serial+"";
 const idx=rnd(0,7),col=idx%4,row=Math.floor(idx/4);
 const size=(useSceneSmoke?28:18)+Math.random()*(useSceneSmoke?66:62);
 const life=SMOKE_LIFE_MIN_MS+Math.random()*SMOKE_LIFE_JITTER_MS;
 const age=Math.min(Math.max(0,Number(ageMs)||0),Math.max(0,life-120));
 const slot=(serial*13)%SMOKE_MAX_PUFFS;
 const staticX=reduced?-280*slot/(SMOKE_MAX_PUFFS-1):0;
 const staticY=reduced?(((((slot*7)%9)/8)-.5)*44):0;
 const baseScale=reduced?1.15+Math.random()*.20:.42+Math.random()*.34;
 const endScale=reduced?baseScale+Math.random()*.04:1.2+Math.random()*1.55;
 if(useSceneSmoke){
  const sceneRect=$("scene").getBoundingClientRect();
  const vehRect=veh.getBoundingClientRect();
  p.style.left=Math.round(vehRect.left-sceneRect.left+vehRect.width*.76+staticX)+"px";
  p.style.top=Math.round(vehRect.top-sceneRect.top-vehRect.height*.17+staticY)+"px";
 }else if(reduced){
  p.style.left=staticX+"px";
  p.style.top=staticY+"px";
 }
 p.style.width=size+"px";p.style.height=size+"px";
 p.style.setProperty("--puff-size",size+"px");
 p.style.setProperty("--puff-life",life+"ms");
 p.style.setProperty("--puff-dx",(reduced?-8-Math.random()*12:-140-Math.random()*260)+"px");
 p.style.setProperty("--puff-dy",(reduced?-3-Math.random()*6:-18-Math.random()*64)+"px");
 p.style.setProperty("--puff-rot",(reduced?0:-18+Math.random()*36)+"deg");
 p.style.setProperty("--puff-start-scale",baseScale.toFixed(2));
 p.style.setProperty("--puff-end-scale",endScale.toFixed(2));
 const alpha=(useSceneSmoke?0.78:0.6)+Math.random()*(useSceneSmoke?0.18:0.26);
 p.style.setProperty("--puff-alpha",alpha.toFixed(2));
 p.style.setProperty("--puff-mid-alpha",(alpha*.82).toFixed(2));
 p.style.backgroundPosition=(col*33.3333)+"% "+(row*100)+"%";
 p.style.animationDelay=(-age)+"ms";
 const clock=(typeof performance!=="undefined"&&typeof performance.now==="function")?performance.now():Date.now();
 p.dataset.smokeBornAt=Math.round(clock-age)+"";
 p.dataset.smokeAgeAtSpawn=Math.round(age)+"";
 p.dataset.smokeLife=Math.round(life)+"";
 p.dataset.smokeSlot=slot+"";
 box.appendChild(p);
 // 動的挿入した通常版／低移動版 animation を古いiOS WebKitにも確実に認識させる。
 void p.offsetWidth;
 setTimeout(()=>p.remove(),Math.max(120,life-age)+80);
 return p;
}
function warmMagicPuffs(box,useSceneSmoke){
 // 走行を再開した最初のフレームから煙列が見えるよう、古い煙から順に事前経過させる。
 for(let index=SMOKE_WARM_START_COUNT;index>=1;index--){
  recycleOldestMagicPuff(box);
  const age=SMOKE_WARM_MAX_AGE_MS*index/(SMOKE_WARM_START_COUNT+1);
  spawnMagicPuff(box,useSceneSmoke,age);
 }
}
function tickMagicPuffs(now){
 if(!smokeCanRun()){
  smokeRunning=false;
  nextMagicPuffAt=0;
  return;
 }
 const useSceneSmoke=!!(IOS_DEVICE&&smokeLayer);
 const box=useSceneSmoke?smokeLayer:veh.querySelector(".puff");
 if(!box)return;
 if(!smokeRunning){
  smokeRunning=true;
  warmMagicPuffs(box,useSceneSmoke);
  nextMagicPuffAt=now+SMOKE_INTERVAL_MIN_MS+Math.random()*SMOKE_INTERVAL_JITTER_MS;
  return;
 }
 if(now<nextMagicPuffAt)return;
 nextMagicPuffAt=now+SMOKE_INTERVAL_MIN_MS+Math.random()*SMOKE_INTERVAL_JITTER_MS;
 // 上限で発生を止めると煙突だけ急に凍って見える。最古の1個を入れ替えて新煙を保つ。
 recycleOldestMagicPuff(box);
 spawnMagicPuff(box,useSceneSmoke,0);
}
function onRunEvent(el,ev){
 if(!driving||!el||el.classList.contains("found"))return;
 const r=el.getBoundingClientRect();
 el.classList.add("found");el.disabled=true;
 const helpResult=collectHelpItem({e:ev[0],t:ev[1]});
 // 1〜3個目は取得点、満杯後は既存の変換点を表示する。同じ1個で二重加点しない。
 const gained=helpResult.stored?addScore(SCORE_POINTS.helpPickup,"help"):helpResult.points;
 for(let i=0;i<4;i++){
  const s=document.createElement("div");s.className="spark";s.appendChild(createUiArt(i%2?"star":"sparkle","spark-art"));
  s.style.left=(r.left+r.width*.35+i*r.width*.1)+"px";
  s.style.top=(r.top+r.height*.1)+"px";
  $("app").appendChild(s);setTimeout(()=>s.remove(),900);
 }
 tone(1047,0,.12,"triangle",.11);tone(1319,.1,.16,"triangle",.09);
 showPickupScoreFeedback(r,gained);
 const pickupLabel=helpResult.stored?"おたすけ ゲット！ ×"+helpItems.length:"おたすけ いっぱい！";
 showStamp(pickupLabel+" +"+gained+"てん","new");
 speak(ev[1]+"を みつけた！ "+gained+"てん！");
}
function useHelp(){
 if(answerLocked||driving||seaBubbleLaunchPending||!quiz.classList.contains("show"))return;
 if(isSeaStage()&&!seaRoundPlayable())return;
 if((isFutureStage()&&(futureCapsuleResolving||futureCranePointerId!==null||futureCraneHeldIndex>=0))||(isSpaceStage()&&(spaceGalaxyResolving||spaceGalaxyPointerId!==null)))return;
 if(!helpItems.length){
  showStamp("みつけてね！","ng");
  announce("はしっているときに、おたすけを みつけよう");
  return;
 }
 const item=helpItems.pop();
 updateHelpHud();
 let helpMessage=item.t+"が おしえてくれたよ";
 if(isNumberCargoQuestion()){
  numberCargoGoalShown=true;
  updateNumberCargoGame();
  illustratedText(hintText,"help","めざすのは "+numberCargoAnswer()+"こ だよ","hint-inline-art");
  helpMessage=item.t+"が めざす かずを おしえてくれたよ";
 }else{
  const choices=activeChoiceButtons();
  const wrong=choices.find(c=>c.dataset.ok!=="1"&&!c.classList.contains("dim"));
  if(wrong){wrong.classList.add("dim");wrong.disabled=true;}
  const ok=choices.find(c=>c.dataset.ok==="1");
  if(ok)ok.classList.add("glow");
  if(isFutureStage())assistFutureCapsuleGame();
  if(isSpaceStage())assistSpaceGalaxyGame();
 }
 tone(880,0,.12,"triangle",.12);tone(1175,.1,.16,"triangle",.1);
 showStamp("おたすけ！","new");
 announce(helpMessage);
}

function prepareTunnelInteriorBackdrop(){
 // 画像・repeat・sizeは入場時に一度だけ指定し、走行中の毎フレーム再解析を避ける。
 skyA.style.background='#17110b url("../assets/images/nazonazo-tunnel/tunnel_interior_side_flat_20260705.webp") 0 center / auto 100% repeat-x';
}
function setTunnelInteriorBackdrop(){
 // シルエットを固定する reduced-motion でも壁は流し続ける。ここまで止めると
 // 固定された列車がトンネル内で停車して見えてしまう。
 const panWorld=worldX;
 const tunnelPan=cssXFromVw(-panWorld*TUNNEL_WALL_PARALLAX);
 skyA.style.backgroundPosition=tunnelPan+' center';
 document.documentElement.style.setProperty("--tunnel-track-x",tunnelPan);
}

/* ================= render ================= */
function render(now){
 const o=origin(stg);
 world.style.transform="translate3d("+cssXFromVw(-worldX)+",0,0)";
 if(tunnelInteriorMode){
  setTunnelInteriorBackdrop();
  updateTunnelFriendWallMotion();
  skyB.style.opacity="0";
  veh.classList.add("inTun");
  carsEl.classList.add("inTun");
  renderPortalMasks(null);
  return;
 }
 if(document.body.classList.contains("st-number")){
  document.documentElement.style.setProperty("--num-pan",(-(worldX-o)*.06)+"vw");
 }
 renderSeaFish(now);
 renderSeaHabitat();
 updateSeaBossVisual(now);
 renderSeaSteering();
 renderSpaceSteering();
 updateFutureCapsuleVisual(now);
 renderJungleAnimals();
 renderJungleFlights(now);
 renderSpaceStars(now);
 if(jungleHabitatBack&&document.body.classList.contains("st-jungle"))jungleHabitatBack.style.backgroundPositionX=cssXFromVw(-(worldX-o)*.92);
 updateScreenExitShift();
 if(document.body.classList.contains("st-town")&&townHorizonLoop){
  horizon.style.transform="translate3d(0,0,0)";
  horizon.style.backgroundPositionX="0px";
  const horizonTileWidth=(window.innerHeight||390)*1.34*(1983/793);
  const horizonPeriod=horizonTileWidth*2;
 const horizonRawOffset=(((worldX-o)*TOWN_HORIZON_PARALLAX*(window.innerWidth||844)/100)%horizonPeriod+horizonPeriod)%horizonPeriod;
  const horizonLoopOffset=IOS_DEVICE?Math.round(horizonRawOffset):Number(horizonRawOffset.toFixed(2));
  townHorizonLoop.style.transform="translate3d("+(-horizonLoopOffset)+"px,0,0)";
 }else if(document.body.classList.contains("st-future")&&futureHorizonLoop){
  horizon.style.transform="translate3d(0,0,0)";horizon.style.backgroundPositionX="0px";
  const tileWidth=(window.innerHeight||390)*FUTURE_HORIZON_HEIGHT*FUTURE_HORIZON_ASPECT;
  const period=tileWidth*2;
  const rawOffset=(((worldX-o)*FUTURE_HORIZON_PARALLAX*(window.innerWidth||844)/100)%period+period)%period;
  const loopOffset=IOS_DEVICE?Math.round(rawOffset):Number(rawOffset.toFixed(2));
  futureHorizonLoop.style.transform="translate3d("+(-loopOffset)+"px,0,0)";
 }else if(document.body.classList.contains("st-space")&&spaceHorizonLoop){
  horizon.style.transform="translate3d(0,0,0)";horizon.style.backgroundPositionX="0px";
  const tileWidth=(window.innerHeight||390)*SPACE_PLANET_HEIGHT*SPACE_PLANET_ASPECT;
  const period=tileWidth*2;
  const rawOffset=(((worldX-o)*SPACE_PLANET_PARALLAX*(window.innerWidth||844)/100)%period+period)%period;
  const loopOffset=IOS_DEVICE?Math.round(rawOffset):Number(rawOffset.toFixed(2));
  spaceHorizonLoop.style.transform="translate3d("+(-loopOffset)+"px,0,0)";
 }else if(document.body.classList.contains("st-sea")){
  horizon.style.transform="translate3d(0,0,0)";
  horizon.style.backgroundPositionX=cssXFromVw(-(worldX-o)*.1);
 }else{
  horizon.style.backgroundPositionX="0px";
  const hd=clamp((worldX-o)*0.095,0,70);
  horizon.style.transform="translate3d("+cssXFromVw(-hd)+",0,0)";
 }
 if(document.body.classList.contains("st-town")&&townMidLoop){
  const tileWidth=(window.innerHeight||390)*1.14*(1774/887);
  const period=tileWidth*2;
  const rawOffset=((worldX*0.25*(window.innerWidth||844)/100)%period+period)%period;
  const loopOffset=IOS_DEVICE?Math.round(rawOffset):Number(rawOffset.toFixed(2));
  townMidLoop.style.transform="translate3d("+(-loopOffset)+"px,0,0)";
  midT.style.backgroundPositionX="0px";
 }else if(document.body.classList.contains("st-future")&&futureMidLoop){
  const tileWidth=(window.innerHeight||390)*FUTURE_MID_HEIGHT*FUTURE_MID_ASPECT;
  const period=tileWidth*2;
  const rawOffset=(((worldX-o)*FUTURE_MID_PARALLAX*(window.innerWidth||844)/100)%period+period)%period;
  const loopOffset=IOS_DEVICE?Math.round(rawOffset):Number(rawOffset.toFixed(2));
  futureMidLoop.style.transform="translate3d("+(-loopOffset)+"px,0,0)";midT.style.backgroundPositionX="0px";
 }else if(document.body.classList.contains("st-space")){
  midT.style.backgroundPositionX="0px";
 }else if(document.body.classList.contains("st-sea")){
  midT.style.backgroundPositionX=cssXFromVw(-(worldX-o)*.44);
 }else{
  midT.style.backgroundPositionX=cssXFromVw(-worldX*0.25);
 }
 const futureStage=document.body.classList.contains("st-future"),spaceStage=document.body.classList.contains("st-space");
 groundT.style.backgroundPositionX=spaceStage?"0px":cssXFromVw(futureStage?-(worldX-o):-worldX);
 if(futureStage&&futureForegroundLoop){
  const tileWidth=(window.innerHeight||390)*FUTURE_FOREGROUND_HEIGHT*FUTURE_FOREGROUND_ASPECT;
  const period=tileWidth*2;
  const rawOffset=(((worldX-o)*FUTURE_FOREGROUND_PARALLAX*(window.innerWidth||844)/100)%period+period)%period;
  const loopOffset=IOS_DEVICE?Math.round(rawOffset):Number(rawOffset.toFixed(2));
  futureForegroundLoop.style.transform="translate3d("+(-loopOffset)+"px,0,0)";fgT.style.backgroundPositionX="0px";
 }else if(spaceStage&&spaceForegroundLoop){
  const tileWidth=(window.innerHeight||390)*SPACE_FOREGROUND_HEIGHT*SPACE_FOREGROUND_ASPECT;
  const period=tileWidth*2;
  const rawOffset=(((worldX-o)*SPACE_FOREGROUND_PARALLAX*(window.innerWidth||844)/100)%period+period)%period;
  const loopOffset=IOS_DEVICE?Math.round(rawOffset):Number(rawOffset.toFixed(2));
  spaceForegroundLoop.style.transform="translate3d("+(-loopOffset)+"px,0,0)";fgT.style.backgroundPositionX="0px";
 }else fgT.style.backgroundPositionX=document.body.classList.contains("st-sea")?cssXFromVw(-(worldX-o)*1.06):cssXFromVw(-worldX*1.35);
 const p=clamp((worldX-o)/COVER_OFF,0,1);
 skyB.style.opacity=(p>0.78?((p-0.78)/0.22)*0.9:0).toFixed(2);
 const cv=transitCover||coverEl;
 if(cv){
  const cl=parseFloat(cv.style.left);
  const insideStart=cl-Math.max(8,portalTuning.entryStopOffsetVw*.35);
  const inside=worldX>insideStart&&worldX<cl+COVER_LEN+10;
  veh.classList.toggle("inTun",inside);
  carsEl.classList.toggle("inTun",inside);
  renderPortalMasks(cv);
 }else{
  veh.classList.remove("inTun");carsEl.classList.remove("inTun");
  renderPortalMasks(null);
 }
}

function setWheelPeriod(period){
 // iOS の4分の1秒刻みは常に切り上げる。四捨五入で要求値より速くすると
 // 重り付き車輪が画面更新と同期し、客車だけ止まったように見えるため。
 period=IOS_DEVICE?Math.ceil(period*4)/4:Math.round(period*100)/100;
 if(Math.abs(period-lastWheelPeriod)<0.01)return;
 lastWheelPeriod=period;
 const value=period.toFixed(2)+"s";
 veh.style.setProperty("--wheel-period",value);
 carsEl.style.setProperty("--wheel-period",value);
}
function updateWheelMotion(dist,tunnelRun,tunnelGameRun){
 if(!document.body.classList.contains("v-train"))return;
 if(tunnelGameRun){
  setWheelPeriod(TUNNEL_GAME_WHEEL_PERIOD);
  return;
 }
 if(tunnelRun){
  setWheelPeriod(WHEEL_FAST_PERIOD);
  return;
 }
 const p=clamp(dist/WHEEL_STOP_EASE_VW,0,1);
 const period=WHEEL_FAST_PERIOD+(1-p)*(WHEEL_SLOW_PERIOD-WHEEL_FAST_PERIOD);
 setWheelPeriod(period);
}
function showQuizAfterSettle(){
 setTimeout(()=>{
  if(!playing||driving||pending||quiz.classList.contains("show"))return;
  showQuiz();
 },STOP_SETTLE_MS);
}

/* ================= game loop ================= */
let lastT=0;
function gloop(t){
 if(!lastT)lastT=t;
 let dt=Math.min(FRAME_DT_MAX_SECONDS,(t-lastT)/1000)*FAST;
 lastT=t;
 const tunnelGameRun=pending==="tunnelExit";
 const tunnelRun=pending==="tunnelEntry"||tunnelGameRun||pending==="tunnelExitApproach";
 const weatherChange=advanceStageWeather(dt*1000,{playing,driving,tunnelRun});
 if(weatherChange)setWeatherPresentation(weatherChange,{announce:weatherChange==="rain"});
 if(playing&&driving){
  const dist=target-worldX;
  const rainSpeed=rainTrainSpeedMultiplier(STAGES[stg],tunnelRun);
  const maxV=tunnelGameRun?TUNNEL_GAME_MAX_V:(tunnelRun?TUNNEL_TRANSIT_MAX_V:(swapReady?52:38)*rainSpeed);
  vel=tunnelRun?maxV:clamp(dist*.98,6,maxV);
  updateWheelMotion(dist,tunnelRun,tunnelGameRun);
  worldX=Math.min(target,worldX+vel*dt);
  veh.classList.add("go");veh.classList.remove("idle");
  carsEl.classList.add("go");
  if(swapReady&&!swapped&&transitCover){
   const cl=parseFloat(transitCover.style.left);
   if(worldX>cl+portalTuning.swapOffsetVw){
    swapped=true;
    stg++;resetStageScore();buildQList();qSeg=0;stageMiss=0;rareSpawned=false;
    applySkin();buildWorld(true);drawDots();
    sparkOnVeh();sndGo();
    speak("トンネルを ぬけたら、"+STAGES[stg].names[loop%2]+"だ！");
   }
  }
  if(transitCover&&swapped){
   const cxEnd=parseFloat(transitCover.style.left)+COVER_LEN;
   if(worldX>cxEnd+130){
    transitCover.remove();
    transitCover=null;
    swapReady=false;swapped=false;
   }
  }
  if(worldX>=target-0.01){
   worldX=target;vel=0;driving=false;
   const p=pending;pending=null;
   const keepRunning=p==="tunnelEntry"||p==="tunnelExit"||p==="tunnelExitApproach";
   if(keepRunning){
    veh.classList.add("go");veh.classList.remove("idle");
    carsEl.classList.add("go");
   }else{
    veh.classList.remove("go");veh.classList.add("idle");
    carsEl.classList.remove("go");
   }
   if(p==="quiz")showQuizAfterSettle();
   else if(p==="seaBoss")showSeaBossEncounter();
   else if(p==="dropoff")showDropoff();
   else if(p==="tunnelEntry")showTunnelRunIn();
   else if(p==="tunnelExit")startTunnelExitApproach();
   else if(p==="tunnelExitApproach")finishTunnelInterior();
   else if(p==="ending")ending();
  }
 }
 tickMagicPuffs(t);
 tickTrainSe(t);
 render(t);
 requestAnimationFrame(gloop);
}

/* ================= flow ================= */
function startJourneyAt(s){
 hideWeatherNotice();
 clearMagicPuffs();
 resetNumberCargoGame();
 clearFutureCapsuleGame();
 clearSpaceGalaxyGame();resetSpaceSteering();
 clearRareEvent();
 resetSeaInteraction();
 stopStageWeather();
 clearTunnelFriendGame();
 stg=s;resetStageScore();qSeg=0;stageMiss=0;rareSpawned=false;
 portalEditHolding=false;tunnelInteriorMode=false;
 document.body.classList.remove("tunnel-enter-run","tunnel-exit-setup","tunnel-exit-run","tunnel-exit-clear","tunnel-exit-approach","tunnel-exit-brighten","tunnel-exit-white","tunnel-fade-dark","tunnel-interior");
 updateScreenExitShift();
 if(transitCover){transitCover.remove();transitCover=null;}
 startStageWeather(STAGES[stg]);
 buildQList();applySkin(true);buildWorld(false);drawDots();
 setDriverMood("cheer");
 worldX=origin(s);target=stops(origin(s),0);
 pending="quiz";driving=true;playing=true;swapReady=false;swapped=false;
 cars=[];helpItems=[];renderCars();updateHelpHud();
 $("map").classList.add("hidden");
 quiz.classList.remove("show");
 sndGo();
 if(currentStageWeather==="rain")setWeatherPresentation("rain",{announce:true});
}
function isNumberCargoQuestion(){return !!(cur&&STAGES[stg]&&STAGES[stg].id==="number");}
function numberCargoLimit(){return [3,5,9][level]||3;}
function numberCargoAnswer(){return clamp(Number(cur&&cur.a&&cur.a[0])||0,0,numberCargoLimit());}
function numberCargoColumnCount(limit){return Math.min((window.innerWidth||844)<560?3:5,limit);}
function syncNumberCargoColumns(){
 const root=choicesEl.querySelector(".number-cargo-game");if(root)root.style.setProperty("--cargo-columns",String(numberCargoColumnCount(numberCargoLimit())));
}
function resolveNumberCargoTheme(){
 if(numberCargoTheme)return numberCargoTheme;
 if(cur&&Array.isArray(cur.pe)&&cur.pe[0])numberCargoTheme={e:cur.pe[0],name:cur.pe[1]||"にもつ"};
 else numberCargoTheme=NUMBER_CARGO_THEMES[(qSeg+stg+loop)%NUMBER_CARGO_THEMES.length];
 return numberCargoTheme;
}
function resetNumberCargoGame(){
 numberCargoPicked=[];numberCargoGoalShown=false;numberCargoTheme=null;
 document.querySelectorAll(".number-cargo-fly").forEach(node=>node.remove());
 const activeGame=choicesEl.querySelector(".number-cargo-game");
 if(activeGame)activeGame.remove();
 quiz.classList.remove("number-quiz");
 choicesEl.classList.remove("number-mode");
 choicesEl.setAttribute("aria-label","こたえを えらぶ");
}
function isFutureStage(){return !!(STAGES[stg]&&STAGES[stg].id==="future");}
function isSpaceStage(){return !!(STAGES[stg]&&STAGES[stg].id==="space");}
function futureReducedMotion(){
 try{return !!(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches);}catch(_){return false;}
}
function futureQuestionOptions(question){
 const wrong=shuffle((question&&question.d||[]).map(x=>({e:x[0],t:x[1],ok:false})))[0];
 return shuffle([{e:question.a[0],t:question.a[1],ok:true},wrong].filter(Boolean));
}
function futureCraneScreenActive(){
 return !window.__PONO_TIER_LOCKED__&&isFutureStage()&&playing&&!driving&&quiz.classList.contains("show")&&
  futureCapsuleLayer&&!futureCapsuleLayer.hidden;
}
function futureCapsulePlayable(){
 return futureCraneScreenActive()&&!answerLocked&&!futureCapsuleResolving&&(futureCranePhase==="seek"||futureCranePhase==="pod-aligned");
}
function futureCraneBusy(){
 return futureCranePointerId!==null||futureCraneKeyboardActionHeld||!["seek","pod-aligned"].includes(futureCranePhase);
}
function futureCapsuleGuide(message){
 const guide=futureCapsuleLayer&&futureCapsuleLayer.querySelector(".future-capsule-guide");if(guide)guide.textContent=message;
}
function setFutureCapsuleTimer(callback,delay){
 const timer=setTimeout(()=>{futureCapsuleTimers.delete(timer);callback();},delay);futureCapsuleTimers.add(timer);return timer;
}
function futureCranePhaseCanTurn(){
 return futureCranePhase==="seek"||futureCranePhase==="pod-aligned"||futureCranePhase==="carry"||futureCranePhase==="core-aligned";
}
function updateFutureCraneControls(){
 const board=futureCapsuleLayer&&futureCapsuleLayer.querySelector(".future-capsule-board");if(!board)return;
 const handle=board.querySelector(".future-crane-handle"),action=board.querySelector(".future-crane-action"),label=action&&action.querySelector(".future-crane-action-label");
 const actionReady=futureCranePhase==="pod-aligned"||futureCranePhase==="lower-pod"||futureCranePhase==="grip"||futureCranePhase==="core-aligned"||futureCranePhase==="lower-core";
 const handleReady=futureCranePhaseCanTurn();
 board.classList.toggle("is-handle-ready",futureCranePhase==="seek"||futureCranePhase==="carry");
 board.classList.toggle("is-action-ready",actionReady);
 if(handle){handle.disabled=!handleReady||answerLocked||futureCapsuleResolving;handle.setAttribute("aria-pressed",futureCranePointerRole==="crank"?"true":"false");}
 if(action){
  action.disabled=!actionReady||answerLocked||futureCapsuleResolving;
  action.setAttribute("aria-pressed",futureCraneActionHeld||futureCranePointerRole==="action"?"true":"false");
  action.setAttribute("aria-label",futureCranePhase==="grip"?"ぎゅっと つかむ "+futureCraneGripCount+" / "+FUTURE_CRANE_GRIP_GOAL:"クレーンを おろす");
 }
 if(label)label.textContent=futureCranePhase==="grip"?"ぎゅっ！":"おす！";
 board.querySelectorAll(".future-crane-grip-meter i").forEach((dot,index)=>dot.classList.toggle("is-on",index<futureCraneGripCount));
 board.style.setProperty("--future-grip",String(futureCraneGripCount/FUTURE_CRANE_GRIP_GOAL));
}
function setFutureCranePhase(phase){
 futureCranePhase=phase;
 const board=futureCapsuleLayer&&futureCapsuleLayer.querySelector(".future-capsule-board");if(!board)return;
 board.dataset.cranePhase=phase;board.dataset.heldPod=futureCraneHeldIndex<0?"":String(futureCraneHeldIndex);
 board.dataset.pointerActive=futureCranePointerId===null?"false":"true";
 board.classList.toggle("is-auto-lifting",phase==="auto-lift");board.classList.toggle("is-auto-rising",phase==="auto-rise");
 updateFutureCraneControls();
}
function releaseFutureCranePointerCapture(){
 const board=futureCapsuleLayer&&futureCapsuleLayer.querySelector(".future-capsule-board"),pointerId=futureCranePointerId,captureTarget=futureCranePointerCaptureTarget;
 futureCranePointerId=null;futureCranePointerRole="";futureCranePointerCaptureTarget=null;futureCraneCrankLastAngle=null;
 if(captureTarget&&pointerId!==null){try{if(!captureTarget.hasPointerCapture||captureTarget.hasPointerCapture(pointerId))captureTarget.releasePointerCapture(pointerId);}catch(_){}}
 if(board)board.dataset.pointerActive="false";
}
function clearFutureCapsuleGame(){
 releaseFutureCranePointerCapture();
 if(futureCraneGeometryFrame){cancelAnimationFrame(futureCraneGeometryFrame);futureCraneGeometryFrame=0;}
 futureCapsuleEpoch++;futureCapsuleTimers.forEach(clearTimeout);futureCapsuleTimers.clear();
 futureCapsuleOptions=[];futureCapsuleSelectedIndex=-1;futureCapsuleResolving=false;futureCapsuleAssisted=false;futureCapsuleEnergy=0;
 futureCranePhase="idle";futureCranePointerPhaseAtDown="";futureCraneHeldIndex=-1;futureCraneTargetIndex=-1;futureCraneX=0;futureCraneY=0;
 futureCraneLastPointerX=0;futureCraneLastPointerY=0;futureCraneCrankRotation=0;futureCraneActionHeld=false;futureCraneKeyboardActionHeld=false;
 futureCraneGripTapEligible=false;futureCraneGripCount=0;futureCraneGripArmedAt=0;futureCraneLastTickAt=0;futureCraneSkipSnapKey="";
 futureCraneFollowX=0;futureCraneFollowY=0;futureCraneLifted=false;futureCraneCoreReady=false;
 futureCraneSubmissionCommitted=false;futureCraneKeyboardActive=false;futureCraneGeometry=null;futureCraneGeometryDirty=true;
 document.body.classList.remove("future-capsule-active","future-capsule-complete");
 quiz.classList.remove("future-capsule-quiz");choicesEl.classList.remove("future-capsule-mode");choicesEl.setAttribute("aria-label","こたえを えらぶ");
 if(futureCapsuleLayer){futureCapsuleLayer.replaceChildren();futureCapsuleLayer.hidden=true;}
}
function updateFutureCapsuleHistory(current){
 if(!futureCapsuleLayer)return;
 futureCapsuleLayer.querySelectorAll(".future-capsule-progress i").forEach((building,index)=>building.classList.toggle("is-on",index<current));
 const progress=futureCapsuleLayer.querySelector(".future-capsule-progress");if(progress)progress.setAttribute("aria-label","まちの あかり "+current+"こ てんとう");
}
function futureCraneSafeMaxY(quizTop,entry,followY){
 const hookLimit=quizTop-30;if(!entry)return hookLimit;
 return Math.min(hookLimit,quizTop-8-followY-entry.payloadH/2);
}
function futureCraneCurrentMaxY(){
 if(!futureCraneGeometry)return 0;
 const entry=futureCapsuleOptions[futureCraneHeldIndex];
 return futureCraneSafeMaxY(futureCraneGeometry.quizTop,entry,futureCraneFollowY);
}
function scheduleFutureCraneGeometrySync(){
 if(futureCraneGeometryFrame)cancelAnimationFrame(futureCraneGeometryFrame);
 const epoch=futureCapsuleEpoch;
 futureCraneGeometryFrame=requestAnimationFrame(()=>{
  futureCraneGeometryFrame=requestAnimationFrame(()=>{
   futureCraneGeometryFrame=0;if(epoch!==futureCapsuleEpoch||!futureCapsuleLayer||futureCapsuleLayer.hidden)return;
   futureCraneGeometryDirty=true;syncFutureCraneGeometry();
  });
 });
}
function handleFutureCraneQuizTransitionEnd(event){
 if(event.target!==quiz||event.propertyName!=="transform"||!futureCapsuleLayer||futureCapsuleLayer.hidden)return;
 futureCraneGeometryDirty=true;syncFutureCraneGeometry();
}
function futureCraneEntryGeometry(entry,boardRect){
 const payloadElement=entry.button.querySelector(".future-capsule"),payloadRect=(payloadElement||entry.button).getBoundingClientRect();
 const baseElement=entry.cradle.querySelector(".future-crane-cradle-base")||entry.cradle,homeRect=baseElement.getBoundingClientRect();
 const homeX=(homeRect.left+homeRect.right)/2-boardRect.left,homeY=(homeRect.top+homeRect.bottom)/2-boardRect.top;
 const payloadW=payloadRect.width,payloadH=payloadRect.height,magnetY=homeY-payloadH/2;
 return {homeX,homeY,payloadW,payloadH,magnetY};
}
function syncFutureCraneGeometry(){
 const board=futureCapsuleLayer&&futureCapsuleLayer.querySelector(".future-capsule-board");if(!board||futureCapsuleLayer.hidden)return;
 const oldGeometry=futureCraneGeometry,boardRect=board.getBoundingClientRect(),quizRect=quiz.getBoundingClientRect(),height=boardRect.height||window.innerHeight||390;
 const quizTop=quiz.classList.contains("show")?quizRect.top-boardRect.top:height-98;
 board.style.setProperty("--future-quiz-inset",Math.max(84,height-quizTop+8)+"px");
 const railY=clamp(height*.16,52,112),stationMax=Math.max(142,quizTop-(height<=360?36:44));
 const stationY=Math.min(Math.max(height*.53,150),stationMax);
 board.style.setProperty("--future-crane-rail-y",railY.toFixed(1)+"px");
 board.style.setProperty("--future-crane-station-y",stationY.toFixed(1)+"px");
 const coreInner=board.querySelector(".future-crane-core-slot")?.getBoundingClientRect(),handleRect=board.querySelector(".future-crane-handle")?.getBoundingClientRect();
 futureCraneGeometry={
  width:boardRect.width,height,homeX:boardRect.width/2,homeY:railY+34,minX:22,maxX:Math.max(22,boardRect.width-22),
  minY:railY+34,maxY:futureCraneSafeMaxY(quizTop,null,0),railY,quizTop,
  crankCx:handleRect?(handleRect.left+handleRect.right)/2:56,crankCy:handleRect?(handleRect.top+handleRect.bottom)/2:stationY,
  coreInner:coreInner?{left:coreInner.left-boardRect.left,right:coreInner.right-boardRect.left,top:coreInner.top-boardRect.top,bottom:coreInner.bottom-boardRect.top,width:coreInner.width,height:coreInner.height,cx:(coreInner.left+coreInner.right)/2-boardRect.left,cy:(coreInner.top+coreInner.bottom)/2-boardRect.top}:null
 };
 futureCapsuleOptions.forEach(entry=>{
  Object.assign(entry,futureCraneEntryGeometry(entry,boardRect));
 });
 futureCraneGeometry.maxY=Math.max(futureCraneGeometry.minY,futureCraneGeometry.maxY);
 if(!oldGeometry||futureCranePhase==="idle"){
  futureCraneX=futureCraneGeometry.homeX;futureCraneY=futureCraneGeometry.homeY;
 }else{
  const oldSpan=Math.max(1,oldGeometry.maxX-oldGeometry.minX),newSpan=Math.max(1,futureCraneGeometry.maxX-futureCraneGeometry.minX);
  futureCraneX=futureCraneGeometry.minX+clamp((futureCraneX-oldGeometry.minX)/oldSpan,0,1)*newSpan;
  const targetEntry=futureCapsuleOptions[futureCraneTargetIndex];
  if(targetEntry&&(futureCranePhase==="pod-aligned"||futureCranePhase==="lower-pod"||futureCranePhase==="grip"||futureCranePhase==="auto-lift"))futureCraneX=targetEntry.homeX;
  if(futureCraneHeldIndex>=0&&(futureCranePhase==="core-aligned"||futureCranePhase==="lower-core")&&futureCraneGeometry.coreInner)futureCraneX=futureCraneGeometry.coreInner.cx;
  futureCraneY=clamp(futureCraneY,futureCraneGeometry.minY,Math.max(futureCraneGeometry.minY,futureCraneCurrentMaxY()));
 }
 if(futureCranePointerRole==="crank")futureCraneCrankLastAngle=futureCranePointerAngle(futureCraneLastPointerX,futureCraneLastPointerY);
 futureCraneGeometryDirty=false;applyFutureCraneVisual();
}
function futureCraneDescentTargetY(){
 if(!futureCraneGeometry)return 0;
 if(futureCranePhase==="lower-pod"){
  const entry=futureCapsuleOptions[futureCraneTargetIndex];return entry?entry.magnetY:futureCraneGeometry.homeY;
 }
 if(futureCranePhase==="lower-core"){
  const inner=futureCraneGeometry.coreInner;return inner?inner.cy-futureCraneFollowY:futureCraneGeometry.homeY;
 }
 return futureCraneGeometry.homeY;
}
function updateFutureCapsuleVisual(now){
 if(!futureCapsuleLayer||futureCapsuleLayer.hidden||!futureCapsuleOptions.length)return;
 if(futureCraneGeometryDirty||!futureCraneGeometry)syncFutureCraneGeometry();
 if(!futureCraneGeometry)return;
 if(!futureCraneActionHeld||(futureCranePhase!=="lower-pod"&&futureCranePhase!=="lower-core")){futureCraneLastTickAt=now||0;return;}
 const current=Number.isFinite(now)?now:_nowMs(),last=futureCraneLastTickAt||current,dt=clamp(current-last,0,50)/1000;futureCraneLastTickAt=current;
 const targetY=clamp(futureCraneDescentTargetY(),futureCraneGeometry.minY,Math.max(futureCraneGeometry.minY,futureCraneCurrentMaxY()));
 const distance=Math.max(0,targetY-futureCraneY),slowRadius=FUTURE_CRANE_SLOW_RADIUS[level]||FUTURE_CRANE_SLOW_RADIUS[1];
 const speed=distance<=slowRadius?(FUTURE_CRANE_SLOW_SPEED[level]||FUTURE_CRANE_SLOW_SPEED[1]):(FUTURE_CRANE_DESCENT_SPEED[level]||FUTURE_CRANE_DESCENT_SPEED[1]);
 futureCraneY=Math.min(targetY,futureCraneY+speed*dt);
 if(futureCranePhase==="lower-core")updateFutureCraneCoreReady();
 applyFutureCraneVisual();
}
function futureCranePayloadCenter(){
 const entry=futureCapsuleOptions[futureCraneHeldIndex];
 return entry?{x:futureCraneX+futureCraneFollowX,y:futureCraneY+futureCraneFollowY}:null;
}
function applyFutureCraneVisual(){
 const board=futureCapsuleLayer&&futureCapsuleLayer.querySelector(".future-capsule-board");if(!board||!futureCraneGeometry)return;
 board.style.setProperty("--future-crane-x",futureCraneX.toFixed(2)+"px");board.style.setProperty("--future-crane-y",futureCraneY.toFixed(2)+"px");
 board.style.setProperty("--future-crane-cable-scale",Math.max(.06,(futureCraneY-futureCraneGeometry.railY)/100).toFixed(3));
 board.style.setProperty("--future-crank-angle",futureCraneCrankRotation.toFixed(4)+"rad");
 const entry=futureCapsuleOptions[futureCraneHeldIndex],payload=futureCranePayloadCenter();
 if(entry&&payload)entry.button.style.transform="translate3d("+(payload.x-entry.homeX).toFixed(2)+"px,"+(payload.y-entry.homeY).toFixed(2)+"px,0)";
 board.classList.toggle("is-pointer-active",futureCranePointerId!==null);board.classList.toggle("is-carrying",futureCraneHeldIndex>=0);
 board.classList.toggle("is-lifted",futureCraneLifted);board.classList.toggle("is-core-ready",futureCraneCoreReady);
 board.dataset.heldPod=futureCraneHeldIndex<0?"":String(futureCraneHeldIndex);board.dataset.pointerActive=futureCranePointerId===null?"false":"true";
}
function futureCranePickupIndex(){
 if(!futureCraneGeometry)return -1;
 const xTolerance=FUTURE_CRANE_PICKUP_X_TOLERANCE[level]||FUTURE_CRANE_PICKUP_X_TOLERANCE[1],yTolerance=FUTURE_CRANE_PICKUP_Y_TOLERANCE[level]||FUTURE_CRANE_PICKUP_Y_TOLERANCE[1];
 const entry=futureCapsuleOptions.find(item=>!item.button.disabled&&Math.abs(futureCraneX-item.homeX)<=xTolerance&&Math.abs(futureCraneY-item.magnetY)<=yTolerance);
 return entry?entry.index:-1;
}
function futureCraneCrossesTarget(oldX,newX,targetX){
 return (oldX-targetX)*(newX-targetX)<0||newX===targetX;
}
function prepareFutureCraneSnapDeparture(){
 if(futureCranePhase==="pod-aligned"){
  futureCraneSkipSnapKey="pod:"+futureCraneTargetIndex;setFutureCranePhase("seek");futureCapsuleGuide("ハンドルで ポッドに あわせよう");
 }else if(futureCranePhase==="core-aligned"){
  futureCraneSkipSnapKey="core";setFutureCranePhase("carry");futureCapsuleGuide("ハンドルを まんなかへ もどそう");
 }
}
function futureCraneSnapPod(oldX,newX){
 const tolerance=FUTURE_CRANE_PICKUP_X_TOLERANCE[level]||FUTURE_CRANE_PICKUP_X_TOLERANCE[1];
 if(futureCraneSkipSnapKey.startsWith("pod:")){
  const skipped=futureCapsuleOptions[Number(futureCraneSkipSnapKey.slice(4))];
  if(!skipped||Math.abs(newX-skipped.homeX)>tolerance)futureCraneSkipSnapKey="";
 }
 const candidates=futureCapsuleOptions.filter(entry=>!entry.button.disabled&&futureCraneSkipSnapKey!=="pod:"+entry.index);
 const crossed=candidates.filter(entry=>futureCraneCrossesTarget(oldX,newX,entry.homeX)).sort((a,b)=>Math.abs(a.homeX-oldX)-Math.abs(b.homeX-oldX))[0];
 if(crossed)return crossed;
 return candidates.filter(entry=>Math.abs(newX-entry.homeX)<=tolerance).sort((a,b)=>Math.abs(newX-a.homeX)-Math.abs(newX-b.homeX))[0]||null;
}
function futureCraneSnapCore(oldX,newX){
 const inner=futureCraneGeometry&&futureCraneGeometry.coreInner;if(!inner)return false;
 const tolerance=FUTURE_CRANE_CORE_SNAP_X[level]||FUTURE_CRANE_CORE_SNAP_X[1];
 if(futureCraneSkipSnapKey==="core"&&Math.abs(newX-inner.cx)>tolerance)futureCraneSkipSnapKey="";
 if(futureCraneSkipSnapKey==="core")return false;
 return Math.abs(newX-inner.cx)<=tolerance||futureCraneCrossesTarget(oldX,newX,inner.cx);
}
function turnFutureCraneByAngle(angle){
 if(!futureCraneScreenActive()||answerLocked||futureCapsuleResolving||!futureCranePhaseCanTurn())return false;
 if(futureCraneGeometryDirty||!futureCraneGeometry)syncFutureCraneGeometry();if(!futureCraneGeometry)return false;
 if(futureCranePhase==="pod-aligned"||futureCranePhase==="core-aligned")prepareFutureCraneSnapDeparture();
 const railSpan=Math.max(1,futureCraneGeometry.maxX-futureCraneGeometry.minX),perTurn=FUTURE_CRANE_RAIL_PER_TURN[level]||FUTURE_CRANE_RAIL_PER_TURN[1];
 const oldX=futureCraneX,newX=clamp(oldX+angle/(Math.PI*2)*railSpan*perTurn,futureCraneGeometry.minX,futureCraneGeometry.maxX);
 futureCraneCrankRotation+=angle;
 if(futureCraneHeldIndex<0){
  const entry=futureCraneSnapPod(oldX,newX);
  if(entry){futureCraneX=entry.homeX;futureCraneTargetIndex=entry.index;futureCraneSkipSnapKey="";setFutureCranePhase("pod-aligned");futureCapsuleGuide("あった！ ボタンを おして おろそう");tone(760,0,.05,"sine",.035);}
  else{futureCraneX=newX;futureCraneTargetIndex=-1;if(futureCranePhase!=="seek")setFutureCranePhase("seek");}
 }else if(futureCraneSnapCore(oldX,newX)){
  futureCraneX=futureCraneGeometry.coreInner.cx;futureCraneFollowX=0;futureCraneSkipSnapKey="";setFutureCranePhase("core-aligned");futureCapsuleGuide("まんなか！ ボタンで コアへ おろそう");tone(840,0,.05,"sine",.035);
 }else{futureCraneX=newX;futureCraneFollowX=0;if(futureCranePhase!=="carry")setFutureCranePhase("carry");}
 futureCraneCoreReady=false;applyFutureCraneVisual();return true;
}
function normalizeFutureCraneAngle(angle){return Math.atan2(Math.sin(angle),Math.cos(angle));}
function futureCranePointerAngle(clientX,clientY){
 if(!futureCraneGeometry)return null;
 const dx=clientX-futureCraneGeometry.crankCx,dy=clientY-futureCraneGeometry.crankCy;
 return Math.hypot(dx,dy)<FUTURE_CRANE_CRANK_DEADZONE?null:Math.atan2(dy,dx);
}
function handleFutureCraneHandlePointerDown(event){
 if(event.button!==0||event.isPrimary===false||futureCranePointerId!==null||!futureCranePhaseCanTurn()||answerLocked||futureCapsuleResolving)return;
 if(futureCraneGeometryDirty||!futureCraneGeometry)syncFutureCraneGeometry();if(!futureCraneGeometry)return;
 event.preventDefault();ensureAC();futureCranePointerId=event.pointerId;futureCranePointerRole="crank";futureCranePointerCaptureTarget=event.currentTarget;
 futureCranePointerPhaseAtDown=futureCranePhase;futureCraneLastPointerX=event.clientX;futureCraneLastPointerY=event.clientY;futureCraneCrankLastAngle=futureCranePointerAngle(event.clientX,event.clientY);futureCraneKeyboardActive=false;
 try{event.currentTarget.setPointerCapture(event.pointerId);}catch(_){}applyFutureCraneVisual();updateFutureCraneControls();
}
function handleFutureCraneHandlePointerMove(event){
 if(event.pointerId!==futureCranePointerId||futureCranePointerRole!=="crank")return;
 event.preventDefault();futureCraneLastPointerX=event.clientX;futureCraneLastPointerY=event.clientY;
 const angle=futureCranePointerAngle(event.clientX,event.clientY);if(angle===null){futureCraneCrankLastAngle=null;return;}
 if(futureCraneCrankLastAngle===null){futureCraneCrankLastAngle=angle;return;}
 const delta=clamp(normalizeFutureCraneAngle(angle-futureCraneCrankLastAngle),-FUTURE_CRANE_EVENT_ANGLE_CAP,FUTURE_CRANE_EVENT_ANGLE_CAP);futureCraneCrankLastAngle=angle;
 if(Math.abs(delta)>.003)turnFutureCraneByAngle(delta);
}
function finishFutureCraneHandlePointer(event){
 if(event.pointerId!==futureCranePointerId||futureCranePointerRole!=="crank")return;
 event.preventDefault();releaseFutureCranePointerCapture();applyFutureCraneVisual();updateFutureCraneControls();
}
function futureCraneCoreEdgeTolerance(tolerance){return Math.min(4,Math.max(0,tolerance/4));}
function futureCranePayloadFitsCore(payload,inner,payloadW,payloadH,tolerance){
 if(!payload||!inner)return false;
 const edgeTolerance=futureCraneCoreEdgeTolerance(tolerance),halfW=payloadW/2,halfH=payloadH/2;
 return payload.x-halfW>=inner.left-edgeTolerance&&payload.x+halfW<=inner.right+edgeTolerance&&payload.y-halfH>=inner.top-edgeTolerance&&payload.y+halfH<=inner.bottom+edgeTolerance;
}
function updateFutureCraneCoreReady(){
 const entry=futureCapsuleOptions[futureCraneHeldIndex],payload=futureCranePayloadCenter(),inner=futureCraneGeometry&&futureCraneGeometry.coreInner,tolerance=FUTURE_CRANE_CORE_TOLERANCE[level]||FUTURE_CRANE_CORE_TOLERANCE[1];
 futureCraneCoreReady=!!(entry&&futureCranePhase==="lower-core"&&futureCranePayloadFitsCore(payload,inner,entry.payloadW,entry.payloadH,tolerance));
}
function startFutureCraneAction(input){
 if(!futureCraneScreenActive()||answerLocked||futureCapsuleResolving)return false;
 futureCranePointerPhaseAtDown=futureCranePhase;futureCraneGripTapEligible=futureCranePhase==="grip"&&_nowMs()>=futureCraneGripArmedAt;
 if(futureCranePhase==="pod-aligned"){
  futureCraneActionHeld=true;futureCraneLastTickAt=_nowMs();setFutureCranePhase("lower-pod");futureCapsuleGuide("おしている あいだ おりるよ");
 }else if(futureCranePhase==="core-aligned"){
  futureCraneActionHeld=true;futureCraneCoreReady=false;futureCraneLastTickAt=_nowMs();setFutureCranePhase("lower-core");futureCapsuleGuide("コアの なかまで おろそう");
 }else if(futureCranePhase!=="grip"){
  futureCapsuleGuide(futureCraneHeldIndex>=0?"ハンドルを まんなかへ もどそう":"ハンドルで ポッドに あわせよう");return false;
 }
 if(input==="keyboard")futureCraneKeyboardActive=true;
 updateFutureCraneControls();return true;
}
function handleFutureCraneActionPointerDown(event){
 if(event.button!==0||event.isPrimary===false||futureCranePointerId!==null||answerLocked||futureCapsuleResolving)return;
 if(!["pod-aligned","core-aligned","grip"].includes(futureCranePhase))return;
 event.preventDefault();ensureAC();futureCranePointerId=event.pointerId;futureCranePointerRole="action";futureCranePointerCaptureTarget=event.currentTarget;futureCraneKeyboardActive=false;
 try{event.currentTarget.setPointerCapture(event.pointerId);}catch(_){}startFutureCraneAction("pointer");applyFutureCraneVisual();
}
function performFutureCraneGripTap(){
 if(futureCranePhase!=="grip"||_nowMs()<futureCraneGripArmedAt||futureCraneGripCount>=FUTURE_CRANE_GRIP_GOAL)return false;
 futureCraneGripCount+=1;futureCapsuleGuide(futureCraneGripCount<FUTURE_CRANE_GRIP_GOAL?"ぎゅっ！ あと "+(FUTURE_CRANE_GRIP_GOAL-futureCraneGripCount)+"かい":"しっかり つかんだ！");
 tone(560+futureCraneGripCount*110,0,.07,"triangle",.05);updateFutureCraneControls();applyFutureCraneVisual();
 if(futureCraneGripCount>=FUTURE_CRANE_GRIP_GOAL)attachFutureCranePod();return true;
}
function finishFutureCranePodDescent(cancelled){
 const entry=futureCapsuleOptions[futureCraneTargetIndex],xTolerance=FUTURE_CRANE_PICKUP_X_TOLERANCE[level]||FUTURE_CRANE_PICKUP_X_TOLERANCE[1],yTolerance=FUTURE_CRANE_PICKUP_Y_TOLERANCE[level]||FUTURE_CRANE_PICKUP_Y_TOLERANCE[1];
 const reached=!!(!cancelled&&entry&&!entry.button.disabled&&Math.abs(futureCraneX-entry.homeX)<=xTolerance&&Math.abs(futureCraneY-entry.magnetY)<=yTolerance);
 futureCraneActionHeld=false;futureCraneLastTickAt=0;
 if(!reached){autoRiseFutureCrane("pod-aligned","もう すこし おろしてみよう");return;}
 futureCraneX=entry.homeX;futureCraneY=entry.magnetY;futureCraneGripCount=0;futureCraneGripArmedAt=_nowMs()+FUTURE_CRANE_GRIP_ARM_MS;
 setFutureCranePhase("grip");futureCapsuleGuide("ボタンを 3かい ぎゅっ！");tone(680,0,.08,"sine",.04);applyFutureCraneVisual();
}
function finishFutureCraneCoreDescent(cancelled){
 futureCraneActionHeld=false;futureCraneLastTickAt=0;updateFutureCraneCoreReady();
 if(!cancelled&&futureCraneCoreReady){resolveFutureCapsule(futureCapsuleOptions[futureCraneHeldIndex]);return;}
 autoRiseFutureCrane("core-aligned","もう すこし コアへ おろそう");
}
function finishFutureCraneAction(cancelled,input){
 const phaseAtDown=futureCranePointerPhaseAtDown,tapEligible=futureCraneGripTapEligible;
 if(input==="pointer")releaseFutureCranePointerCapture();
 futureCraneActionHeld=false;futureCraneGripTapEligible=false;futureCranePointerPhaseAtDown="";
 if(phaseAtDown==="pod-aligned"&&futureCranePhase==="lower-pod"){finishFutureCranePodDescent(cancelled);return;}
 if(phaseAtDown==="core-aligned"&&futureCranePhase==="lower-core"){finishFutureCraneCoreDescent(cancelled);return;}
 if(phaseAtDown==="grip"&&futureCranePhase==="grip"&&!cancelled&&tapEligible)performFutureCraneGripTap();
 updateFutureCraneControls();applyFutureCraneVisual();
}
function finishFutureCraneActionPointer(event){
 if(event.pointerId!==futureCranePointerId||futureCranePointerRole!=="action")return;event.preventDefault();finishFutureCraneAction(false,"pointer");
}
function cancelFutureCraneActionPointer(event){
 if(event.pointerId!==futureCranePointerId||futureCranePointerRole!=="action")return;finishFutureCraneAction(true,"pointer");
}
function attachFutureCranePod(){
 const entry=futureCapsuleOptions[futureCraneTargetIndex];if(!entry||entry.button.disabled||futureCraneHeldIndex>=0||!futureCraneGeometry)return;
 futureCraneHeldIndex=entry.index;futureCapsuleSelectedIndex=entry.index;futureCraneX=entry.homeX;futureCraneY=entry.magnetY;futureCraneFollowX=0;futureCraneFollowY=entry.payloadH/2;
 futureCraneLifted=false;futureCraneCoreReady=false;entry.button.classList.add("is-selected");entry.button.setAttribute("aria-pressed","true");entry.cradle.classList.add("is-carrying");
 futureCapsuleOptions.forEach(item=>{if(item!==entry)item.button.setAttribute("aria-disabled","true");});
 const duration=futureReducedMotion()?FUTURE_CRANE_RETURN_REDUCED_MS:FUTURE_CRANE_AUTO_LIFT_MS,epoch=futureCapsuleEpoch,board=futureCapsuleLayer.querySelector(".future-capsule-board");
 if(board)board.style.setProperty("--future-auto-ms",duration+"ms");setFutureCranePhase("auto-lift");futureCapsuleGuide("つかんだ！ うえへ あがるよ");applyFutureCraneVisual();
 futureCraneY=futureCraneGeometry.homeY;applyFutureCraneVisual();tone(620,0,.08,"triangle",.05);tone(820,.06,.1,"sine",.04);
 setFutureCapsuleTimer(()=>{
  if(epoch!==futureCapsuleEpoch||futureCranePhase!=="auto-lift")return;
  futureCraneY=futureCraneGeometry?futureCraneGeometry.homeY:futureCraneY;futureCraneLifted=true;futureCraneSkipSnapKey="";setFutureCranePhase("carry");futureCapsuleGuide("ハンドルを まんなかへ もどそう");applyFutureCraneVisual();
 },duration);
}
function autoRiseFutureCrane(nextPhase,message){
 if(!futureCraneGeometry)return;
 const epoch=futureCapsuleEpoch,duration=futureReducedMotion()?FUTURE_CRANE_RETURN_REDUCED_MS:FUTURE_CRANE_RETURN_MS,board=futureCapsuleLayer.querySelector(".future-capsule-board");
 releaseFutureCranePointerCapture();futureCraneKeyboardActionHeld=false;futureCraneActionHeld=false;futureCraneCoreReady=false;futureCapsuleResolving=true;
 if(board)board.style.setProperty("--future-auto-ms",duration+"ms");setFutureCranePhase("auto-rise");futureCapsuleGuide(message);futureCraneY=futureCraneGeometry.homeY;applyFutureCraneVisual();
 setFutureCapsuleTimer(()=>{
  if(epoch!==futureCapsuleEpoch||futureCranePhase!=="auto-rise")return;
  futureCapsuleResolving=false;futureCraneY=futureCraneGeometry?futureCraneGeometry.homeY:futureCraneY;setFutureCranePhase(nextPhase);applyFutureCraneVisual();
 },duration);
}
function returnFutureCranePayload(message){
 const board=futureCapsuleLayer&&futureCapsuleLayer.querySelector(".future-capsule-board"),entry=futureCapsuleOptions[futureCraneHeldIndex],epoch=futureCapsuleEpoch;
 releaseFutureCranePointerCapture();futureCraneKeyboardActionHeld=false;futureCraneActionHeld=false;futureCapsuleResolving=true;futureCraneCoreReady=false;futureCraneLifted=false;
 if(board){board.classList.remove("is-pointer-active","is-carrying","is-core-ready","is-lifted","is-rejected");board.classList.add("is-returning");}
 if(futureCraneGeometry){futureCraneX=futureCraneGeometry.homeX;futureCraneY=futureCraneGeometry.homeY;}
 if(entry&&futureCraneGeometry){futureCraneFollowX=entry.homeX-futureCraneX;futureCraneFollowY=entry.homeY-futureCraneY;entry.button.style.transform="translate3d(0,0,0)";}
 setFutureCranePhase("returning");futureCapsuleGuide(message||"だいじょうぶ。もう いちど！");applyFutureCraneVisual();
 setFutureCapsuleTimer(()=>{
  if(epoch!==futureCapsuleEpoch)return;
  if(board)board.classList.remove("is-returning","is-carrying","is-rejected");
  if(entry){entry.button.classList.remove("is-selected","is-rejected");entry.button.setAttribute("aria-pressed","false");entry.cradle.classList.remove("is-carrying");}
  futureCraneHeldIndex=-1;futureCraneTargetIndex=-1;futureCapsuleSelectedIndex=-1;futureCraneFollowX=0;futureCraneFollowY=0;futureCraneGripCount=0;
  futureCraneSubmissionCommitted=false;futureCraneKeyboardActive=false;futureCapsuleResolving=false;
  futureCapsuleOptions.forEach(item=>item.button.setAttribute("aria-disabled",item.button.disabled?"true":"false"));
  setFutureCranePhase("seek");futureCapsuleGuide(message||"ハンドルで ポッドに あわせよう");applyFutureCraneVisual();
  if(board)board.focus({preventScroll:true});
 },futureReducedMotion()?FUTURE_CRANE_RETURN_REDUCED_MS:FUTURE_CRANE_RETURN_MS);
}
function cancelFutureCraneInteraction(message){
 if(futureCranePhase==="lower-pod"||futureCranePhase==="grip"){autoRiseFutureCrane("pod-aligned",message);return;}
 if(futureCranePhase==="lower-core"){autoRiseFutureCrane("core-aligned",message);return;}
 if(futureCraneHeldIndex>=0){returnFutureCranePayload(message);return;}
 releaseFutureCranePointerCapture();futureCraneKeyboardActionHeld=false;futureCraneActionHeld=false;applyFutureCraneVisual();
}
function pauseFutureCraneInput(){
 if(!futureCapsuleLayer||futureCapsuleLayer.hidden||futureCapsuleResolving)return;
 if(futureCranePointerId!==null||futureCraneKeyboardActionHeld||futureCraneHeldIndex>=0||futureCranePhase==="lower-pod"||futureCranePhase==="grip")cancelFutureCraneInteraction("だいじょうぶ。もう いちど！");
}
function handleFutureCraneViewportChange(){
 if(!futureCapsuleLayer||futureCapsuleLayer.hidden)return;
 futureCraneGeometryDirty=true;scheduleFutureCraneGeometrySync();
}
function resolveFutureCapsule(entry){
 if(!entry||futureCraneHeldIndex!==entry.index||!futureCraneCoreReady||futureCraneSubmissionCommitted)return;
 futureCraneSubmissionCommitted=true;futureCapsuleResolving=true;releaseFutureCranePointerCapture();
 const epoch=futureCapsuleEpoch,board=futureCapsuleLayer.querySelector(".future-capsule-board");setFutureCranePhase("resolving");
 if(!entry.o.ok){
  entry.button.classList.add("is-rejected");if(board)board.classList.add("is-rejected");futureCapsuleGuide("もう ひとつの ポッドを はこぼう");
  setFutureCapsuleTimer(()=>{if(epoch!==futureCapsuleEpoch)return;onPick(entry.button,{ok:false,mode:"future"});returnFutureCranePayload("もう ひとつの ポッドを はこぼう");},180);return;
 }
 entry.button.classList.add("is-inserting");if(board)board.classList.add("is-inserting");futureCapsuleEnergy=0;
 const pulse=()=>{
  if(epoch!==futureCapsuleEpoch)return;
  futureCapsuleEnergy+=1;
  const energy=futureCapsuleLayer.querySelector(".future-capsule-energy"),cells=futureCapsuleLayer.querySelectorAll(".future-capsule-energy i");
  if(energy){energy.setAttribute("aria-valuenow",String(futureCapsuleEnergy));energy.setAttribute("aria-valuetext","エナジー "+futureCapsuleEnergy+"こ");}
  if(cells[futureCapsuleEnergy-1])cells[futureCapsuleEnergy-1].classList.add("is-on");tone(650+futureCapsuleEnergy*150,0,.09,"triangle",.055);
  if(futureCapsuleEnergy<3){setFutureCapsuleTimer(pulse,futureReducedMotion()?45:FUTURE_CRANE_PULSE_MS);return;}
  if(board){board.classList.remove("is-inserting");board.classList.add("is-complete");}
  document.body.classList.add("future-capsule-complete");updateFutureCapsuleHistory(qSeg+1);setFutureCranePhase("complete");
  futureCapsuleGuide(qSeg===QN-1?"みらいシティ かんせい！":"まちが ひかった！ リニア はっしん！");tone(988,.06,.2,"sine",.07);confetti(10);
  onPick(entry.button,{ok:true,mode:"future",skipOkSound:true});
  setFutureCapsuleTimer(()=>{if(epoch===futureCapsuleEpoch)clearFutureCapsuleGame();},futureReducedMotion()?280:480);
 };
 setFutureCapsuleTimer(pulse,futureReducedMotion()?30:80);
}
function assistFutureCapsuleGame(){
 if(!futureCapsuleLayer||futureCapsuleLayer.hidden||futureCapsuleResolving||futureCraneBusy())return;
 futureCapsuleAssisted=true;
 const wrong=futureCapsuleOptions.find(entry=>!entry.o.ok),correct=futureCapsuleOptions.find(entry=>entry.o.ok);if(!correct)return;
 if(wrong){wrong.button.classList.add("dim");wrong.button.disabled=true;wrong.button.setAttribute("aria-disabled","true");}
 correct.button.classList.add("glow");futureCapsuleLayer.querySelector(".future-capsule-board")?.focus({preventScroll:true});
 futureCapsuleLayer.querySelector(".future-capsule-board")?.classList.add("is-assisted");futureCapsuleGuide("ひかる ポッドに ハンドルを あわせよう");
}
function renderFutureCapsuleGame(){
 if(!futureCapsuleLayer)return;
 futureCapsuleOptions=[];futureCapsuleSelectedIndex=-1;futureCapsuleResolving=false;futureCapsuleAssisted=false;futureCapsuleEnergy=0;
 futureCranePhase="idle";futureCranePointerId=null;futureCranePointerRole="";futureCranePointerCaptureTarget=null;futureCranePointerPhaseAtDown="";futureCraneHeldIndex=-1;futureCraneTargetIndex=-1;
 futureCraneCrankLastAngle=null;futureCraneCrankRotation=0;futureCraneActionHeld=false;futureCraneKeyboardActionHeld=false;futureCraneGripTapEligible=false;futureCraneGripCount=0;futureCraneGripArmedAt=0;futureCraneLastTickAt=0;futureCraneSkipSnapKey="";
 futureCraneLifted=false;futureCraneCoreReady=false;futureCraneSubmissionCommitted=false;futureCraneKeyboardActive=false;futureCraneGeometry=null;futureCraneGeometryDirty=true;
 document.body.classList.add("future-capsule-active");quiz.classList.add("future-capsule-quiz");choicesEl.classList.add("future-capsule-mode");choicesEl.setAttribute("aria-label","ただしい ポッドを コアへ はこぶ");
 futureCapsuleLayer.hidden=false;futureCapsuleLayer.replaceChildren();
 const board=document.createElement("div");board.className="future-capsule-board";board.tabIndex=0;board.setAttribute("aria-label","ミライシティの ユーフォーキャッチャー。ハンドルを まわし、ボタンを おして ポッドを はこぶ");board.setAttribute("aria-keyshortcuts","ArrowLeft ArrowRight Space Enter Escape");
 const guide=document.createElement("div");guide.className="future-capsule-guide";guide.setAttribute("role","status");guide.setAttribute("aria-live","polite");guide.textContent="ハンドルで ポッドに あわせよう";
 const progress=document.createElement("div");progress.className="future-capsule-progress";progress.setAttribute("role","status");for(let index=0;index<QN;index++)progress.appendChild(document.createElement("i"));
 const city=document.createElement("div");city.className="future-capsule-city";city.setAttribute("aria-hidden","true");
 const rail=document.createElement("div");rail.className="future-crane-rail";rail.setAttribute("aria-hidden","true");
 const trolley=document.createElement("div");trolley.className="future-crane-trolley";trolley.setAttribute("aria-hidden","true");
 const rig=document.createElement("div");rig.className="future-crane-hook-rig";rig.setAttribute("aria-hidden","true");
 const cable=document.createElement("span");cable.className="future-crane-cable";const hook=document.createElement("span");hook.className="future-crane-hook";
 const clawLeft=document.createElement("i"),clawRight=document.createElement("i");hook.append(clawLeft,clawRight);rig.append(cable,hook);
 const core=document.createElement("div");core.className="future-crane-core";core.setAttribute("aria-hidden","true");
 const coreRing=document.createElement("span");coreRing.className="future-crane-core-ring";const coreSlot=document.createElement("span");coreSlot.className="future-crane-core-slot";core.append(coreRing,coreSlot);
 const energy=document.createElement("div");energy.className="future-capsule-energy";energy.setAttribute("role","progressbar");energy.setAttribute("aria-label","まちの エナジー");energy.setAttribute("aria-valuemin","0");energy.setAttribute("aria-valuemax","3");energy.setAttribute("aria-valuenow","0");for(let index=0;index<3;index++)energy.appendChild(document.createElement("i"));core.appendChild(energy);
 const stations=document.createElement("div");stations.className="future-crane-stations";
 futureQuestionOptions(cur).forEach((o,index)=>{
  const cradle=document.createElement("div");cradle.className="future-crane-cradle cradle-"+(index+1);const base=document.createElement("span");base.className="future-crane-cradle-base";base.setAttribute("aria-hidden","true");
  const button=document.createElement("button");button.type="button";button.tabIndex=-1;button.className="choice future-capsule-lane future-crane-pod pod-"+(index+1);button.dataset.ok=o.ok?"1":"0";button.setAttribute("aria-label",o.t+"の ポッド");button.setAttribute("aria-pressed","false");button.setAttribute("aria-disabled","false");
  const capsule=document.createElement("span");capsule.className="future-capsule future-crane-payload";capsule.setAttribute("aria-hidden","true");
  const art=createQuizArt(o.e,o.t);const label=document.createElement("span");label.className="lb";label.textContent=o.t;capsule.append(art,label);button.appendChild(capsule);
  cradle.append(base,button);stations.appendChild(cradle);futureCapsuleOptions.push({button,cradle,o,index,homeX:0,homeY:0,payloadW:0,payloadH:0,magnetY:0});
 });
 const controls=document.createElement("div");controls.className="future-crane-controls";
 const handle=document.createElement("button");handle.type="button";handle.className="future-crane-handle";handle.setAttribute("aria-label","まるい ハンドルを まわす");handle.setAttribute("aria-pressed","false");
 const handleWheel=document.createElement("span");handleWheel.className="future-crane-handle-wheel";for(let index=0;index<4;index++)handleWheel.appendChild(document.createElement("i"));const handleKnob=document.createElement("b");handleKnob.setAttribute("aria-hidden","true");handleWheel.appendChild(handleKnob);handle.appendChild(handleWheel);
 const action=document.createElement("button");action.type="button";action.className="future-crane-action";action.setAttribute("aria-label","クレーンを おろす");action.setAttribute("aria-pressed","false");
 const actionLabel=document.createElement("span");actionLabel.className="future-crane-action-label";actionLabel.textContent="おす！";const gripMeter=document.createElement("span");gripMeter.className="future-crane-grip-meter";gripMeter.setAttribute("aria-hidden","true");for(let index=0;index<FUTURE_CRANE_GRIP_GOAL;index++)gripMeter.appendChild(document.createElement("i"));action.append(actionLabel,gripMeter);controls.append(handle,action);
 const runner=document.createElement("div");runner.className="future-capsule-runner";runner.setAttribute("aria-hidden","true");runner.innerHTML="<i></i><i></i><i></i>";
 board.append(city,rail,trolley,core,stations,runner,rig,controls,guide,progress);futureCapsuleLayer.appendChild(board);
 handle.addEventListener("pointerdown",handleFutureCraneHandlePointerDown,{passive:false});handle.addEventListener("pointermove",handleFutureCraneHandlePointerMove,{passive:false});handle.addEventListener("pointerup",finishFutureCraneHandlePointer,{passive:false});handle.addEventListener("pointercancel",finishFutureCraneHandlePointer);handle.addEventListener("lostpointercapture",finishFutureCraneHandlePointer);
 action.addEventListener("pointerdown",handleFutureCraneActionPointerDown,{passive:false});action.addEventListener("pointerup",finishFutureCraneActionPointer,{passive:false});action.addEventListener("pointercancel",cancelFutureCraneActionPointer);action.addEventListener("lostpointercapture",cancelFutureCraneActionPointer);
 setFutureCranePhase("seek");illustratedText(hintText,"city","ポッドを コアへ はこぼう","hint-inline-art");updateFutureCapsuleHistory(qSeg);syncFutureCraneGeometry();scheduleFutureCraneGeometrySync();board.focus({preventScroll:true});
}
function spaceQuestionOptions(question){
 const wrong=shuffle((question&&question.d||[]).map(x=>({e:x[0],t:x[1],ok:false})))[0];
 return shuffle([{e:question.a[0],t:question.a[1],ok:true},wrong].filter(Boolean));
}
function normalizeSpaceGalaxyAngle(angle){return Math.atan2(Math.sin(angle),Math.cos(angle));}
function spaceGalaxyPlayable(){
 return !window.__PONO_TIER_LOCKED__&&isSpaceStage()&&playing&&!driving&&!answerLocked&&!spaceGalaxyResolving&&
  (spaceGalaxyPhase==="choose"||spaceGalaxyPhase==="wind")&&quiz.classList.contains("show")&&spaceGalaxyLayer&&!spaceGalaxyLayer.hidden;
}
function spaceGalaxyGuide(message){
 const guide=spaceGalaxyLayer&&spaceGalaxyLayer.querySelector(".space-galaxy-guide");if(guide)guide.textContent=message;
}
function clearSpaceGalaxyGame(){
 spaceGalaxyEpoch++;clearTimeout(spaceGalaxyTimer);spaceGalaxyTimer=0;
 const engine=spaceGalaxyLayer&&spaceGalaxyLayer.querySelector(".space-galaxy-engine");
 if(engine&&spaceGalaxyPointerId!==null){try{engine.releasePointerCapture(spaceGalaxyPointerId);}catch(_){}}
 spaceGalaxyOptions=[];spaceGalaxyRotation=0;spaceGalaxyPhase="idle";spaceGalaxyPointerId=null;spaceGalaxyPointerAngle=0;spaceGalaxyPointerX=0;spaceGalaxyPointerY=0;
 spaceGalaxyDragged=false;spaceGalaxySuppressClick=false;spaceGalaxyWind=0;spaceGalaxyWindStage=0;spaceGalaxySelectedIndex=-1;spaceGalaxyTurnsAnnounced=0;
 spaceGalaxyResolving=false;spaceGalaxyAssisted=false;spaceGalaxyKeyboardTarget=-1;
 document.body.classList.remove("space-galaxy-active","space-galaxy-complete");quiz.classList.remove("space-galaxy-quiz");choicesEl.classList.remove("space-galaxy-mode");choicesEl.setAttribute("aria-label","こたえを えらぶ");
 if(spaceGalaxyLayer){spaceGalaxyLayer.replaceChildren();spaceGalaxyLayer.hidden=true;}
}
function spaceGalaxyGeometry(){
 const engine=spaceGalaxyLayer&&spaceGalaxyLayer.querySelector(".space-galaxy-engine"),rect=engine&&engine.getBoundingClientRect();
 if(rect&&rect.width)return {cx:rect.left+rect.width*.5,cy:rect.top+rect.height*.5,rx:rect.width*.5,ry:rect.height*.5};
 const width=window.innerWidth||844,height=window.innerHeight||390;return {cx:width*.52,cy:height*.48,rx:Math.min(width,height)*.18,ry:Math.min(width,height)*.18};
}
function updateSpaceGalaxyJourney(current){
 if(!spaceGalaxyLayer)return;
 spaceGalaxyLayer.querySelectorAll(".space-galaxy-journey-star").forEach((star,index)=>star.classList.toggle("is-on",index<current));
 const trail=spaceGalaxyLayer.querySelector(".space-galaxy-journey");if(trail){trail.style.setProperty("--trail-fill",(clamp(current/QN,0,1)*100).toFixed(0)+"%");trail.classList.toggle("is-complete",current>=QN);trail.setAttribute("aria-label","せいざ "+current+"こ かんせい");}
 spaceGalaxyLayer.querySelector(".space-galaxy-board")?.classList.toggle("is-constellation-complete",current>=QN);
}
function updateSpaceGalaxyVisual(){
 if(!spaceGalaxyLayer||spaceGalaxyLayer.hidden)return;
 const board=spaceGalaxyLayer.querySelector(".space-galaxy-board");if(!board)return;
 const viewportHeight=window.innerHeight||390;if(quiz.classList.contains("show")){const rect=quiz.getBoundingClientRect();board.style.setProperty("--space-quiz-inset",Math.max(84,viewportHeight-rect.top+10)+"px");}
 const power=clamp(spaceGalaxyWind/SPACE_GALAXY_WIND_GOAL,0,1);board.style.setProperty("--engine-angle",spaceGalaxyRotation.toFixed(4)+"rad");board.style.setProperty("--galaxy-power",(power*100).toFixed(1)+"%");
 const meter=board.querySelector(".space-galaxy-meter");if(meter){const lit=Math.min(12,Math.floor(power*12+.0001));meter.setAttribute("aria-valuenow",String(lit));meter.setAttribute("aria-valuetext","スター パワー "+lit+"こ");board.querySelectorAll(".space-galaxy-meter i").forEach((cell,index)=>cell.classList.toggle("is-on",index<lit));}
}
function selectSpaceGalaxyAnswer(index){
 if(!spaceGalaxyPlayable())return;
 const entry=spaceGalaxyOptions[index];if(!entry||entry.button.disabled)return;
 ensureAC();spaceGalaxySelectedIndex=index;spaceGalaxyPhase="wind";spaceGalaxyWind=0;spaceGalaxyWindStage=0;spaceGalaxyTurnsAnnounced=0;
 spaceGalaxyOptions.forEach(item=>{item.button.setAttribute("aria-pressed",item.index===index?"true":"false");item.button.classList.toggle("is-selected",item.index===index);});
 const engine=spaceGalaxyLayer.querySelector(".space-galaxy-engine");if(engine){engine.disabled=false;engine.focus({preventScroll:true});}
 spaceGalaxyLayer.querySelector(".space-galaxy-board")?.classList.add("is-winding");spaceGalaxyGuide(entry.o.t+"を えらんだよ！ エンジンを ぐるぐる！");
 tone(659,0,.1,"triangle",.06);updateSpaceGalaxyVisual();
}
function spaceGalaxyPointerAngleFor(event){
 const geo=spaceGalaxyGeometry(),x=(event.clientX-geo.cx)/Math.max(1,geo.rx),y=(event.clientY-geo.cy)/Math.max(1,geo.ry);
 return Math.atan2(y,x);
}
function handleSpaceGalaxyPointerDown(event){
 if(!spaceGalaxyPlayable()||spaceGalaxySelectedIndex<0||event.button>0)return;
 const angle=spaceGalaxyPointerAngleFor(event);if(!Number.isFinite(angle))return;
 ensureAC();spaceGalaxyPointerId=event.pointerId;spaceGalaxyPointerAngle=angle;spaceGalaxyPointerX=event.clientX;spaceGalaxyPointerY=event.clientY;spaceGalaxyDragged=false;
 try{event.currentTarget.setPointerCapture(event.pointerId);}catch(_){}
}
function handleSpaceGalaxyPointerMove(event){
 if(spaceGalaxyPointerId!==event.pointerId||!spaceGalaxyPlayable())return;
 const move=Math.hypot(event.clientX-spaceGalaxyPointerX,event.clientY-spaceGalaxyPointerY);if(move<2)return;
 const angle=spaceGalaxyPointerAngleFor(event);let delta=normalizeSpaceGalaxyAngle(angle-spaceGalaxyPointerAngle);delta=clamp(delta,-.46,.46);
 spaceGalaxyPointerAngle=angle;spaceGalaxyPointerX=event.clientX;spaceGalaxyPointerY=event.clientY;if(Math.abs(delta)<.004)return;
 event.preventDefault();spaceGalaxyDragged=true;windSpaceGalaxy(delta);
}
function finishSpaceGalaxyPointer(event){
 if(spaceGalaxyPointerId!==event.pointerId)return;spaceGalaxyPointerId=null;
 if(spaceGalaxyDragged){spaceGalaxySuppressClick=true;setTimeout(()=>{spaceGalaxySuppressClick=false;},0);}spaceGalaxyDragged=false;
}
function windSpaceGalaxy(delta){
 if(spaceGalaxyPhase!=="wind"||spaceGalaxyResolving||spaceGalaxySelectedIndex<0||!Number.isFinite(delta))return;
 spaceGalaxyRotation+=delta;advanceSpaceGalaxyWind(Math.abs(delta));
}
function advanceSpaceGalaxyWind(amount){
 if(spaceGalaxyPhase!=="wind"||spaceGalaxyResolving||!Number.isFinite(amount))return;
 spaceGalaxyWind=Math.min(SPACE_GALAXY_WIND_GOAL,spaceGalaxyWind+clamp(Math.abs(amount),0,1.60));
 const turns=Math.floor(spaceGalaxyWind/(Math.PI*2));if(turns>spaceGalaxyTurnsAnnounced){spaceGalaxyTurnsAnnounced=turns;tone(720+turns*120,0,.11,"triangle",.075);spaceGalaxyGuide(turns+"しゅう！ もっと ぐるぐる！");}
 const stage=Math.min(12,Math.floor(spaceGalaxyWind/SPACE_GALAXY_WIND_GOAL*12+.0001));if(stage>spaceGalaxyWindStage){spaceGalaxyWindStage=stage;tone(580+stage*24,0,.035,"sine",.025);}
 updateSpaceGalaxyVisual();if(spaceGalaxyWind>=SPACE_GALAXY_WIND_GOAL-.001)resolveSpaceGalaxySelection();
}
function resolveSpaceGalaxySelection(){
 if(spaceGalaxyResolving||spaceGalaxyPhase!=="wind"||spaceGalaxySelectedIndex<0)return;
 const entry=spaceGalaxyOptions[spaceGalaxySelectedIndex];if(!entry)return;
 const board=spaceGalaxyLayer.querySelector(".space-galaxy-board"),engine=spaceGalaxyLayer.querySelector(".space-galaxy-engine"),epoch=spaceGalaxyEpoch;spaceGalaxyResolving=true;if(engine)engine.disabled=true;
 if(!entry.o.ok){
  if(board)board.classList.add("is-rejected");entry.button.classList.add("is-rejected");spaceGalaxyGuide("こっちじゃないよ。もう ひとつの ほし！");
  onPick(entry.button,{ok:false,mode:"space"});
  spaceGalaxyTimer=setTimeout(()=>{
   spaceGalaxyTimer=0;if(epoch!==spaceGalaxyEpoch)return;
   if(board)board.classList.remove("is-rejected","is-winding");entry.button.classList.remove("is-rejected","is-selected");entry.button.setAttribute("aria-pressed","false");
   spaceGalaxyWind=0;spaceGalaxyRotation=0;spaceGalaxyWindStage=0;spaceGalaxyTurnsAnnounced=0;spaceGalaxySelectedIndex=-1;spaceGalaxyPhase="choose";spaceGalaxyResolving=false;
   const next=spaceGalaxyOptions.find(item=>!item.button.disabled);if(next){next.button.classList.add("glow");next.button.focus({preventScroll:true});}
   spaceGalaxyGuide("もう ひとつの ほしを えらぼう");updateSpaceGalaxyVisual();
  },680);return;
 }
 spaceGalaxyPhase="burst";document.body.classList.add("space-galaxy-complete");if(board)board.classList.add("is-bursting");updateSpaceGalaxyJourney(qSeg+1);updateSpaceGalaxyVisual();
 spaceGalaxyGuide(qSeg===QN-1?"おおきな せいざが うまれた！":"スター ブースト！");sndOK();tone(784,.08,.18,"triangle",.075);tone(1319,.24,.28,"sine",.075);confetti(qSeg===QN-1?14:9);
 spaceGalaxyTimer=setTimeout(()=>{
  spaceGalaxyTimer=0;if(epoch!==spaceGalaxyEpoch)return;onPick(entry.button,{ok:true,mode:"space",skipOkSound:true});
  spaceGalaxyTimer=setTimeout(()=>{spaceGalaxyTimer=0;if(epoch===spaceGalaxyEpoch)clearSpaceGalaxyGame();},430);
 },futureReducedMotion()?320:1050);
}
function assistSpaceGalaxyGame(){
 if(!spaceGalaxyLayer||spaceGalaxyLayer.hidden||spaceGalaxyResolving)return;spaceGalaxyAssisted=true;
 const wrong=spaceGalaxyOptions.find(entry=>!entry.o.ok),correct=spaceGalaxyOptions.find(entry=>entry.o.ok);if(!correct)return;
 if(wrong){wrong.button.classList.add("dim");wrong.button.disabled=true;}correct.button.classList.add("glow");
 spaceGalaxyLayer.querySelector(".space-galaxy-board")?.classList.add("is-assisted");selectSpaceGalaxyAnswer(correct.index);advanceSpaceGalaxyWind(Math.PI*2);
 spaceGalaxyGuide("あと すこし！ ひかる エンジンを ぐるぐる！");
}
function renderSpaceGalaxyGame(){
 if(!spaceGalaxyLayer)return;
 spaceGalaxyOptions=[];spaceGalaxyRotation=0;spaceGalaxyPhase="choose";spaceGalaxyPointerId=null;spaceGalaxyDragged=false;spaceGalaxyWind=0;spaceGalaxyWindStage=0;spaceGalaxySelectedIndex=-1;spaceGalaxyTurnsAnnounced=0;spaceGalaxyResolving=false;spaceGalaxyAssisted=false;spaceGalaxyKeyboardTarget=-1;
 document.body.classList.add("space-galaxy-active");quiz.classList.add("space-galaxy-quiz");choicesEl.classList.add("space-galaxy-mode");choicesEl.setAttribute("aria-label","こたえの ほしを えらんで エンジンを まわす");
 spaceGalaxyLayer.hidden=false;spaceGalaxyLayer.replaceChildren();const board=document.createElement("div");board.className="space-galaxy-board";board.setAttribute("aria-label","スター エンジン");
 const guide=document.createElement("div");guide.className="space-galaxy-guide";guide.setAttribute("role","status");guide.setAttribute("aria-live","polite");guide.textContent="こたえの ほしを タッチして えらぼう";
 const trail=document.createElement("div");trail.className="space-galaxy-journey";trail.setAttribute("role","status");for(let index=0;index<QN;index++){const star=document.createElement("span");star.className="space-galaxy-journey-star";star.textContent="✦";trail.appendChild(star);}
 const choices=document.createElement("div");choices.className="space-galaxy-choices";
 spaceQuestionOptions(cur).forEach((o,index)=>{
  const button=document.createElement("button");button.type="button";button.className="choice space-galaxy-planet-choice";button.dataset.ok=o.ok?"1":"0";button.setAttribute("aria-pressed","false");button.setAttribute("aria-label",o.t+"の ほし");
  const art=createQuizArt(o.e,o.t);const label=document.createElement("span");label.className="lb";label.textContent=o.t;button.append(art,label);
  const entry={button,o,index};spaceGalaxyOptions.push(entry);button.addEventListener("click",()=>selectSpaceGalaxyAnswer(index));choices.appendChild(button);
 });
 const engine=document.createElement("button");engine.type="button";engine.className="space-galaxy-engine";engine.disabled=true;engine.setAttribute("aria-label","スター エンジンを ぐるぐる まわす");
 const rings=document.createElement("span");rings.className="space-galaxy-engine-rings";rings.setAttribute("aria-hidden","true");const core=document.createElement("span");core.className="space-galaxy-core";core.setAttribute("aria-hidden","true");core.textContent="✦";engine.append(rings,core);
 engine.addEventListener("pointerdown",handleSpaceGalaxyPointerDown);engine.addEventListener("click",event=>{if(spaceGalaxySuppressClick){spaceGalaxySuppressClick=false;event.preventDefault();return;}if(event.detail===0)windSpaceGalaxy(Math.PI/2);});
 const meter=document.createElement("div");meter.className="space-galaxy-meter";meter.setAttribute("role","progressbar");meter.setAttribute("aria-label","スター パワー");meter.setAttribute("aria-valuemin","0");meter.setAttribute("aria-valuemax","12");for(let index=0;index<12;index++)meter.appendChild(document.createElement("i"));
 const rocket=document.createElement("img");rocket.className="space-galaxy-rocket";rocket.src=ASSETS.space.rocket;rocket.alt="";rocket.decoding="async";
 const finale=document.createElement("div");finale.className="space-galaxy-finale";finale.setAttribute("aria-hidden","true");for(let index=0;index<5;index++)finale.appendChild(document.createElement("b"));for(let index=0;index<4;index++)finale.appendChild(document.createElement("i"));
 board.append(choices,engine,meter,rocket,finale,guide,trail);spaceGalaxyLayer.appendChild(board);
 illustratedText(hintText,"space","ほしを えらんで エンジンを ぐるぐる","hint-inline-art");updateSpaceGalaxyJourney(qSeg);updateSpaceGalaxyVisual();
}
function spaceControlAvailable(){
 return !window.__PONO_TIER_LOCKED__&&isSpaceStage()&&playing&&!tunnelInteriorMode&&
  !document.body.classList.contains("tunnel-enter-run")&&!document.body.classList.contains("tunnel-exit-run")&&
  (driving||document.body.classList.contains("space-galaxy-active"));
}
function spaceSteerBounds(){
 const viewportWidth=window.innerWidth||844,viewportHeight=window.innerHeight||390;
 const width=Math.max(1,veh.offsetWidth||viewportWidth*.17),height=Math.max(1,veh.offsetHeight||viewportHeight*.24);
 const baseCenterX=(veh.offsetLeft||viewportWidth*.28)+width*.5,baseCenterY=(veh.offsetTop>0?veh.offsetTop+height*.5:viewportHeight*.58);
 const scoreHud=document.getElementById("scoreHud"),hudBottom=scoreHud?scoreHud.getBoundingClientRect().bottom:viewportHeight*.14;
 const quizTop=quiz.classList.contains("show")?quiz.getBoundingClientRect().top:viewportHeight;
 const minCenterX=width*.5+8,maxCenterX=Math.max(minCenterX+12,(document.body.classList.contains("space-galaxy-active")?viewportWidth*.38:viewportWidth-width*.5-8));
 const minCenterY=Math.max(hudBottom+height*.5+8,height*.5+8),maxCenterY=Math.max(minCenterY+12,Math.min(quizTop-height*.5-10,viewportHeight-height*.5-8));
 return {baseCenterX,baseCenterY,minX:minCenterX-baseCenterX,maxX:maxCenterX-baseCenterX,minY:minCenterY-baseCenterY,maxY:maxCenterY-baseCenterY};
}
function clampSpaceSteerOffsets(){
 if(!isSpaceStage())return;const bounds=spaceSteerBounds();
 spaceSteerTargetX=clamp(spaceSteerTargetX,bounds.minX,bounds.maxX);spaceSteerX=clamp(spaceSteerX,bounds.minX,bounds.maxX);
 spaceSteerTargetY=clamp(spaceSteerTargetY,bounds.minY,bounds.maxY);spaceSteerY=clamp(spaceSteerY,bounds.minY,bounds.maxY);
}
function applySpaceSteerVisual(){
 if(!vehicleSteerShell)return;const x=IOS_DEVICE?Math.round(spaceSteerX):Number(spaceSteerX.toFixed(2)),y=IOS_DEVICE?Math.round(spaceSteerY):Number(spaceSteerY.toFixed(2));
 const tilt=futureReducedMotion()?0:clamp((spaceSteerTargetY-spaceSteerY)*-.05,-6,6);
 vehicleSteerShell.style.setProperty("--space-steer-x",x+"px");vehicleSteerShell.style.setProperty("--space-steer-y",y+"px");vehicleSteerShell.style.setProperty("--space-steer-tilt",tilt.toFixed(2)+"deg");
}
function setSpaceSteerTarget(clientX,clientY,immediate){
 if(!isSpaceStage())return;const bounds=spaceSteerBounds(),x=Number.isFinite(clientX)?clientX:bounds.baseCenterX+spaceSteerTargetX,y=Number.isFinite(clientY)?clientY:bounds.baseCenterY+spaceSteerTargetY;
 spaceSteerTargetX=clamp(x-bounds.baseCenterX,bounds.minX,bounds.maxX);spaceSteerTargetY=clamp(y-bounds.baseCenterY,bounds.minY,bounds.maxY);
 if(immediate||futureReducedMotion()){spaceSteerX=spaceSteerTargetX;spaceSteerY=spaceSteerTargetY;applySpaceSteerVisual();}
}
function nudgeSpaceSteerTarget(dx,dy){
 if(!isSpaceStage())return;const bounds=spaceSteerBounds();
 spaceSteerTargetX=clamp(spaceSteerTargetX+dx,bounds.minX,bounds.maxX);spaceSteerTargetY=clamp(spaceSteerTargetY+dy,bounds.minY,bounds.maxY);spaceSteerUsed=true;
}
function updateSpaceKeyboardMovement(dt){
 if(!spaceControlAvailable()||!spaceMoveKeys.size)return;const speed=clamp((window.innerWidth||844)*.55,260,520)*dt;
 let dx=0,dy=0;if(spaceMoveKeys.has("ArrowLeft")||spaceMoveKeys.has("KeyA"))dx-=speed;if(spaceMoveKeys.has("ArrowRight")||spaceMoveKeys.has("KeyD"))dx+=speed;
 if(spaceMoveKeys.has("ArrowUp")||spaceMoveKeys.has("KeyW"))dy-=speed;if(spaceMoveKeys.has("ArrowDown")||spaceMoveKeys.has("KeyS"))dy+=speed;if(dx||dy)nudgeSpaceSteerTarget(dx,dy);
}
function handleSpaceSteerPointerDown(ev){
 if(!spaceControlAvailable()||spaceSteerPointerId!==null||ev.isPrimary===false||(ev.pointerType==="mouse"&&ev.button!==0))return;
 ev.preventDefault();spaceSteerPointerId=ev.pointerId;spaceSteerUsed=true;setSpaceSteerTarget(ev.clientX,ev.clientY,false);try{spaceSteerSurface.setPointerCapture(ev.pointerId);}catch(_){}
}
function handleSpaceSteerPointerMove(ev){
 if(ev.pointerId!==spaceSteerPointerId||!spaceControlAvailable())return;ev.preventDefault();setSpaceSteerTarget(ev.clientX,ev.clientY,false);
}
function handleSpaceSteerPointerEnd(ev){
 if(ev.pointerId!==spaceSteerPointerId)return;spaceSteerPointerId=null;try{spaceSteerSurface.releasePointerCapture(ev.pointerId);}catch(_){}
}
function handleSpaceSteerKeyDown(ev){
 if(ev.defaultPrevented)return;
 const code=ev.code||ev.key,movement=["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","KeyA","KeyD","KeyW","KeyS"];
 if(!movement.includes(code)||!spaceControlAvailable())return;ev.preventDefault();spaceMoveKeys.add(code);spaceSteerUsed=true;
}
function handleSpaceSteerKeyUp(ev){const code=ev.code||ev.key;if(spaceMoveKeys.has(code)){ev.preventDefault();spaceMoveKeys.delete(code);}}
function renderSpaceSteering(){
 const now=_nowMs(),dt=spaceSteerFrameAt?clamp((now-spaceSteerFrameAt)/1000,0,.05):0;spaceSteerFrameAt=now;
 const active=spaceControlAvailable();document.body.classList.toggle("space-steer-active",active);
 if(spaceSteerHint){illustratedText(spaceSteerHint,"touch","タッチした ばしょへ うごくよ","steer-hint-art");spaceSteerHint.hidden=!active||spaceSteerUsed||quiz.classList.contains("show");}
 if(!isSpaceStage()||!vehicleSteerShell)return;updateSpaceKeyboardMovement(dt);clampSpaceSteerOffsets();
 if(futureReducedMotion()){spaceSteerX=spaceSteerTargetX;spaceSteerY=spaceSteerTargetY;}else{const ease=clamp(dt*8,.1,.3);spaceSteerX+=(spaceSteerTargetX-spaceSteerX)*ease;spaceSteerY+=(spaceSteerTargetY-spaceSteerY)*ease;}
 if(Math.abs(spaceSteerTargetX-spaceSteerX)<.08)spaceSteerX=spaceSteerTargetX;if(Math.abs(spaceSteerTargetY-spaceSteerY)<.08)spaceSteerY=spaceSteerTargetY;applySpaceSteerVisual();
}
function resetSpaceSteering(){
 spaceMoveKeys.clear();spaceSteerPointerId=null;spaceSteerTargetX=0;spaceSteerX=0;spaceSteerTargetY=0;spaceSteerY=0;spaceSteerUsed=false;spaceSteerFrameAt=0;
 document.body.classList.remove("space-steer-active");
 if(vehicleSteerShell){vehicleSteerShell.style.setProperty("--space-steer-x","0px");vehicleSteerShell.style.setProperty("--space-steer-y","0px");vehicleSteerShell.style.setProperty("--space-steer-tilt","0deg");}
}
if(spaceSteerSurface){
 spaceSteerSurface.addEventListener("pointerdown",handleSpaceSteerPointerDown);spaceSteerSurface.addEventListener("pointermove",handleSpaceSteerPointerMove);
 spaceSteerSurface.addEventListener("pointerup",handleSpaceSteerPointerEnd);spaceSteerSurface.addEventListener("pointercancel",handleSpaceSteerPointerEnd);spaceSteerSurface.addEventListener("lostpointercapture",handleSpaceSteerPointerEnd);
}
window.addEventListener("keydown",handleSpaceSteerKeyDown);window.addEventListener("keyup",handleSpaceSteerKeyUp);
function renderChoiceCards(){
 let opts=[{e:cur.a[0],t:cur.a[1],ok:true},...cur.d.map(x=>({e:x[0],t:x[1],ok:false}))];
 if(level===0&&opts.length>2)opts=opts.slice(0,2);
 opts=shuffle(opts);
 opts.forEach(o=>{const b=document.createElement("button");b.type="button";b.className="choice";
  b.setAttribute("aria-label",o.t);
  b.dataset.ok=o.ok?"1":"0";
  const art=createQuizArt(o.e,o.t);const label=document.createElement("span");label.className="lb";label.textContent=o.t;b.append(art,label);
  bindTap(b,()=>onPick(b,o));
  choicesEl.appendChild(b);});
}
function numberCargoControl(action,text,label,onTap){
 const button=document.createElement("button");
 button.type="button";button.className="number-cargo-action is-"+action;
 button.dataset.cargoAction=action;button.textContent=text;button.setAttribute("aria-label",label);
 bindTap(button,()=>onTap(button));return button;
}
function renderNumberCargoGame(){
 quiz.classList.add("number-quiz");choicesEl.classList.add("number-mode");
 choicesEl.setAttribute("aria-label","こたえの かずだけ にもつを のせる");
 const theme=resolveNumberCargoTheme(),limit=numberCargoLimit();
 const root=document.createElement("div");root.className="number-cargo-game";root.setAttribute("role","group");root.setAttribute("aria-labelledby","qText");
 root.style.setProperty("--cargo-columns",String(numberCargoColumnCount(limit)));
 const field=document.createElement("div");field.className="number-cargo-field";field.setAttribute("aria-label","タップして のせる");
 const fieldTitle=document.createElement("div");fieldTitle.className="number-cargo-field-title";fieldTitle.textContent="タップで のせよう！";field.appendChild(fieldTitle);
 for(let i=0;i<limit;i++){
  const button=document.createElement("button");button.type="button";button.className="number-cargo-target";button.dataset.cargoIndex=String(i);
  button.setAttribute("aria-label",theme.name+"を 1こ のせる");
  button.setAttribute("aria-pressed","false");
  button.style.setProperty("--cargo-delay",(-((i*37)%13)/10).toFixed(1)+"s");
  button.style.setProperty("--cargo-drift-x",((i%3)-1)*(4+(i%2)*2)+"px");
  button.style.setProperty("--cargo-drift-y",(-4-(i%3)*2)+"px");
  const art=createQuizArt(theme.e,theme.name,"number-cargo-art");button.appendChild(art);
  if(prefersReducedMotionActive())art.style.setProperty("animation","none","important");
  bindTap(button,()=>collectNumberCargo(i,button));field.appendChild(button);
 }
 const wagon=document.createElement("div");wagon.className="number-cargo-wagon";
 const count=document.createElement("div");count.className="number-cargo-count";count.innerHTML='<span>のせた</span><strong data-cargo-count>0</strong><span>こ</span>';
 const goal=document.createElement("div");goal.className="number-cargo-goal";goal.dataset.cargoGoal="";goal.hidden=true;goal.textContent="めざす "+numberCargoAnswer()+"こ";
 const load=document.createElement("div");load.className="number-cargo-load";load.setAttribute("aria-hidden","true");
 for(let i=0;i<limit;i++){
  const slot=document.createElement("span");slot.className="number-cargo-slot";slot.dataset.cargoSlot=String(i);
  const loadArt=createQuizArt(theme.e,theme.name,"number-cargo-load-art");slot.appendChild(loadArt);load.appendChild(slot);
 }
 const wagonBody=document.createElement("div");wagonBody.className="number-cargo-wagon-body";wagonBody.appendChild(load);
 const wheels=document.createElement("div");wheels.className="number-cargo-wheels";wheels.setAttribute("aria-hidden","true");wheels.innerHTML="<i></i><i></i>";
 const actions=document.createElement("div");actions.className="number-cargo-actions";
 actions.append(
  numberCargoControl("undo","1こ もどす","さいごの 1こを もどす",()=>undoNumberCargo()),
  numberCargoControl("confirm","しゅっぱつ！","この かずで こたえる",eventButton=>submitNumberCargo(eventButton))
 );
 wagon.append(count,goal,wagonBody,wheels,actions);root.append(field,wagon);choicesEl.appendChild(root);updateNumberCargoGame();
 illustratedText(hintText,"cargo","こたえの かずだけ のせてね","hint-inline-art");
}
function updateNumberCargoGame(options){
 const root=choicesEl.querySelector(".number-cargo-game");if(!root)return;
 const count=numberCargoPicked.length;
 const countEl=root.querySelector("[data-cargo-count]");if(countEl)countEl.textContent=String(count);
 root.querySelectorAll("[data-cargo-index]").forEach(button=>{
  const picked=numberCargoPicked.includes(Number(button.dataset.cargoIndex));
  button.classList.toggle("is-picked",picked);button.setAttribute("aria-pressed",picked?"true":"false");button.disabled=answerLocked||picked;
 });
 root.querySelectorAll("[data-cargo-slot]").forEach(slot=>{
  const value=Number(slot.dataset.cargoSlot);
  slot.classList.toggle("is-filled",value<count);
  slot.classList.toggle("is-goal",numberCargoGoalShown&&value<numberCargoAnswer());
 });
 root.classList.toggle("goal-shown",numberCargoGoalShown);
 const goal=root.querySelector("[data-cargo-goal]");if(goal){goal.hidden=!numberCargoGoalShown;if(numberCargoGoalShown)goal.textContent="めざす "+numberCargoAnswer()+"こ";}
 const undo=root.querySelector('[data-cargo-action="undo"]');
 const confirm=root.querySelector('[data-cargo-action="confirm"]');
 if(undo)undo.disabled=answerLocked||count<=0;
 if(confirm)confirm.disabled=answerLocked||count<=0;
 if(options&&options.wagonBump){
  const wagon=root.querySelector(".number-cargo-wagon-body");
  if(wagon){wagon.classList.remove("is-bumping");void wagon.offsetWidth;wagon.classList.add("is-bumping");wagon.addEventListener("animationend",()=>wagon.classList.remove("is-bumping"),{once:true});}
 }
 if(options&&options.announce)announce(count+"こ");
}
function animateNumberCargoToWagon(button,index){
 if(!button||!document.body||!window.matchMedia||window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
 const target=choicesEl.querySelector(".number-cargo-wagon-body");if(!target)return;
 const from=button.getBoundingClientRect(),to=target.getBoundingClientRect();
 const theme=resolveNumberCargoTheme(),fly=createQuizArt(theme.e,theme.name,"number-cargo-fly");fly.dataset.cargoIndex=String(index);
 fly.style.left=(from.left+from.width*.5)+"px";fly.style.top=(from.top+from.height*.5)+"px";
 fly.style.setProperty("--cargo-fly-x",(to.left+to.width*.5-from.left-from.width*.5)+"px");
 fly.style.setProperty("--cargo-fly-y",(to.top+to.height*.4-from.top-from.height*.5)+"px");
 document.body.appendChild(fly);setTimeout(()=>fly.remove(),520);
}
function collectNumberCargo(index,button){
 if(answerLocked||driving||!quiz.classList.contains("show")||!isNumberCargoQuestion()||index<0||index>=numberCargoLimit()||numberCargoPicked.includes(index)||numberCargoPicked.length>=numberCargoLimit())return;
 numberCargoPicked.push(index);animateNumberCargoToWagon(button,index);
 updateNumberCargoGame({announce:true,wagonBump:true});
 const note=620+numberCargoPicked.length*68;tone(note,0,.08,"triangle",.075);tone(note*1.25,.07,.09,"sine",.055);
}
function undoNumberCargo(){
 if(answerLocked||driving||!quiz.classList.contains("show")||!isNumberCargoQuestion()||!numberCargoPicked.length)return;
 numberCargoPicked.pop();
 updateNumberCargoGame({announce:true});tone(470,0,.09,"triangle",.065);
}
function submitNumberCargo(button){
 if(answerLocked||numberCargoPicked.length<=0||!isNumberCargoQuestion())return;
 onPick(button,{ok:numberCargoPicked.length===numberCargoAnswer(),mode:"number"});
}
function showNumberCargoHint(revealGoal){
 if(!isNumberCargoQuestion())return;
 if(revealGoal)numberCargoGoalShown=true;
 let message="こたえの かずだけ にもつを のせよう";
 if(numberCargoGoalShown)message="めざすのは "+numberCargoAnswer()+"こ だよ";
 else if(numberCargoPicked.length<numberCargoAnswer()&&numberCargoPicked.length>0)message="もう すこし のせてみよう";
 else if(numberCargoPicked.length>numberCargoAnswer())message="すこし もどしてみよう";
 else if(numberCargoPicked.length===numberCargoAnswer())message="しゅっぱつ！を おしてみよう";
 illustratedText(hintText,"hint",message,"hint-inline-art");updateNumberCargoGame();announce(message);
}
function renderQuizQuestion(){
 const copy=isSeaStage()?cur.q:(cur.helper?(cur.helper.name+"を たすけよう！ "+cur.q):cur.q);
 qText.removeAttribute("aria-label");
 if(!isNumberCargoQuestion()||!Array.isArray(cur.pe)||!cur.pe[0]||numberCargoAnswer()<=0){qText.textContent=copy;return;}
 const count=numberCargoAnswer();
 const line=document.createElement("span");line.className="number-count-question";
 const grid=document.createElement("span");grid.className="number-count-grid";grid.style.setProperty("--number-count-columns",String(Math.min(5,count)));
 for(let index=0;index<count;index++)grid.appendChild(createQuizArt(cur.pe[0],cur.pe[1],"number-count-art"));
 const prompt=document.createElement("span");prompt.className="number-count-prompt";prompt.textContent=(cur.pe[1]||"にもつ")+"は いくつ かな？";
 line.append(grid,prompt);qText.replaceChildren(line);qText.setAttribute("aria-label",cur.s||prompt.textContent);
}
function renderQuizSpeaker(){
 const face=$("ponoFace");if(!face)return;
 if(cur&&cur.helper&&cur.helper.request)face.replaceChildren(createUiArt("","quiz-speaker-art",cur.helper.request));
 else face.replaceChildren(createUiArt("pono","quiz-speaker-art"));
}
function showQuiz(){
 hideWeatherNotice();
 setDriverMood("thinking");
 cancelSeaPointer();clearSeaBubbleGame();clearSeaRescueMessage();
 resetNumberCargoGame();
 clearFutureCapsuleGame();
 clearSpaceGalaxyGame();
 cur=qList[qSeg];missInQ=0;answerLocked=false;
 renderQuizSpeaker();
 renderQuizQuestion();
 if(helpItems.length)illustratedText(hintText,"help","おたすけを つかえるよ","hint-inline-art");else hintText.replaceChildren();
 choicesEl.replaceChildren();
 quiz.classList.add("show");
 if(isNumberCargoQuestion())renderNumberCargoGame();else if(isSeaStage())renderSeaBubbleGame();else if(isFutureStage())renderFutureCapsuleGame();else if(isSpaceStage())renderSpaceGalaxyGame();else renderChoiceCards();
 speak(cur.s||cur.q);
}
function onPick(el,o){
 if(answerLocked||driving||!quiz.classList.contains("show"))return;
 answerLocked=true;
 if(o.ok){
  setDriverMood("cheer");
  const seaRescue=isSeaStage()&&o.mode==="sea";
  const gained=addScore(SCORE_POINTS.correct+(missInQ===0?SCORE_POINTS.firstTry:0),"quiz");
  if(!o.skipOkSound)sndOK();showStamp("せいかい！ +"+gained+"てん","ok");
  quiz.classList.remove("show");
  // 数字ミニゲームの生成画像とdrift animationを画面外で動かし続けない。
  // iPadのフレーム落ちが次ステージへの走行まで長引かせるため、正解時に即破棄する。
  if(o.mode==="number")resetNumberCargoGame();
  const pe=cur.pe||[cur.a[0],cur.a[1]];
  const t=tunnels[qSeg];
  const passenger=cur.helper||{e:pe[0],t:pe[1],name:pe[1],img:resolveQuizArt(pe[0],pe[1])};
  const isNew=boardPassenger(passenger,pe,seaRescue?el:t);
  if(seaRescue)showSeaRescueMessage(passenger,qSeg);
  else speak(isNew?"せいかい！あたらしい ともだちだ！":"せいかい！"+passengerLabel(passenger)+"が のったよ！");
  setTimeout(()=>{sndOpen();if(t)t.classList.add("open");const sg=t&&t.querySelector(".sign");if(sg)sg.textContent="○";},420);
  setTimeout(()=>{if(playing)proceed();},seaRescue?1500:1050);
 }else{
  setDriverMood("surprised");
  missInQ++;stageMiss++;
  sndNG();
  if(o.mode==="number"){
   el.classList.remove("ng");void el.offsetWidth;el.classList.add("ng");
   if(missInQ===1)showNumberCargoHint(false);
   if(missInQ>=2)showNumberCargoHint(true);
   updateNumberCargoGame();
  }else{
   el.classList.add("ng","dim");
   if(el.classList.contains("sea-answer-bubble")||el.classList.contains("future-capsule-lane")||el.classList.contains("space-galaxy-planet-choice"))el.disabled=true;
  }
  const t=tunnels[qSeg];
  if(t){t.classList.add("shake");setTimeout(()=>t.classList.remove("shake"),520);}
  showStamp(o.mode==="sea"?"にせものの あわ！":"おしい！","ng");
  if(o.mode!=="number"&&missInQ===1)showHint();
  if(o.mode!=="number"&&missInQ>=2){activeChoiceButtons().forEach(c=>{
   if(!c.classList.contains("dim"))c.classList.add("glow");});}
  setTimeout(()=>{answerLocked=false;setDriverMood("thinking");if(o.mode==="number")updateNumberCargoGame();},520);
 }
}
function completeCurrentStage(o){
 if(!playing||stageCompletionHandled)return;
 stageCompletionHandled=true;
 cleared[stg]=true;
 if(!stageClearScoreGranted){
  addScore(SCORE_POINTS.stageClear,"clear");
  if(stageMiss===0)addScore(SCORE_POINTS.noMiss,"clear");
  stageClearScoreGranted=true;
 }
 const stars=stageMiss===0?3:(stageMiss<=2?2:1);
 totalStars+=stars;
 const key=loop+"-"+stg;
 bestStarsByStage[key]=Math.max(Number(bestStarsByStage[key])||0,stars);
 saveGame();
 showStamp(STAGES[stg].names[loop%2]+" できた！ ほし ×"+stars,"clear");
 sndFan();confetti(14);
 if(stg<STAGES.length-1){
  if(cars.length&&dropEl){sndGo();target=dropStop(o);pending="dropoff";driving=true;}
  else beginStageTransit();
 }else{sndGo();target=tunX(o,QN-1)+150;pending="ending";driving=true;}
}
function proceed(){
 if(!playing)return;
 setDriverMood("cheer");qSeg++;drawDots();
 const o=origin(stg);if(!rareSpawned)scheduleRareSpawn();
 if(qSeg<QN){sndGo();target=stops(o,qSeg);pending="quiz";driving=true;return;}
 if(isSeaStage()&&!seaBossDefeated){sndGo();target=stops(o,QN-1)+120;pending="seaBoss";driving=true;return;}
 completeCurrentStage(o);
}
function ending(){
 hideWeatherNotice();
 resetNumberCargoGame();
 resetSeaInteraction();
 clearFutureCapsuleGame();
 clearSpaceGalaxyGame();resetSpaceSteering();
 clearRareEvent();
 clearMagicPuffs();
 stopStageWeather();setWeatherPresentation("clear");
 clearTunnelFriendGame();
 setDriverMood("cheer");
 playing=false;
 confetti(40);sndFan();
 const grand=loop>=1;
 unlockedLoop=Math.max(unlockedLoop,1);
 saveGame();
 illustratedText($("resTitle"),grand?"rainbow":"earth",grand?"ぎんがの はてまで せいは！":"うちゅうまで とうちゃく！","result-title-art");
 const resultScore=document.createElement("span");resultScore.textContent=formatScore(journeyScore)+"てん";
 const resultStars=document.createElement("span");resultStars.textContent="×"+totalStars;
 $("resStars").replaceChildren(createUiArt("trophy","result-trophy-art"),resultScore,createUiArt("star","result-star-art"),resultStars);
 $("resMsg").textContent="ともだち ずかん "+zkCount()+"/"+zkTotal()
  +(rareCount?"　めずらしい ともだち "+rareCount+"かい はっけん！":"")
  +(tunnelFriendTotalFound?"　かくれともだち "+tunnelFriendTotalFound+"にん はっけん！":"")
  +(grand?"　きみは なぞなぞマスターだ！":"");
 $("loopBtn").style.display=(loop===0)?"inline-block":"none";
 speak(grand?"ぎんがのはてまで、だいせいこう！きみはなぞなぞマスターだ！":"うちゅうまで とうちゃく！だいぼうけん、だいせいこう！");
 setTimeout(()=>$("result").classList.remove("hidden"),900);
}

/* ================= map ================= */
function openMap(msg){
 hideWeatherNotice();
 resetNumberCargoGame();
 clearFutureCapsuleGame();
 clearSpaceGalaxyGame();resetSpaceSteering();
 clearRareEvent();
 clearMagicPuffs();
 resetSeaInteraction();
 stopStageWeather();setWeatherPresentation("clear");
 clearTunnelFriendGame();
 playing=false;driving=false;quiz.classList.remove("show");
 const row=$("mapRow");row.innerHTML="";
 let highestOpen=0;
 cleared.forEach((done,i)=>{if(done)highestOpen=Math.max(highestOpen,i+1);});
 highestOpen=Math.min(STAGES.length-1,Math.max(highestOpen,stg));
 STAGES.forEach((s,i)=>{
  if(i>0){const d=document.createElement("span");d.className="mapDash";d.textContent="→";row.appendChild(d);}
  const canVisit=i<=highestOpen;
  const n=document.createElement("button");n.type="button";n.className="mapNode"+(i===stg?" cur":"")+(canVisit?"":" locked");
  if(!canVisit)n.disabled=true;
  const mapLabel=document.createElement("span");mapLabel.className="map-node-label";mapLabel.textContent=s.names[loop%2];
  n.append(createUiArt(s.art,"mi map-stage-art"),mapLabel);
  if(cleared[i])n.appendChild(createUiArt("star","st map-clear-art"));
  if(canVisit)bindTap(n,()=>{ensureAC();stg=i;openMap("「"+s.names[loop%2]+"」から いく？");});
  row.appendChild(n);
 });
 $("loopBadge").style.display=(loop>=1)?"block":"none";
 $("mapMsg").textContent=msg||("つぎは「"+STAGES[stg].names[loop%2]+"」！");
 $("map").classList.remove("hidden");
}

/* ================= Basic Auth 管理ダッシュボード専用ステージ選択 ================= */
// 公開URLからステージを指定する入口は作らない。same-origin の /admin iframe が
// canonical IDをpostMessageした時だけ選択し、実開始は子画面のタップで行う。
const NAZONAZO_ADMIN_STAGE_CHANNEL="pono-nazonazo-admin-stage-v1";
const NAZONAZO_ADMIN_STAGE_INDEX=Object.freeze({town:0,jungle:1,number:2,sea:3,future:4,space:5});
let nazonazoAdminPreviewStageIndex=-1;
let nazonazoAdminPreviewToken="";

function nazonazoAdminPreviewParentIsTrusted(){
 if(window.parent===window)return false;
 try{
  return window.parent.location.origin===window.location.origin&&
   /^\/admin(?:\/|$)/.test(window.parent.location.pathname||"");
 }catch(_){return false;}
}
async function nazonazoAdminPreviewHasAdminAuth(){
 try{
  const response=await fetch("/admin/",{method:"HEAD",credentials:"same-origin",cache:"no-store"});
  return response.ok;
 }catch(_){return false;}
}
function nazonazoAdminPreviewNotify(type,detail){
 if(!nazonazoAdminPreviewMode||window.parent===window)return;
 const payload=Object.assign({channel:NAZONAZO_ADMIN_STAGE_CHANNEL,type,token:nazonazoAdminPreviewToken},detail||{});
 try{window.parent.postMessage(payload,window.location.origin);}catch(_){}
}
function nazonazoAdminPreviewArm(stageId){
 if(!nazonazoAdminPreviewMode||!Object.prototype.hasOwnProperty.call(NAZONAZO_ADMIN_STAGE_INDEX,stageId)){
  nazonazoAdminPreviewNotify("rejected",{message:"ふめいな ステージを きょひしました。"});
  return false;
 }
 const index=NAZONAZO_ADMIN_STAGE_INDEX[stageId];
 resetNumberCargoGame();resetSeaInteraction();clearFutureCapsuleGame();clearSpaceGalaxyGame();resetSpaceSteering();
 nazonazoAdminPreviewStageIndex=index;
 stg=index;loop=0;playing=false;driving=false;pending=null;vel=0;
 stopStageWeather();
 applySkin();
 worldX=origin(index);target=worldX;
 buildWorld(false);drawDots();renderCars();updateHelpHud();render();
 const label=$("adminStagePreviewLabel");
 if(label){label.hidden=false;label.textContent="『"+STAGES[index].names[0]+"』を えらんだよ";}
 const start=$("startBtn");
 if(start){start.disabled=false;start.textContent=STAGES[index].names[0]+"を はじめる！";}
 nazonazoAdminPreviewNotify("armed",{stageId,label:STAGES[index].names[0]});
 return true;
}
async function initNazonazoAdminStagePreviewBridge(){
 let requested=false,token="";
 try{
  const params=new URLSearchParams(window.location.search);
  requested=params.get("adminStagePreview")==="1";
  token=params.get("adminPreviewToken")||"";
 }catch(_){}
 if(!requested||!window.__APP_BUILD__||window.__PONO_TIER_LOCKED__||
  !/^[a-z0-9-]{8,80}$/i.test(token)||!nazonazoAdminPreviewParentIsTrusted())return false;
 // 認証確認を待つ間も通常開始・saveへ落とさず、管理プレビューとしてfail closedにする。
 nazonazoAdminPreviewMode=true;
 nazonazoAdminPreviewToken=token;
 document.body.classList.add("nazonazo-admin-stage-preview");
 const label=$("adminStagePreviewLabel");
 if(label){label.hidden=false;label.textContent="かんり にんしょうを かくにんちゅう";}
 const start=$("startBtn");
 if(start){start.disabled=true;start.textContent="かくにんちゅう";}
 const levelButtons=[...document.querySelectorAll("#lvSel .selBtn")];
 levelButtons.forEach(button=>{button.disabled=true;});
 if(!await nazonazoAdminPreviewHasAdminAuth()){
  if(label)label.textContent="かんり にんしょうを かくにんできませんでした";
  try{window.parent.postMessage({channel:NAZONAZO_ADMIN_STAGE_CHANNEL,type:"rejected",token,message:"かんり にんしょうを かくにんできませんでした。"},window.location.origin);}catch(_){}
  return false;
 }
 levelButtons.forEach(button=>{button.disabled=false;});
 if(label){label.hidden=false;label.textContent="かんり がめんで ステージを えらんでね";}
 if(start){start.disabled=true;start.textContent="ステージを えらんでね";}
 window.addEventListener("message",event=>{
  if(event.origin!==window.location.origin||event.source!==window.parent||!nazonazoAdminPreviewParentIsTrusted())return;
  const data=event.data;
  if(!data||data.channel!==NAZONAZO_ADMIN_STAGE_CHANNEL||data.type!=="select"||data.token!==nazonazoAdminPreviewToken)return;
  const stageId=String(data.stageId||"");
  if(!Object.prototype.hasOwnProperty.call(NAZONAZO_ADMIN_STAGE_INDEX,stageId)){
   nazonazoAdminPreviewNotify("rejected",{message:"ふめいな ステージを きょひしました。"});
   return;
  }
  nazonazoAdminPreviewArm(stageId);
 });
 nazonazoAdminPreviewNotify("ready");
 return true;
}

/* ================= wiring ================= */
document.querySelectorAll("#lvSel .selBtn").forEach(b=>{
 bindTap(b,()=>{ensureAC();
  document.querySelectorAll("#lvSel .selBtn").forEach(x=>x.classList.remove("sel"));
  b.classList.add("sel");level=+b.dataset.l;saveGame();tone(600,0,.1,"triangle");});
});
let bootPending=false;
bindTap($("startBtn"),()=>{
 // 二重タップ抑止: resume Promise 解決前に startBtn が再ヒットしても boot() を 1 回に絞る
 if(bootPending)return;
 bootPending=true;
 // Promise 解決を待たず即タイトルを隠す (可視のままだと startBtn が再入力を受け続けるため)
 const titleEl=$("title");if(titleEl)titleEl.classList.add("hidden");
 // ensureAC() の resume Promise を待ってから最初の sndGo をスケジュールしないと iOS で silent drop する
 const p=ensureAC();
 const boot=()=>{
  primeAC();
  const startStage=nazonazoAdminPreviewMode?nazonazoAdminPreviewStageIndex:0;
  if(startStage<0||startStage>=STAGES.length){bootPending=false;return;}
  stg=startStage;loop=0;cleared=[];totalStars=0;rareCount=0;tunnelFriendTotalFound=0;resetJourneyScore();
  rollJourneyWeather();
  startJourneyAt(startStage);
  if(nazonazoAdminPreviewMode)nazonazoAdminPreviewNotify("started",{stageId:STAGES[startStage].id,label:STAGES[startStage].names[0]});
  bootPending=false;
 };
 if(p&&p.then)p.then(boot,boot);else boot();
});
bindTap($("goBtn"),()=>{ensureAC();startJourneyAt(stg);});
bindTap($("againBtn"),()=>{ensureAC();
 const restartStage=nazonazoAdminPreviewMode&&nazonazoAdminPreviewStageIndex>=0?nazonazoAdminPreviewStageIndex:0;
 $("result").classList.add("hidden");stg=restartStage;loop=0;cleared=[];totalStars=0;rareCount=0;tunnelFriendTotalFound=0;resetJourneyScore();rollJourneyWeather();startJourneyAt(restartStage);});
bindTap($("loopBtn"),()=>{ensureAC();
 $("result").classList.add("hidden");
 loop=1;stg=0;cleared=[];totalStars=0;rareCount=0;tunnelFriendTotalFound=0;resetJourneyScore();
 rollJourneyWeather();
 startJourneyAt(0);
 speak("2しゅうめ！せかいのいろが かわってるよ！");});
bindTap($("zkBtnTitle"),()=>{ensureAC();openZukan();});
bindTap($("zkBtnMap"),()=>{ensureAC();openZukan();});
bindTap($("zkBtnRes"),()=>{ensureAC();openZukan();});
bindTap($("zkClose"),()=>{$("zukan").classList.add("hidden");});
bindTap(mapMenuBtn,()=>{
 closeGameSettings();
 if(quiz.classList.contains("show")){showStamp("いまは トンネルを あけよう","ng");return;}
 if(seaBossPhase!=="idle"){showStamp("いまは おおあわぬしを たおそう","ng");return;}
 openMap();
});
bindTap($("spkBtn"),()=>{showHint();});
bindTap($("helpBtn"),()=>{useHelp();});

initGameSettingsMenu();
buildRainParticles(false);
buildRegistry();
loadPortalTuning();
loadGame();applyLevelSelection();drawPersistentScoreHud();
applySkin();buildWorld(false);drawDots();renderCars();updateHelpHud();render();
initPortalEditor();
initNazonazoAdminStagePreviewBridge();

// AC unlock 安全網: bindTap 未配線領域 (背景/scene/portal editor) のタップでも resume を担保
document.addEventListener("pointerdown",()=>{ensureAC();},{capture:true,passive:true});

// visibility/lifecycle 復帰: iOS/Android で BG 復帰後に AC が suspended/interrupted のままだと SE が全滅する
// blur は意図的に購読しない (iOS の疑似 blur で AC を止めない方針)
document.addEventListener("visibilitychange",()=>{
 if(document.hidden){
  closeGameSettings();
  hideWeatherNotice();
  if(seaRoundPhase==="ready"||seaRoundPhase==="go"){clearTimeout(seaRoundCountdownTimer);seaRoundCountdownTimer=0;}
  pauseSeaInput();pauseFutureCraneInput();safeSuspend();
 }else{
  ensureAC();
  if((seaRoundPhase==="ready"||seaRoundPhase==="go")&&!seaRoundCountdownTimer&&isSeaStage()&&quiz.classList.contains("show"))startSeaRoundCountdown();
 }
});
window.addEventListener("resize",scheduleRainParticleRebuild,{passive:true});
window.addEventListener("resize",syncNumberCargoColumns,{passive:true});
window.addEventListener("resize",handleSeaViewportChange,{passive:true});
window.addEventListener("resize",handleFutureCraneViewportChange,{passive:true});
window.addEventListener("resize",updateSpaceGalaxyVisual,{passive:true});
quiz.addEventListener("transitionend",handleFutureCraneQuizTransitionEnd);
window.addEventListener("pageshow",()=>{closeGameSettings();ensureAC();updateRainParticleVisibility(false);});
window.addEventListener("focus",()=>{ensureAC();});
window.addEventListener("pagehide",()=>{closeGameSettings();hideWeatherNotice();pauseSeaInput();pauseFutureCraneInput();clearTimeout(rainParticleResizeTimer);safeSuspend();});

requestAnimationFrame(gloop);
})();
