class Gallery {
  constructor() {
    this.BATCH_SIZE = this.getBatchSizeByWidth();
    this.visibleCount = 0;
    this.allData = [];
    this.indexes = {};
    this.currentFilter = { type: null, value: null };
    this.cachedFilteredIndexes = null;
    this.spheresMap = new Map();

    this.IMAGE_BASE_PATH = 'img/installations/COMPLEXES/';
    this.IMAGE_EXTENSION = '.jpg';
    this.UTM_PARAM = 'utm_content=perehod_s_saita_iecho.ru';

    this.galleryContainer = document.getElementById('all-installations-container');
    this.cityFilterButton = document.getElementById('city-filter');
    this.sphereFilterButton = document.getElementById('sphere-filter');

    this.loader = null;
    this.scrollTimeout = null;
    this.imageObserver = null;

    this.init();
  }

  /* ================= INIT ================= */

  getBatchSizeByWidth() {
    const w = window.innerWidth;
    if (w < 768) return 3;
    if (w < 1200) return 5;
    return 9;
  }

  async init() {
    this.showLoader();

    window.addEventListener('resize', () => {
      this.BATCH_SIZE = this.getBatchSizeByWidth();
    });

    try {
      const jsonData = await this.loadData('/installations-optimized.json');
      this.allData = jsonData.data;
      this.indexes = jsonData.indexes;

      const spheresList = await this.loadData('/spheres-list.json');
      this.processSpheres(spheresList);

      this.initImageObserver();
      this.renderBatch();

      this.cityFilterButton.addEventListener('click', e => {
        e.stopPropagation();
        this.showFilterPopup('cities');
      });

      this.sphereFilterButton.addEventListener('click', e => {
        e.stopPropagation();
        this.showFilterPopup('spheres');
      });

      window.addEventListener('scroll', () => this.handleScrollDebounced());
    } catch (e) {
      console.error('Gallery init failed', e);
      this.showError();
    } finally {
      this.hideLoader();
    }
  }

  async loadData(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(r.status);
    return r.json();
  }

  /* ================= SCROLL ================= */

  handleScrollDebounced() {
    if (this.scrollTimeout) return;
    this.scrollTimeout = setTimeout(() => {
      if (this.shouldLoadMore()) this.renderBatch();
      this.scrollTimeout = null;
    }, 100);
  }

  shouldLoadMore() {
    const threshold = window.innerWidth < 1200 ? 1000 : 500;
    return window.innerHeight + window.scrollY >= document.body.offsetHeight - threshold;
  }

  /* ================= RENDER ================= */

  renderBatch() {
    const filtered = this.getFilteredIndexes();
    if (this.visibleCount >= filtered.length) return;

    const end = Math.min(this.visibleCount + this.BATCH_SIZE, filtered.length);
    const fragment = document.createDocumentFragment();

    for (let i = this.visibleCount; i < end; i++) {
      fragment.appendChild(this.createGalleryItem(this.allData[filtered[i]]));
    }

    requestAnimationFrame(() => {
  this.galleryContainer.appendChild(fragment);
  this.visibleCount = end;

  requestAnimationFrame(() => {
    this.observeLazyImages();
  });
});
  }

  createGalleryItem(item) {
    const div = document.createElement('div');
    div.className = 'slick-install-item';

    div.innerHTML = `
      <a href="${this.processUrl(item.l)}" target="_blank" rel="noopener noreferrer">
        <p class="s-dscr">
          ${item.c}
          <span class="s-model">${item.m}</span>
          <span class="s-story">${item.f}</span>
        </p>
        <img
          class="img-fluid lazy"
          data-src="${this.getFullImagePath(item.i)}"
          loading="lazy"
          alt="${item.m} – ${item.c}">
      </a>
    `;
    return div;
  }

  /* ================= LAZY IMAGES ================= */

