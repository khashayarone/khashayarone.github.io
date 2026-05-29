/**
 * Movie Finder Plugin — tool.js
 * Advanced movie search with TMDB dataset (2000-2026)
 * Part of Vanilla Micro-SPA Tool Platform
 */

const MovieFinderPlugin = (() => {
    'use strict';

    // Constants
    const IMAGE_BASE = 'https://image.tmdb.org/t/p/';
    const POSTER_SIZE = 'w500';
    const BACKDROP_SIZE = 'w1280';
    const PROFILE_SIZE = 'w185';
    const DATA_PATH = 'data/movie-finder/';
    const YEAR_RANGE = { from: 2000, to: 2026 };

    // Fallback SVGs
    const FALLBACK_POSTER = `data:image/svg+xml,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="500" height="750" viewBox="0 0 500 750">
            <rect width="500" height="750" fill="#1a1a24"/>
            <rect x="150" y="250" width="200" height="250" rx="12" fill="#22222e" stroke="#6b6b7b" stroke-width="2"/>
            <path d="M250 300 L170 450 L330 450 Z" fill="#6b6b7b" opacity="0.5"/>
            <text x="250" y="500" text-anchor="middle" fill="#6b6b7b" font-family="sans-serif" font-size="16">بدون تصویر</text>
        </svg>
    `)}`;

    const FALLBACK_BACKDROP = `data:image/svg+xml,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
            <rect width="1280" height="720" fill="#12121a"/>
            <rect x="440" y="210" width="400" height="300" rx="16" fill="#1a1a24" stroke="#6b6b7b" stroke-width="2"/>
            <path d="M640 270 L520 480 L760 480 Z" fill="#6b6b7b" opacity="0.3"/>
            <text x="640" y="560" text-anchor="middle" fill="#6b6b7b" font-family="sans-serif" font-size="20">Backdrop Not Available</text>
        </svg>
    `)}`;

    const FALLBACK_PROFILE = `data:image/svg+xml,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="185" height="278" viewBox="0 0 185 278">
            <rect width="185" height="278" fill="#1a1a24"/>
            <circle cx="92" cy="100" r="50" fill="#22222e" stroke="#6b6b7b" stroke-width="2"/>
            <path d="M42 180 Q92 140 142 180 L142 278 L42 278 Z" fill="#22222e" stroke="#6b6b7b" stroke-width="1"/>
        </svg>
    `)}`;

    // Genre mapping (ID -> Persian name)
    const GENRE_MAP = {
        28: 'اکشن', 12: 'ماجراجویی', 16: 'انیمیشن', 35: 'کمدی',
        80: 'جنایی', 99: 'مستند', 18: 'درام', 10751: 'خانوادگی',
        14: 'فانتزی', 36: 'تاریخی', 27: 'ترسناک', 10402: 'موزیکال',
        9648: 'رازآلود', 10749: 'عاشقانه', 878: 'علمی-تخیلی',
        10770: 'تلویزیونی', 53: 'هیجانی', 10752: 'جنگی', 37: 'وسترن'
    };

    // Country code mapping
    const COUNTRY_MAP = {
        'US': 'آمریکا', 'GB': 'انگلیس', 'FR': 'فرانسه', 'DE': 'آلمان',
        'JP': 'ژاپن', 'KR': 'کره جنوبی', 'IN': 'هند', 'IR': 'ایران',
        'CA': 'کانادا', 'AU': 'استرالیا', 'IT': 'ایتالیا', 'ES': 'اسپانیا',
        'CN': 'چین', 'RU': 'روسیه', 'BR': 'برزیل', 'MX': 'مکزیک'
    };

    // Language mapping
    const LANGUAGE_MAP = {
        'en': 'انگلیسی', 'fa': 'فارسی', 'fr': 'فرانسوی', 'de': 'آلمانی',
        'ja': 'ژاپنی', 'ko': 'کره‌ای', 'es': 'اسپانیایی', 'it': 'ایتالیایی',
        'zh': 'چینی', 'ru': 'روسی', 'ar': 'عربی', 'hi': 'هندی'
    };

    // Plugin State
    let state = {
        view: 'search', // 'search' | 'results' | 'details'
        query: '',
        filters: {
            yearFrom: 2000,
            yearTo: 2026,
            minRating: 0,
            genres: [],
            countries: [],
            languages: []
        },
        results: [],
        filteredResults: [],
        selectedMovie: null,
        isLoading: false,
        cache: new Map(), // Map<year, movies[]>
        filtersOpen: true
    };

    let worker = null;

    /**
     * Initialize Web Worker for search
     */
    const initWorker = () => {
        // Create inline worker for search operations
        const workerCode = `
            self.onmessage = function(e) {
                const { action, data } = e.data;
                
                if (action === 'filter') {
                    const results = filterMovies(data.movies, data.query, data.filters);
                    self.postMessage({ action: 'results', results });
                }
            };
            
            function filterMovies(movies, query, filters) {
                let filtered = [...movies];
                
                // Text search
                if (query) {
                    const q = query.toLowerCase().trim();
                    filtered = filtered.filter(m => 
                        (m.title && m.title.toLowerCase().includes(q)) ||
                        (m.original_title && m.original_title.toLowerCase().includes(q)) ||
                        (m.overview && m.overview.toLowerCase().includes(q))
                    );
                }
                
                // Rating filter
                if (filters.minRating > 0) {
                    filtered = filtered.filter(m => m.vote_average >= filters.minRating);
                }
                
                // Genre filter
                if (filters.genres && filters.genres.length > 0) {
                    filtered = filtered.filter(m => 
                        m.genres && m.genres.some(g => filters.genres.includes(g.id))
                    );
                }
                
                // Country filter
                if (filters.countries && filters.countries.length > 0) {
                    filtered = filtered.filter(m => 
                        m.origin_country && m.origin_country.some(c => filters.countries.includes(c))
                    );
                }
                
                // Language filter
                if (filters.languages && filters.languages.length > 0) {
                    filtered = filtered.filter(m => 
                        m.original_language && filters.languages.includes(m.original_language)
                    );
                }
                
                return filtered;
            }
        `;

        const blob = new Blob([workerCode], { type: 'application/javascript' });
        worker = new Worker(URL.createObjectURL(blob));
    };

    /**
     * Load movie data for a specific year
     */
    const loadYearData = async (year) => {
        if (state.cache.has(year)) {
            return state.cache.get(year);
        }

        try {
            const response = await fetch(`${DATA_PATH}movies_${year}.json`);
            if (!response.ok) {
                console.warn(`No data for year ${year}`);
                return [];
            }
            const data = await response.json();
            const movies = data.movies || [];
            state.cache.set(year, movies);
            return movies;
        } catch (error) {
            console.error(`Failed to load year ${year}:`, error);
            return [];
        }
    };

    /**
     * Load all years in range
     */
    const loadAllData = async (fromYear, toYear) => {
        const years = [];
        for (let y = fromYear; y <= toYear; y++) {
            if (!state.cache.has(y)) {
                years.push(y);
            }
        }

        if (years.length === 0) {
            // All cached — collect from cache
            let allMovies = [];
            for (let y = fromYear; y <= toYear; y++) {
                allMovies = allMovies.concat(state.cache.get(y) || []);
            }
            return allMovies;
        }

        // Load uncached years in batches of 3
        const BATCH_SIZE = 3;
        for (let i = 0; i < years.length; i += BATCH_SIZE) {
            const batch = years.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(year => loadYearData(year)));
        }

        let allMovies = [];
        for (let y = fromYear; y <= toYear; y++) {
            allMovies = allMovies.concat(state.cache.get(y) || []);
        }
        return allMovies;
    };

    /**
     * Perform search
     */
    const performSearch = async () => {
        state.isLoading = true;
        renderView();

        try {
            const movies = await loadAllData(state.filters.yearFrom, state.filters.yearTo);
            
            // Use worker for filtering
            worker.postMessage({
                action: 'filter',
                data: {
                    movies,
                    query: state.query,
                    filters: state.filters
                }
            });

            worker.onmessage = (e) => {
                if (e.data.action === 'results') {
                    state.results = e.data.results;
                    state.view = 'results';
                    state.isLoading = false;
                    renderView();
                    EventBus.emit('movie-finder:search:complete', {
                        count: state.results.length
                    });
                }
            };
        } catch (error) {
            console.error('Search failed:', error);
            state.isLoading = false;
            state.view = 'search';
            renderView();
        }
    };

    /**
     * Get image URL with fallback handling
     */
    const getImageUrl = (path, type = 'poster') => {
        if (!path) {
            return type === 'backdrop' ? FALLBACK_BACKDROP : 
                   type === 'profile' ? FALLBACK_PROFILE : FALLBACK_POSTER;
        }
        const base = type === 'backdrop' ? `${IMAGE_BASE}${BACKDROP_SIZE}` :
                     type === 'profile' ? `${IMAGE_BASE}${PROFILE_SIZE}` :
                     `${IMAGE_BASE}${POSTER_SIZE}`;
        return base + path;
    };

    /**
     * Handle image load error
     */
    const handleImageError = (img, type = 'poster') => {
        img.src = type === 'backdrop' ? FALLBACK_BACKDROP :
                  type === 'profile' ? FALLBACK_PROFILE : FALLBACK_POSTER;
        img.classList.add('fallback-image');
    };

    /**
     * Format currency
     */
    const formatCurrency = (amount) => {
        if (!amount || amount === 0) return 'نامشخص';
        if (amount >= 1000000000) return `$${(amount / 1000000000).toFixed(1)}B`;
        if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
        return `$${(amount / 1000).toFixed(1)}K`;
    };

    /**
     * Render the current view
     */
    const renderView = () => {
        const container = document.getElementById('plugin-container');
        if (!container) return;

        switch (state.view) {
            case 'search':
                container.innerHTML = renderSearchView();
                break;
            case 'results':
                container.innerHTML = renderResultsView();
                break;
            case 'details':
                container.innerHTML = renderDetailsView();
                break;
            case 'loading':
                container.innerHTML = renderLoadingView();
                break;
        }

        bindEvents();
        if (typeof lucide !== 'undefined') lucide.createIcons();
    };

    /**
     * Render Search View
     */
    const renderSearchView = () => `
        <div class="movie-finder">
            <div class="search-section">
                <div class="search-bar-wrapper">
                    <input type="text" class="search-bar" id="movie-search-input" 
                           placeholder="جستجوی فیلم... (عنوان، بازیگر، ژانر)" 
                           value="${Utils.escapeHtml(state.query)}"
                           autocomplete="off">
                    <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="M21 21l-4.35-4.35"/>
                    </svg>
                </div>
                <div class="search-actions">
                    <button class="btn btn-primary" id="btn-search">
                        <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                        </svg>
                        جستجو
                    </button>
                </div>
            </div>

            <div class="filters-section ${state.filtersOpen ? 'filters-open' : ''}" id="filters-section">
                <div class="filters-header" id="filters-header">
                    <div class="filters-title">
                        <svg class="icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                        </svg>
                        فیلترهای پیشرفته
                    </div>
                    <svg class="filters-toggle" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M6 9l6 6 6-6"/>
                    </svg>
                </div>
                <div class="filters-body">
                    <div class="filter-row">
                        <div class="filter-group">
                            <label class="filter-label">سال انتشار از</label>
                            <input type="number" class="filter-input" id="filter-year-from" 
                                   min="2000" max="2026" value="${state.filters.yearFrom}">
                        </div>
                        <div class="filter-group">
                            <label class="filter-label">سال انتشار تا</label>
                            <input type="number" class="filter-input" id="filter-year-to" 
                                   min="2000" max="2026" value="${state.filters.yearTo}">
                        </div>
                        <div class="filter-group">
                            <label class="filter-label">حداقل امتیاز</label>
                            <input type="number" class="filter-input" id="filter-min-rating" 
                                   min="0" max="10" step="0.5" value="${state.filters.minRating}">
                        </div>
                    </div>
                    <div class="filter-row">
                        <div class="filter-group">
                            <label class="filter-label">ژانر</label>
                            <div class="filter-chips" id="genre-chips">
                                ${Object.entries(GENRE_MAP).map(([id, name]) => `
                                    <span class="filter-chip ${state.filters.genres.includes(parseInt(id)) ? 'active' : ''}" 
                                          data-genre="${id}">${name}</span>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    <div class="filters-actions">
                        <button class="btn btn-ghost" id="btn-clear-filters">پاک کردن فیلترها</button>
                        <button class="btn btn-primary" id="btn-apply-filters">اعمال فیلترها</button>
                    </div>
                </div>
            </div>

            ${state.isLoading ? renderLoadingView() : ''}
        </div>
    `;

    /**
     * Render Loading View
     */
    const renderLoadingView = () => `
        <div class="search-loading">
            <div class="search-spinner"></div>
        </div>
    `;

    /**
     * Render Results View
     */
    const renderResultsView = () => `
        <div class="movie-finder">
            <button class="back-button" id="btn-back-to-search">
                <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                بازگشت به جستجو
            </button>
            
            <div class="results-header">
                <h2 class="section-title">نتایج جستجو</h2>
                <span class="results-count">
                    <strong>${state.results.length.toLocaleString('fa-IR')}</strong> فیلم یافت شد
                </span>
            </div>

            ${state.results.length === 0 ? `
                <div class="empty-state">
                    <svg class="empty-state-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                    </svg>
                    <span class="empty-state-text">فیلمی یافت نشد</span>
                    <span class="empty-state-sub">فیلترهای دیگری را امتحان کنید</span>
                </div>
            ` : `
                <div class="results-grid">
                    ${state.results.map(movie => `
                        <div class="movie-card" data-movie-id="${movie.id}" data-movie-year="${movie.release_date ? movie.release_date.substring(0, 4) : ''}">
                            <img class="movie-card-poster" 
                                 src="${getImageUrl(movie.poster_path, 'poster')}" 
                                 alt="${Utils.escapeHtml(movie.title)}"
                                 loading="lazy"
                                 onerror="MovieFinderPlugin.handleImageError(this, 'poster')">
                            <div class="movie-card-overlay">
                                <span class="movie-card-title">${Utils.escapeHtml(movie.title)}</span>
                                <div class="movie-card-meta">
                                    ${movie.vote_average ? `
                                        <span class="movie-card-rating">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="#fbbf24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                                            ${movie.vote_average.toFixed(1)}
                                        </span>
                                    ` : ''}
                                    ${movie.release_date ? `
                                        <span class="movie-card-year">${movie.release_date.substring(0, 4)}</span>
                                    ` : ''}
                                    ${movie.genres && movie.genres[0] ? `
                                        <span class="movie-card-genre">${GENRE_MAP[movie.genres[0].id] || movie.genres[0].name}</span>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `}
        </div>
    `;

    /**
     * Render Details View
     */
    const renderDetailsView = () => {
        const movie = state.selectedMovie;
        if (!movie) return renderSearchView();

        const year = movie.release_date ? movie.release_date.substring(0, 4) : '';
        const cast = movie.credits?.cast?.slice(0, 6) || [];
        const companies = movie.production_companies || [];
        const director = movie.credits?.crew?.find(c => c.job === 'Director');

        return `
            <div class="movie-finder">
                <button class="back-button" id="btn-back-to-results">
                    <svg class="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                    بازگشت به نتایج
                </button>

                <div class="movie-details">
                    <!-- Hero Section -->
                    <div class="details-hero">
                        <img class="details-backdrop" 
                             src="${getImageUrl(movie.backdrop_path, 'backdrop')}" 
                             alt=""
                             onerror="MovieFinderPlugin.handleImageError(this, 'backdrop')">
                        <div class="details-backdrop-gradient"></div>
                        <div class="details-hero-content">
                            <div class="details-poster">
                                <img src="${getImageUrl(movie.poster_path, 'poster')}" 
                                     alt="${Utils.escapeHtml(movie.title)}"
                                     onerror="MovieFinderPlugin.handleImageError(this, 'poster')">
                            </div>
                            <div class="details-info">
                                <h1 class="details-title">${Utils.escapeHtml(movie.title)}</h1>
                                ${movie.original_title !== movie.title ? `
                                    <span class="details-original-title">${Utils.escapeHtml(movie.original_title)}</span>
                                ` : ''}
                                ${movie.tagline ? `
                                    <span class="details-tagline">"${Utils.escapeHtml(movie.tagline)}"</span>
                                ` : ''}
                                <div class="details-meta-row">
                                    ${movie.vote_average ? `
                                        <span class="details-rating-badge">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="#fbbf24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                                            ${movie.vote_average.toFixed(1)} (${(movie.vote_count || 0).toLocaleString('fa-IR')})
                                        </span>
                                    ` : ''}
                                    <span class="details-meta-dot"></span>
                                    <span class="details-meta-item">${year}</span>
                                    ${movie.runtime ? `
                                        <span class="details-meta-dot"></span>
                                        <span class="details-meta-item">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                            ${movie.runtime} دقیقه
                                        </span>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Overview -->
                    ${movie.overview ? `
                        <div class="details-section">
                            <h3 class="details-section-title">خلاصه داستان</h3>
                            <p class="details-overview">${Utils.escapeHtml(movie.overview)}</p>
                        </div>
                    ` : ''}

                    <!-- Financial & Info Grid -->
                    <div class="details-grid">
                        ${movie.budget > 0 ? `
                            <div class="details-grid-item">
                                <span class="grid-item-label">بودجه</span>
                                <span class="grid-item-value">${formatCurrency(movie.budget)}</span>
                            </div>
                        ` : ''}
                        ${movie.revenue > 0 ? `
                            <div class="details-grid-item">
                                <span class="grid-item-label">فروش</span>
                                <span class="grid-item-value">${formatCurrency(movie.revenue)}</span>
                            </div>
                        ` : ''}
                        <div class="details-grid-item">
                            <span class="grid-item-label">محبوبیت</span>
                            <span class="grid-item-value">${(movie.popularity || 0).toFixed(1)}</span>
                        </div>
                        ${movie.status ? `
                            <div class="details-grid-item">
                                <span class="grid-item-label">وضعیت</span>
                                <span class="grid-item-value">${movie.status === 'Released' ? 'منتشر شده' : movie.status}</span>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Genres -->
                    ${movie.genres && movie.genres.length > 0 ? `
                        <div class="details-section">
                            <h3 class="details-section-title">ژانرها</h3>
                            <div class="genres-list">
                                ${movie.genres.map(g => `
                                    <span class="genre-tag">${GENRE_MAP[g.id] || g.name}</span>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <!-- Director -->
                    ${director ? `
                        <div class="details-section">
                            <h3 class="details-section-title">کارگردان</h3>
                            <span style="color: var(--color-text-primary); font-size: var(--font-size-base);">${Utils.escapeHtml(director.name)}</span>
                        </div>
                    ` : ''}

                    <!-- Cast -->
                    ${cast.length > 0 ? `
                        <div class="details-section">
                            <h3 class="details-section-title">بازیگران</h3>
                            <div class="cast-list">
                                ${cast.map(actor => `
                                    <div class="cast-card">
                                        <img class="cast-photo" 
                                             src="${getImageUrl(actor.profile_path, 'profile')}" 
                                             alt="${Utils.escapeHtml(actor.name)}"
                                             loading="lazy"
                                             onerror="MovieFinderPlugin.handleImageError(this, 'profile')">
                                        <div class="cast-info">
                                            <span class="cast-name">${Utils.escapeHtml(actor.name)}</span>
                                            <span class="cast-character">${Utils.escapeHtml(actor.character || '')}</span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <!-- Production Companies -->
                    ${companies.length > 0 ? `
                        <div class="details-section">
                            <h3 class="details-section-title">شرکت‌های تولید</h3>
                            <div class="companies-list">
                                ${companies.map(c => `
                                    <span class="company-tag">${Utils.escapeHtml(c.name)}</span>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    };

    /**
     * Bind events to DOM elements
     */
    const bindEvents = () => {
        // Search button
        const searchBtn = document.getElementById('btn-search');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                state.view = 'results';
                performSearch();
            });
        }

        // Search on Enter
        const searchInput = document.getElementById('movie-search-input');
        if (searchInput) {
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    state.view = 'results';
                    performSearch();
                }
            });
            searchInput.addEventListener('input', Utils.debounce((e) => {
                state.query = e.target.value;
            }, 300));
        }

        // Filters toggle
        const filtersHeader = document.getElementById('filters-header');
        if (filtersHeader) {
            filtersHeader.addEventListener('click', () => {
                state.filtersOpen = !state.filtersOpen;
                const section = document.getElementById('filters-section');
                if (section) {
                    section.classList.toggle('filters-open', state.filtersOpen);
                }
            });
        }

        // Filter inputs
        const yearFrom = document.getElementById('filter-year-from');
        const yearTo = document.getElementById('filter-year-to');
        const minRating = document.getElementById('filter-min-rating');

        if (yearFrom) yearFrom.addEventListener('change', (e) => { state.filters.yearFrom = parseInt(e.target.value) || 2000; });
        if (yearTo) yearTo.addEventListener('change', (e) => { state.filters.yearTo = parseInt(e.target.value) || 2026; });
        if (minRating) minRating.addEventListener('change', (e) => { state.filters.minRating = parseFloat(e.target.value) || 0; });

        // Genre chips
        document.querySelectorAll('.filter-chip[data-genre]').forEach(chip => {
            chip.addEventListener('click', () => {
                const genreId = parseInt(chip.dataset.genre);
                const index = state.filters.genres.indexOf(genreId);
                if (index === -1) {
                    state.filters.genres.push(genreId);
                } else {
                    state.filters.genres.splice(index, 1);
                }
                chip.classList.toggle('active');
            });
        });

        // Apply filters
        const applyBtn = document.getElementById('btn-apply-filters');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                state.view = 'results';
                performSearch();
            });
        }

        // Clear filters
        const clearBtn = document.getElementById('btn-clear-filters');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                state.filters = { yearFrom: 2000, yearTo: 2026, minRating: 0, genres: [], countries: [], languages: [] };
                state.filtersOpen = true;
                renderView();
            });
        }

        // Back to search
        const backToSearch = document.getElementById('btn-back-to-search');
        if (backToSearch) {
            backToSearch.addEventListener('click', () => {
                state.view = 'search';
                state.results = [];
                renderView();
            });
        }

        // Back to results
        const backToResults = document.getElementById('btn-back-to-results');
        if (backToResults) {
            backToResults.addEventListener('click', () => {
                state.view = 'results';
                state.selectedMovie = null;
                renderView();
            });
        }

        // Movie card clicks
        document.querySelectorAll('.movie-card[data-movie-id]').forEach(card => {
            card.addEventListener('click', () => {
                const movieId = parseInt(card.dataset.movieId);
                const movieYear = card.dataset.movieYear;
                
                // Find movie in results
                const movie = state.results.find(m => m.id === movieId);
                if (movie) {
                    state.selectedMovie = movie;
                    state.view = 'details';
                    renderView();
                }
            });
        });
    };

    /**
     * Initialize plugin
     */
    const init = async (container) => {
        initWorker();
        renderView();
        EventBus.emit('tool:mounted', { toolId: 'movie-finder' });
    };

    /**
     * Destroy plugin — cleanup
     */
    const destroy = () => {
        if (worker) {
            worker.terminate();
            worker = null;
        }
        state.cache.clear();
        EventBus.emit('tool:destroyed', { toolId: 'movie-finder' });
    };

    // Public API
    return {
        init,
        destroy,
        handleImageError,
        renderView
    };
})();



// Public API
return {
    init,
    destroy,
    handleImageError,
    renderView
};
})();

// Freeze for immutability
Object.freeze(MovieFinderPlugin);

// Expose to global scope for PluginLoader
window.MovieFinderPlugin = MovieFinderPlugin;
