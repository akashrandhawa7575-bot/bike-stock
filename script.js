(function () {
  const state = { bikes: [], config: {}, filters: { brand: '', minYear: '', maxPrice: '', sort: 'newest' } };

  const grid = document.getElementById('bike-grid');
  const resultCount = document.getElementById('result-count');

  function money(n) {
    return '₹' + Number(n).toLocaleString('en-IN');
  }

  function whatsappLink(number, text) {
    const clean = (number || '').replace(/[^0-9]/g, '');
    return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
  }

  async function loadData() {
    const [bikesRes, configRes] = await Promise.all([
      fetch('data/bikes.json', { cache: 'no-store' }),
      fetch('data/config.json', { cache: 'no-store' })
    ]);
    state.bikes = await bikesRes.json();
    state.config = await configRes.json();
    applyConfigToPage();
    populateFilterOptions();
    render();
  }

  function applyConfigToPage() {
    const c = state.config;
    document.title = c.businessName || 'Bike Stock';
    document.getElementById('brand-name').innerHTML = `<span class="dot">●</span> ${c.businessName || 'Bike Stock'}`;
    document.getElementById('hero-lead').textContent = c.tagline ? c.tagline + ' — ' + (c.aboutText || '') : (c.aboutText || '');
    document.getElementById('about-text').textContent = c.aboutText || '';
    document.getElementById('about-hours-text').textContent = c.hours ? `Open: ${c.hours}` : '';
    document.getElementById('info-city').textContent = c.city || '—';
    document.getElementById('info-address').textContent = c.address || '—';
    document.getElementById('info-phone').textContent = c.phone || '—';
    document.getElementById('info-hours').textContent = c.hours || '—';
    document.getElementById('footer-year').textContent = new Date().getFullYear();
    document.getElementById('footer-text').innerHTML =
      `© ${new Date().getFullYear()} ${c.businessName || 'Bike Stock'} — All bikes subject to availability.`;

    const waLink = whatsappLink(c.whatsapp, `Hi, I'd like to know more about your bike stock.`);
    document.getElementById('header-whatsapp').href = waLink;
  }

  function populateFilterOptions() {
    const brandSel = document.getElementById('f-brand');
    const yearSel = document.getElementById('f-year');
    const brands = [...new Set(state.bikes.map(b => b.brand))].sort();
    const years = [...new Set(state.bikes.map(b => b.year))].sort((a, b) => a - b);

    brands.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b; opt.textContent = b;
      brandSel.appendChild(opt);
    });
    years.forEach(y => {
      const opt = document.createElement('option');
      opt.value = y; opt.textContent = y + '+';
      yearSel.appendChild(opt);
    });

    brandSel.addEventListener('change', e => { state.filters.brand = e.target.value; render(); });
    yearSel.addEventListener('change', e => { state.filters.minYear = e.target.value; render(); });
    document.getElementById('f-price').addEventListener('input', e => { state.filters.maxPrice = e.target.value; render(); });
    document.getElementById('f-sort').addEventListener('change', e => { state.filters.sort = e.target.value; render(); });
    document.getElementById('reset-filters').addEventListener('click', () => {
      state.filters = { brand: '', minYear: '', maxPrice: '', sort: 'newest' };
      brandSel.value = ''; yearSel.value = ''; document.getElementById('f-price').value = '';
      document.getElementById('f-sort').value = 'newest';
      render();
    });
  }

  function getFiltered() {
    let list = state.bikes.filter(b => {
      if (state.filters.brand && b.brand !== state.filters.brand) return false;
      if (state.filters.minYear && b.year < Number(state.filters.minYear)) return false;
      if (state.filters.maxPrice && b.price > Number(state.filters.maxPrice)) return false;
      return true;
    });

    switch (state.filters.sort) {
      case 'price-asc': list.sort((a, b) => a.price - b.price); break;
      case 'price-desc': list.sort((a, b) => b.price - a.price); break;
      case 'km-asc': list.sort((a, b) => a.km - b.km); break;
      default: list.sort((a, b) => (b.id > a.id ? 1 : -1));
    }
    return list;
  }

  function render() {
    const list = getFiltered();
    resultCount.textContent = `${list.length} bike${list.length !== 1 ? 's' : ''} found`;
    grid.innerHTML = '';

    if (!list.length) {
      grid.innerHTML = `<div class="empty-state">No bikes match those filters right now. Try widening your search.</div>`;
      return;
    }

    list.forEach(bike => grid.appendChild(renderCard(bike)));
  }

  function renderCard(bike) {
    const card = document.createElement('article');
    card.className = 'tag-card';
    card.innerHTML = `
      <div class="tag-punch"></div>
      <div class="tag-stock">#${bike.id}</div>
      <div class="tag-photo">
        <img src="${bike.image}" alt="${bike.brand} ${bike.model}" loading="lazy" />
        ${bike.status === 'sold' ? '<div class="tag-sold-stamp"><span>Sold</span></div>' : ''}
      </div>
      <div class="tag-body">
        <h3 class="tag-model">${bike.model}</h3>
        <p class="tag-brand">${bike.brand} · ${bike.year}</p>
        <div class="tag-specs">
          <span><b>${Number(bike.km).toLocaleString('en-IN')}</b> km</span>
          <span><b>${bike.condition}</b></span>
          <span><b>${bike.ownership}</b></span>
        </div>
        <div class="tag-footer">
          <div class="tag-price"><small>Price</small>${money(bike.price)}</div>
          <span class="tag-arrow">Details →</span>
        </div>
      </div>
    `;
    card.addEventListener('click', () => openModal(bike));
    return card;
  }

  function openModal(bike) {
    document.getElementById('modal-img').src = bike.image;
    document.getElementById('modal-img').alt = `${bike.brand} ${bike.model}`;
    document.getElementById('modal-model').textContent = bike.model;
    document.getElementById('modal-brand').textContent = `${bike.brand} · ${bike.year}`;
    document.getElementById('modal-desc').textContent = bike.description || '';
    document.getElementById('modal-price').textContent = money(bike.price) + (bike.status === 'sold' ? ' (Sold)' : '');

    const specs = [
      ['KM Run', Number(bike.km).toLocaleString('en-IN')],
      ['Condition', bike.condition],
      ['Ownership', bike.ownership],
      ['Fuel', bike.fuel || '—'],
      ['Color', bike.color || '—'],
      ['Documents', bike.docs || '—'],
    ];
    document.getElementById('modal-specs').innerHTML = specs
      .map(([k, v]) => `<div class="k">${k}</div><div class="v">${v}</div>`)
      .join('');

    const waText = `Hi, I'm interested in the ${bike.year} ${bike.brand} ${bike.model} (${money(bike.price)}) listed on your site.`;
    document.getElementById('modal-whatsapp').href = whatsappLink(state.config.whatsapp, waText);

    document.getElementById('modal-overlay').classList.add('open');
  }

  document.getElementById('modal-close').addEventListener('click', () => {
    document.getElementById('modal-overlay').classList.remove('open');
  });
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') e.currentTarget.classList.remove('open');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') document.getElementById('modal-overlay').classList.remove('open');
  });

  loadData().catch(err => {
    grid.innerHTML = `<div class="empty-state">Couldn't load stock data. Make sure data/bikes.json and data/config.json exist.</div>`;
    console.error(err);
  });
})();
