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
  const meta = `<div class="meta"><span>${left}</span><span>${right}</span></div>`;
  const foot = o.nofoot ? "" :
    `<div class="foot">RUMOAR · AUDITED EDITION</div><div class="pg">${String(PGN).padStart(2,"0")}</div>`;
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
S(`
  <div class="cov">
    <div class="cov-mark">RUMOAR</div>
    <div class="cov-tag"><em>Vibe-code</em> your look.</div>
    <div class="cov-line">Round Two. One thesis, composed three ways.</div>
    <div class="cov-sub">A men's-fashion-first styling engine, built capital-light because the category's real killers are the balance sheet and acquisition cost, not demand. Every load-bearing number in this deck survived an adversarial audit before you saw a single slide.</div>
    <div class="codestrip">
      <span>MODE <b>STYLING ENGINE</b></span>
      <span>TRACKS <b>STRATEGY · BRAND · PRODUCT</b></span>
      <span>METHOD <b class="v">VERIFY OR KILL</b></span>
      <span>BY <b>PRI</b></span>
    </div>
  </div>`, {code:"RUMOAR · BRAND SYSTEM 002 / THE ENGINE", track:"THE COMPLETE SUBMISSION", nofoot:true});

/* =================== AGENDA =================== */
S(
  kick("Index · <span class='v'>three tracks, one spine</span>")+
  H("One argument, pressure-tested from three sides.")+
  sub("RUMOAR is a men's-fashion-first styling engine. Each track is that one idea, tested from a different angle.")+
  cols([
    {k:"TRACK 01 / STRATEGY & OPS", title:"Is it a real business?", body:"The category's killers are the balance sheet (Baggit's insolvency, VIP's ₹338 Cr loss [F]), not demand. So RUMOAR is capital-light and community-led by design: breakeven around Year 5 on ₹25 to 35 Cr, 3 to 7× leaner than the funded peers raised. The moat compounds: community-led distribution (layer 1) plus the engine's data (layer 2).", dark:true},
    {k:"TRACK 02 / BRAND & MARKETING", title:"Can it grow without buying growth?", body:"No Indian brand scaled on zero marketing (Comet spent about 32% of revenue [N]). So Track 02 is a falsifiable ₹2.3L experiment: measure marginal community CAC against a &lt;₹350 / ₹350 to 900 / &gt;₹900 gate. The exact test Track 01's moat depends on."},
    {k:"TRACK 03 / PRODUCT & DESIGN", title:"What ships, and against what gap?", body:"Nine SS27 styles priced into three gaps observed live on 20 Jul 2026: the empty ₹2.5 to 4K real-leather sling band, the vacated wallet slot, the minimal cap nobody makes. The wall is what the engine recommends: full-grain, made in India, drop-sequenced."}
  ])+
  take("The spine is the styling engine: Track 01's layer-2 moat and demand-sensed inventory, Track 02's consideration-and-retention loop, Track 03's merchandiser (the wall is what it recommends). Its layer-1 partner, community-led distribution, is what Track 02's 90-day CAC test proves. One engine, one test, three proofs."),
  {code:"OVERVIEW", track:"ROUND TWO · SS27", pg:"02"});

/* =================== TRACK 01 DIVIDER =================== */
S(`<div class="divi">
    <div class="divi-no">TRACK 01</div>
    <div class="divi-t">Strategy &amp; Operations</div>
    <div class="divi-s">The version that hasn't been heard.</div>
    <div class="divi-b">Every number survived an adversarial audit: 63 claims red-teamed, 16 killed and 12+ corrected before you see a single slide. Sources are tiered: [F] filed · [N] named research · [C] company-claimed · [C-L] listed · [Obs] observed · [A] our labeled assumption.</div>
    <div class="codestrip"><span>QUESTION <b>IS IT A REAL BUSINESS?</b></span><span>ANSWER <b class="v">CAPITAL-LIGHT, BY DESIGN</b></span></div>
   </div>`, {code:"TRACK 01 / STRATEGY & OPS", track:"ROUND TWO · SS27", nofoot:true, dark:true});

/* T01-S2 red-team */
S(
  kick("Method · before you read a number, we tried to kill every one")+
  H("Four hostile fact-checkers, instructed to refute, not confirm.")+
  sub("Blogs, agency surveys and platform-commissioned stats were downgraded on sight.")+
  tiles([
    {n:"63", label:"claims audited", desc:"every load-bearing number traced to its primary source"},
    {n:"16", label:"killed or rebased", desc:"including our own TAM anchor and the community-CAC folklore"},
    {n:"12+", label:"corrected", desc:"stale, mis-scoped or mis-attributed figures fixed in place"},
    {n:"6", label:"source tiers", desc:"[F] filed · [N] named · [C] company · [C-L] listed · [Obs] observed · [A] assumption"}
  ])+
  ul([
    "Why we did this to our own document: the category is drowning in decks built on blog-tier numbers. An evaluator who catches one weak source discounts every strong one.",
    "What it cost us: a prettier story. Breakeven moved from Year 4 to Year 5, capital need rose from ₹15 to 20 Cr up to ₹25 to 35 Cr, and our favourite CAC statistic turned out to be folklore.",
    "What it bought: a plan whose weakest points are named by us, not discovered by you. The full 63-claim audit is attached as an annex."
  ]),
  {code:"TRACK 01 / METHOD", pg:"03"});

/* T01-S3 three moves */
S(
  kick("Thesis · the generic pitch is wrong on three counts")+
  H("Three corrections, each a design decision.")+
  sub("“Gen Z spend is shifting, the category is white space, Mokobara proved it”: true, inert, and half-stale.")+
  cols([
    {k:"MOVE 1", title:"Availability → Translation", body:"“No curated home for men's accessories” is false. Urban Monkey and the marketplaces already stock it all. What nobody sells is translation: turning a man's taste into a look for his build, colouring and occasion. That job is unowned."},
    {k:"MOVE 2", title:"Demand → Balance sheet", body:"The category's dead didn't die of weak demand. Baggit: insolvent over a ₹1.11 Cr bill [F]. VIP: ₹338 Cr FY26 loss on an inventory pile [F]. The killers are working capital and acquisition cost, so capital-light and community-led are engineering, not slogans."},
    {k:"MOVE 3", title:"Store → Styling engine", body:"RUMOAR reads build, colouring, vibe and vision, and returns a look: built first from what he owns, elevated by the few pieces we sell, honest about what we don't. The catalog is downstream of the engine; its gaps become a pre-validated manufacturing queue.", dark:true}
  ]),
  {code:"TRACK 01 / THESIS", pg:"04"});

/* T01-S4 move1 translation */
S(
  kick("Move 1 · the problem isn't availability, it's translation")+
  H("Nobody sells the translation. RUMOAR does.")+
  cols([
    {k:"WHAT'S ALREADY SOLVED", body:ul([
      "Urban Monkey already sells caps, eyewear, slings, wallets and belts: curated, community-led, with “complete the look” bundles [Obs].",
      "Marketplaces put every remaining SKU one search away. A man who knows what he wants finds it in ninety seconds.",
      "So we refuse to build on the “fragmentation” premise. It fails one Google search."
    ])},
    {k:"WHAT ISN'T SOLVED", body:ul([
      "Most fashion-aspiring Indian men can recognise good taste but can't generate a look from a feeling: they're vibe-coders. Taste-recognition is common; taste-production is rare.",
      "The tell: men's fashion media is dominated by how-to-style, GRWM, 3-ways-to-wear-it content. Confident dressers don't need it. Its dominance is the market.",
      "Redseer reports fashion-accessory use has doubled among Gen Z men [N, attribution without published methodology]. The behaviour is arriving faster than the skill."
    ])}
  ])+
  take("Honest label: “vibe-coders outnumber translators” is a thesis [A], not a statistic. The first 90 days exist to prove translation demand at product-cost stakes, before scale capital touches it."),
  {code:"TRACK 01 / 01-A", pg:"05"});

/* T01-S5 move2 balance sheet + chart */
S(
  kick("Move 2 · the killers are on the balance sheet, the filings say so")+
  H("Same margins, opposite fates.")+
  `<div class="split6-6">
    <div>`+ul([
      "Baggit: admitted to insolvency (CIRP) on 27 Feb 2026 over a ₹1.11 Cr operational debt. A working-capital death, not a demand death. [F, NCLT order]",
      "VIP Industries: ₹338 Cr FY26 consolidated loss; ₹900 Cr inventory pile (end-FY24); promoter family sold control to Multiples PE, Jul 2025. [F, screener.in / exchange]",
      "The survivors are separated by one line item, on nearly identical 47 to 53% gross margins."
    ])+`</div>
    <div>
      <div class="chart-t">Ad spend, % of operating revenue</div>
      ${vbars(["DailyObjects","Mokobara","Uppercase","SALTY*","Zouk"],[17,20,25,40,45],{fmt:v=>v+"%",max:50,W:600,H:300})}
      <div class="chart-n">FY25 filings [F]; DailyObjects FY24 [F] · SALTY founder-stated [C]. Outcomes: DailyObjects EBITDA −4.3% · Mokobara −6.5% · Uppercase −43% · Zouk loss ₹19.6 Cr.</div>
    </div>
  </div>`+
  take("Acquisition discipline IS the business, which is why community-led distribution is moat layer 1, and why we test it before we assume it."),
  {code:"TRACK 01 / 01-A", pg:"05"});

