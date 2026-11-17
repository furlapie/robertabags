if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
if (!location.hash && !location.search) scrollTo({ top: 0, behavior: 'instant' });

(function () {
  var KEY = 'roberta-cart';
  var eur = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  var Cart = {
    items: function () { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } },
    save: function (items) { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {} Cart.render(); },
    add: function (item) {
      var items = Cart.items(), f = items.find(function (x) { return x.id === item.id; });
      if (f) f.qty = Math.min(f.qty + 1, item.max); else items.push(Object.assign({}, item, { qty: 1 }));
      Cart.save(items); Cart.open();
    },
    setQty: function (id, q) {
      var items = Cart.items().map(function (x) { if (x.id === id) x.qty = Math.max(1, Math.min(q, x.max)); return x; });
      Cart.save(items);
    },
    remove: function (id) { Cart.save(Cart.items().filter(function (x) { return x.id !== id; })); },
    open: function () { var d = document.getElementById('drawer'); d.classList.add('open'); d.setAttribute('aria-hidden', 'false'); },
    close: function () { var d = document.getElementById('drawer'); d.classList.remove('open'); d.setAttribute('aria-hidden', 'true'); },
    render: function () {
      var items = Cart.items(), body = document.getElementById('drawer-body');
      var count = items.reduce(function (n, x) { return n + x.qty; }, 0);
      var total = items.reduce(function (n, x) { return n + x.qty * x.price; }, 0);
      document.getElementById('cart-count').textContent = count;
      document.getElementById('drawer').classList.toggle('is-empty', !items.length);
      document.getElementById('drawer-total').textContent = eur.format(total);
      document.getElementById('checkout-btn').disabled = !items.length;
      if (!items.length) { body.innerHTML = '<p class="empty">La tua borsa è vuota.</p>'; return; }
      body.innerHTML = items.map(function (x) {
        return '<div class="line">' +
          '<a class="line-img" href="' + esc(x.url) + '" style="background:' + esc(x.color) + '"><img src="' + esc(x.img) + '" alt="" onerror="this.remove()"></a>' +
          '<div><h4>' + esc(x.name) + '</h4><small>' + esc(x.variant) + '</small>' +
          '<div class="qty"><button data-dec="' + esc(x.id) + '" aria-label="Meno">−</button><span>' + x.qty + '</span><button data-inc="' + esc(x.id) + '" aria-label="Più">+</button></div></div>' +
          '<div class="line-right"><div>' + eur.format(x.price * x.qty) + '</div><button class="line-remove" data-rm="' + esc(x.id) + '">Rimuovi</button></div></div>';
      }).join('');
    }
  };

  var root = document.documentElement, baseColor = null;
  function tint(c) {
    var x = c || baseColor;
    if (x) { root.style.setProperty('--hov', x); root.classList.add('tint'); }
    else root.classList.remove('tint');
  }
  window.tint = tint;

  function initProduct() {
    var m = window.MODEL, q = new URLSearchParams(location.search).get('v');
    var state = { i: 0, v: m.variants.find(function (v) { return v.id === q; }) ||
                           m.variants.find(function (v) { return v.stock > 0; }) || m.variants[0] };
    var $ = function (id) { return document.getElementById(id); };
    var main = $('pdp-main'), img = $('pdp-main-img'), thumbs = $('pdp-thumbs'), sw = $('pdp-swatches'), add = $('pdp-add');
    var price = function (v) { return v.price || m.price; };

    function show() {
      var v = state.v;
      baseColor = v.swatch; tint(null);
      img.style.display = ''; img.src = v.images[state.i] || ''; img.onerror = function () { img.style.display = 'none'; };
      $('pdp-variant-name').textContent = v.name;
      $('pdp-fabric').textContent = v.fabric || '';
      $('pdp-price').textContent = '€ ' + price(v);
      $('pdp-stock').textContent = v.stock <= 0 ? 'Esaurita' : v.stock <= 2 ? 'Ultimi ' + v.stock + ' pezzi' : 'Disponibile';
      add.disabled = v.stock <= 0;
      thumbs.innerHTML = '';
      if (v.images.length > 1) v.images.forEach(function (src, i) {
        var b = document.createElement('button'); b.className = i === state.i ? 'on' : '';
        b.innerHTML = '<img src="' + esc(src) + '" alt="">';
        b.onclick = function () { state.i = i; show(); };
        thumbs.appendChild(b);
      });
      sw.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.dataset.id === v.id); });
    }

    m.variants.forEach(function (v) {
      var b = document.createElement('button');
      b.dataset.id = v.id; b.title = v.name; b.style.background = v.swatch;
      if (v.stock <= 0) b.classList.add('out');
      b.onclick = function () { state.v = v; state.i = 0; show(); };
      sw.appendChild(b);
    });

    add.addEventListener('click', function () {
      var v = state.v;
      Cart.add({ id: v.id, name: m.name, variant: v.name, price: price(v), max: v.stock,
                 img: v.images[0] || '', color: v.swatch, url: location.pathname });
    });
    show();
  }

  window.Cart = Cart;

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest('#bag-btn')) return Cart.open();
    if (t.closest('[data-close]')) return Cart.close();
    var inc = t.closest('[data-inc]'), dec = t.closest('[data-dec]'), rm = t.closest('[data-rm]');
    var find = function (id) { return Cart.items().find(function (x) { return x.id === id; }); };
    if (inc) Cart.setQty(inc.dataset.inc, find(inc.dataset.inc).qty + 1);
    if (dec) Cart.setQty(dec.dataset.dec, find(dec.dataset.dec).qty - 1);
    if (rm) Cart.remove(rm.dataset.rm);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') Cart.close(); });

  document.addEventListener('DOMContentLoaded', function () {
    Cart.render();

    // index: hover su card, pallini e tessuti
    document.querySelectorAll('.card').forEach(function (card) {
      var first = card.querySelector('.dot').dataset.color;
      card.addEventListener('mouseenter', function () { tint(first); });
      card.addEventListener('mouseleave', function () { tint(null); });
      card.querySelectorAll('.dot').forEach(function (d) {
        d.addEventListener('mouseenter', function () { tint(d.dataset.color); });
        d.addEventListener('mouseleave', function () { tint(first); });
      });
    });
    document.querySelectorAll('.tile').forEach(function (t) {
      var c = t.querySelector('.tile-img').style.backgroundColor;
      t.addEventListener('mouseenter', function () { tint(c); });
      t.addEventListener('mouseleave', function () { tint(null); });
    });

    if (window.MODEL) initProduct();

    document.getElementById('checkout-btn').addEventListener('click', function () {
      var btn = this; btn.disabled = true; btn.textContent = 'Un attimo…';
      fetch('/api/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: Cart.items().map(function (x) { return { id: x.id, qty: x.qty }; }) })
      }).then(function (r) { return r.json(); }).then(function (d) {
        if (d.url) window.location = d.url; else throw new Error(d.error || 'errore');
      }).catch(function () { alert('Pagamento non disponibile al momento. Riprova.'); btn.disabled = false; btn.textContent = 'Vai al pagamento'; });
    });

    // card swatches: hover changes the photo
    document.querySelectorAll('.card .dot').forEach(function (dot) {
      dot.addEventListener('mouseenter', function () {
        var box = dot.closest('.card').querySelector('.card-img'), img = box.querySelector('img');
        if (img) { img.style.display = ''; img.src = dot.dataset.img; }
      });
    });

    // scroll reveal
    var els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) { els.forEach(function (el) { el.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
  });
})();