  initImageObserver() {
    if (!('IntersectionObserver' in window)) return;

    this.imageObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const img = entry.target;
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        img.classList.remove('lazy');
        this.imageObserver.unobserve(img);
      });
    }, { rootMargin: '300px' });
  }

  observeLazyImages() {
    if (!this.imageObserver) return;
    this.galleryContainer
      .querySelectorAll('img.lazy[data-src]')
      .forEach(img => this.imageObserver.observe(img));
  }

  /* ================= FILTERS ================= */

  applyFilter(type, value) {
    this.currentFilter = { type, value };
    this.visibleCount = 0;
    this.cachedFilteredIndexes = null;
    this.galleryContainer.innerHTML = '';

    if (window.innerWidth < 1200) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      setTimeout(() => this.renderBatch(), 50);
    } else {
      this.renderBatch();
    }
  }

  getFilteredIndexes() {
    if (this.cachedFilteredIndexes) return this.cachedFilteredIndexes;

    let result;
    if (!this.currentFilter.type) {
      result = Array.from({ length: this.allData.length }, (_, i) => i);
    } else if (this.currentFilter.type === 'cities') {
      result = this.indexes.cities?.[this.currentFilter.value] || [];
    } else {
      result = this.indexes.spheres?.[this.currentFilter.value] || [];
    }

    this.cachedFilteredIndexes = result;
    return result;
  }

  processSpheres(list) {
    list.forEach(s =>
      this.spheresMap.set(s.order, { master: s.master, slave: s.slave })
    );
  }

  /* ================= POPUPS ================= */

  showFilterPopup(type) {
    if (!this.popupOverlay) this.createPopupContainer();
    this.renderPopupOptions(type);
    this.popupOverlay.style.display = 'flex';
    this.popup.scrollTop = 0;
  }

  createPopupContainer() {
    this.popupOverlay = document.createElement('div');
    this.popupOverlay.className = 'city-popup-overlay';
    this.popupOverlay.style.display = 'none';

    this.popup = document.createElement('div');
    this.popup.className = 'city-popup';
    this.popup.style.overflowY = 'auto';
    this.popup.style.webkitOverflowScrolling = 'touch';

    this.popupOverlay.appendChild(this.popup);
    document.body.appendChild(this.popupOverlay);

    this.popupOverlay.addEventListener('click', e => {
      if (e.target === this.popupOverlay) this.closePopup();
    });
  }

  renderPopupOptions(filterType) {
    this.popup.innerHTML = '';

    const closeButton = document.createElement('button');
    closeButton.className = 'city-popup-close';
    closeButton.innerHTML = '&times;';
    closeButton.onclick = () => this.closePopup();
    this.popup.appendChild(closeButton);

    const title = document.createElement('h3');
    title.className = 'city-popup-title';
    title.textContent =
      filterType === 'cities' ? 'בחר עיר' : 'בחר אזור';
    this.popup.appendChild(title);

    const allOption = document.createElement('div');
    allOption.className = 'city-option all-cities';
    allOption.textContent =
      filterType === 'cities' ? 'כל הערים' : 'כל התחומים';
    allOption.onclick = () => {
      this.applyFilter(null, null);
      this.closePopup();
    };
    this.popup.appendChild(allOption);

    const optionsContainer = document.createElement('div');
    optionsContainer.className = 'city-options-container';

    if (filterType === 'cities') {
      Object.keys(this.indexes.cities || {}).sort().forEach(city => {
        const el = document.createElement('div');
        el.className = 'city-option';
        el.textContent = city;
        el.onclick = () => {
          this.applyFilter('cities', city);
          this.closePopup();
        };
        optionsContainer.appendChild(el);
      });
    } else {
      [...this.spheresMap.entries()]
        .sort((a, b) => +a[0] - +b[0])
        .forEach(([id, s]) => {
          const el = document.createElement('div');
          el.className = 'city-option city-option-big';
          el.dataset.sphereId = id;
          el.innerHTML = `<p>${s.master}</p><span>${s.slave}</span>`;
          el.onclick = () => {
            this.applyFilter('spheres', id);
            this.closePopup();
          };
          optionsContainer.appendChild(el);
        });
    }

    this.popup.appendChild(optionsContainer);
  }

  closePopup() {
    if (this.popupOverlay) this.popupOverlay.style.display = 'none';
  }

  /* ================= HELPERS ================= */

  getFullImagePath(filename) {
    if (!filename) return '';
    const base = filename.replace(/^.*[\\/]/, '').replace(/\.(jpg|jpeg|png|webp)$/i, '');
    return `${this.IMAGE_BASE_PATH}${encodeURI(base)}${this.IMAGE_EXTENSION}`;
  }

  processUrl(url) {
    if (!url || url.includes('utm_content=')) return url;
    return url + (url.includes('?') ? '&' : '?') + this.UTM_PARAM;
  }

  /* ================= UI ================= */

  showLoader() {
    if (!this.loader) {
      this.loader = document.createElement('div');
      this.loader.className = 'gallery-loader';
      this.loader.innerHTML = `<div class="spinner"></div><p>Загрузка…</p>`;
      document.body.appendChild(this.loader);
    }
    this.loader.style.display = 'flex';
  }

  hideLoader() {
    if (!this.loader) return;
    this.loader.style.opacity = '0';
    setTimeout(() => (this.loader.style.display = 'none'), 300);
  }

  showError() {
    this.galleryContainer.innerHTML = `
      <div class="error-message">
        שגיאת טעינה. <button onclick="location.reload()">Обновить</button>
      </div>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new Gallery();
});