/* T01-S6 move3 engine */
S(
  kick("Move 3 · a styling engine that sells the pieces it recommends")+
  H("Input: build, colouring, vibe, vision. Output: three versions of every look.")+
  cols([
    {k:"TIER 1 / YOUR CLOSET", title:"Buy nothing.", body:"A complete look built only from what he already owns. This is the trust engine: the whole journey today is a man braced to be sold to, and our first answer proves we serve him, not our P&L."},
    {k:"TIER 2 / THE ELEVATE", title:"His pieces plus one keystone.", body:"One confident add: “you're 90% there; this sling is the 10%.” Never a five-item cart; that re-triggers the exact reflex Tier 1 disarmed."},
    {k:"TIER 3 / THE CEILING", title:"Including pieces we don't sell.", body:"Honesty as the wedge, and the data flywheel: every “we don't stock this” gap, aggregated across users, is a ranked, pre-validated product request.", dark:true}
  ])+
  take("The catalog is downstream of the engine: we only manufacture demand we've already watched happen. A store gives a man no reason to return; a stylist does: new season, new event, new look."),
  {code:"TRACK 01 / 01-A", pg:"06"});

/* T01-S7 TAM */
S(
  kick("01-A · the honest TAM is a range, not a number")+
  H("We audited our own anchor, and it failed.")+
  `<div class="split6-6">
    <div>
      <div class="chart-t">India bags &amp; luggage, published sizings, $B (scope stated)</div>
      ${hbars(["IMARC, “bags” (2025)","TechSci, luggage (2024)","Ken Research, luggage & bags (2025)","EMR, bags & luggage (2025)"],[1.2,3.68,15,15.9],{fmt:v=>"$"+v+"B",max:18,W:640,padL:230,rowH:56})}
      <div class="chart-n">A 13× spread, driven entirely by scope. [N × 4]</div>
    </div>
    <div>`+ul([
      "What we plan against: a mid-scope working assumption (about $9.8B), labeled [A] in the model and sensitivity-toggled, not presented as fact.",
      "Men's share about 47% of buyers: directional only [A], derived from a blog-tier stat whose own headline is that women are the growth demographic. We keep the bear reading in view.",
      "The premium-growth stats we originally quoted (+19% YoY) exist nowhere except that same blog, so they're out of the argument entirely."
    ])+`</div>
  </div>`+
  take("The TAM debate is noise anyway: every scope in the chart is at least ₹10,000 Cr and the Year-5 plan needs ₹160 Cr. Market size is not where this plan lives or dies."),
  {code:"TRACK 01 / 01-A", pg:"07"});

/* T01-S8 funnel */
S(
  kick("01-A · bottom-up, the SAM we'd actually defend")+
  H("Built from people, every input labeled.")+
  `<div class="split7-5">
    <div class="funnel">
      <div class="fr" style="width:100%"><span class="fl">Urban males 18 to 35</span><span class="fv">~80M</span></div>
      <div class="fn">[A] arithmetic from Worldometer / UN age structure; ±15% on urban definitions</div>
      <div class="fr" style="width:86%"><span class="fl">× income-qualified (base 15%; 10 to 17.5%)</span><span class="fv">~12M</span></div>
      <div class="fn">[A] back-solved from Goldman's affluent-India (60M→100M by 2027) [N]; skews 35 to 60</div>
      <div class="fr" style="width:72%"><span class="fl">× premium-accessory penetration (base 30%)</span><span class="fv">~3.6M</span></div>
      <div class="fn">[A] no published source exists; pure assumption</div>
      <div class="fr" style="width:58%"><span class="fl">× ARPU ₹4,000/yr (₹3,000 to 4,500)</span><span class="fv"></span></div>
      <div class="fn">[A] held down deliberately: Redseer says Gen Z pays about half the millennial unit price [N]</div>
      <div class="sambar">SAM ≈ ₹1,400 Cr base &nbsp;·&nbsp; modeled range ₹600 to 2,500 Cr</div>
    </div>
    <div class="sidebox">
      <div class="bignum">~11%</div>
      <div class="bigcap">of base SAM = the Year-5 plan (₹160 Cr).</div>
      <div class="bigdesc">Winnable in a fragmented category. Not trivial. Not the “6% of a big number” comfort our first draft claimed.</div>
    </div>
  </div>`,
  {code:"TRACK 01 / 01-A", pg:"08"});

/* T01-S9 competitors */
S(
  kick("01-A · who's already moving, every row verified")+
  H("No scaled player owns men's-first, community-led, styling-led.")+
  table(["Player","Filed / verified reality","The read"],[
    [{t:"Mokobara",b:1},"FY25 ₹230 Cr (+97%), loss ₹10 Cr, EBITDA −6.5%, ads ~20% [F]. FY24 near-breakeven.","Premium works at scale, and discipline gets harder, not easier, as you grow."],
    [{t:"Zouk",b:1},"FY25 ₹125 Cr, loss ₹19.6 Cr, ads 45%, operating cash −₹32 Cr [F]. Pre-Series C in motion [F].","Growth bought with marketing; capital still arriving in accessories."],
    [{t:"Uppercase",b:1},"FY25 ₹83 Cr, loss ₹35 Cr, EBITDA −43% [F]; +₹20 Cr at a flat ₹534 Cr (Apr-26) [F].","The cost of buying share without a moat."],
    [{t:"Snitch",b:1},"FY25 ₹498 Cr filed, about breakeven [F]; FY26 ₹900 Cr company-stated [C]; ₹340 Cr raised at ~₹2,500 Cr [F].","The biggest threat: its men's-accessories storefront is already live and selling."],
    [{t:"SALTY",b:1},"₹30.1 Cr raised Jan-26 [F]; men's jewellery line already 25 to 30% of business [C].","Fresh capital validating men's accessories right now."],
    [{t:"Urban Monkey",b:1},"Founder-stated about ₹5 Cr after ~5 years of community building [C]; no filings coverage.","The cautionary comp: community compounds, slowly."]
  ],[14,50,36])+
  take("No scaled player owns men's-first, community-led, styling-led accessories. But the window is being closed from above (Snitch) faster than from below: speed matters more than the TAM."),
  {code:"TRACK 01 / 01-A", pg:"09"});

/* T01-S10 duty */
S(
  kick("01-B · the duty number everyone quotes is wrong")+
  H("“~40% import duty” is gross. IGST at the border is a creditable input-tax credit.")+
  tiles([
    {n:"16.5%", label:"Bags · wallets · backpacks (HS 4202)", desc:"BCD 15% + surcharge, unchanged through Budget 2026-27 (TRU letter) [F]"},
    {n:"11%", label:"Caps (HS 6505)", desc:"GST 2.0 cut cap IGST 12%→5% (Sep-25), so gross incidence is now ~16.6%, not ~32% [F]"},
    {n:"0%", label:"AIDC on either heading", desc:"but footwear DID get AIDC in 2025: a future sneaker line changes this math completely [F]"},
    {n:"Cash", label:"IGST timing caveat", desc:"creditable, but paid in cash at the port and recovered later: a real working-capital cost [F]"}
  ])+
  take("The real import wall is about 16.5% / 11%, smaller than folklore says. So make-vs-import is a SKU-by-SKU landed-cost decision, not a patriotic slogan."),
  {code:"TRACK 01 / 01-B", pg:"10"});

/* T01-S11 india vs china */
S(
  kick("01-B · India vs China, pre-quote planning, honestly labeled")+
  H("Every cost below is a factory-listed range [A/C], not a negotiated quote.")+
  table(["₹, IGST excluded both sides","China landed","India ex-works","Honest verdict"],[
    ["Mid-tier backpack (300 to 500u)","~₹1,740","₹1,600 to 1,900","About parity at small batch; China ahead at volume via published 5 to 15% FOB discounts, not the “18 to 25%” folklore we first wrote"],
    ["Leather bifold wallet (500u)","~₹740","₹500 to 600","India wins by ~20 to 25%: real, but not the 55% our draft claimed (the $13 FOB we used priced a top-grain RFID piece; standard is $4 to 9)"],
    ["Structured cap (300 to 500u)","~₹315","₹120 to 250","India on basic; China on complex/structured at volume"]
  ],[24,14,15,47])+
  ul([
    "Geography, corrected: the wallet capital of India is Kolkata, about 50% of leather-goods exports [F, WB govt]. Tamil Nadu's famous ~40% is the whole leather sector, footwear-led. Kanpur holds the saddlery GI [F].",
    "MOQs are genuinely startup-friendly: 100 units/style, 45 to 50 day lead [C]; wallets 100 to 200. Labour about 65 to 70% below China [C×2], but labour is ~20 to 25% of ex-works cost, so on labour-light canvas the landed edge is ~10 to 15%, while labour-intensive leather SLG reaches ~20 to 25%, stated honestly.",
    "Before submission this whole stack gets replaced by primary work: 2 Chinese + 2 Indian written quotes per SKU at 500 / 2,000 / 10,000 units, a CHA-verified landed-cost sheet, and ICEGATE screenshots."
  ]),
  {code:"TRACK 01 / 01-B", pg:"11"});

