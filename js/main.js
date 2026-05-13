(() => {
  'use strict';

  /* ===== NAV SCROLL ===== */
  const nav = document.getElementById('nav');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 20);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ===== MOBILE NAV TOGGLE ===== */
  const navToggle = document.getElementById('navToggle');
  const navLinks  = document.getElementById('navLinks');
  navToggle.addEventListener('click', () => navLinks.classList.toggle('open'));
  navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navLinks.classList.remove('open')));

  /* ===== SERVICE CARD "Reservar" BUTTONS → pre-fill step 1 ===== */
  document.querySelectorAll('[data-prefill]').forEach(btn => {
    btn.addEventListener('click', e => {
      const name = btn.dataset.prefill;
      selectService(name);
    });
  });

  /* ===== BOOKING WIZARD ===== */
  const state = {
    service: null,
    price: null,
    barber: 'Cristian Boyatjián',
    date: null,
    time: null,
    currentStep: 1,
  };

  const stepperSteps = document.querySelectorAll('.stepper__step');
  const panels       = document.querySelectorAll('.booking__panel');

  function goToStep(n) {
    state.currentStep = n;
    panels.forEach((p, i) => p.classList.toggle('active', i + 1 === n));
    stepperSteps.forEach((s, i) => {
      s.classList.remove('active', 'done');
      if (i + 1 === n)      s.classList.add('active');
      else if (i + 1 < n)   s.classList.add('done');
    });
    document.getElementById('reservar').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* --- Step 1: service selection --- */
  const serviceBtns = document.querySelectorAll('.booking__service-btn');
  serviceBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      selectService(btn.dataset.service, btn.dataset.price);
    });
  });

  function selectService(name, price) {
    state.service = name;
    state.price   = price || getPriceByName(name);
    serviceBtns.forEach(b => b.classList.toggle('selected', b.dataset.service === name));
    setTimeout(() => goToStep(2), 220);
  }

  function getPriceByName(name) {
    const map = { 'Arreglo de Barba': '23500', 'Corte': '24500', 'Corte Niño': '23500', 'Corte y Barba': '33000' };
    return map[name] || '0';
  }

  /* --- Step 2: nav --- */
  document.getElementById('back-2').addEventListener('click', () => goToStep(1));
  document.getElementById('next-2').addEventListener('click', () => goToStep(3));

  /* --- Step 3: calendar --- */
  let calYear, calMonth;

  function initCalendar() {
    const now = new Date();
    calYear  = now.getFullYear();
    calMonth = now.getMonth();
    renderCalendar();
  }

  function renderCalendar() {
    const monthEl = document.getElementById('calMonth');
    const daysEl  = document.getElementById('calDays');

    const monthName = new Date(calYear, calMonth, 1)
      .toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    monthEl.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    daysEl.innerHTML = '';

    for (let i = 0; i < firstDay; i++) {
      const el = document.createElement('div');
      el.className = 'cal-day empty';
      daysEl.appendChild(el);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date    = new Date(calYear, calMonth, d);
      const dow     = date.getDay(); // 0=Sun,1=Mon,...6=Sat
      const isPast  = date < today;
      const isClosed = (dow === 0 || dow === 1); // Sun & Mon closed
      const isToday = date.getTime() === today.getTime();
      const isSelected = state.date &&
        state.date.getDate() === d &&
        state.date.getMonth() === calMonth &&
        state.date.getFullYear() === calYear;

      const el = document.createElement('div');
      el.textContent = d;

      let cls = 'cal-day';
      if (isSelected)      cls += ' selected';
      else if (isPast)     cls += ' past';
      else if (isClosed)   cls += ' closed';
      else                 cls += ' available';
      if (isToday && !isPast && !isClosed) cls += ' today';

      el.className = cls;

      if (!isPast && !isClosed) {
        el.addEventListener('click', () => {
          state.date = new Date(calYear, calMonth, d);
          state.time = null;
          renderCalendar();
          renderTimeslots(dow);
          document.getElementById('next-3').disabled = true;
        });
      }

      daysEl.appendChild(el);
    }
  }

  function renderTimeslots(dow) {
    const container = document.getElementById('timeslots');

    const startHour = 11; // all days start at 11 (Sat starts at 12)
    const endSlot   = '19:30';

    let slots = [];
    const startH = (dow === 6) ? 12 : 11;
    for (let h = startH; h <= 19; h++) {
      slots.push(`${pad(h)}:00`);
      if (h < 20) slots.push(`${pad(h)}:30`);
    }
    // last slot is 19:30, so remove 20:00 if it snuck in
    slots = slots.filter(s => s <= '19:30');

    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'timeslots__grid';

    slots.forEach(slot => {
      const btn = document.createElement('button');
      btn.className = 'timeslot-btn';
      btn.textContent = slot;
      if (state.time === slot) btn.classList.add('selected');
      btn.addEventListener('click', () => {
        state.time = slot;
        container.querySelectorAll('.timeslot-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        document.getElementById('next-3').disabled = false;
      });
      grid.appendChild(btn);
    });

    container.appendChild(grid);
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  document.getElementById('calPrev').addEventListener('click', () => {
    calMonth--;
    if (calMonth < 0) { calMonth = 11; calYear--; }
    renderCalendar();
  });

  document.getElementById('calNext').addEventListener('click', () => {
    calMonth++;
    if (calMonth > 11) { calMonth = 0; calYear++; }
    renderCalendar();
  });

  document.getElementById('back-3').addEventListener('click', () => goToStep(2));
  document.getElementById('next-3').addEventListener('click', () => {
    if (state.date && state.time) {
      updateSummary();
      goToStep(4);
    }
  });

  /* --- Step 4: summary & WhatsApp --- */
  function updateSummary() {
    document.getElementById('sum-service').textContent = state.service || '—';
    document.getElementById('sum-date').textContent    = state.date
      ? state.date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : '—';
    document.getElementById('sum-time').textContent  = state.time || '—';
    const price = parseInt(state.price || '0');
    document.getElementById('sum-price').textContent = price ? `$${price.toLocaleString('es-AR')}` : '—';

    const dateStr = state.date
      ? state.date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : '';
    const priceStr = price ? `$${price.toLocaleString('es-AR')}` : '';

    const msg = encodeURIComponent(
      `Hola Cristian! Quiero reservar un turno 💈\n\n` +
      `📋 Servicio: ${state.service}\n` +
      `📅 Fecha: ${dateStr}\n` +
      `🕐 Horario: ${state.time}\n` +
      `💵 Precio: ${priceStr}\n\n` +
      `¿Podés confirmarlo? ¡Gracias!`
    );

    document.getElementById('confirmWhatsapp').href =
      `https://wa.me/5491155778760?text=${msg}`;
  }

  document.getElementById('back-4').addEventListener('click', () => goToStep(3));

  /* ===== INIT ===== */
  initCalendar();
  goToStep(1);
})();
