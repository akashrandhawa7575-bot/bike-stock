(function () {
  const state = {
    bikes: [],
    config: {},
    filters: { brand: '', minYear: '', maxPrice: '', sort: 'newest' },
    gallery: { images: [], current: 0 }
  };

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
    // Support both single image (bike.image) and multiple images (bike.images array)
    const images = bike.images && bike.images.length ? bike.images : (bike.image ? [bike.image] : []);
    const card = document.createElement('article');
    card.className = 'tag-card';
    card.innerHTML = `
      <div class="tag-punch"></div>
      <div class="tag-stock">#${bike.id}</div>
      <div class="tag-photo">
        <img src="${images[0] || ''}" alt="${bike.brand} ${bike.model}" loading="lazy" />
        ${bike.status === 'sold' ? '<div class="tag-sold-stamp"><span>Sold</span></div>' : ''}
        ${images.length > 1 ? `<span class="tag-photo-count">📷 ${images.length}</span>` : ''}
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

  // ── Gallery helpers ──────────────────────────────────────────────
  function setGalleryImage(index) {
    const imgs = state.gallery.images;
    if (!imgs.length) return;
    index = (index + imgs.length) % imgs.length; // wrap around
    state.gallery.current = index;

    document.getElementById('modal-img').src = imgs[index];
    document.getElementById('modal-count').textContent = imgs.length > 1 ? `${index + 1} / ${imgs.length}` : '';

    // Update thumbnails active state
    const thumbs = document.querySelectorAll('#modal-thumbs img');
    thumbs.forEach((t, i) => t.classList.toggle('active', i === index));

    // Show/hide arrows
    const showArrows = imgs.length > 1;
    document.getElementById('modal-prev').style.display = showArrows ? '' : 'none';
    document.getElementById('modal-next').style.display = showArrows ? '' : 'none';
  }

  function buildThumbs(images) {
    const thumbsEl = document.getElementById('modal-thumbs');
    thumbsEl.innerHTML = '';
    if (images.length <= 1) return;

    images.forEach((src, i) => {
      const img = document.createElement('img');
      img.src = src;
      img.alt = `Photo ${i + 1}`;
      if (i === 0) img.classList.add('active');
      img.addEventListener('click', () => setGalleryImage(i));
      thumbsEl.appendChild(img);
    });
  }

  // ── Modal open ───────────────────────────────────────────────────
  function openModal(bike) {
    // Build images array — support bike.images[] or fallback to bike.image
    const images = bike.images && bike.images.length ? bike.images : (bike.image ? [bike.image] : []);
    state.gallery.images = images;
    state.gallery.current = 0;

    // Set first image
    document.getElementById('modal-img').src = images[0] || '';
    document.getElementById('modal-img').alt = `${bike.brand} ${bike.model}`;
    document.getElementById('modal-count').textContent = images.length > 1 ? `1 / ${images.length}` : '';

    // Show/hide navigation arrows
    const showArrows = images.length > 1;
    document.getElementById('modal-prev').style.display = showArrows ? '' : 'none';
    document.getElementById('modal-next').style.display = showArrows ? '' : 'none';

    // Build thumbnails
    buildThumbs(images);

    // Text fields
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

  // ── Modal navigation ─────────────────────────────────────────────
  document.getElementById('modal-prev').addEventListener('click', (e) => {
    e.stopPropagation();
    setGalleryImage(state.gallery.current - 1);
  });

  document.getElementById('modal-next').addEventListener('click', (e) => {
    e.stopPropagation();
    setGalleryImage(state.gallery.current + 1);
  });

  // Click image to expand to lightbox
  document.getElementById('modal-img').addEventListener('click', () => {
    openLightbox(state.gallery.current);
  });

  // Expand button also opens lightbox
  document.getElementById('modal-expand').addEventListener('click', (e) => {
    e.stopPropagation();
    openLightbox(state.gallery.current);
  });

  // ── Modal close ──────────────────────────────────────────────────
  document.getElementById('modal-close').addEventListener('click', () => {
    document.getElementById('modal-overlay').classList.remove('open');
  });
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') e.currentTarget.classList.remove('open');
  });

  // ── Lightbox ─────────────────────────────────────────────────────
  function openLightbox(index) {
    const imgs = state.gallery.images;
    if (!imgs.length) return;
    state.gallery.current = index;

    document.getElementById('lightbox-img').src = imgs[index];
    document.getElementById('lightbox-count').textContent = imgs.length > 1 ? `${index + 1} / ${imgs.length}` : '';

    const showArrows = imgs.length > 1;
    document.getElementById('lightbox-prev').style.display = showArrows ? '' : 'none';
    document.getElementById('lightbox-next').style.display = showArrows ? '' : 'none';

    document.getElementById('lightbox-overlay').classList.add('open');
  }

  function updateLightbox(index) {
    const imgs = state.gallery.images;
    index = (index + imgs.length) % imgs.length;
    state.gallery.current = index;
    document.getElementById('lightbox-img').src = imgs[index];
    document.getElementById('lightbox-count').textContent = imgs.length > 1 ? `${index + 1} / ${imgs.length}` : '';
    // Keep modal thumbnail in sync
    const thumbs = document.querySelectorAll('#modal-thumbs img');
    thumbs.forEach((t, i) => t.classList.toggle('active', i === index));
    document.getElementById('modal-img').src = imgs[index];
  }

  document.getElementById('lightbox-prev').addEventListener('click', (e) => {
    e.stopPropagation();
    updateLightbox(state.gallery.current - 1);
  });

  document.getElementById('lightbox-next').addEventListener('click', (e) => {
    e.stopPropagation();
    updateLightbox(state.gallery.current + 1);
  });

  document.getElementById('lightbox-close').addEventListener('click', () => {
    document.getElementById('lightbox-overlay').classList.remove('open');
  });

  document.getElementById('lightbox-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'lightbox-overlay') {
      document.getElementById('lightbox-overlay').classList.remove('open');
    }
  });

  // ── Keyboard navigation ──────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    const lightboxOpen = document.getElementById('lightbox-overlay').classList.contains('open');
    const modalOpen = document.getElementById('modal-overlay').classList.contains('open');

    if (e.key === 'Escape') {
      if (lightboxOpen) {
        document.getElementById('lightbox-overlay').classList.remove('open');
      } else if (modalOpen) {
        document.getElementById('modal-overlay').classList.remove('open');
      }
    }

    if (e.key === 'ArrowLeft') {
      if (lightboxOpen) updateLightbox(state.gallery.current - 1);
      else if (modalOpen) setGalleryImage(state.gallery.current - 1);
    }

    if (e.key === 'ArrowRight') {
      if (lightboxOpen) updateLightbox(state.gallery.current + 1);
      else if (modalOpen) setGalleryImage(state.gallery.current + 1);
    }
  });

  // ── Load ─────────────────────────────────────────────────────────
  loadData().catch(err => {
    grid.innerHTML = `<div class="empty-state">Couldn't load stock data. Make sure data/bikes.json and data/config.json exist.</div>`;
    console.error(err);
  });
})();