/* T01-S12 waitlist */
S(
  kick("01-B · manufacture against a waitlist, not a forecast")+
  H("A design choice, built against the two filed failure modes.")+
  cols([
    {k:"1 · SENSE", body:"Styling-engine Tier-3 gaps plus drop waitlists (names, sizes, colourways) surface demand before a PO exists."},
    {k:"2 · MAKE", body:"Small-batch India-made SLG and canvas at about 100/style MOQ. POs cut only against pre-validated demand, with one disclosed exception: the Rumour 001 launch PO, since a waitlist can't precede the brand."},
    {k:"3 · DROP", body:"Community-gated release; scarcity is a by-product of honest batch sizes, not a marketing trick."},
    {k:"4 · LEARN", body:"Sell-through and new gaps feed the next batch. Inventory turns stay high; dead stock stays near zero."}
  ])+
  ul([
    "What it's built against: Baggit converted cash into inventory that didn't sell until a ₹1.11 Cr bill ended the company [F]. VIP sat on a ₹900 Cr pile [F]. Forecast error IS working-capital intensity.",
    "Channel discipline: DTC-first. Offline trade takes 30 to 40% of MRP by industry convention [A, no India primary exists; we validate it in our first three retailer conversations].",
    "What this does NOT solve: the pre-order production cash cycle still needs ₹10 to 15 Cr of working capital at scale, priced into the capital plan, not wished away."
  ]),
  {code:"TRACK 01 / 01-B", pg:"12"});

/* T01-S13 unit econ */
S(
  kick("01-C · unit economics without the romance")+
  H("A first order barely clears. The business is repeat, attach, community CAC.")+
  `<div class="split7-5">
    <div>`+table(["Contribution walk (blended, base)","₹ / order","Basis"],[
      ["Blended net ASP × 1.3 items → AOV","₹2,815","[A] sling ₹2.5 to 4k anchor, cap ~₹1 to 1.4k, wallet attach"],
      ["Gross margin ~51%","₹1,435","Rebased to the filed cluster: Mokobara 51 to 53%, DailyObjects 49.9%, Uppercase 47.6% [F]. 56% is an upside toggle only."],
      ["less fulfilment, gateway, returns","₹1,070","Prepaid-led checkout; accessories return less than apparel [N/A India rate unpublished]"],
      ["less blended CAC ₹900","₹170","[A] from filed ad-to-revenue ratios (17 to 25%). The “₹800 to 1,200 benchmark” self-describes as unmeasured, gone."]
    ],[46,16,38])+`</div>
    <div class="sidebox v">
      <div class="bignum" style="color:#fff">CM2 = ₹170</div>
      <div class="bigcap" style="color:var(--peri)">about 6% of AOV, after CAC.</div>
      <div class="bigdesc" style="color:var(--mist)">A first order barely clears. We say so instead of hiding it in a 56% margin.</div>
    </div>
  </div>`+
  take("Where LTV comes from: the cap → sling → fragrance ladder. Nykaa's Perfumery format runs about 3× regular-store AOV, 45%+ from men's fragrance [C]. COD fell 62.6%→47.6% in one Diwali cycle [N]; prepaid RTO 2 to 3% vs 25 to 30% on COD [N]."),
  {code:"TRACK 01 / 01-C", pg:"13"});

/* T01-S14 P&L */
S(
  kick("01-C · P&L to breakeven, Year 5 not Year 4")+
  H("Rebased at 51% GM. Revenue ₹ Cr: 6 → 20 → 48 → 92 → 160.")+
  `<div class="split6-6">
    <div>
      <div class="chart-t">EBITDA by year (bars) &amp; cumulative EBITDA (line), ₹ Cr</div>
      ${combo(["Y1","Y2","Y3","Y4","Y5"],[-3.2,-5.7,-6.2,-2.3,6.0],[-3.2,-8.9,-15.2,-17.5,-11.5])}
      <div class="chart-n">Marketing glide 42% → 18% of revenue. Cumulative trough about −₹17.5 Cr in Year 4.</div>
    </div>
    <div>`+ul([
      "Marketing at 18 to 21% mid-plan is IN LINE with disciplined comps (DailyObjects 17%, Mokobara 19 to 20%), not “5 to 10 points lower.” Our first draft claimed an edge the model never contained; the audit removed it.",
      "Proof breakeven is reachable: DailyObjects, EBITDA −4.3% at ₹84 Cr on 17% ads [F]. One comparable out of four. A discipline game few have won.",
      "The ramp is the plan's most aggressive assumption: the community-led comp did ₹5 Cr in 5 years. Our curve requires community economics to outperform every Indian precedent, or we raise more and grow slower. Stated, not hidden."
    ])+`</div>
  </div>`,
  {code:"TRACK 01 / 01-C", pg:"14"});

/* T01-S15 capital */
S(
  kick("01-C · capital, ₹25 to 35 Cr, honestly counted")+
  H("Our first draft said ₹15 to 20 Cr. The audit killed it.")+
  `<div class="split6-6">
    <div>
      <div class="chart-t">Raised vs cumulative P&amp;L losses, ₹ Cr</div>
      ${gbars(["Mokobara","Zouk","Uppercase","RUMOAR"],[193,120,165,30],[27,25,75,null])}
      <div class="chart-legend"><span class="lg"><i style="background:var(--dusk)"></i>Raised</span><span class="lg"><i style="background:var(--graphite)"></i>Cumulative losses</span></div>
      <div class="chart-n">RUMOAR bar = capital NEED (₹25 to 35 Cr band; 30 shown). Raised ≠ burned. Peer figures [F].</div>
    </div>
    <div>`+ul([
      "The build-up: cumulative EBITDA trough about −₹17.5 Cr plus working capital ₹10 to 15 Cr (inventory alone runs ₹10 to 16 Cr at ₹90 Cr revenue; Mokobara carried ~₹71 Cr non-cash current assets at ₹117 Cr [F]).",
      "Still 3 to 7× leaner than what peers raised, if the plan holds.",
      "The exit that pays it back: FMCG strategics buy category ownership near profitability at about 2× revenue. Emami's TMC deal implies ~₹358 to 400 Cr, about 2× FY24 revenue [F]; Beardo returned an estimated 5 to 6.5× [N, estimate]."
    ])+`</div>
  </div>`,
  {code:"TRACK 01 / 01-C", pg:"15"});

/* T01-S16 moat */
S(
  kick("Moat · a compound, in order, and layer 1 is a hypothesis we'll prove")+
  H("Distribution, design, supply chain or marketing? A sequence.")+
  `<div class="moat">
    <div class="mr"><div class="mk">1 · COMMUNITY-LED DISTRIBUTION</div><div class="mb">The filed spread between 17 to 20% ad ratios (viable) and 40 to 45% (bleeding) IS the category's economics. But no Indian accessories brand has scaled past about ₹10 Cr on community alone (Urban Monkey took 5 years to ₹5 Cr [C]). So: a 90-day test at product-cost stakes before a rupee of scale capital. Kantar: 67% trust influencer recommendations over ads [N]. Comet: ₹167 Cr post-money in about 12 to 17 months [F], though A&amp;P was still ~32% [N]. Community started it, paid scaled it, which is why Track 02 tests community CAC rather than assuming it.</div></div>
    <div class="mr"><div class="mk">2 · STYLING-ENGINE DATA</div><div class="mb">Every session captures what no competitor holds: what a specific man looks like, owns, wants, and can't find. Aggregated Tier-3 gaps = a ranked, pre-validated pipeline. A marketplace can clone an “AI stylist”; it can't clone the personal grain or the accumulated data.</div></div>
    <div class="mr"><div class="mk">3 · INDIA-MADE SUPPLY CHAIN</div><div class="mb">Narrowed by audit and still real: ~20 to 25% landed edge in leather SLG (Kolkata), parity in backpacks, ~100/style MOQs that make demand-sensed drops economic. Protects the margin the model spends on trust and CAC.</div></div>
    <div class="mr"><div class="mk">4 · DESIGN RESTRAINT</div><div class="mb">The reason a taste-led man picks us on a shelf Urban Monkey's loudness doesn't serve. Most copyable layer, which is exactly why it's fourth, not first.</div></div>
  </div>`+
  `<div class="note-b">If layer 1 fails its test, this is a good niche brand, not a venture outcome. That risk is priced and stated, not discovered later.</div>`,
  {code:"TRACK 01 / MOAT", pg:"16"});

