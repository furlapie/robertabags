document.addEventListener('DOMContentLoaded', function () {
  var m = window.MODEL, state = { v: m.variants.find(function (v) { return v.stock > 0; }) || m.variants[0], i: 0 };
  var main = document.getElementById('pdp-main'), img = document.getElementById('pdp-main-img');
  var thumbs = document.getElementById('pdp-thumbs'), sw = document.getElementById('pdp-swatches');
  var add = document.getElementById('pdp-add');
  var price = function (v) { return v.price || m.price; };

  function show() {
    var v = state.v;
    main.style.background = v.swatch;
    img.style.display = ''; img.src = v.images[state.i] || ''; img.onerror = function () { img.style.display = 'none'; };
    document.getElementById('pdp-variant-name').textContent = v.name;
    document.getElementById('pdp-fabric').textContent = v.fabric || '';
    document.getElementById('pdp-price').textContent = '€ ' + price(v);
    document.getElementById('pdp-stock').textContent = v.stock <= 0 ? 'Esaurita' : v.stock <= 2 ? 'Ultimi ' + v.stock + ' pezzi' : 'Disponibile';
    add.disabled = v.stock <= 0;
    thumbs.innerHTML = v.images.length > 1 ? '' : '';
    v.images.forEach(function (src, i) {
      if (v.images.length < 2) return;
      var b = document.createElement('button'); b.className = i === state.i ? 'on' : '';
      b.innerHTML = '<img src="' + src + '" alt="">';
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
    window.Cart.add({
      id: v.id, name: m.name, variant: v.name, price: price(v), max: v.stock,
      img: v.images[0] || '', color: v.swatch, url: location.pathname
    });
  });
  show();
});