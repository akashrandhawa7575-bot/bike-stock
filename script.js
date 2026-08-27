(function () {
  const state = {
    bikes: [],
    config: {},
    filters: { brand: '', minYear: '', maxPrice: '', sort: 'newest', category: '' },
    gallery: { images: [], current: 0 },
    hero: { current: 0, timer: null }
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
    if (!bikesRes.ok || !configRes.ok) throw new Error('Failed to fetch data files');
    state.bikes = await bikesRes.json();
    state.config = await configRes.json();
    applyConfigToPage();
    buildHeroSlides();
    populateFilterOptions();
    render();
  }

  // ── Apply config.json values to the page ─────────────────────────
  function applyConfigToPage() {
    const c = state.config;
    document.title = (c.businessName || 'Akash Motors') + ' — Quality Used Bikes';

    if (c.businessName) {
      const [first, ...rest] = c.businessName.split(' ');
      const restText = rest.join(' ');
      document.querySelectorAll('.logo-text').forEach(el => {
        el.innerHTML = restText ? `${first} <em>${restText}</em>` : first;
      });
    }

    setText('hero-tag', c.tagline);
    setText('hero-sub', c.heroSubtext);
    setText('about-heading', c.businessName);
    setText('about-body', c.aboutText);
    setText('about-hours-text', c.hours ? `Open: ${c.hours}` : '');
    setText('info-city', c.city);
    setText('info-address', c.address);
    setText('info-phone', c.phone);
    setText('info-hours', c.hours);

    const year = new Date().getFullYear();
    setText('footer-year', year);
    const footerText = document.getElementById('footer-text');
    if (footerText) {
      footerText.innerHTML = `© <span id="footer-year">${year}</span> ${c.businessName || 'Akash Motors'} — All bikes subject to availability.`;
    }

    // Phone
    const navPhone = document.getElementById('nav-phone');
    const navPhoneNum = document.getElementById('nav-phone-num');
    if (c.phone) {
      if (navPhoneNum) navPhoneNum.textContent = c.phone;
      if (navPhone) navPhone.href = `tel:${c.phone.replace(/[^0-9+]/g, '')}`;
    }

    // WhatsApp links across the page
    const genericText = `Hi, I'd like to know more about your bike stock.`;
    const sellText = `Hi, I'd like to sell my bike. Can you give me a quote?`;
    const waGeneric = whatsappLink(c.whatsapp, genericText);
    const waSell = whatsappLink(c.whatsapp, sellText);

    setHref('header-whatsapp', waGeneric);
    setHref('mobile-wa', waGeneric);
    setHref('wa-float', waGeneric);
    setHref('hero-sell', waSell);
    setHref('sell-cta-wa', waSell);
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el && value !== undefined && value !== null) el.textContent = value;
  }
  function setHref(id, value) {
    const el = document.getElementById(id);
    if (el) el.href = value;
  }

  // ── Hero slideshow ────────────────────────────────────────────────
  function buildHeroSlides() {
    const images = state.config.heroImages || [];
    const slidesEl = document.getElementById('hero-slides');
    const dotsEl = document.getElementById('hero-dots');
    if (!slidesEl || !dotsEl) return;
    slidesEl.innerHTML = '';
    dotsEl.innerHTML = '';

    if (!images.length) return;

    images.forEach((src, i) => {
      const div = document.createElement('div');
      div.className = 'hero-slide' + (i === 0 ? ' active' : '');
      div.style.backgroundImage = `url('${src}')`;
      slidesEl.appendChild(div);

      const dot = document.createElement('button');
      dot.className = 'hero-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', `Slide ${i + 1}`);
      dot.addEventListener('click', () => goToHeroSlide(i));
      dotsEl.appendChild(dot);
    });

    if (images.length > 1) {
      state.hero.timer = setInterval(() => {
        goToHeroSlide((state.hero.current + 1) % images.length);
      }, 5000);
    }
  }

  function goToHeroSlide(index) {
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.hero-dot');
    if (!slides.length) return;
    slides.forEach((s, i) => s.classList.toggle('active', i === index));
    dots.forEach((d, i) => d.classList.toggle('active', i === index));
    state.hero.current = index;
  }

  // ── Category filter buttons ──────────────────────────────────────
  function initCategoryButtons() {
    document.querySelectorAll('.cat-card').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.cat-card').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.filters.category = btn.dataset.cat || '';
        render();
        document.getElementById('stock').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  // ── Mobile menu ───────────────────────────────────────────────────
  function initMobileMenu() {
    const hamburger = document.getElementById('hamburger');
    const menu = document.getElementById('mobile-menu');
    if (!hamburger || !menu) return;
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      menu.classList.toggle('open');
    });
    menu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        hamburger.classList.remove('open');
        menu.classList.remove('open');
      });
    });
  }

  // ── Filter dock (brand / year / price / sort) ────────────────────
  function populateFilterOptions() {
    const brandSel = document.getElementById('f-brand');
    const yearSel = document.getElementById('f-year');
    const brands = [...new Set(state.bikes.map(b => b.brand))].sort();
    const years = [...new Set(state.bikes.map(b => b.year))].sort((a, b) => b - a);

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
      state.filters = { brand: '', minYear: '', maxPrice: '', sort: 'newest', category: state.filters.category };
      brandSel.value = ''; yearSel.value = ''; document.getElementById('f-price').value = '';
      document.getElementById('f-sort').value = 'newest';
      render();
    });
  }

  function getFiltered() {
    let list = state.bikes.filter(b => {
      if (state.filters.category && b.category !== state.filters.category) return false;
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
    const images = bike.images && bike.images.length ? bike.images : (bike.image ? [bike.image] : []);
    const card = document.createElement('article');
    card.className = 'bike-card';
    
    // Track the current image index for this specific card
    let currentImgIndex = 0;

    card.innerHTML = `
      <div class="bike-punch"></div>
      <div class="bike-stock">#${bike.id}</div>
      <div class="bike-photo" style="position: relative;">
        <!-- Add Previous Arrow if multiple images -->
        ${images.length > 1 ? `<button class="card-nav card-prev" aria-label="Previous" style="position:absolute; left:5px; top:50%; transform:translateY(-50%); z-index:2; background:rgba(0,0,0,0.5); color:white; border:none; border-radius:50%; width:30px; height:30px; cursor:pointer;">‹</button>` : ''}
        
        <img class="card-img" src="${images[0] || ''}" alt="${bike.brand} ${bike.model}" loading="lazy" style="display:block; width:100%;" />
        
        <!-- Add Next Arrow if multiple images -->
        ${images.length > 1 ? `<button class="card-nav card-next" aria-label="Next" style="position:absolute; right:5px; top:50%; transform:translateY(-50%); z-index:2; background:rgba(0,0,0,0.5); color:white; border:none; border-radius:50%; width:30px; height:30px; cursor:pointer;">›</button>` : ''}
        
        ${bike.status === 'sold' ? '<div class="bike-sold-stamp"><span>Sold</span></div>' : ''}
        ${images.length > 1 ? `<span class="bike-photo-count" style="position:absolute; bottom:10px; right:10px; background:rgba(0,0,0,0.7); color:white; padding:2px 6px; border-radius:4px; font-size:12px;">1 / ${images.length}</span>` : ''}
      </div>
      <div class="bike-body">
        <h3 class="bike-model">${bike.model}</h3>
        <p class="bike-brand">${bike.brand} · ${bike.year}</p>
        <div class="bike-specs">
          <span><b>${Number(bike.km).toLocaleString('en-IN')}</b> km</span>
          <span><b>${bike.condition}</b></span>
          <span><b>${bike.ownership}</b></span>
        </div>
        <div class="bike-footer">
          <div class="bike-price"><small>Price</small>${money(bike.price)}</div>
          <span class="bike-arrow">Details →</span>
        </div>
      </div>
    `;

    // 1. Handle next/prev button clicks on the card
    if (images.length > 1) {
      const prevBtn = card.querySelector('.card-prev');
      const nextBtn = card.querySelector('.card-next');
      const imgEl = card.querySelector('.card-img');
      const countEl = card.querySelector('.bike-photo-count');

      prevBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Stops the modal from opening
        currentImgIndex = (currentImgIndex - 1 + images.length) % images.length;
        imgEl.src = images[currentImgIndex];
        countEl.textContent = `${currentImgIndex + 1} / ${images.length}`;
      });

      nextBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Stops the modal from opening
        currentImgIndex = (currentImgIndex + 1) % images.length;
        imgEl.src = images[currentImgIndex];
        countEl.textContent = `${currentImgIndex + 1} / ${images.length}`;
      });
    }

    // 2. Open the modal if the user clicks anywhere else on the card (like the image or the text)
    card.addEventListener('click', () => openModal(bike));

    return card;
  }

  // ── Gallery helpers ──────────────────────────────────────────────
  function setGalleryImage(index) {
    const imgs = state.gallery.images;
    if (!imgs.length) return;
    index = (index + imgs.length) % imgs.length;
    state.gallery.current = index;

    document.getElementById('modal-img').src = imgs[index];
    document.getElementById('modal-count').textContent = imgs.length > 1 ? `${index + 1} / ${imgs.length}` : '';

    const thumbs = document.querySelectorAll('#modal-thumbs img');
    thumbs.forEach((t, i) => t.classList.toggle('active', i === index));

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
    const images = bike.images && bike.images.length ? bike.images : (bike.image ? [bike.image] : []);
    state.gallery.images = images;
    state.gallery.current = 0;

    const modalImg = document.getElementById('modal-img');
    const modalVid = document.getElementById('modal-video');

    // Check if a video exists in the JSON data for this bike
    if (bike.video) {
      modalImg.style.display = 'none';
      if (modalVid) {
        modalVid.style.display = 'block';
        modalVid.src = bike.video;
      }
    } else {
      if (modalVid) {
        modalVid.style.display = 'none';
        modalVid.pause(); // Stop video if switching to an image
      }
      modalImg.style.display = 'block';
      modalImg.src = images[0] || '';
      modalImg.alt = `${bike.brand} ${bike.model}`;
    }

    document.getElementById('modal-count').textContent = images.length > 1 ? `1 / ${images.length}` : '';

    const showArrows = images.length > 1;
    document.getElementById('modal-prev').style.display = showArrows ? '' : 'none';
    document.getElementById('modal-next').style.display = showArrows ? '' : 'none';

    buildThumbs(images);

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

  document.getElementById('modal-prev').addEventListener('click', (e) => {
    e.stopPropagation();
    setGalleryImage(state.gallery.current - 1);
  });
  document.getElementById('modal-next').addEventListener('click', (e) => {
    e.stopPropagation();
    setGalleryImage(state.gallery.current + 1);
  });
  document.getElementById('modal-img').addEventListener('click', () => {
    openLightbox(state.gallery.current);
  });
  document.getElementById('modal-expand').addEventListener('click', (e) => {
    e.stopPropagation();
    openLightbox(state.gallery.current);
  });
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
      if (lightboxOpen) document.getElementById('lightbox-overlay').classList.remove('open');
      else if (modalOpen) document.getElementById('modal-overlay').classList.remove('open');
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

  // ── Sticky navbar shadow on scroll ────────────────────────────────
  window.addEventListener('scroll', () => {
    const nav = document.getElementById('navbar');
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 10);
  });

  // ── Init ─────────────────────────────────────────────────────────
  initCategoryButtons();
  initMobileMenu();

  loadData().catch(err => {
    grid.innerHTML = `<div class="empty-state">Couldn't load stock data. Make sure data/bikes.json and data/config.json exist.</div>`;
    console.error(err);
  });
})();