/* T01-S17 assumptions */
S(
  kick("Risk · what breaks this model, the assumptions register")+
  H("Five load-bearing assumptions, base values, break conditions.")+
  table(["#","Assumption","Base","Breaks if"],[
    ["1","Community pulls blended CAC below ₹900 over time","Hypothesis, NOT in the base P&L","Engagement doesn't convert; hitting the ₹160 Cr ramp then needs paid media at comp ad-ratios, so capital rises above ₹25 to 35 Cr or breakeven slips past Year 5"],
    ["2","Blended gross margin ~51%","Filed-comp cluster [F]","Discounting to move drops; marketplace mix rises; leather input costs spike"],
    ["3","Revenue ramp to ₹160 Cr by Year 5","Aggressive vs precedent [A]","Community growth caps at Urban Monkey pace → need ₹40 Cr+, not ₹25 to 35 Cr"],
    ["4","Repeat/attach lifts LTV (cap→sling→fragrance)","Directionally supported; unquantified","One-and-done behaviour persists at premium price points"],
    ["5","Waitlist inventory holds WC at ₹10 to 15 Cr","Design choice","Drop cadence forces safety stock; marketplace receivables stretch"]
  ],[5,38,24,33])+
  `<div class="note-i">Everything above is toggle-able in the companion model: every input is a lever, every break condition a stress test.</div>`,
  {code:"TRACK 01 / RISK", pg:"17"});

/* T01 close */
S(`<div class="divi">
    <div class="divi-no">TRACK 01 · CLOSE</div>
    <div class="divi-t">Not a bags brand riding a tailwind.</div>
    <div class="divi-s">A styling engine engineered around the two things that actually kill this category.</div>
    <div class="divi-b">Working capital and acquisition cost, with every number audited before you saw it. Breakeven about Year 5 on ₹25 to 35 Cr; the moat compounds, community distribution (tested in Track 02) plus the engine's data. “We would rather show you a harder, truer model than a prettier one.”</div>
   </div>`, {code:"TRACK 01 / STRATEGY & OPS", track:"ROUND TWO · SS27", nofoot:true, dark:true});

/* =================== TRACK 02 DIVIDER =================== */
S(`<div class="divi">
    <div class="divi-no">TRACK 02</div>
    <div class="divi-t">Brand &amp; Marketing</div>
    <div class="divi-s">90 days. Zero followers. No media budget.</div>
    <div class="divi-b">We don't plan to go viral. We run a falsifiable 90-day experiment that either proves community-led acquisition at product-cost stakes, or tells us Track 01's moat hypothesis is wrong before scale capital touches it. Ten thousand followers is the by-product. A measured CAC is the product.</div>
    <div class="codestrip"><span>QUESTION <b>CAN IT GROW WITHOUT BUYING GROWTH?</b></span><span>ANSWER <b class="v">A ₹2.3L FALSIFIABLE TEST</b></span></div>
   </div>`, {code:"TRACK 02 / BRAND & MARKETING", track:"ROUND TWO · SS27", nofoot:true, dark:true});

/* T02-S2 honesty */
S(
  kick("Method · no Indian brand has scaled on zero marketing, we checked")+
  H("Verify-or-kill, on the playbooks we borrow and on our own draft.")+
  sub("The casualties shape the plan.")+
  tiles([
    {n:"~32%", label:"Comet's real FY25 A&P", desc:"₹9.3 Cr on ₹29.1 Cr revenue [N citing filings]. The “zero-marketing darling” story is dead: community starts brands, paid scales them."},
    {n:"0", label:"named sources for “Snitch uses AI models”", desc:"Claim killed. We make no AI claims we can't source, including about ourselves."},
    {n:"2", label:"names cut from our own list", desc:"Two influencers don't verifiably exist. Every surviving count is live-verified, dated 20 Jul 26."},
    {n:"2", label:"defects our own hostile pass caught", desc:"A budget table that didn't sum and an inconsistent success metric, fixed before you saw them."}
  ])+
  take("So the claim we make is modest and testable: 90 days of product-cost-only growth to MEASURE whether community converts, not a promise to defy every Indian precedent forever."),
  {code:"TRACK 02 / METHOD"});

/* T02-S3 evidence */
S(
  kick("02-A · the need is already visible, where ads can't reach")+
  H("Demand for dressing help is growing, inside an anti-advertising trust architecture.")+
  tiles([
    {n:"230K+", label:"r/IndianFashionAddicts members", desc:"~161K weekly visitors, core 18 to 34 (The Nod Mag, 2024 to 25) [N]"},
    {n:"7.2B+", label:"GRWM Shorts views, India, 2024", desc:"Google first-party [C, platform data; not male-only, flagged]"},
    {n:"~8.5M", label:"subs, top-3 men's style channels", desc:"Formal Edit 6.27M · Style Saiyan 1.32M · BeYourBest 0.90M (live, Jul-26) [N]"},
    {n:"11", label:"live Quora threads, verbatim", desc:"“Which is the best brand for men's wallet in India?” [Obs]"}
  ])+
  cols([
    {k:"IN THEIR WORDS", body:"“Reddit is not used for promotions, so it kind of filters out the chaff, and you get to hear real reviews.” A moderator, asked what's changed: “More men ask for fashion tips.” [N, The Nod Mag]", dark:true},
    {k:"THE READ", body:"Confident dressers don't consume how-to-style content at this scale [A, interpretation]. The dominance of translation content IS the vibe-coder market showing itself, and it lives where paid ads have the least trust."}
  ]),
  {code:"TRACK 02 / 02-A"});

/* T02-S4 positioning */
S(
  kick("02-A · the positioning the evidence actually supports")+
  H("Defended in the competitors' own words.")+
  `<div class="posbox">“For the man who knows the look he wants but not how to build it, RUMOAR turns his vibe into his look, starting with what he already owns. A stylist he belongs to, not a store that sells at him.”</div>`+
  table(["Brand","Their own positioning language (live homepage, Jul 2026) [C]","Who styles?"],[
    [{t:"Snitch",b:1},"“Redefine your style today!”","You do"],
    [{t:"Urban Monkey",b:1},"“express and explore their inner street artist”","You do"],
    [{t:"Mokobara",b:1},"“#GoingPlaces, get there looking sharp”","You do"],
    [{t:"Rare Rabbit",b:1},"“premium and luxury, exclusive, international designs”","You do"],
    [{t:"Bewakoof",b:1},"“follows his heart”","You do"]
  ],[18,58,24])+
  take("Among these five, the translation claim is linguistically unoccupied [C]. Myntra's generic AI stylist exists, which is exactly why the moat is personal-grain styling data (Track 01, layer 2), not the idea of AI styling."),
  {code:"TRACK 02 / 02-A"});

/* T02-S5 semiotics */
S(
  kick("02-A · semiotic codes, saying it without saying it")+
  H("Fashion-first, quietly premium, in-the-know, yours, through restraint.")+
  cols([
    {k:"VISUAL", body:"Restrained wordmark: recognition from palette and photography before the name. Edited palette (the anti-Mokobara: no colourway rainbow). Object-as-art photography, product as portrait. Casting from the community, not model agencies. Texture close-ups that prove construction."},
    {k:"VERBAL", body:"The brand verb: “vibe-code your look.” Tier names that do positioning work: Your Closet / The Elevate / The Ceiling, so the brand's first words are “you already own most of this.” Drops named as Rumours; teasers as overheard speech; the waitlist reads “hear it first.” Captions literate and specific, never “PREMIUM QUALITY.”", dark:true},
    {k:"RITUAL", body:"The unboxing card is an induction, not a coupon: maker's cluster (Kolkata leather, Karur canvas), drop number, QR into the community. Monogramming turns the thin-WTP wallet into a gift object. Anti-codes enforced: no celebrity launches, no SALE typography, no stock models, no follower-bait giveaways."}
  ]),
  {code:"TRACK 02 / 02-A"});

/* T02-S6 playbooks */
S(
  kick("02-B · whose playbooks we borrow, each verified this round")+
  H("Six precedents, each with what we take, and what we flag.")+
  table(["Brand","The move, as verified / flagged","What we take"],[
    [{t:"The Whole Truth",b:1},"0→10K IG in ~3 months on founder-written content, zero promotion [C, cleanest precedent; timelines conflict, flagged]","Founder-as-author carries the first 90 days"],
    [{t:"Snitch",b:1},"“Snitch Squad” is real: min 1K followers, per-post payouts (CMO-quoted) [C-in-N]; origin 2K→100K social-only [C]","The scaled version of the seeding we start manually"],
    [{t:"Comet",b:1},"Waitlist per drop, no restocks [Obs]; 300 pairs sold in ~2h [N]; first launch sold 2 pairs [C]; FY25 A&P ~32% [N, filings]","Drop-waitlist as demand sensor, and the honest lesson"],
    [{t:"Urban Monkey",b:1},"250+ artists seeded, 150+ events, Gully Boy: ~₹5 Cr after ~5 years [C]","Seeding compounds credibility, slowly. Our pacing check"],
    [{t:"boAt / Mamaearth",b:1},"boAt ads ~3.3 to 3.6% of revenue at scale [F-derived]; Mamaearth influencer spend ₹22.7→₹67.1 Cr FY21 to 23 [F-derived]","Seeding is a system: seed, surface winners, repurpose"],
    [{t:"Sleepy Owl",b:1},"“First 1,000 customers became brand ambassadors” [C-in-N]","The waitlist doubles as the ambassador list"]
  ],[17,58,25]),
  {code:"TRACK 02 / 02-B"});

