/* Trần Tôn Nữ Thục Anh — portfolio
 * Vanilla port of Claude Design project b8e2e5a4-1ed4-444a-81a6-089830b12b02, "Portfolio v3.html".
 * No framework, no build step. The design ships React dev + ReactDOM dev + Babel (~4.3 MB) and
 * compiles JSX in the browser; this reproduces the same DOM from config.json.
 *
 * Frozen design source and hash pins: docs/design/v3-source/
 * Deliberate differences from the design:   docs/design/v3-source/DEVIATIONS.md
 */
(function () {
  'use strict';

  // Where the site root is, derived from this script's own URL rather than assumed.
  // The Vietnamese shell is a real document at /vi/index.html, so a relative 'config.json'
  // would resolve against /vi/ and 404. Deriving the base from the script keeps one code path for both
  // shells and still works when the site is served from a subdirectory (localhost, a preview).
  var BASE = (function () {
    var s = document.currentScript;
    if (s && s.src) return s.src.replace(/[^/]*$/, '');
    var all = document.getElementsByTagName('script');
    for (var i = all.length - 1; i >= 0; i--) {
      if (/(^|\/)index(\.[0-9a-f]{8})?\.js$/.test(all[i].src)) return all[i].src.replace(/[^/]*$/, '');
    }
    return '/';
  })();
  var url = function (p) { return /^([a-z]+:|\/)/i.test(p) ? p : BASE + p; };

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var app = $('#app'), sheetHost = $('#sheet-host'), toastHost = $('#toast-host');

  // A browser still holding index.html from BEFORE the content-hashed release references the
  // unhashed index.js. That page has none of these mount points, so every lookup is null and the
  // renderer would throw. Reload once (guarded) to pick up the current HTML; if the mount points
  // are still missing after that, stop quietly rather than erroring in the console.
  if (!app || !sheetHost || !toastHost) {
    try {
      if (!sessionStorage.getItem('shellreload')) {
        sessionStorage.setItem('shellreload', '1');
        location.reload();
      }
    } catch (e) { /* storage unavailable: do nothing rather than loop */ }
    return;
  }
  try { sessionStorage.removeItem('shellreload'); } catch (e) {}

  var D = null;          // full config
  var M = null;          // config.meta
  var lang = 'VI';       // 'VI' | 'EN'
  var L = null;          // active language pack
  var sheetState = null; // { id, opener }
  var toastTimer = null;

  /* ── tiny DOM helper ─────────────────────────────────────────────────── */
  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (k.slice(0, 2) === '--') el.style.setProperty(k, v);
      else if (k === 'style') el.setAttribute('style', v);
      else el.setAttribute(k, v);
    });
    (kids || []).forEach(function (c) {
      if (c == null || c === false) return;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return el;
  }

  /* ── i18n by path ────────────────────────────────────────────────────────
     Language is a document, not a state. `/` is English, `/vi/` is Vietnamese,
     and the toggle navigates between them, so text is written once at render
     and never mutated. VI and EN are structurally identical — asserted at
     extraction time by tools/build/extract-config.mjs — so a path valid in one
     is valid in the other.                                                    */
  function get(obj, path) {
    return path.split('.').reduce(function (o, k) {
      return o == null ? undefined : o[k];
    }, obj);
  }
  // Sets an element's text from a dotted path into the active language pack. A missing key
  // renders empty rather than the literal string "undefined".
  function ti(el, path) {
    var v = get(L, path);
    el.textContent = (v == null) ? '' : String(v);
    return el;
  }

  /* ── design helpers, mirroring the design's own C() and TINT() ───────── */
  function folder(id) {
    for (var i = 0; i < M.folders.length; i++) if (M.folders[i].id === id) return M.folders[i];
    return {};
  }
  // Surface colour: the design's value, untouched.
  function C(id) { return folder(id).c || 'var(--accent)'; }
  // Text colour: a darkened variant of the same hue. The design uses one colour for both roles,
  // and as text several of them fail WCAG AA badly against the tinted section background.
  // See DEVIATIONS.md D1.
  function CT(id) { return folder(id).tc || folder(id).c || 'var(--ink)'; }
  function TINT(id, p) {
    return 'color-mix(in oklab, ' + C(id) + ' ' + (p || 9) + '%, #FBFAF6)';
  }

  /* ── reveal on scroll ────────────────────────────────────────────────── */
  var io = null;
  function observeReveals() {
    if (!('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(document.querySelectorAll('.reveal'), function (n) { n.classList.add('in'); });
      return;
    }
    if (!io) {
      io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
        });
      }, { threshold: 0.1 });
    }
    // never double-observe: .in nodes are already resolved
    Array.prototype.forEach.call(document.querySelectorAll('.reveal:not(.in)'), function (n) { io.observe(n); });
  }

  /* ── media ───────────────────────────────────────────────────────────────
     An unset slot renders NOTHING — not a labelled grey frame. A visible empty
     placeholder reads as "unfinished" to a visitor, which is the most expensive
     impression a portfolio can make. A section whose slots are all empty hides
     itself entirely. See DEVIATIONS.md D7.                                    */
  function slot(src, alt, ratio, fit, pos, responsive) {
    // A missing image renders NOTHING on the live site. A labelled empty frame tells a recruiter
    // the portfolio is unfinished, which is the most expensive impression it can make — see
    // DEVIATIONS.md D7. `meta.showPlaceholders` turns the frames back on for local preview, so
    // the gaps are visible while filling them. It must stay false in anything deployed.
    if (!src) {
      if (!M.showPlaceholders) return null;
      return h('div', { class: 'frame slot-empty', style: 'aspect-ratio:' + (ratio || '4/3') }, [
        h('span', { class: 'eyebrow', text: alt || 'image' })
      ]);
    }
    var img = {
      src: url(src), alt: alt || '', loading: 'lazy', decoding: 'async',
      style: 'width:100%;height:100%;object-fit:' + (fit || 'cover') + ';object-position:' + (pos || '50% 30%') + ';display:block'
    };
    // A fixed src makes every device download the same file. The portrait is the largest image on
    // the page and renders at ~450 CSS px in a desktop column but full-bleed on a phone, so the
    // right file differs by a factor of four. `sizes` describes the LAYOUT, not the file — the
    // browser combines it with DPR to pick.
    if (responsive) { img.srcset = responsive.srcset.replace(/(\S+)(\s\d+w)/g, function (_, u, w) { return url(u) + w; }); img.sizes = responsive.sizes; }
    return h('div', { class: 'frame', style: 'aspect-ratio:' + (ratio || '4/3') + (fit === 'contain' ? ';background:var(--paper)' : '') }, [h('img', img)]);
  }

  function embedUrl(u) {
    u = (u || '').trim();
    if (!u) return null;
    var m = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|live\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
    if (m) return 'https://www.youtube.com/embed/' + m[1];
    m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (m) return 'https://player.vimeo.com/video/' + m[1];
    m = u.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
    if (m) return 'https://drive.google.com/file/d/' + m[1] + '/preview';
    // Unrecognised host: render nothing rather than framing an arbitrary URL. Most sites refuse
    // to be framed and produce an empty box, which D7 says the site never shows.
    return null;
  }
  function video(src, title, ratio) {
    var e = embedUrl(src);
    if (!e) return null;
    // The config records each clip's real aspect ratio. A vertical TikTok cut rendered at 16/9
    // is letterboxed into a black slab — which is exactly what the design's own grid does.
    return h('div', { class: 'frame', style: 'aspect-ratio:' + (ratio || '16/9') }, [
      h('iframe', {
        src: e, title: title || '', loading: 'lazy',
        allow: 'accelerometer;autoplay;clipboard-write;encrypted-media;picture-in-picture',
        allowfullscreen: '',
        style: 'width:100%;height:100%;border:0;display:block;background:#2B2A25'
      })
    ]);
  }

  function brandLogo(name) {
    var b = M.brandLogos[name];
    if (!b) return h('span', { text: name });
    return h('img', { class: 'blogo', src: url(b[0]), alt: name, loading: 'lazy', decoding: 'async', style: 'height:' + b[1] + 'px' });
  }
  function campaignLogo(id, scale) {
    var c = M.campaignLogos[id];
    if (!c) return null;
    return h('img', { src: url(c[0]), alt: '', loading: 'lazy', decoding: 'async',
      style: 'height:' + Math.round(c[1] * (scale || 1)) + 'px;width:auto;object-fit:contain;opacity:.88;display:block' });
  }

  /* ── section head ────────────────────────────────────────────────────── */
  function secHead(id, kickerPath, titlePath, emPath, right) {
    // The section colour is a 2px rule under the head. As a rule it is a surface, so it keeps the
    // design's value; the kicker text beside it uses the darkened variant.
    var head = h('div', { class: 'sechead', style: '--sc:' + C(id) });
    var left = h('div');
    if (kickerPath) left.appendChild(ti(h('p', { class: 'eyebrow', 'data-kicker': id, style: 'color:' + CT(id) }), kickerPath));
    var t = h('h2', { class: 'disp sectitle' });
    t.appendChild(ti(h('span'), titlePath));
    if (emPath) {
      t.appendChild(document.createTextNode(' '));
      t.appendChild(ti(h('span', { class: 'it', style: 'color:' + CT(id) }), emPath));
    }
    left.appendChild(t);
    head.appendChild(left);
    head.appendChild(right || ti(h('a', {
      class: 'backtop', href: '#top',
      onclick: function (e) { e.preventDefault(); navTo('top'); }
    }), 'T.back'));
    return head;
  }

  function cvPath() {
    var c = M.cv;
    if (typeof c === 'string') return c;                 // pre-split config
    return c[lang === 'EN' ? 'en' : 'vi'] || c.vi || c.en;
  }
  function cvLink(cls, textPath) {
    return ti(h('a', { class: cls, href: url(cvPath()), download: '', 'data-qa': 'cv-download' }), textPath);
  }

  /* ── sections ────────────────────────────────────────────────────────── */

  function opening() {
    var sec = h('section', { id: 'top', class: 'hero' });
    var grid = h('div', { class: 'herogrid' });

    var col = h('div');
    col.appendChild(ti(h('p', { class: 'eyebrow' }), 'P.niche'));
    col.appendChild(h('h1', { class: 'disp herotitle' }, [
      'Port', h('span', { class: 'script', text: 'folio' })
    ]));
    var nm = h('p', { class: 'disp heroname' });
    nm.appendChild(ti(h('span'), 'P.name'));
    nm.appendChild(h('br'));
    nm.appendChild(ti(h('strong'), 'P.name2'));
    col.appendChild(nm);
    col.appendChild(ti(h('p', { class: 'body', style: 'margin-top:22px;max-width:30em' }), 'P.intro'));
    col.appendChild(h('div', { class: 'heropills' }, [
      ti(h('span', { class: 'pill' }), 'P.role'),
      ti(h('span', { class: 'pill' }), 'P.city')
    ]));
    var proof = h('div', { class: 'proof' });
    var pstats = h('div', { class: 'proofstats' });
    L.P.stats.forEach(function (_, i) {
      pstats.appendChild(h('div', null, [
        ti(h('span', { class: 'disp proofv' }), 'P.stats.' + i + '.v'),
        ti(h('span', { class: 'eyebrow proofk' }), 'P.stats.' + i + '.k')
      ]));
    });
    proof.appendChild(pstats);
    proof.appendChild(h('p', { class: 'eyebrow proofbrands', 'data-hero-brands': '',
      text: L.P.brands.join(' · ') }));
    col.appendChild(proof);
    col.appendChild(ti(h('p', { class: 'eyebrow', style: 'margin-top:34px' }), 'T.pick'));
    grid.appendChild(col);

    var stack = h('div', { class: 'stack' }, [h('div', { class: 'clip' })]);
    M.folders.forEach(function (f) {
      // --off-instance, not --off. A media query CANNOT override an inline custom property, so the
      // stagger is consumed through `.folder{--off:var(--off-instance,0px)}` and the responsive
      // tier zeroes --off cleanly.
      var btn = h('button', {
        type: 'button', class: 'folder', '--off-instance': f.off + 'px',
        'data-qa': 'folder-' + f.id,
        onclick: function () { navTo(f.id); }
      });
      var tab = h('div', { class: 'tab', style: 'background:' + f.c + ';color:' + f.t });
      // The design hides the tab label in EN (visibility:hidden;width:126px), leaving a blank tab
      // that reads as broken. It shows the label instead. See DEVIATIONS.md D2.
      tab.appendChild(ti(h('span', { class: 'tabname' }), 'F.' + f.id + '.t'));
      btn.appendChild(tab);
      var body = h('div', { class: 'folder-body', style: 'background:' + f.c + ';color:' + f.t });
      // The design prints each label twice — once on the tab, once again 30px below it in the
      // body, both from F.<id>.t. Dropping the repeat and promoting the note into its place is
      // what lets all seven tiles clear a short laptop viewport: the tile goes 130px -> 100px
      // and the stack 814px -> 604px, without touching the stagger, tab, clip or hover lift.
      body.appendChild(ti(h('p', { class: 'disp fnote-lead' }), 'F.' + f.id + '.n'));
      body.appendChild(ti(h('span', { class: 'fgo' }), 'T.open'));
      btn.appendChild(body);
      stack.appendChild(btn);
    });
    grid.appendChild(stack);
    sec.appendChild(h('div', { class: 'wrap', style: 'width:100%' }, [grid]));
    return sec;
  }

  function about() {
    var P = L.P;
    var sec = h('section', { id: 'about', class: 'sec', style: 'background:' + TINT('about', 14) });
    var w = h('div', { class: 'wrap' });
    w.appendChild(secHead('about', 'T.aboutKicker', 'T.aboutTitle', 'T.aboutEm'));

    var grid = h('div', { class: 'gcol2' });
    var main = h('div', { class: 'reveal' });
    var q = h('h3', { class: 'disp aboutquote' });
    q.appendChild(ti(h('span'), 'T.aboutQuote.0'));
    q.appendChild(ti(h('span', { class: 'it', style: 'color:' + CT('about') }), 'T.aboutQuote.1'));
    main.appendChild(q);
    var bio = h('div', { class: 'bio' });
    P.bio.forEach(function (_, i) { bio.appendChild(ti(h('p', { class: 'body' }), 'P.bio.' + i)); });
    main.appendChild(bio);

    var sk = h('div', { class: 'skills' });
    P.skills.forEach(function (s, i) {
      var ul = h('ul');
      s.i.forEach(function (_, j) { ul.appendChild(ti(h('li'), 'P.skills.' + i + '.i.' + j)); });
      sk.appendChild(h('div', null, [
        ti(h('h3', { class: 'eyebrow', style: 'color:var(--ink);margin-bottom:13px' }), 'P.skills.' + i + '.h'),
        ul
      ]));
    });
    main.appendChild(sk);

    var st = h('div', { class: 'stats' });
    P.stats.forEach(function (_, i) {
      st.appendChild(h('div', null, [
        ti(h('p', { class: 'disp statv', style: 'color:' + CT('about') }), 'P.stats.' + i + '.v'),
        ti(h('p', { class: 'eyebrow', style: 'margin-top:6px' }), 'P.stats.' + i + '.k')
      ]));
    });
    main.appendChild(st);
    grid.appendChild(main);

    var side = h('div', { class: 'reveal' });
    var portrait = slot(M.portrait, null, '3/4', 'cover', '50% 22%', M.portraitSet);
    if (portrait) {
      portrait.querySelector('img').alt = L.T.portraitLabel;
      side.appendChild(portrait);
    }
    var card = h('div', { class: 'card', style: 'background:' + C('about') });
    card.appendChild(ti(h('p', { class: 'eyebrow' }), 'T.contact'));
    var links = h('div', { class: 'cardlinks' }, [
      ti(h('a', { href: 'mailto:' + P.email }), 'P.email'),
      ti(h('a', { href: 'tel:' + P.phone.replace(/[^\d+]/g, '') }), 'P.phone'),
      ti(h('span'), 'P.city'),
      ti(h('a', { href: P.linkedin, target: '_blank', rel: 'noopener me' }), 'P.linkedinLabel')
    ]);
    card.appendChild(links);
    card.appendChild(h('div', { class: 'cardbtns' }, [
      cvLink('btn', 'T.cvBtn'),
      ti(h('button', { type: 'button', class: 'btn', onclick: copyEmail }), 'T.copy')
    ]));
    side.appendChild(card);
    grid.appendChild(side);
    w.appendChild(grid);

    var brands = h('div', { class: 'brands' });
    brands.appendChild(ti(h('p', { class: 'eyebrow', style: 'margin-bottom:20px' }), 'T.brandsLabel'));
    brands.appendChild(h('div', { class: 'brandwall reveal' }, P.brands.map(brandLogo)));
    w.appendChild(brands);

    sec.appendChild(w);
    return sec;
  }

  function education() {
    var sec = h('section', { id: 'education', class: 'sec', style: 'background:' + TINT('education', 16) });
    var w = h('div', { class: 'wrap' });
    w.appendChild(secHead('education', 'F.education.t', 'T.eduTitle'));
    var notes = h('ul', { class: 'edunotes' });
    L.P.edu.notes.forEach(function (_, i) { notes.appendChild(ti(h('li'), 'P.edu.notes.' + i)); });
    w.appendChild(h('div', { class: 'edugrid reveal' }, [
      h('div', null, [
        ti(h('h3', { class: 'disp eduschool' }), 'P.edu.school'),
        ti(h('p', { class: 'body', style: 'margin-top:14px' }), 'P.edu.deg'),
        ti(h('p', { class: 'eyebrow', style: 'margin-top:8px' }), 'P.edu.years')
      ]),
      notes
    ]));
    sec.appendChild(w);
    return sec;
  }

  function cvSection() {
    var sec = h('section', { id: 'cv', class: 'sec', style: 'background:' + TINT('cv', 13) });
    var w = h('div', { class: 'wrap' });
    w.appendChild(secHead('cv', 'F.cv.t', 'T.cvTitle', 'T.cvEm', cvLink('btn', 'T.cvBtn')));
    L.P.cv.forEach(function (j, i) {
      var ul = h('ul', { class: 'jobdo body' });
      j.d.forEach(function (_, k) {
        var li = h('li');
        li.appendChild(document.createTextNode('— '));
        li.appendChild(ti(h('span'), 'P.cv.' + i + '.d.' + k));
        ul.appendChild(li);
      });
      w.appendChild(h('div', { class: 'reveal jobrow' }, [
        ti(h('span', { class: 'eyebrow', style: 'padding-top:8px' }), 'P.cv.' + i + '.y'),
        h('div', null, [
          ti(h('h3', { class: 'jobrole' }), 'P.cv.' + i + '.r'),
          ti(h('p', { class: 'eyebrow', style: 'color:' + CT('cv') + ';margin-top:8px' }), 'P.cv.' + i + '.c'),
          ul,
          // Evidence, where it exists. A brand named on the wall with nothing behind it is a
          // question a recruiter can ask and the page cannot answer.
          j.link ? ti(h('a', {
            class: 'eyebrow joblink', href: j.link, target: '_blank', rel: 'noopener'
          }), 'T.samples') : null
        ])
      ]));
    });
    w.appendChild(h('hr', { class: 'rule' }));
    sec.appendChild(w);
    return sec;
  }

  function work() {
    var sec = h('section', { id: 'work', class: 'sec', style: 'background:' + TINT('work', 7) });
    var w = h('div', { class: 'wrap' });
    w.appendChild(secHead('work', 'F.work.t', 'T.workTitle', 'T.workEm'));
    var peek = null;
    L.CAMPAIGNS.forEach(function (c, i) {
      var row = h('button', {
        type: 'button', class: 'crow reveal', 'data-qa': 'campaign-' + c.id, 'data-campaign': c.id,
        onclick: function () { openSheet(c.id, row); }
      });
      row.appendChild(ti(h('span', { class: 'eyebrow', style: 'padding-top:14px' }), 'CAMPAIGNS.' + i + '.n'));
      row.appendChild(h('div', null, [
        ti(h('h3', { class: 'ct disp' }), 'CAMPAIGNS.' + i + '.title'),
        ti(h('p', { class: 'body csum' }), 'CAMPAIGNS.' + i + '.summary')
      ]));
      var meta = h('div', { class: 'cmeta', style: 'padding-top:14px' });
      var lg = campaignLogo(c.id);
      if (lg) meta.appendChild(lg);
      var tagline = h('p', { class: 'eyebrow', style: 'margin-top:10px' });
      tagline.appendChild(ti(h('span'), 'CAMPAIGNS.' + i + '.tag'));
      tagline.appendChild(document.createTextNode(' · '));
      tagline.appendChild(ti(h('span'), 'CAMPAIGNS.' + i + '.year'));
      meta.appendChild(tagline);
      row.appendChild(meta);
      row.appendChild(h('div', { class: 'ckpi' }, [
        ti(h('p', { class: 'disp it', style: 'color:' + CT('work') }), 'CAMPAIGNS.' + i + '.kpi')
      ]));
      // A persistent open cue, mirroring the folder tiles. Every other signal that these rows are
      // interactive is pointer-only or hidden below 900px, so on a phone the six strongest items
      // on the page were typographically identical to the static job rows above them.
      row.appendChild(ti(h('span', { class: 'cgo eyebrow' }), 'T.open'));

      // Hover peek: a pointer affordance only. It is hidden below 900px and never focusable,
      // so it adds nothing a keyboard or touch user has to get past.
      if (c.shotSrc && c.shotSrc[0]) {
        row.addEventListener('mouseenter', function () {
          if (window.matchMedia('(max-width:900px)').matches) return;
          peek = h('div', { class: 'peek' }, [slot(c.shotSrc[0], '', c.shotRatio || '16/9', c.shotFit)]);
          document.body.appendChild(peek);
        });
        row.addEventListener('mousemove', function (e) {
          if (!peek) return;
          peek.style.left = Math.min(e.clientX + 28, window.innerWidth - 290) + 'px';
          peek.style.top = Math.max(e.clientY - 100, 20) + 'px';
        });
        row.addEventListener('mouseleave', function () {
          if (peek) { peek.remove(); peek = null; }
        });
      }
      w.appendChild(row);
    });
    w.appendChild(h('hr', { class: 'rule' }));
    sec.appendChild(w);
    return sec;
  }

  function videos() {
    // Build first, decide after. Testing for a src before building let a host embedUrl() does
    // not recognise produce a heading with an empty grid under it.
    var sec = h('section', { class: 'sec', style: 'background:' + TINT('work', 7) + ';border-top:0;padding-top:0' });
    var w = h('div', { class: 'wrap' });
    w.appendChild(ti(h('p', { class: 'disp vidlabel' }), 'T.videosLabel'));
    var grid = h('div', { class: 'vidgrid' });
    L.VIDEOS.forEach(function (v, i) {
      if (!v.src) return;
      var cell = h('div', { class: 'reveal' });
      var vel = video(v.src, v.l, v.r);
      if (!vel) return;
      cell.appendChild(vel);
      cell.appendChild(ti(h('p', { class: 'eyebrow', style: 'margin-top:9px' }), 'VIDEOS.' + i + '.l'));
      grid.appendChild(cell);
    });
    if (!grid.children.length) return null;      // D7: an all-empty section renders nothing
    if (grid.children.length === 1) grid.className += ' single';
    w.appendChild(grid);
    sec.appendChild(w);
    return sec;
  }

  function extra() {
    var sec = h('section', { id: 'extra', class: 'sec', style: 'background:' + TINT('extra', 12) });
    var w = h('div', { class: 'wrap' });
    w.appendChild(secHead('extra', 'F.extra.t', 'T.extraTitle', 'T.extraEm'));
    var grid = h('div', { class: 'listgrid' });
    L.EXTRA.forEach(function (_, i) {
      grid.appendChild(h('div', { class: 'reveal', style: 'padding:24px 0;border-top:1px solid ' + C('extra') }, [
        ti(h('p', { class: 'eyebrow' }), 'EXTRA.' + i + '.y'),
        ti(h('h3', { class: 'disp', style: 'font-size:26px;margin-top:8px;line-height:1.15' }), 'EXTRA.' + i + '.r'),
        ti(h('p', { class: 'eyebrow', style: 'margin-top:8px;color:var(--ink)' }), 'EXTRA.' + i + '.o'),
        ti(h('p', { class: 'body', style: 'font-size:14.5px;margin-top:10px' }), 'EXTRA.' + i + '.d')
      ]));
    });
    w.appendChild(grid);
    sec.appendChild(w);
    return sec;
  }

  function awards() {
    var sec = h('section', { id: 'awards', class: 'sec', style: 'background:' + TINT('awards', 10) });
    var w = h('div', { class: 'wrap' });
    w.appendChild(secHead('awards', 'F.awards.t', 'T.awardsTitle', 'T.awardsEm'));
    var ol = h('ol', { class: 'listgrid', style: 'list-style:none;margin-top:8px' });
    L.P.awards.forEach(function (_, i) {
      ol.appendChild(h('li', { class: 'reveal awardrow' }, [
        h('span', { class: 'eyebrow', style: 'padding-top:6px;color:' + CT('awards'), text: String(i + 1).padStart(2, '0') }),
        ti(h('span', { class: 'disp' }), 'P.awards.' + i)
      ]));
    });
    w.appendChild(ol);
    sec.appendChild(w);
    return sec;
  }

  function xfile() {
    var sec = h('section', { id: 'xfile', class: 'sec', style: 'background:' + TINT('xfile', 20) });
    var w = h('div', { class: 'wrap' });
    w.appendChild(secHead('xfile', 'F.xfile.t', 'T.xfileTitle', 'T.xfileEm'));
    if (L.T.xfileIntro) w.appendChild(ti(h('p', { class: 'body', style: 'max-width:34em;margin:-18px 0 46px' }), 'T.xfileIntro'));
    var grid = h('div', { class: 'xgrid' });
    L.XFILE.forEach(function (_, i) {
      grid.appendChild(h('div', { class: 'reveal', style: 'padding:22px 0;border-top:1px solid var(--line)' }, [
        h('div', { class: 'xhead' }, [
          h('span', { class: 'disp xnum', style: 'color:' + CT('xfile'), text: String(i + 1).padStart(2, '0') }),
          ti(h('h3', { class: 'disp', style: 'font-size:24px;line-height:1.25' }), 'XFILE.' + i + '.k')
        ]),
        ti(h('p', { class: 'body', style: 'margin-top:10px;font-size:14.5px' }), 'XFILE.' + i + '.d')
      ]));
    });
    w.appendChild(grid);
    var drive = h('a', {
      class: 'reveal xdrive', href: L.T.xfileDriveUrl, target: '_blank', rel: 'noopener',
      style: 'background:' + C('xfile') + ';color:#43423B'
    }, [
      h('span', null, [
        ti(h('span', { class: 'eyebrow', style: 'color:#43423B' }), 'T.xfileDriveKicker'),
        ti(h('span', { class: 'disp xdrivetitle' }), 'T.xfileDriveTitle')
      ]),
      ti(h('span', { class: 'eyebrow xdrivebtn' }), 'T.xfileDriveBtn')
    ]);
    w.appendChild(drive);
    sec.appendChild(w);
    return sec;
  }

  function contact() {
    var P = L.P;
    var sec = h('section', { id: 'contact', class: 'sec', style: 'padding:110px 0 80px;background:' + TINT('about', 5) });
    var w = h('div', { class: 'wrap' });
    w.appendChild(ti(h('p', { class: 'script thanks' }), 'T.thanks'));
    w.appendChild(ti(h('p', { class: 'body', style: 'margin-top:12px;max-width:30em' }), 'T.openTo'));
    var grid = h('div', { class: 'cgrid' });
    [
      ['T.cEmail', 'P.email', 'mailto:' + P.email, null],
      ['T.cPhone', 'P.phone', 'tel:' + P.phone.replace(/[^\d+]/g, ''), null],
      ['T.cAddr', 'P.city', null, null],
      ['T.cCv', 'T.cCvVal', url(cvPath()), true],
      ['T.cLinkedin', 'P.linkedinLabel', P.linkedin, false, true]
    ].forEach(function (row) {
      var cell = h('div', null, [ti(h('p', { class: 'eyebrow', style: 'margin-bottom:8px' }), row[0])]);
      cell.appendChild(row[2]
        ? ti(h('a', row[3] ? { href: row[2], download: '' }
              : row[4] ? { href: row[2], target: '_blank', rel: 'noopener me' }
              : { href: row[2] }), row[1])
        : ti(h('span'), row[1]));
      grid.appendChild(cell);
    });
    w.appendChild(grid);
    w.appendChild(h('div', { style: 'display:flex;gap:10px;margin-top:40px;flex-wrap:wrap' }, [
      ti(h('button', { type: 'button', class: 'btn btn-solid', onclick: copyEmail }), 'T.copy'),
      ti(h('a', { class: 'btn', href: '#top', onclick: function (e) { e.preventDefault(); navTo('top'); } }), 'T.back')
    ]));
    w.appendChild(h('p', { class: 'eyebrow', style: 'margin-top:70px', text: '© 2026 Trần Tôn Nữ Thục Anh' }));
    sec.appendChild(w);
    return sec;
  }

  /* ── campaign sheet ──────────────────────────────────────────────────── */
  function sheetFor(id) {
    var i = -1;
    L.CAMPAIGNS.forEach(function (c, k) { if (c.id === id) i = k; });
    if (i < 0) return null;
    var c = L.CAMPAIGNS[i], p = 'CAMPAIGNS.' + i + '.';

    var sheet = h('div', {
      class: 'sheet', role: 'dialog', 'aria-modal': 'true',
      'aria-label': c.title, 'data-qa-campaign': c.id, tabindex: '-1'
    });

    var headline = h('span', { class: 'eyebrow' });
    headline.appendChild(ti(h('span'), p + 'n'));
    headline.appendChild(document.createTextNode(' · '));
    headline.appendChild(ti(h('span'), p + 'brand'));
    sheet.appendChild(h('div', { class: 'sheet-head' }, [
      h('div', { class: 'wrap' }, [
        headline,
        ti(h('button', { type: 'button', class: 'btn', onclick: function () { closeSheet(); } }), 'T.close')
      ])
    ]));

    var b = h('div', { class: 'wrap sheet-body' });
    var tagline = h('p', { class: 'eyebrow' });
    tagline.appendChild(ti(h('span'), p + 'tag'));
    tagline.appendChild(document.createTextNode(' · '));
    tagline.appendChild(ti(h('span'), p + 'year'));
    b.appendChild(tagline);
    b.appendChild(ti(h('h2', { class: 'disp sheet-title' }), p + 'title'));
    b.appendChild(ti(h('p', { class: 'disp it sheet-sum', style: 'color:' + CT('work') }), p + 'summary'));

    var srcs = (c.shotSrc || []).filter(Boolean);
    if (srcs.length) {
      var shots = h('div', { class: 'shots ' + (srcs.length > 1 ? 'two' : 'one') });
      srcs.forEach(function (src, k) {
        var ratio = k ? (c.shotRatio2 || '4/3') : (c.shotRatio || '16/9');
        var fig = h('figure', k === 0 && c.shotSpan ? { class: 'span' } : null, [
          slot(src, c.shots && c.shots[k], ratio, c.shotFit, '50% 50%', c.shotSet && c.shotSet[String(k)]),
          ti(h('figcaption', { class: 'eyebrow', style: 'margin-top:9px' }), p + 'shots.' + k)
        ]);
        shots.appendChild(fig);
      });
      b.appendChild(shots);
    }

    if (c.vids && c.vids.length) {
      var vwrap = h('div', { style: 'margin-top:26px' }, [ti(h('h3', { class: 'eyebrow', style: 'margin-bottom:16px' }), 'T.vid')]);
      var vg = h('div', { class: 'sheet-vids' });
      c.vids.forEach(function (v, k) {
        var el = video(v.src, v.l);
        if (!el) return;
        vg.appendChild(h('figure', null, [el, ti(h('figcaption', { class: 'eyebrow', style: 'margin-top:9px' }), p + 'vids.' + k + '.l')]));
      });
      if (vg.children.length) { vwrap.appendChild(vg); b.appendChild(vwrap); }
    }

    var did = h('ol', { class: 'didlist' });
    (c.did || []).forEach(function (_, k) {
      did.appendChild(h('li', { class: 'didrow' }, [
        h('span', { class: 'eyebrow', style: 'padding-top:5px;color:' + CT('work'), text: String(k + 1).padStart(2, '0') }),
        ti(h('span'), p + 'did.' + k)
      ]));
    });
    b.appendChild(h('div', { class: 'sheet-ctx' }, [
      h('div', null, [ti(h('h3', { class: 'eyebrow', style: 'margin-bottom:14px' }), 'T.ctx'),
        ti(h('p', { style: 'font-size:16.5px;line-height:1.8' }), p + 'goal')]),
      h('div', null, [ti(h('h3', { class: 'eyebrow', style: 'margin-bottom:14px' }), 'T.did'), did])
    ]));

    if (c.archive && c.archive.length) {
      var arc = h('div', { style: 'margin-top:10px;padding-top:30px;border-top:1px solid var(--line)' }, [
        ti(h('h3', { class: 'eyebrow', style: 'margin-bottom:6px' }), 'T.arcTitle'),
        ti(h('p', { class: 'body', style: 'font-size:14.5px;max-width:34em;margin-bottom:22px' }), 'T.arcNote')
      ]);
      var ag = h('div', { class: 'arcgrid' });
      c.archive.forEach(function (m, k) {
        ag.appendChild(h('figure', null, [
          h('div', { style: 'border:1px solid var(--line);background:var(--paper);overflow:hidden' }, [
            h('img', { src: url(m.src), alt: '', loading: 'lazy', decoding: 'async' })
          ]),
          ti(h('figcaption', { class: 'eyebrow', style: 'margin-top:8px' }), p + 'archive.' + k + '.m')
        ]));
      });
      arc.appendChild(ag);
      b.appendChild(arc);
    }

    var res = h('div', { class: 'sheet-res' });
    (c.res || []).forEach(function (_, k) {
      res.appendChild(h('div', null, [
        ti(h('p', { class: 'disp resv' }), p + 'res.' + k + '.v'),
        ti(h('p', { class: 'eyebrow', style: 'margin-top:10px' }), p + 'res.' + k + '.k')
      ]));
    });
    b.appendChild(h('div', { style: 'margin-top:82px;padding-top:32px;border-top:1px solid var(--line)' }, [
      ti(h('h3', { class: 'eyebrow', style: 'margin-bottom:26px' }), c.outcomes ? 'T.res' : 'T.scope'), res
    ]));

    b.appendChild(h('div', { class: 'sheet-foot' }, [
      ti(h('button', { type: 'button', class: 'btn', onclick: function () { closeSheet(); } }), 'T.allWork'),
      ti(h('button', {
        type: 'button', class: 'btn btn-solid',
        onclick: function () {
          var n = -1;
          L.CAMPAIGNS.forEach(function (x, k) { if (x.id === sheetState.id) n = k; });
          openSheet(L.CAMPAIGNS[(n + 1) % L.CAMPAIGNS.length].id, sheetState.opener, true);
        }
      }), 'T.nextWork')
    ]));

    sheet.appendChild(b);
    return sheet;
  }

  // Registered on document with capture:true, so Escape is handled before it reaches anything
  // inside the sheet. Nothing in the sheet currently wants Escape — but if a text input is ever
  // added here (the design has one, for pasting a video link, which is not ported), it will never
  // see the key, and Escape will close the whole sheet instead of dismissing the input. Give such
  // a control its own keydown handler that calls stopPropagation FIRST, in the capture phase.
  function trapFocus(e) {
    if (e.key === 'Escape') { e.stopPropagation(); closeSheet(); return; }
    if (e.key !== 'Tab' || !sheetHost.firstChild) return;
    var f = sheetHost.firstChild.querySelectorAll('a[href],button:not([disabled]),iframe,[tabindex]:not([tabindex="-1"])');
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function openSheet(id, opener, keepOpener) {
    var el = sheetFor(id);
    if (!el) return;
    var wasOpen = !!sheetHost.firstChild;
    sheetState = {
      id: id,
      opener: keepOpener && sheetState ? sheetState.opener : opener,
      // Closing must put the reader back exactly where they were. opener.focus() on its own
      // scrolls the row into view, which moved the page by over a thousand pixels.
      scrollY: wasOpen && sheetState ? sheetState.scrollY : window.scrollY
    };
    sheetHost.innerHTML = '';
    sheetHost.appendChild(el);
    // Compensate for the scrollbar the locked body no longer shows, or the page shifts sideways.
    var gutter = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (gutter > 0) document.body.style.paddingRight = gutter + 'px';
    app.setAttribute('inert', '');
    document.addEventListener('keydown', trapFocus, true);
    el.focus();
    // One history entry for the whole sheet session, not one per campaign. "Next campaign"
    // replaces it: chaining three sheets used to leave three entries, so Back stepped between
    // closed sheets and closing landed on a stale hash.
    try {
      if (wasOpen) history.replaceState({ sheet: id }, '', '#' + id);
      else history.pushState({ sheet: id }, '', '#' + id);
    } catch (e) {}
    // The design's next() calls window.scrollTo, which does not reset the sheet's own scroll —
    // so the second campaign opens halfway down. Reset the sheet itself.
    el.scrollTop = 0;
  }

  function closeSheet(fromPop) {
    if (!sheetHost.firstChild) return;
    // Strip the hash with replaceState rather than history.back(). back() is async: it landed on
    // a same-document hash entry, the browser scrolled to it, and the synchronous focus restore
    // below then fought it — focus ended on <body> and the page jumped to the top. replaceState
    // is synchronous and does not scroll. The Back GESTURE still closes the sheet, via popstate.
    if (!fromPop) {
      try {
        if ((history.state || {}).sheet) history.replaceState(null, '', location.pathname + location.search);
      } catch (e) {}
    }
    var opener = sheetState && sheetState.opener;
    var restoreY = sheetState ? sheetState.scrollY : null;
    sheetHost.innerHTML = '';
    sheetState = null;
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    app.removeAttribute('inert');
    document.removeEventListener('keydown', trapFocus, true);
    if (opener && document.contains(opener)) opener.focus({ preventScroll: true });
    if (restoreY != null) window.scrollTo({ top: restoreY, behavior: 'auto' });
  }

  /* ── chrome ──────────────────────────────────────────────────────────── */
  // CSS scroll-behavior cannot reach a scripted scroll, so the reduced-motion preference has to
  // be read here or the biggest movement on the page ignores it.
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  function scrollBehavior() { return reduceMotion && reduceMotion.matches ? 'auto' : 'smooth'; }

  function navTo(id) {
    var el = document.getElementById(id === 'top' ? 'top' : id);
    if (!el) return;
    // Move focus with the viewport, for 'top' as well as for a section. Handling only the section
    // case left every "↑ Back to index" link scrolling the page while focus stayed where it was,
    // so the next Tab yanked the reader back down.
    el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
    // Leaving it on makes the section click-focusable forever after, so a stray click resets a
    // keyboard user's Tab position to the top of the region.
    el.addEventListener('blur', function () { el.removeAttribute('tabindex'); }, { once: true });
    var target = id === 'top' ? 0 : el.getBoundingClientRect().top + window.scrollY - 60;
    window.scrollTo({ top: target, behavior: scrollBehavior() });
  }

  function toast(msg) {
    toastHost.innerHTML = '';
    toastHost.appendChild(h('div', { class: 'toast', role: 'status', text: msg }));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastHost.innerHTML = ''; }, 1800);
  }
  function copyEmail() {
    var e = L.P.email;
    if (navigator.clipboard) navigator.clipboard.writeText(e).then(function () { toast(L.T.copied); }, function () { toast(e); });
    else toast(e);
  }

  /* ── render ──────────────────────────────────────────────────────────── */
  function render() {
    app.innerHTML = '';
    app.appendChild(opening());
    var build = {
      about: about, education: education, cv: cvSection, work: work,
      extra: extra, awards: awards, xfile: xfile
    };
    M.sectionOrder.forEach(function (id) {
      var f = build[id];
      if (!f) return;
      app.appendChild(f());
      // Videos belong to the work section: same tint, no rule between them.
      if (id === 'work') { var v = videos(); if (v) app.appendChild(v); }
    });
    app.appendChild(contact());
    observeReveals();
  }

  // Language is a document, not a state: / is English, /vi/ is Vietnamese, and the toggle
  // navigates. There is deliberately no in-place switch — an earlier version had one and it
  // became unreachable the moment the toggle started navigating, leaving fifty lines of dead
  // code and 225 inert data-i18n attributes describing a mechanism that no longer ran.
  function setLang(next) {
    lang = next === 'EN' ? 'EN' : 'VI';
    L = D[lang === 'EN' ? 'en' : 'vi'];
    document.documentElement.lang = lang === 'EN' ? 'en' : 'vi';
    Array.prototype.forEach.call(document.querySelectorAll('.lang button'), function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === lang));
    });
    var skip = $('.skip');
    if (skip) skip.textContent = lang === 'EN' ? 'Skip to content' : 'Bỏ qua điều hướng';
    render();
  }

  function boot(cfg) {
    D = cfg; M = cfg.meta;
    // The two languages are two real documents, so the shell already declares which one this is.
    // Reading <html lang> means no flash, no global, and no localStorage write from a page load —
    // a visitor who once opened /en/ must not be pinned to English on the Vietnamese URL.
    // ?lang= still wins, because QA needs a deterministic entry point into either document.
    var forced = (location.search.match(/[?&]lang=(vi|en)/i) || [])[1];
    var fromShell = document.documentElement.lang === 'vi' ? 'VI' : 'EN';
    setLang((forced || fromShell).toUpperCase());

    // The toggle navigates between the two documents rather than swapping text in place. That is
    // what makes the language shareable: a recruiter forwarding the English page sends a URL that
    // opens in English. In-place switching still runs — setLang is called on arrival — so the
    // rendered page is correct even if the navigation is served from cache.
    Array.prototype.forEach.call(document.querySelectorAll('.lang button'), function (b) {
      b.addEventListener('click', function () {
        var want = b.getAttribute('data-lang');
        if (want === lang) return;
        location.href = want === 'EN' ? url('') : url('vi/');
      });
    });

    var brand = $('.nav-brand');
    if (brand) brand.addEventListener('click', function (e) { e.preventDefault(); navTo('top'); });

    // The CV is the action this page exists to produce. In the design it lives three screens down;
    // keeping one in the fixed nav means it is never more than a glance away.
    var navCv = $('[data-nav-cv]');
    if (navCv) { navCv.href = url(cvPath()); navCv.textContent = L.T.cvNav || L.T.cvBtn; }

    // Android's Back gesture must close an open sheet rather than leave the site.
    window.addEventListener('popstate', function () {
      if (sheetHost.firstChild) closeSheet(true);
    });

    // A campaign sheet writes #<id> to the address bar, so that URL has to work when it is
    // pasted, bookmarked or reloaded. Without this it advertised a deep link that did nothing.
    var deep = (location.hash || '').replace(/^#/, '');
    if (deep && L.CAMPAIGNS.some(function (c) { return c.id === deep; })) {
      var row = $('[data-campaign="' + deep + '"]');
      openSheet(deep, row || null, true);
    }

    var nav = $('#nav');
    var onScroll = function () { nav.classList.toggle('stuck', window.scrollY > 60); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  var CONFIG_URL = 'config.json';
  function showFallback(err, what) {
    var ns = $('#fallback');
    if (ns) ns.hidden = false;
    if (window.console) console.error('portfolio: ' + what, err);
  }
  fetch(url(CONFIG_URL))
    .then(function (r) { if (!r.ok) throw new Error('config ' + r.status); return r.json(); })
    .then(function (cfg) {
      // Keep the two failure classes apart. Chaining boot() into the fetch's catch reported every
      // render exception as "config failed to load" AND unhid the fallback on top of a page that
      // had already drawn most of itself.
      try { boot(cfg); }
      catch (e) { app.innerHTML = ''; showFallback(e, 'render failed'); }
    })
    .catch(function (err) {
      // Without this the page stays blank forever and the visitor sees nothing at all. The
      // noscript block in index.html already carries name, role and contact details; surface it.
      showFallback(err, 'config failed to load');
    });
})();
