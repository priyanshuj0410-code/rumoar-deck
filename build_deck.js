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

/* 02 · THE VIBE-CODER */
S(
  kick("The man")+
  H("Most men have the taste.<br>They don't have the translation.")+
  sub("The category sells products and leaves the outfit to him. Nobody sells the translation, turning a feeling into a finished look for his build, his colouring, his occasion.")+
  cols([
    {k:"WHO HE IS", title:"The vibe-coder", body:"23 to 28, metro, early-career. He recognises great style but can't yet generate it. Fluent in marketing, allergic to being sold to."},
    {k:"THE JOB", title:"Feeling to look", body:"He can pick the pieces. He can't compose the look. That job, turning taste into an outfit, is unowned by anyone on the shelf."},
    {k:"THE WEDGE", title:"A stylist, not a store", body:"RUMOAR turns his vibe into his look, starting with what he already owns. He belongs to it; he isn't sold at.", dark:true}
  ]),
  {});

/* 03 · THE EVIDENCE, AND IT'S RISING */
S(
  kick("The evidence")+
  H("He already asks for help, where ads can't reach him.")+
  tiles([
    {n:"230K+", label:"r/IndianFashionAddicts members", desc:"~161K weekly visitors, core 18 to 34; a room that filters out anything that smells like an ad<a class='cite' href='https://thenodmag.com/content/reddit-online-fashion-communities-men-advice-style' target='_blank' rel='noopener'>[1]</a>"},
    {n:"7.2B", label:"GRWM views in India, 2024", desc:"“how do I dress” is mass behaviour, not a niche<a class='cite' href='https://business.google.com/in/think/consumer-insights/fashion-beauty-influencer-marketing-india/' target='_blank' rel='noopener'>[2]</a>"},
    {n:"8.5M", label:"subs, three men's-style channels", desc:"confident dressers don't consume how-to-style at this scale<sup class='cite cpop' data-pop='Live counts retrieved 19 to 20 July 2026: YouTube subscribers via SocialCounts (YouTube Data API); Instagram followers and engagement via HypeAuditor and Qoruz. Third-party tracker reads, dated, and expected to drift.'>[3]</sup>"}
  ])+
  take("Demand for translation is rising, and it gathers in the places advertising can't follow. Accessory use among Gen Z men has <b>doubled</b> (Redseer)<a class='cite' href='https://redseer.com/articles/gen-z-defining-trends-influencing-spends/' target='_blank' rel='noopener'>[4]</a>. The behaviour has arrived; the styling house hasn't."),
  {});

/* 04 · THE GRAVEYARD */
S(
  kick("The category")+
  H("The winners and the graveyard run the same margins.")+
  `<div class="split6-6">
    <div>
      <div class="chart-t">Marketing spend, % of revenue (FY25 filings)<a class='cite' href='https://entrackr.com/fintrackr/mokobara-revenue-doubles-to-rs-230-cr-in-fy25-11066667' target='_blank' rel='noopener'>[5]</a></div>
      ${vbars(["DailyObjects","Mokobara","Uppercase","Zouk"],[17,20,25,45],{fmt:v=>v+"%",max:50,W:600,H:300})}
      <div class="chart-n">Where margins are filed, they cluster near 51%. One line item, marketing, separates a business from a bonfire.</div>
    </div>
    <div>${ul([
      "Baggit went insolvent over a ₹1.11 Cr bill<a class='cite' href='https://www.freepressjournal.in/mumbai/mumbai-news-nclt-admits-insolvency-plea-against-baggit-india-over-111-crore-operational-debt' target='_blank' rel='noopener'>[6]</a>; VIP lost ₹338 Cr in FY26<a class='cite' href='https://www.screener.in/company/VIPIND/consolidated/' target='_blank' rel='noopener'>[7]</a>. Neither died of weak demand.",
      "Zouk spent 45% of revenue on ads to lose ₹19.6 Cr. Mokobara lost ₹10 Cr at ~20%<a class='cite' href='https://entrackr.com/fintrackr/mokobara-revenue-doubles-to-rs-230-cr-in-fy25-11066667' target='_blank' rel='noopener'>[5]</a>.",
      "The category's killers are working capital and acquisition cost. So RUMOAR is engineered capital-light and community-led. Discipline is the product, not a virtue."
    ])}</div>
  </div>`,
  {});

/* 05 · A WINNABLE SLICE (market sizing) */
S(
  kick("The market")+
  H("A winnable slice, sized from people up.")+
  `<div class="split6-6">
    <div>
      <div class="funnel">
        <div class="fr"><span class="fl">Urban men, 18 to 35</span><span class="fv">~80M</span></div>
        <div class="fn">Worldometer / UN age structure, ±15% [A]<sup class='cite cpop' data-pop='Derived from UN and Worldometer age structure: urban Indian men 18 to 35 land at roughly 83 to 86M. Stated at plus or minus 15% to bracket migration skew (higher) against stricter urban definitions (lower).'>[8]</sup></div>
        <div class="fr"><span class="fl">Income-qualified (~15%)</span><span class="fv">~12M</span></div>
        <div class="fn">Rebased from Goldman affluence, honest range 8 to 14M<sup class='cite cpop' data-pop='Rebased in our model from Goldman Sachs&#39; affluent-India base (60M to 100M by 2027). The 15% income-qualified share is the audited rebasing, down from a pre-audit 17.5% that over-applied all-adult affluence to a younger cohort. Honest range 8 to 14M.'>[9]</sup></div>
        <div class="fr"><span class="fl">Would buy premium accessories (~30%) × ₹4,000/yr</span><span class="fv">the base</span></div>
        <div class="sambar">Serviceable market ≈ ₹1,400 Cr<sup class='cite cpop' data-pop='RUMOAR financial model (audited). SAM is roughly 12M qualified times about 30% penetration times about 4,000 rupees annual spend, near 1,400 crore. Unit economics rest on the filed-comparable ~51% gross-margin cluster; the five-year plan, capital and breakeven follow. Every input is a toggle.'>[10]</sup></div>
      </div>
    </div>
    <div>${ul([
      "A scoped range, not a point: ₹600 to 2,500 Cr as penetration and spend swing. We show the swing rather than pick the flattering number.",
      "The Year-5 plan, ₹160 Cr, is ~11% of the base case. Winnable in a fragmented field, not trivial.",
      "The category is being validated by fresh capital right now; the behaviour is arriving faster than the skill to style it."
    ])}</div>
  </div>`,
  {});

