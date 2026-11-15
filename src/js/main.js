(function () {
  var bg = document.querySelector('.bg');
  if (!bg) return;
  var SPEED = 1;   // 1 = come la pagina, più basso = sfondo più lento (effetto profondità)
  var queued = false;
  function update() { bg.style.transform = 'translate3d(0,' + (-scrollY * SPEED).toFixed(1) + 'px,0)'; queued = false; }
  function measure() {
    var max = document.documentElement.scrollHeight - innerHeight;
    bg.style.height = Math.max(innerHeight * 2, innerHeight + max * SPEED) + 'px';   // abbastanza alto da coprire tutta la pagina
    update();
  }
  addEventListener('scroll', function () { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', measure);
  addEventListener('load', measure);
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(document.body);
  measure();
})();

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