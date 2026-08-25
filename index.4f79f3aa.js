/* Trần Tôn Nữ Thục Anh — portfolio
 * Vanilla port of Claude Design artifact 54559e05-eda1-4835-9b23-bd439f19e24d.
 * No framework, no build step. The artifact shipped React dev + Babel (~4.3MB) compiling JSX
 * in the browser; this reproduces the same DOM from config.json.
 */
(function () {
  'use strict';

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
      else if (k === 'html') el.innerHTML = v;
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
     Language switching mutates text in place rather than re-rendering, so
     .reveal.in, focus, scroll position and media state all survive. Every
     translatable node carries data-i18n="<path into the language pack>".
     VI and EN are structurally identical (asserted at extraction time), so a
     path valid in one is valid in the other.                                */
  function get(obj, path) {
    return path.split('.').reduce(function (o, k) {
      return o == null ? undefined : o[k];
    }, obj);
  }
  // set translatable text directly on an element instead of wrapping in a span
  function ti(el, path) {
    el.setAttribute('data-i18n', path);
    var v = get(L, path);
    el.textContent = v == null ? '' : String(v);
    return el;
  }
  function retranslate() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n]'), function (el) {
      var v = get(L, el.getAttribute('data-i18n'));
      if (v != null) el.textContent = String(v);
    });
  }

  // Dial what is displayed: a hard-coded tel: would keep dialling the old number
  // after a config update.
  function telHref(display) {
    var digits = String(display || '').replace(/[^\d+]/g, '');
    if (digits.charAt(0) !== '+') digits = '+84' + digits.replace(/^0/, '');
    return 'tel:' + digits;
  }

  /* ── folder colours ──────────────────────────────────────────────────── */
  function folder(id) {
    var f = D.meta.folders.filter(function (x) { return x.id === id; })[0];
    return f || { c: 'var(--accent)', t: '#fff' };
  }
  // C  = section colour as a SURFACE (folder background, --sc borders) — artifact value.
  // CT = section colour as TEXT — darkened to clear 4.5:1. Light folder colours (citron 1.42:1,
  //      beige 2.00:1, awards pink 1.92:1) cannot pass at ANY size as text on a light background.
  var C  = function (id) { return folder(id).c; };
  var CT = function (id) { return folder(id).tc || folder(id).c; };

  /* ── reveal ──────────────────────────────────────────────────────────────
     Observers are attached once after render and unobserve on fire. Language
     switching never replaces nodes, so this is never re-run.                */
  var io = null;
  function observeReveals() {
    if (!('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(document.querySelectorAll('.reveal'), function (n) { n.classList.add('in'); });
      return;
    }
    if (io) io.disconnect();
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.1 });
    Array.prototype.forEach.call(document.querySelectorAll('.reveal:not(.in)'), function (n) { io.observe(n); });
  }

  /* ── media slots ─────────────────────────────────────────────────────────
     Config-driven. A slot may hold an image path OR a video URL; an unset slot
     renders the styled placeholder rather than a broken-image icon, so media can
     be added later with no code change. embedUrl mirrors the artifact's own
     platform handling (app.jsx) so a YouTube/Vimeo/Drive/Facebook link becomes a
     real embed instead of a broken <img>. */
  function embedUrl(u) {
    u = (u || '').trim();
    if (!u) return null;
    var m = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|live\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
    if (m) return 'https://www.youtube.com/embed/' + m[1];
    m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (m) return 'https://player.vimeo.com/video/' + m[1];
    m = u.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
    if (m) return 'https://drive.google.com/file/d/' + m[1] + '/preview';
    if (/facebook\.com\//.test(u)) {
      return 'https://www.facebook.com/plugins/video.php?href=' + encodeURIComponent(u);
    }
    return null;
  }
  var IMAGE_RE = /\.(jpe?g|png|webp|avif|gif|svg)(\?|#|$)/i;
  var VIDEO_RE = /\.(mp4|webm|ogv|mov|m4v)(\?|#|$)/i;

  // Returns null when the slot has no media. An empty labelled frame reads as "unfinished"
  // to a visitor, which is the most expensive impression a portfolio can make; rendering
  // nothing is strictly better until a real asset exists. Set the path in config.json and the
  // slot reappears with no code change.
  function slot(id, label, ratio, src) {
    if (!src) return null;
    var frame = h('div', { class: 'frame slot', 'data-qa': 'slot', 'data-slot': id,
                           style: 'aspect-ratio:' + (ratio || '4/3') });
    var emb = embedUrl(src);
    if (emb) {
      frame.appendChild(h('iframe', {
        src: emb, title: label || '', loading: 'lazy', allowfullscreen: '',
        allow: 'accelerometer;autoplay;clipboard-write;encrypted-media;picture-in-picture',
        style: 'width:100%;height:100%;border:0;display:block',
      }));
    } else if (src && IMAGE_RE.test(src)) {
      frame.appendChild(h('img', { src: src, alt: label || '', loading: 'lazy', decoding: 'async' }));
    } else if (src && VIDEO_RE.test(src)) {
      frame.appendChild(h('video', { src: src, controls: '', playsinline: '', preload: 'metadata',
        style: 'width:100%;height:100%;object-fit:cover;display:block' }));
    } else {
      // A bare page URL or a Drive *folder* link is not embeddable media. Rendering a broken
      // player would be worse than rendering nothing.
      if (window.console) console.warn('slot "' + id + '": unrecognised media src', src);
      return null;
    }
    return frame;
  }

  /* ── section head ────────────────────────────────────────────────────── */
  function secHead(id, kickerPath, titlePath, emPath, right) {
    var left = h('div', {}, [
      // the artifact renders the kicker only in VI; SecHead: lang!=='EN' && kicker
      lang !== 'EN' && kickerPath ? ti(h('p', { class: 'eyebrow', 'data-kicker': id,
        style: 'color:' + CT(id) }), kickerPath) : null,
      h('h2', { class: 'disp sec-title' }, [
        ti(h('span', {}), titlePath),
        emPath ? document.createTextNode(' ') : null,
        emPath ? ti(h('span', { class: 'it', style: 'color:' + CT(id) }), emPath) : null,
      ]),
    ]);
    // The artifact gives the CV head a Download-CV button instead of the back-to-top link
    // (SecHead's `right` prop); everything else falls back to the link.
    var side = right || ti(h('a', { class: 'backtop', href: '#top', onclick: function (e) {
      e.preventDefault(); scrollToY(0);
    } }), 'T.back');
    return h('div', { class: 'sechead', style: '--sc:' + C(id) }, [left, side]);
  }

  /* ── opening ─────────────────────────────────────────────────────────── */
  function opening() {
    var stack = h('div', { class: 'stack' }, [h('div', { class: 'clip' })].concat(
      D.meta.folders.map(function (f) {
        var body = h('div', { class: 'folder-body', style: 'background:' + f.c + ';color:' + f.t }, [
          h('div', {}, f.noteFirst
            ? [ti(h('p', { class: 'fnote' }), 'F.' + f.id + '.n'),
               ti(h('p', { class: 'disp folder-title' }), 'F.' + f.id + '.t')]
            : [ti(h('p', { class: 'disp folder-title' }), 'F.' + f.id + '.t'),
               ti(h('p', { class: 'fnote' }), 'F.' + f.id + '.n')]),
          ti(h('span', { class: 'fgo' }), 'T.open'),
        ]);
        return h('button', {
          type: 'button', class: 'folder', 'data-note-first': f.noteFirst ? '' : null,
          '--off-instance': f.off + 'px',
          onclick: function () { navTo(f.id); },
        }, [
          h('div', { class: 'tab', style: 'background:' + f.c + ';color:' + f.t }, [
            h('span', { class: 'tabname', text: f.label }),
          ]),
          body,
        ]);
      })
    ));

    return h('section', { id: 'top', class: 'opening' }, [
      h('div', { class: 'wrap' }, [
        h('div', { class: 'opening-grid' }, [
          h('div', {}, [
            ti(h('p', { class: 'eyebrow' }), 'P.niche'),
            h('h1', { class: 'disp opening-title' }, [
              'Port', h('span', { class: 'script', text: 'folio' }),
            ]),
            h('p', { class: 'disp opening-name' }, [
              ti(h('span', {}), 'P.name'), h('br'), ti(h('strong', {}), 'P.name2'),
            ]),
            ti(h('p', { class: 'body opening-intro' }), 'P.intro'),
            // Proof in the first screen. Without it the fold carries identity but no evidence,
            // and the numbers/brands sat 2.0-2.4 screens down where most visitors never reach.
            h('div', { class: 'hero-proof' }, [
              h('div', { class: 'hero-stats' }, L.P.stats.map(function (_, i) {
                return h('div', { class: 'hero-stat' }, [
                  ti(h('span', { class: 'disp hero-stat-v' }), 'P.stats.' + i + '.v'),
                  ti(h('span', { class: 'hero-stat-k' }), 'P.stats.' + i + '.short'),
                ]);
              })),
              h('p', { class: 'eyebrow hero-brands' }, [
                ti(h('span', {}), 'T.proofBrands'), ' — ',
                h('span', { 'data-hero-brands': '', text: L.P.brands.join(' · ') }),
              ]),
            ]),
            h('div', { class: 'opening-pills' }, [
              ti(h('span', { class: 'pill' }), 'P.role'),
              ti(h('span', { class: 'pill' }), 'P.city'),
            ]),
            ti(h('p', { class: 'eyebrow opening-pick' }), 'T.pick'),
          ]),
          stack,
        ]),
      ]),
    ]);
  }

  /* ── about ───────────────────────────────────────────────────────────── */
  function about() {
    var P = L.P;
    var card = h('div', { class: 'about-card', style: 'background:' + C('about') }, [
      ti(h('p', { class: 'eyebrow' }), 'T.contact'),
      h('div', { class: 'about-card-rows' }, [
        ti(h('a', { href: 'mailto:' + P.email }), 'P.email'),
        ti(h('a', { href: telHref(P.phone) }), 'P.phone'),
        ti(h('span', {}), 'P.city'),
      ]),
      h('div', { class: 'about-card-btns' }, [
        ti(h('a', { class: 'btn', href: D.meta.cv.path, download: D.meta.cv.fileName }), 'T.cvBtn'),
        ti(h('button', { type: 'button', class: 'btn', onclick: function () {
          copy(P.email);
        } }), 'T.copy'),
      ]),
    ]);

    return h('section', { id: 'about', class: 'sec' }, [
      h('div', { class: 'wrap' }, [
        secHead('about', 'T.aboutKicker', 'T.aboutTitle', 'T.aboutEm'),
        h('div', { class: 'about-grid' }, [
          h('div', { class: 'reveal' }, [
            h('h3', { class: 'disp about-quote' }, [
              ti(h('span', {}), 'T.aboutQuote.0'),
              ti(h('span', { class: 'it', style: 'color:' + CT('about') }), 'T.aboutQuote.1'),
            ]),
            h('div', { class: 'about-bio' }, P.bio.map(function (_, i) {
              return ti(h('p', { class: 'body' }), 'P.bio.' + i);
            })),
            h('div', { class: 'about-skills' }, P.skills.map(function (s, i) {
              return h('div', {}, [
                ti(h('h4', { class: 'eyebrow' }), 'P.skills.' + i + '.h'),
                h('ul', {}, s.i.map(function (_, j) {
                  return ti(h('li', {}), 'P.skills.' + i + '.i.' + j);
                })),
              ]);
            })),
            h('div', { class: 'about-stats' }, P.stats.map(function (_, i) {
              return h('div', {}, [
                ti(h('p', { class: 'disp about-stat-v', style: 'color:' + CT('about') }), 'P.stats.' + i + '.v'),
                ti(h('p', { class: 'eyebrow about-stat-k' }), 'P.stats.' + i + '.k'),
              ]);
            })),
          ]),
          h('div', { class: 'reveal' }, [
            slot('portrait', lang === 'EN' ? 'portrait photo' : 'ảnh chân dung', '3/4', D.meta.images.portrait),
            card,
          ]),
        ]),
        h('div', { class: 'brands' }, [
          ti(h('p', { class: 'eyebrow' }), 'T.brandsLabel'),
          // The artifact maps all six brands to brands/*.png, which 404 even there. We use the
          // design's own styled <span> treatment instead of shipping broken images.
          h('div', { class: 'brandwall reveal' }, P.brands.map(function (_, i) {
            return ti(h('span', {}), 'P.brands.' + i);
          })),
        ]),
      ]),
    ]);
  }

  /* ── cv ──────────────────────────────────────────────────────────────── */
  function cv() {
    return h('section', { id: 'cv', class: 'sec' }, [
      h('div', { class: 'wrap' }, [
        secHead('cv', 'T.cvKicker', 'T.cvTitle', 'T.cvEm',
          ti(h('a', { class: 'btn', href: D.meta.cv.path, download: D.meta.cv.fileName }), 'T.cvBtn')),
      ].concat(L.P.cv.map(function (j, i) {
        return h('div', { class: 'reveal cv-row' }, [
          ti(h('span', { class: 'eyebrow cv-year' }), 'P.cv.' + i + '.y'),
          h('div', {}, [
            ti(h('h3', { class: 'cv-role' }), 'P.cv.' + i + '.r'),
            ti(h('p', { class: 'eyebrow cv-co', style: 'color:' + CT('cv') }), 'P.cv.' + i + '.c'),
            // the artifact prefixes each bullet with an em dash: <li className="body">— {d}</li>
            h('ul', {}, j.d.map(function (_, k) {
              return h('li', { class: 'body' }, ['— ', ti(h('span', {}), 'P.cv.' + i + '.d.' + k)]);
            })),
          ]),
        ]);
      })).concat([h('hr', { class: 'rule' })])),
    ]);
  }

  /* ── education ───────────────────────────────────────────────────────── */
  function education() {
    return h('section', { id: 'education', class: 'sec sec--paper' }, [
      h('div', { class: 'wrap' }, [
        secHead('education', 'T.eduKicker', 'T.eduTitle', null),
        h('div', { class: 'reveal edu-grid' }, [
          h('div', {}, [
            ti(h('h3', { class: 'disp edu-school' }), 'P.edu.school'),
            ti(h('p', { class: 'body edu-deg' }), 'P.edu.deg'),
            ti(h('p', { class: 'eyebrow edu-years' }), 'P.edu.years'),
          ]),
          h('ul', { class: 'edu-notes' }, L.P.edu.notes.map(function (_, i) {
            return ti(h('li', {}), 'P.edu.notes.' + i);
          })),
        ]),
      ]),
    ]);
  }

  /* ── work ────────────────────────────────────────────────────────────── */
  function work() {
    var peek = h('div', { class: 'peek', hidden: 'hidden' });
    var list = h('div', {}, L.CAMPAIGNS.map(function (c, i) {
      return h('button', {
        type: 'button', class: 'crow reveal', 'data-qa': 'campaign-' + c.id,
        onmouseenter: function (e) { showPeek(peek, c, e); },
        onmousemove: function (e) { movePeek(peek, e); },
        onmouseleave: function () { peek.hidden = true; },
        onclick: function () { openSheet(c.id); },
      }, [
        ti(h('span', { class: 'eyebrow crow-n' }), 'CAMPAIGNS.' + i + '.n'),
        h('div', {}, [
          ti(h('h3', { class: 'ct' }), 'CAMPAIGNS.' + i + '.title'),
          ti(h('p', { class: 'body crow-sum' }), 'CAMPAIGNS.' + i + '.summary'),
        ]),
        h('div', { class: 'cmeta' }, [
          ti(h('p', { class: 'eyebrow' }), 'CAMPAIGNS.' + i + '.brand'),
          h('p', { class: 'eyebrow' }, [
            ti(h('span', {}), 'CAMPAIGNS.' + i + '.tag'), ' · ',
            ti(h('span', {}), 'CAMPAIGNS.' + i + '.year'),
          ]),
        ]),
        h('div', { class: 'ckpi' }, [
          ti(h('p', { class: 'disp it', style: 'color:' + CT('work') }), 'CAMPAIGNS.' + i + '.kpi'),
        ]),
      ]);
    }).concat([h('hr', { class: 'rule' }), peek]));

    return h('section', { id: 'work', class: 'sec sec--paper' }, [
      h('div', { class: 'wrap' }, [
        secHead('work', 'T.workKicker', 'T.workTitle', 'T.workEm'), list,
      ]),
    ]);
  }
  function showPeek(peek, c, e) {
    var m = slot('peek-' + c.id, c.shots[0], '4/3', c.shotSrc && c.shotSrc[0]);
    if (!m) { peek.hidden = true; return; }
    peek.innerHTML = '';
    peek.appendChild(m);
    peek.hidden = false; movePeek(peek, e);
  }
  var PEEK_H = 258 * 3 / 4;  // .peek is 258px wide at 4/3
  function movePeek(peek, e) {
    peek.style.left = Math.min(e.clientX + 28, window.innerWidth - 290) + 'px';
    // clamp the bottom as well, or the preview hangs off-screen near the viewport foot
    peek.style.top = Math.min(Math.max(e.clientY - 100, 20),
                              Math.max(20, window.innerHeight - PEEK_H - 20)) + 'px';
  }

  /* ── videos ──────────────────────────────────────────────────────────── */
  function videos() {
    // Whole section hides while every slot is empty — it was 13.8% of the page rendered as
    // grey boxes. It returns the moment any VIDEOS entry gets a src.
    var items = L.VIDEOS.map(function (v, i) {
      var m = slot(v.id, v.l, v.r, v.src || null);
      return m ? h('div', { class: 'reveal' }, [m, ti(h('p', { class: 'eyebrow' }), 'VIDEOS.' + i + '.l')]) : null;
    }).filter(Boolean);
    if (!items.length) return null;
    return h('section', { class: 'videos' }, [
      h('div', { class: 'wrap' }, [
        ti(h('p', { class: 'eyebrow videos-label' }), 'T.videosLabel'),
        h('div', { class: 'videos-grid' }, items),
      ]),
    ]);
  }

  /* ── extracurricular ─────────────────────────────────────────────────── */
  function extra() {
    return h('section', { id: 'extra', class: 'sec' }, [
      h('div', { class: 'wrap' }, [
        secHead('extra', 'T.extraKicker', 'T.extraTitle', 'T.extraEm'),
        h('div', { class: 'extra-grid' }, L.EXTRA.map(function (_, i) {
          return h('div', { class: 'reveal extra-item', style: '--sc:' + C('extra') }, [
            ti(h('p', { class: 'eyebrow' }), 'EXTRA.' + i + '.y'),
            ti(h('h3', { class: 'disp extra-role' }), 'EXTRA.' + i + '.r'),
            ti(h('p', { class: 'eyebrow extra-org' }), 'EXTRA.' + i + '.o'),
            ti(h('p', { class: 'body extra-desc' }), 'EXTRA.' + i + '.d'),
          ]);
        })),
      ]),
    ]);
  }

  /* ── awards ──────────────────────────────────────────────────────────── */
  function awards() {
    return h('section', { id: 'awards', class: 'sec sec--paper' }, [
      h('div', { class: 'wrap' }, [
        secHead('awards', 'T.awardsKicker', 'T.awardsTitle', 'T.awardsEm'),
        h('div', { class: 'awards-grid' }, L.P.awards.map(function (_, i) {
          return h('div', { class: 'reveal award' }, [
            h('span', { class: 'disp award-n', style: 'color:' + CT('awards'),
                        text: String(i + 1).length < 2 ? '0' + (i + 1) : String(i + 1) }),
            ti(h('p', { class: 'award-t' }), 'P.awards.' + i),
          ]);
        })),
      ]),
    ]);
  }

  /* ── contact ─────────────────────────────────────────────────────────── */
  function contact() {
    var P = L.P, M = D.meta;
    var cells = [
      ['T.cEmail', 'P.email', 'mailto:' + P.email, null],
      ['T.cPhone', 'P.phone', telHref(P.phone), null],
      ['T.cAddr', 'P.city', null, null],
      ['T.cCv', 'T.cCvVal', M.cv.path, 'download'],
      // Kept from the live site: the artifact drops these, which would remove a recruiter's
      // route to the profiles. The grid is auto-fit, so they wrap without new styling.
      ['T.cLinkedin', 'T.cLinkedinVal', M.links.linkedin, '_blank'],
      ['T.cFacebook', 'T.cFacebookVal', M.links.facebook, '_blank'],
      ['T.cPortfolio', 'T.cPortfolioVal', M.links.drive, '_blank'],
    ];
    return h('section', { id: 'contact', class: 'contact' }, [
      h('div', { class: 'wrap' }, [
        ti(h('p', { class: 'script contact-thanks' }), 'T.thanks'),
        ti(h('p', { class: 'body contact-open' }), 'T.openTo'),
        h('div', { class: 'contact-grid' }, cells.map(function (c) {
          var link = null;
          if (c[2]) {
            link = c[3] === 'download'
              ? h('a', { href: c[2], download: M.cv.fileName })
              : h('a', { href: c[2], target: c[3], rel: c[3] ? 'noopener' : null });
            ti(link, c[1]);
          }
          return h('div', {}, [ti(h('p', { class: 'eyebrow' }), c[0]), link || ti(h('span', {}), c[1])]);
        })),
        h('div', { class: 'contact-btns' }, [
          ti(h('button', { type: 'button', class: 'btn btn-solid', onclick: function () {
            copy(P.email);
          } }), 'T.copy'),
          ti(h('a', { class: 'btn', href: '#top', onclick: function (e) {
            e.preventDefault(); scrollToY(0);
          } }), 'T.back'),
        ]),
        h('p', { class: 'eyebrow contact-copy', text: '© 2026 Trần Tôn Nữ Thục Anh' }),
      ]),
    ]);
  }

  /* ── campaign sheet ──────────────────────────────────────────────────── */
  var FOCUSABLE = 'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])';

  function openSheet(id) {
    var idx = L.CAMPAIGNS.map(function (c) { return c.id; }).indexOf(id);
    if (idx < 0) return;
    var c = L.CAMPAIGNS[idx];
    var opener = (sheetState && sheetState.opener) || document.activeElement;
    closeSheet(true);
    sheetState = { id: id, opener: opener };

    var el = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true',
                        'data-qa-campaign': id, 'aria-label': c.title }, [
      h('div', { class: 'sheet-bar' }, [
        h('div', { class: 'wrap' }, [
          h('span', { class: 'eyebrow', text: c.n + ' · ' + c.brand }),
          h('button', { type: 'button', class: 'btn', text: L.T.close,
                        onclick: function () { closeSheet(); } }),
        ]),
      ]),
      h('div', { class: 'wrap sheet-body' }, [
        h('p', { class: 'eyebrow', text: c.tag + ' · ' + c.year }),
        h('h1', { class: 'disp sheet-title', text: c.title }),
        h('p', { class: 'disp it sheet-sum', style: 'color:' + CT('work'), text: c.summary }),
        (function () { var m = slot('shot-a-' + c.id, c.shots[0], '16/9', c.shotSrc && c.shotSrc[0]);
          return m ? h('div', { class: 'sheet-shot-a' }, [m]) : null; })(),
        (function () {
          if (!c.vids) return null;
          var figs = c.vids.map(function (v) {
            var m = slot('vid-' + c.id + '-' + v.id, v.l, '16/9', v.src || null);
            return m ? h('figure', {}, [m, h('figcaption', { class: 'eyebrow', text: v.l })]) : null;
          }).filter(Boolean);
          if (!figs.length) return null;
          return h('div', { class: 'sheet-vids' }, [
            h('h3', { class: 'eyebrow', text: L.T.vid }),
            h('div', { class: 'sheet-vids-grid' }, figs),
          ]);
        })(),
        h('div', { class: 'sheet-cols' }, [
          h('div', {}, [
            h('h3', { class: 'eyebrow', text: L.T.ctx }),
            h('p', { class: 'sheet-goal', text: c.goal }),
          ]),
          h('div', {}, [
            h('h3', { class: 'eyebrow', text: L.T.did }),
            h('ol', { class: 'sheet-did' }, c.did.map(function (d, i) {
              return h('li', {}, [
                h('span', { class: 'eyebrow', style: 'color:' + CT('work'),
                            text: String(i + 1).length < 2 ? '0' + (i + 1) : String(i + 1) }),
                h('span', { text: d }),
              ]);
            })),
          ]),
        ]),
        (function () {
          var m = [slot('shot-b-' + c.id, c.shots[1], '4/3', c.shotSrc && c.shotSrc[1]),
                   slot('shot-c-' + c.id, c.shots[2], '4/3', c.shotSrc && c.shotSrc[2])].filter(Boolean);
          return m.length ? h('div', { class: 'sheet-shots' }, m) : null;
        })(),
        h('div', { class: 'sheet-res' }, [
          h('h3', { class: 'eyebrow', text: L.T.res }),
          h('div', { class: 'sheet-res-grid' }, c.res.map(function (r) {
            return h('div', {}, [
              h('p', { class: 'disp sheet-res-v', style: 'color:' + CT('cv'), text: r.v }),
              h('p', { class: 'eyebrow sheet-res-k', text: r.k }),
            ]);
          })),
        ]),
        h('div', { class: 'sheet-foot' }, [
          h('button', { type: 'button', class: 'btn', text: L.T.allWork,
                        onclick: function () { closeSheet(); } }),
          h('button', { type: 'button', class: 'btn btn-solid', text: L.T.nextWork, onclick: function () {
            openSheet(L.CAMPAIGNS[(idx + 1) % L.CAMPAIGNS.length].id);
          } }),
        ]),
      ]),
    ]);

    sheetHost.appendChild(el);
    document.body.style.overflow = 'hidden';
    // aria-hidden alone still leaves background controls focusable; `inert` removes them
    // from the tab order too. The keydown trap is the fallback where inert is unsupported.
    [app, $('#nav')].forEach(function (n) {
      n.setAttribute('aria-hidden', 'true');
      if ('inert' in n) n.inert = true;
    });
    // The artifact calls window.scrollTo here, which does NOT reset the sheet's own scroll
    // (the sheet is the scroll container). Reset the sheet instead.
    el.scrollTop = 0;
    var first = el.querySelector(FOCUSABLE);
    if (first) first.focus();
    el.addEventListener('keydown', trap);
  }

  function trap(e) {
    if (e.key !== 'Tab') return;
    var f = Array.prototype.filter.call(this.querySelectorAll(FOCUSABLE), function (n) {
      return n.offsetParent !== null;
    });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function closeSheet(silent) {
    var el = $('.sheet');
    if (el) el.remove();
    // Page state is always restored, even on the silent path. Returning early here
    // would leave the page scroll-locked and hidden from assistive tech.
    var opener = sheetState && sheetState.opener;
    sheetState = null;
    document.body.style.overflow = '';
    [app, $('#nav')].forEach(function (n) {
      n.removeAttribute('aria-hidden');
      if ('inert' in n) n.inert = false;
    });
    if (!silent && opener && document.contains(opener)) opener.focus();
  }

  /* ── toast ───────────────────────────────────────────────────────────── */
  function toast(msg) {
    toastHost.innerHTML = '';
    toastHost.appendChild(h('div', { class: 'toast', text: msg }));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastHost.innerHTML = ''; }, 1800);
  }
  function copy(text) {
    // Announcing "copied" when the write failed is a lie to a screen-reader user.
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast(L.T.copied); },
                                              function () { toast(text); });
    } else {
      toast(text);
    }
  }

  /* ── navigation ──────────────────────────────────────────────────────── */
  // CSS cannot cancel a behavior:'smooth' passed through the scroll API, so the
  // reduced-motion preference has to be honoured here too.
  function reduced() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function scrollToY(y) {
    window.scrollTo({ top: y, behavior: reduced() ? 'auto' : 'smooth' });
  }
  function navTo(id) {
    if (id === 'top') return scrollToY(0);
    var el = document.getElementById(id);
    if (el) scrollToY(el.getBoundingClientRect().top + window.scrollY - 60);
  }

  /* ── render / language ───────────────────────────────────────────────── */
  function render() {
    app.innerHTML = '';
    // Order is evidence-driven, not the artifact's. NN/G eyetracking: 57% of viewing time is
    // above the fold and 17% on the second screenful — 74% in the first two — so the strongest
    // asset (campaigns) has to arrive early rather than at screen 4.6. Then experience, matching
    // the recruiter scan path (current title/company -> previous -> dates), then About, which is
    // "where people go after they already like your work". config.meta.sectionOrder is the record.
    var BUILD = { work: work, cv: cv, about: about, education: education,
                  awards: awards, extra: extra };
    var order = (D.meta.sectionOrder || ['work', 'cv', 'about', 'education', 'awards', 'extra']);
    var parts = [opening()].concat(order.map(function (id) {
      return BUILD[id] ? BUILD[id]() : null;
    }));
    parts.push(videos(), contact());
    parts.filter(Boolean).forEach(function (s) { app.appendChild(s); });
    observeReveals();
  }

  function setLang(next, initial) {
    lang = next === 'EN' ? 'EN' : 'VI';
    L = D[lang === 'EN' ? 'en' : 'vi'];
    document.documentElement.lang = lang === 'EN' ? 'en' : 'vi';
    try { localStorage.setItem('lang', lang); } catch (e) {}
    Array.prototype.forEach.call(document.querySelectorAll('.lang button'), function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === lang));
    });
    var skip = $('.skip');
    if (skip) skip.textContent = lang === 'EN' ? 'Skip to content' : 'Bỏ qua điều hướng';
    var navCv = $('[data-nav-cv]');
    if (navCv) { navCv.textContent = L.T.cvNav; navCv.setAttribute('aria-label', L.T.cvBtn); }
    // brands are joined into one node, so data-i18n cannot reach them
    var hb = $('[data-hero-brands]');
    if (hb) hb.textContent = L.P.brands.join(' · ');
    if (initial) { render(); return; }
    // Section kickers exist only in VI, so their presence changes with language — that part
    // needs a re-render. Everything else is mutated in place.
    var hadKickers = !!document.querySelector('.sechead .eyebrow[data-kicker]');
    if (hadKickers !== (lang !== 'EN')) {
      var y = window.scrollY;
      closeSheet(true);
      render();
      Array.prototype.forEach.call(document.querySelectorAll('.reveal'), function (n) { n.classList.add('in'); });
      window.scrollTo({ top: y });
    } else {
      retranslate();
    }
  }

  /* ── boot ────────────────────────────────────────────────────────────── */
  function boot(cfg) {
    D = cfg;
    // ?lang= wins over the stored preference: it gives QA a deterministic entry point and
    // gives a shared link a predictable language.
    var forced = (location.search.match(/[?&]lang=(vi|en)/i) || [])[1];
    var saved = null;
    try { saved = localStorage.getItem('lang'); } catch (e) {}
    setLang((forced || saved || (D.meta.defaultLang === 'en' ? 'EN' : 'VI')).toUpperCase(), true);

    Array.prototype.forEach.call(document.querySelectorAll('.lang button'), function (b) {
      b.addEventListener('click', function () { setLang(b.getAttribute('data-lang')); });
    });
    $('.nav-brand').addEventListener('click', function (e) { e.preventDefault(); navTo('top'); });

    var nav = $('#nav');
    var onScroll = function () { nav.classList.toggle('is-scrolled', window.scrollY > 60); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && $('.sheet')) closeSheet();
    });
  }
  var SCHEMA = 2;
  // Written by tools/release.mjs. In the deployed copy this names a content-hashed file, so the
  // JS and the config it was released with are inseparable: a cached index.<hash>.js can only
  // ever request the config.<hash>.json it shipped with. No release stamp, no reload dance.
  var CONFIG_URL = 'config.91c749cf.json';

  // Beacon for gate G9. Recording which URL was *requested* only proves a request happened; this
  // records the value the EXECUTED code actually used, which is the property that matters.
  try { window.__PORTFOLIO_BUILD__ = { config: CONFIG_URL, booted: false }; } catch (e) {}

  function loadConfig() {
    return fetch(CONFIG_URL)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (cfg) {
        if (!cfg || !cfg.meta || !cfg.vi || !cfg.en) throw new Error('config malformed');
        if (cfg.meta.schema !== SCHEMA) {
          throw new Error('config schema ' + cfg.meta.schema + ' != expected ' + SCHEMA);
        }
        return cfg;
      });
  }

  loadConfig()
    .then(function (cfg) {
      boot(cfg);
      try { window.__PORTFOLIO_BUILD__.booted = true; } catch (e) {}
    })
    .catch(function (err) {
      console.error('config load failed', err);
      app.innerHTML = '<section class="sec" style="padding-top:140px"><div class="wrap">' +
        '<h1 class="disp" style="font-size:48px">Trần Tôn Nữ Thục Anh</h1>' +
        '<p class="body" style="margin-top:16px">' +
        '<a href="mailto:thucanh.ttn@gmail.com">thucanh.ttn@gmail.com</a></p></div></section>';
    });
})();