/* 06 · THE UNOWNED GAP */
S(
  kick("The gap")+
  H("No one owns men's-first, community-led, styling-led.")+
  table(["Who's there","What they are","The blind spot"],[
    [{t:"Mokobara",b:1},"Premium travel gear","Twelve colourways of one sling, no styling<sup class='cite cpop' data-pop='Our own shelf audit, live-observed 20 July 2026 on mokobara.com, uppercase.co.in, urbanmonkey.com, dailyobjects.com, zouk.co.in and nappadori.com. A single-day snapshot; the wallet-band vacancy was double-confirmed.'>[11]</sup>"],
    [{t:"Uppercase",b:1},"Eco-luggage","A category, not a man's look"],
    [{t:"Snitch",b:1},"Fast fashion at scale","Volume, not curation"],
    [{t:"Urban Monkey",b:1},"Loud streetwear","The man who wants quiet has no one"],
    [{t:"Zouk",b:1},"Premium slings, by their own copy “for women”","Not built for him at all"]
  ],[20,42,38])+
  take("Each is a good business. None is a men's-first styling house. The position is unoccupied, and the window is closing from above faster than from below, so speed matters more than the market's size."),
  {});

/* 07 · THE ANSWER (positioning + engine) */
S(
  kick("The answer")+
  H("A look isn't bought. It's composed.")+
  `<div class="posbox">For the man who knows the look he wants but not how to build it, <b style="color:var(--peri)">RUMOAR turns his vibe into his look, starting with what he already owns.</b> A stylist he belongs to, not a store that sells at him.</div>`+
  cols([
    {k:"01 / YOUR CLOSET", title:"Buy nothing.", body:"A complete look from what he already owns. Proof before purchase; the trust engine that disarms the distrust reflex at the root."},
    {k:"02 / THE ELEVATE", title:"One keystone.", body:"“You're ninety percent there. This sling is the ten.” One confident add, never a cart."},
    {k:"03 / THE CEILING", title:"The peak look.", body:"Including pieces we don't sell. Every gap we can't fill becomes a ranked, pre-validated product request.", dark:true}
  ]),
  {});

/* 08 · SAYING IT WITHOUT SAYING IT (brand codes) */
S(
  kick("The codes")+
  H("Saying it without saying it.")+
  sub("Restraint over explanation. Recognition should come from palette and photography before the name does. The anti-codes matter as much as the codes: no SALE, no celebrity launch, no stock models.")+
  cols([
    {k:"VISUAL", title:"Object as art", body:"A restrained wordmark, never a shouted logo. An edited palette. The sling shot as a portrait, in hard light, not an e-commerce cutout. Casting from the community, not agencies. Texture close-ups that prove the make."},
    {k:"VERBAL", title:"Vibe-code your look", body:"The brand-native verb. Tiers that position on their own: Your Closet, The Elevate, The Ceiling. Drops named and numbered as Rumours, 001 first. The waitlist button reads “hear it first.” Captions literate, never “PREMIUM QUALITY.”"},
    {k:"RITUAL", title:"Induction, not a coupon", body:"The unboxing card names the maker's cluster, the drop number, a QR into the community. Monogramming turns a wallet into a gift object. Belonging, engineered.", dark:true}
  ]),
  {});

/* 09 · WHAT SS27 IS TELLING US (trends) */
S(
  kick("The trend read")+
  H("Milan reduced. Paris exulted. The overlap is our lane.")+
  `<div class="split7-5">
    <div>${table(["House, SS27","The accessories signal"],[
      [{t:"Prada",b:1},"Belt bags clipped at the hip by carabiner; utility on belt loops<a class='cite' href='https://www.wallpaper.com/fashion-beauty/best-accessories-ss-2027-menswear-fashion-month' target='_blank' rel='noopener'>[12]</a>"],
      [{t:"Hermès",b:1},"Toile-and-leather carryalls; sand, kraft, graphite"],
      [{t:"Louis Vuitton",b:1},"Sun-faded duffel, butter-yellow, colour as bleach not neon"],
      [{t:"Junya Watanabe",b:1},"The cap treated as jewellery, the season's breakout gesture"]
    ],[26,74])}</div>
    <div class="sidebox">
      <div class="bigcap" style="font-family:var(--display);font-size:18px;margin-bottom:12px">Read-through</div>
      <div class="bigdesc">Crossbody and belt-worn beat hand-carry; no men's mini-bag moment; suede alive as accent; jewellery is the watch-list. And the tell: <b style="color:var(--ink)">Grace Wales Bonner debuts at Hermès menswear in January 2027<a class='cite' href='https://wwd.com/business-news/financial/hermes-grace-wales-bonner-menswear-creative-director-market-1238319083' target='_blank' rel='noopener'>[12]</a></b>, quiet craft-led menswear at the most-watched house. That is the direction of travel, and it is our register.</div>
    </div>
  </div>`,
  {});

