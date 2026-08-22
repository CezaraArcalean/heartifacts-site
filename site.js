(() => {
  'use strict';

  const data = window.HeartifactsSiteData || {};
  const dictionaries = window.HeartifactsContent || {};
  const supportedLanguages = ['ro', 'en'];
  const languageStorageKey = 'heartifacts-language';

  const getNestedValue = (object, path) => path.split('.').reduce((value, key) => value && value[key], object);

  const resolveInitialLanguage = () => {
    const queryLanguage = new URLSearchParams(window.location.search).get('lang');
    if (supportedLanguages.includes(queryLanguage)) return queryLanguage;

    try {
      const storedLanguage = window.localStorage.getItem(languageStorageKey);
      if (supportedLanguages.includes(storedLanguage)) return storedLanguage;
    } catch (_) {
      // Local storage may be unavailable; language selection still works for this visit.
    }

    return navigator.language && navigator.language.toLowerCase().startsWith('ro') ? 'ro' : 'en';
  };

  const updateLanguageUrl = (language) => {
    const url = new URL(window.location.href);
    url.searchParams.set('lang', language);
    window.history.replaceState({}, '', url);
  };

  const updateQuickStatuses = (language) => {
    const dictionary = dictionaries[language] || dictionaries.en;
    const soonText = dictionary && dictionary.quick ? dictionary.quick.soon : 'Link soon';

    document.querySelectorAll('.quick-link [data-link-status]').forEach((status) => {
      const card = status.closest('.quick-link');
      status.textContent = card && card.classList.contains('is-disabled') ? soonText : '';
    });
  };

  const applyLanguage = (language, persist = false) => {
    const dictionary = dictionaries[language] || dictionaries.en;
    if (!dictionary) return;

    document.documentElement.lang = language;
    document.title = dictionary.meta.title;

    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) metaDescription.content = dictionary.meta.description;

    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogTitle) ogTitle.content = dictionary.meta.title;
    if (ogDescription) ogDescription.content = dictionary.meta.description;

    document.querySelectorAll('[data-i18n]').forEach((element) => {
      const value = getNestedValue(dictionary, element.dataset.i18n);
      if (typeof value !== 'string') return;
      element.textContent = value;
    });

    document.querySelectorAll('[data-lang]').forEach((button) => {
      const isActive = button.dataset.lang === language;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });

    renderShows(language);
    renderGallery(language);
    updateQuickStatuses(language);

    if (persist) {
      try { window.localStorage.setItem(languageStorageKey, language); } catch (_) {}
      updateLanguageUrl(language);
    }
  };

  const setLink = (element, url) => {
    if (!element) return;

    if (!url) {
      element.removeAttribute('href');

      if (element.dataset.keepEmpty === 'true') {
        element.hidden = false;
        element.classList.add('is-disabled');
        element.setAttribute('aria-disabled', 'true');
        element.removeAttribute('target');
        element.removeAttribute('rel');
      } else {
        element.hidden = true;
      }
      return;
    }

    element.hidden = false;
    element.classList.remove('is-disabled');
    element.removeAttribute('aria-disabled');
    element.href = url;
  };

  const hydrateLinks = () => {
    document.querySelectorAll('[data-social]').forEach((element) => {
      const url = data.social && data.social[element.dataset.social];
      setLink(element, url);
    });

    document.querySelectorAll('[data-release-youtube]').forEach((element) => setLink(element, data.featuredRelease && data.featuredRelease.youtube));
    document.querySelectorAll('[data-release-spotify]').forEach((element) => setLink(element, data.featuredRelease && data.featuredRelease.spotify));

    const releaseTitle = document.querySelector('[data-release-title]');
    if (releaseTitle && data.featuredRelease && data.featuredRelease.title) releaseTitle.textContent = data.featuredRelease.title;

    const email = data.contact && data.contact.email;
    const quickContact = document.querySelector('[data-contact-quick]');
    setLink(quickContact, email ? `mailto:${email}` : '');

    const emailLink = document.querySelector('[data-contact-email]');
    const emailPlaceholder = document.querySelector('[data-contact-placeholder]');
    if (email) {
      if (emailLink) {
        emailLink.hidden = false;
        emailLink.href = `mailto:${email}`;
        emailLink.textContent = email;
      }
      if (emailPlaceholder) emailPlaceholder.hidden = true;
    } else {
      if (emailLink) emailLink.hidden = true;
      if (emailPlaceholder) emailPlaceholder.hidden = false;
    }

    document.querySelectorAll('.is-disabled').forEach((element) => {
      element.addEventListener('click', (event) => event.preventDefault());
    });
  };

  const hydrateMedia = () => {
    const hero = document.querySelector('[data-hero-media]');
    if (hero && data.hero && data.hero.image) {
      const image = document.createElement('img');
      image.src = data.hero.image;
      image.alt = (data.hero.alt && (data.hero.alt[document.documentElement.lang] || data.hero.alt.en)) || 'Heartifacts';
      image.fetchPriority = 'high';
      image.decoding = 'async';
      hero.append(image);
      hero.classList.add('has-image');
    }

    const releaseArt = document.querySelector('[data-release-art]');
    if (releaseArt && data.featuredRelease && data.featuredRelease.artwork) {
      const image = document.createElement('img');
      image.src = data.featuredRelease.artwork;
      image.alt = `${data.featuredRelease.title || 'Heartifacts'} artwork`;
      image.loading = 'lazy';
      image.decoding = 'async';
      releaseArt.append(image);
      releaseArt.classList.add('has-image');
    }
  };

  function renderShows(language) {
    const container = document.querySelector('[data-shows]');
    if (!container) return;
    container.replaceChildren();

    const dictionary = dictionaries[language] || dictionaries.en;
    const shows = Array.isArray(data.shows) ? data.shows.filter((show) => show.date && show.venue) : [];

    if (!shows.length) {
      const empty = document.createElement('p');
      empty.className = 'show-empty';
      empty.textContent = dictionary.live.noShows;
      container.append(empty);
      return;
    }

    shows
      .slice()
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .forEach((show) => {
        const row = document.createElement('article');
        row.className = 'show-card';

        const date = document.createElement('time');
        date.className = 'show-date';
        date.dateTime = show.date;
        const parsedDate = new Date(`${show.date}T12:00:00`);
        date.textContent = new Intl.DateTimeFormat(language === 'ro' ? 'ro-RO' : 'en-GB', { day: '2-digit', month: 'short' }).format(parsedDate);

        const place = document.createElement('div');
        place.className = 'show-place';
        const venue = document.createElement('strong');
        venue.textContent = show.venue;
        const city = document.createElement('span');
        city.textContent = show.city || '';
        place.append(venue, city);

        row.append(date, place);

        const destination = show.ticketUrl || show.eventUrl;
        if (destination) {
          const link = document.createElement('a');
          link.className = 'button button-ghost';
          link.href = destination;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = dictionary.actions.details;
          row.append(link);
        }

        container.append(row);
      });
  }

  function renderGallery(language) {
    const container = document.querySelector('[data-gallery]');
    if (!container) return;
    container.replaceChildren();

    const dictionary = dictionaries[language] || dictionaries.en;
    const gallery = Array.isArray(data.gallery) ? data.gallery : [];
    const items = gallery.length ? gallery.slice(0, 4) : Array.from({ length: 4 }, (_, index) => ({ placeholder: true, index }));

    items.forEach((item, index) => {
      const figure = document.createElement('figure');
      figure.className = 'gallery-item';

      if (item.placeholder) {
        const placeholder = document.createElement('div');
        placeholder.className = 'gallery-placeholder';
        placeholder.textContent = `PHOTO ${String(index + 1).padStart(2, '0')}`;
        const caption = document.createElement('figcaption');
        caption.textContent = dictionary.photos.placeholderCaption;
        figure.append(placeholder, caption);
      } else {
        const image = document.createElement('img');
        image.src = item.src;
        image.loading = 'lazy';
        image.decoding = 'async';
        image.alt = (item.alt && (item.alt[language] || item.alt.en)) || '';
        if (item.width) image.width = item.width;
        if (item.height) image.height = item.height;

        const captionText = item.caption && (item.caption[language] || item.caption.en);
        figure.append(image);
        if (captionText) {
          const caption = document.createElement('figcaption');
          caption.textContent = captionText;
          figure.append(caption);
        }

        figure.tabIndex = 0;
        figure.setAttribute('role', 'button');
        figure.setAttribute('aria-label', image.alt || 'Open photo');
        figure.addEventListener('click', () => openLightbox(item, language));
        figure.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openLightbox(item, language);
          }
        });
      }

      container.append(figure);
    });
  }

  const openLightbox = (item, language) => {
    const dialog = document.querySelector('[data-lightbox]');
    const image = document.querySelector('[data-lightbox-image]');
    const caption = document.querySelector('[data-lightbox-caption]');
    if (!dialog || !image || !dialog.showModal) return;

    image.src = item.src;
    image.alt = (item.alt && (item.alt[language] || item.alt.en)) || '';
    caption.textContent = (item.caption && (item.caption[language] || item.caption.en)) || '';
    dialog.showModal();
  };

  const setupLightbox = () => {
    const dialog = document.querySelector('[data-lightbox]');
    const close = document.querySelector('[data-lightbox-close]');
    if (!dialog) return;
    if (close) close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => {
      const bounds = dialog.getBoundingClientRect();
      const inside = event.clientX >= bounds.left && event.clientX <= bounds.right && event.clientY >= bounds.top && event.clientY <= bounds.bottom;
      if (!inside) dialog.close();
    });
  };

  const setupMenu = () => {
    const button = document.querySelector('[data-menu-button]');
    const menu = document.querySelector('[data-mobile-menu]');
    if (!button || !menu) return;

    const closeMenu = () => {
      menu.hidden = true;
      button.setAttribute('aria-expanded', 'false');
    };

    button.addEventListener('click', () => {
      const opening = menu.hidden;
      menu.hidden = !opening;
      button.setAttribute('aria-expanded', String(opening));
    });

    menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
    window.addEventListener('resize', () => { if (window.innerWidth > 820) closeMenu(); }, { passive: true });
  };

  const setupSectionNavigation = () => {
    if (!('IntersectionObserver' in window)) return;

    const links = Array.from(document.querySelectorAll('[data-nav-link]'));
    const sections = ['music', 'live', 'about', 'photos']
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    const setCurrent = (id) => {
      links.forEach((link) => {
        const isCurrent = link.getAttribute('href') === `#${id}`;
        link.classList.toggle('is-current', isCurrent);
        if (isCurrent) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    };

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible && visible.target.id) setCurrent(visible.target.id);
    }, { rootMargin: '-18% 0px -58% 0px', threshold: [0, .12, .3, .55] });

    sections.forEach((section) => observer.observe(section));
  };

  const setupLanguageButtons = () => {
    document.querySelectorAll('[data-lang]').forEach((button) => {
      button.addEventListener('click', () => applyLanguage(button.dataset.lang, true));
    });
  };

  const initialLanguage = resolveInitialLanguage();
  const year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();
  hydrateLinks();
  hydrateMedia();
  setupMenu();
  setupLightbox();
  setupSectionNavigation();
  setupLanguageButtons();
  applyLanguage(initialLanguage);
})();
