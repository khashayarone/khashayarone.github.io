```javascript
/* =====================================================
   KHASHAYAR.ONE
   UI.JS
   CORE UI ENGINE
===================================================== */

(() => {

  'use strict';

  /* =====================================================
     APP
  ===================================================== */

  const App = {

    init() {

      this.cacheDOM();

      this.navbarEffects();

      this.animateCounters();

      this.revealOnScroll();

      this.initOrb();

      this.liveFeedPulse();

      this.bindEvents();

      console.log(
        '[Khashayar.one] UI Engine Ready'
      );

    },

    cacheDOM() {

      this.navbar =
        document.querySelector('.navbar');

      this.counters =
        document.querySelectorAll('.stat-value');

      this.revealElements =
        document.querySelectorAll(
          '.hero-card, .stat-card, .tool-card, .feed-card'
        );

      this.heroOrb =
        document.querySelector('.hero-orb');

    },

    bindEvents() {

      window.addEventListener(
        'scroll',
        this.handleScroll.bind(this),
        { passive: true }
      );

    },

    handleScroll() {

      const scrollY =
        window.scrollY;

      if (!this.navbar) return;

      if (scrollY > 30) {

        this.navbar.classList.add(
          'navbar-scrolled'
        );

      } else {

        this.navbar.classList.remove(
          'navbar-scrolled'
        );

      }

    },

    /* =====================================================
       NAVBAR
    ===================================================== */

    navbarEffects() {

      this.handleScroll();

    },

    /* =====================================================
       COUNTERS
    ===================================================== */

    animateCounters() {

      const targets = [

        {
          id: 'toolCount',
          value: 4
        },

        {
          id: 'sourceCount',
          value: 342
        },

        {
          id: 'configCount',
          value: 12000,
          suffix: '+'
        }

      ];

      targets.forEach(item => {

        const el =
          document.getElementById(item.id);

        if (!el) return;

        let current = 0;

        const duration = 1400;

        const stepTime = 16;

        const increment =
          item.value /
          (duration / stepTime);

        const timer = setInterval(() => {

          current += increment;

          if (current >= item.value) {

            current = item.value;

            clearInterval(timer);

          }

          const display =
            Math.floor(current);

          if (item.value >= 10000) {

            el.textContent =
              Math.floor(display / 1000) +
              'K' +
              (item.suffix || '');

          } else {

            el.textContent =
              display +
              (item.suffix || '');

          }

        }, stepTime);

      });

    },

    /* =====================================================
       SCROLL REVEAL
    ===================================================== */

    revealOnScroll() {

      const observer =
        new IntersectionObserver(

          entries => {

            entries.forEach(entry => {

              if (
                entry.isIntersecting
              ) {

                entry.target.classList.add(
                  'revealed'
                );

              }

            });

          },

          {
            threshold: 0.15
          }

        );

      this.revealElements.forEach(el => {

        el.classList.add(
          'reveal'
        );

        observer.observe(el);

      });

    },

    /* =====================================================
       HERO ORB
    ===================================================== */

    initOrb() {

      if (!this.heroOrb) return;

      let mouseX = 0;
      let mouseY = 0;

      let currentX = 0;
      let currentY = 0;

      const move = e => {

        mouseX =
          (e.clientX - window.innerWidth / 2)
          * 0.015;

        mouseY =
          (e.clientY - window.innerHeight / 2)
          * 0.015;

      };

      window.addEventListener(
        'mousemove',
        move
      );

      const animate = () => {

        currentX +=
          (mouseX - currentX) * 0.08;

        currentY +=
          (mouseY - currentY) * 0.08;

        this.heroOrb.style.transform =
          `translate(${currentX}px, ${currentY}px)`;

        requestAnimationFrame(
          animate
        );

      };

      animate();

    },

    /* =====================================================
       LIVE FEED
    ===================================================== */

    liveFeedPulse() {

      const dots =
        document.querySelectorAll(
          '.feed-dot'
        );

      if (!dots.length) return;

      setInterval(() => {

        dots.forEach(dot => {

          dot.classList.add(
            'pulse'
          );

          setTimeout(() => {

            dot.classList.remove(
              'pulse'
            );

          }, 800);

        });

      }, 4000);

    }

  };

  /* =====================================================
     UTILITIES
  ===================================================== */

  const Utils = {

    formatNumber(number) {

      return new Intl.NumberFormat(
        'en-US'
      ).format(number);

    },

    random(min, max) {

      return (
        Math.random() *
        (max - min) +
        min
      );

    }

  };

  /* =====================================================
     FUTURE DATA API
  ===================================================== */

  const DataAPI = {

    async loadJSON(path) {

      try {

        const response =
          await fetch(path);

        if (!response.ok) {

          throw new Error(
            'JSON Load Failed'
          );

        }

        return await response.json();

      } catch (error) {

        console.warn(
          '[DataAPI]',
          error.message
        );

        return null;

      }

    }

  };

  /* =====================================================
     GLOBALS
  ===================================================== */

  window.Khashayar = {

    App,

    Utils,

    DataAPI

  };

  /* =====================================================
     INIT
  ===================================================== */

  document.addEventListener(
    'DOMContentLoaded',
    () => {

      App.init();

    }
  );

})();
```