/* T02-S7 90-day */
S(
  kick("02-B · the 90 days, three phases, one honest PO exception")+
  H("The system before the noise, then the founder engine, then Rumour 001.")+
  cols([
    {k:"PHASE 0 · W1 to 2", title:"The system before the noise", body:"Identity and semiotic system locked. WhatsApp concierge opens, founder-run, 20 sessions/day. First 19 roster DMs out (gifting, zero ask). The one PO exception, stated: Rumour 001 can't wait for a waitlist that doesn't exist, so one forecast-based W1 PO clears MOQ (150 slings, 200 caps, 150 wallets) [A]: the 125-unit public drop plus about 25 seeding and sample units. Every later PO is waitlist-sensed."},
    {k:"PHASE 1 · W3 to 8", title:"The founder engine, plus the squad", body:"Founder content from W3: 3 Reels + 2 carousels/week (carousels out-engage Reels, Socialinsider [N-v]; 92% of Indian users prefer Reels [C]). Three formats only: vibe-code transformations, object-as-art construction stories, creator rotations. Cap/wallet kits land W4 to 5, so 100 squad kits out with notes and affiliate codes (barter-first [N])."},
    {k:"PHASE 2 · W8 to 13", title:"Rumour 001", body:"Sling kits land W8, roster content W9 to 11. The drop: waitlist (name, size, phone), honest batch (125 units), no restock, members hear it 48h first. Always-on cap/wallet catalog opens W8. WhatsApp becomes the retention rail (marketing msgs ₹0.95 to 1.09, service replies free [F/C]). Day 90 to 91: read the gate, publish the decision.", dark:true}
  ]),
  {code:"TRACK 02 / 02-B"});

/* T02-S8 budget */
S(
  kick("02-B · the budget, ₹2.3L, product cost not media")+
  H("About 0.1% of the low end of the ₹25 to 35 Cr capital plan.")+
  `<div class="split7-5">
    <div>`+table(["Line","₹","Basis"],[
      ["100 squad kits (cap/wallet, landed)","75,000","Model COGS ₹450 to 800 + ship/pack [A]"],
      ["19 roster kits + 6 earned-slot kits","50,000","~₹2,000/kit; top of band taken deliberately [A]"],
      ["Founder content production","50,000","Phone-first; lights/props; AI-assisted"],
      ["AI tooling (3 months)","25,000","Botika ~₹60/on-model image; Descript/Opus [C]"],
      ["WhatsApp concierge + community","10,000","Meta conversation fees [F/C] + LLM [A]"],
      ["UGC contest prizes (10 pieces)","20,000","[A]"],
      [{t:"CORE TOTAL",b:1},{t:"₹2,30,000",b:1},{t:"~0.1% of the low end of the capital plan",b:1}],
      ["Optional: 3 paid micro Reels (W9 to 13)","+75,000","₹10 to 50K/Reel micro band [C]"]
    ],[46,17,37])+`</div>
    <div class="sidebox">
      <div class="bigcap" style="font-family:var(--display);font-size:19px">AI cuts the doing-cost</div>
      ${ul([
        "On-model imagery ~₹60/image vs ₹450 to 750 traditional [C/N]; list arithmetic 87 to 92%; we plan 55 to 85% [A].",
        "Solo editing at 5 posts/week: Descript/Opus tools, $16 to 29/mo [C].",
        "1,000 styling sessions is about ₹2,000 total in model and carriage [A]: a marketing line, not headcount.",
        "AI never makes the taste calls: the founder's voice and the three-tier looks stay human."
      ])}
    </div>
  </div>`,
  {code:"TRACK 02 / 02-B"});

/* T02-S9 gate */
S(
  kick("02-B · the gate, one metric, defined once, falsifiable")+
  H("Marginal community CAC, Weeks 9 to 13.")+
  sub("Attributable in-window spend divided by in-window customers (codes + waitlist + WhatsApp). Reported with and without the optional paid test.")+
  `<div class="gates">
    <div class="gate"><div class="gv">&lt; ₹350</div><div class="gtag v">${'SCALE'}</div><div class="gd">Community becomes the growth engine; spend follows what measurably converts.</div></div>
    <div class="gate"><div class="gv">₹350 to 900</div><div class="gtag d">HYBRID</div><div class="gd">Community + disciplined paid at the DailyObjects ~17% ad-ratio benchmark [F-derived].</div></div>
    <div class="gate dark"><div class="gv" style="color:var(--peri)">&gt; ₹900</div><div class="gtag crit">FALSIFIED</div><div class="gd" style="color:var(--mist)">Track 01's moat layer 1 fails. We say so, and re-plan around disciplined paid, before scale capital is spent.</div></div>
  </div>`+
  ul([
    "Fully-loaded 90-day CAC will read ~₹1,000 to 2,300 at plan volumes: it amortises one-time system build over a single drop. Reported alongside; NOT the gate. The question is what the NEXT customer costs.",
    "Illustration at plan volumes (~230 customers): pure-community marginal about ₹110 to 250 (pass); with the paid test about ₹435 to 670 (hybrid) [A, illustrative].",
    "Cautionary anchor: Bombay Shaving's founder-admitted early CAC ~₹2,000 [C], what “community failed” looks like."
  ]),
  {code:"TRACK 02 / 02-B"});

/* T02-S10 face */
S(
  kick("02-C · the face, structure first, name second")+
  H("Founder-as-face plus one anchor creator on affiliate and advisory equity, no cash retainer.")+
  cols([
    {k:"1 · Aditya Marathe · @whatknotman", title:"300.7K · ER 3.0%", body:"The only elevated-minimal, accessories-native creator verified at scale. Best authority and aesthetic match. Risk: watch-first; mid-tier paid cost if equity fails.", dark:true},
    {k:"2 · Kinshuk Gujral · @kinshukwearss", title:"189.0K · ER 2.87%", body:"Closest format twin: outfit-formula content IS manual vibe-coding. Already affiliate-native (Wishlink), so likeliest yes. Cheapest anchor."},
    {k:"3 · Anuj Dutta · @imanujduttaa", title:"141.3K · ER 3.38%", body:"Forbes India Digital Stars 2024 [N]: third-party-validated minimal-menswear credibility. The balanced pick."}
  ])+
  take("Why upside-pay is plausible: Bumrah is an INVESTOR in uppercase [F]; Ranveer co-founded Bold Care [N]; Shilpa Shetty's Mamaearth stake returned up to ~101× [N]; EY [N]: 29% of brands already explore performance-linked pay; Kofluence: 88% of creators can't live off social alone [N]."),
  {code:"TRACK 02 / 02-C"});

/* T02-S11 the 25 */
S(
  kick("02-C · the first 25, live-verified, flags shown")+
  H("3 authority + 11 accessories-native + 5 nano + 6 earned = 25.")+
  table(["Tier","Who (followers, live-verified 20 Jul 26) [N]","Ask"],[
    [{t:"A · authority (3)",b:1},"Karron S Dhinggra (IG 2.39M + YT 6.27M, formal skew, gifting only) · Rohit Khandelwal (742.7K) · Siddharth Batra (250.0K, jewellery-on-men editorial)","Gift + relationship; no deliverable ask"],
    [{t:"B · accessories-native (11)",b:1},"whatknotman 300.7K · Kussh Sachdev 269.7K · Khalid Walid 266.3K · scentwalebhaiyaaa 197.3K · Kinshuk Gujral 189.0K · Anuj Dutta 141.3K · theshoeunboxer 121.8K · Bhargav Kheni 389.3K · thefebruaryboy 364.0K · pehenawah 617.4K · Aditya Bhalla 39.5K","Kits + 15% affiliate codes"],
    [{t:"C · nano/micro (5 + 6 earned)",b:1},"naazperfumes 52.8K · lookbyn 59.5K · thepiyushfits 12.7K · shoesyourdaddy 40.8K · Harsh Kale 37.2K [C-flag], plus 6 seats EARNED by the squad's best performers (a promotion path, not filler)","Kits + codes"]
  ],[18,64,18])+
  `<div class="note-i"><b style="color:var(--ink)">Verified but consciously excluded, the flags are the rigor:</b> Prashant Sameer (455K, ER 0.67%, reach without response) · socialjacket (audience-quality flags) · Style Saiyan (1.32M subs, 3.8 to 10.6K avg views, dead reach) · BeYourBest (mass-advice register). Cut as unverifiable: two names that don't exist.</div>`,
  {code:"TRACK 02 / 02-C"});

