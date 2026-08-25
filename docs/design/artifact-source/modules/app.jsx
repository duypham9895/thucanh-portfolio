const {useState,useEffect}=React;
const TWEAK_DEFAULTS=/*EDITMODE-BEGIN*/{"accent":"#CB7885","layout":"Danh sách","scale":1,"showVideos":true,"opening":"Bìa + thư mục","lang":"VI"}/*EDITMODE-END*/;
const C=id=>(FOLDERS.find(f=>f.id===id)||{}).c||'var(--accent)';

function useReveal(dep){useEffect(()=>{const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.1});document.querySelectorAll('.reveal:not(.in)').forEach(n=>io.observe(n));return()=>io.disconnect()},[dep])}
const BRANDLOGO={"L'Oréal Professionnel":['brands/loreal-professionnel.png',52],"Kérastase":['brands/kerastase.png',30],"Matrix":['brands/matrix.png',44],"Estée Lauder":['brands/estee-lauder.png',46],"Baresoul Cosme":['brands/baresoul.png',52],"Clinique":['brands/clinique.png',24]};
const VDB=(()=>{let p;const open=()=>p||(p=new Promise((res,rej)=>{const r=indexedDB.open('v3vid',1);r.onupgradeneeded=()=>r.result.createObjectStore('v');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}));
const tx=(m,f)=>open().then(db=>new Promise((res,rej)=>{const t=db.transaction('v',m),s=t.objectStore('v');const q=f(s);t.oncomplete=()=>res(q&&q.result);t.onerror=()=>rej(t.error)}));
return{get:k=>tx('readonly',s=>s.get(k)),set:(k,v)=>tx('readwrite',s=>s.put(v,k)),del:k=>tx('readwrite',s=>s.delete(k))}})();

function embedUrl(u){u=(u||'').trim();if(!u)return null;
let m=u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|live\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);if(m)return'https://www.youtube.com/embed/'+m[1];
m=u.match(/vimeo\.com\/(?:video\/)?(\d+)/);if(m)return'https://player.vimeo.com/video/'+m[1];
m=u.match(/drive\.google\.com\/file\/d\/([\w-]+)/);if(m)return'https://drive.google.com/file/d/'+m[1]+'/preview';
m=u.match(/facebook\.com\/.+/);if(m)return'https://www.facebook.com/plugins/video.php?href='+encodeURIComponent(u);
return u}

