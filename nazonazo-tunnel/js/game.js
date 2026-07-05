"use strict";
(function() {
  const data = window.PonoNazonazoQuestionData || {};
  const {
    TOWN, JUNGLE, SEA, FUTURE, SPACE, WORDPLAY,
    KANJI_NUM, CNT_EMO, JLEGS, SLEGS, JSIZE, SSIZE, SPEED
  } = data;

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
const ASSETS={
  town:{
   sky:"../assets/images/nazonazo-tunnel/town_sky_back_20260703.webp",
   horizon:"../assets/images/nazonazo-tunnel/town_horizon_layer_20260703.webp",
   mid:"../assets/images/nazonazo-tunnel/town_mid_layer_20260703.webp",
   ground:"../assets/images/nazonazo-tunnel/town_ground_track_strip_20260703_v2.webp",
   fg:"../assets/images/nazonazo-tunnel/town_foreground_grass_20260703_v2.webp",
   decor:"../assets/images/nazonazo-tunnel/town_decor_tree_generated_20260705.webp"
 },
 jungle:{
  sky:"../assets/images/nazonazo-tunnel/jungle_sky_back_20260703.webp",
  horizon:"../assets/images/nazonazo-tunnel/jungle_horizon_layer_20260703.webp",
  mid:"../assets/images/nazonazo-tunnel/jungle_mid_layer_20260703.webp",
  ground:"../assets/images/nazonazo-tunnel/jungle_ground_strip_20260703.webp",
  fg:"../assets/images/nazonazo-tunnel/jungle_foreground_layer_20260703.webp"
 }
};
const bgUrl=src=>'url("'+src+'")';
const STAGES=[
 {id:"town",icon:"🏘️",veh:"train",bank:TOWN,gens:[],
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
 {id:"jungle",icon:"🌴",veh:"train",bank:JUNGLE,gens:["legsJ","sizeJ"],
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
  decor(P,r){return svgURI(220,340,gTreeRow(220,340,P.mid1,P.trunk,1,200+(r%3)*18,61+r));}},
 {id:"number",icon:"🎲",veh:"train",bank:null,gens:[],
  names:["すうじのへや","ゆめの すうじのへや"],
  pals:[
   {sky:["#f3e9ff","#dfe9ff"],dig1:"#b39ce8",dig2:"#9a7fd8",blocks:["#d9c6f5","#f5c6e0","#c6e0f5"],blocks2:["#c0a8ee","#eea8cc","#a8ccee"],fgBlocks:["#8f76d0","#c06aa8","#6a8fc0"],flo1:"#e8ddfa",flo2:"#cfc0f0",mount:"#b79ae8"},
   {sky:["#ffd9ec","#d9c6ff"],dig1:"#c98ad0",dig2:"#b070c0",blocks:["#f5a8c6","#c6a8f5","#a8d0f5"],blocks2:["#eb90b8","#b890eb","#90b8eb"],fgBlocks:["#d06aa0","#8a6ad0","#6aa0d0"],flo1:"#f5e0f0",flo2:"#e0c8ea",mount:"#d08ab8"}],
  horizon(P,NP){return svgURI(HW,H,
    gDigitsFloat(1250,H,P.dig1,16,71,44)+
    gBlocksRow(1250,H,P.blocks,7,73,false)+
    '<rect x="1290" y="0" width="410" height="'+H+'" fill="'+NP.sky[0]+'" opacity="0.5"/>'+
    '<g transform="translate(1300,0)">'+gBumps(400,H,NP.far1,5,120,75)+'</g>');},
  mid(P){return svgURI(1400,H,gDigitsFloat(1400,H,P.dig2,12,81,64)+gBlocksRow(1400,H,P.blocks2,6,83,true));},
  ground(P){return svgURI(600,90,gChecker(600,90,P.flo1,P.flo2));},
  fg(P){return svgURI(900,220,gBlocksRow(900,220,P.fgBlocks,5,85,true));},
  decor(P,r){return svgURI(160,260,gBlocksRow(160,260,[P.fgBlocks[r%3],P.fgBlocks[(r+1)%3]],1,87+r,true));}},
 {id:"sea",icon:"🌊",veh:"sub",bank:SEA,gens:["legsS","sizeS"],
  names:["ふかいうみ","よるの ふかいうみ"],
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
 {id:"future",icon:"🌆",veh:"train",bank:FUTURE,gens:["speedF"],
  names:["みらいシティ","あさやけの みらいシティ"],
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
  decor(P,r){return svgURI(150,320,gSkyline(150,320,P.mid1,141+r,P.win2));}},
 {id:"space",icon:"🌌",veh:"rocket",bank:SPACE,gens:[],
  names:["うちゅう","ぎんがの おく"],
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
const QN=5, SPAN=2860, INTRO=320, GAP=430, DROP_OFF=2260, COVER_OFF=2480, COVER_LEN=560;
const TRAIN_WIDTH_MIN_PX=204, TRAIN_WIDTH_VW=33.2, TRAIN_WIDTH_MAX_PX=356, TRAIN_RIGHT_SHIFT_VW=5, DEFAULT_VEHICLE_LEFT_VW=28;
const CHECKPOINT_STOP_LEFT_VW=24, TUNNEL_ENTRY_CAMERA_LEFT_VW=28, TUNNEL_INTERIOR_RUN_VW=360;
const TUNNEL_ENTRY_FADE_DELAY_MS=900, TUNNEL_ENTRY_SWITCH_MS=1320, TUNNEL_ENTRY_BLACK_HOLD_MS=420;
const TUNNEL_EXIT_FADE_SETUP_MS=420, TUNNEL_EXIT_BLACK_HOLD_MS=320, TUNNEL_EXIT_RUN_MS=900, TUNNEL_EXIT_CLEAR_MS=300;
function trainLeftVw(){
 const vw=window.innerWidth||844;
 const w=Math.max(TRAIN_WIDTH_MIN_PX,Math.min(TRAIN_WIDTH_MAX_PX,vw*TRAIN_WIDTH_VW/100));
 return 50-(w/vw*50)+TRAIN_RIGHT_SHIFT_VW;
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
  zkGroups.push({key:st.id,label:st.icon+" "+st.names[0],items});
 });
 zkGroups.push({key:"wp",label:"🎓 なぞなぞマスター",items:WORDPLAY.map(q=>({e:q.a[0],t:q.a[1]}))});
 zkGroups.push({key:"station",label:"🚉 えきの ともだち",items:STATION_HELPERS.map(h=>({e:h.e,t:h.name}))});
 zkGroups.push({key:"rare",label:"🌟 めずらしい ともだち",items:RARES.map(x=>({e:x[0],t:x[1]})),rare:true});
}
function zkKey(e,t){return e+"|"+t;}
function zkTotal(){let n=0;const s=new Set();zkGroups.forEach(g=>g.items.forEach(it=>s.add(zkKey(it.e,it.t))));return s.size;}
function zkCount(){let n=0;const s=new Set();zkGroups.forEach(g=>g.items.forEach(it=>{const k=zkKey(it.e,it.t);if(zkReg.has(k))s.add(k);}));return s.size;}
function registerZk(e,t){const k=zkKey(e,t);const isNew=!zkReg.has(k);zkReg.add(k);if(isNew)saveGame();return isNew;}
function openZukan(){
 const body=document.getElementById("zkBody");body.innerHTML="";
 zkGroups.forEach(g=>{
  const gd=document.createElement("div");gd.className="zkGroup";
  const gn=document.createElement("div");gn.className="zkGName";gn.textContent=g.label;gd.appendChild(gn);
  const gr=document.createElement("div");gr.className="zkGrid";
  g.items.forEach(it=>{
   const c=document.createElement("div");
   const has=zkReg.has(zkKey(it.e,it.t));
   c.className="zkCell"+(has?"":" no")+(g.rare?" rareC":"");
   c.innerHTML='<span class="ze">'+(has?it.e:"❓")+'</span><span class="zt">'+(has?it.t:"？？？")+'</span>';
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
let tunnels=[],playing=false,cars=[],helpItems=[],rareCount=0,rareEl=null,rareSpawned=false;
let bestStarsByStage={},answerLocked=false,portalEditHolding=false;
const SAVE_KEY="pono_nazonazo_tunnel_v1";
const FAST=(location.hash==="#fast")?6:1;
const FORCERARE=(location.hash==="#fast");
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

function setDriverForStage(){
 document.body.dataset.driver=TRAIN_DRIVER_ID;
}
function setDriverMood(mood){
 document.body.dataset.driverMood=mood||"happy";
}

/* ================= dom ================= */
const $=id=>document.getElementById(id);
const world=$("world"),veh=$("veh"),horizon=$("horizon"),midT=$("midT"),groundT=$("groundT"),fgT=$("fgT");
const skyA=$("skyA"),skyB=$("skyB"),carsEl=$("cars"),carBadge=$("carBadge"),helpBadge=$("helpBadge"),helpBtn=$("helpBtn");
const quiz=$("quiz"),qText=$("qText"),hintText=$("hintText"),choicesEl=$("choices");
const dotsEl=$("dots"),stamp=$("stamp");
const portalMaskLayer=$("portalMaskLayer"),portalEditOverlay=$("portalEditOverlay");
const portalOccIn=portalMaskLayer&&portalMaskLayer.querySelector(".portal-occluder-in");
const portalOccOut=portalMaskLayer&&portalMaskLayer.querySelector(".portal-occluder-out");

/* ================= audio & speech ================= */
let ac=null;
let acStatechangeAttached=false;
// running 遷移を待つ tone キュー。suspended/interrupted の間にスケジュールした音が silent-drop するのを防ぐ。
// 古い予約が interrupted 復帰後に遅延爆発するのを避けるため TTL でカリング。
let pendingTones=[];
const PENDING_TONE_MAX=32;
const PENDING_TONE_TTL_MS=800;
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
 if(v==="train"){tone(520,0,.2,"square",.1);tone(520,.25,.35,"square",.1);}
 else if(v==="sub"){tone(300,0,.5,"sine",.12);tone(360,.4,.5,"sine",.12);}
 else{tone(120,0,.7,"sawtooth",.1);tone(90,.1,.8,"sawtooth",.08);}}
function announce(t){const live=$("liveRegion");if(live)live.textContent=t||"";}
function speak(t){announce(t);}
function showHint(){
 if(!cur)return;
 hintText.textContent="💡 ヒント： "+cur.h;
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
 try{
  const payload={
   schemaVersion:1,
   lastLevel:level,
   unlockedLoop,
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
function buildQList(){
 const st=STAGES[stg];
 if(st.id==="number"){qList=[];for(let i=0;i<QN;i++)qList.push(Math.random()<0.6?genCount():genNext());return;}
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
function applySkin(){
 const st=STAGES[stg],P=palOf(stg);
 const nIdx=Math.min(stg+1,STAGES.length-1);
 const NP=STAGES[nIdx].pals[loop%2];
 document.body.className="st-"+st.id+" v-"+st.veh+(PORTAL_EDIT_ENABLED?" portal-edit":"");
 setDriverForStage(stg);
 skyA.style.background=st.assets?bgUrl(st.assets.sky)+" center bottom / cover no-repeat":"linear-gradient("+P.sky[0]+","+P.sky[1]+")";
 skyB.style.background="linear-gradient("+NP.sky[0]+","+NP.sky[1]+")";
 skyB.style.opacity="0";
 horizon.style.backgroundImage=st.assets?bgUrl(st.assets.horizon):st.horizon(P,NP);
 midT.style.backgroundImage=st.assets?bgUrl(st.assets.mid):st.mid(P);
 groundT.style.backgroundImage=st.assets?bgUrl(st.assets.ground):st.ground(P);
 fgT.style.backgroundImage=st.assets?bgUrl(st.assets.fg):st.fg(P);
 buildAmbient(P);
}
function buildWorld(keepCover){
 world.innerHTML="";
 if(keepCover&&transitCover)world.appendChild(transitCover);
 tunnels=[];
 const o=origin(stg),st=STAGES[stg],P=palOf(stg);
 for(let i=0;i<QN;i++){
 const t=document.createElement("div");t.className="tun";
  if(st.id==="town")t.classList.add("station");
  t.style.left=tunX(o,i)+"vw";
  t.innerHTML=st.id==="town"
   ? '<div class="station-art"></div><div class="station-name">えき</div><div class="sign">❓</div>'
   : '<div class="mount" style="background:'+P.mount+'"></div><div class="sign">❓</div><div class="hole"><div class="door l"></div><div class="door r"></div></div>';
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
  for(let k=0;k<2;k++){
   const d=document.createElement("div");d.className="decor";
   const wv=8+((i*7+k*5)%8);
   d.style.width=wv+"vw";d.style.height=(wv*(st.id==="town"?1.25:1.6))+"vw";
   d.style.left=(tunX(o,i)-70+k*38+((i*13)%14))+"vw";
   d.style.backgroundImage=st.decor(P,i*2+k);
   if(st.id==="town"){
    d.classList.add("town-decor");
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
    b.type="button";b.className="runEvent";b.textContent=ev[0];
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
  dropEl.innerHTML='<div class="drop-station-art"></div><div class="drop-station-name">おりるえき</div><div class="drop-station-friends">👋</div>';
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
 document.querySelectorAll(".bub,.twk,.fly").forEach(n=>n.remove());
 const sc=$("scene"),st=STAGES[stg];
 const fx=(P&&P.fx)||"";
 if(st.id==="sea"){for(let i=0;i<8;i++){const b=document.createElement("div");b.className="bub";
  b.style.left=(5+i*12)+"%";b.style.animationDuration=(7+(i%4)*2.5)+"s";b.style.animationDelay=(-i*1.7)+"s";sc.appendChild(b);}}
 if(st.id==="space"||st.id==="future"){for(let i=0;i<10;i++){const t=document.createElement("div");t.className="twk";t.textContent="✦";
  t.style.left=(3+i*10)+"%";t.style.top=(5+((i*23)%40))+"%";t.style.animationDelay=(-i*.4)+"s";sc.appendChild(t);}}
 if(fx==="fireflies"){for(let i=0;i<12;i++){const f=document.createElement("div");f.className="fly";f.textContent="●";
  f.style.left=(3+i*8)+"%";f.style.top=(30+((i*17)%45))+"%";f.style.animationDelay=(-i*.6)+"s";sc.appendChild(f);}}
}

/* ================= passengers ================= */
function carGap(){return STAGES[stg]&&STAGES[stg].veh==="train"?39.0:8.8;}
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
 if(c.img){
  const im=document.createElement("img");
  im.className="pas-img";im.src=c.img;im.alt="";
  seat.appendChild(im);
 }else{
  const sp=document.createElement("span");
  sp.className="pas";sp.textContent=c.e;
  seat.appendChild(sp);
 }
 return seat;
}
function renderCars(){
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
 carBadge.style.display=cars.length?"block":"none";
 carBadge.textContent="👥 ×"+cars.length;
}
function coverEntryStop(){
 if(!coverEl)return worldX;
 return parseFloat(coverEl.style.left)-TUNNEL_ENTRY_CAMERA_LEFT_VW;
}
function showTunnelRunIn(){
 setDriverMood("happy");
 document.body.classList.remove("tunnel-exit-setup","tunnel-exit-run");
 document.body.classList.add("tunnel-enter-run");
 veh.classList.add("go");carsEl.classList.add("go");
 setTimeout(()=>document.body.classList.add("tunnel-fade-dark"),TUNNEL_ENTRY_FADE_DELAY_MS);
 setTimeout(()=>{
  if(!playing||driving||pending!=="tunnelSwitch")return;
  enterTunnelInterior();
 },TUNNEL_ENTRY_SWITCH_MS);
 pending="tunnelSwitch";
}
function enterTunnelInterior(){
 if(transitCover){transitCover.remove();transitCover=null;}
 document.body.classList.remove("tunnel-enter-run");
 tunnelInteriorMode=true;
 document.body.classList.add("tunnel-interior");
 world.innerHTML="";tunnels=[];coverEl=null;dropEl=null;
 worldX=origin(stg)+COVER_OFF;
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
function finishTunnelInterior(){
 veh.classList.add("go","inTun");carsEl.classList.add("go","inTun");
 document.body.classList.remove("tunnel-enter-run","tunnel-exit-setup","tunnel-exit-run","tunnel-exit-clear");
 document.body.classList.add("tunnel-fade-dark");
 setTimeout(()=>{
  if(!playing)return;
  tunnelInteriorMode=false;
  document.body.classList.remove("tunnel-interior");
  stg++;buildQList();qSeg=0;stageMiss=0;rareSpawned=false;
  applySkin();buildWorld(false);drawDots();
  document.body.classList.add("tunnel-fade-dark","tunnel-exit-setup");
  worldX=origin(stg);target=stops(origin(stg),0);
  pending="quiz";driving=true;swapReady=false;swapped=false;
  veh.classList.add("go");veh.classList.remove("idle");
  carsEl.classList.add("go");
  sparkOnVeh();sndGo();
  speak("トンネルを ぬけたら、"+STAGES[stg].names[loop%2]+"だ！");
  render();
  void veh.offsetWidth;
  setTimeout(()=>{
   if(!playing)return;
   document.body.classList.remove("tunnel-exit-setup");
   document.body.classList.add("tunnel-exit-run");
   requestAnimationFrame(()=>document.body.classList.remove("tunnel-fade-dark"));
   setTimeout(()=>{
    if(!playing)return;
    document.body.classList.add("tunnel-fade-dark");
    setTimeout(()=>{
     if(!playing)return;
     document.body.classList.remove("tunnel-exit-run","tunnel-exit-clear");
     requestAnimationFrame(()=>document.body.classList.remove("tunnel-fade-dark"));
    },TUNNEL_EXIT_CLEAR_MS);
   },TUNNEL_EXIT_RUN_MS);
  },TUNNEL_EXIT_BLACK_HOLD_MS);
 },TUNNEL_EXIT_FADE_SETUP_MS);
}
function beginStageTransit(){
 if(!coverEl)return;
 transitCover=coverEl;
 swapReady=false;swapped=false;
 target=coverEntryStop();
 pending="tunnelEntry";driving=true;
 sndGo();
}
function showDropoff(){
 setDriverMood("happy");
 const hadCars=cars.length>0;
 if(dropEl)dropEl.classList.add("open");
 if(hadCars){
  carsEl.classList.add("unloading");
  cars=[];
  carBadge.style.display="none";
  carBadge.textContent="👥 ×0";
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
 const fl=document.createElement("div");fl.className="flyer";
 if(passenger.happy||passenger.img||passenger.normal){
  const im=document.createElement("img");
  im.src=passenger.happy||passenger.img||passenger.normal;im.alt="";
  fl.appendChild(im);
 }else fl.textContent=passenger.e;
 const src=stationEl&&stationEl.querySelector(".station-helper img");
 if(src){
  const r=src.getBoundingClientRect();
  fl.style.left=(r.left+r.width*.5)+"px";
  fl.style.bottom=(window.innerHeight-r.bottom)+"px";
 }else{
  fl.style.left="50vw";fl.style.bottom="30vh";
 }
 $("app").appendChild(fl);
 requestAnimationFrame(()=>{requestAnimationFrame(()=>{
  fl.style.left=(vehicleLeftVw()-carGap())+"vw";fl.style.bottom="14vh";
 });});
 setTimeout(()=>{
  fl.remove();
  cars.push({e:passenger.e,t:passengerLabel(passenger),img:passenger.normal||passenger.img||passenger.happy});renderCars();
  if(isNew){sndNew();showStamp("あたらしい ともだち！","new");}
 },780);
 return isNew;
}

/* ================= rare events ================= */
function maybeSpawnRare(){
 if(rareEl)return;
 if(!FORCERARE&&Math.random()>0.25)return;
 const [e,t]=RARES[stg];
 rareEl=document.createElement("div");
 rareEl.className="rare";rareEl.textContent=e;
 rareEl.style.left="104vw";rareEl.style.top=(10+rnd(0,18))+"vh";
 $("app").appendChild(rareEl);
 rareSpawned=true;
 const born=performance.now();
 const el=rareEl;
 el.addEventListener("pointerdown",()=>{
  if(!el.parentNode)return;
  el.remove();if(rareEl===el)rareEl=null;
  rareCount++;
  const isNew=registerZk(e,t);
  sndNew();confetti(8);
  showStamp(isNew?"めずらしい ともだち！":"また あえたね！","new");
  speak(t+"を みつけた！");
 });
 (function fly(){
  if(!el.parentNode)return;
  const dt=(performance.now()-born)/1000*FAST;
  const x=104-dt*26;
  el.style.left=x+"vw";
  if(x<-12){el.remove();if(rareEl===el)rareEl=null;return;}
  requestAnimationFrame(fly);
 })();
}

/* ================= hud/fx ================= */
function drawDots(){
 dotsEl.innerHTML="";
 const sp=document.createElement("span");sp.id="stgName";
 sp.textContent=STAGES[stg].icon+" "+STAGES[stg].names[loop%2];
 dotsEl.appendChild(sp);
 for(let i=0;i<QN;i++){const d=document.createElement("div");d.className="dot"+(i<qSeg?" on":"");
  d.textContent=i<qSeg?"⭐":"";dotsEl.appendChild(d);}
}
function showStamp(txt,cls){stamp.textContent=txt;announce(txt);stamp.className="";void stamp.offsetWidth;stamp.className=cls;}
function updateHelpHud(){
 const n=helpItems.length;
 if(helpBadge){helpBadge.style.display=n?"block":"none";helpBadge.textContent=(n?helpItems[n-1].e:"🍀")+" ×"+n;}
 if(helpBtn){helpBtn.textContent="🍀 ×"+n;helpBtn.classList.toggle("empty",!n);helpBtn.disabled=false;}
}
function confetti(n){const em=["🎉","⭐","🎈","✨","💛"];
 for(let i=0;i<(n||24);i++){const c=document.createElement("div");c.className="conf";
  c.textContent=em[i%em.length];c.style.left=(Math.random()*96)+"vw";
  c.style.animationDelay=(Math.random()*.8)+"s";$("app").appendChild(c);
  setTimeout(()=>c.remove(),3400);}}
function sparkOnVeh(){
 for(let i=0;i<5;i++){const s=document.createElement("div");s.className="spark";s.textContent="✨";
  s.style.left="calc("+vehicleLeftVw()+"vw + "+(i*4)+"vw)";s.style.bottom=(16+((i*7)%12))+"vh";
  $("app").appendChild(s);setTimeout(()=>s.remove(),900);}
}
function onRunEvent(el,ev){
 if(!driving||!el||el.classList.contains("found"))return;
 el.classList.add("found");el.disabled=true;
 if(helpItems.length<HELP_MAX)helpItems.push({e:ev[0],t:ev[1]});
 updateHelpHud();
 const r=el.getBoundingClientRect();
 for(let i=0;i<4;i++){
  const s=document.createElement("div");s.className="spark";s.textContent=i%2?"⭐":"✨";
  s.style.left=(r.left+r.width*.35+i*r.width*.1)+"px";
  s.style.top=(r.top+r.height*.1)+"px";
  $("app").appendChild(s);setTimeout(()=>s.remove(),900);
 }
 tone(1047,0,.12,"triangle",.11);tone(1319,.1,.16,"triangle",.09);
 showStamp(helpItems.length>=HELP_MAX?"おたすけ いっぱい！":"おたすけ ゲット！","new");
 speak(ev[1]+"を みつけた！");
}
function useHelp(){
 if(answerLocked||driving||!quiz.classList.contains("show"))return;
 if(!helpItems.length){
  showStamp("みつけてね！","ng");
  announce("はしっているときに、おたすけを みつけよう");
  return;
 }
 const item=helpItems.pop();
 updateHelpHud();
 const choices=[...choicesEl.querySelectorAll(".choice")];
 const wrong=choices.find(c=>c.dataset.ok!=="1"&&!c.classList.contains("dim"));
 if(wrong){wrong.classList.add("dim");wrong.disabled=true;}
 const ok=choices.find(c=>c.dataset.ok==="1");
 if(ok)ok.classList.add("glow");
 tone(880,0,.12,"triangle",.12);tone(1175,.1,.16,"triangle",.1);
 showStamp("おたすけ！","new");
 announce(item.t+"が おしえてくれたよ");
}

/* ================= render ================= */
function render(){
 const o=origin(stg);
 world.style.transform="translateX("+(-worldX)+"vw)";
 if(tunnelInteriorMode){
  skyA.style.background='#17110b url("../assets/images/nazonazo-tunnel/tunnel_interior_cover_20260703.webp") '+(-worldX*.55)+'vw center / auto 100% repeat-x';
  skyB.style.opacity="0";
  veh.classList.add("inTun");
  carsEl.classList.add("inTun");
  renderPortalMasks(null);
  return;
 }
 const hd=clamp((worldX-o)*0.095,0,70);
 horizon.style.transform="translateX("+(-hd)+"vw)";
 midT.style.backgroundPositionX=(-worldX*0.25)+"vw";
 groundT.style.backgroundPositionX=(-worldX*1)+"vw";
 fgT.style.backgroundPositionX=(-worldX*1.35)+"vw";
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

/* ================= game loop ================= */
let lastT=0;
function gloop(t){
 if(!lastT)lastT=t;
 let dt=Math.min(0.05,(t-lastT)/1000)*FAST;
 lastT=t;
 if(playing&&driving){
  const dist=target-worldX;
  const tunnelRun=pending==="tunnelEntry"||pending==="tunnelExit";
  const maxV=tunnelRun?58:(swapReady?52:38);
  vel=tunnelRun?maxV:clamp(dist*.98,6,maxV);
  worldX=Math.min(target,worldX+vel*dt);
  veh.classList.add("go");veh.classList.remove("idle");
  carsEl.classList.add("go");
  if(swapReady&&!swapped&&transitCover){
   const cl=parseFloat(transitCover.style.left);
   if(worldX>cl+portalTuning.swapOffsetVw){
    swapped=true;
    stg++;buildQList();qSeg=0;stageMiss=0;rareSpawned=false;
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
   veh.classList.remove("go");veh.classList.add("idle");
   carsEl.classList.remove("go");
   const p=pending;pending=null;
   if(p==="quiz")showQuiz();
   else if(p==="dropoff")showDropoff();
   else if(p==="tunnelEntry")showTunnelRunIn();
   else if(p==="tunnelExit")finishTunnelInterior();
   else if(p==="ending")ending();
  }
 }
 render();
 requestAnimationFrame(gloop);
}

/* ================= flow ================= */
function startJourneyAt(s){
 stg=s;qSeg=0;stageMiss=0;rareSpawned=false;
 portalEditHolding=false;tunnelInteriorMode=false;
 document.body.classList.remove("tunnel-enter-run","tunnel-exit-setup","tunnel-exit-run","tunnel-exit-clear","tunnel-fade-dark","tunnel-interior");
 if(transitCover){transitCover.remove();transitCover=null;}
 buildQList();applySkin();buildWorld(false);drawDots();
 setDriverMood("cheer");
 worldX=origin(s);target=stops(origin(s),0);
 pending="quiz";driving=true;playing=true;swapReady=false;swapped=false;
 cars=[];helpItems=[];renderCars();updateHelpHud();
 $("map").classList.add("hidden");
 quiz.classList.remove("show");
 sndGo();
}
function showQuiz(){
 setDriverMood("thinking");
 cur=qList[qSeg];missInQ=0;answerLocked=false;
 qText.textContent=cur.helper?(cur.helper.name+"を たすけよう！ "+cur.q):cur.q;
 hintText.textContent=helpItems.length?"🍀 おたすけを つかえるよ":"";
 choicesEl.innerHTML="";
 let opts=[{e:cur.a[0],t:cur.a[1],ok:true},...cur.d.map(x=>({e:x[0],t:x[1],ok:false}))];
 if(level===0&&opts.length>2)opts=opts.slice(0,2);
 opts=shuffle(opts);
 opts.forEach(o=>{const b=document.createElement("button");b.type="button";b.className="choice";
  b.setAttribute("aria-label",o.t);
  b.dataset.ok=o.ok?"1":"0";
  b.innerHTML='<span class="em">'+o.e+'</span><span class="lb">'+o.t+'</span>';
  bindTap(b,()=>onPick(b,o));
  choicesEl.appendChild(b);});
 quiz.classList.add("show");
 speak(cur.s||cur.q);
}
function onPick(el,o){
 if(answerLocked||driving||!quiz.classList.contains("show"))return;
 answerLocked=true;
 if(o.ok){
  setDriverMood("cheer");
  sndOK();showStamp("せいかい！","ok");
  quiz.classList.remove("show");
  const pe=cur.pe||[cur.a[0],cur.a[1]];
  const t=tunnels[qSeg];
  const passenger=cur.helper||{e:pe[0],t:pe[1],name:pe[1]};
  const isNew=boardPassenger(passenger,pe,t);
  speak(isNew?"せいかい！あたらしい ともだちだ！":"せいかい！"+passengerLabel(passenger)+"が のったよ！");
  setTimeout(()=>{sndOpen();if(t)t.classList.add("open");const sg=t&&t.querySelector(".sign");if(sg)sg.textContent="⭕";},420);
  setTimeout(()=>{proceed();},1050);
 }else{
  setDriverMood("surprised");
  missInQ++;stageMiss++;
  sndNG();el.classList.add("ng","dim");
  const t=tunnels[qSeg];
  if(t){t.classList.add("shake");setTimeout(()=>t.classList.remove("shake"),520);}
  showStamp("おしい！","ng");
  if(missInQ===1)showHint();
  if(missInQ>=2){choicesEl.querySelectorAll(".choice").forEach(c=>{
   if(!c.classList.contains("dim"))c.classList.add("glow");});}
  setTimeout(()=>{answerLocked=false;setDriverMood("thinking");},520);
 }
}
function proceed(){
 setDriverMood("cheer");
 qSeg++;drawDots();
 const o=origin(stg);
 if(!rareSpawned)setTimeout(maybeSpawnRare,600);
 if(qSeg<QN){
  sndGo();
  target=stops(o,qSeg);pending="quiz";driving=true;
 }else{
  cleared[stg]=true;
  const stars=stageMiss===0?3:(stageMiss<=2?2:1);
  totalStars+=stars;
  const key=loop+"-"+stg;
  bestStarsByStage[key]=Math.max(Number(bestStarsByStage[key])||0,stars);
  saveGame();
  showStamp(STAGES[stg].names[loop%2]+" できた！ "+"⭐".repeat(stars),"clear");
  sndFan();confetti(14);
  if(stg<STAGES.length-1){
   if(cars.length&&dropEl){
    sndGo();
    target=dropStop(o);pending="dropoff";driving=true;
   }else{
    beginStageTransit();
   }
  }else{
   sndGo();
   target=tunX(o,QN-1)+150;pending="ending";driving=true;
  }
 }
}
function ending(){
 setDriverMood("cheer");
 playing=false;
 confetti(40);sndFan();
 const grand=loop>=1;
 unlockedLoop=Math.max(unlockedLoop,1);
 saveGame();
 $("resTitle").textContent=grand?"🌈 ぎんがの はてまで せいは！":"🌍 うちゅうまで とうちゃく！";
 $("resStars").textContent="⭐×"+totalStars;
 $("resMsg").textContent="ともだち ずかん "+zkCount()+"/"+zkTotal()
  +(rareCount?"　めずらしい ともだち "+rareCount+"かい はっけん！":"")
  +(grand?"　きみは なぞなぞマスターだ！":"");
 $("loopBtn").style.display=(loop===0)?"inline-block":"none";
 speak(grand?"ぎんがのはてまで、だいせいこう！きみはなぞなぞマスターだ！":"うちゅうまで とうちゃく！だいぼうけん、だいせいこう！");
 setTimeout(()=>$("result").classList.remove("hidden"),900);
}

/* ================= map ================= */
function openMap(msg){
 playing=false;driving=false;quiz.classList.remove("show");
 const row=$("mapRow");row.innerHTML="";
 let highestOpen=0;
 cleared.forEach((done,i)=>{if(done)highestOpen=Math.max(highestOpen,i+1);});
 highestOpen=Math.min(STAGES.length-1,Math.max(highestOpen,stg));
 STAGES.forEach((s,i)=>{
  if(i>0){const d=document.createElement("span");d.className="mapDash";d.textContent="➜";row.appendChild(d);}
  const canVisit=i<=highestOpen;
  const n=document.createElement("button");n.type="button";n.className="mapNode"+(i===stg?" cur":"")+(canVisit?"":" locked");
  if(!canVisit)n.disabled=true;
  n.innerHTML='<span class="mi">'+s.icon+'</span>'+s.names[loop%2]+(cleared[i]?'<span class="st">⭐</span>':'');
  if(canVisit)bindTap(n,()=>{ensureAC();stg=i;openMap("「"+s.names[loop%2]+"」から いく？");});
  row.appendChild(n);
 });
 $("loopBadge").style.display=(loop>=1)?"block":"none";
 $("mapMsg").textContent=msg||("つぎは「"+STAGES[stg].names[loop%2]+"」！");
 $("map").classList.remove("hidden");
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
  stg=0;loop=0;cleared=[];totalStars=0;rareCount=0;
  startJourneyAt(0);
  bootPending=false;
 };
 if(p&&p.then)p.then(boot,boot);else boot();
});
bindTap($("goBtn"),()=>{ensureAC();startJourneyAt(stg);});
bindTap($("againBtn"),()=>{ensureAC();
 $("result").classList.add("hidden");stg=0;loop=0;cleared=[];totalStars=0;rareCount=0;startJourneyAt(0);});
bindTap($("loopBtn"),()=>{ensureAC();
 $("result").classList.add("hidden");
 loop=1;stg=0;cleared=[];totalStars=0;rareCount=0;
 startJourneyAt(0);
 speak("2しゅうめ！せかいのいろが かわってるよ！");});
bindTap($("zkBtnTitle"),()=>{ensureAC();openZukan();});
bindTap($("zkBtnMap"),()=>{ensureAC();openZukan();});
bindTap($("zkBtnRes"),()=>{ensureAC();openZukan();});
bindTap($("zkClose"),()=>{$("zukan").classList.add("hidden");});
bindTap($("homeBtn"),()=>{
 if(quiz.classList.contains("show")){showStamp("いまは トンネルを あけよう","ng");return;}
 openMap();
});
bindTap($("spkBtn"),()=>{showHint();});
bindTap($("helpBtn"),()=>{useHelp();});

buildRegistry();
loadPortalTuning();
loadGame();applyLevelSelection();
applySkin();buildWorld(false);drawDots();renderCars();updateHelpHud();render();
initPortalEditor();

// AC unlock 安全網: bindTap 未配線領域 (背景/scene/portal editor) のタップでも resume を担保
document.addEventListener("pointerdown",()=>{ensureAC();},{capture:true,passive:true});

// visibility/lifecycle 復帰: iOS/Android で BG 復帰後に AC が suspended/interrupted のままだと SE が全滅する
// blur は意図的に購読しない (iOS の疑似 blur で AC を止めない方針)
document.addEventListener("visibilitychange",()=>{
 if(document.hidden){safeSuspend();}
 else{ensureAC();}
});
window.addEventListener("pageshow",()=>{ensureAC();});
window.addEventListener("focus",()=>{ensureAC();});
window.addEventListener("pagehide",()=>{safeSuspend();});

requestAnimationFrame(gloop);
})();
