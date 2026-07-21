/* RUMOAR consolidated deck - "The Engine" brand system.
   Emits deck.html: 49 slides at 1280x720, real brand fonts, em-dash-free. */
const fs = require("fs");

const C = {
  porcelain:"#ECEBE7", chalk:"#F6F5F2", ink:"#17171B", carbon:"#202028",
  graphite:"#5C5C64", mist:"#9A9AA4", hair:"#DEDDD8", hairdk:"#33333C",
  dusk:"#4B4673", peri:"#B3ACEF", volt:"#6152F0",
  ok:"#3E7D5A", att:"#B0842E", crit:"#C0453C"
};

const slides = [];

// ---------- slide wrapper ----------
let PGN=0;
function S(inner, o={}){
  PGN++;
  const cls = "slide" + (o.dark?" dark":"") + (o.chalk?" chalk":"");
  const left = o.code || "RUMOAR";
  const right = o.track || "ROUND TWO · SS27";
  const meta = "";
  const foot = o.nofoot ? "" :
    `<div class="pg">${String(PGN).padStart(2,"0")}</div>`;
  slides.push(`<section class="${cls}">${meta}<div class="body">${inner}</div>${foot}</section>`);
}
const kick = t => `<div class="kick">${t}</div>`;
const H = (t,c="") => `<h2 class="title ${c}">${t}</h2>`;
const sub = t => `<div class="sub">${t}</div>`;

function tiles(arr){
  return `<div class="tiles t${arr.length}">`+arr.map(t=>
    `<div class="tile"><div class="tnum">${t.n}</div><div class="tlab">${t.label}</div><div class="tdesc">${t.desc}</div></div>`
  ).join("")+`</div>`;
}
function cols(arr){
  return `<div class="cols c${arr.length}">`+arr.map(c=>
    `<div class="col${c.dark?" d":""}${c.volt?" v":""}">${c.k?`<div class="ck">${c.k}</div>`:""}${c.title?`<div class="ct">${c.title}</div>`:""}<div class="cb">${c.body}</div></div>`
  ).join("")+`</div>`;
}
function table(headers, rows, colw){
  const th = headers.map((h,i)=>`<th style="width:${colw[i]}%">${h}</th>`).join("");
  const tb = rows.map(r=>`<tr>${r.map((c,i)=>`<td${typeof c==="object"&&c.b?' class="b"':""}>${typeof c==="object"?c.t:c}</td>`).join("")}</tr>`).join("");
  return `<table class="tbl"><thead><tr>${th}</tr></thead><tbody>${tb}</tbody></table>`;
}
function take(t){ return `<div class="take">${t}</div>`; }
const ul = arr => `<ul class="bl">`+arr.map(x=>`<li>${x}</li>`).join("")+`</ul>`;
const tagv = t => `<span class="tagv">${t}</span>`;
const tagd = t => `<span class="tagd">${t}</span>`;