function VidSlot({id,hint,src}){const[url,setUrl]=useState(null);const[link,setLink]=useState(()=>{try{return localStorage.getItem('v3vidlink-'+id)||''}catch(e){return''}});const[over,setOver]=useState(false);const[typing,setTyping]=useState(false);
useEffect(()=>{let u;VDB.get(id).then(b=>{if(b){u=URL.createObjectURL(b);setUrl(u)}}).catch(()=>{});return()=>{if(u)URL.revokeObjectURL(u)}},[id]);
const take=f=>{if(!f||!/^video\//.test(f.type))return;VDB.set(id,f).catch(()=>{});setUrl(URL.createObjectURL(f))};
const clear=e=>{e.stopPropagation();VDB.del(id).catch(()=>{});setUrl(null);setLink('');try{localStorage.removeItem('v3vidlink-'+id)}catch(err){}};
const pick=()=>{const inp=document.createElement('input');inp.type='file';inp.accept='video/*';inp.onchange=()=>take(inp.files[0]);inp.click()};
const saveLink=v=>{setLink(v);setTyping(false);try{v?localStorage.setItem('v3vidlink-'+id,v):localStorage.removeItem('v3vidlink-'+id)}catch(e){}};
const emb=embedUrl(src||link);
const box={width:'100%',aspectRatio:'16/9',display:'block',border:'none',background:'#2B2A25'};
const xbtn=<button onClick={clear} style={{position:'absolute',top:8,right:8,border:'none',background:'rgba(43,42,37,.72)',color:'#fff',font:'11px/1 sans-serif',padding:'7px 10px',cursor:'pointer',zIndex:2}}>×</button>;
return(<div style={{position:'relative'}} onDragOver={e=>{e.preventDefault();setOver(true)}} onDragLeave={()=>setOver(false)} onDrop={e=>{e.preventDefault();setOver(false);const f=e.dataTransfer.files[0];if(f)take(f);else{const t=e.dataTransfer.getData('text');if(t)saveLink(t)}}}>
{url?<React.Fragment><video src={url} controls playsInline preload="metadata" style={Object.assign({objectFit:'cover'},box)}/>{xbtn}</React.Fragment>
:emb?<React.Fragment><iframe src={emb} style={box} allow="accelerometer;autoplay;clipboard-write;encrypted-media;picture-in-picture" allowFullScreen></iframe>{src?null:xbtn}</React.Fragment>
:typing?<div style={{aspectRatio:'16/9',display:'grid',placeItems:'center',padding:20,border:'1px dashed var(--line)',background:'var(--paper)'}}>
<input autoFocus placeholder="https://youtube.com/..." onBlur={e=>saveLink(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')saveLink(e.target.value);if(e.key==='Escape')setTyping(false)}} style={{width:'100%',maxWidth:340,padding:'10px 12px',border:'1px solid var(--line)',background:'#fff',font:'14px sans-serif'}}/></div>
:<div style={{aspectRatio:'16/9',display:'grid',placeItems:'center',gap:10,border:'1px dashed '+(over?'var(--accent)':'var(--line)'),background:over?'rgba(203,120,133,.06)':'var(--paper)',padding:20,textAlign:'center'}}>
<span style={{fontSize:22,opacity:.5}}>▶</span>
<span className="eyebrow" style={{opacity:.6,textTransform:'none',letterSpacing:0}}>{hint}</span>
<span style={{display:'flex',gap:10}}><button onClick={pick} className="eyebrow" style={{border:'1px solid var(--line)',background:'#fff',padding:'8px 14px',cursor:'pointer'}}>File</button><button onClick={()=>setTyping(true)} className="eyebrow" style={{border:'1px solid var(--line)',background:'#fff',padding:'8px 14px',cursor:'pointer'}}>Link</button></span></div>}</div>)}
function Slot({id,label,ratio}){return(<div className="frame" style={{width:'100%',aspectRatio:ratio||'4/3'}}><image-slot id={id} shape="rect" placeholder={label}></image-slot></div>)}
function SecHead({id,kicker,title,em,right,T,lang}){return(<div className="sechead" style={{'--sc':C(id)}}>
<div>{lang!=='EN'&&kicker?<p className="eyebrow" style={{color:C(id)}}>{kicker}</p>:null}
<h2 className="disp" style={{fontSize:'clamp(32px,4.4vw,58px)',marginTop:12}}>{title} {em?<span className="it" style={{color:C(id)}}>{em}</span>:null}</h2></div>
{right||<a className="backtop" href="#top" onClick={e=>{e.preventDefault();window.scrollTo({top:0,behavior:'smooth'})}}>{T.back}</a>}
</div>)}

function Nav({onNav,lang,setLang}){const[s,setS]=useState(false);useEffect(()=>{const f=()=>setS(window.scrollY>60);window.addEventListener('scroll',f);return()=>window.removeEventListener('scroll',f)},[]);
const tab=v=>({padding:'7px 13px',borderRadius:999,fontSize:10.5,letterSpacing:'.16em',border:'1px solid '+(lang===v?'transparent':'var(--line)'),background:lang===v?'var(--ink)':'transparent',color:lang===v?'var(--bg)':'var(--soft)',transition:'all .3s'});
return(<header style={{position:'fixed',top:0,left:0,right:0,zIndex:50,background:s?'color-mix(in oklab,var(--bg) 90%,transparent)':'transparent',backdropFilter:s?'blur(12px)':'none',borderBottom:'1px solid '+(s?'var(--line)':'transparent'),transition:'all .4s'}}>
<div className="wrap" style={{height:74,display:'flex',alignItems:'center',justifyContent:'space-between',gap:20}}>
<a href="#top" onClick={e=>{e.preventDefault();onNav('top')}} className="disp" style={{fontSize:21}}>Trần Tôn Nữ <strong style={{fontWeight:500}}>Thục Anh</strong></a>
<div style={{display:'flex',gap:7}}>
<button onClick={()=>setLang('VI')} style={tab('VI')}>VI</button>
<button onClick={()=>setLang('EN')} style={tab('EN')}>EN</button></div>
</div></header>)}

function Opening({onNav,variant,D}){const{P,F,T}=D;
const stack=mult=>(<div className="stack" style={{position:'relative',marginTop:mult>1?56:0}}>
<div className="clip"></div>
{FOLDERS.map(f=>(<div key={f.id} className="folder" style={{'--off':(f.off*mult)+'px'}} onClick={()=>onNav(f.id)}>
<div className="tab" style={{background:f.c,color:f.t}}><span className="tabname" style={D.lang==='EN'?{visibility:'hidden',width:126}:null}>{f.label}</span></div>
<div className="folder-body" style={{background:f.c,color:f.t}}>
<div>{(f.noteFirst?<React.Fragment><p className="fnote">{F[f.id].n}</p><p className="disp" style={{fontSize:26,lineHeight:1,marginTop:5}}>{F[f.id].t}</p></React.Fragment>:<React.Fragment><p className="disp" style={{fontSize:26,lineHeight:1}}>{F[f.id].t}</p><p className="fnote" style={{marginTop:5}}>{F[f.id].n}</p></React.Fragment>)}</div>
<span className="fgo">{T.open}</span></div></div>))}</div>);
return(<section id="top" style={{minHeight:'100vh',display:'flex',alignItems:'center',padding:'80px 0 60px'}}><div className="wrap" style={{width:'100%'}}>
<div style={{display:'grid',gridTemplateColumns:variant==='Bìa + thư mục'?'1fr 1.05fr':'1fr',gap:64,alignItems:'center'}}>
<div>
<p className="eyebrow">{P.niche}</p>
<h1 className="disp" style={{fontSize:'clamp(56px,8.6vw,124px)',marginTop:18}}>Port<span className="script" style={{color:'var(--accent)',fontSize:'1.28em',marginLeft:'.02em'}}>folio</span></h1>
<p className="disp" style={{fontSize:'clamp(30px,4vw,60px)',fontWeight:400,letterSpacing:'.05em',textTransform:'uppercase',marginTop:14,color:'#893941'}}>{P.name}<br/><strong style={{fontWeight:500}}>{P.name2}</strong></p>
<p className="body" style={{marginTop:22,maxWidth:'30em'}}>{P.intro}</p>
<div style={{display:'flex',gap:9,flexWrap:'wrap',marginTop:26}}>{[P.role,P.city].map(x=><span key={x} className="pill">{x}</span>)}</div>
{variant==='Bìa + thư mục'?<p className="eyebrow" style={{marginTop:34}}>{T.pick}</p>:null}
</div>
{variant==='Bìa + thư mục'?stack(1):null}
</div>
{variant!=='Bìa + thư mục'?stack(1.4):null}
</div></section>)}

function About({toast,D}){const{P,T}=D;return(<section id="about" style={{padding:'100px 0',borderTop:'1px solid var(--line)'}}><div className="wrap">
<SecHead id="about" lang={D.lang} kicker={T.aboutKicker} title={T.aboutTitle} em={T.aboutEm} T={T}/>
<div style={{display:'grid',gridTemplateColumns:'1.2fr minmax(250px,.8fr)',gap:64,alignItems:'start'}}>
<div className="reveal">
<h3 className="disp" style={{fontSize:'clamp(26px,3.4vw,44px)',maxWidth:'19em'}}>{T.aboutQuote[0]}<span className="it" style={{color:C('about')}}>{T.aboutQuote[1]}</span></h3>
<div style={{display:'grid',gap:16,marginTop:28,maxWidth:'44em'}}>{P.bio.map((b,i)=><p key={i} className="body">{b}</p>)}</div>
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:32,marginTop:46,paddingTop:30,borderTop:'1px solid var(--line)'}}>
{P.skills.map(s=><div key={s.h}><h4 className="eyebrow" style={{color:'var(--ink)',marginBottom:13}}>{s.h}</h4><ul style={{listStyle:'none',display:'grid',gap:8}}>{s.i.map(x=><li key={x} style={{fontSize:14.5,lineHeight:1.45}}>{x}</li>)}</ul></div>)}</div>
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:26,marginTop:46,paddingTop:28,borderTop:'1px solid var(--line)'}}>
{P.stats.map(s=><div key={s.k}><p className="disp" style={{fontSize:'clamp(34px,3.8vw,52px)',color:C('about')}}>{s.v}</p><p className="eyebrow" style={{marginTop:6}}>{s.k}</p></div>)}</div>
</div>
<div className="reveal">
<Slot id="v3-portrait" label={D.lang==='EN'?'portrait photo':'ảnh chân dung'} ratio="3/4"/>
<div style={{marginTop:26,padding:'24px 24px 26px',background:C('about'),color:'#fff',borderRadius:2}}>
<p className="eyebrow" style={{color:'rgba(255,255,255,.8)'}}>{T.contact}</p>
<div style={{display:'grid',gap:12,marginTop:14}}>
<a href={'mailto:'+P.email} style={{color:'#fff',fontSize:15}}>{P.email}</a>
<a href="tel:+84797038080" style={{color:'#fff',fontSize:15}}>{P.phone}</a>
<span style={{fontSize:15}}>{P.city}</span></div>
<div style={{display:'flex',gap:9,flexWrap:'wrap',marginTop:20}}>
<a className="btn" href="uploads/cv.pdf" target="_blank" rel="noopener" style={{borderColor:'rgba(255,255,255,.5)',color:'#fff'}}>{T.cvBtn}</a>
<button className="btn" onClick={()=>{navigator.clipboard&&navigator.clipboard.writeText(P.email);toast(T.copied)}} style={{borderColor:'rgba(255,255,255,.5)',color:'#fff'}}>{T.copy}</button></div>
</div></div></div>
<div style={{marginTop:80}}><p className="eyebrow" style={{marginBottom:20}}>{T.brandsLabel}</p><div className="brandwall reveal">{P.brands.map(b=>BRANDLOGO[b]?<img key={b} className="blogo" src={BRANDLOGO[b][0]} alt={b} style={{height:BRANDLOGO[b][1]}}/>:<span key={b}>{b}</span>)}</div></div>
</div></section>)}