/* T02-S12 budget/timeline */
S(
  kick("02-C · budget, timeline, objectives, itemised not additional")+
  H("This is the kit budget from 02-B, itemised by tier, not new spend.")+
  `<div class="split7-5">
    <div>`+table(["Element","Plan","₹ (90d)"],[
      ["Anchor face","Affiliate 15% + advisory equity 0.25 to 0.5% vesting","0 cash [A]"],
      ["Tier A (3)","Gifting + relationship; no ask","6,000"],
      ["Tier B (11)","Sling+cap kits + 15% codes","22,000"],
      ["Tier C named (5)","Kits + codes","10,000"],
      ["Earned slots (6)","Kits on promotion, W9 to 13","12,000"],
      ["Squad (100)","Cap/wallet kits + codes; barter-first [N]","75,000"],
      [{t:"KIT TOTAL",b:1},{t:"= 02-B rows 1 to 2",b:1},{t:"₹1,25,000",b:1}]
    ],[30,46,24])+`</div>
    <div class="sidebox">
      <div class="bigcap" style="font-family:var(--display);font-size:19px">Objectives</div>
      ${ul([
        "≥ 12 of the 19 seeded roster posting organically by W10 (~60%, consistent with Assumption 1).",
        "Anchor live by W6; ≥ 40% of waitlist attributable to creator codes.",
        "Every kit carries a code; the 02-B gate is computed with every rupee here reported, marginal and fully-loaded both shown.",
        "Honest failure mode [A]: if ≤ 5 of 19 post, seeding-by-gifting is disproven for this category at this price point, and that datapoint alone justifies the ₹1.25L."
      ])}
    </div>
  </div>`,
  {code:"TRACK 02 / 02-C"});

/* T02-S13 assumptions */
S(
  kick("Risk · what breaks Track 02, the assumptions register")+
  H("Five load-bearing assumptions, base values, break conditions.")+
  table(["#","Assumption","Base","Breaks if"],[
    ["1","~55% of 119 seeded creators post organically","[A] barter norms named-sourced; conversion is not","≤ 20% post → follower math collapses; paid becomes mandatory earlier"],
    ["2","Founder carries 5 posts/week of taste-led content","The Whole Truth precedent [C]","Voice doesn't land → the engine idles; no budget rescues bad content"],
    ["3","Waitlist of 1,000 to 1,800 converts ~8 to 15% → 100 to 150 units","Comet mechanic observed [Obs]; conversion unpublished [A]","&lt; 3% → signal too weak to cut Rumour 002's PO against"],
    ["4","Anchor accepts equity/affiliate structure","EY 29% performance-pay trend [N]","All three decline → face slips to Phase 2; founder carries alone"],
    ["5","MARGINAL community CAC lands &lt; ₹900 (gate)","The moat hypothesis","Marginal &gt; ₹900 → Track 01's falsification triggers; re-plan around disciplined paid"]
  ],[5,36,26,33]),
  {code:"TRACK 02 / RISK"});

/* T02 close */
S(`<div class="divi">
    <div class="divi-no">TRACK 02 · CLOSE</div>
    <div class="divi-t">Track 01 named the hypothesis.<br>Track 02 is the experiment.</div>
    <div class="divi-s">₹2.3 lakh, 90 days, one falsifiable gate.</div>
    <div class="divi-b">Either community-led acquisition proves itself at product-cost stakes, or we find out for about 0.1% of the capital plan instead of 100% of it. The evidence is named, the roster is live-verified with its weak links excluded, and the gate is published either way: &lt; ₹350 scale, ₹350 to 900 hybrid, &gt; ₹900 falsified.</div>
   </div>`, {code:"TRACK 02 / BRAND & MARKETING", track:"ROUND TWO · SS27", nofoot:true, dark:true});

/* =================== TRACK 03 DIVIDER =================== */
S(`<div class="divi">
    <div class="divi-no">TRACK 03</div>
    <div class="divi-t">Product &amp; Design</div>
    <div class="divi-s">It's SS27. Here is the wall, not the moodboard.</div>
    <div class="divi-b">Eight core styles plus one second-line backpack: nine styles across three drops. Full-grain leather SLG and canvas-and-leather carry, priced into three gaps we observed live on the shelf, dated 20 Jul 2026. BOM-level costs, tiered sources, and the seven RFQs that make it quote-grade.</div>
    <div class="codestrip"><span>QUESTION <b>WHAT SHIPS, AGAINST WHAT GAP?</b></span><span>ANSWER <b class="v">NINE STYLES, THREE OBSERVED GAPS</b></span></div>
   </div>`, {code:"TRACK 03 / PRODUCT & DESIGN", track:"ROUND TWO · SS27", nofoot:true, dark:true});

/* T03-S2 kills */
S(
  kick("Method · verified against the season, the shelf, and ourselves")+
  H("Verify-or-kill on trends, materials and the live shelf. The casualties:")+
  cols([
    {k:"KILLED", title:"“The cap is the new sneaker”, as data", body:"No audit-grade cap-market statistic exists anywhere. The narrative survives only as a labeled assumption [A]. Runway plus one brand's decade [C] is all the evidence there is, so that's all we claim."},
    {k:"CUT", title:"One handle + every trend mill", body:"An Indian commentary handle we'd listed doesn't verifiably exist. All trend-SEO content mills excluded. Culture layer rebuilt from verified accounts only."},
    {k:"CAUGHT", title:"3 wall SKUs priced with no COGS", body:"Our own hostile pass found the pouch, card holder and blue cap priced without BOM rows in a section titled “BOM-level.” All three now carry [A] build-ups and enter the model only when RFQ-backed."},
    {k:"CORRECTED", title:"“Category of one” over-claim", body:"Our draft said “real leather at ₹2,200 is a category of one,” refuted by our own annex. The precise claim: no brand on the shelf writes “full-grain.”"}
  ]),
  {code:"TRACK 03 / METHOD"});

/* T03-S3 runway */
S(
  kick("Trends · what the SS27 runways just showed, June 2026, verified")+
  H("Milan reduced, Paris exulted. The overlap is RUMOAR's lane.")+
  table(["House (SS27)","The accessories signal","What we take"],[
    [{t:"Prada",b:1},"Belt bags clipped at the hip via carabiner; utility bags on belt loops [N, Wallpaper]","Validates our clip-pouch motif, this exact season"],
    [{t:"Hermès (studio)",b:1},"Toile-and-leather carryalls; sand/kraft/graphite palette [N, WWD]","Our material grammar: canvas body, leather load points"],
    [{t:"Louis Vuitton",b:1},"Sun-faded duffel, butter-yellow Alma, colour as sun-bleach [N, Complex]","The neutral field our palette runs on"],
    [{t:"Junya Watanabe",b:1},"Bejewelled New Era trucker caps; pearls over tracksuits [N, Dazed]","The cap as the season's jewellery, our cap program's licence"],
    [{t:"Dior Men (Anderson)",b:1},"Gilt chains, brooches, jewellery as menswear's breakout [N, AnOther]","Why jewellery is our SS28 watch-list, not our SS27 wall"],
    [{t:"Wooyoungmi / Auralee",b:1},"Laundry-bag totes with leather handles; western belts [N, Wallpaper]","The masculine canvas-leather tote typology, run this season"]
  ],[20,52,28])+
  take("The sharpest forecasting datapoint: Grace Wales Bonner is announced to debut at Hermès menswear, Jan 2027 [N, WWD]. The most-watched house just canonized quiet, sport-inflected, craft-led menswear. That is RUMOAR's register."),
  {code:"TRACK 03 / TRENDS"});

/* T03-S4 palette */
S(
  kick("Colour · the verified SS27 season, worn in the Engine palette")+
  H("A quiet field, one loud flash. Milan's reduction wearing Paris's accent.")+
  `<div class="split6-6">
    <div>
      <div class="chart-t">The RUMOAR field, from the brand system</div>
      <div class="swrow">
        <div class="sw2" style="background:#F6F5F2;color:#17171B;border:1px solid var(--hair)"><b>Chalk</b><span>#F6F5F2</span></div>
        <div class="sw2" style="background:#ECEBE7;color:#17171B;border:1px solid var(--hair)"><b>Porcelain</b><span>#ECEBE7</span></div>
        <div class="sw2" style="background:#5C5C64;color:#fff"><b>Graphite</b><span>#5C5C64</span></div>
        <div class="sw2" style="background:#17171B;color:#fff"><b>Ink</b><span>#17171B</span></div>
      </div>
      <div class="swrow" style="margin-top:10px">
        <div class="sw2" style="background:#4B4673;color:#fff"><b>Dusk</b><span>accent · deep dusk neutral</span></div>
        <div class="sw2" style="background:#B3ACEF;color:#17171B"><b>Periwinkle</b><span>the accent, on dark</span></div>
        <div class="sw2" style="background:#6152F0;color:#fff"><b>Voltage</b><span>the one flash · drops</span></div>
      </div>
      <div class="chart-n">Stock-dye neutrals plus natural full-grain leather (the material itself, not a palette colour): the launch constraint (custom dye binds at ~100m/colour [C-L]) and the aesthetic agree.</div>
    </div>
    <div>
      <div class="chart-t">The verified SS27 / 2027 season signals [C, corroborated N]</div>
      ${ul([
        "WGSN × Coloro released the SS27 direction 29 Apr 2025 [C, corroborated N]: a reduced neutral field with saturated pop accents, the register our monochrome-plus-one-flash system is built for.",
        "The season's brightest signals (a luminous blue CoY, energy orange, pop pink) we wear only as a flash, never on the body: one cap colourway, a lining, a pull. India filter [A]: pop brights stay off-body for a 23 to 28 smart-casual buyer.",
        "Corroborating signal: the 2026 CoY family is surging in retail sell-through right now (Trendalytics, 2 Jul 26 [N-vendor])."
      ])}
    </div>
  </div>`,
  {code:"TRACK 03 / COLOUR"});

