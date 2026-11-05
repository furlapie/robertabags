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
        box.style.background = dot.dataset.color;
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