function Education({D}){const{P,T}=D;return(<section id="education" style={{padding:'100px 0',background:'var(--paper)',borderTop:'1px solid var(--line)'}}><div className="wrap">
<SecHead id="education" lang={D.lang} kicker="Education" title={T.eduTitle} T={T}/>
<div className="reveal" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:50,alignItems:'start'}}>
<div><h3 className="disp" style={{fontSize:'clamp(28px,3.4vw,44px)',lineHeight:1.1}}>{P.edu.school}</h3>
<p className="body" style={{marginTop:14}}>{P.edu.deg}</p><p className="eyebrow" style={{marginTop:8}}>{P.edu.years}</p></div>
<ul style={{listStyle:'none',display:'grid',gap:0}}>{P.edu.notes.map(n=><li key={n} style={{fontFamily:'var(--disp)',fontSize:20,lineHeight:1.35,padding:'16px 0',borderTop:'1px solid var(--line)'}}>{n}</li>)}</ul>
</div></div></section>)}

function CV({D}){const{P,T}=D;return(<section id="cv" style={{padding:'100px 0',borderTop:'1px solid var(--line)'}}><div className="wrap">
<SecHead id="cv" lang={D.lang} kicker="Working experiences" title={T.cvTitle} em={T.cvEm} T={T} right={<a className="btn" href="uploads/cv.pdf" target="_blank" rel="noopener">{T.cvBtn}</a>}/>
{P.cv.map(j=>(<div key={j.r+j.y} className="reveal" style={{display:'grid',gridTemplateColumns:'190px 1fr',gap:34,padding:'28px 0',borderTop:'1px solid var(--line)'}}>
<span className="eyebrow" style={{paddingTop:8}}>{j.y}</span>
<div><h3 style={{fontFamily:'var(--disp)',fontWeight:400,fontSize:26,lineHeight:1.2}}>{j.r}</h3>
<p className="eyebrow" style={{color:C('cv'),marginTop:8}}>{j.c}</p>
<ul style={{listStyle:'none',display:'grid',gap:9,marginTop:14,maxWidth:'52em'}}>{j.d.map((d,i)=><li key={i} className="body" style={{fontSize:14.5,lineHeight:1.7}}>— {d}</li>)}</ul></div></div>))}
<hr className="rule"/></div></section>)}