/* 10 · THE LOOK AND FEEL */
S(
  kick("Look and feel")+
  H("Quiet street: reduction, with one loud accent.")+
  `<div class="chart-t">The SS27 product palette, filtered for India (WGSN × Coloro)<a class='cite' href='https://www.wgsn.com/en/wgsn/press/press-releases/wgsn-and-coloro-reveal-colour-year-2027-luminous-blue-and-s-s-27-key' target='_blank' rel='noopener'>[13]</a></div>
   <div class="swrow" style="margin-bottom:18px">
     <div class="sw2" style="background:#E7E2D6;color:#17171B"><b>Bone</b><span>BASE</span></div>
     <div class="sw2" style="background:#33332F;color:#F6F5F2"><b>Charcoal</b><span>BASE</span></div>
     <div class="sw2" style="background:#5E5B3E;color:#F6F5F2"><b>Olive</b><span>BASE</span></div>
     <div class="sw2" style="background:#9C6B4A;color:#F6F5F2"><b>Clay</b><span>SEASON</span></div>
     <div class="sw2" style="background:#5B6B4A;color:#F6F5F2"><b>Meadowland</b><span>SEASON</span></div>
     <div class="sw2" style="background:#2F5BD1;color:#fff"><b>Luminous Blue</b><span>CoY 2027</span></div>
   </div>`+
  cols([
    {k:"MOTIVES", title:"Construction as decoration", body:"Visible saddle stitch, burnished edges, hardware with weight. The Veilance discipline: let the make be the design, let the spec sheet do the advertising."},
    {k:"THE MODULARITY", title:"One clip, many carries", body:"A carabiner pouch that rides sling strap, belt loop or tote, the exact gesture Prada validated this season<a class='cite' href='https://www.wallpaper.com/fashion-beauty/best-accessories-ss-2027-menswear-fashion-month' target='_blank' rel='noopener'>[12]</a>. One motif makes the wall modular."},
    {k:"THE DISCIPLINE", title:"Colour as a flash", body:"Luminous Blue on a zip pull, a lining, one cap only. Pop Pink and Energy Orange stay off the body: runway-true, India-street-false. Stock-dye neutrals at launch.<a class='cite' href='https://fabriclore.com/blogs/fashion-business-lifestyle-trends/have-your-own-custom-color-and-want-us-to-dye-fabric-for-you' target='_blank' rel='noopener'>[14]</a>", dark:true}
  ]),
  {});

/* 11 · THE WALL */
S(
  kick("The wall")+
  H("Nine styles, three drops, three shelf gaps.")+
  table(["The style","MRP","The gap it fills, observed live 20 Jul 2026<sup class='cite cpop' data-pop='Our own shelf audit, live-observed 20 July 2026 on mokobara.com, uppercase.co.in, urbanmonkey.com, dailyobjects.com, zouk.co.in and nappadori.com. A single-day snapshot; the wallet-band vacancy was double-confirmed.'>[11]</sup>"],[
    [{t:"Leather sling, full-grain veg-tan",b:1},{t:"₹3,000",b:1},"No real-leather men's sling exists between ₹2.5 and 4K"],
    [{t:"Canvas roll-top sling",b:1},{t:"₹2,499",b:1},"Same void, lighter entry, monsoon-practical"],
    [{t:"Clip pouch (the motif)",b:1},{t:"₹1,499",b:1},"Prada's exact SS27 gesture; the attach-rate engine"],
    [{t:"Bifold wallet, full-grain",b:1},{t:"₹2,200",b:1},"No real-leather wallet in the band; no one writes “full-grain”"],
    [{t:"Card holder, full-grain",b:1},{t:"₹1,299",b:1},"Entry ticket to the leather story; future monogram gift"],
    [{t:"Cap, structured minimal",b:1},{t:"₹1,100",b:1},"Streetwear owns loud; nobody owns the quiet cap"],
    [{t:"Cap, Luminous Blue (Drop 2)",b:1},{t:"₹1,300",b:1},"The Colour of the Year worn as a flash"],
    [{t:"Canvas + leather tote",b:1},{t:"₹2,499",b:1},"No masculine canvas-leather tote under Mokobara's ₹6,499"],
    [{t:"Backpack, second-line (Drop 3)",b:1},{t:"₹4,500",b:1},"The contested ladder; it follows demand, never leads"]
  ],[38,12,50])+
  take("The wall is what the engine recommends, every style where a Tier-3 gap meets a shelf void. <b>Rumour 001</b> ships the sling, the wallet and the cap: the exact first purchase order; 002 and 003 are cut only against waitlists. Full-grain leather and canvas, made in India, released as drops, never held as a warehouse."),
  {});

