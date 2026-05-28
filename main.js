/**
 * Experiencia Comunica — Main interactions
 * GSAP ScrollTrigger animations, parallax, custom cursor, tilt cards, counters, typewriter
 */
(function () {
  'use strict';

  // ============================================================
  // Lenis Smooth Scroll
  // ============================================================
  var lenis = null;

  function initLenis() {
    if (typeof Lenis === 'undefined') {
      setTimeout(initLenis, 100);
      return;
    }

    lenis = new Lenis({
      duration: 1.2,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      touchMultiplier: 2,
      infinite: false
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Sync Lenis with GSAP ScrollTrigger when available
    function syncWithGSAP() {
      if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
        setTimeout(syncWithGSAP, 200);
        return;
      }
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    }
    syncWithGSAP();
  }
  initLenis();

  // ============================================================
  // Scroll Progress Bar
  // ============================================================
  var progressBar = document.getElementById('scrollProgress');
  if (progressBar) {
    window.addEventListener('scroll', function () {
      var scrollTop = window.scrollY;
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      var progress = (scrollTop / docHeight) * 100;
      progressBar.style.width = progress + '%';
    });
  }

  // ============================================================
  // Custom Cursor
  // ============================================================
  var dot = document.getElementById('cursorDot');
  var ring = document.getElementById('cursorRing');

  if (dot && ring && window.matchMedia('(pointer: fine)').matches) {
    var cx = 0, cy = 0, dx = 0, dy = 0;

    document.addEventListener('mousemove', function (e) {
      cx = e.clientX;
      cy = e.clientY;
    });

    (function loop() {
      dx += (cx - dx) * 0.15;
      dy += (cy - dy) * 0.15;
      dot.style.transform = 'translate(' + cx + 'px,' + cy + 'px) translate(-50%,-50%)';
      ring.style.transform = 'translate(' + dx + 'px,' + dy + 'px) translate(-50%,-50%)';
      requestAnimationFrame(loop);
    })();

    document.querySelectorAll('a, button, .speaker-card, .sponsor-logo, .btn, .audience-card, .feeling-card, .feature-pill').forEach(function (el) {
      el.addEventListener('mouseenter', function () { ring.classList.add('hover'); });
      el.addEventListener('mouseleave', function () { ring.classList.remove('hover'); });
    });
  }

  // ============================================================
  // Navigation
  // ============================================================
  var nav = document.getElementById('nav');
  var burger = document.getElementById('navBurger');
  var mobileMenu = document.getElementById('mobileMenu');

  window.addEventListener('scroll', function () {
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 50);
  });

  if (burger && mobileMenu) {
    burger.addEventListener('click', function () {
      burger.classList.toggle('active');
      mobileMenu.classList.toggle('open');
      document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
    });
    mobileMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        burger.classList.remove('active');
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // ============================================================
  // Smooth scroll (uses Lenis when available, fallback to native)
  // ============================================================
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        if (lenis) {
          lenis.scrollTo(target, { offset: 0, duration: 1.5 });
        } else {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });

  // ============================================================
  // Typewriter
  // ============================================================
  function typewriter(el, text, speed) {
    var i = 0;
    el.textContent = '';
    function tick() {
      if (i < text.length) {
        el.textContent += text.charAt(i);
        i++;
        setTimeout(tick, speed);
      }
    }
    tick();
  }

  var heroSub = document.getElementById('heroSubtitle');
  if (heroSub) {
    setTimeout(function () {
      typewriter(heroSub, '¿Hablas o comunicas?', 65);
    }, 1400);
  }

  // ============================================================
  // GSAP init
  // ============================================================
  function initGSAP() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      setTimeout(initGSAP, 100);
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    // --- Reveal text on scroll ---
    document.querySelectorAll('.reveal-text').forEach(function (el, i) {
      gsap.fromTo(el,
        { opacity: 0, y: 35 },
        {
          opacity: 1, y: 0,
          duration: 0.9,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 88%',
            toggleActions: 'play none none none'
          },
          delay: (i % 5) * 0.06
        }
      );
    });

    // --- Hero parallax (content moves up slower than scroll) ---
    gsap.to('.hero__content', {
      y: -100,
      opacity: 0,
      ease: 'none',
      scrollTrigger: {
        trigger: '.hero',
        start: 'top top',
        end: 'bottom top',
        scrub: 1
      }
    });

    // --- About visual parallax (3D canvas floats on scroll) ---
    gsap.fromTo('.about__visual', { y: 80 }, {
      y: -40,
      ease: 'none',
      scrollTrigger: {
        trigger: '.about__container',
        start: 'top 90%',
        end: 'bottom 10%',
        scrub: 1.5
      }
    });

    // --- Feature pills stagger + float ---
    gsap.fromTo('.feature-pill',
      { opacity: 0, y: 30, scale: 0.9 },
      {
        opacity: 1, y: 0, scale: 1,
        duration: 0.7,
        stagger: 0.08,
        ease: 'back.out(1.5)',
        scrollTrigger: { trigger: '.about__features', start: 'top 85%' }
      }
    );

    // --- Feature pills subtle float on scroll ---
    document.querySelectorAll('[data-parallax]').forEach(function (el) {
      var speed = parseFloat(el.getAttribute('data-parallax')) || 0.05;
      gsap.to(el, {
        y: function () { return -50 * speed * 10; },
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 2
        }
      });
    });

    // --- Speaker cards stagger ---
    gsap.fromTo('.speaker-card',
      { opacity: 0, y: 60, rotateX: 5 },
      {
        opacity: 1, y: 0, rotateX: 0,
        duration: 1,
        stagger: 0.2,
        ease: 'expo.out',
        scrollTrigger: { trigger: '.speakers__grid', start: 'top 80%' }
      }
    );

    // --- Feeling cards stagger with alternating X ---
    document.querySelectorAll('.feeling-card').forEach(function (card, i) {
      var isRight = card.classList.contains('feeling-card--right');
      gsap.fromTo(card,
        { opacity: 0, x: isRight ? 50 : -50, scale: 0.95 },
        {
          opacity: 1, x: 0, scale: 1,
          duration: 0.8,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: card,
            start: 'top 88%',
            toggleActions: 'play none none none'
          },
          delay: i * 0.08
        }
      );
    });

    // --- Feelings visual parallax ---
    gsap.fromTo('.about__feelings-visual', { y: 60 }, {
      y: -30,
      ease: 'none',
      scrollTrigger: {
        trigger: '.about__feelings',
        start: 'top 90%',
        end: 'bottom 10%',
        scrub: 1.5
      }
    });

    // --- Timeline items stagger ---
    gsap.fromTo('.timeline-item',
      { opacity: 0, x: -30 },
      {
        opacity: 1, x: 0,
        duration: 0.8,
        stagger: 0.08,
        ease: 'expo.out',
        scrollTrigger: { trigger: '.agenda__timeline', start: 'top 80%' }
      }
    );

    // --- Audience cards ---
    gsap.fromTo('.audience-card',
      { opacity: 0, y: 40, scale: 0.95 },
      {
        opacity: 1, y: 0, scale: 1,
        duration: 0.8,
        stagger: 0.12,
        ease: 'expo.out',
        scrollTrigger: { trigger: '.about__audience-grid', start: 'top 85%' }
      }
    );

    // --- Gallery items stagger ---
    gsap.fromTo('.gallery-item',
      { opacity: 0, y: 40, scale: 0.95 },
      {
        opacity: 1, y: 0, scale: 1,
        duration: 0.8,
        stagger: 0.1,
        ease: 'expo.out',
        scrollTrigger: { trigger: '.about__gallery', start: 'top 85%' }
      }
    );

    // --- Image break parallax ---
    gsap.to('.image-break img', {
      y: '15%',
      ease: 'none',
      scrollTrigger: {
        trigger: '.image-break',
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1.5
      }
    });

    // --- Image break quote ---
    gsap.fromTo('.image-break__quote',
      { opacity: 0, scale: 0.9 },
      {
        opacity: 1, scale: 1,
        duration: 1,
        ease: 'expo.out',
        scrollTrigger: { trigger: '.image-break', start: 'top 70%' }
      }
    );

    // --- Sponsor logos ---
    gsap.fromTo('.sponsor-logo',
      { opacity: 0, y: 25 },
      {
        opacity: 0.5, y: 0,
        duration: 0.7,
        stagger: 0.08,
        ease: 'expo.out',
        scrollTrigger: { trigger: '.sponsors__logos', start: 'top 85%' }
      }
    );

    // --- Marquee speed change on scroll ---
    gsap.to('.marquee__track', {
      x: -200,
      ease: 'none',
      scrollTrigger: {
        trigger: '.marquee',
        start: 'top bottom',
        end: 'bottom top',
        scrub: 3
      }
    });

    // --- Counter animation ---
    document.querySelectorAll('.stat__number').forEach(function (el) {
      var target = parseInt(el.getAttribute('data-target'), 10);
      var suffix = el.getAttribute('data-suffix') || '';
      var display = el.getAttribute('data-display');

      ScrollTrigger.create({
        trigger: el,
        start: 'top 90%',
        once: true,
        onEnter: function () {
          if (display) {
            gsap.fromTo(el, { scale: 0.5, opacity: 0 }, {
              scale: 1, opacity: 1,
              duration: 0.6,
              ease: 'back.out(2)',
              onComplete: function () { el.textContent = display; }
            });
          } else {
            gsap.to({ val: 0 }, {
              val: target,
              duration: 2,
              ease: 'expo.out',
              onUpdate: function () {
                el.textContent = Math.round(this.targets()[0].val) + suffix;
              }
            });
          }
        }
      });
    });

    // --- Section titles scale on approach ---
    document.querySelectorAll('.about__title, .speakers__title, .agenda__title, .sponsors__title').forEach(function (title) {
      gsap.fromTo(title,
        { scale: 0.92, opacity: 0 },
        {
          scale: 1, opacity: 1,
          duration: 1.2,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: title,
            start: 'top 85%'
          }
        }
      );
    });

    // --- Floating shapes parallax ---
    document.querySelectorAll('.floating-shape').forEach(function (shape, i) {
      gsap.to(shape, {
        y: -80 - i * 20,
        ease: 'none',
        scrollTrigger: {
          trigger: '.about',
          start: 'top bottom',
          end: 'bottom top',
          scrub: 2 + i * 0.5
        }
      });
    });

    // --- Footer reveal ---
    gsap.fromTo('.footer__grid > div',
      { opacity: 0, y: 30 },
      {
        opacity: 1, y: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: 'expo.out',
        scrollTrigger: { trigger: '.footer__grid', start: 'top 90%' }
      }
    );
  }

  initGSAP();

  // ============================================================
  // 3D Tilt on speaker cards
  // ============================================================
  document.querySelectorAll('[data-tilt]').forEach(function (card) {
    var maxTilt = 8;

    card.addEventListener('mousemove', function (e) {
      var rect = card.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width;
      var y = (e.clientY - rect.top) / rect.height;
      var ry = (x - 0.5) * maxTilt * 2;
      var rx = (0.5 - y) * maxTilt * 2;
      card.style.transform = 'perspective(800px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) scale(1.02)';
    });

    card.addEventListener('mouseleave', function () {
      card.style.transform = 'perspective(800px) rotateX(0) rotateY(0) scale(1)';
    });
  });

})();