function List({onOpen,D}){const[h,setH]=useState(null);const[p,setP]=useState({x:0,y:0});
return(<div onMouseMove={e=>setP({x:e.clientX,y:e.clientY})}>
{D.CAMPAIGNS.map(c=>(<div key={c.id} className="crow reveal" onMouseEnter={()=>setH(c)} onMouseLeave={()=>setH(null)} onClick={()=>onOpen(c)}>
<span className="eyebrow" style={{paddingTop:14}}>{c.n}</span>
<div><h3 className="ct">{c.title}</h3><p className="body" style={{marginTop:10,maxWidth:'40em',fontSize:14.5}}>{c.summary}</p></div>
<div className="cmeta" style={{paddingTop:14}}><p className="eyebrow" style={{color:'var(--ink)'}}>{c.brand}</p><p className="eyebrow" style={{marginTop:7}}>{c.tag} · {c.year}</p></div>
<div className="ckpi" style={{paddingTop:8,textAlign:'right'}}><p className="disp it" style={{fontSize:26,color:C('work')}}>{c.kpi}</p></div></div>))}
<hr className="rule"/>
{h?(<div style={{position:'fixed',left:Math.min(p.x+28,window.innerWidth-290),top:Math.max(p.y-100,20),width:258,pointerEvents:'none',zIndex:40,boxShadow:'0 26px 70px rgba(43,42,37,.2)'}}><Slot id={'v3-peek-'+h.id} label={h.shots[0]}/></div>):null}
</div>)}

