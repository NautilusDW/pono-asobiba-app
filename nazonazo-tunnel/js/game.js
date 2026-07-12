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
const TOWN_HORIZON_PARALLAX=.16;
const ASSETS={
  town:{
   sky:"../assets/images/nazonazo-tunnel/town_sky_back_20260703.webp",
   horizon:"../assets/images/nazonazo-tunnel/town_horizon_layer_whiteback_20260712_v2.webp",
   mid:"../assets/images/nazonazo-tunnel/town_mid_layer_whiteback_20260712_v2.webp",
   ground:"../assets/images/nazonazo-tunnel/rail_track_loop_jungle_style_bright_20260705.webp",
   fg:"../assets/images/nazonazo-tunnel/town_foreground_grass_20260703_v2.webp",
   station:"../assets/images/nazonazo-tunnel/town_station_checkpoint_20260703.webp",
   decor:"../assets/images/nazonazo-tunnel/town_station_line_trees_20260706.webp"
 },
 jungle:{
  sky:"../assets/images/nazonazo-tunnel/jungle_sky_back_20260703.webp",
  horizon:"../assets/images/nazonazo-tunnel/jungle_horizon_layer_whiteback_20260712_v2.webp",
  mid:"../assets/images/nazonazo-tunnel/jungle_mid_layer_20260703.webp",
  habitat:"../assets/images/nazonazo-tunnel/jungle_habitat_loop_whiteback_20260712.webp",
  ground:"../assets/images/nazonazo-tunnel/rail_track_loop_jungle_style_bright_20260705.webp",
  fg:"../assets/images/nazonazo-tunnel/jungle_foreground_layer_20260703.webp",
  station:"../assets/images/nazonazo-tunnel/jungle_station_checkpoint_20260706.webp",
  decor:"../assets/images/nazonazo-tunnel/jungle_station_line_trees_20260706.webp",
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
  decor:"../assets/images/nazonazo-tunnel/number_room_decor_20260707.webp"
 },
 future:{
  sky:"../assets/images/nazonazo-tunnel/future_city_sky_back_20260707.webp",
  horizon:"../assets/images/nazonazo-tunnel/future_city_horizon_loop_long_20260707.webp",
  mid:"../assets/images/nazonazo-tunnel/future_city_mid_loop_long_20260707.webp",
  ground:"../assets/images/nazonazo-tunnel/future_city_ground_track_loop_20260707.webp",
  fg:"../assets/images/nazonazo-tunnel/future_city_foreground_loop_20260707.webp",
  decor:"../assets/images/nazonazo-tunnel/future_city_station_line_decor_20260707.webp"
 }
};
const bgUrl=src=>'url("'+src+'")';
const STAGES=[
 {id:"town",icon:"🏘️",veh:"train",bank:TOWN,gens:[],skyPosition:"center calc(100% - var(--town-sky-lift,42vh))",
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
 {id:"jungle",icon:"🌴",veh:"train",bank:JUNGLE,gens:["legsJ","sizeJ"],skyPosition:"center calc(100% - 10vh)",
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
 {id:"number",icon:"🎲",veh:"train",bank:null,gens:[],
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
 {id:"sea",icon:"🌊",veh:"sub",bank:SEA,gens:["legsS","sizeS"],
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
 {id:"future",icon:"🌆",veh:"train",bank:FUTURE,gens:["speedF"],
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
const JUNGLE_MID_TILE_ASPECT=2,JUNGLE_MID_TILE_SCALE=1.16;
const JUNGLE_ANIMAL_LAYOUT={
 far:[
  {id:"toucans-loop",asset:"toucans",species:"toucans",anchor:"perch",x:104,y:34,anchorY:74,w:14,min:46,max:126,depth:.25,opacity:1,motion:"sway",flip:-1,origin:"50% 74%",moveY:0,loop:"mid"},
  {id:"elephant-far-a",role:"distant",asset:"elephant",species:"elephant",anchor:"habitat",stageX:296,align:"right",inset:8,y:74.5,anchorY:80.9,wCss:"min(9vw,23vmin)",min:58,max:92,depth:.28,opacity:1,motion:"breathe",flip:-1,origin:"50% 80.9%",moveY:0,loop:"stage",frames:3,fixedFrame:0},
  {id:"giraffe-far-a",role:"distant",asset:"giraffe",species:"giraffe",anchor:"habitat",stageX:1156,align:"left",inset:8,y:73.5,anchorY:86.8,wCss:"min(8vw,20vmin)",min:52,max:88,depth:.3,opacity:1,motion:"breathe",flip:-1,origin:"50% 86.8%",moveY:0,loop:"stage"}
 ],
 mid:[
  {id:"sloth-loop",asset:"sloth",species:"sloth",anchor:"hang",x:6,y:37,anchorY:10,w:21,min:62,max:184,depth:.25,opacity:1,motion:"sway",flip:1,origin:"50% 10%",moveY:0,loop:"mid"},
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
const SCORE_POINTS={correct:100,firstTry:50,stageClear:300,noMiss:200,helpOverflow:50,rare:300,tunnelFriend:100,tunnelPerfect:200};
const QN=5, SPAN=2860, INTRO=320, GAP=430, DROP_OFF=2260, COVER_OFF=2480, COVER_LEN=560;
const TRAIN_WIDTH_MIN_PX=190, TRAIN_WIDTH_VW=30.9, TRAIN_WIDTH_MAX_PX=331, TRAIN_RIGHT_SHIFT_VW=5, DEFAULT_VEHICLE_LEFT_VW=28;
const TRAIN_CAR_WIDTH_MIN_PX=300, TRAIN_CAR_WIDTH_VW=47, TRAIN_CAR_WIDTH_MAX_PX=480;
const TRAIN_CAR_HEIGHT_MIN_PX=83, TRAIN_CAR_HEIGHT_VW=13.1, TRAIN_CAR_HEIGHT_MAX_PX=133;
const CHECKPOINT_STOP_LEFT_VW=24, TUNNEL_ENTRY_CAMERA_LEFT_VW=28, TUNNEL_INTERIOR_RUN_VW=360;
const TUNNEL_EXIT_APPROACH_RUN_VW=135;
const TUNNEL_ENTRY_FADE_DELAY_MS=900, TUNNEL_ENTRY_SWITCH_MS=1320, TUNNEL_ENTRY_BLACK_HOLD_MS=420;
const TUNNEL_EXIT_FADE_SETUP_MS=420, TUNNEL_EXIT_BLACK_HOLD_MS=320, TUNNEL_EXIT_RUN_MS=1250, TUNNEL_EXIT_CLEAR_MS=1600;
const TUNNEL_GAME_MAX_V=32,TUNNEL_TRANSIT_MAX_V=58,TUNNEL_GAME_WHEEL_PERIOD=1.05,TUNNEL_WALL_PARALLAX=.55,TUNNEL_WALL_ASPECT=1600/900,TUNNEL_WALL_BAYS=4,TUNNEL_FRIEND_GAP_TARGET_VW=55;
const TUNNEL_FRIEND_LIMIT=3,TUNNEL_FRIEND_Y=[50,61,55],TUNNEL_FRIEND_STATIC_SLOTS=[{x:10,y:68},{x:34,y:70},{x:90,y:68}];
const STOP_SETTLE_MS=230, WHEEL_FAST_PERIOD=0.62, WHEEL_SLOW_PERIOD=1.55, WHEEL_STOP_EASE_VW=82;
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
 const vw=window.innerWidth||844,vh=window.innerHeight||390;
 const h=Math.max(TRAIN_CAR_HEIGHT_MIN_PX,Math.min(TRAIN_CAR_HEIGHT_MAX_PX,vw*TRAIN_CAR_HEIGHT_VW/100));
 return h/vh*100;
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
let tunnels=[],playing=false,cars=[],helpItems=[],rareCount=0,rareEl=null,rareSpawned=false,rareSpawnTimer=0;
let journeyScore=0,highScore=0,stageScore=0,stageScoreBreakdown=emptyStageScoreBreakdown(),stageClearScoreGranted=false;
let tunnelFriendCandidates=[],tunnelFriendsFound=0,tunnelFriendTotalFound=0,tunnelFriendRewardGranted=false,tunnelFriendPerfectScoreGranted=false,tunnelFriendGameActive=false,tunnelFriendStartWorldX=0;
let bestStarsByStage={},answerLocked=false,portalEditHolding=false,nextMagicPuffAt=0,exitPortalBaseWorldX=0;
let numberCargoPicked=[],numberCargoGoalShown=false;
let numberCargoTheme=null;
let steerTargetY=0,steerY=0,seaSteerPointerId=null,seaSteerUsed=false;
let seaBubbleLaunchPending=false,seaBubbleLaunchTimer=0,seaBubbleOptions=[];
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
const world=$("world"),veh=$("veh"),horizon=$("horizon"),midT=$("midT"),groundT=$("groundT"),fgT=$("fgT"),seaFishLayer=$("seaFishLayer"),smokeLayer=$("smokeLayer"),townHorizonLoop=$("townHorizonLoop"),townMidLoop=$("townMidLoop"),jungleHabitatBack=$("jungleHabitatBack");
const vehicleSteerShell=$("vehicleSteerShell"),seaSteerSurface=$("seaSteerSurface"),seaAnswerLayer=$("seaAnswerLayer"),seaSteerHint=$("seaSteerHint");
const jungleAnimalLayers={far:$("jungleAnimalsFar"),mid:$("jungleAnimalsMid"),near:$("jungleAnimalsNear")};
const jungleFlightLayers={bird:$("jungleBirdFlightLayer"),butterfly:$("jungleButterflyFlightLayer")};
const skyA=$("skyA"),skyB=$("skyB"),carsEl=$("cars"),carBadge=$("carBadge"),helpBadge=$("helpBadge"),helpBtn=$("helpBtn");
const quiz=$("quiz"),qText=$("qText"),hintText=$("hintText"),choicesEl=$("choices");
const dotsEl=$("dots"),stamp=$("stamp"),weatherNotice=$("weatherNotice"),scoreCurrentPill=$("scoreCurrentPill"),scoreHudValue=$("scoreHudValue"),highScorePill=$("highScorePill"),highScoreValue=$("highScoreValue");
const tunnelFriendGame=$("tunnelFriendGame"),tunnelFriendGuide=$("tunnelFriendGuide"),tunnelFriendCounter=$("tunnelFriendCounter"),tunnelFriendLayer=$("tunnelFriendLayer"),tunnelFriendResult=$("tunnelFriendResult");
const tunnelStageScore=$("tunnelStageScore"),tunnelJourneyScore=$("tunnelJourneyScore"),tunnelResultStage=$("tunnelResultStage"),tunnelResultBreakdown=$("tunnelResultBreakdown"),tunnelResultTotal=$("tunnelResultTotal");
const portalMaskLayer=$("portalMaskLayer"),portalEditOverlay=$("portalEditOverlay");
const portalOccIn=portalMaskLayer&&portalMaskLayer.querySelector(".portal-occluder-in");
const portalOccOut=portalMaskLayer&&portalMaskLayer.querySelector(".portal-occluder-out");
const rainLayerElements={far:$("rainFar"),mid:$("rainMid"),near:$("rainNear")};
let seaFishSprites=[];
let jungleAnimalSprites=[];
let jungleFlightSprites=[];
const jungleFlightBags={bird:[],butterfly:[]};
const jungleFlightLast={bird:"",butterfly:""};
let lastJungleAnimalRenderKey="";
let lastJungleFlightRenderAt=0;
let lastWheelPeriod=0;
let weatherNoticeTimer=0;

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
  const slow=document.createElement("span");slow.textContent="☔ あめだ！ ゆっくり はしるよ";
  const benefit=document.createElement("span");benefit.className="weather-benefit";
  benefit.textContent="🌟 めずらしい ともだちに あえるかも";
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
 const interval=clamp(rawPeriod*430,170,560)/FAST;
 scheduleTrainChuff(0,tunnel?.13:.16,tunnel);
 trainSeStep++;
 nextTrainSeAt=now+interval;
}
function announce(t){const live=$("liveRegion");if(live)live.textContent=t||"";}
function speak(t){announce(t);}
function showHint(){
 if(!cur)return;
 if(isNumberCargoQuestion()){showNumberCargoHint(false);return;}
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
 skyA.style.background=st.assets?bgUrl(st.assets.sky)+" "+(st.skyPosition||"center bottom")+" / cover no-repeat":"linear-gradient("+P.sky[0]+","+P.sky[1]+")";
 skyA.style.backgroundColor=st.id==="town"?"#c7d659":(st.id==="jungle"?"#34793f":"transparent");
 skyB.style.background="linear-gradient("+NP.sky[0]+","+NP.sky[1]+")";
 skyB.style.opacity="0";
 horizon.style.backgroundImage=st.assets?bgUrl(st.assets.horizon):st.horizon(P,NP);
 midT.style.backgroundImage=st.assets?bgUrl(st.assets.mid):st.mid(P);
 groundT.style.backgroundImage=st.assets?bgUrl(st.assets.ground):st.ground(P);
 fgT.style.backgroundImage=st.assets?bgUrl(st.assets.fg):st.fg(P);
 if(jungleHabitatBack)jungleHabitatBack.style.backgroundImage=st.id==="jungle"&&st.assets&&st.assets.habitat?bgUrl(st.assets.habitat):"none";
 buildAmbient(P);
 buildSeaFish();
 buildJungleAnimals();
 buildJungleFlights();
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
   ? '<div class="station-art"></div><div class="station-name">えき</div><div class="sign">❓</div>'
   : '<div class="mount" style="background:'+P.mount+'"></div><div class="sign">❓</div><div class="hole"><div class="door l"></div><div class="door r"></div></div>';
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
  for(let k=0;k<2;k++){
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
 document.querySelectorAll(".bub,.twk,.fly,.numfx").forEach(n=>n.remove());
 const sc=$("scene"),st=STAGES[stg];
 const fx=(P&&P.fx)||"";
 if(st.id==="number")buildNumberFx(sc);
 if(st.id==="sea"){for(let i=0;i<8;i++){const b=document.createElement("div");b.className="bub";
  b.style.left=(5+i*12)+"%";b.style.animationDuration=(7+(i%4)*2.5)+"s";b.style.animationDelay=(-i*1.7)+"s";sc.appendChild(b);}}
 if(st.id==="space"||st.id==="future"){for(let i=0;i<10;i++){const t=document.createElement("div");t.className="twk";t.textContent="✦";
  t.style.left=(3+i*10)+"%";t.style.top=(5+((i*23)%40))+"%";t.style.animationDelay=(-i*.4)+"s";sc.appendChild(t);}}
 if(fx==="fireflies"){for(let i=0;i<12;i++){const f=document.createElement("div");f.className="fly";f.textContent="●";
  f.style.left=(3+i*8)+"%";f.style.top=(30+((i*17)%45))+"%";f.style.animationDelay=(-i*.6)+"s";sc.appendChild(f);}}
}
function buildNumberFx(sc){
 const layer=document.createElement("div");
 layer.className="numfx num-scene";
 layer.setAttribute("aria-hidden","true");
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
  layer.appendChild(el);
 });
 const shapes=["triangle","diamond","hex","circle","triangle","diamond","hex"];
 const pos=[[18,32,.8,0],[33,58,.64,.7],[51,31,.74,1.4],[68,45,.7,2.1],[86,34,.82,2.8],[7,68,.58,3.5],[63,67,.62,4.2]];
 pos.forEach((p,i)=>{
  const el=document.createElement("div");
  el.className="num-poly "+shapes[i];
  el.style.cssText="--x:"+p[0]+"%;--y:"+p[1]+"%;--scale:"+p[2]+";--delay:"+p[3]+"s;--dur:"+(9.5+i*.7)+"s;--hue:"+(185+i*24)+";";
  layer.appendChild(el);
 });
 for(let i=0;i<4;i++){
  const el=document.createElement("div");
  el.className="num-ring";
  el.style.cssText="--x:"+(21+i*19)+"%;--y:"+(25+(i%2)*18)+"%;--scale:"+(0.72+i*.12)+";--delay:"+(i*.85)+"s;--dur:"+(12+i*1.8)+"s;--hue:"+(48+i*58)+";";
  layer.appendChild(el);
 }
 sc.appendChild(layer);
}
function seaReducedMotion(){
 try{return !!(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches);}catch(_){return false;}
}
function snapSeaReducedMotion(){
 if(seaReducedMotion())steerY=steerTargetY;
}
function isSeaStage(){return !!(STAGES[stg]&&STAGES[stg].id==="sea");}
function seaControlAvailable(){
 return isSeaStage()&&playing&&!tunnelInteriorMode&&
  !document.body.classList.contains("tunnel-enter-run")&&!document.body.classList.contains("tunnel-exit-run")&&
  !seaBubbleLaunchPending&&(driving||quiz.classList.contains("show"));
}
function seaSteerBounds(){
 const viewportHeight=window.innerHeight||390;
 const height=Math.max(1,veh.offsetHeight||viewportHeight*.24);
 const baseCenter=viewportHeight-viewportHeight*.124-height*.5;
 const scoreHud=document.getElementById("scoreHud");
 const hudBottom=scoreHud?scoreHud.getBoundingClientRect().bottom:viewportHeight*.14;
 const quizTop=quiz.classList.contains("show")?quiz.getBoundingClientRect().top:viewportHeight*.82;
 const minCenter=Math.min(viewportHeight*.45,Math.max(hudBottom+height*.5+8,viewportHeight*.17));
 const maxCenter=Math.max(minCenter+12,Math.min(viewportHeight-height*.5-8,quizTop-height*.5-10));
 return {baseCenter,minY:minCenter-baseCenter,maxY:maxCenter-baseCenter};
}
function applySeaSteerVisual(){
 if(!vehicleSteerShell)return;
 const y=IOS_DEVICE?Math.round(steerY):Number(steerY.toFixed(2));
 const tilt=seaReducedMotion()?0:clamp((steerTargetY-steerY)*-.055,-5,5);
 vehicleSteerShell.style.setProperty("--sea-steer-y",y+"px");
 vehicleSteerShell.style.setProperty("--sea-steer-tilt",tilt.toFixed(2)+"deg");
 carsEl.style.setProperty("--sea-steer-y",y+"px");
}
function setSeaSteerTarget(clientY,immediate){
 if(!isSeaStage())return;
 const bounds=seaSteerBounds();
 steerTargetY=clamp(clientY-bounds.baseCenter,bounds.minY,bounds.maxY);
 if(immediate||seaReducedMotion()){steerY=steerTargetY;applySeaSteerVisual();}
 highlightNearestSeaBubble();
}
function renderSeaSteering(){
 const active=seaControlAvailable();
 document.body.classList.toggle("sea-steer-active",active);
 if(seaSteerHint){
  seaSteerHint.hidden=!active||seaSteerUsed||quiz.classList.contains("show");
 }
 if(!isSeaStage()||!vehicleSteerShell)return;
 if(seaReducedMotion())snapSeaReducedMotion();
 else steerY+=(steerTargetY-steerY)*.2;
 if(Math.abs(steerTargetY-steerY)<.08)steerY=steerTargetY;
 applySeaSteerVisual();
 highlightNearestSeaBubble();
}
function cancelSeaPointer(){
 if(seaSteerPointerId===null||!seaSteerSurface)return;
 try{seaSteerSurface.releasePointerCapture(seaSteerPointerId);}catch(_){}
 seaSteerPointerId=null;
}
function clearSeaBubbleGame(){
 clearTimeout(seaBubbleLaunchTimer);seaBubbleLaunchTimer=0;
 seaBubbleLaunchPending=false;seaBubbleOptions=[];
 document.body.classList.remove("sea-quiz-active","sea-dash-active");
 quiz.classList.remove("sea-quiz");choicesEl.classList.remove("sea-mode");
 if(seaAnswerLayer)seaAnswerLayer.replaceChildren();
 if(isSeaStage()){
  const bounds=seaSteerBounds();
  steerTargetY=clamp(steerTargetY,bounds.minY,bounds.maxY);
  steerY=clamp(steerY,bounds.minY,bounds.maxY);
 }
}
function resetSeaInteraction(){
 cancelSeaPointer();clearSeaBubbleGame();
 steerTargetY=0;steerY=0;seaSteerUsed=false;
 if(vehicleSteerShell){
  vehicleSteerShell.style.setProperty("--sea-steer-y","0px");
  vehicleSteerShell.style.setProperty("--sea-steer-tilt","0deg");
 }
 carsEl.style.setProperty("--sea-steer-y","0px");
 document.body.classList.remove("sea-steer-active");
 if(seaSteerHint)seaSteerHint.hidden=true;
}
function nearestSeaBubble(){
 if(!document.body.classList.contains("sea-quiz-active")||!seaAnswerLayer)return null;
 const buttons=[...seaAnswerLayer.querySelectorAll(".sea-answer-bubble:not(:disabled):not(.dim)")];
 if(!buttons.length)return null;
 const shellRect=vehicleSteerShell.getBoundingClientRect();
 const subCenter=shellRect.top+shellRect.height*.5;
 return buttons.map(button=>({button,distance:Math.abs(button.getBoundingClientRect().top+button.offsetHeight*.5-subCenter)}))
  .sort((a,b)=>a.distance-b.distance)[0]||null;
}
function highlightNearestSeaBubble(){
 if(!seaAnswerLayer)return;
 const nearest=nearestSeaBubble();
 seaAnswerLayer.querySelectorAll(".sea-answer-bubble").forEach(button=>button.classList.toggle("is-near",!!nearest&&nearest.button===button&&nearest.distance<=Math.max(30,button.offsetHeight*.62)));
}
function handleSeaPointerDown(ev){
 if(!seaControlAvailable()||seaSteerPointerId!==null)return;
 ensureAC();seaSteerPointerId=ev.pointerId;seaSteerUsed=true;
 if(seaSteerHint)seaSteerHint.hidden=true;
 try{seaSteerSurface.setPointerCapture(ev.pointerId);}catch(_){}
 setSeaSteerTarget(ev.clientY,seaReducedMotion());
}
function handleSeaPointerMove(ev){
 if(ev.pointerId!==seaSteerPointerId)return;
 setSeaSteerTarget(ev.clientY,false);
}
function handleSeaPointerUp(ev){
 if(ev.pointerId!==seaSteerPointerId)return;
 setSeaSteerTarget(ev.clientY,seaReducedMotion());
 const nearest=nearestSeaBubble();
 cancelSeaPointer();
 if(nearest&&nearest.distance<=Math.max(30,nearest.button.offsetHeight*.62)){
  const option=seaBubbleOptions.find(entry=>entry.button===nearest.button);
  if(option)launchSeaBubbleChoice(nearest.button,option.value);
 }else if(document.body.classList.contains("sea-quiz-active")){
  hintText.textContent="🫧 あわの たかさに あわせて はなそう";
  announce("あわの たかさに あわせて はなそう");
 }
}
function handleSeaPointerCancel(ev){
 if(ev.pointerId===seaSteerPointerId)cancelSeaPointer();
}
function activeChoiceButtons(){
 if(document.body.classList.contains("sea-quiz-active")&&seaAnswerLayer)return [...seaAnswerLayer.querySelectorAll(".sea-answer-bubble")];
 return [...choicesEl.querySelectorAll(".choice")];
}
function renderSeaBubbleGame(){
 let opts=[{e:cur.a[0],t:cur.a[1],ok:true},...cur.d.map(x=>({e:x[0],t:x[1],ok:false}))];
 if(level===0&&opts.length>2)opts=opts.slice(0,2);
 opts=shuffle(opts).slice(0,level===0?2:3);
 document.body.classList.add("sea-quiz-active");quiz.classList.add("sea-quiz");choicesEl.classList.add("sea-mode");
 choicesEl.setAttribute("aria-label","せんすいかんを あわに あわせる");
 seaAnswerLayer.replaceChildren();seaBubbleOptions=[];
 const lanes=opts.length===2?[35,58]:[30,46,62];
 opts.forEach((o,index)=>{
  const button=document.createElement("button");button.type="button";button.className="sea-answer-bubble";
  button.dataset.ok=o.ok?"1":"0";button.setAttribute("aria-label",o.t+"の あわ");
  button.style.setProperty("--bubble-x",(58+(index%2)*3)+"%");button.style.setProperty("--bubble-y",lanes[index]+"%");
  button.style.setProperty("--bubble-delay",(-index*.47)+"s");button.style.setProperty("--bubble-duration",(2.35+index*.28)+"s");
  button.innerHTML='<span class="em">'+o.e+'</span><span class="lb">'+o.t+'</span>';
  bindTap(button,()=>launchSeaBubbleChoice(button,o));
  seaAnswerLayer.appendChild(button);seaBubbleOptions.push({button,value:o});
 });
 hintText.textContent="🫧 タッチで うごかして あわに あわせよう";
 setSeaSteerTarget((window.innerHeight||390)*lanes[0]/100,seaReducedMotion());
 highlightNearestSeaBubble();
}
function launchSeaBubbleChoice(button,o){
 if(seaBubbleLaunchPending||answerLocked||driving||!button||button.disabled||button.classList.contains("dim")||!quiz.classList.contains("show"))return;
 seaBubbleLaunchPending=true;
 activeChoiceButtons().forEach(choice=>{choice.disabled=true;});
 tone(520,0,.08,"sine",.08);tone(720,.08,.12,"sine",.07);
 const finish=()=>{
  document.body.classList.remove("sea-dash-active");
  activeChoiceButtons().forEach(choice=>{if(!choice.classList.contains("dim"))choice.disabled=false;});
  seaBubbleLaunchPending=false;
  onPick(button,o);
  if(o.ok)setTimeout(clearSeaBubbleGame,120);
 };
 if(seaReducedMotion())finish();
 else{document.body.classList.add("sea-dash-active");seaBubbleLaunchTimer=setTimeout(()=>{seaBubbleLaunchTimer=0;finish();},300);}
}
if(seaSteerSurface){
 seaSteerSurface.addEventListener("pointerdown",handleSeaPointerDown);
 seaSteerSurface.addEventListener("pointermove",handleSeaPointerMove);
 seaSteerSurface.addEventListener("pointerup",handleSeaPointerUp);
 seaSteerSurface.addEventListener("pointercancel",handleSeaPointerCancel);
}

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
 if(c&&c.pending){
  seat.classList.add("pending-seat");
  return seat;
 }
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
 const realCount=cars.filter(c=>!c.pending).length;
 carBadge.style.display=realCount?"flex":"none";
 carBadge.textContent="👥 ×"+realCount;
}
function passengerSeatTargetAt(index){
 if(STAGES[stg]&&STAGES[stg].veh==="train"){
  const seatCenters=[.755,.585,.415,.245];
  const carLeft=vehicleLeftVw()-carGap();
  const x=carLeft+trainCarWidthVw()*seatCenters[index%4];
  const y=trainBottomVh()+trainCarHeightVh()*.37;
  return {left:x+"vw",bottom:y+"vh"};
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
 const seatIndex=cars.length;
 const pendingSeat={pending:true,e:"",t:""};
 cars.push(pendingSeat);
 renderCars();
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
  addScore(SCORE_POINTS.rare,"rare");
  const isNew=registerZk(e,t);
  sndNew();confetti(8);
  showStamp((isNew?"めずらしい ともだち！":"また あえたね！")+" +"+SCORE_POINTS.rare+"てん","new");
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
 if(helpBadge){helpBadge.style.display=n?"flex":"none";helpBadge.textContent=(n?helpItems[n-1].e:"🍀")+" ×"+n;}
 if(helpBtn){helpBtn.textContent="🍀 ×"+n;helpBtn.classList.toggle("empty",!n);helpBtn.disabled=false;}
}
function emptyStageScoreBreakdown(){return {quiz:0,clear:0,help:0,rare:0,tunnel:0};}
function formatScore(value){return Math.max(0,Math.round(Number(value)||0)).toLocaleString("ja-JP");}
function resetStageScore(){
 stageScore=0;stageScoreBreakdown=emptyStageScoreBreakdown();stageClearScoreGranted=false;
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
 const shift=tunnelFriendStaticMode()?0:(worldX-tunnelFriendStartWorldX)*TUNNEL_WALL_PARALLAX;
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
  }else{
   const icon=document.createElement("span");icon.className="tunnel-friend-emoji";icon.textContent=friend.e;visual.appendChild(icon);
  }
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
  message="ぜんぶ みつけた！\n"+(helpResult.stored?"🍀 おたすけ ゲット！":"おたすけ いっぱい +"+helpResult.points+"てん！");
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
function clearMagicPuffs(){
 const box=veh.querySelector(".puff");
 if(box)box.replaceChildren();
 if(smokeLayer)smokeLayer.replaceChildren();
 nextMagicPuffAt=0;
}
function tickMagicPuffs(now){
 if(!playing||!veh.classList.contains("go")||!document.body.classList.contains("v-train"))return;
 if(document.body.classList.contains("tunnel-enter-run")||document.body.classList.contains("tunnel-exit-run"))return;
 if(now<nextMagicPuffAt)return;
 const useSceneSmoke=IOS_DEVICE&&smokeLayer;
 const box=useSceneSmoke?smokeLayer:veh.querySelector(".puff");
 if(!box)return;
 nextMagicPuffAt=now+(useSceneSmoke?20:16)+Math.random()*(useSceneSmoke?30:24);
 if(box.children.length>128)return;
 const p=document.createElement("span");
 p.className="magic-puff";
 const idx=rnd(0,7),col=idx%4,row=Math.floor(idx/4);
 const size=(useSceneSmoke?34:18)+Math.random()*(useSceneSmoke?78:62);
 const baseLife=2600+Math.random()*1800;
 const life=baseLife*(1.5+Math.random()*0.5);
 if(useSceneSmoke){
  const sceneRect=$("scene").getBoundingClientRect();
  const vehRect=veh.getBoundingClientRect();
  p.style.left=Math.round(vehRect.left-sceneRect.left+vehRect.width*.76)+"px";
  p.style.top=Math.round(vehRect.top-sceneRect.top-vehRect.height*.17)+"px";
 }
 p.style.width=size+"px";p.style.height=size+"px";
 p.style.setProperty("--puff-size",size+"px");
 p.style.setProperty("--puff-life",life+"ms");
 p.style.setProperty("--puff-dx",(-(useSceneSmoke?180:140)-Math.random()*(useSceneSmoke?300:260))+"px");
 p.style.setProperty("--puff-dy",(-18-Math.random()*(useSceneSmoke?82:64))+"px");
 p.style.setProperty("--puff-rot",(-18+Math.random()*36)+"deg");
 p.style.setProperty("--puff-start-scale",(0.42+Math.random()*0.34).toFixed(2));
 p.style.setProperty("--puff-end-scale",(1.2+Math.random()*1.55).toFixed(2));
 const alpha=(useSceneSmoke?0.78:0.6)+Math.random()*(useSceneSmoke?0.18:0.26);
 p.style.setProperty("--puff-alpha",alpha.toFixed(2));
 p.style.setProperty("--puff-mid-alpha",(alpha*.82).toFixed(2));
 p.style.backgroundPosition=(col*33.3333)+"% "+(row*100)+"%";
 box.appendChild(p);
 setTimeout(()=>p.remove(),life+80);
}
function onRunEvent(el,ev){
 if(!driving||!el||el.classList.contains("found"))return;
 el.classList.add("found");el.disabled=true;
 const helpResult=collectHelpItem({e:ev[0],t:ev[1]});
 const r=el.getBoundingClientRect();
 for(let i=0;i<4;i++){
  const s=document.createElement("div");s.className="spark";s.textContent=i%2?"⭐":"✨";
  s.style.left=(r.left+r.width*.35+i*r.width*.1)+"px";
  s.style.top=(r.top+r.height*.1)+"px";
  $("app").appendChild(s);setTimeout(()=>s.remove(),900);
 }
 tone(1047,0,.12,"triangle",.11);tone(1319,.1,.16,"triangle",.09);
 showStamp(helpResult.stored?(helpItems.length>=HELP_MAX?"おたすけ いっぱい！":"おたすけ ゲット！"):"おたすけ いっぱい！ +"+helpResult.points+"てん","new");
 speak(ev[1]+"を みつけた！");
}
function useHelp(){
 if(answerLocked||driving||seaBubbleLaunchPending||!quiz.classList.contains("show"))return;
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
  hintText.textContent="🍀 めざすのは "+numberCargoAnswer()+"こ だよ";
  helpMessage=item.t+"が めざす かずを おしえてくれたよ";
 }else{
  const choices=activeChoiceButtons();
  const wrong=choices.find(c=>c.dataset.ok!=="1"&&!c.classList.contains("dim"));
  if(wrong){wrong.classList.add("dim");wrong.disabled=true;}
  const ok=choices.find(c=>c.dataset.ok==="1");
  if(ok)ok.classList.add("glow");
 }
 tone(880,0,.12,"triangle",.12);tone(1175,.1,.16,"triangle",.1);
 showStamp("おたすけ！","new");
 announce(helpMessage);
}

function setTunnelInteriorBackdrop(){
 const panWorld=tunnelFriendStaticMode()&&tunnelFriendStartWorldX?tunnelFriendStartWorldX:worldX;
 const tunnelPan=cssXFromVw(-panWorld*TUNNEL_WALL_PARALLAX);
 skyA.style.background='#17110b url("../assets/images/nazonazo-tunnel/tunnel_interior_side_flat_20260705.webp") '+tunnelPan+' center / auto 100% repeat-x';
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
 renderSeaSteering();
 renderJungleAnimals();
 renderJungleFlights(now);
 if(jungleHabitatBack&&document.body.classList.contains("st-jungle"))jungleHabitatBack.style.backgroundPositionX=cssXFromVw(-(worldX-o)*.92);
 updateScreenExitShift();
 if(document.body.classList.contains("st-town")&&townHorizonLoop){
  horizon.style.transform="translate3d(0,0,0)";
  const horizonTileWidth=(window.innerHeight||390)*1.34*(1983/793);
  const horizonPeriod=horizonTileWidth*2;
  const horizonRawOffset=(((worldX-o)*TOWN_HORIZON_PARALLAX*(window.innerWidth||844)/100)%horizonPeriod+horizonPeriod)%horizonPeriod;
  const horizonLoopOffset=IOS_DEVICE?Math.round(horizonRawOffset):Number(horizonRawOffset.toFixed(2));
  townHorizonLoop.style.transform="translate3d("+(-horizonLoopOffset)+"px,0,0)";
 }else{
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
 }else{
  midT.style.backgroundPositionX=cssXFromVw(-worldX*0.25);
 }
 groundT.style.backgroundPositionX=cssXFromVw(-worldX);
 fgT.style.backgroundPositionX=cssXFromVw(-worldX*1.35);
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
 period=IOS_DEVICE?Math.round(period*4)/4:Math.round(period*100)/100;
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
 let dt=Math.min(0.05,(t-lastT)/1000)*FAST;
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
 resetNumberCargoGame();
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
 quiz.classList.remove("number-quiz");
 choicesEl.classList.remove("number-mode");
 choicesEl.setAttribute("aria-label","こたえを えらぶ");
}
function renderChoiceCards(){
 let opts=[{e:cur.a[0],t:cur.a[1],ok:true},...cur.d.map(x=>({e:x[0],t:x[1],ok:false}))];
 if(level===0&&opts.length>2)opts=opts.slice(0,2);
 opts=shuffle(opts);
 opts.forEach(o=>{const b=document.createElement("button");b.type="button";b.className="choice";
  b.setAttribute("aria-label",o.t);
  b.dataset.ok=o.ok?"1":"0";
  b.innerHTML='<span class="em">'+o.e+'</span><span class="lb">'+o.t+'</span>';
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
  const art=document.createElement("span");art.className="number-cargo-art";art.textContent=theme.e;art.setAttribute("aria-hidden","true");button.appendChild(art);
  bindTap(button,()=>collectNumberCargo(i,button));field.appendChild(button);
 }
 const wagon=document.createElement("div");wagon.className="number-cargo-wagon";
 const count=document.createElement("div");count.className="number-cargo-count";count.innerHTML='<span>のせた</span><strong data-cargo-count>0</strong><span>こ</span>';
 const goal=document.createElement("div");goal.className="number-cargo-goal";goal.dataset.cargoGoal="";goal.hidden=true;goal.textContent="めざす "+numberCargoAnswer()+"こ";
 const load=document.createElement("div");load.className="number-cargo-load";load.setAttribute("aria-hidden","true");
 for(let i=0;i<limit;i++){
  const slot=document.createElement("span");slot.className="number-cargo-slot";slot.dataset.cargoSlot=String(i);
  const loadArt=document.createElement("span");loadArt.textContent=theme.e;slot.appendChild(loadArt);load.appendChild(slot);
 }
 const wagonBody=document.createElement("div");wagonBody.className="number-cargo-wagon-body";wagonBody.appendChild(load);
 const wheels=document.createElement("div");wheels.className="number-cargo-wheels";wheels.setAttribute("aria-hidden","true");wheels.innerHTML="<i></i><i></i>";
 const actions=document.createElement("div");actions.className="number-cargo-actions";
 actions.append(
  numberCargoControl("undo","1こ もどす","さいごの 1こを もどす",()=>undoNumberCargo()),
  numberCargoControl("confirm","しゅっぱつ！","この かずで こたえる",eventButton=>submitNumberCargo(eventButton))
 );
 wagon.append(count,goal,wagonBody,wheels,actions);root.append(field,wagon);choicesEl.appendChild(root);updateNumberCargoGame();
 hintText.textContent="🎒 こたえの かずだけ のせてね";
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
 const fly=document.createElement("span");fly.className="number-cargo-fly";fly.textContent=resolveNumberCargoTheme().e;fly.dataset.cargoIndex=String(index);fly.setAttribute("aria-hidden","true");
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
 hintText.textContent="💡 "+message;updateNumberCargoGame();announce(message);
}
function showQuiz(){
 hideWeatherNotice();
 setDriverMood("thinking");
 cancelSeaPointer();clearSeaBubbleGame();
 resetNumberCargoGame();
 cur=qList[qSeg];missInQ=0;answerLocked=false;
 qText.textContent=cur.helper?(cur.helper.name+"を たすけよう！ "+cur.q):cur.q;
 hintText.textContent=helpItems.length?"🍀 おたすけを つかえるよ":"";
 choicesEl.replaceChildren();
 quiz.classList.add("show");
 if(isNumberCargoQuestion())renderNumberCargoGame();else if(isSeaStage())renderSeaBubbleGame();else renderChoiceCards();
 speak(cur.s||cur.q);
}
function onPick(el,o){
 if(answerLocked||driving||!quiz.classList.contains("show"))return;
 answerLocked=true;
 if(o.ok){
  setDriverMood("cheer");
  const gained=addScore(SCORE_POINTS.correct+(missInQ===0?SCORE_POINTS.firstTry:0),"quiz");
  sndOK();showStamp("せいかい！ +"+gained+"てん","ok");
  quiz.classList.remove("show");
  const pe=cur.pe||[cur.a[0],cur.a[1]];
  const t=tunnels[qSeg];
  const passenger=cur.helper||{e:pe[0],t:pe[1],name:pe[1]};
  const isNew=boardPassenger(passenger,pe,t);
  speak(isNew?"せいかい！あたらしい ともだちだ！":"せいかい！"+passengerLabel(passenger)+"が のったよ！");
  setTimeout(()=>{sndOpen();if(t)t.classList.add("open");const sg=t&&t.querySelector(".sign");if(sg)sg.textContent="⭕";},420);
  setTimeout(()=>{if(playing)proceed();},1050);
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
   if(el.classList.contains("sea-answer-bubble"))el.disabled=true;
  }
  const t=tunnels[qSeg];
  if(t){t.classList.add("shake");setTimeout(()=>t.classList.remove("shake"),520);}
  showStamp("おしい！","ng");
  if(o.mode!=="number"&&missInQ===1)showHint();
  if(o.mode!=="number"&&missInQ>=2){activeChoiceButtons().forEach(c=>{
   if(!c.classList.contains("dim"))c.classList.add("glow");});}
  setTimeout(()=>{answerLocked=false;setDriverMood("thinking");if(o.mode==="number")updateNumberCargoGame();},520);
 }
}
function proceed(){
 if(!playing)return;
 setDriverMood("cheer");
 qSeg++;drawDots();
 const o=origin(stg);
 if(!rareSpawned)scheduleRareSpawn();
 if(qSeg<QN){
  sndGo();
  target=stops(o,qSeg);pending="quiz";driving=true;
 }else{
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
 hideWeatherNotice();
 resetSeaInteraction();
 clearRareEvent();
 stopStageWeather();setWeatherPresentation("clear");
 clearTunnelFriendGame();
 setDriverMood("cheer");
 playing=false;
 confetti(40);sndFan();
 const grand=loop>=1;
 unlockedLoop=Math.max(unlockedLoop,1);
 saveGame();
 $("resTitle").textContent=grand?"🌈 ぎんがの はてまで せいは！":"🌍 うちゅうまで とうちゃく！";
 $("resStars").textContent="🏆 "+formatScore(journeyScore)+"てん　⭐×"+totalStars;
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
 clearRareEvent();
 resetSeaInteraction();
 stopStageWeather();setWeatherPresentation("clear");
 clearTunnelFriendGame();
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
bindTap($("homeBtn"),()=>{
 if(quiz.classList.contains("show")){showStamp("いまは トンネルを あけよう","ng");return;}
 openMap();
});
bindTap($("spkBtn"),()=>{showHint();});
bindTap($("helpBtn"),()=>{useHelp();});

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
 if(document.hidden){hideWeatherNotice();safeSuspend();}
 else{ensureAC();}
});
window.addEventListener("resize",scheduleRainParticleRebuild,{passive:true});
window.addEventListener("resize",syncNumberCargoColumns,{passive:true});
window.addEventListener("pageshow",()=>{ensureAC();updateRainParticleVisibility(false);});
window.addEventListener("focus",()=>{ensureAC();});
window.addEventListener("pagehide",()=>{hideWeatherNotice();clearTimeout(rainParticleResizeTimer);safeSuspend();});

requestAnimationFrame(gloop);
})();
