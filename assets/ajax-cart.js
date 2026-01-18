/*  assets/ajax-cart-final.js  –  100 % AJAX, zero redirect, zero popup  */
(function () {
  'use strict';

  /* ----------  SAFE HELPERS  ---------- */
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const safeColor = str => String(str || '').toLowerCase().trim();

  /* ----------  MONEY FORMAT  ---------- */
  const money = cents => (cents / 100).toFixed(2);

  /* ----------  CART API  ---------- */
  const API = {
    get : () => fetch('/cart.js').then(r => r.json()),
    add : items => fetch('/cart/add.js', {
                      method : 'POST',
                      headers: {'Content-Type': 'application/json'},
                      body   : JSON.stringify({items})
                    }).then(r => { if (!r.ok) throw r; return r.json(); })
                      .then(() => API.get()),
    change: (line, qty) => fetch('/cart/change.js', {
                                method : 'POST',
                                headers: {'Content-Type': 'application/json'},
                                body   : JSON.stringify({line, quantity: qty})
                             }).then(r => { if (!r.ok) throw r; return r.json(); })
                               .then(() => API.get())
  };

 /* ----------  DRAWER – created on first use  ---------- */
function renderDrawer(cart) {
  let d = $('#AjaxCartDrawer');
  if (!d) {                                    // first click – build it
    d = document.createElement('div');
    d.id = 'AjaxCartDrawer';
    d.className = 'ajax-cart-drawer';
    d.innerHTML = `
      <div class="ajax-cart-header">
        <span>Cart</span>
        <button class="ajax-cart-close" aria-label="Close">&times;</button>
      </div>
      <div class="ajax-cart-body"></div>
      <div class="ajax-cart-footer"></div>`;
    document.body.appendChild(d);

    /* ----- close handlers ----- */
    $('.ajax-cart-close', d).addEventListener('click', () => d.classList.remove('open'));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') d.classList.remove('open'); });
  }

  const body = $('.ajax-cart-body', d);
  const foot = $('.ajax-cart-footer', d);

  body.innerHTML = cart.items.length
    ? cart.items.map(item => `
        <div class="ajax-cart-item" data-key="${item.key}">
          <img src="${item.image}" alt="">
          <div>
            <strong>${item.product_title}</strong><br>
            ${item.variant_title} × ${item.quantity}<br>
            $${money(item.final_line_price)}
          </div>
          <button class="ajax-cart-remove" data-key="${item.key}">×</button>
        </div>`).join('')
    : `<p class="ajax-cart-empty">Your cart is empty</p>`;

  foot.innerHTML = `
    <div class="ajax-cart-total">
      <span>Total</span><strong>$${money(cart.total_price)}</strong>
    </div>
    <div class="ajax-cart-actions">
      <a href="/cart" class="ajax-cart-btn secondary">View cart</a>
      <a href="/checkout" class="ajax-cart-btn primary">Check out</a>
    </div>`;

  d.classList.toggle('has-items', cart.items.length > 0);
  updateBubble(cart.item_count);
  d.classList.add('open');          // show it
}

  /* ----------  BUILD PAYLOAD (used by modal & page)  ---------- */
  window.buildAddPayload = function () {
    const color = (window.getSelectedModalColorValue?.() || window.getSelectedColorFromForm?.() || 'Black');
    const back  = $('#backViewFrontBack')?.checked ? 'Front and Back Design' : 'Front Design Only';
    const sizes = Object.entries(window.selectedSizes || {}).filter(([,q]) => q > 0);
    if (!sizes.length) throw new Error('Please select at least one size/quantity');

    return sizes.map(([size, qty]) => {
      const v = window.findVariant(
  safeColor(color.value || color),   // accept object or string
  safeColor(size),
  safeColor(back)
);
      if (!v) throw new Error(`Variant not available: ${color} / ${size} / ${back}`);
      return {
        id        : v.id,
        quantity  : qty,
        properties: {
          _custom_order: 'Yes',
          _back_view   : back.includes('Back') ? 'Yes' : 'No',
          _color       : color,
          _size        : size,
          _design_data : JSON.stringify(window.customizationLayers?.slice(0,5) || [])
        }
      };
    });
  };

  /* ----------  MAIN CLICK HANDLER  ---------- */
  async function handleAdd() {
    const btn = $('[data-ajax-add]');
    if (!btn) return;
    const orig = btn.textContent;
    btn.textContent = 'Adding…';
    btn.disabled = true;
    try {
      const items = window.buildAddPayload();
      const cart  = await API.add(items);
      renderDrawer(cart);
      $('#customizationModal')?.classList.remove('show'); // close modal if open
    } catch (e) {
      const msg = (await e.json?.())?.description || e.message || 'Error';
      alert(msg);
    } finally {
      btn.textContent = orig;
      btn.disabled = false;
    }
  }

  /* ----------  LISTENERS  ---------- */
  document.addEventListener('click', e => {
    const t = e.target;
    if (t.dataset.d) {              // +/- in drawer
      e.preventDefault();
      const input = t.parentElement.querySelector('input');
      const line  = input.closest('.ajax-cart-item').dataset.key;
      const qty   = Math.max(0, parseInt(input.value, 10) + parseInt(t.dataset.d, 10));
      API.change(line, qty).then(renderDrawer);
    }
    if (t.classList.contains('ajax-cart-remove')) {
      e.preventDefault();
      API.change(t.dataset.key, 0).then(renderDrawer);
    }
    if (t.closest('[data-ajax-add]')) {
      e.preventDefault();
      handleAdd();
    }
  });

  /* ----------  BLOCK OLD SUBMIT  ---------- */
  document.addEventListener('submit', e => {
    const f = e.target;
    if (f.id === 'AddToCartForm' || f.matches('.product-form, [action*="/cart"]')) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);

  /* ----------  INIT  ---------- */
  // API.get().then(renderDrawer);
})();