/* T03-S5 look & feel */
S(
  kick("Design · quiet street, construction you can see")+
  H("Whose discipline we borrow, named, and whose we refuse.")+
  cols([
    {k:"MOTIVES", body:"Construction honesty as decoration: visible saddle stitching, burnished edges, hardware with weight, so the spec sheet does the advertising. The utility clip: one carabiner-mounted pouch that rides sling strap, belt loop and tote (Prada-validated this season [N]). Rumour numbering stamped inside every flap, collectability without logos."},
    {k:"BORROWED, SPECIFICALLY", body:"Aimé Leon Dore: casting and world (real people, Track 02's semiotic spine). Arc'teryx Veilance: construction honesty. Hermès: the toile-and-leather pairing, canvas body with leather load points, translated to accessible premium. Prada SS27: utility-clip modularity."},
    {k:"REFUSED, SPECIFICALLY", body:"Mokobara's colourway theatre: 12 colourways of one sling, observed [Obs]. Urban Monkey's graphic loudness. Both owned; both the opposite of a wall where the buyer who wants quiet currently has no one.", dark:true}
  ]),
  {code:"TRACK 03 / DESIGN"});

/* T03-S6 gaps */
S(
  kick("The shelf · three gaps, observed live, 20 July 2026")+
  H("Not moodboard claims: the competitive shelf, with the receipts.")+
  cols([
    {k:"₹2.5 to 4K", title:"the real-leather sling void", body:"No real-leather men's sling exists in the band: Mokobara's Friday sling is ₹3,499 in polyester [Obs]; the next leather option is Bellroy at ₹7,495+ [Obs]. Our full-grain hero lands at ₹3,000."},
    {k:"EMPTY", title:"the wallet slot, that day", body:"Mokobara's wallet collection observed live-empty [Obs]. The ₹1.2 to 2.4K band held no real-leather wallet. No brand on the shelf writes “full-grain”: the only budget leather (DailyObjects ₹999) says “genuine.” Ours: full-grain, ₹2,200.", dark:true},
    {k:"ZERO", title:"minimal fashion caps", body:"Urban Monkey owns graphic streetwear (core ₹1,200 to 1,450 [Obs]); SALTY sells trend commodity ₹649 to 1,399 [Obs]. Nobody sells the minimal, structured, fashion-positioned cap. Ours: ₹1,100. A positioning gap, not a price war."}
  ])+
  take("Material truth on the observed shelf: Mokobara “reverse-coated polyester,” “vegan leather trims.” Uppercase “Polyester.” Urban Monkey bifold “100% PVC.” [all Obs] Full-grain, with tannage and cluster named on-product, is a category of one on this shelf."),
  {code:"TRACK 03 / THE SHELF"});

/* T03-S7 wall */
S(
  kick("The wall · nine styles, every one aimed at an observed gap")+
  H("Full-grain leather or canvas-with-leather-trim carry; washed-twill caps.")+
  table(["#","Style","Spec","MRP","Why it's on the wall"],[
    ["1",{t:"Sling, compact crossbody (hero)",b:1},"Full-grain veg-tan, YKK, carabiner-ready","₹3,000","The ₹2.5 to 4K real-leather void [Obs]"],
    ["2",{t:"Sling, canvas roll-top",b:1},"16oz canvas + leather load points","₹2,499","Same void, lighter entry; monsoon-practical"],
    ["3",{t:"Clip pouch (the motif)",b:1},"Full-grain; rides strap / belt / tote","₹1,499","Prada SS27's exact gesture [N]; attach engine"],
    ["4",{t:"Bifold wallet",b:1},"Full-grain, gift-boxed, atelier monogram","₹2,200","The vacated band [Obs]; nobody writes “full-grain”"],
    ["5",{t:"Card holder",b:1},"Full-grain, 3-slot","₹1,299","Entry to the leather story; gifting engine"],
    ["6",{t:"Cap, structured 6-panel minimal",b:1},"Washed twill, tonal mark only","₹1,100","The minimal-cap gap [Obs]"],
    ["7",{t:"Cap, the one loud unit (Drop 2)",b:1},"Season flash colourway","₹1,300","The CoY as a flash; Junya made the cap jewellery [N]"],
    ["8",{t:"Tote, canvas + leather",b:1},"16oz canvas, leather handles/base","₹2,499","No masculine option under ₹6,499 [Obs]"],
    ["9",{t:"Backpack (second-line, Drop 3)",b:1},"Canvas + leather trim, one silhouette","₹4,500","Most contested ladder [Obs]; follows demand"]
  ],[4,26,24,9,37]),
  {code:"TRACK 03 / THE WALL"});

/* T03-S8 drops */
S(
  kick("Drops · the wall is a programme, not a warehouse")+
  H("Three drops, reconciled with Track 02's PO and Track 01's inventory rule.")+
  cols([
    {k:"RUMOUR 001", title:"#1 hero sling · #4 bifold · #6 minimal cap", body:"Exactly the Track 02 W1 PO: 150 slings + 200 caps + 150 wallets, the one forecast-based PO, stated as the exception (a waitlist can't exist before the brand does). Launches with the 90-day community test.", dark:true},
    {k:"RUMOUR 002", title:"#2 roll-top · #3 clip pouch · #5 card holder · #7 flash cap", body:"POs cut only against waitlists, per Track 01. The flash cap ships here via one shared ~100m dye lot across cap bodies, linings and pull tapes, or the nearest stock-dye tone if the lot misses [A]."},
    {k:"RUMOUR 003", title:"#8 tote · #9 backpack", body:"The backpack enters last, waitlist-sensed, one silhouette, because the shelf's most contested ladder is where India's cost edge is thinnest (Track 01: about parity at small batch)."}
  ])+
  take("The wallet reconciliation, owed from Track 02: as commodity utility it IS thin-WTP. The ₹2,200 bifold works because the wall changes its job: full-grain grade (unclaimed on-shelf), gift box plus monogram, and the engine recommending it as a look's keystone."),
  {code:"TRACK 03 / DROPS"});

/* T03-S9 BOM */
S(
  kick("Costs · BOM-level, tiered, listings shown as listings")+
  H("Multiples 2.4 to 3.7×, vs the industry's 4 to 6× convention.")+
  table(["SKU","BOM band (₹, landed)","COGS","Verdict","MRP","×"],[
    ["Cap #6","121 to 340","450","Conservative; headroom absorbs wash treatments","1,100","2.4"],
    ["Bifold #4","330 to 620 (2.0 sq ft, 75 to 80% yield [A])","800","Above band; full-grain gift-boxed","2,200","2.75"],
    ["Sling #1","770 to 1,640","1,250","Mid-band; matches listed leather slings [C-L]","3,000","2.4"],
    ["Backpack #9","1,010 to 1,600 canvas-trim","1,900","High in canvas-trim band; spec is canvas-and-leather","4,500","2.4"],
    [{t:"Tote #8 [A]"},"700 to 850","800","Zero downside headroom, flagged","2,499","3.1"],
    [{t:"Pouch #3 [A]"},"210 to 400","450","RFQ pending","1,499","3.3"],
    [{t:"Card holder #5 [A]"},"180 to 310","350","RFQ pending","1,299","3.7"],
    [{t:"Flash cap #7 [A]"},"180 to 460","520","RFQ pending","1,300","2.5"]
  ],[16,28,8,32,8,8])+
  ul([
    "No heroic markups needed to hold the audited ~51% blended GM (~53% at the Rumour 001 mix). The audited model prices four styles plus the tote; the roll-top sling #2 shares the canvas-tote basis (~₹800 [A]); pouch, card holder and flash cap enter it only when their RFQ-backed COGS do.",
    "Seven RFQs named: CMT at 3 volumes, YKK OEM, tannery lots, waxed canvas, cap sampling, embroidery, a 100-unit ex-works cross-quote. Three prototypes per hero before any PO: the wall walks in as objects."
  ]),
  {code:"TRACK 03 / COSTS"});

