import { launch, CONTEXT } from './browser.mjs';
const b = await launch();
const p = await b.newPage({ viewport:{width:1440,height:900}, ...CONTEXT });
await p.goto(process.argv[2] || 'http://localhost:8900/',{waitUntil:'networkidle'});
await p.evaluate(()=>document.fonts.ready);
// Adding .in starts a 0.9s opacity transition. Measuring during it reads part-faded text and
// invents failures, so kill the transition outright rather than racing it.
await p.addStyleTag({content:'.reveal{opacity:1!important;transform:none!important;transition:none!important}'});
await p.evaluate(()=>document.querySelectorAll('.reveal').forEach(n=>n.classList.add('in')));
await p.waitForTimeout(250);

const CONTRAST_FN = () => {
  // Chrome computes `color-mix(in oklab, ...)` to a literal `oklab(L a b)` string, and neither a
  // regex that assumes rgb() nor canvas fillStyle accepts it — fillStyle silently REJECTS the
  // value and keeps whatever was set before, which turns every tinted section background into
  // black and invents ~180 failures. Convert oklab/oklch explicitly.
  const cv = document.createElement('canvas').getContext('2d');
  const l2s = (c) => (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1/2.4) - 0.055);
  const oklab2rgb = (L, A, B) => {
    const l=(L+0.3963377774*A+0.2158037573*B)**3, m=(L-0.1055613458*A-0.0638541728*B)**3, s2=(L-0.0894841775*A-1.2914855480*B)**3;
    return [ 4.0767416621*l-3.3077115913*m+0.2309699292*s2,
            -1.2684380046*l+2.6097574011*m-0.3413193965*s2,
            -0.0041960863*l-0.7034186147*m+1.7076147010*s2]
      .map(v => Math.max(0, Math.min(255, Math.round(l2s(v)*255))));
  };
  const rgba = (css) => {
    css = String(css).trim();
    if (css === 'transparent' || css === 'none') return [0,0,0,0];
    let m = css.match(/^okl(ab|ch)\(([^)]+)\)/i);
    if (m) {
      const parts = m[2].split('/');
      const n = parts[0].trim().split(/\s+/).map(x => x.endsWith('%') ? parseFloat(x)/100 : parseFloat(x));
      const a = parts[1] !== undefined ? (parts[1].trim().endsWith('%') ? parseFloat(parts[1])/100 : parseFloat(parts[1])) : 1;
      const [L, c2, c3] = n;
      const [A, Bv] = m[1].toLowerCase() === 'ch'
        ? [c2 * Math.cos(c3 * Math.PI/180), c2 * Math.sin(c3 * Math.PI/180)]
        : [c2, c3];
      return [...oklab2rgb(L, A, Bv), a];
    }
    cv.fillStyle = '#000'; cv.fillStyle = css;
    const v = cv.fillStyle;
    if (v[0] === '#') return [parseInt(v.slice(1,3),16), parseInt(v.slice(3,5),16), parseInt(v.slice(5,7),16), 1];
    const q = v.match(/[\d.]+/g).map(Number);
    return [q[0], q[1], q[2], q[3] === undefined ? 1 : q[3]];
  };
  const lin=c=>c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4);
  const L=([r,g,bb])=>.2126*lin(r/255)+.7152*lin(g/255)+.0722*lin(bb/255);
  const ratio=(a,b)=>{const x=L(a),y=L(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
  const over=(fg,bg,a)=>fg.slice(0,3).map((c,i)=>c*a+bg[i]*(1-a));

  function bgOf(el){
    const chain=[]; let cur=el;
    while(cur){ const c=rgba(getComputedStyle(cur).backgroundColor); if(c[3]>0) chain.push(c); cur=cur.parentElement; }
    let acc=[255,255,255];
    for(let i=chain.length-1;i>=0;i--) acc=over(chain[i],acc,chain[i][3]);
    return acc;
  }
  const out=[];
  document.querySelectorAll('body *').forEach(el=>{
    const txt=[...el.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim()).map(n=>n.textContent.trim()).join('');
    if(!txt) return;
    const cs=getComputedStyle(el);
    if(cs.visibility==='hidden'||cs.display==='none') return;
    const r0=el.getBoundingClientRect(); if(!r0.width||!r0.height) return;
    let op=1,cur=el; while(cur){op*=parseFloat(getComputedStyle(cur).opacity||'1');cur=cur.parentElement;}
    if(op===0) return;
    const bg=bgOf(el);
    const fgc=rgba(cs.color);
    const fg=over(fgc,bg,fgc[3]*op);
    const size=parseFloat(cs.fontSize), w=parseInt(cs.fontWeight)||400;
    const need=(size>=24||(size>=18.66&&w>=700))?3:4.5;
    const r=ratio(fg,bg);
    if(r<need) out.push({t:txt.slice(0,44),r:+r.toFixed(2),need,size:+size.toFixed(1),cls:String(el.className||'').slice(0,28)});
  });
  return out;
};
const fails = await p.evaluate(CONTRAST_FN);
console.log(`CONTRAST failures (page): ${fails.length}`);
fails.slice(0,20).forEach(f=>console.log(`   ${String(f.r).padStart(5)} (need ${f.need})  ${String(f.size).padStart(5)}px  .${f.cls.padEnd(24)} "${f.t}"`));

// The page-level pass says nothing about the campaign sheets, which are the biggest interactive
// surface here and are built on demand. Nine AA failures lived in them behind a green exit code.
await p.addStyleTag({content:'.sheet{animation:none!important}'});
const sheetIds = await p.$$eval('[data-qa^="campaign-"]', ns => ns.map(n => n.getAttribute('data-campaign')));
let sheetFails = [];
for (const id of sheetIds) {
  await p.click(`[data-campaign="${id}"]`);
  await p.waitForTimeout(420);
  const f = await p.evaluate(CONTRAST_FN);
  f.forEach((x) => sheetFails.push({ ...x, where: id }));
  await p.keyboard.press('Escape');
  await p.waitForTimeout(200);
}
console.log(`CONTRAST failures (sheets): ${sheetFails.length}`);
sheetFails.slice(0, 12).forEach(f => console.log(`   [${f.where}] ${f.r} (need ${f.need}) ${f.size}px .${f.cls} "${f.t}"`));

const tab = await p.evaluate(() => {
  const vis=()=>[...document.querySelectorAll('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"]),iframe')]
    .filter(x=>x.offsetParent!==null||getComputedStyle(x).position==='fixed');
  return vis().map(e=>(e.tagName)+(e.className?'.'+String(e.className).split(' ')[0]:'')+' — '+(e.textContent||e.getAttribute('aria-label')||'').trim().slice(0,26));
});
console.log(`\nKEYBOARD-REACHABLE controls: ${tab.length}`);
tab.slice(0,16).forEach((t,i)=>console.log(`   ${String(i).padStart(2)} ${t}`));
if(tab.length>16) console.log(`   … +${tab.length-16} more`);
const noFocus = await p.evaluate(()=>[...document.querySelectorAll('[onclick],.crow,.ccard,.folder')].filter(e=>!e.matches('a[href],button,[tabindex]')).length);
console.log(`   clickable-but-unfocusable: ${noFocus} (must be 0)`);
await b.close();
if (fails.length || sheetFails.length || noFocus) {
  console.error(`\nA11Y FAILED — ${fails.length} contrast on the page, ${sheetFails.length} in sheets, ${noFocus} unfocusable`);
  process.exit(1);
}
console.log('\na11y OK');