function Grid({onOpen,D}){return(<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(330px,1fr))',gap:'56px 40px'}}>
{D.CAMPAIGNS.map(c=>(<div key={c.id} className="ccard reveal" onClick={()=>onOpen(c)}>
<Slot id={'v3-card-'+c.id} label={c.shots[0]}/>
<p className="eyebrow" style={{marginTop:15}}>{c.brand} · {c.year}</p>
<h3 className="ct" style={{fontSize:28,marginTop:8}}>{c.title}</h3>
<p className="body" style={{marginTop:8,fontSize:14.5}}>{c.summary}</p>
<p className="disp it" style={{fontSize:22,color:C('work'),marginTop:10}}>{c.kpi}</p></div>))}</div>)}

function Work({layout,onOpen,D}){const{T}=D;return(<section id="work" style={{padding:'100px 0',background:'var(--paper)',borderTop:'1px solid var(--line)'}}><div className="wrap">
<SecHead id="work" lang={D.lang} kicker="Campaigns & projects" title={T.workTitle} em={T.workEm} T={T}/>
{layout==='Lưới'?<Grid onOpen={onOpen} D={D}/>:<List onOpen={onOpen} D={D}/>}
</div></section>)}

function Videos({D}){return(<section style={{padding:'0 0 100px',background:'var(--paper)'}}><div className="wrap">
<p className="eyebrow" style={{marginBottom:20,marginTop:70,color:'#5F6624',fontSize:20,fontFamily:'Georgia',fontWeight:500,textAlign:'left',textTransform:'none',lineHeight:1}}>{D.T.videosLabel}</p>
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))',gap:22,alignItems:'start'}}>
{D.VIDEOS.map(v=><div key={v.id} className="reveal"><Slot id={'v3-'+v.id} label={v.l} ratio={v.r}/><p className="eyebrow" style={{marginTop:9}}>{v.l}</p></div>)}</div>
</div></section>)}

function Extra({D}){const{T}=D;return(<section id="extra" style={{padding:'100px 0',borderTop:'1px solid var(--line)'}}><div className="wrap">
<SecHead id="extra" lang={D.lang} kicker="Extracurricular activities" title={T.extraTitle} em={T.extraEm} T={T}/>
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:'0 44px'}}>
{D.EXTRA.map(x=>(<div key={x.r} className="reveal" style={{padding:'24px 0',borderTop:'2px solid '+C('extra')}}>
<p className="eyebrow">{x.y}</p><h3 className="disp" style={{fontSize:26,marginTop:8,lineHeight:1.15}}>{x.r}</h3>
<p className="eyebrow" style={{marginTop:8,color:'var(--ink)'}}>{x.o}</p>
<p className="body" style={{fontSize:14.5,marginTop:10}}>{x.d}</p></div>))}</div>
</div></section>)}

function Awards({D}){const{P,T}=D;return(<section id="awards" style={{padding:'100px 0',background:'var(--paper)',borderTop:'1px solid var(--line)'}}><div className="wrap">
<SecHead id="awards" lang={D.lang} kicker="Achievements" title={T.awardsTitle} em={T.awardsEm} T={T}/>
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(270px,1fr))',gap:'0 44px'}}>
{P.awards.map((a,i)=>(<div key={a} className="reveal" style={{display:'grid',gridTemplateColumns:'44px 1fr',gap:12,padding:'20px 0',borderTop:'1px solid var(--line)'}}>
<span className="disp" style={{fontSize:26,color:C('awards')}}>{String(i+1).padStart(2,'0')}</span>
<p style={{fontFamily:'var(--disp)',fontSize:20,lineHeight:1.35}}>{a}</p></div>))}</div>
</div></section>)}

