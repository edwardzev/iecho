// Gallery Loading Script
let allInstallations = [];
let filteredInstallations = [];
let visibleCount = 0;
const batchSize = 10;
let isLoading = false;
let isFiltered = false;

async function loadInstallations() {
  try {
    const response = await fetch('/installations.json');
    if (!response.ok) throw new Error('Network response was not ok');
    allInstallations = await response.json();
    renderInstallations();
    setupScrollListener();
  } catch (error) {
    console.error('Failed to load installations:', error);
  }
}

function renderInstallations() {
  const container = document.getElementById('all-installations-container');
  if (!container) return;

  const currentInstallations = isFiltered ? filteredInstallations : allInstallations;
  const endIndex = Math.min(visibleCount + batchSize, currentInstallations.length);
  const fragment = document.createDocumentFragment();

  for (let i = visibleCount; i < endIndex; i++) {
    const item = currentInstallations[i];
    const div = document.createElement('div');
    div.className = 'slick-install-item';

    div.innerHTML = `
      <a href="${item.link}" target="_blank" rel="noopener noreferrer">
        <p class="s-dscr">${item.city} 
        <span class="s-model">${item.model}</span>
        <span class="s-story">${item.field}</span></p>
        <img class="img-fluid lazy" data-src="${item.image}" loading="lazy" alt="Installation image">
      </a>
    `;

    fragment.appendChild(div);
  }

  container.appendChild(fragment);
  visibleCount = endIndex;
  loadLazyImages();
  isLoading = false;
}

function setupScrollListener() {
  window.addEventListener('scroll', handleScroll);
}

function handleScroll() {
  const currentInstallations = isFiltered ? filteredInstallations : allInstallations;
  
  if (isLoading || visibleCount >= currentInstallations.length) return;

  const contactsElement = document.getElementById('contacts');
  const galleryContainer = document.getElementById('all-installations-container');
  
  // Fallback to default behavior if contacts element doesn't exist
  if (!contactsElement || !galleryContainer) {
    const scrollPosition = window.innerHeight + window.scrollY;
    const pageHeight = document.body.offsetHeight;
    if (scrollPosition > pageHeight - 500) {
      isLoading = true;
      renderInstallations();
    }
    return;
  }

 // Calculate positions
  const contactsRect = contactsElement.getBoundingClientRect();
  const lastItem = galleryContainer.lastElementChild;
  
  // If we have items and contacts is visible
  if (lastItem && contactsRect.top < window.innerHeight) {
    const lastItemRect = lastItem.getBoundingClientRect();
    
    // Load more if last item is above contacts
    if (lastItemRect.bottom < contactsRect.top) {
      isLoading = true;
      renderInstallations();
    }
  }
}

function loadLazyImages() {
  const lazyImages = document.querySelectorAll('.lazy');

  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.classList.remove('lazy');
          observer.unobserve(img);
        }
      });
    });

    lazyImages.forEach(img => imageObserver.observe(img));
  } else {
    lazyImages.forEach(img => {
      img.src = img.dataset.src;
      img.classList.remove('lazy');
    });
  }
}