/* 12 · WHAT IT'S MADE OF, AND WHAT IT COSTS */
S(
  kick("The economics of a unit")+
  H("Priced into the gap, not above it.")+
  `<div class="split7-5">
    <div>${table(["SKU","Landed COGS","MRP","GM"],[
      ["Cap, minimal","₹450","₹1,100",{t:"~54%",b:1}],
      ["Bifold wallet","₹800","₹2,200",{t:"~57%",b:1}],
      ["Leather sling","₹1,250","₹3,000",{t:"~49%",b:1}],
      ["Backpack","₹1,900","₹4,500",{t:"~46%",b:1}]
    ],[40,22,20,18])}</div>
    <div class="sidebox v">
      <div class="bignum" style="color:#fff;font-size:40px">~51%</div>
      <div class="bigcap" style="color:var(--peri)">blended, ~53% at the Rumour 001 mix.<sup class='cite cpop' data-pop='RUMOAR financial model (audited). SAM is roughly 12M qualified times about 30% penetration times about 4,000 rupees annual spend, near 1,400 crore. Unit economics rest on the filed-comparable ~51% gross-margin cluster; the five-year plan, capital and breakeven follow. Every input is a toggle.'>[10]</sup></div>
      <div class="bigdesc" style="color:var(--mist)">Margins are on net revenue after discount. Landed-to-MRP runs 2.4 to 3.7×, against a 4 to 6× industry convention<a class='cite' href='https://www.aims360.com/fashion-business-resources/apparel-industry-pricing-margin-calculator-wholesale-retail-erp' target='_blank' rel='noopener'>[16]</a>, which is exactly why these prices sit inside the shelf gaps instead of above them. Seven named factory RFQs convert this desk BOM to quote-grade<sup class='cite cpop' data-pop='From our Track 03 product work. The wall&#39;s BOM is built from live India cluster-supplier listings minus an implied cut-make-trim rate (no public per-piece India rate exists), with seven named factory RFQs to reach quote-grade. The after-SS27 read draws on competitor signals such as SALTY&#39;s founder-stated 25 to 30% men&#39;s share.'>[15]</sup>.</div>
    </div>
  </div>`,
  {});

/* 13 · WHY HIM, NOT MOKOBARA */
S(
  kick("On the same shelf")+
  H("Nobody else writes “full-grain.”")+
  table(["On the shelf","What their own copy says","The grade"],[
    [{t:"Mokobara",b:1},"“Reverse-coated polyester,” “vegan leather trims”","No leather"],
    [{t:"Uppercase",b:1},"“Polyester”; warranty excludes “vegan leather”","No leather"],
    [{t:"Urban Monkey",b:1},"Bifold: “100% PVC”<sup class='cite cpop' data-pop='Our own shelf audit, live-observed 20 July 2026 on mokobara.com, uppercase.co.in, urbanmonkey.com, dailyobjects.com, zouk.co.in and nappadori.com. A single-day snapshot; the wallet-band vacancy was double-confirmed.'>[11]</sup>","No leather"],
    [{t:"DailyObjects",b:1},"“Genuine leather,” ₹999","A grade below"],
    [{t:"RUMOAR",b:1},"Full-grain veg-tan, tannage and Kolkata cluster named, ₹2,200",{t:"Category of one",b:1}]
  ],[20,58,22])+
  take("Men's-first where they're travel-gear and eco-luggage. Restraint where the shelf is loud. The engine that says “this completes the look you already own.” And drops that never train the discount reflex. The shelf ran 30 to 56% off the day we looked<sup class='cite cpop' data-pop='Our own shelf audit, live-observed 20 July 2026 on mokobara.com, uppercase.co.in, urbanmonkey.com, dailyobjects.com, zouk.co.in and nappadori.com. A single-day snapshot; the wallet-band vacancy was double-confirmed.'>[11]</sup>."),
  {});

/* 14 · THE MOAT */
S(
  kick("The moat")+
  H("Two layers that compound, two that reinforce.")+
  `<div class="moat">
    <div class="mr"><div class="mk">LAYER 1 · Community-led distribution</div><div class="mb">Growth is a rumour, not a media buy. It holds acquisition cost structurally below peers who spend 17 to 45% of revenue on ads. This is the layer we prove in 90 days.</div></div>
    <div class="mr"><div class="mk">LAYER 2 · Styling-engine data</div><div class="mb">Every session logs what a specific man looks like, owns, wants and can't find, which becomes the ranked queue that cuts the next drop. A marketplace can clone an AI stylist; it cannot clone the personal grain or the demand we have already watched happen.</div></div>
    <div class="mr"><div class="mk">REINFORCEMENT · Supply chain</div><div class="mb">India-made leather and canvas keeps the launch capital-light and the drops frequent, which keeps Layer 1 cheap to run.</div></div>
    <div class="mr"><div class="mk">REINFORCEMENT · Design restraint</div><div class="mb">The reason a taste-led man picks us on a loud shelf. The most copyable layer, which is exactly why it's fourth, not first.</div></div>
  </div>
  <div class="note-b">If Layer 1 fails its test, this is a good niche brand, not a venture outcome. That risk is priced and stated, not discovered later.</div>`,
  {});

/* 15 · BUILT CAPITAL-LIGHT (ops) */
S(
  kick("How it's made")+
  H("Made in India, on the categories where India wins.")+
  `<div class="split6-6">
    <div>${table(["Category","Made-in-India vs China"],[
      [{t:"Wallets, SLG",b:1},"India wins landed cost by ~20 to 25%<sup class='cite cpop' data-pop='RUMOAR financial model (audited). SAM is roughly 12M qualified times about 30% penetration times about 4,000 rupees annual spend, near 1,400 crore. Unit economics rest on the filed-comparable ~51% gross-margin cluster; the five-year plan, capital and breakeven follow. Every input is a toggle.'>[10]</sup>"],
      [{t:"Caps",b:1},"India competitive; GST 2.0 cut cap IGST 12 to 5%<a class='cite' href='https://www.pib.gov.in/PressNoteDetails.aspx?NoteId=155151&amp;ModuleId=3' target='_blank' rel='noopener'>[17]</a>"],
      [{t:"Canvas totes",b:1},"India wins on low-MOQ runs"],
      [{t:"Technical packs",b:1},"China at volume; kept off the launch wall"]
    ],[34,66])}</div>
    <div>${ul([
      "The duty a China import must beat: ~16.5% on bags, ~11% on caps, IGST creditable but paid in cash at the port.<a class='cite' href='https://www.business-standard.com/industry/news/china-india-luggage-bag-brands-made-in-india-manufacturing-shift-126012500235_1.html' target='_blank' rel='noopener'>[17]</a>",
      "Clusters named: Kolkata leather (~50% of India's leather-goods exports<a class='cite' href='https://leatherindia.org/wp-content/uploads/2024/08/overview-Indian-leather-industry-2024.pdf' target='_blank' rel='noopener'>[18]</a>), Kanpur saddlery<a class='cite' href='https://www.knocksense.com/kanpur/kanpur-gi-tag-horse-saddle' target='_blank' rel='noopener'>[19]</a>, Karur canvas, Delhi and Ludhiana caps.",
      "MOQ ~100 per style, 45 to 50-day sling lead<a class='cite' href='https://optimabags.com/pages/backpack-manufacturer' target='_blank' rel='noopener'>[20]</a>, caps and wallets in weeks. Every purchase order after the first is cut against a waitlist, so we only ever make demand we've watched happen."
    ])}</div>
  </div>`,
  {});