function Contact({toast,D}){const{P,T}=D;return(<section id="contact" style={{padding:'110px 0 80px',borderTop:'1px solid var(--line)'}}><div className="wrap">
<p className="script" style={{fontSize:'clamp(52px,9vw,118px)',color:'var(--accent)'}}>{T.thanks}</p>
<p className="body" style={{marginTop:12,maxWidth:'30em'}}>{T.openTo}</p>
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:26,marginTop:52,paddingTop:28,borderTop:'1px solid var(--line)'}}>
{[[T.cEmail,P.email,'mailto:'+P.email],[T.cPhone,P.phone,'tel:+84797038080'],[T.cAddr,P.city,null],[T.cCv,T.cCvVal,'uploads/cv.pdf']].map(([l,v,h])=>(
<div key={l}><p className="eyebrow" style={{marginBottom:8}}>{l}</p>{h?<a href={h} target={h.indexOf('uploads')===0?'_blank':undefined} rel="noopener" style={{fontSize:15.5}}>{v}</a>:<span style={{fontSize:15.5}}>{v}</span>}</div>))}</div>
<div style={{display:'flex',gap:10,marginTop:40,flexWrap:'wrap'}}>
<button className="btn btn-solid" onClick={()=>{navigator.clipboard&&navigator.clipboard.writeText(P.email);toast(T.copied)}}>{T.copy}</button>
<a className="btn" href="#top" onClick={e=>{e.preventDefault();window.scrollTo({top:0,behavior:'smooth'})}}>{T.back}</a></div>
<p className="eyebrow" style={{marginTop:70}}>© 2026 Trần Tôn Nữ Thục Anh</p>
</div></section>)}

function Sheet({c,onClose,onNext,D}){const{T}=D;useEffect(()=>{const k=e=>{if(e.key==='Escape')onClose()};window.addEventListener('keydown',k);document.body.style.overflow='hidden';return()=>{window.removeEventListener('keydown',k);document.body.style.overflow=''}},[onClose]);
return(<div className="sheet">
<div style={{position:'sticky',top:0,zIndex:5,background:'color-mix(in oklab,var(--bg) 92%,transparent)',backdropFilter:'blur(12px)',borderBottom:'1px solid var(--line)'}}>
<div className="wrap" style={{height:74,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
<span className="eyebrow">{c.n} · {c.brand}</span><button className="btn" onClick={onClose}>{T.close}</button></div></div>
<div className="wrap" style={{padding:'66px 46px 110px'}}>
<p className="eyebrow">{c.tag} · {c.year}</p>
<h1 className="disp" style={{fontSize:'clamp(38px,6.6vw,90px)',maxWidth:'15em',marginTop:16}}>{c.title}</h1>
<p className="disp it" style={{fontSize:'clamp(20px,2.2vw,30px)',lineHeight:1.45,marginTop:22,maxWidth:'24em',color:C('work')}}>{c.summary}</p>
<div style={{marginTop:54}}><Slot id={'v3-shot-a-'+c.id} label={c.shots[0]} ratio="16/9"/></div>
{c.vids?<div style={{marginTop:26}}><h3 className="eyebrow" style={{marginBottom:16}}>{T.vid}</h3><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:24}}>{c.vids.map(v=><figure key={v.id}><VidSlot id={'v3-vid-'+c.id+'-'+v.id} hint={T.vidDrop} src={v.src}/><figcaption className="eyebrow" style={{marginTop:9}}>{v.l}</figcaption></figure>)}</div></div>:null}
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:56,margin:'74px 0'}}>
<div><h3 className="eyebrow" style={{marginBottom:14}}>{T.ctx}</h3><p style={{fontSize:16.5,lineHeight:1.8}}>{c.goal}</p></div>
<div><h3 className="eyebrow" style={{marginBottom:14}}>{T.did}</h3><ol style={{listStyle:'none',display:'grid',gap:15}}>{c.did.map((d,i)=><li key={i} style={{display:'grid',gridTemplateColumns:'30px 1fr',gap:10,fontSize:15.5,lineHeight:1.7}}><span className="eyebrow" style={{paddingTop:5,color:C('work')}}>{String(i+1).padStart(2,'0')}</span>{d}</li>)}</ol></div></div>
<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24}}><Slot id={'v3-shot-b-'+c.id} label={c.shots[1]}/><Slot id={'v3-shot-c-'+c.id} label={c.shots[2]}/></div>
<div style={{marginTop:82,paddingTop:32,borderTop:'1px solid var(--line)'}}>
<h3 className="eyebrow" style={{marginBottom:26}}>{T.res}</h3>
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:34}}>
{c.res.map(r=><div key={r.k}><p className="disp" style={{fontSize:'clamp(38px,5vw,64px)',color:C('cv')}}>{r.v}</p><p className="eyebrow" style={{marginTop:10}}>{r.k}</p></div>)}</div></div>
<div style={{marginTop:90,paddingTop:28,borderTop:'1px solid var(--line)',display:'flex',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}>
<button className="btn" onClick={onClose}>{T.allWork}</button>
<button className="btn btn-solid" onClick={onNext}>{T.nextWork}</button></div>
</div></div>)}