/* ===== CONFIGURATORE ===== */
(function () {
  var root = document.getElementById('cfg');
  if (!root || !window.PRODUCTS || !window.PRODUCTS.length) return;
  var P = window.PRODUCTS, EMAIL = window.CFG_EMAIL || '';
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  /* ---------- CONFIG ---------- */
  var SUR = { mono:0, cotone:0, velluto:0, seta:0, raso:0, broccato:0, damasco:0, jacquard:0, lana:0, lino:0, sizeCustom:0 };
  var FAMS = [
    ['cotone','Cotone','cotton'], ['velluto','Velluto','velvet'], ['seta','Seta','silk'],
    ['raso','Raso','silk'], ['broccato','Broccato','brocade'], ['damasco','Damasco','brocade'],
    ['jacquard','Jacquard','brocade'], ['lana','Lana','wool'], ['lino','Lino','linen']
  ];
  var COLORS = [
    { n:'Nero notte', c:'#1b1d2e' }, { n:'Blu notte', c:'#1f2a55' }, { n:'Blu ardesia', c:'#2b4a5e' },
    { n:'Petrolio', c:'#1c6176' },   { n:'Verde acqua', c:'#1b6f6b' }, { n:'Verde salvia', c:'#9db98c' },
    { n:'Rosa antico', c:'#b57a82' },{ n:'Rosso', c:'#b3202f' },       { n:'Rosso perla', c:'#b8324b' },
    { n:'Rame', c:'#8a5a50' },       { n:'Antracite', c:'#5a5659' },  { n:'Tortora', c:'#b9a794' },
    { n:'Avorio', c:'#e3c4b2' },     { n:'Argento', c:'#c9c1b4' },    { n:'Azzurro', c:'#4f8fd0' }
  ];
  var STRAP = [{ id:'self',n:'Tono su tono' },{ id:'navy',n:'Blu navy',c:'#1f2f5c' },{ id:'black',n:'Nero',c:'#1d1a1c' },{ id:'ivory',n:'Avorio',c:'#efe6d6' },{ id:'pink',n:'Rosa shocking',c:'#ff4f9a' },{ id:'taupe',n:'Tortora',c:'#a89580' }];
  var LINING = [{ id:'ivory',n:'Avorio',c:'#f1e8da' },{ id:'blush',n:'Rosa cipria',c:'#eab9c8' },{ id:'pink',n:'Rosa shocking',c:'#ff4f9a' },{ id:'navy',n:'Blu navy',c:'#1f2f5c' },{ id:'black',n:'Nero',c:'#1d1a1c' }];
  var SIZE = [{ id:'std',n:'Standard' },{ id:'custom',n:'Su misura' }];
  var MONOC = [{ id:'auto',n:'Tono su tono' },{ id:'gold',n:'Oro',c:'#c9a24a' },{ id:'silver',n:'Argento',c:'#d3d6dc' }];
  var STEPS = ['Modello','Tessuto','Dettagli','Richiesta'];
  var defaults = function (slug) { return slug === 'mare' ? { strap:'navy', lining:'ivory', size:'std' } : { strap:'self', lining:'ivory', size:'std' }; };
  /* chiusura non è più un'opzione: Mare aperta, tutto il resto bottone magnetico */
  var closureOf = function (slug) { return slug === 'mare' ? 'open' : 'btn'; };

  /* ---------- colori ---------- */
  function rgb(h){ h=String(h).replace('#',''); return [0,2,4].map(function(i){ return parseInt(h.substr(i,2),16)||0; }); }
  function hex(a){ return '#'+a.map(function(x){ return ('0'+Math.round(Math.max(0,Math.min(255,x))).toString(16)).slice(-2); }).join(''); }
  function mix(h,t,k){ var a=rgb(h),b=rgb(t); return hex(a.map(function(x,i){ return x+(b[i]-x)*k; })); }
  function lum(h){ var a=rgb(h); return .299*a[0]+.587*a[1]+.114*a[2]; }
  function dist(a,b){ var x=rgb(a),y=rgb(b); return Math.sqrt(Math.pow(x[0]-y[0],2)+Math.pow(x[1]-y[1],2)+Math.pow(x[2]-y[2],2)); }
  function pick(list,id){ return list.find(function(x){ return x.id===id; })||list[0]; }
  function V(c,o,mc){
    var s=pick(STRAP,o.strap), l=pick(LINING,o.lining);
    var m = mc==='gold' ? '#c9a24a' : mc==='silver' ? '#d3d6dc' : (lum(c)>150 ? mix(c,'#000',.5) : mix(c,'#fff',.78));
    return { '--f':c, '--fh':mix(c,'#fff',.3), '--fl':mix(c,'#000',.3), '--fx':mix(c,'#fff',.72),
             '--s':s.c||mix(c,'#000',.2), '--l':l.c, '--m':m };
  }
  function css(v){ return Object.keys(v).map(function(k){ return k+':'+v[k]; }).join(';'); }

  /* ---------- tessuti ---------- */
  var famOf = function(f){ var w=String(f||'').toLowerCase().split(' ')[0]; return w==='tela'?'cotone':w; };
  var TILES = [];
  P.forEach(function(m){ m.variants.forEach(function(v){
    TILES.push({ id:v.id, name:v.name, fam:famOf(v.fabric), c:v.swatch,
                 img:(v.images||[])[0]||'', stock:v.stock, stripe:/righ/i.test(v.name) });
  }); });
  var famName = function(id){ var f=FAMS.find(function(x){ return x[0]===id; }); return f?f[1]:''; };
  function colorName(c){ var k=COLORS.find(function(x){ return x.c===c; }); return k?k.n:'Colore su misura'; }
  function matchTile(fam,c){
    var best=null, bd=1e9;
    TILES.forEach(function(t){ if(t.fam!==fam) return; var d=dist(t.c,c); if(d<bd){ bd=d; best=t; } });
    return (best && bd<=24) ? best : null;
  }
  function texOf(fam,c){
    var t = matchTile(fam,c);
    if (t && t.stripe) return 'stripe';
    var f = FAMS.find(function(x){ return x[0]===fam; });
    return f ? f[2] : 'cotone';
  }

  /* ---------- stato ---------- */
  var st = { tab:0, seen:{}, model:P[0].slug, fam:'velluto', color:'#b57a82', opts:defaults(P[0].slug),
             mono:'', monoOn:false, monoC:'auto', sent:false, peek:null, peekModel:null, form:{}, mail:null };
  var model = function(){ return P.find(function(m){ return m.slug===st.model; }); };
  function price(){
    var p = model().price;
    p += SUR[st.fam] || 0;
    if (st.monoOn && st.mono) p += SUR.mono;
    if (st.opts.size === 'custom') p += SUR.sizeCustom;
    return p;
  }

  /* ---------- la borsa (SVG) ---------- */
  function bag(slug, u) {
    var mare = slug === 'mare', R = ' width="400" height="400"';
    var body = mare ? 'M64 190 L336 190 L306 336 Q304 348 292 348 L108 348 Q96 348 94 336 Z' : 'M52 196 Q200 180 348 196 C346 312 282 358 200 358 C118 358 54 312 52 196 Z';
    var open = mare ? 'M64 190 Q200 164 336 190 Q200 212 64 190 Z' : 'M52 196 Q200 180 348 196 Q200 166 52 196 Z';
    var edge = mare ? 'M64 190 H336' : 'M52 196 Q200 180 348 196';
    var stitch = mare ? 'M76 208 H324' : 'M66 214 Q200 199 334 214';
    var pull = mare ? [296,190] : [285,190], btn = mare ? [200,194] : [200,190];
    var back = mare ? '<path class="st" stroke-width="12" opacity=".7" d="M150 192 C146 94 254 94 250 192"/>' : '<path class="st" stroke-width="7" d="M84 194 C66 50 334 50 316 194"/>';
    var front = mare ? '<path class="st" stroke-width="15" d="M116 196 C104 62 296 62 284 196"/>' : '';
    var P6 = function(id,w,h,inner){ return '<pattern id="'+id+u+'" width="'+w+'" height="'+h+'" patternUnits="userSpaceOnUse">'+inner+'</pattern>'; };
    var defs = '<defs><clipPath id="c'+u+'"><path d="'+body+'"/></clipPath>'+
      '<linearGradient id="g'+u+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></linearGradient>'+
      '<radialGradient id="h'+u+'" cx=".3" cy=".3" r=".65"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>'+
      '<linearGradient id="k'+u+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0" class="s-hi"/><stop offset=".25" class="s-lo"/><stop offset=".5" class="s-hi"/><stop offset=".75" class="s-lo"/><stop offset="1" class="s-hi"/></linearGradient>'+
      '<filter id="n'+u+'" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .6 -.15"/></filter>'+
      P6('pc',6,6,'<path class="ln-h" stroke-width=".9" d="M0 3H6M3 0V6"/>')+
      P6('ps',400,46,'<rect class="fx" width="400" height="22"/>')+
      P6('pb',60,60,'<path class="ln-h" stroke-width="1.5" d="M30 6L46 30L30 54L14 30Z"/><path class="ln-l" stroke-width="1" d="M30 14L39 30L30 46L21 30Z"/><circle class="fl-h" cx="30" cy="30" r="4"/><circle class="fl-h" cx="0" cy="0" r="4"/><circle class="fl-h" cx="60" cy="0" r="4"/><circle class="fl-h" cx="0" cy="60" r="4"/><circle class="fl-h" cx="60" cy="60" r="4"/>')+
      P6('pw',8,9,'<path class="ln-l" stroke-width="1.6" d="M0 1L4 8L8 1"/>')+
      P6('pl',14,14,'<path class="ln-h" stroke-width="1" d="M0 3H14M0 10H14"/><path class="ln-l" stroke-width="1" d="M4 0V14M11 0V14"/>')+'</defs>';
    var fab = '<g clip-path="url(#c'+u+')"><rect class="fab"'+R+'/>'+
      '<rect class="tl t-cotton"'+R+' fill="url(#pc'+u+')"/><rect class="tl t-stripe"'+R+' fill="url(#ps'+u+')"/>'+
      '<rect class="tl t-velvet"'+R+' filter="url(#n'+u+')"/><rect class="tl t-silk"'+R+' fill="url(#k'+u+')"/>'+
      '<rect class="tl t-brocade"'+R+' fill="url(#pb'+u+')"/><rect class="tl t-wool"'+R+' fill="url(#pw'+u+')"/><rect class="tl t-linen"'+R+' fill="url(#pl'+u+')"/>'+
      '<rect'+R+' fill="url(#g'+u+')"/><rect'+R+' fill="url(#h'+u+')"/></g>';
    return '<svg viewBox="0 0 400 400" aria-hidden="true">'+defs+
      '<ellipse cx="200" cy="378" rx="118" ry="9" fill="rgba(70,10,45,.28)" style="filter:blur(7px)"/>'+back+
      '<path class="lin'+(mare?' in-m':'')+'" d="'+open+'"/>'+fab+
      '<path class="stitch" d="'+stitch+'"/>'+
      '<g class="c-zip"><path d="'+edge+'" fill="none" stroke="#cdb98a" stroke-width="3.2" stroke-dasharray="2.5 2"/><rect x="'+pull[0]+'" y="'+pull[1]+'" width="8" height="20" rx="3" fill="#cdb98a"/></g>'+
      '<g class="c-btn"><circle cx="'+btn[0]+'" cy="'+btn[1]+'" r="8" fill="#cdb98a"/><circle cx="'+btn[0]+'" cy="'+btn[1]+'" r="3.5" fill="rgba(0,0,0,.25)"/></g>'+
      front+'<text class="mono" x="200" y="'+(mare?288:304)+'" text-anchor="middle"></text></svg>';
  }

  /* ---------- palco ---------- */
  var stage = $('cfg-stage'), fl = $('cfg-float'), bagBox = $('cfg-bag'), pv = $('cfg-pv');
  var inView = false, shown = 0, target = -1, tw;

  function setPrice(n) {
    if (n === target) return; target = n; cancelAnimationFrame(tw);
    var from = shown, t0 = performance.now();
    (function f(now) {
      var k = Math.min(1, (now - t0) / 450), e = 1 - Math.pow(1 - k, 3);
      shown = Math.round(from + (n - from) * e); pv.textContent = '€ ' + shown;
      if (k < 1) tw = requestAnimationFrame(f);
    })(t0);
  }
  function applyTint() {
    if (!window.tint) return;
    window.tint(inView ? (st.peek ? st.peek.c : st.color) : null);
  }
  if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { inView = en[0].isIntersecting; applyTint(); }, { threshold: .2 }).observe(root);

  function paint() {
    var slug = st.peekModel || st.model;
    var o = st.peekModel ? defaults(slug) : st.opts;
    var c = st.peek ? st.peek.c : st.color;
    var fam = st.peek ? st.peek.fam : st.fam;
    var M = P.find(function (m) { return m.slug === slug; });
    var v = V(c, o, st.monoC); Object.keys(v).forEach(function (k) { stage.style.setProperty(k, v[k]); });
    stage.dataset.tex = texOf(fam, c);
    stage.dataset.closure = closureOf(slug);
    if (stage.dataset.slug !== slug) {
      stage.dataset.slug = slug; fl.innerHTML = bag(slug, 's');
      fl.classList.remove('cfg-swap'); void fl.offsetWidth; fl.classList.add('cfg-swap');
    }
    var mt = stage.querySelector('.mono'); if (mt) mt.textContent = st.monoOn ? st.mono : '';
    var ref = $('cfg-ref'), t = matchTile(fam, c);
    if (t && t.img) {
      ref.innerHTML = '<img src="' + esc(t.img) + '" alt="" onerror="this.parentNode.classList.remove(\'on\')">';
      ref.classList.add('on');
    } else ref.classList.remove('on');
    $('cfg-label').innerHTML = '<small>' + esc(M.name) + ' · ' + esc(famName(fam)) + '</small>' + esc(colorName(c));
    setPrice(price()); applyTint();
  }
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    stage.addEventListener('mousemove', function (e) {
      var r = stage.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      bagBox.style.transform = 'perspective(900px) rotateY(' + (x * 16).toFixed(2) + 'deg) rotateX(' + (-y * 11).toFixed(2) + 'deg)';
    });
    stage.addEventListener('mouseleave', function () { bagBox.style.transform = ''; });
  }

  /* ---------- pannelli ---------- */
  function chip(x, a, k, on) {
    return '<button class="chip' + (on ? ' on' : '') + '" data-a="' + a + '"' + (k ? ' data-k="' + k + '"' : '') +
      ' data-v="' + x.id + '">' + (x.c ? '<i style="background:' + x.c + '"></i>' : '') + x.n + '</button>';
  }
  function row(label, k, list, curId, kk) {
    return '<div class="cfg-row rise" style="--k:' + kk + '"><h4>' + label + '</h4><div class="cfg-chips">' +
      list.map(function (x) { return chip(x, 'opt', k, curId === x.id); }).join('') + '</div></div>';
  }

  function s0() {
    return '<div class="cfg-models">' + P.map(function (m, i) {
      var d = defaults(m.slug);
      return '<button class="cfg-model rise' + (st.model === m.slug ? ' on' : '') + '" style="--k:' + i + ';' + css(V(st.color, d, 'auto')) +
        '" data-a="model" data-v="' + m.slug + '" data-tex="' + texOf(st.fam, st.color) + '" data-closure="' + closureOf(m.slug) +
        '"><span class="cfg-mini">' + bag(m.slug, 'm' + i) + '</span><strong>' + esc(m.name) + '</strong><small>' +
        esc(m.type) + ' · € ' + m.price + '</small></button>';
    }).join('') + '</div>';
  }

  function matchHtml() {
    var t = matchTile(st.fam, st.color);
    if (t) {
      return '<div class="cfg-match" id="cfg-match"><span class="cfg-match-img">' +
        (t.img ? '<img src="' + esc(t.img) + '" alt="" onerror="this.remove()">' : '') +
        '</span><div><strong>' + esc(t.name) + '</strong><small>' + esc(famName(st.fam)) + ' · ' +
        (t.stock > 0 ? (t.stock <= 2 ? 'Ultimi ' + t.stock + ' pezzi' : 'Pronta in bottega') : 'Su ordinazione') +
        '</small></div></div>';
    }
    return '<div class="cfg-match none" id="cfg-match"><span class="cfg-match-img" style="background:' + esc(st.color) + '"></span>' +
      '<div><strong>' + esc(colorName(st.color)) + ' · ' + esc(famName(st.fam)) + '</strong><small>Su richiesta, cucita per te</small></div></div>';
  }

  function s1() {
    var dots = COLORS.map(function (c, i) {
      return '<button class="cfg-color rise" style="--k:' + i + '" data-a="color" data-v="' + c.c + '" title="' + esc(c.n) +
        '" aria-label="' + esc(c.n) + '"><i style="background:' + c.c + '"></i></button>';
    }).join('');
    var fams = FAMS.map(function (f) { return chip({ id: f[0], n: f[1] }, 'fam', '', st.fam === f[0]); }).join('');
    return '<div class="cfg-pick">' +
        '<p class="cfg-step rise"><b>1</b> Il colore</p>' +
        '<div class="cfg-colors rise" style="--k:1">' + dots +
          '<label class="cfg-color pick" title="Colore su misura"><i></i><input type="color" id="cfg-color" value="' + esc(st.color) + '"></label>' +
        '</div>' +
        '<p class="cfg-cap" id="cfg-cap">' + esc(colorName(st.color)) + '</p>' +
      '</div>' +
      '<div class="cfg-pick">' +
        '<p class="cfg-step rise" style="--k:2"><b>2</b> Il tessuto</p>' +
        '<div class="cfg-chips rise" style="--k:3">' + fams + '</div>' +
      '</div>' + matchHtml();
  }

  function monoInner() {
    return '<div class="cfg-chips">' + chip({ id: 'off', n: 'Nessuno' }, 'monoOn', '', !st.monoOn) +
      chip({ id: 'on', n: 'Iniziali' }, 'monoOn', '', st.monoOn) + '</div>' +
      (st.monoOn ? '<div class="cfg-chips sub"><input class="cfg-mono" id="cfg-mono" maxlength="3" placeholder="ABC" value="' +
        esc(st.mono) + '" autocomplete="off">' + MONOC.map(function (x) { return chip(x, 'monoC', '', st.monoC === x.id); }).join('') + '</div>' : '');
  }
  function s2() {
    var mare = st.model === 'mare', o = st.opts;
    return row(mare ? 'Manici' : 'Tracolla', 'strap', STRAP, o.strap, 0) +
      row('Fodera', 'lining', LINING, o.lining, 1) +
      row('Misura', 'size', SIZE, o.size, 2) +
      '<div class="cfg-row rise" style="--k:3"><h4>Monogramma</h4><div id="cfg-monorow">' + monoInner() + '</div></div>';
  }
  function rows() {
    var m = model(), o = st.opts, mare = m.slug === 'mare';
    return [
      ['Modello', m.name + ' · ' + m.type],
      ['Colore', colorName(st.color)],
      ['Tessuto', famName(st.fam)],
      [mare ? 'Manici' : 'Tracolla', pick(STRAP, o.strap).n],
      ['Fodera', pick(LINING, o.lining).n],
      ['Misura', pick(SIZE, o.size).n],
      ['Monogramma', st.monoOn && st.mono ? st.mono + ' (' + pick(MONOC, st.monoC).n + ')' : '—']
    ];
  }
  var fv = function (n) { return esc(st.form[n] || ''); };
  function s3() {
    var chips = rows().filter(function (r) { return r[1] !== '—'; })
      .map(function (r) { return '<span>' + esc(r[1]) + '</span>'; }).join('');
    return '<div class="cfg-sumchips rise">' + chips + '</div>' +
      '<form id="cfg-form" class="cfg-form rise" style="--k:1" novalidate>' +
      '<label>Nome<input name="name" required autocomplete="name" value="' + fv('name') + '"></label>' +
      '<label>Email<input name="email" type="email" required autocomplete="email" value="' + fv('email') + '"></label>' +
      '<label>Telefono<input name="phone" type="tel" placeholder="facoltativo" value="' + fv('phone') + '"></label>' +
      '<label>Consegna entro<input name="when" placeholder="es. fine dicembre" value="' + fv('when') + '"></label>' +
      '<label class="wide">Note<textarea name="note" rows="2" placeholder="Misure, occasione, tessuti che hai in mente…">' + fv('note') + '</textarea></label></form>';
  }
  function summaryText() {
    var f = st.form;
    return ['Ciao! Vorrei una borsa su misura creata dal configuratore.', '']
      .concat(rows().map(function (r) { return r[0].toUpperCase() + ': ' + r[1]; }),
      ['Prezzo indicativo: da € ' + price(), '', 'Nome: ' + (f.name || ''), 'Email: ' + (f.email || ''),
       'Telefono: ' + (f.phone || '—'), 'Consegna entro: ' + (f.when || '—'), 'Note: ' + (f.note || '—')]).join('\n');
  }
  function thanks() {
    var mailto = EMAIL ? 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(st.mail.subj) + '&body=' + encodeURIComponent(st.mail.text) : '';
    return '<div class="cfg-thanks"><svg class="cfg-ok" viewBox="0 0 52 52"><circle cx="26" cy="26" r="24"/><path d="M15 27l8 8 15-16"/></svg>' +
      '<h3 class="rise" style="--k:6">Richiesta pronta</h3>' +
      '<p class="rise" style="--k:7">' + (EMAIL ? 'Si è aperta la tua email: premi invia e ti scriviamo noi.' : 'Copia il riepilogo e mandacelo via email.') + '</p>' +
      '<div class="cfg-actions rise" style="--k:8">' + (EMAIL ? '<a class="btn" href="' + mailto + '">Riapri email</a>' : '') +
      '<button class="btn btn-ghost" data-a="copy">Copia riepilogo</button></div>' +
      '<button class="cfg-link rise" style="--k:9" data-a="again">Configura un\u2019altra borsa</button></div>';
  }

  /* ---------- render / navigazione ---------- */
  var tabsEl = $('cfg-tabs');
  tabsEl.innerHTML = STEPS.map(function (n, i) { return '<button data-tab="' + i + '">' + n + '</button>'; }).join('');
  function chrome() {
    tabsEl.style.setProperty('--i', st.tab);
    [].forEach.call(tabsEl.children, function (b, i) { b.classList.toggle('on', i === st.tab); });
    $('cfg-prev').disabled = st.tab === 0;
    $('cfg-next').textContent = st.tab === 3 ? 'Invia richiesta' : 'Avanti';
  }
  function setColorOn() {
    var pal = false;
    root.querySelectorAll('.cfg-color[data-v]').forEach(function (x) {
      var on = x.dataset.v === st.color; if (on) pal = true;
      x.classList.toggle('on', on);
    });
    var cust = root.querySelector('.cfg-color.pick'); if (cust) cust.classList.toggle('on', !pal);
    var cap = $('cfg-cap'); if (cap) cap.textContent = colorName(st.color);
  }
  function updateMatch() { var el = $('cfg-match'); if (el) el.outerHTML = matchHtml(); }
  function render() {
    var el = $('cfg-body'); el.innerHTML = st.sent ? thanks() : [s0, s1, s2, s3][st.tab]();
    el.scrollTop = 0; tabsEl.hidden = $('cfg-foot').hidden = st.sent; chrome();
    if (!st.sent && st.tab === 1) setColorOn();
  }
  function go(n) { if (n === st.tab) return; st.seen[st.tab] = true; st.tab = n; st.peek = st.peekModel = null; render(); paint(); }
  function send() {
    var f = $('cfg-form'); if (!f.checkValidity()) { f.reportValidity(); return; }
    st.mail = { subj: 'Richiesta borsa su misura – ' + model().name + ', ' + colorName(st.color) + ' in ' + famName(st.fam), text: summaryText() };
    if (EMAIL) location.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(st.mail.subj) + '&body=' + encodeURIComponent(st.mail.text);
    st.sent = true; render();
  }
  function setOn(group, sel, v) { group.querySelectorAll(sel).forEach(function (x) { x.classList.toggle('on', x.dataset.v === v); }); }

  /* ---------- eventi ---------- */
  root.addEventListener('click', function (e) {
    var tb = e.target.closest('[data-tab]'); if (tb) { go(+tb.dataset.tab); return; }
    var b = e.target.closest('[data-a]'); if (!b) return; var a = b.dataset.a, v = b.dataset.v;
    if (a === 'prev') { if (st.tab > 0) go(st.tab - 1); }
    else if (a === 'next') { if (st.tab === 3) send(); else go(st.tab + 1); }
    else if (a === 'model') { if (st.model !== v) { st.model = v; st.opts = defaults(v); } st.peekModel = null; setOn(root, '.cfg-model', v); paint(); }
    else if (a === 'color') { st.color = v; setColorOn(); updateMatch(); paint(); }
    else if (a === 'fam') { st.fam = v; setOn(b.parentNode, '.chip', v); updateMatch(); paint(); }
    else if (a === 'opt') { st.opts[b.dataset.k] = v; setOn(b.parentNode, '.chip', v); paint(); }
    else if (a === 'monoOn') { st.monoOn = v === 'on'; $('cfg-monorow').innerHTML = monoInner(); paint(); var i = $('cfg-mono'); if (i) i.focus({ preventScroll: true }); }
    else if (a === 'monoC') { st.monoC = v; setOn(b.parentNode, '.chip', v); paint(); }
    else if (a === 'copy') { (navigator.clipboard ? navigator.clipboard.writeText(st.mail.text) : Promise.reject()).then(function () { b.textContent = 'Copiato ✓'; }, function () { b.textContent = 'Copia a mano'; }); }
    else if (a === 'again') { st.sent = false; st.tab = 0; st.seen = {}; st.opts = defaults(st.model); st.monoOn = false; st.mono = ''; st.form = {}; render(); paint(); }
  });
  root.addEventListener('input', function (e) {
    var t = e.target;
    if (t.id === 'cfg-mono') { st.mono = t.value.toUpperCase().replace(/[^A-Z]/g, ''); t.value = st.mono; paint(); }
    else if (t.id === 'cfg-color') { st.color = t.value; setColorOn(); updateMatch(); paint(); }
    else if (t.closest('#cfg-form')) st.form[t.name] = t.value;
  });
  root.addEventListener('mouseover', function (e) {
    var col = e.target.closest('.cfg-color[data-v]');
    var fam = e.target.closest('.chip[data-a="fam"]');
    var mod = e.target.closest('.cfg-model');
    var pk = col ? { c: col.dataset.v, fam: st.fam } : fam ? { c: st.color, fam: fam.dataset.v } : null;
    var pm = mod ? mod.dataset.v : null;
    var same = (!pk && !st.peek) || (pk && st.peek && pk.c === st.peek.c && pk.fam === st.peek.fam);
    if (!same || pm !== st.peekModel) { st.peek = pk; st.peekModel = pm; paint(); }
  });
  root.addEventListener('mouseleave', function () { if (st.peek || st.peekModel) { st.peek = st.peekModel = null; paint(); } });

  /* ---------- avvio (/?m=sera&v=sera-velluto-rosa#crea) ---------- */
  var q = new URLSearchParams(location.search), qm = q.get('m'), qv = q.get('v');
  if (P.some(function (p) { return p.slug === qm; })) { st.model = qm; st.opts = defaults(qm); st.tab = 1; }
  var qt = TILES.find(function (t) { return t.id === qv; });
  if (qt) { st.fam = qt.fam; st.color = qt.c; st.tab = 1; }
  if (qm || qv) setTimeout(function () { 
    if (window.lenis) {
      window.lenis.scrollTo($('crea'), { offset: -90 });
    } else {
      $('crea').scrollIntoView({ behavior: 'smooth' }); 
    }
  }, 350);
  render(); paint();
})();

