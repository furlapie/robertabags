export async function onRequestPost({ request, env }) {
  const { items } = await request.json();
  const models = await (await fetch(new URL('/products.json', request.url))).json();
  const form = new URLSearchParams({
    mode: 'payment',
    success_url: new URL('/?ordine=ok', request.url).href,
    cancel_url: new URL('/', request.url).href,
    'shipping_address_collection[allowed_countries][0]': 'IT',
    'shipping_options[0][shipping_rate_data][type]': 'fixed_amount',
    'shipping_options[0][shipping_rate_data][display_name]': 'Spedizione in Italia',
    'shipping_options[0][shipping_rate_data][fixed_amount][amount]': '500',
    'shipping_options[0][shipping_rate_data][fixed_amount][currency]': 'eur',
  });

  let n = 0;
  for (const it of items || []) {
    let model, variant;
    for (const m of models) { const v = m.variants.find(v => v.id === it.id); if (v) { model = m; variant = v; break; } }
    if (!variant || variant.stock <= 0) return Response.json({ error: 'non disponibile' }, { status: 400 });
    const qty = Math.max(1, Math.min(Number(it.qty) || 1, variant.stock));
    const price = variant.price || model.price;
    form.append(`line_items[${n}][price_data][currency]`, 'eur');
    form.append(`line_items[${n}][price_data][product_data][name]`, `${model.name} – ${variant.name}`);
    form.append(`line_items[${n}][price_data][unit_amount]`, String(Math.round(price * 100)));
    form.append(`line_items[${n}][quantity]`, String(qty));
    n++;
  }
  if (!n) return Response.json({ error: 'borsa vuota' }, { status: 400 });

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST', headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` }, body: form,
  });
  const session = await res.json();
  return session.url ? Response.json({ url: session.url }) : Response.json({ error: 'stripe' }, { status: 502 });
}   