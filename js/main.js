/* ============================================================
   NASSER LODGE — Main JavaScript
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  const nav = document.querySelector('.nav');
  const navToggle = document.querySelector('.nav__toggle');
  const navLinks = document.querySelector('.nav__links');
  const navLinkItems = document.querySelectorAll('.nav__links a');

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

  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -60px 0px',
    threshold: 0.1
  };

  const animateObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-on-scroll--visible');
        if (entry.target.classList.contains('stagger-children')) {
          entry.target.classList.add('stagger-children--visible');
        }
      }
    });
  }, observerOptions);

  document.querySelectorAll('.animate-on-scroll, .stagger-children').forEach(el => {
    animateObserver.observe(el);
  });

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

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

      const whatsappUrl = `https://wa.me/260978176195?text=${message}`;

      const submitBtn = bookingForm.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = '✓ Opening WhatsApp…';
      submitBtn.style.background = '#25D366';
      submitBtn.disabled = true;

      setTimeout(() => {
        submitBtn.textContent = originalText;
        submitBtn.style.background = '';
        submitBtn.disabled = false;
      }, 2000);
    });
  }

  const yearSpan = document.getElementById('current-year');
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

});