// ===== MEGA LOGO MOUSE PARALLAX =====
(function() {
  const parallaxEl = document.querySelector('.mega-logo-parallax');
  // Only run on devices with a mouse/trackpad
  if (parallaxEl && window.matchMedia('(pointer: fine)').matches) {
    let rafId;
    document.addEventListener('mousemove', (e) => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        // Calculate mouse position relative to screen center
        const x = (e.clientX / window.innerWidth - 0.5) * -22; 
        const y = (e.clientY / window.innerHeight - 0.5) * -22;
        parallaxEl.style.transform = `translate(${x}px, ${y}px)`;
      });
    });
  }
})();

// ===== CUSTOM JS CURSOR =====
(function() {
  const cursor = document.getElementById('custom-cursor');
  if (!cursor) return;

  let mouseX = 0, mouseY = 0;
  let cursorX = 0, cursorY = 0;

  // Update target mouse position
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursor.style.opacity = '1'; // Show cursor on first move
  });

  // Hide when leaving window
  document.addEventListener('mouseleave', () => cursor.style.opacity = '0');
  document.addEventListener('mouseenter', () => cursor.style.opacity = '1');

  // Smooth animation loop
  function animateCursor() {
    // Lerp (Linear Interpolation) for a smooth, trailing effect
    cursorX += (mouseX - cursorX) * 0.25;
    cursorY += (mouseY - cursorY) * 0.25;

    // Apply position
    cursor.style.left = `${cursorX}px`;
    cursor.style.top = `${cursorY}px`;

    requestAnimationFrame(animateCursor);
  }
  animateCursor();

  // Add hover states
  const hoverElements = document.querySelectorAll('a, button, .card, .dot, .cfg-color, .cfg-model');
  hoverElements.forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
  });
})();

// ===== LENIS SMOOTH SCROLL =====
(function() {
  if (typeof Lenis === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Initialize Lenis on the window
  var lenis = new Lenis({
    lerp: 0.08,
    wheelMultiplier: 0.9,
    smoothWheel: true,
    syncTouch: false
  });

  // Start the animation loop
  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
  
  // Expose globally so other scripts can use it (e.g., configurator scroll)
  window.lenis = lenis;

  // Smooth scroll for all anchor links (like #collezione, #crea)
  document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
    anchor.addEventListener('click', function(e) {
      var targetId = this.getAttribute('href');
      if (targetId === '#') return;
      
      var targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        // Offset by -90px to account for the fixed header
        lenis.scrollTo(targetEl, { offset: -90 });
      }
    });
  });
})();