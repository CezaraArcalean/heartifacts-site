(() => {
  'use strict';

  const siteRoot = new URL('.', document.currentScript.src);
  const concerts = [...(window.HeartifactsConcerts || [])].sort((a, b) => b.date.localeCompare(a.date));
  const page = document.querySelector('[data-live-page]');
  const concert = concerts.find((show) => show.slug === page?.dataset.concert);
  const latest = document.querySelector('[data-gig-recap]');
  const archive = document.querySelector('[data-concert-list]');
  const archiveCard = archive?.firstElementChild;
  const viewer = document.querySelector('[data-concert-viewer]');
  const photoGrid = document.querySelector('[data-concert-photos]');
  const moreVideos = document.querySelector('[data-more-videos]');
  const videoCards = [];
  let activeVideo = null;
  let photoIndex = 0;
  let language = 'en';

  const asset = (show, file) => new URL(`assets/live/${show.slug}/${file}`, siteRoot).href;
  const thumbnail = (show, file) => asset(show, `${file}-thumb.webp`);
  const fullPhoto = (file) => new URL(`assets/photos/${file}.webp`, siteRoot).href;
  const template = (name) => document.getElementById(name).content.firstElementChild.cloneNode(true);

  function fillConcert(element, show) {
    const date = element.querySelector('[data-concert-date]');
    date.dateTime = show.date;
    date.textContent = window.HeartifactsPublicData.formatDateOnly(show.date, language, {
      day: 'numeric', month: 'long', year: 'numeric'
    });
    element.querySelector('[data-concert-venue]').textContent = show.venue;

    const place = element.querySelector('[data-concert-place]');
    if (place) place.textContent = show.place[language];

    const label = element.querySelector('[data-concert-label]');
    if (label) {
      label.textContent = show.label?.[language] || '';
      label.hidden = !label.textContent;
    }

    const cover = element.querySelector('[data-concert-cover]');
    if (cover) {
      cover.src = thumbnail(show, show.cover);
      if (cover.hasAttribute('sizes')) {
        cover.srcset = `${cover.src} 720w, ${fullPhoto(show.cover)} ${cover.getAttribute('width')}w`;
      }
    }
  }

  function stopVideo() {
    if (!activeVideo) return;
    activeVideo.frame.remove();
    activeVideo.button.hidden = false;
    activeVideo = null;
  }

  function addVideo(video, container) {
    const card = template('concert-video');
    const button = card.querySelector('button');
    const poster = button.querySelector('img');
    const link = card.querySelector('a');

    card.querySelector('h3').textContent = video.title;
    poster.src = video.poster ? asset(concert, video.poster) : thumbnail(concert, concert.cover);
    link.href = `https://www.youtube.com/watch?v=${video.youtubeId}`;

    button.addEventListener('click', () => {
      stopVideo();
      const frame = document.createElement('iframe');
      frame.title = video.title;
      frame.src = `https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&rel=0`;
      frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      frame.allowFullscreen = true;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      button.hidden = true;
      button.parentElement.append(frame);
      activeVideo = { frame, button };
      frame.focus();
    });

    container.append(card);
    videoCards.push({ title: video.title, button, link });
  }

  function showPhoto() {
    const photo = concert.photos[photoIndex];
    const image = viewer.querySelector('[data-lightbox-image]');
    const url = fullPhoto(photo.file);
    if (image.src !== url) {
      image.classList.add('is-loading');
      image.src = url;
    }
    image.alt = photo.alt[language];
    viewer.querySelector('[data-concert-caption]').textContent = photo.alt[language];
    viewer.querySelector('[data-concert-count]').textContent = `${photoIndex + 1} / ${concert.photos.length}`;
  }

  function stepPhoto(direction) {
    photoIndex = (photoIndex + direction + concert.photos.length) % concert.photos.length;
    showPhoto();
  }

  function prepareGallery() {
    const viewerImage = viewer.querySelector('[data-lightbox-image]');
    viewerImage.addEventListener('load', () => viewerImage.classList.remove('is-loading'));
    viewerImage.addEventListener('error', () => viewerImage.classList.remove('is-loading'));

    concert.photos.forEach((photo, index) => {
      const link = document.createElement('a');
      link.href = fullPhoto(photo.file);
      link.className = 'concert-photo';
      if (photo.wide) link.classList.add('concert-photo-wide');

      const image = document.createElement('img');
      image.src = thumbnail(concert, photo.file);
      image.width = photo.wide ? 720 : 560;
      image.height = photo.wide ? 540 : 700;
      image.loading = 'lazy';
      image.decoding = 'async';
      link.append(image);

      link.addEventListener('click', (event) => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || !viewer.showModal) return;
        event.preventDefault();
        photoIndex = index;
        showPhoto();
        viewer.showModal();
      });

      photoGrid.append(link);
    });

    viewer.querySelector('[data-previous-photo]').addEventListener('click', () => stepPhoto(-1));
    viewer.querySelector('[data-next-photo]').addEventListener('click', () => stepPhoto(1));
    viewer.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      stepPhoto(event.key === 'ArrowRight' ? 1 : -1);
    });
  }

  if (concert) {
    const videos = concert.videos.filter((video) => /^[A-Za-z0-9_-]{11}$/.test(video.youtubeId));
    const videoSection = document.querySelector('[data-concert-videos]');
    videoSection.hidden = !videos.length;
    if (videos.length) addVideo(videos[0], document.querySelector('[data-featured-video]'));
    if (videos.length > 1) {
      const container = moreVideos.querySelector('[data-song-videos]');
      videos.slice(1).forEach((video) => addVideo(video, container));
      moreVideos.hidden = false;
      moreVideos.addEventListener('toggle', () => {
        if (!moreVideos.open && activeVideo && moreVideos.contains(activeVideo.frame)) stopVideo();
      });
    }
    prepareGallery();
  }

  window.HeartifactsLive = {
    getPageMetadata(nextLanguage, copy) {
      if (concert) {
        return { title: `Heartifacts ${copy.at} ${concert.venue}`, description: concert.description[nextLanguage] };
      }
      if (archive) return { title: `${copy.title} — Heartifacts`, description: copy.description };
      return null;
    },

    localize(nextLanguage, copy) {
      language = nextLanguage;
      if (latest && concerts.length) fillConcert(latest, concerts[0]);

      if (archive && concerts.length) {
        const cards = concerts.map((show) => {
          const card = archiveCard.cloneNode(true);
          card.href = new URL(`live/${show.slug}/`, siteRoot).href;
          card.querySelector('[data-concert-recap]').textContent = copy.recap;
          fillConcert(card, show);
          return card;
        });
        archive.replaceChildren(...cards);
      }

      if (!concert) return;
      fillConcert(page, concert);
      photoGrid.querySelectorAll('img').forEach((image, index) => {
        image.alt = concert.photos[index].alt[language];
      });
      if (viewer.open) showPhoto();

      const credit = document.querySelector('[data-concert-credit]');
      if (concert.photoCredit) {
        credit.textContent = `${copy.credit} ${concert.photoCredit}`;
        credit.hidden = false;
      }

      videoCards.forEach(({ title, button, link }) => {
        button.setAttribute('aria-label', `${copy.play} ${title}`);
        link.setAttribute('aria-label', `${title} · ${link.textContent.trim()}`);
      });
    }
  };
})();
