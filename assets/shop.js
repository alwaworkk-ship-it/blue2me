/*
 * blue2me Shop Integration
 * ========================
 * Direkte Shopify Storefront API (GraphQL) mit Recharge Selling Plans.
 * Kein Buy Button SDK noetig.
 */
(function () {
  'use strict';

  var cfg = window.BLUE2ME_CONFIG || {};
  var API_VERSION = '2024-10';
  var CART_KEY = 'blue2me-cart-id';

  /* ---- State ---- */
  var product = null;   // { variantId, sellingPlans: [] }
  var cartId = null;
  var checkoutUrl = null;
  var selectedPlanId = null;

  /* ---- Helpers ---- */
  function isDemo() {
    return !cfg.shopDomain || cfg.shopDomain.indexOf('DEINE') > -1 || !cfg.storefrontToken || cfg.storefrontToken.indexOf('DEIN') > -1;
  }

  function toast(msg, ms) {
    var t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#163762;color:#fff;padding:14px 24px;border-radius:14px;font-family:Inter,sans-serif;font-size:14px;font-weight:600;z-index:99999;box-shadow:0 12px 32px rgba(22,55,98,.3);max-width:90vw;text-align:center;';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () {
      t.style.transition = 'opacity .3s';
      t.style.opacity = '0';
      setTimeout(function () { t.remove(); }, 300);
    }, ms || 3200);
  }

  /* ---- Force checkout to run on myshopify.com (umgeht Custom Primary Domain) ---- */
  function normalizeCheckoutUrl(url) {
    if (!url) return url;
    try {
      var u = new URL(url);
      u.host = cfg.shopDomain;
      u.protocol = 'https:';
      u.pathname = u.pathname.replace(/^\/(de|en|es|fr|it|nl)(\/|$)/, '/');
      var out = u.toString();
      console.log('[blue2me] checkoutUrl normalized:', url, '->', out);
      return out;
    } catch (e) {
      return url;
    }
  }

  /* ---- Storefront API ---- */
  function gql(query, variables) {
    return fetch('https://' + cfg.shopDomain + '/api/' + API_VERSION + '/graphql.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': cfg.storefrontToken
      },
      body: JSON.stringify({ query: query, variables: variables })
    }).then(function (r) { return r.json(); });
  }

  /* ---- Load Product + Selling Plans ---- */
  var PRODUCT_QUERY = [
    'query ($handle: String!) {',
    '  product(handle: $handle) {',
    '    id title',
    '    variants(first: 5) { edges { node {',
    '      id title',
    '      price { amount currencyCode }',
    '      compareAtPrice { amount }',
    '    } } }',
    '    sellingPlanGroups(first: 5) { edges { node {',
    '      name',
    '      sellingPlans(first: 10) { edges { node {',
    '        id name description',
    '        options { name value }',
    '        recurringDeliveries',
    '      } } }',
    '    } } }',
    '  }',
    '}'
  ].join('\n');

  function loadProduct() {
    if (isDemo()) return Promise.resolve(null);
    return gql(PRODUCT_QUERY, { handle: cfg.productHandle }).then(function (res) {
      var p = res && res.data && res.data.product;
      if (!p) return null;
      var variant = p.variants.edges[0] && p.variants.edges[0].node;
      var plans = [];
      (p.sellingPlanGroups.edges || []).forEach(function (g) {
        (g.node.sellingPlans.edges || []).forEach(function (sp) {
          plans.push(sp.node);
        });
      });
      product = {
        id: p.id,
        title: p.title,
        variantId: variant ? variant.id : null,
        price: variant ? variant.price.amount : null,
        compareAtPrice: variant && variant.compareAtPrice ? variant.compareAtPrice.amount : null,
        currency: variant ? variant.price.currencyCode : 'EUR',
        sellingPlans: plans
      };
      return product;
    });
  }

  /* ---- Render Selling Plan Selector ---- */
  function renderPlans() {
    var container = document.getElementById('selling-plans');
    if (!container) return;
    if (!product || product.sellingPlans.length === 0) {
      container.style.display = 'none';
      return;
    }

    var html = '<div class="buy-section__variants" role="radiogroup" aria-label="Lieferrhythmus">';

    // Einmalkauf Option
    html += '<label class="buy-section__variant"><input type="radio" name="selling-plan" value="" checked><span>Einmalig</span></label>';

    product.sellingPlans.forEach(function (plan) {
      html += '<label class="buy-section__variant"><input type="radio" name="selling-plan" value="' + plan.id + '"><span>' + plan.name + '</span></label>';
    });

    html += '</div>';
    container.innerHTML = html;
    container.style.display = '';

    // Bind radio clicks
    container.querySelectorAll('input[type="radio"]').forEach(function (radio) {
      radio.addEventListener('change', function () {
        container.querySelectorAll('.buy-section__variant').forEach(function (l) { l.classList.remove('is-active'); });
        radio.closest('.buy-section__variant').classList.add('is-active');
        selectedPlanId = radio.value || null;
      });
    });

    // Set first as active
    var first = container.querySelector('.buy-section__variant');
    if (first) first.classList.add('is-active');
    selectedPlanId = null;
  }

  /* ---- Cart ---- */
  var CART_CREATE = [
    'mutation ($input: CartInput!) {',
    '  cartCreate(input: $input) {',
    '    cart { id checkoutUrl totalQuantity }',
    '    userErrors { field message }',
    '  }',
    '}'
  ].join('\n');

  var CART_LINES_ADD = [
    'mutation ($cartId: ID!, $lines: [CartLineInput!]!) {',
    '  cartLinesAdd(cartId: $cartId, lines: $lines) {',
    '    cart { id checkoutUrl totalQuantity }',
    '    userErrors { field message }',
    '  }',
    '}'
  ].join('\n');

  var CART_FETCH = [
    'query ($id: ID!) {',
    '  cart(id: $id) { id checkoutUrl totalQuantity }',
    '}'
  ].join('\n');

  function buildLineItem(qty) {
    var line = {
      merchandiseId: product.variantId,
      quantity: qty || 1
    };
    if (selectedPlanId) {
      line.sellingPlanId = selectedPlanId;
    }
    return line;
  }

  function createCart(qty) {
    return gql(CART_CREATE, {
      input: { lines: [buildLineItem(qty)] }
    }).then(function (res) {
      var c = res.data.cartCreate.cart;
      var errs = res.data.cartCreate.userErrors;
      if (errs && errs.length) throw new Error(errs[0].message);
      cartId = c.id;
      checkoutUrl = normalizeCheckoutUrl(c.checkoutUrl);
      localStorage.setItem(CART_KEY, cartId);
      updateBubble(c.totalQuantity);
      return c;
    });
  }

  function addToExistingCart(qty) {
    return gql(CART_LINES_ADD, {
      cartId: cartId,
      lines: [buildLineItem(qty)]
    }).then(function (res) {
      var c = res.data.cartLinesAdd.cart;
      var errs = res.data.cartLinesAdd.userErrors;
      if (errs && errs.length) throw new Error(errs[0].message);
      checkoutUrl = normalizeCheckoutUrl(c.checkoutUrl);
      updateBubble(c.totalQuantity);
      return c;
    });
  }

  function restoreCart() {
    var saved = localStorage.getItem(CART_KEY);
    if (!saved) return Promise.resolve(null);
    return gql(CART_FETCH, { id: saved }).then(function (res) {
      var c = res.data && res.data.cart;
      if (c) {
        cartId = c.id;
        checkoutUrl = normalizeCheckoutUrl(c.checkoutUrl);
        updateBubble(c.totalQuantity);
      }
      return c;
    }).catch(function () { return null; });
  }

  function addToCart(qty) {
    if (cartId) return addToExistingCart(qty);
    return createCart(qty);
  }

  function updateBubble(count) {
    document.querySelectorAll('[data-cart-count]').forEach(function (el) {
      el.textContent = count || 0;
      el.style.display = count > 0 ? '' : 'none';
    });
  }

  /* ---- Actions ---- */
  function getQty(btn) {
    var form = btn.closest('form, .probierbox__copy, .buy-section__copy');
    if (!form) return 1;
    var input = form.querySelector('input[name="quantity"]');
    return input ? (parseInt(input.value, 10) || 1) : 1;
  }

  function handleBuyNow(btn) {
    if (isDemo()) { toast('Demo-Vorschau: Bestellungen sind nach Go-Live moeglich.'); return; }
    if (!product || !product.variantId) { toast('Produkt wird geladen, bitte kurz warten.'); return; }
    var qty = getQty(btn);
    btn.disabled = true;
    btn.textContent = '...';
    addToCart(qty).then(function () {
      window.location.href = checkoutUrl;
    }).catch(function (err) {
      toast('Fehler: ' + (err.message || 'Bitte erneut versuchen.'));
      btn.disabled = false;
      btn.textContent = 'Erneut versuchen';
    });
  }

  function handleAddToCart(btn) {
    if (isDemo()) { toast('Demo-Vorschau: Bestellungen sind nach Go-Live moeglich.'); return; }
    if (!product || !product.variantId) { toast('Produkt wird geladen, bitte kurz warten.'); return; }
    var qty = getQty(btn);
    var orig = btn.innerHTML;
    btn.disabled = true;
    btn.textContent = '...';
    addToCart(qty).then(function () {
      btn.innerHTML = orig;
      btn.disabled = false;
      toast('Zum Warenkorb hinzugefuegt');
    }).catch(function (err) {
      toast('Fehler: ' + (err.message || 'Bitte erneut versuchen.'));
      btn.innerHTML = orig;
      btn.disabled = false;
    });
  }

  function handleOpenCheckout() {
    if (isDemo()) { toast('Demo-Vorschau: Bestellungen sind nach Go-Live moeglich.'); return; }
    if (checkoutUrl) {
      window.location.href = checkoutUrl;
    } else {
      toast('Warenkorb ist leer. Bitte zuerst Produkt hinzufuegen.');
    }
  }

  /* ---- Quantity Stepper ---- */
  function bindQty() {
    document.querySelectorAll('[data-buy-form]').forEach(function (form) {
      var input = form.querySelector('input[name="quantity"]');
      var down = form.querySelector('[data-qty-down]');
      var up = form.querySelector('[data-qty-up]');
      if (input && down && up) {
        down.addEventListener('click', function () { input.value = Math.max(1, parseInt(input.value, 10) - 1); });
        up.addEventListener('click', function () { input.value = Math.min(20, parseInt(input.value, 10) + 1); });
      }
    });
  }

  /* ---- Wire Up ---- */
  function bind() {
    document.querySelectorAll('[data-buy-now]').forEach(function (btn) {
      btn.addEventListener('click', function (e) { e.preventDefault(); handleBuyNow(btn); });
    });
    document.querySelectorAll('[data-add-to-cart]').forEach(function (btn) {
      btn.addEventListener('click', function (e) { e.preventDefault(); handleAddToCart(btn); });
    });
    document.querySelectorAll('[data-open-checkout]').forEach(function (btn) {
      btn.addEventListener('click', function (e) { e.preventDefault(); handleOpenCheckout(); });
    });
    bindQty();
  }

  /* ---- Init ---- */
  function init() {
    bind();
    if (isDemo()) return;
    loadProduct().then(function () {
      renderPlans();
      return restoreCart();
    }).catch(function (err) {
      console.error('[blue2me]', err);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.blue2me = { handleBuyNow: handleBuyNow, handleAddToCart: handleAddToCart };
})();