// ---------- SVG charts ----------
function vbars(labels, values, o={}){
  const W=o.W||620,Hh=o.H||330,pad=o.pad||38, bot=54;
  const max=o.max||Math.max(...values.filter(v=>v!=null));
  const n=labels.length, gap=(W-2*pad)/n, bw=Math.min(o.bw||70, gap*0.5);
  const col=o.color||C.dusk;
  let g=`<line x1="${pad}" y1="${Hh-bot}" x2="${W-pad/2}" y2="${Hh-bot}" stroke="${C.hair}" stroke-width="1"/>`;
  values.forEach((v,i)=>{ if(v==null) return;
    const x=pad+gap*i+gap/2, bh=(v/max)*(Hh-pad-bot), y=Hh-bot-bh;
    g+=`<rect x="${x-bw/2}" y="${y}" width="${bw}" height="${bh}" fill="${col}" rx="2"/>`;
    g+=`<text x="${x}" y="${y-9}" text-anchor="middle" class="dv">${o.fmt?o.fmt(v):v}</text>`;
    g+=`<text x="${x}" y="${Hh-bot+18}" text-anchor="middle" class="cx">${labels[i]}</text>`;
    if(o.cx2&&o.cx2[i]) g+=`<text x="${x}" y="${Hh-bot+34}" text-anchor="middle" class="cx2">${o.cx2[i]}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${Hh}" class="chart">${g}</svg>`;
}
function hbars(labels, values, o={}){
  const W=o.W||620,rowH=o.rowH||58, pad=o.padL||250, top=6;
  const max=o.max||Math.max(...values), Hh=labels.length*rowH+top+10;
  const col=o.color||C.dusk;
  let g="";
  values.forEach((v,i)=>{ const y=top+i*rowH, bw=(v/max)*(W-pad-70);
    g+=`<text x="${pad-12}" y="${y+rowH/2+4}" text-anchor="end" class="cy">${labels[i]}</text>`;
    g+=`<rect x="${pad}" y="${y+rowH/2-13}" width="${bw}" height="26" fill="${col}" rx="2"/>`;
    g+=`<text x="${pad+bw+8}" y="${y+rowH/2+4}" class="dv2">${o.fmt?o.fmt(v):v}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${Hh}" class="chart">${g}</svg>`;
}
function combo(labels, bars, line, o={}){
  const W=o.W||660,Hh=o.H||360,pad=44,bot=58,top=20;
  const all=bars.concat(line), max=Math.max(...all), min=Math.min(0,...all);
  const span=max-min, n=labels.length, gap=(W-2*pad)/n, bw=44;
  const y0=Hh-bot, plot=Hh-bot-top;
  const yOf=v=>y0-((v-min)/span)*plot;
  let g=`<line x1="${pad}" y1="${yOf(0)}" x2="${W-pad/2}" y2="${yOf(0)}" stroke="${C.hairdk}" stroke-width="1"/>`;
  bars.forEach((v,i)=>{ const x=pad+gap*i+gap/2, y=Math.min(yOf(v),yOf(0)), h=Math.abs(yOf(v)-yOf(0));
    g+=`<rect x="${x-bw/2}" y="${y}" width="${bw}" height="${h}" fill="${C.dusk}" rx="2"/>`;
    g+=`<text x="${x}" y="${v>=0?yOf(v)-8:yOf(v)+16}" text-anchor="middle" class="dvd">${v.toFixed(1)}</text>`;
    g+=`<text x="${x}" y="${Hh-bot+20}" text-anchor="middle" class="cxd">${labels[i]}</text>`;
  });
  let pts=line.map((v,i)=>`${pad+gap*i+gap/2},${yOf(v)}`).join(" ");
  g+=`<polyline points="${pts}" fill="none" stroke="${C.ink}" stroke-width="2.5"/>`;
  line.forEach((v,i)=>{ const x=pad+gap*i+gap/2; g+=`<circle cx="${x}" cy="${yOf(v)}" r="4.5" fill="${C.ink}"/>`;});
  return `<svg viewBox="0 0 ${W} ${Hh}" class="chart">${g}</svg>`;
}
function gbars(labels, s1, s2, o={}){
  const W=o.W||640,Hh=o.H||360,pad=44,bot=54,top=20;
  const max=Math.max(...s1,...s2.filter(v=>v!=null)), n=labels.length, gap=(W-2*pad)/n, bw=30;
  const y0=Hh-bot;
  let g=`<line x1="${pad}" y1="${y0}" x2="${W-pad/2}" y2="${y0}" stroke="${C.hair}" stroke-width="1"/>`;
  labels.forEach((L,i)=>{ const cx=pad+gap*i+gap/2;
    const h1=(s1[i]/max)*(Hh-top-bot); g+=`<rect x="${cx-bw-3}" y="${y0-h1}" width="${bw}" height="${h1}" fill="${C.dusk}" rx="2"/>`;
    g+=`<text x="${cx-bw/2-3}" y="${y0-h1-8}" text-anchor="middle" class="dv">${s1[i]}</text>`;
    if(s2[i]!=null){ const h2=(s2[i]/max)*(Hh-top-bot); g+=`<rect x="${cx+3}" y="${y0-h2}" width="${bw}" height="${h2}" fill="${C.graphite}" rx="2"/>`;
      g+=`<text x="${cx+bw/2+3}" y="${y0-h2-8}" text-anchor="middle" class="dv">${s2[i]}</text>`; }
    g+=`<text x="${cx}" y="${y0+20}" text-anchor="middle" class="cx">${L}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${Hh}" class="chart">${g}</svg>`;
}

/* =================== MASTER COVER =================== */
S(`<div class="cov">
    <div class="cov-mark">RUMOAR</div>
    <div class="cov-tag"><em>Vibe-code</em> your look.</div>
    <div class="cov-line">The styling engine for the fashion-first Indian man.</div>
    <div class="codestrip"><span>MEN'S FASHION ACCESSORIES · INDIA</span><span>PRI · <b class="v">SS27</b></span></div>
   </div>`, {nofoot:true});

/* 02 THE OPPORTUNITY */
S(
  kick("The opportunity")+
  H("Most men have the taste.<br>They don't have the translation.")+
  sub("The category sells products and leaves the outfit to him. No one sells the translation, turning a man's vibe into a finished look.")+
  cols([
    {k:"THE MAN", title:"The vibe-coder", body:"23 to 28, metro, early-career. He recognises great style but can't yet generate it. Fluent in marketing, allergic to being sold to."},
    {k:"THE JOB", title:"Feeling to look", body:"He can pick the pieces. He can't compose the look for his build, his colouring, his occasion. That job is unowned."},
    {k:"THE WEDGE", title:"A stylist, not a store", body:"RUMOAR turns his vibe into his look, starting from what he already owns. He belongs to it; he isn't sold at.", dark:true}
  ]),
  {});

/* 03 THE CATEGORY */
S(
  kick("The category")+
  H("The winners and the graveyard run the same margins.")+
  `<div class="split6-6">
    <div>
      <div class="chart-t">Marketing spend, % of revenue</div>
      ${vbars(["DailyObjects","Mokobara","Uppercase","Zouk"],[17,20,25,45],{fmt:v=>v+"%",max:50,W:600,H:300})}
      <div class="chart-n">All on roughly 50% gross margins. One line item separates a business from a bonfire.</div>
    </div>
    <div>${ul([
      "Baggit went insolvent. VIP lost ₹338 crore. Neither died of weak demand.",
      "The category's killers are working capital and acquisition cost, not the customer.",
      "So RUMOAR is engineered capital-light and community-led. Discipline is the product, not a virtue."
    ])}</div>
  </div>`,
  {});

/* 04 THE PRODUCT */
S(
  kick("The product")+
  H("A look isn't bought. It's composed.")+
  sub("The engine reads his build, colouring and vibe, and returns a look in three tiers. The catalogue is downstream of the engine, we make only the pieces it recommends.")+
  cols([
    {k:"01 / YOUR CLOSET", title:"Buy nothing.", body:"A complete look from what he already owns. Proof before purchase, the trust engine."},
    {k:"02 / THE ELEVATE", title:"One keystone.", body:"“You're ninety percent there, this sling is the ten.” One confident add, never a cart."},
    {k:"03 / THE CEILING", title:"The peak look.", body:"Including pieces we don't sell. Every gap we can't fill becomes a ranked, pre-validated product request.", dark:true}
  ]),
  {});

/* 05 THE MARKET */
S(
  kick("The market")+
  H("A winnable slice of a fragmented category.")+
  tiles([
    {n:"~12M", label:"income-qualified metro men, 18 to 35", desc:"the addressable base"},
    {n:"₹1,400 Cr", label:"serviceable market", desc:"conservative, built bottom-up from people"},
    {n:"~11%", label:"of that market is the Year-5 plan", desc:"₹160 Cr, winnable in a fragmented field, not trivial"}
  ])+
  take("Fashion-accessory use among young Indian men is rising faster than the skill to style it, and fresh capital is validating the category right now. The behaviour is arriving; the styling house isn't there yet."),
  {});

/* 06 THE GAP */
S(
  kick("The gap")+
  H("No one owns men's-first, community-led, styling-led.")+
  table(["Who's there","What they are","The blind spot"],[
    [{t:"Mokobara",b:1},"Premium travel gear","Twelve colourways, no styling"],
    [{t:"Uppercase",b:1},"Eco-luggage","A category, not a man's look"],
    [{t:"Snitch",b:1},"Fast fashion at scale","Volume, not curation"],
    [{t:"Urban Monkey",b:1},"Loud streetwear","The man who wants quiet has no one"]
  ],[22,40,38])+
  take("Each is a good business. None is a men's-first styling house. The position is unoccupied, and the window is closing from above faster than from below, so speed matters more than the market size."),
  {});

/* 07 THE MOAT */
S(
  kick("The moat")+
  H("Two layers that compound.")+
  cols([
    {k:"LAYER 1", title:"Community-led distribution", body:"Growth is a rumour, not a media buy. It holds acquisition cost structurally below the peers who bleed at forty-percent-plus ad ratios. We prove it, then scale it."},
    {k:"LAYER 2", title:"Styling-engine data", body:"Every session captures what a specific man looks like, owns, wants and can't find. A marketplace can clone an AI stylist; it cannot clone the personal grain or the accumulated data.", dark:true}
  ])+
  take("Layer one keeps us alive and cheap to grow. Layer two makes us impossible to copy and tells us exactly what to make next. Each makes the other stronger."),
  {});

/* 08 THE ECONOMICS */
S(
  kick("The economics")+
  H("Fifty-one percent margins, and the second order is where we win.")+
  `<div class="split7-5">
    <div>${table(["Per order, blended","₹"],[
      ["Average order value","2,815"],
      ["Gross margin ~51%","1,435"],
      ["less fulfilment, gateway, returns","1,070"],
      [{t:"Contribution after acquisition",b:1},{t:"~170",b:1}]
    ],[72,28])}</div>
    <div class="sidebox v">
      <div class="bignum" style="color:#fff;font-size:44px">Repeat</div>
      <div class="bigcap" style="color:var(--peri)">is the model.</div>
      <div class="bigdesc" style="color:var(--mist)">A first order barely clears. Lifetime value comes from the cap → sling → fragrance ladder and community acquisition, not a single sale. We say so, out loud.</div>
    </div>
  </div>`,
  {});

/* 09 GO TO MARKET */
S(
  kick("Go to market")+
  H("Prove the moat for ₹2.3 lakh<br>before spending ₹25 crore.")+
  sub("Ninety days, zero media budget. A falsifiable test of whether community-led acquisition actually converts, at product-cost stakes.")+
  `<div class="gates">
    <div class="gate"><div class="gv">&lt; ₹350</div><div class="gtag v">SCALE</div><div class="gd">Community becomes the growth engine. Spend follows only what measurably converts.</div></div>
    <div class="gate"><div class="gv">₹350 to 900</div><div class="gtag d">HYBRID</div><div class="gd">Community plus disciplined paid, at a comp-grade ad ratio.</div></div>
    <div class="gate dark"><div class="gv" style="color:var(--peri)">&gt; ₹900</div><div class="gtag crit">RETHINK</div><div class="gd" style="color:var(--mist)">The moat thesis fails, and we learn it cheap, before scale capital is ever at risk.</div></div>
  </div>`,
  {});

/* 10 WHAT SHIPS */
S(
  kick("What ships")+
  H("Nine styles, three shelf gaps, one season.")+
  sub("Priced into gaps observed live on the shelf. Full-grain leather and canvas, made in India, released as drops, never held as a warehouse.")+
  cols([
    {k:"₹2.5 to 4K", title:"The real-leather sling void", body:"No brand sells a real-leather men's sling in the band. Ours is full-grain, at ₹3,000."},
    {k:"THE WALLET", title:"The vacated slot", body:"Not one full-grain wallet on the shelf. Ours names its tannage and its cluster, at ₹2,200.", dark:true},
    {k:"THE CAP", title:"The cap nobody makes", body:"Streetwear owns loud; no one owns quiet. Ours is minimal, structured, ₹1,100. A positioning gap, not a price war."}
  ]),
  {});

/* 11 THE PLAN */
S(
  kick("The plan")+
  H("Breakeven in Year 5, three to seven times leaner than the funded peers.")+
  `<div class="split6-6">
    <div>
      <div class="chart-t">EBITDA path, ₹ Cr &nbsp;·&nbsp; revenue 6 → 20 → 48 → 92 → 160</div>
      ${combo(["Y1","Y2","Y3","Y4","Y5"],[-3.2,-5.7,-6.2,-2.3,6.0],[-3.2,-8.9,-15.2,-17.5,-11.5])}
      <div class="chart-n">Marketing glides from forty-two to eighteen percent of revenue as community compounds.</div>
    </div>
    <div>${ul([
      "₹25 to 35 crore to reach breakeven, against peers who raised ₹120 to 190 crore.",
      "The discipline is the edge: the same margins as the graveyard, spent on trust instead of ads.",
      "The one aggressive assumption, the ramp, is exactly what the ninety-day test de-risks first."
    ])}</div>
  </div>`,
  {});

/* 12 THE ASK */
S(
  kick("The ask")+
  H("₹25 to 35 crore to build the category's owner.")+
  cols([
    {k:"WHAT IT BUYS", title:"Runway to breakeven", body:"Capital-light by design. A cumulative trough near ₹18 crore plus working capital, not a decade of losses."},
    {k:"THE RETURN", title:"Category ownership", body:"FMCG strategics buy category owners near profitability at about two times revenue. Beardo returned an estimated five to six times to early backers."},
    {k:"THE PROOF", title:"De-risked in 90 days", body:"The moat is tested for a fraction of the raise before the rest is deployed. The downside is named, and it's cheap.", dark:true}
  ]),
  {});

/* 13 THE RISKS */
S(
  kick("The risks")+
  H("Three things have to be true.")+
  cols([
    {k:"01", title:"Community converts", body:"Marginal acquisition cost lands below the gate. This is the moat thesis, and the ninety-day test proves or kills it for ₹2.3 lakh."},
    {k:"02", title:"The ramp holds", body:"Community-led growth reaches ₹160 crore by Year 5, or we raise more and grow slower. Stated, not hidden."},
    {k:"03", title:"Margins hold", body:"The fifty-one percent blend survives discount pressure. Drops and honest batch sizes protect full price."}
  ])+
  take("The weak points are named by us, not found by you. Each is a measurable gate, and the cheapest one is tested first."),
  {});

/* 14 CLOSE */
S(`<div class="cov">
    <div class="cov-mark" style="font-size:104px;line-height:.92">The stylist<br>men belong to.</div>
    <div class="cov-sub" style="margin-top:22px">A men's-fashion-first styling engine, built capital-light because the category's real killers are the balance sheet and acquisition cost, not demand. Proven in ninety days, before the capital is at risk.</div>
    <div class="codestrip"><span>RUMOAR · <b class="v">VIBE-CODE YOUR LOOK</b></span><span>PRI · SS27</span></div>
   </div>`, {dark:true, nofoot:true});

function DOC(sl){ return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RUMOAR · Vibe-code your look</title>
<link rel="preconnect" href="https://api.fontshare.com" crossorigin>
<link href="https://api.fontshare.com/v2/css?f[]=clash-display@400,500,600,700&f[]=general-sans@400,500,600,700&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet">
<style>${CSS}</style></head><body>
<div class="progress" id="prog"></div>
<div class="stage" id="stage"><div class="scaler" id="scaler">${sl.map(function(s,idx){return idx===0?s.replace('class="slide','class="slide active'):s;}).join("\n")}</div></div>
<div class="hud">
<button id="prev" title="Previous"><span class="material-symbols-rounded">chevron_left</span></button>
<span class="ct"><b id="cur">01</b> / ${String(sl.length).padStart(2,"0")}</span>
<button id="next" title="Next"><span class="material-symbols-rounded">chevron_right</span></button>
<button id="fs" title="Fullscreen"><span class="material-symbols-rounded" id="fsicon">fullscreen</span></button>
</div>
<script>${SCRIPT}</script>
</body></html>`; }

const CSS = `
:root{--porcelain:${C.porcelain};--chalk:${C.chalk};--ink:${C.ink};--carbon:${C.carbon};--graphite:${C.graphite};--mist:${C.mist};--hair:${C.hair};--hairdk:${C.hairdk};--dusk:${C.dusk};--peri:${C.peri};--volt:${C.volt};--ok:${C.ok};--att:${C.att};--crit:${C.crit};
--display:'Clash Display','Space Grotesk',system-ui,sans-serif;--sans:'General Sans',system-ui,sans-serif;--mono:'Space Mono',ui-monospace,monospace;}
*{box-sizing:border-box;margin:0;padding:0}
html,body{margin:0;height:100%;background:#0d0d10;font-family:var(--sans);overflow:hidden}
.stage{position:fixed;inset:0;display:flex;align-items:center;justify-content:center}
.scaler{width:1280px;height:720px;position:relative;flex:none;transform-origin:center center;box-shadow:0 24px 70px rgba(0,0,0,.55);overflow:hidden}
.slide{width:1280px;height:720px;position:absolute;inset:0;background:var(--porcelain);color:var(--ink);overflow:hidden;display:none}
.slide.active{display:block}
.slide.chalk{background:var(--chalk)}.slide.dark{background:var(--ink);color:var(--porcelain)}
.progress{position:fixed;top:0;left:0;height:3px;width:0;background:var(--dusk);z-index:60;transition:width .25s var(--ease)}
.hud{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:60;display:flex;align-items:center;gap:10px;background:rgba(23,23,27,.82);backdrop-filter:blur(6px);border:1px solid var(--hairdk);border-radius:999px;padding:12px;font-family:var(--mono);font-size:12px;color:var(--mist);opacity:.8;transition:opacity .3s}
.hud:hover{opacity:1}
.hud button{background:none;border:0;color:var(--porcelain);cursor:pointer;line-height:1;padding:4px 6px;border-radius:8px;display:flex;align-items:center;justify-content:center}
.hud button:hover{background:var(--carbon);color:var(--peri)}
.hud .ct{letter-spacing:.08em;text-align:center;line-height:1;margin:0}.hud .ct b{color:var(--porcelain)}
.material-symbols-rounded{font-family:'Material Symbols Rounded';font-weight:normal;font-style:normal;font-size:20px;line-height:1;display:block;direction:ltr;-webkit-font-feature-settings:'liga';font-feature-settings:'liga';-webkit-font-smoothing:antialiased;font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 20}
.slide.chalk{background:var(--chalk)}
.slide.dark{background:var(--ink);color:var(--porcelain)}
.body{position:absolute;left:72px;right:72px;top:60px;bottom:56px;display:flex;flex-direction:column;justify-content:center}
.meta{position:absolute;top:30px;left:72px;right:72px;display:flex;justify-content:space-between;font-family:var(--mono);font-size:11px;letter-spacing:.13em;text-transform:uppercase;color:var(--graphite)}
.dark .meta{color:var(--mist)}
.foot{position:absolute;bottom:28px;left:72px;font-family:var(--mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--graphite)}
.pg{position:absolute;bottom:26px;right:72px;font-family:var(--mono);font-size:11px;color:var(--graphite)}
.dark .foot,.dark .pg{color:var(--mist)}
.kick{font-family:var(--mono);font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:var(--dusk);margin-bottom:14px}
.kick .v{color:var(--volt)}
.dark .kick{color:var(--peri)}
.title{font-family:var(--display);font-weight:600;font-size:38px;line-height:1.02;letter-spacing:-.02em;max-width:22ch;margin-bottom:12px}
.sub{font-size:15px;color:var(--graphite);max-width:70ch;margin-bottom:22px;line-height:1.4}
.dark .sub{color:var(--mist)}
/* tiles */
.tiles{display:grid;gap:14px;margin-bottom:20px}
.tiles.t4{grid-template-columns:repeat(4,1fr)}.tiles.t3{grid-template-columns:repeat(3,1fr)}
.tile{background:var(--chalk);border:1px solid var(--hair);border-radius:6px;padding:20px}
.dark .tile{background:var(--carbon);border-color:var(--hairdk)}
.tnum{font-family:var(--display);font-weight:600;font-size:44px;line-height:1;color:var(--dusk);letter-spacing:-.02em;margin-bottom:10px}
.dark .tnum{color:var(--peri)}
.tlab{font-weight:600;font-size:14px;margin-bottom:6px}
.tdesc{font-size:11.5px;color:var(--graphite);line-height:1.4}
.dark .tdesc{color:var(--mist)}
/* cols */
.cols{display:grid;gap:14px;margin-bottom:18px}
.cols.c4{grid-template-columns:repeat(4,1fr)}.cols.c3{grid-template-columns:repeat(3,1fr)}.cols.c2{grid-template-columns:repeat(2,1fr)}
.col{background:var(--chalk);border:1px solid var(--hair);border-radius:6px;padding:20px}
.col.d{background:var(--ink);color:var(--porcelain)}
.col.d .cb{color:var(--mist)}.col.d .ct{color:#fff}
.ck{font-family:var(--mono);font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--dusk);margin-bottom:8px}
.col.d .ck{color:var(--peri)}
.ct{font-family:var(--display);font-weight:600;font-size:18px;margin-bottom:9px;letter-spacing:-.01em}
.cb{font-size:12.5px;color:var(--graphite);line-height:1.46}
.cols.c4 .cb{font-size:11.5px}
/* bullets */
.bl{list-style:none}
.bl li{position:relative;padding-left:16px;font-size:13px;line-height:1.44;color:var(--graphite);margin-bottom:9px}
.bl li:before{content:"";position:absolute;left:0;top:8px;width:6px;height:6px;background:var(--dusk);border-radius:1px}
.dark .bl li{color:var(--mist)}
/* table */
.tbl{width:100%;border-collapse:collapse;font-size:11.5px;margin-bottom:16px}
.tbl th{background:var(--carbon);color:var(--chalk);font-family:var(--mono);font-weight:500;font-size:10px;letter-spacing:.06em;text-transform:uppercase;text-align:left;padding:9px 11px}
.tbl td{padding:9px 11px;border-bottom:1px solid var(--hair);vertical-align:top;color:var(--graphite);line-height:1.35}
.tbl td.b{color:var(--ink);font-weight:600}
.tbl tbody tr:last-child td{border-bottom:0}
/* takeaway */
.take{background:var(--ink);color:var(--porcelain);border-radius:6px;padding:15px 20px;font-size:13px;line-height:1.42;font-weight:500;border-left:4px solid var(--peri)}
.take b{color:var(--peri)}
/* splits */
.split6-6{display:grid;grid-template-columns:1fr 1fr;gap:26px;margin-bottom:16px;align-items:start}
.split7-5{display:grid;grid-template-columns:1.35fr 1fr;gap:22px;margin-bottom:16px;align-items:stretch}
.chart-t{font-family:var(--mono);font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--dusk);margin-bottom:6px}
.chart-n{font-size:10.5px;color:var(--graphite);line-height:1.35;margin-top:6px}
.chart-legend{display:flex;gap:16px;margin-top:6px}
.lg{display:flex;align-items:center;gap:6px;font-size:10.5px;color:var(--graphite)}
.lg i{width:11px;height:11px;border-radius:2px;display:inline-block}
.chart{width:100%;height:auto}
.chart .dv{font-family:var(--mono);font-size:12px;fill:var(--ink);font-weight:700}
.chart .dv2{font-family:var(--mono);font-size:12px;fill:var(--ink);font-weight:700}
.chart .dvd{font-family:var(--mono);font-size:11px;fill:var(--ink);font-weight:700}
.chart .cx{font-family:var(--sans);font-size:12px;fill:var(--ink)}
.chart .cx2{font-family:var(--mono);font-size:9px;fill:var(--graphite)}
.chart .cxd{font-family:var(--sans);font-size:12px;fill:var(--ink)}
.chart .cy{font-family:var(--sans);font-size:11.5px;fill:var(--ink)}
/* funnel */
.funnel{display:flex;flex-direction:column;gap:0}
.fr{background:var(--ink);color:#fff;border-radius:4px;padding:9px 14px;display:flex;justify-content:space-between;align-items:center;margin-bottom:2px}
.fr .fl{font-size:12.5px;font-weight:600}
.fr .fv{font-family:var(--display);font-weight:600;font-size:18px;color:var(--peri)}
.fn{font-size:10px;color:var(--graphite);margin:0 0 8px 2px}
.sambar{background:var(--dusk);color:#fff;border-radius:4px;padding:12px 14px;font-family:var(--display);font-weight:600;font-size:16px;margin-top:6px}
.sidebox{background:var(--chalk);border:1px solid var(--hair);border-radius:6px;padding:22px;display:flex;flex-direction:column;justify-content:center}
.sidebox.v{background:var(--ink)}
.bignum{font-family:var(--display);font-weight:600;font-size:52px;color:var(--dusk);letter-spacing:-.02em;line-height:.9;margin-bottom:10px}
.bigcap{font-weight:600;font-size:15px;color:var(--ink);margin-bottom:8px}
.bigdesc{font-size:12px;color:var(--graphite);line-height:1.4}
/* moat */
.moat{display:flex;flex-direction:column;gap:8px;margin-bottom:12px}
.mr{background:var(--chalk);border:1px solid var(--hair);border-radius:5px;padding:11px 16px;display:grid;grid-template-columns:230px 1fr;gap:14px;align-items:start}
.mk{font-family:var(--mono);font-size:11px;letter-spacing:.05em;color:var(--dusk);font-weight:700;line-height:1.3}
.mb{font-size:11px;color:var(--graphite);line-height:1.4}
.note-b{font-size:13px;font-weight:600;color:var(--ink)}
.note-i{font-size:11.5px;color:var(--graphite);font-style:italic;margin-top:4px}
/* cover */
.cov{position:absolute;inset:0;padding:72px;display:flex;flex-direction:column;justify-content:center}
.cov-mark{font-family:var(--display);font-weight:600;font-size:150px;line-height:.86;letter-spacing:-.04em;color:var(--ink)}
.slide.dark .cov-mark{color:var(--chalk)}
.cov-tag{font-family:var(--display);font-weight:500;font-size:40px;letter-spacing:-.02em;margin:18px 0 6px}
.cov-tag em{font-style:normal;color:var(--dusk)}
.slide.dark .cov-tag em{color:var(--peri)}
.cov-line{font-family:var(--display);font-weight:500;font-size:22px;color:var(--graphite)}
.slide.dark .cov-line{color:var(--mist)}
.cov-sub{font-size:15px;color:var(--graphite);max-width:70ch;margin-top:14px;line-height:1.45}
.slide.dark .cov-sub{color:var(--mist)}
.codestrip{display:flex;flex-wrap:wrap;gap:8px 30px;font-family:var(--mono);font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--mist);border-top:1px solid var(--hairdk);padding-top:14px;margin-top:36px}
.codestrip b{color:var(--porcelain);font-weight:400}.codestrip .v{color:#9C8CFF}
.slide:not(.dark) .codestrip{color:var(--graphite);border-color:var(--hair)}
.slide:not(.dark) .codestrip b{color:var(--ink)}.slide:not(.dark) .codestrip .v{color:var(--volt)}
/* divider */
.divi{position:absolute;inset:0;padding:72px;display:flex;flex-direction:column;justify-content:center}
.divi-no{font-family:var(--mono);font-size:13px;letter-spacing:.16em;color:var(--peri);margin-bottom:16px}
.divi-t{font-family:var(--display);font-weight:600;font-size:76px;line-height:.94;letter-spacing:-.03em;color:var(--chalk)}
.divi-s{font-family:var(--display);font-weight:500;font-size:26px;color:var(--peri);margin:18px 0 14px}
.divi-b{font-size:14px;color:var(--mist);max-width:76ch;line-height:1.5}
/* close grid */
.closegrid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:30px}
.cg{background:var(--carbon);border:1px solid var(--hairdk);border-radius:6px;padding:16px}
.cgk{font-family:var(--mono);font-size:11px;letter-spacing:.08em;color:var(--peri);margin-bottom:8px}
.cgb{font-size:11.5px;color:var(--mist);line-height:1.4}
.tagv{display:inline-block;background:var(--volt);color:#fff;font-family:var(--mono);font-size:10px;letter-spacing:.08em;text-transform:uppercase;padding:3px 9px;border-radius:999px}
.tagd{display:inline-block;border:1px solid var(--dusk);color:var(--dusk);font-family:var(--mono);font-size:10px;letter-spacing:.08em;text-transform:uppercase;padding:3px 9px;border-radius:999px}
/* T02/T03 components */
.posbox{background:var(--ink);color:var(--porcelain);border-radius:6px;padding:22px 26px;font-family:var(--display);font-weight:500;font-size:19px;line-height:1.32;letter-spacing:-.01em;margin-bottom:16px}
.gates{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:16px}
.gate{background:var(--chalk);border:1px solid var(--hair);border-radius:6px;padding:20px}
.gate.dark{background:var(--ink)}
.gv{font-family:var(--display);font-weight:600;font-size:34px;color:var(--dusk);letter-spacing:-.02em;margin-bottom:10px}
.gtag{display:inline-block;font-family:var(--mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;padding:3px 10px;border-radius:999px;margin-bottom:10px}
.gtag.v{background:var(--volt);color:#fff}
.gtag.d{border:1px solid var(--dusk);color:var(--dusk)}
.gtag.crit{border:1px solid var(--crit);color:var(--crit)}
.gd{font-size:12.5px;color:var(--graphite);line-height:1.42}
.swrow{display:flex;gap:8px}
.sw2{flex:1;border-radius:5px;padding:12px 12px 14px;min-height:74px;display:flex;flex-direction:column;justify-content:flex-end}
.sw2 b{font-size:12.5px;font-weight:600;line-height:1.1}
.sw2 span{font-family:var(--mono);font-size:9px;opacity:.82;margin-top:4px}
.mini6{display:grid;grid-template-columns:1fr 1fr;gap:11px}
.mc{background:var(--chalk);border:1px solid var(--hair);border-radius:6px;padding:13px 17px}
.mc.d{background:var(--ink)}
.mck{font-family:var(--mono);font-size:11px;letter-spacing:.05em;color:var(--dusk);font-weight:700;margin-bottom:6px}
.mc.d .mck{color:var(--peri)}
.mck.b{color:var(--ink);text-transform:none;font-family:var(--display);font-size:14.5px;letter-spacing:-.01em}
.mcb{font-size:11.5px;color:var(--graphite);line-height:1.4}
.mc.d .mcb{color:var(--mist)}
@media print{@page{size:1280px 720px;margin:0}html,body{overflow:visible;background:#fff}.stage{position:static;display:block}.scaler{transform:none!important;box-shadow:none;width:auto;height:auto;overflow:visible}.slide{display:block!important;position:relative;page-break-after:always}.hud,.progress,.hint{display:none}}
`;
const SCRIPT = `
(function(){
  var slides=[].slice.call(document.querySelectorAll('.slide'));
  var scaler=document.getElementById('scaler'), prog=document.getElementById('prog'), curEl=document.getElementById('cur');
  var i=0, N=slides.length;
  function fit(){ var s=Math.min(window.innerWidth/1300, window.innerHeight/740); scaler.style.transform='scale('+s+')'; }
  function pad(n){ return (n<10?'0':'')+n; }
  function show(n){ slides[i].classList.remove('active'); i=Math.max(0,Math.min(N-1,n)); slides[i].classList.add('active'); curEl.textContent=pad(i+1); prog.style.width=((i+1)/N*100)+'%'; }
  document.getElementById('next').addEventListener('click',function(e){e.stopPropagation();show(i+1);});
  document.getElementById('prev').addEventListener('click',function(e){e.stopPropagation();show(i-1);});
  document.getElementById('fs').addEventListener('click',function(e){e.stopPropagation(); if(!document.fullscreenElement){ if(document.documentElement.requestFullscreen) document.documentElement.requestFullscreen(); } else { if(document.exitFullscreen) document.exitFullscreen(); } });
  document.addEventListener('fullscreenchange',function(){ var ic=document.getElementById('fsicon'); if(ic) ic.textContent=document.fullscreenElement?'fullscreen_exit':'fullscreen'; });
  window.addEventListener('keydown',function(e){
    if(e.key==='ArrowRight'||e.key==='PageDown'||e.key===' '){ show(i+1); e.preventDefault(); }
    else if(e.key==='ArrowLeft'||e.key==='PageUp'){ show(i-1); e.preventDefault(); }
    else if(e.key==='Home'){ show(0); } else if(e.key==='End'){ show(N-1); }
    else if(e.key==='f'||e.key==='F'){ document.getElementById('fs').click(); }
  });
  document.getElementById('stage').addEventListener('click',function(e){ show(i + (e.clientX < window.innerWidth/2 ? -1 : 1)); });
  window.addEventListener('resize',fit);
  fit(); show(0);
})();
`;
fs.writeFileSync("index.html", DOC(slides));
console.log("wrote index.html; slides:", slides.length);