/* 16 · PROVE IT FOR ₹2.3 LAKH */
S(
  kick("Go to market")+
  H("Prove the moat for ₹2.3 lakh<br>before spending ₹25 crore.")+
  sub("Ninety days, zero followers, no media budget. Not “we'll go viral,” a falsifiable experiment: measure the marginal cost of the next community-acquired customer, at product-cost stakes.<sup class='cite cpop' data-pop='From our Track 02 plan. The 2.3 lakh rupee budget, the phases, the roster terms and the CAC gates are our labelled plan and assumptions; the 90-day test exists to replace them with measurements.'>[21]</sup>")+
  `<div class="gates">
    <div class="gate"><div class="gv">&lt; ₹350</div><span class="gtag v">SCALE</span><div class="gd">Community becomes the growth engine. Spend follows only what measurably converts.</div></div>
    <div class="gate"><div class="gv">₹350 to 900</div><span class="gtag d">HYBRID</span><div class="gd">Community plus disciplined paid, at a comp-grade ad ratio.</div></div>
    <div class="gate dark"><div class="gv" style="color:var(--peri)">&gt; ₹900</div><span class="gtag crit">RETHINK</span><div class="gd" style="color:var(--mist)">The moat thesis fails, and we learn it cheap, before scale capital is ever at risk.</div></div>
  </div>`,
  {});

/* 17 · THE 90 DAYS IN MOTION */
S(
  kick("The 90 days")+
  H("A system, then a voice, then a drop.")+
  cols([
    {k:"PHASE 0 · WK 1 to 2", title:"The system", body:"Identity and codes locked. The WhatsApp styling concierge opens, founder-run, 20 sessions a day.<sup class='cite cpop' data-pop='From our Track 02 plan. The 2.3 lakh rupee budget, the phases, the roster terms and the CAC gates are our labelled plan and assumptions; the 90-day test exists to replace them with measurements.'>[21]</sup> First roster DMs go out, gifting, zero ask. One forecast purchase order clears the MOQ math."},
    {k:"PHASE 1 · WK 3 to 8", title:"The founder engine", body:"Founder content from week 3, five posts a week in three formats<a class='cite' href='https://quid.com/knowledge-hub/resource-library/blog/2026-social-media-industry-benchmark-report' target='_blank' rel='noopener'>[22]</a>: vibe-code transformations, object-as-art construction, creator rotations. 100 squad kits land with codes."},
    {k:"PHASE 2 · WK 8 to 13", title:"Rumour 001", body:"The drop, on the Comet mechanic<a class='cite' href='https://wearcomet.com/pages/sneaker-drop' target='_blank' rel='noopener'>[23]</a>: a waitlist, an honest batch, no restock, members hear it 48 hours first. Day 90, read the gate and publish the decision.", dark:true}
  ])+
  take("The budget is <b>~₹2.3 lakh</b>, product cost not media: 100 squad kits, 19 roster kits, founder content, AI tooling, the concierge, contest prizes. An optional ₹75K buys three paid creator Reels in the final weeks, reported separately."),
  {});

/* 18 · THE FACE AND THE FIRST 25 */
S(
  kick("The roster")+
  H("A barbell, not a billboard.")+
  `<div class="split7-5">
    <div>${table(["Tier","Who, live-verified 20 Jul 2026","Terms"],[
      [{t:"The face",b:1},"Founder-as-author + one anchor: Marathe (300.7K)<sup class='cite cpop' data-pop='Live counts retrieved 19 to 20 July 2026: YouTube subscribers via SocialCounts (YouTube Data API); Instagram followers and engagement via HypeAuditor and Qoruz. Third-party tracker reads, dated, and expected to drift.'>[3]</sup>, or Gujral, or Dutta","Affiliate 15% + advisory equity, no cash retainer"],
      [{t:"A · authority (3)",b:1},"Dhinggra (2.39M)<sup class='cite cpop' data-pop='Live counts retrieved 19 to 20 July 2026: YouTube subscribers via SocialCounts (YouTube Data API); Instagram followers and engagement via HypeAuditor and Qoruz. Third-party tracker reads, dated, and expected to drift.'>[3]</sup>, Khandelwal, Batra","Gift and relationship, no ask"],
      [{t:"B · core (11)",b:1},"Sachdev, Walid, scentwalebhaiyaaa, Kheni, and 7 more","Kits + 15% codes"],
      [{t:"C · nano (5 + 6)",b:1},"naazperfumes, lookbyn, thepiyushfits, and earned slots","Kits + codes; squad earns the six"]
    ],[22,54,24])}</div>
    <div class="sidebox">
      <div class="bigcap" style="font-family:var(--display);font-size:18px;margin-bottom:10px">The rigor is the cut</div>
      <div class="bigdesc">Names verified against live follower and engagement data; several with real reach were excluded for dead engagement (one at 0.67% ER, one at ~48 avg likes on 111K<sup class='cite cpop' data-pop='Live counts retrieved 19 to 20 July 2026: YouTube subscribers via SocialCounts (YouTube Data API); Instagram followers and engagement via HypeAuditor and Qoruz. Third-party tracker reads, dated, and expected to drift.'>[3]</sup>). The objective: ≥12 of 19 roster posting organically by week 10, ≥40% of the waitlist attributable to codes<sup class='cite cpop' data-pop='From our Track 02 plan. The 2.3 lakh rupee budget, the phases, the roster terms and the CAC gates are our labelled plan and assumptions; the 90-day test exists to replace them with measurements.'>[21]</sup>. Kit budget ~₹1.25 lakh, inside the ₹2.3L above.</div>
    </div>
  </div>`,
  {});

