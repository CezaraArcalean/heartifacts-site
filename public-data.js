(() => {
  'use strict';

  const SOURCE_URL = 'https://raw.githubusercontent.com/CezaraArcalean/heartifacts-public-data/main/band-manager.json';
  const SCHEMA_VERSION = 1;
  const FETCH_TIMEOUT_MS = 5500;
  const MAX_PAYLOAD_BYTES = 128 * 1024;
  const MAX_ENTITIES = 100;
  const MAX_URL_LENGTH = 500;
  const MAX_TEXT = 260;
  const MAX_DESCRIPTION = 1000;
  const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
  const SPOTIFY_HOSTS = new Set(['open.spotify.com']);
  const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'youtu.be']);

  class PublicDataError extends Error {
    constructor(code) {
      super(code);
      this.name = 'PublicDataError';
      this.code = code;
    }
  }

  const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

  const cleanText = (value, maxLength, required = false) => {
    if (value == null) return required ? null : '';
    if (typeof value !== 'string') return null;
    const text = value.trim();
    if ((required && !text) || text.length > maxLength) return null;
    return text;
  };

  const parseDateOnly = (value) => {
    if (typeof value !== 'string') return null;
    const match = DATE_RE.exec(value);
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const check = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

    if (
      check.getUTCFullYear() !== year ||
      check.getUTCMonth() !== month - 1 ||
      check.getUTCDate() !== day
    ) return null;

    return Object.freeze({ iso: value, year, month, day });
  };

  const safeHttpsUrl = (value, allowedHosts) => {
    if (value == null || value === '') return null;
    if (typeof value !== 'string') return null;
    const text = value.trim();
    if (!text || text.length > MAX_URL_LENGTH) return null;

    try {
      const url = new URL(text);
      if (url.protocol !== 'https:') return null;
      if (url.username || url.password) return null;
      const host = url.hostname.toLowerCase();
      if (allowedHosts && !allowedHosts.has(host)) return null;
      return url.href;
    } catch (_) {
      return null;
    }
  };

  const safeAssetRef = (value) => {
    if (value == null || value === '') return null;
    if (typeof value !== 'string') return null;
    const text = value.trim();
    if (!text || text.length > MAX_URL_LENGTH || text.includes('\\')) return null;
    if (/^[a-z][a-z0-9+.-]*:/i.test(text) || text.startsWith('//')) return null;

    let normalized = text;
    if (normalized.startsWith('./')) normalized = normalized.slice(2);
    if (normalized.startsWith('/')) normalized = normalized.slice(1);
    if (!normalized.startsWith('assets/')) return null;

    const pathOnly = normalized.split(/[?#]/, 1)[0];
    let decoded;
    try {
      decoded = decodeURIComponent(pathOnly);
    } catch (_) {
      return null;
    }

    if (decoded.includes('\\') || decoded.includes('\0')) return null;
    const segments = decoded.split('/');
    if (segments.some((segment) => !segment || segment === '.' || segment === '..')) return null;
    if (segments[0] !== 'assets') return null;

    return `./${pathOnly}`;
  };

  const sanitizeGig = (raw) => {
    if (!isPlainObject(raw)) return null;

    const id = cleanText(raw.id, 140, true);
    const date = parseDateOnly(raw.date);
    const eventName = cleanText(raw.eventName, MAX_TEXT, true);
    const venue = cleanText(raw.venue, MAX_TEXT, true);
    const city = cleanText(raw.city, 180, true);
    if (!id || !date || !eventName || !venue || !city || typeof raw.featured !== 'boolean') return null;

    const descriptionRo = cleanText(raw.descriptionRo, MAX_DESCRIPTION, false);
    const descriptionEn = cleanText(raw.descriptionEn, MAX_DESCRIPTION, false);
    if (descriptionRo === null || descriptionEn === null) return null;

    return Object.freeze({
      id,
      date: date.iso,
      eventName,
      venue,
      city,
      ticketUrl: safeHttpsUrl(raw.ticketUrl),
      eventUrl: safeHttpsUrl(raw.eventUrl),
      image: safeAssetRef(raw.image),
      descriptionRo,
      descriptionEn,
      featured: raw.featured
    });
  };

  const sanitizeRelease = (raw) => {
    if (!isPlainObject(raw)) return null;

    const id = cleanText(raw.id, 140, true);
    const title = cleanText(raw.title, MAX_TEXT, true);
    const releaseDate = parseDateOnly(raw.releaseDate);
    if (!id || !title || !releaseDate || typeof raw.featured !== 'boolean') return null;

    const status = cleanText(raw.status, 120, false);
    const descriptionRo = cleanText(raw.descriptionRo, MAX_DESCRIPTION, false);
    const descriptionEn = cleanText(raw.descriptionEn, MAX_DESCRIPTION, false);
    if (status === null || descriptionRo === null || descriptionEn === null) return null;

    return Object.freeze({
      id,
      title,
      releaseDate: releaseDate.iso,
      status,
      spotifyUrl: safeHttpsUrl(raw.spotifyUrl, SPOTIFY_HOSTS),
      youtubeUrl: safeHttpsUrl(raw.youtubeUrl, YOUTUBE_HOSTS),
      artwork: safeAssetRef(raw.artwork),
      descriptionRo,
      descriptionEn,
      featured: raw.featured
    });
  };

  const validateBandManagerPayload = (raw) => {
    if (!isPlainObject(raw)) throw new PublicDataError('payload_not_object');

    let approximateSize = 0;
    try { approximateSize = JSON.stringify(raw).length; } catch (_) { throw new PublicDataError('payload_unserializable'); }
    if (approximateSize > MAX_PAYLOAD_BYTES) throw new PublicDataError('payload_too_large');

    if (raw.schemaVersion !== SCHEMA_VERSION) throw new PublicDataError('unsupported_schema');
    if (typeof raw.generatedAt !== 'string' || raw.generatedAt.length > 80 || Number.isNaN(Date.parse(raw.generatedAt))) {
      throw new PublicDataError('invalid_generated_at');
    }
    if (!Array.isArray(raw.gigs) || !Array.isArray(raw.releases)) throw new PublicDataError('missing_collections');
    if (raw.gigs.length > MAX_ENTITIES || raw.releases.length > MAX_ENTITIES) throw new PublicDataError('too_many_entities');

    const gigs = raw.gigs.map(sanitizeGig).filter(Boolean);
    const releases = raw.releases.map(sanitizeRelease).filter(Boolean);

    return Object.freeze({
      schemaVersion: SCHEMA_VERSION,
      generatedAt: raw.generatedAt,
      gigs: Object.freeze(gigs),
      releases: Object.freeze(releases)
    });
  };

  const fetchBandManagerPublicData = async () => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(SOURCE_URL, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        cache: 'default',
        redirect: 'follow',
        referrerPolicy: 'no-referrer',
        headers: { Accept: 'application/json' },
        signal: controller.signal
      });

      if (!response.ok) throw new PublicDataError('http_error');
      const text = await response.text();
      if (!text || text.length > MAX_PAYLOAD_BYTES) throw new PublicDataError('payload_size');

      let parsed;
      try { parsed = JSON.parse(text); } catch (_) { throw new PublicDataError('malformed_json'); }
      return validateBandManagerPayload(parsed);
    } catch (error) {
      if (error && error.name === 'AbortError') throw new PublicDataError('timeout');
      if (error instanceof PublicDataError) throw error;
      throw new PublicDataError('network_error');
    } finally {
      window.clearTimeout(timeout);
    }
  };

  const localizedDescription = (entity, language) => {
    if (!entity) return '';
    if (language === 'ro') return entity.descriptionRo || entity.descriptionEn || '';
    return entity.descriptionEn || entity.descriptionRo || '';
  };

  const formatDateOnly = (iso, language, options = {}) => {
    const parsed = parseDateOnly(iso);
    if (!parsed) return '';
    const safeDate = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day, 12, 0, 0));
    return new Intl.DateTimeFormat(language === 'ro' ? 'ro-RO' : 'en-GB', {
      timeZone: 'UTC',
      ...options
    }).format(safeDate);
  };

  const bucharestTodayIso = (now = new Date()) => {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Bucharest',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(now);

    const values = Object.create(null);
    parts.forEach((part) => { if (part.type !== 'literal') values[part.type] = part.value; });
    return `${values.year}-${values.month}-${values.day}`;
  };

  window.HeartifactsPublicData = Object.freeze({
    sourceUrl: SOURCE_URL,
    fetchBandManagerPublicData,
    validateBandManagerPayload,
    localizedDescription,
    formatDateOnly,
    bucharestTodayIso
  });
})();
