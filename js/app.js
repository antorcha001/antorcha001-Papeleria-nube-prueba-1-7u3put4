/* Interacciones compartidas por las cuatro páginas del prototipo. */
(() => {
  const CART_KEY = 'nubePapelCart';
  const products = window.STORE_PRODUCTS || [];
  const money = value => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(value);
  const byId = id => products.find(product => product.id === id);

  // Lee el carrito guardado sin interrumpir la página si el almacenamiento no está disponible.
  function readCart() {
    try {
      const saved = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      return Array.isArray(saved) ? saved.filter(item => byId(item.id) && Number(item.quantity) > 0) : [];
    } catch (error) {
      return [];
    }
  }

  function saveCart(cart) {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (error) { showToast('No se pudo guardar el carrito en este navegador.'); }
    updateCartCount();
  }

  function updateCartCount() {
    const total = readCart().reduce((sum, item) => sum + item.quantity, 0);
    document.querySelectorAll('[data-cart-count]').forEach(node => { node.textContent = total; });
  }

  let toastTimer;
  function showToast(message) {
    const toast = document.querySelector('.toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2600);
  }

  function addToCart(id) {
    const product = byId(id);
    if (!product || product.stock <= 0) return;
    const cart = readCart();
    const existing = cart.find(item => item.id === id);
    if (existing) existing.quantity = Math.min(existing.quantity + 1, product.stock);
    else cart.push({ id, quantity: 1 });
    saveCart(cart);
    showToast(`${product.name} se agregó al carrito.`);
  }

  function productCard(product) {
    const outOfStock = product.stock <= 0;
    const firstTag = product.tag[0] || 'papelería';
    return `
      <article class="product-card ${outOfStock ? 'is-out-of-stock' : ''}">
        <button class="product-image-button" type="button" data-quick-view="${product.id}" aria-label="Ver detalles de ${product.name}">
          <img src="assets/productos/${product.image}" alt="${product.name}" loading="lazy">
          <span class="product-tag">${firstTag}</span>
          ${outOfStock ? '<span class="stock-overlay">Agotado</span>' : ''}
        </button>
        <div class="product-card-info">
          <span class="product-category">${product.category}</span>
          <button class="product-name" type="button" data-quick-view="${product.id}">${product.name}</button>
          <div class="product-card-bottom"><strong>${money(product.price)}</strong><button class="add-button" type="button" data-add="${product.id}" ${outOfStock ? 'disabled' : ''} aria-label="${outOfStock ? 'Producto agotado' : 'Agregar ' + product.name + ' al carrito'}">${outOfStock ? 'Agotado' : '<span aria-hidden="true">＋</span> Agregar'}</button></div>
        </div>
      </article>`;
  }

  function renderCards(target, list) {
    if (!target) return;
    target.innerHTML = list.map(productCard).join('');
  }

  function openProductDialog(id) {
    const product = byId(id);
    const dialog = document.getElementById('product-dialog');
    if (!product || !dialog) return;
    const content = dialog.querySelector('.dialog-content');
    content.innerHTML = `
      <div class="dialog-image"><img src="assets/productos/${product.image}" alt="${product.name}"></div>
      <div class="dialog-info"><span class="eyebrow">${product.category.toUpperCase()}</span><h2>${product.name}</h2><strong class="dialog-price">${money(product.price)}</strong><p>${product.description}</p><div class="dialog-tags">${product.tag.map(tag => `<span>${tag}</span>`).join('')}</div><p class="dialog-stock">${product.stock > 0 ? `Disponibles para demostración: ${product.stock}` : 'Este producto está agotado.'}</p><button class="button button-primary" type="button" data-add="${product.id}" ${product.stock <= 0 ? 'disabled' : ''}>${product.stock > 0 ? 'Agregar al carrito' : 'Agotado'}</button></div>`;
    if (typeof dialog.showModal === 'function') dialog.showModal();
  }

  // Menú compacto para pantallas pequeñas.
  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.main-nav');
  if (menuButton && nav) {
    menuButton.addEventListener('click', () => {
      const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
      menuButton.setAttribute('aria-expanded', String(!isOpen));
      nav.classList.toggle('nav-open', !isOpen);
    });
  }

  // Los accesos que todavía no forman parte del prototipo muestran un aviso.
  document.querySelectorAll('[data-account], [data-demo-link]').forEach(element => {
    element.addEventListener('click', event => {
      event.preventDefault();
      showToast('Esta opción estará disponible en una versión posterior.');
    });
  });

  document.addEventListener('click', event => {
    const addButton = event.target.closest('[data-add]');
    if (addButton) {
      addToCart(addButton.dataset.add);
      if (document.body.dataset.page === 'carrito') renderCart();
      return;
    }
    const quickView = event.target.closest('[data-quick-view]');
    if (quickView) openProductDialog(quickView.dataset.quickView);
  });

  const dialog = document.getElementById('product-dialog');
  if (dialog) {
    dialog.querySelector('.dialog-close')?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  }

  function initHome() {
    renderCards(document.getElementById('featured-products'), products.filter(product => ['p01', 'p03', 'p04', 'p07'].includes(product.id)));
    renderCards(document.getElementById('popular-products'), products.filter(product => ['p05', 'p06', 'p08', 'p10'].includes(product.id)));
  }

  function initCatalog() {
    const grid = document.getElementById('catalog-products');
    if (!grid) return;
    const searchInput = document.getElementById('catalog-search');
    const categoryContainer = document.getElementById('category-filters');
    const tagContainer = document.getElementById('tag-filters');
    const count = document.getElementById('product-count');
    const empty = document.getElementById('catalog-empty');
    const params = new URLSearchParams(window.location.search);
    const state = {
      search: params.get('q') || '',
      category: params.get('categoria') || 'Todos',
      tag: params.get('etiqueta') || 'Todos'
    };
    if (searchInput) searchInput.value = state.search;

    function makeFilterButtons(container, values, selected, type) {
      container.innerHTML = values.map(value => `<button type="button" class="filter-chip ${value === selected ? 'selected' : ''}" data-filter-type="${type}" data-filter-value="${value}">${value === 'Todos' ? 'Todos' : value}</button>`).join('');
    }

    function paintFilters() {
      makeFilterButtons(categoryContainer, ['Todos', ...window.STORE_CATEGORIES], state.category, 'category');
      makeFilterButtons(tagContainer, ['Todos', ...window.STORE_TAGS], state.tag, 'tag');
    }

    function renderCatalog() {
      const query = state.search.trim().toLocaleLowerCase('es');
      const filtered = products.filter(product => {
        const matchesCategory = state.category === 'Todos' || product.category === state.category;
        const matchesTag = state.tag === 'Todos' || product.tag.includes(state.tag);
        const searchText = `${product.name} ${product.category} ${product.description} ${product.tag.join(' ')}`.toLocaleLowerCase('es');
        return matchesCategory && matchesTag && (!query || searchText.includes(query));
      });
      // Los productos agotados siempre aparecen al final de los resultados.
      filtered.sort((a, b) => Number(a.stock <= 0) - Number(b.stock <= 0));
      renderCards(grid, filtered);
      count.textContent = `${filtered.length} ${filtered.length === 1 ? 'producto encontrado' : 'productos encontrados'}`;
      empty.hidden = filtered.length !== 0;
      grid.hidden = filtered.length === 0;
    }

    categoryContainer.addEventListener('click', event => {
      const button = event.target.closest('[data-filter-type="category"]');
      if (!button) return;
      state.category = button.dataset.filterValue;
      paintFilters(); renderCatalog();
    });
    tagContainer.addEventListener('click', event => {
      const button = event.target.closest('[data-filter-type="tag"]');
      if (!button) return;
      state.tag = button.dataset.filterValue;
      paintFilters(); renderCatalog();
    });
    searchInput.addEventListener('input', () => { state.search = searchInput.value; renderCatalog(); });
    document.getElementById('clear-search').addEventListener('click', () => { state.search = ''; searchInput.value = ''; renderCatalog(); searchInput.focus(); });
    document.getElementById('reset-filters').addEventListener('click', () => { state.search = ''; state.category = 'Todos'; state.tag = 'Todos'; searchInput.value = ''; paintFilters(); renderCatalog(); });
    paintFilters(); renderCatalog();
  }

  function renderCart() {
    const container = document.getElementById('cart-content');
    const empty = document.getElementById('cart-empty');
    if (!container || !empty) return;
    const cart = readCart();
    if (cart.length === 0) {
      container.innerHTML = '';
      container.hidden = true;
      empty.hidden = false;
      updateCartCount();
      return;
    }
    container.hidden = false;
    empty.hidden = true;
    const subtotal = cart.reduce((sum, item) => sum + byId(item.id).price * item.quantity, 0);
    container.innerHTML = `
      <div class="cart-items"><div class="cart-table-heading"><span>Producto</span><span>Precio</span><span>Cantidad</span><span>Total</span></div>
      ${cart.map(item => {
        const product = byId(item.id);
        return `<article class="cart-item"><div class="cart-product"><img src="assets/productos/${product.image}" alt=""><div><strong>${product.name}</strong><span>${product.category}</span><button type="button" class="remove-button" data-cart-action="remove" data-id="${product.id}">Eliminar</button></div></div><span class="cart-price">${money(product.price)}</span><div class="quantity-control"><button type="button" data-cart-action="decrease" data-id="${product.id}" aria-label="Disminuir cantidad">−</button><span>${item.quantity}</span><button type="button" data-cart-action="increase" data-id="${product.id}" aria-label="Aumentar cantidad" ${item.quantity >= product.stock ? 'disabled' : ''}>＋</button></div><strong class="cart-line-total">${money(product.price * item.quantity)}</strong></article>`;
      }).join('')}</div>
      <aside class="cart-summary"><span class="eyebrow">RESUMEN</span><h2>Tu selección</h2><div class="summary-row"><span>Subtotal</span><strong>${money(subtotal)}</strong></div><div class="summary-row"><span>Envío</span><span>Por definir</span></div><div class="summary-total"><span>Total estimado</span><strong>${money(subtotal)}</strong></div><button type="button" class="button button-primary checkout-demo">Continuar <span>↗</span></button><a href="productos.html" class="continue-link">Seguir explorando</a><p>Demostración visual: no se procesan pagos.</p></aside>`;
    updateCartCount();
  }

  document.addEventListener('click', event => {
    const action = event.target.closest('[data-cart-action]');
    if (action) {
      const cart = readCart();
      const item = cart.find(entry => entry.id === action.dataset.id);
      if (!item) return;
      if (action.dataset.cartAction === 'remove') {
        saveCart(cart.filter(entry => entry.id !== item.id));
        showToast('Producto eliminado del carrito.');
      } else if (action.dataset.cartAction === 'increase') {
        const product = byId(item.id);
        item.quantity = Math.min(item.quantity + 1, product.stock);
        saveCart(cart);
      } else if (action.dataset.cartAction === 'decrease') {
        item.quantity -= 1;
        saveCart(cart.filter(entry => entry.quantity > 0));
      }
      renderCart();
    }
    if (event.target.closest('.checkout-demo')) showToast('El proceso de compra no está habilitado en este borrador.');
  });

  updateCartCount();
  const page = document.body.dataset.page;
  if (page === 'inicio') initHome();
  if (page === 'productos') initCatalog();
  if (page === 'carrito') renderCart();
})();