/* 19 · HOW AI MAKES IT CHEAP */
S(
  kick("The cost lever")+
  H("AI compresses production, never judgment.")+
  cols([
    {k:"IMAGERY", title:"~₹60 an image", body:"AI on-model generation at ~₹60 versus ₹450 to 750 traditional, up to ₹1,750 to 8,000 campaign-grade<a class='cite' href='https://botika.com/pricing' target='_blank' rel='noopener'>[24]</a>. We plan 55 to 85% savings to absorb reshoots and rejects."},
    {k:"THE CONCIERGE", title:"~₹0.10 a session", body:"The WhatsApp stylist runs at ~₹0.10 to 2 per session<sup class='cite cpop' data-pop='From our Track 02 plan. The 2.3 lakh rupee budget, the phases, the roster terms and the CAC gates are our labelled plan and assumptions; the 90-day test exists to replace them with measurements.'>[21]</sup> in model and carriage cost. A thousand styling sessions become a ~₹2,000 line, not a headcount."},
    {k:"THE LINE WE HOLD", title:"Taste stays human", body:"The founder's voice, the taste calls, the three-tier looks stay human. AI compresses the cost of production; it never touches the judgment that is the product.", dark:true}
  ])+
  take("The result: one founder can run a five-post-a-week content engine, a live styling concierge and a full drop, solo, inside a ₹2.3 lakh test. The discipline scales because the cost base is engineered down, not because the team is large."),
  {});

/* 20 · UNIT ECONOMICS */
S(
  kick("The economics")+
  H("A first order barely clears. The second is the model.")+
  `<div class="split7-5">
    <div>${table(["Per order, blended","₹"],[
      ["Average order value (× 1.3 items)","2,815"],
      ["Gross profit (~51%)","1,435"],
      ["Contribution before acquisition","1,070"],
      [{t:"After ~₹900 blended acquisition",b:1},{t:"~170",b:1}]
    ],[74,26])}</div>
    <div class="sidebox v">
      <div class="bignum" style="color:#fff;font-size:44px">Repeat</div>
      <div class="bigcap" style="color:var(--peri)">is the model.</div>
      <div class="bigdesc" style="color:var(--mist)">Per-SKU margins run 46% on the backpack to 57% on the wallet. The ₹900 is a conservative blended CAC from comp ad-ratios; the moat's job is to drive the marginal community cost far below it.<sup class='cite cpop' data-pop='RUMOAR financial model (audited). SAM is roughly 12M qualified times about 30% penetration times about 4,000 rupees annual spend, near 1,400 crore. Unit economics rest on the filed-comparable ~51% gross-margin cluster; the five-year plan, capital and breakeven follow. Every input is a toggle.'>[10]</sup> Lifetime value comes from the cap-to-sling-to-fragrance ladder, not a single sale.</div>
    </div>
  </div>`,
  {});

/* 21 · THE PLAN TO BREAKEVEN */
S(
  kick("The plan")+
  H("Breakeven in Year 5, three to seven times leaner than the funded peers.")+
  `<div class="split6-6">
    <div>
      <div class="chart-t">EBITDA path, ₹ Cr &nbsp;·&nbsp; revenue 6 → 20 → 48 → 92 → 160<sup class='cite cpop' data-pop='RUMOAR financial model (audited). SAM is roughly 12M qualified times about 30% penetration times about 4,000 rupees annual spend, near 1,400 crore. Unit economics rest on the filed-comparable ~51% gross-margin cluster; the five-year plan, capital and breakeven follow. Every input is a toggle.'>[10]</sup></div>
      ${combo(["Y1","Y2","Y3","Y4","Y5"],[-3.2,-5.7,-6.2,-2.3,6.0],[-3.2,-8.9,-15.2,-17.5,-11.5])}
      <div class="chart-n">Bars are annual EBITDA; the line is cumulative. Marketing glides from 42 to 18% of revenue as community compounds.</div>
    </div>
    <div>${ul([
      "₹25 to 35 crore to reach breakeven, against peers who raised ₹120 to 190 crore each.<a class='cite' href='https://entrackr.com/fintrackr/mokobara-revenue-doubles-to-rs-230-cr-in-fy25-11066667' target='_blank' rel='noopener'>[5]</a>",
      "The discipline is the edge: the same ~51% margins as the graveyard, spent on trust instead of ads. DailyObjects proves the shape, EBITDA −4.3% at ₹84 Cr on 17% ads<a class='cite' href='https://entrackr.com/fintrackr/mokobara-revenue-doubles-to-rs-230-cr-in-fy25-11066667' target='_blank' rel='noopener'>[5]</a>.",
      "The one aggressive assumption, the ramp, is exactly what the ninety-day test de-risks first."
    ])}</div>
  </div>`,
  {});

