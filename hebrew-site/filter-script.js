function scrollToTopWhenReady() {
  const firstImage = document.querySelector('#all-installations-container img');

  if (firstImage) {
    const onImageLoad = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    firstImage.addEventListener('load', onImageLoad, { once: true });

    // If image already loaded (cached), scroll immediately
    if (firstImage.complete) {
      onImageLoad();
    }
  } else {
    // No images? Scroll anyway
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}


// City Filter Script
class CityFilter {
  constructor() {
    this.filterButton = document.getElementById('city-filter');
    this.installationsContainer = document.getElementById('all-installations-container');
    
    if (this.filterButton && this.installationsContainer) {
      this.init();
    }
  }
  
  async init() {
    this.setupFilterButton();
  }
  
  setupFilterButton() {
    this.filterButton.textContent = 'ערים';
    this.filterButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showCityPopup();
    });
    
    this.popupOverlay = document.createElement('div');
    this.popupOverlay.className = 'city-popup-overlay';
    this.popupOverlay.style.display = 'none';
    
    this.popup = document.createElement('div');
    this.popup.className = 'city-popup';
    
    this.closeButton = document.createElement('button');
    this.closeButton.className = 'city-popup-close';
    this.closeButton.innerHTML = '&times;';
    this.closeButton.addEventListener('click', () => {
      this.popupOverlay.style.display = 'none';
    });
    this.popup.appendChild(this.closeButton);
    
    this.popupOverlay.appendChild(this.popup);
    document.body.appendChild(this.popupOverlay);
    
    this.popupOverlay.addEventListener('click', (e) => {
      if (e.target === this.popupOverlay) {
        this.popupOverlay.style.display = 'none';
      }
    });
  }
  
  showCityPopup() {
    const cities = [...new Set(allInstallations.map(item => item.city))].sort();
    
    while (this.popup.childNodes.length > 1) {
      this.popup.removeChild(this.popup.lastChild);
    }
    
    const title = document.createElement('h3');
    title.className = 'city-popup-title';
    title.textContent = 'בחר עיר';
    this.popup.appendChild(title);
    
    const allOption = document.createElement('div');
    allOption.className = 'city-option all-cities';
    allOption.textContent = 'כל הערים';
    allOption.addEventListener('click', () => {
      this.filterByCity(null);
      this.popupOverlay.style.display = 'none';
    });
    this.popup.appendChild(allOption);
    
    const citiesContainer = document.createElement('div');
    citiesContainer.className = 'city-options-container';
    
    cities.forEach(city => {
      const option = document.createElement('div');
      option.className = 'city-option';
      option.textContent = city;
      option.addEventListener('click', () => {
        this.filterByCity(city);
        this.popupOverlay.style.display = 'none';
      });
      citiesContainer.appendChild(option);
    });
    
    this.popup.appendChild(citiesContainer);
    this.popupOverlay.style.display = 'flex';
  }
  
filterByCity(city) {
  const container = document.getElementById('all-installations-container');
  container.innerHTML = '';
  visibleCount = 0;

  if (city) {
    filteredInstallations = allInstallations.filter(item => item.city === city);
    isFiltered = true;
  } else {
    isFiltered = false;
  }

  renderInstallations();

  if (window.innerWidth < 1200) {
    setTimeout(scrollToTopWhenReady, 100);
  }
}

}

// Initialize everything
document.addEventListener('DOMContentLoaded', () => {
  loadInstallations();
  new CityFilter();
});

