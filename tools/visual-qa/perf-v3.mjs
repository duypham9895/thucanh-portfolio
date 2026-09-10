import { launch, CONTEXT } from './browser.mjs';
const b = await launch();
for (const [label, opts] of [
  ['desktop (cable)', {viewport:{width:1440,height:900}, cpu:1, net:null}],
  ['mobile (4G, 4x CPU)', {viewport:{width:390,height:844}, cpu:4, net:{download:1.6*1024*1024/8, upload:750*1024/8, latency:150}}],
]) {
  const p = await b.newPage({ viewport:opts.viewport, ...CONTEXT });
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Network.enable'); await cdp.send('Page.enable');
  if (opts.cpu>1) await cdp.send('Emulation.setCPUThrottlingRate',{rate:opts.cpu});
  if (opts.net) await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:opts.net.latency,downloadThroughput:opts.net.download,uploadThroughput:opts.net.upload});
  const bytes={}; let total=0, reqs=0;
  p.on('response', async r=>{ reqs++;
    try{ const h=await r.allHeaders(); const n=Number(h['content-length']||0);
      const t=(r.request().resourceType()); bytes[t]=(bytes[t]||0)+n; total+=n; }catch(e){}
  });
  await p.goto('http://localhost:8900/',{waitUntil:'load'});
  await p.waitForTimeout(opts.net?4000:1500);
  const m = await p.evaluate(()=>new Promise(res=>{
    const out={};
    for(const e of performance.getEntriesByType('paint')) out[e.name]=Math.round(e.startTime);
    new PerformanceObserver(l=>{const es=l.getEntries();const last=es[es.length-1];
      out.lcp=Math.round(last.startTime); out.lcpEl=last.element?(last.element.tagName+'.'+String(last.element.className||'').split(' ')[0]):null;
      out.lcpUrl=last.url||null;}).observe({type:'largest-contentful-paint',buffered:true});
    let cls=0; new PerformanceObserver(l=>{for(const e of l.getEntries()) if(!e.hadRecentInput) cls+=e.value;}).observe({type:'layout-shift',buffered:true});
    setTimeout(()=>{out.cls=+cls.toFixed(4); const n=performance.getEntriesByType('navigation')[0];
      out.dcl=Math.round(n.domContentLoadedEventEnd); out.load=Math.round(n.loadEventEnd); res(out);},600);
  }));
  console.log(`\n── ${label}`);
  console.log(`   FCP ${m['first-contentful-paint']}ms   LCP ${m.lcp}ms   CLS ${m.cls}   DCL ${m.dcl}ms   load ${m.load}ms`);
  console.log(`   LCP element: ${m.lcpEl}  ${m.lcpUrl||''}`);
  console.log(`   requests ${reqs}, transferred ${(total/1024).toFixed(1)} KB`);
  console.log('   ' + Object.entries(bytes).filter(([,v])=>v>0).map(([k,v])=>`${k} ${(v/1024).toFixed(1)}KB`).join('  '));
  await p.close();
}
await b.close();