/* 22 · WHAT MOVES IT (sensitivities) */
S(
  kick("The model is a model")+
  H("Every number is a lever. Here is the range they move.")+
  table(["Scenario","Capital to breakeven","Breakeven","What it hinges on"],[
    [{t:"Base · community converts",b:1},"₹25 to 35 Cr","Year 5","Marginal CAC < ₹350"],
    [{t:"Bear · community fails, paid fills in",b:1},"₹40 Cr and up","Slips past Year 5","Marginal CAC > ₹900"]
  ],[34,24,20,22])+
  take("The swing between these two worlds is one number, community CAC, and the single 90-day test resolves it first, for ₹2.3 lakh, before scale capital ever moves.<sup class='cite cpop' data-pop='RUMOAR financial model (audited). SAM is roughly 12M qualified times about 30% penetration times about 4,000 rupees annual spend, near 1,400 crore. Unit economics rest on the filed-comparable ~51% gross-margin cluster; the five-year plan, capital and breakeven follow. Every input is a toggle.'>[10]</sup> Every input is a toggle in the companion model, nothing hidden in a footnote."),
  {});

/* 23 · THE ASK AND THE RETURN */
S(
  kick("The ask")+
  H("₹25 to 35 crore to build the category's owner.")+
  cols([
    {k:"WHAT IT BUYS", title:"Runway to breakeven", body:"Capital-light by design: a cumulative trough near ₹17.5 crore plus ₹10 to 15 crore of working capital<sup class='cite cpop' data-pop='RUMOAR financial model (audited). SAM is roughly 12M qualified times about 30% penetration times about 4,000 rupees annual spend, near 1,400 crore. Unit economics rest on the filed-comparable ~51% gross-margin cluster; the five-year plan, capital and breakeven follow. Every input is a toggle.'>[10]</sup>, not a decade of losses. The three funded peers raised ₹475 to 480 crore between them, and lost ₹125 to 130 crore doing it.<a class='cite' href='https://entrackr.com/fintrackr/mokobara-revenue-doubles-to-rs-230-cr-in-fy25-11066667' target='_blank' rel='noopener'>[5]</a>"},
    {k:"THE RETURN", title:"Category ownership", body:"FMCG strategics buy category owners near profitability at about 2× revenue. The Man Company sold to Emami at ~2×<a class='cite' href='https://inc42.com/buzz/emami-to-acquire-remaining-46-stake-in-d2c-grooming-brand-the-man-company-for-inr-177-cr/' target='_blank' rel='noopener'>[27]</a>; Beardo returned an estimated 5 to 6.5×<a class='cite' href='https://entrackr.com/2020/07/category-creator-beardos-rs-350-cr-exit-story/' target='_blank' rel='noopener'>[28]</a> to Marico's early backers."},
    {k:"THE PROOF", title:"De-risked in 90 days", body:"The moat is tested for a fraction of the raise before the rest is ever deployed. The downside is named, and it is cheap.", dark:true}
  ]),
  {});

/* 24 · AFTER SS27 */
S(
  kick("The horizon")+
  H("Where the wall goes next.")+
  cols([
    {k:"AW27", title:"Fragrance", body:"Rumour Noir, a 100ml plus a 10ml discovery, on the same drop mechanic. The consumable that turns a durables buyer into a repeat one, the LTV engine, launched as an attach, not a hero bet."},
    {k:"AW27 to SS28", title:"Monogram gifting", body:"Belts enter as gifts; the card holder, already on the wall, gets its atelier monogram. Thin willingness-to-pay converted into sentiment."},
    {k:"SS28 · WATCH-LIST", title:"Men's jewellery", body:"The runways' breakout category and SALTY already at 25 to 30% men's<sup class='cite cpop' data-pop='From our Track 03 product work. The wall&#39;s BOM is built from live India cluster-supplier listings minus an implied cut-make-trim rate (no public per-piece India rate exists), with seven named factory RFQs to reach quote-grade. The after-SS27 read draws on competitor signals such as SALTY&#39;s founder-stated 25 to 30% men&#39;s share.'>[15]</sup>. We enter only with a specialist partner, because metal QC is a different discipline.", dark:true}
  ])+
  take("And one line stated now, so the buyers see we mean it: <b>never luggage.</b> The wall stays on the body, off the carousel, out of the category the graveyard died in."),
  {});

/* 25 · WHY RUMOAR WON'T WORK (the bear case) */
S(
  kick("The bear case")+
  H("Here is the strongest argument that this fails.")+
  sub("We would rather make it ourselves, sharply, than have you find it. Three ways RUMOAR does not become a venture outcome.")+
  cols([
    {k:"01 · THE MOAT NEVER CONVERTS", title:"No Indian precedent", body:"No Indian brand has scaled on genuinely zero marketing. Comet spent ~32% of revenue on ads<a class='cite' href='https://www.indianretailer.com/news/comet-accelerates-growth-303-pc-revenue-jump-fy25' target='_blank' rel='noopener'>[25]</a>; the only true community-led comp, Urban Monkey, took five years to reach ~₹5 crore<a class='cite' href='https://yourstory.com/smbstory/urban-monkey-street-wear-hip-hop-brand-underground-artists-rappers-athletes' target='_blank' rel='noopener'>[26]</a>. If community doesn't convert, this is a nice niche brand.", dark:true},
    {k:"02 · THE RAMP IS BORROWED", title:"Mokobara's curve, without the fuel", body:"₹6 to 160 crore is a Mokobara-shaped climb, and Mokobara bought that shape with ~₹190 crore raised and 20% ad ratios<a class='cite' href='https://entrackr.com/fintrackr/mokobara-revenue-doubles-to-rs-230-cr-in-fy25-11066667' target='_blank' rel='noopener'>[5]</a>. Pairing that curve with a community budget is the plan's biggest single leap."},
    {k:"03 · PREMIUM MEETS THE DISCOUNT REFLEX", title:"The shelf trained him to wait", body:"A ₹2,200 wallet collides with Redseer's finding that Gen Z pays about half the millennial unit price<a class='cite' href='https://redseer.com/articles/gen-z-defining-trends-influencing-spends/' target='_blank' rel='noopener'>[4]</a>, on a shelf that ran 30 to 56% off the day we looked<sup class='cite cpop' data-pop='Our own shelf audit, live-observed 20 July 2026 on mokobara.com, uppercase.co.in, urbanmonkey.com, dailyobjects.com, zouk.co.in and nappadori.com. A single-day snapshot; the wallet-band vacancy was double-confirmed.'>[11]</sup>."}
  ])+
  take("Each of these is a gate, not a guess, and the cheapest one to test, community CAC, is the one we test first, for ₹2.3 lakh. The argument against us is the reason to run the experiment, not to skip it."),
  {});