/* T03-S10 vs shelf */
S(
  kick("Vs the shelf · why he picks this up instead of Mokobara or Uppercase")+
  H("Every claim checkable against the observed shelf, including what we don't claim.")+
  `<div class="mini6">
    <div class="mc"><div class="mck">1 · MATERIAL TRUTH</div><div class="mcb">Their PDPs: “reverse-coated polyester,” “vegan leather trims” (Mokobara); “Polyester” (Uppercase); “100% PVC” (UM bifold) [all Obs]. No brand writes “full-grain.” Ours names the tannage and the cluster on the product.</div></div>
    <div class="mc"><div class="mck">2 · MEN'S-FIRST HOUSE</div><div class="mcb">Mokobara is travel-gear; Uppercase is eco-luggage; Zouk's premium slings are “created for women” by their own copy [Obs]. The men's-first accessories house is structurally absent.</div></div>
    <div class="mc"><div class="mck">3 · RESTRAINT</div><div class="mcb">Twelve colourways of one Mokobara sling [Obs] vs stock-dye neutrals and one flash. The buyer who wants quiet currently has no one.</div></div>
    <div class="mc"><div class="mck">4 · THE ENGINE ATTACH</div><div class="mcb">Nobody else can say: this sling completes the look you already own, with the proof on your phone. Tier-2 keystones convert the wall into outfits.</div></div>
    <div class="mc"><div class="mck">5 · FULL-PRICE INTEGRITY</div><div class="mcb">The shelf ran 30 to 56% off on the day observed [Obs, mid-sale]. Drops and honest batches never train the discount reflex. Risk owned: Assumption #4.</div></div>
    <div class="mc d"><div class="mck">6 · WHAT WE DON'T CLAIM [A]</div><div class="mcb">Not a better trolley (Mokobara's is theirs), not sustainability (Uppercase's rPET owns it), not price (₹499 to 1,199 is saturated), not monogram-as-novelty (ours differs: full-grain, atelier, gift).</div></div>
  </div>`,
  {code:"TRACK 03 / VS THE SHELF"});

/* T03-S11 off wall */
S(
  kick("Discipline · what's deliberately OFF the wall, and why")+
  H("A wall is defined by what it refuses. Each exclusion has a checkable reason.")+
  `<div class="mini6">
    <div class="mc"><div class="mck b">Luggage &amp; duffels</div><div class="mcb">Mokobara/Safari/funded turf; working-capital heavy, the category the graveyard died in [F, Track 01]. Never.</div></div>
    <div class="mc"><div class="mck b">Sunglasses</div><div class="mcb">Discount-gamed, churn-heavy: 36 of ~47 UM styles observed sold out [Obs]. Optical QC is another competence. Only with a licensed partner.</div></div>
    <div class="mc"><div class="mck b">Belts (standalone)</div><div class="mcb">Thin willingness-to-pay [A, KB triangulation]. Enters later as monogram gifting.</div></div>
    <div class="mc"><div class="mck b">Jewellery</div><div class="mcb">The runways' breakout [N], which is exactly why we wait: metal QC, skin-contact compliance, taste-risk. SS28 watch-list, stated now.</div></div>
    <div class="mc"><div class="mck b">Technical synthetic packs</div><div class="mcb">China wins at volume [Track 01]; breaks the India-made story at launch.</div></div>
    <div class="mc"><div class="mck b">Fragrance</div><div class="mcb">Not a wall SKU: it's the After-SS27 repeat engine (next).</div></div>
  </div>`+
  take("The buyers'-room read: we saw the jewellery wave and chose sequencing over FOMO; we saw the backpack ladder and chose not to lead with it. Restraint is the product strategy, not just the aesthetic."),
  {code:"TRACK 03 / DISCIPLINE"});

/* T03-S12 after ss27 */
S(
  kick("Next · after SS27, the wall becomes a ladder")+
  H("Caps, wallets and the card holder already ship on the SS27 wall. So the sequencing is:")+
  cols([
    {k:"AW27", title:"Fragrance, Rumour № Noir", body:"The consumable that turns a durables buyer into a repeat customer (Track 01's LTV engine). Nykaa's Perfumery format: ~3× regular-store AOV, 45%+ from men's fragrance [C]; Gen Z usage 83% [N, Circana US panel]. Dropped via the same waitlist. Caveat carried: India perfume growth is contested (5.6 to ~19.5% CAGR), an attach engine, not a hero bet.", dark:true},
    {k:"AW27 to SS28", title:"The monogram gifting programme", body:"Belts enter as gifts; the card holder, already on the wall, gets its atelier monogram program. Thin-WTP utility converted to sentiment, at full-grain grade."},
    {k:"SS28", title:"Jewellery watch-list", body:"The runway breakout [N] plus SALTY's men's jewellery already 25 to 30% of its business [C]. We enter only with a specialist partner: metal QC is a different factory discipline."}
  ])+
  take("Never, stated: luggage. The graveyard category. The wall stays on the body, off the carousel."),
  {code:"TRACK 03 / NEXT"});

/* T03-S13 assumptions */
S(
  kick("Risk · what breaks Track 03, the assumptions register")+
  H("Five load-bearing assumptions, base values, break conditions.")+
  table(["#","Assumption","Base","Breaks if"],[
    ["1","CMT bands ₹40 to 350/piece by SKU","Implied [A]; labour 20 to 40% across sources [C]","Quotes land ≥ 2× → COGS +19 to 33%; margins compress toward the filed-cluster floor"],
    ["2","Full-grain veg-tan ₹90 to 160/sq ft; ~75 to 80% yield","Listings [C-L]; yield [A]","Small-lot premium or QC rejects push wallet/sling COGS above model"],
    ["3","Observed shelf gaps persist to launch","[Obs, single-day, mid-sale; wallet vacancy double-confirmed]","Mokobara restocks/relaunches wallets or adds leather; Snitch occupies the gaps"],
    ["4","Full-price integrity survives a discount-trained shelf","Drop scarcity + engine attach [A]","Sell-through &lt; 50% at full price → the model's ASP assumptions fail"],
    ["5","Stock-dye + natural leather reads premium, not plain","Design position [A]; SS27 reduction signal [N]","Quiet reads boring → colourway pressure → the Mokobara trap"]
  ],[5,34,28,33]),
  {code:"TRACK 03 / RISK"});

/* T03 close */
S(`<div class="divi">
    <div class="divi-no">TRACK 03 · CLOSE</div>
    <div class="divi-t">The wall walks into the room<br>as objects, not slides.</div>
    <div class="divi-s">Nine styles priced into gaps we observed and dated.</div>
    <div class="divi-b">A BOM that shows its work and names its seven missing quotes. A palette from the primary source, filtered for the man who'll actually wear it. And three prototypes per hero before a single PO. SS27 verified show-by-show; the shelf audited live; the wall reconciled to Track 02's PO and Track 01's inventory rule.</div>
   </div>`, {code:"TRACK 03 / PRODUCT & DESIGN", track:"ROUND TWO · SS27", nofoot:true, dark:true});

/* =================== MASTER CLOSE =================== */
S(`<div class="cov">
    <div class="cov-mark" style="font-size:118px">One thesis,<br>composed three ways.</div>
    <div class="cov-sub" style="margin-top:26px">A men's-fashion-first styling engine, built capital-light because the category's real killers are the balance sheet and CAC. A submission whose weak points are named by us, not found by you.</div>
    <div class="closegrid">
      <div class="cg"><div class="cgk">STRATEGY</div><div class="cgb">Real business, capital-light by design: breakeven about Year 5 on ₹25 to 35 Cr; the moat compounds.</div></div>
      <div class="cg"><div class="cgk">BRAND</div><div class="cgb">A falsifiable 90-day CAC test at ₹2.3L: prove the moat before scaling capital, or find out cheap.</div></div>
      <div class="cg"><div class="cgk">PRODUCT</div><div class="cgb">Nine SS27 styles in three shelf gaps observed live; full-grain, made in India, drop-sequenced.</div></div>
      <div class="cg"><div class="cgk">THE PACK</div><div class="cgb">This deck plus financial model, 63-claim red-team audit, and the open knowledge base.</div></div>
    </div>
    <div class="codestrip"><span>PRI · RUMOAR ROUND TWO · <b class="v">SS27</b></span></div>
   </div>`, {code:"RUMOAR · THE ENGINE", track:"THE COMPLETE SUBMISSION", nofoot:true, dark:true});

function DOC(sl){ return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RUMOAR — The Complete Submission</title>
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
.hud{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:60;display:flex;align-items:center;gap:10px;background:rgba(23,23,27,.82);backdrop-filter:blur(6px);border:1px solid var(--hairdk);border-radius:999px;padding:7px 12px;font-family:var(--mono);font-size:12px;color:var(--mist);opacity:.8;transition:opacity .3s}
.hud:hover{opacity:1}
.hud button{background:none;border:0;color:var(--porcelain);cursor:pointer;line-height:1;padding:4px 6px;border-radius:8px;display:flex;align-items:center;justify-content:center}
.hud button:hover{background:var(--carbon);color:var(--peri)}
.hud .ct{letter-spacing:.08em;min-width:58px;text-align:center}.hud .ct b{color:var(--porcelain)}
.material-symbols-rounded{font-family:'Material Symbols Rounded';font-weight:normal;font-style:normal;font-size:22px;line-height:1;letter-spacing:normal;text-transform:none;display:inline-block;white-space:nowrap;word-wrap:normal;direction:ltr;-webkit-font-feature-settings:'liga';font-feature-settings:'liga';-webkit-font-smoothing:antialiased;font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24}
.slide.chalk{background:var(--chalk)}
.slide.dark{background:var(--ink);color:var(--porcelain)}
.body{position:absolute;left:72px;right:72px;top:88px;bottom:64px}
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
