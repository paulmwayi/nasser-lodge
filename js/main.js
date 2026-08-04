/* ============================================================
   NASSER LODGE — Main JavaScript
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ----- Mobile Nav Toggle ----- */
  const nav = document.querySelector('.nav');
  const navToggle = document.querySelector('.nav__toggle');
  const navLinks = document.querySelector('.nav__links');
  const navLinkItems = document.querySelectorAll('.nav__links a');

  // Nav is always visible (static) — no scroll-based class changes

  /* ----- Mobile Nav Toggle ----- */
  navToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('nav__links--open');
    navToggle.classList.toggle('nav__toggle--open');
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  navLinkItems.forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('nav__links--open');
      navToggle.classList.remove('nav__toggle--open');
      document.body.style.overflow = '';
    });
  });

  /* ----- Scroll Animations (Intersection Observer) ----- */
  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -60px 0px',
    threshold: 0.1
  };

  const animateObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-on-scroll--visible');
        // Also trigger stagger children
        if (entry.target.classList.contains('stagger-children')) {
          entry.target.classList.add('stagger-children--visible');
        }
        // Don't unobserve so chapters can re-trigger
      }
    });
  }, observerOptions);

  document.querySelectorAll('.animate-on-scroll, .stagger-children').forEach(el => {
    animateObserver.observe(el);
  });

  /* ----- Smooth Scroll for Anchor Links ----- */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  /* ----- Booking Form Submission (on book.html only) ----- */
  const bookingForm = document.getElementById('booking-form');
  if (bookingForm) {
    bookingForm.addEventListener('submit', function(e) {
      e.preventDefault();

      const formData = new FormData(bookingForm);
      const data = Object.fromEntries(formData.entries());

      const message = encodeURIComponent(
        `*Nasser Lodge Booking Enquiry*\n\n` +
        `Name: ${data.fullname || data.name}\n` +
        `Phone: +260 ${data.phone}\n` +
        `(Please confirm availability and deposit amount)`
      );

      const whatsappUrl = `https://wa.me/260976327007?text=${message}`;

      const submitBtn = bookingForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = '✓ Opening WhatsApp…';
      submitBtn.style.background = '#25D366';
      submitBtn.disabled = true;

      setTimeout(() => {
        // Only open WhatsApp if the book.html handler hasn't already done so
        // (book.html has its own submit handler that overrides this)
        submitBtn.textContent = originalText;
        submitBtn.style.background = '';
        submitBtn.disabled = false;
      }, 2000);
    });
  }

  /* ----- Current Year in Footer ----- */
  const yearSpan = document.getElementById('current-year');
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

});