function App(){const[t,setTweak]=useTweaks(TWEAK_DEFAULTS);const[open,setOpen]=useState(null);const[msg,setMsg]=useState(null);
const lang=t.lang==='EN'?'EN':'VI';const D=Object.assign({lang},DATA[lang==='EN'?'en':'vi']);
useReveal(t.layout+String(t.showVideos)+t.opening+lang);
useEffect(()=>{document.documentElement.style.setProperty('--accent',t.accent);document.documentElement.style.setProperty('--scale',t.scale)},[t.accent,t.scale]);
useEffect(()=>{document.documentElement.lang=lang==='EN'?'en':'vi'},[lang]);
useEffect(()=>{if(!msg)return;const id=setTimeout(()=>setMsg(null),1800);return()=>clearTimeout(id)},[msg]);
const nav=k=>{if(k==='top')return window.scrollTo({top:0,behavior:'smooth'});const el=document.getElementById(k);if(el)window.scrollTo({top:el.getBoundingClientRect().top+window.scrollY-60,behavior:'smooth'})};
const next=()=>{const i=D.CAMPAIGNS.findIndex(x=>x.id===open.id);setOpen(D.CAMPAIGNS[(i+1)%D.CAMPAIGNS.length]);window.scrollTo({top:0})};
return(<div>
<Nav onNav={nav} lang={lang} setLang={v=>setTweak('lang',v)}/>
<Opening onNav={nav} variant={t.opening} D={D}/>
<About toast={setMsg} D={D}/><CV D={D}/><Education D={D}/>
<Work layout={t.layout} onOpen={setOpen} D={D}/>{t.showVideos?<Videos D={D}/>:null}
<Extra D={D}/><Awards D={D}/><Contact toast={setMsg} D={D}/>
{open?<Sheet c={D.CAMPAIGNS.find(x=>x.id===open.id)||open} onClose={()=>setOpen(null)} onNext={next} D={D}/>:null}
{msg?<div className="toast">{msg}</div>:null}
<TweaksPanel>
<TweakSection label="Ngôn ngữ"/>
<TweakRadio label="Language" value={lang} options={['VI','EN']} onChange={v=>setTweak('lang',v)}/>
<TweakSection label="Trang bìa"/>
<TweakRadio label="Kiểu mở đầu" value={t.opening} options={['Bìa + thư mục','Thư mục toàn trang']} onChange={v=>setTweak('opening',v)}/>
<TweakSection label="Màu & bố cục"/>
<TweakColor label="Màu chủ đạo" value={t.accent} options={['#CB7885','#893941','#5E6623','#D0A583']} onChange={v=>setTweak('accent',v)}/>
<TweakRadio label="Chiến dịch" value={t.layout} options={['Danh sách','Lưới']} onChange={v=>setTweak('layout',v)}/>
<TweakSlider label="Cỡ tiêu đề" value={t.scale} min={.85} max={1.25} step={.05} onChange={v=>setTweak('scale',v)}/>
<TweakToggle label="Mục nội dung/video" value={t.showVideos} onChange={v=>setTweak('showVideos',v)}/>
</TweaksPanel></div>)}
ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