/* 26 · WHAT HAS TO BE TRUE */
S(
  kick("The register")+
  H("Five things have to be true. We named them.")+
  table(["#","The load-bearing assumption","Base","Breaks if"],[
    ["1",{t:"Community CAC converts below the gate",b:1},"Hypothesis, not in the base P&L","Marginal CAC > ₹900 in the 90-day test"],
    ["2",{t:"Blended gross margin holds ~51%",b:1},"Filed-comp cluster","Discounting, marketplace mix, leather spikes"],
    ["3",{t:"Revenue ramps to ₹160 Cr by Year 5",b:1},"Aggressive vs precedent","Growth caps at Urban Monkey pace"],
    ["4",{t:"The repeat / attach ladder lifts LTV",b:1},"Directionally supported","One-and-done persists at premium prices"],
    ["5",{t:"Waitlist inventory holds WC at ₹10 to 15 Cr",b:1},"Design choice","Drop cadence forces safety stock"]
  ],[6,42,26,26])+
  take("The weak points are named by us, not found by you. Each is a measurable gate, every input a toggle in the model, and the cheapest one is tested first.<sup class='cite cpop' data-pop='RUMOAR financial model (audited). SAM is roughly 12M qualified times about 30% penetration times about 4,000 rupees annual spend, near 1,400 crore. Unit economics rest on the filed-comparable ~51% gross-margin cluster; the five-year plan, capital and breakeven follow. Every input is a toggle.'>[10]</sup>"),
  {});

/* 27 · CLOSE */
S(`<div class="cov">
    <div class="cov-mark" style="font-size:100px;line-height:.92">The stylist<br>men belong to.</div>
    <div class="cov-sub" style="margin-top:22px">A men's-fashion-first styling engine, built capital-light because the category's real killers are the balance sheet and acquisition cost, not demand. Every load-bearing number here survived an adversarial audit<sup class='cite cpop' data-pop='Our own red-team audit: 63 claims independently checked by adversarial fact-checkers instructed to refute, not confirm. Every figure that failed was killed or corrected before it entered this deck.'>[29]</sup> before you saw a single slide. Proven in ninety days, before the capital is at risk.</div>
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
.cite{font-family:var(--mono);font-size:.6em;font-weight:700;vertical-align:super;color:var(--dusk);letter-spacing:0;margin-left:1px;cursor:pointer;text-decoration:none}
.dark .cite,.take .cite,.col.d .cite,.sidebox.v .cite,.gate.dark .cite,.posbox .cite,.sambar .cite,.tbl th .cite{color:var(--peri)}
a.cite:hover,.cpop:hover{color:var(--volt)}
.dark a.cite:hover,.take a.cite:hover,.col.d a.cite:hover,.dark .cpop:hover,.take .cpop:hover,.sidebox.v .cpop:hover{color:#fff}
#cite-pop{position:fixed;z-index:80;max-width:360px;background:var(--ink);color:var(--porcelain);border:1px solid var(--hairdk);border-left:3px solid var(--peri);border-radius:8px;padding:12px 15px;font-family:var(--sans);font-size:12.5px;line-height:1.5;box-shadow:0 14px 44px rgba(0,0,0,.55)}
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
(function(){
  var pop=document.createElement('div');pop.id='cite-pop';pop.style.display='none';document.body.appendChild(pop);
  var open=false,src=null;
  function place(el){var r=el.getBoundingClientRect();var pw=Math.min(360,window.innerWidth-24);pop.style.width=pw+'px';var lft=Math.min(Math.max(12,r.left-6),window.innerWidth-pw-12);var top=r.bottom+8;if(top+pop.offsetHeight+12>window.innerHeight){top=Math.max(12,r.top-pop.offsetHeight-8);}pop.style.left=lft+'px';pop.style.top=top+'px';}
  function showPop(el){pop.textContent=el.getAttribute('data-pop')||'';pop.style.display='block';open=true;src=el;place(el);}
  function hidePop(){pop.style.display='none';open=false;src=null;}
  document.addEventListener('click',function(e){
    var c=e.target.closest?e.target.closest('.cite'):null;
    if(c){e.stopPropagation();if(c.classList.contains('cpop')){e.preventDefault();if(open&&src===c){hidePop();}else{showPop(c);}}return;}
    if(open){if(!(e.target.closest&&e.target.closest('#cite-pop'))){e.stopPropagation();hidePop();}}
  },true);
  window.addEventListener('keydown',function(e){if(e.key==='Escape'&&open){hidePop();}},true);
  window.addEventListener('resize',function(){if(open&&src){place(src);}});
})();
`;
fs.writeFileSync("index.html", DOC(slides));
console.log("wrote index.html; slides:", slides.length);
