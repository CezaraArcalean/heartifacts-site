(() => {
  'use strict';

  const data = window.HeartifactsSiteData || {};
  const publicDataApi = window.HeartifactsPublicData || null;
  const dictionaries = window.HeartifactsContent || {};
  const supportedLanguages = ['ro', 'en'];
  const languageStorageKey = 'heartifacts-language';
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  let activeLanguage = 'en';
  let publicDataState = Object.freeze({ status: 'idle', data: null });

  const getNestedValue = (object, path) => path.split('.').reduce((value, key) => value && value[key], object);
  const getDictionary = (language) => dictionaries[language] || dictionaries.en || {};

  const resolveInitialLanguage = () => {
    const queryLanguage = new URLSearchParams(window.location.search).get('lang');
    if (supportedLanguages.includes(queryLanguage)) return queryLanguage;

    try {
      const storedLanguage = window.localStorage.getItem(languageStorageKey);
      if (supportedLanguages.includes(storedLanguage)) return storedLanguage;
    } catch (_) {
      // Local storage is optional; language selection still works for this visit.
    }

    return navigator.language && navigator.language.toLowerCase().startsWith('ro') ? 'ro' : 'en';
  };

  const updateLanguageUrl = (language) => {
    const url = new URL(window.location.href);
    url.searchParams.set('lang', language);
    window.history.replaceState({}, '', url);
  };

  const setLink = (element, url) => {
    if (!element) return;

    if (!url) {
      element.removeAttribute('href');
      element.removeAttribute('target');
      element.removeAttribute('rel');

      if (element.dataset.keepEmpty === 'true') {
        element.hidden = false;
        element.classList.add('is-disabled');
        element.setAttribute('aria-disabled', 'true');
      } else {
        element.hidden = true;
      }
      return;
    }

    element.hidden = false;
    element.classList.remove('is-disabled');
    element.removeAttribute('aria-disabled');
    element.href = url;

    if (/^https:\/\//i.test(url)) {
      element.target = '_blank';
      element.rel = 'noopener noreferrer';
    } else {
      element.removeAttribute('target');
      element.removeAttribute('rel');
    }
  };

  const createExternalLink = (url, className, text) => {
    const link = document.createElement('a');
    link.className = className;
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = text;
    return link;
  };

  const hydrateStaticLinks = () => {
    document.querySelectorAll('[data-social]').forEach((element) => {
      const url = data.social && data.social[element.dataset.social];
      setLink(element, url);
    });

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

  const hydrateHeroMedia = () => {
    const hero = document.querySelector('[data-hero-media]');
    if (!hero || !data.hero || !data.hero.image) return;

    const image = document.createElement('img');
    image.src = data.hero.image;
    image.alt = (data.hero.alt && (data.hero.alt[activeLanguage] || data.hero.alt.en)) || 'Heartifacts';
    image.fetchPriority = 'high';
    image.decoding = 'async';
    hero.append(image);
    hero.classList.add('has-image');
  };

  const updateHeroAlt = (language) => {
    const heroImage = document.querySelector('[data-hero-media] img');
    if (heroImage && data.hero && data.hero.alt) {
      heroImage.alt = data.hero.alt[language] || data.hero.alt.en || 'Heartifacts';
    }
  };

  const updateQuickStatuses = (language) => {
    const dictionary = getDictionary(language);
    const soonText = dictionary.quick && dictionary.quick.soon ? dictionary.quick.soon : 'Link soon';

    document.querySelectorAll('.quick-link [data-link-status]').forEach((status) => {
      const card = status.closest('.quick-link');
      status.textContent = card && card.classList.contains('is-disabled') ? soonText : '';
    });
  };

  const renderReleaseArtwork = (release, language, isPublished) => {
    const art = document.querySelector('[data-release-art]');
    if (!art) return;

    art.replaceChildren();
    art.classList.remove('has-image');

    const artwork = release && (isPublished ? release.artwork : release.artwork);
    if (artwork) {
      const image = document.createElement('img');
      image.src = artwork;
      image.loading = 'lazy';
      image.decoding = 'async';
      if (isPublished) {
        image.alt = `${release.title} artwork`;
      } else {
        const alt = release.alt;
        image.alt = alt && (alt[language] || alt.en) ? (alt[language] || alt.en) : `${release.title || 'Heartifacts'} artwork`;
      }
      art.append(image);
      art.classList.add('has-image');
      return;
    }

    const title = document.createElement('span');
    title.textContent = release && release.title ? release.title : 'Heartifacts';
    art.append(title);
  };

  const getFeaturedPublishedRelease = () => {
    if (publicDataState.status !== 'ready' || !publicDataState.data) return null;
    const releases = publicDataState.data.releases.slice().sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));
    return releases.find((release) => release.featured) || releases[0] || null;
  };

  const renderRelease = (language) => {
    const dictionary = getDictionary(language);
    const published = getFeaturedPublishedRelease();
    const fallback = data.featuredRelease || {};
    const release = published || fallback;

    const title = document.querySelector('[data-release-title]');
    const description = document.querySelector('[data-release-description]');
    const meta = document.querySelector('[data-release-meta]');
    const spotify = document.querySelector('[data-release-spotify]');
    const youtube = document.querySelector('[data-release-youtube]');

    if (title) title.textContent = release.title || 'Heartifacts';

    if (published) {
      const localized = publicDataApi ? publicDataApi.localizedDescription(published, language) : '';
      if (description) description.textContent = localized || (dictionary.music && dictionary.music.releaseFallback) || '';

      if (meta) {
        const pieces = [];
        if (published.status) pieces.push(published.status);
        const formattedDate = publicDataApi
          ? publicDataApi.formatDateOnly(published.releaseDate, language, { day: '2-digit', month: 'short', year: 'numeric' })
          : '';
        if (formattedDate) pieces.push(formattedDate);
        meta.textContent = pieces.join(' · ');
        meta.hidden = pieces.length === 0;
      }

      setLink(spotify, published.spotifyUrl);
      setLink(youtube, published.youtubeUrl);
      renderReleaseArtwork(published, language, true);
      return;
    }

    if (description) description.textContent = (dictionary.music && dictionary.music.body) || '';
    if (meta) {
      meta.textContent = '';
      meta.hidden = true;
    }
    setLink(spotify, fallback.spotify);
    setLink(youtube, fallback.youtube);
    renderReleaseArtwork(fallback, language, false);
  };

  const renderGigFallback = (container, dictionary) => {
    const empty = document.createElement('p');
    empty.className = 'show-empty';
    empty.textContent = dictionary.live && dictionary.live.dataFallback
      ? dictionary.live.dataFallback
      : 'Gig details coming soon.';
    container.append(empty);
  };

  const renderPublishedGigs = (language) => {
    const container = document.querySelector('[data-shows]');
    if (!container) return;
    container.replaceChildren();

    const dictionary = getDictionary(language);
    if (publicDataState.status !== 'ready' || !publicDataState.data || !publicDataApi) {
      renderGigFallback(container, dictionary);
      return;
    }

    const today = publicDataApi.bucharestTodayIso();
    const upcoming = publicDataState.data.gigs
      .filter((gig) => gig.date >= today)
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date));

    if (!upcoming.length) {
      const empty = document.createElement('p');
      empty.className = 'show-empty';
      empty.textContent = dictionary.live && dictionary.live.noShows
        ? dictionary.live.noShows
        : 'More gigs are being cooked up.';
      container.append(empty);
      return;
    }

    upcoming.forEach((gig) => {
      const row = document.createElement('article');
      row.className = 'show-card';
      if (gig.featured) row.classList.add('is-featured');

      const date = document.createElement('time');
      date.className = 'show-date';
      date.dateTime = gig.date;
      date.textContent = publicDataApi.formatDateOnly(gig.date, language, { day: '2-digit', month: 'short' });

      const body = document.createElement('div');
      body.className = 'show-place';

      const title = document.createElement('strong');
      title.textContent = gig.eventName;
      body.append(title);

      const location = document.createElement('span');
      location.className = 'show-location';
      location.textContent = [gig.venue, gig.city].filter(Boolean).join(' · ');
      body.append(location);

      const localizedDescription = publicDataApi.localizedDescription(gig, language);
      if (localizedDescription) {
        const description = document.createElement('p');
        description.className = 'show-description';
        description.textContent = localizedDescription;
        body.append(description);
      }

      const actions = document.createElement('div');
      actions.className = 'show-actions';

      if (gig.ticketUrl) {
        actions.append(createExternalLink(
          gig.ticketUrl,
          'button button-ghost show-ticket-link',
          dictionary.actions && dictionary.actions.tickets ? dictionary.actions.tickets : 'Tickets'
        ));
      } else {
        const soon = document.createElement('span');
        soon.className = 'show-coming-soon';
        soon.textContent = dictionary.live && dictionary.live.ticketsSoon
          ? dictionary.live.ticketsSoon
          : 'Tickets/details coming soon';
        actions.append(soon);
      }

      if (gig.eventUrl && gig.eventUrl !== gig.ticketUrl) {
        actions.append(createExternalLink(
          gig.eventUrl,
          'show-detail-link',
          dictionary.actions && dictionary.actions.details ? dictionary.actions.details : 'More details'
        ));
      }

      row.append(date, body, actions);
      container.append(row);
    });
  };

  function renderGallery(language) {
    const container = document.querySelector('[data-gallery]');
    if (!container) return;
    container.replaceChildren();

    const dictionary = getDictionary(language);
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
        caption.textContent = dictionary.photos && dictionary.photos.placeholderCaption
          ? dictionary.photos.placeholderCaption
          : '';
        figure.append(placeholder, caption);
      } else {
        const image = document.createElement('img');
        image.src = item.small || item.src;
        if (item.small) {
          image.srcset = `${item.small} 1100w, ${item.src} 1600w`;
          image.sizes = '(max-width: 820px) 92vw, (max-width: 1200px) 48vw, 700px';
        }
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
    if (!dialog || !image || typeof dialog.showModal !== 'function') return;

    image.src = item.src;
    image.alt = (item.alt && (item.alt[language] || item.alt.en)) || '';
    caption.textContent = (item.caption && (item.caption[language] || item.caption.en)) || '';
    dialog.showModal();
  };

  const applyLanguage = (language, persist = false) => {
    const dictionary = getDictionary(language);
    if (!dictionary || !dictionary.meta) return;

    activeLanguage = language;
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
      if (typeof value === 'string') element.textContent = value;
    });

    document.querySelectorAll('[data-lang]').forEach((button) => {
      const isActive = button.dataset.lang === language;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });

    renderPublishedGigs(language);
    renderRelease(language);
    renderGallery(language);
    updateQuickStatuses(language);
    updateHeroAlt(language);

    if (persist) {
      try { window.localStorage.setItem(languageStorageKey, language); } catch (_) {}
      updateLanguageUrl(language);
    }
  };

  const loadPublicData = async () => {
    if (!publicDataApi || typeof publicDataApi.fetchBandManagerPublicData !== 'function') {
      publicDataState = Object.freeze({ status: 'failed', data: null });
      renderPublishedGigs(activeLanguage);
      return;
    }

    publicDataState = Object.freeze({ status: 'loading', data: null });
    renderPublishedGigs(activeLanguage);

    try {
      const sanitized = await publicDataApi.fetchBandManagerPublicData();
      publicDataState = Object.freeze({ status: 'ready', data: sanitized });
    } catch (_) {
      publicDataState = Object.freeze({ status: 'failed', data: null });
    }

    renderPublishedGigs(activeLanguage);
    renderRelease(activeLanguage);
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

  const setupHeroMotion = () => {
    const hero = document.querySelector('.poster-hero');
    if (!hero || reducedMotionQuery.matches || !window.matchMedia('(pointer: fine)').matches) return;

    let frame = 0;
    let pendingEvent = null;

    const paint = () => {
      frame = 0;
      if (!pendingEvent) return;
      const rect = hero.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, pendingEvent.clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, pendingEvent.clientY - rect.top));
      const nx = rect.width ? (x / rect.width - .5) * 2 : 0;
      const ny = rect.height ? (y / rect.height - .5) * 2 : 0;

      hero.style.setProperty('--hero-light-x', `${x}px`);
      hero.style.setProperty('--hero-light-y', `${y}px`);
      hero.style.setProperty('--hero-nx', nx.toFixed(3));
      hero.style.setProperty('--hero-ny', ny.toFixed(3));
      hero.classList.add('is-pointer-active');
    };

    hero.addEventListener('pointermove', (event) => {
      pendingEvent = event;
      if (!frame) frame = window.requestAnimationFrame(paint);
    }, { passive: true });

    hero.addEventListener('pointerleave', () => {
      pendingEvent = null;
      hero.classList.remove('is-pointer-active');
      hero.style.setProperty('--hero-nx', '0');
      hero.style.setProperty('--hero-ny', '0');
    }, { passive: true });
  };

  const setupRevealMotion = () => {
    const targets = Array.from(document.querySelectorAll('.music-panel, .live-panel, .story-about, .story-photos, .contact-footer-inner'));
    if (!targets.length) return;

    if (reducedMotionQuery.matches || !('IntersectionObserver' in window)) {
      targets.forEach((target) => target.classList.add('is-revealed'));
      return;
    }

    targets.forEach((target, index) => {
      target.classList.add('reveal-ready');
      target.style.setProperty('--reveal-delay', `${Math.min(index, 4) * 45}ms`);
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .12 });

    targets.forEach((target) => observer.observe(target));
  };

  activeLanguage = resolveInitialLanguage();
  const year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();

  hydrateStaticLinks();
  hydrateHeroMedia();
  setupMenu();
  setupLightbox();
  setupSectionNavigation();
  setupLanguageButtons();
  setupHeroMotion();
  setupRevealMotion();
  applyLanguage(activeLanguage);
  void loadPublicData();
})();
