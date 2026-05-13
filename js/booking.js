(() => {
  'use strict';

  // ─── SUPABASE INIT ──────────────────────────────────────────────────────────
  const SUPABASE_URL      = window.SUPABASE_URL      || '';
  const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || '';
  const configured = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

  let db = null;
  if (configured) {
    const { createClient } = window.supabase;
    db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } else {
    console.warn(
      '[Barber Boya] Supabase no configurado. ' +
      'Copiá js/config.example.js a js/config.js y completá tus credenciales.',
    );
  }

  // ─── STATE ──────────────────────────────────────────────────────────────────
  const state = {
    service: null,
    price:   null,
    barber:  'Cristian Boyatjián',
    date:    null,
    time:    null,
  };

  // ─── STEPPER ────────────────────────────────────────────────────────────────
  const stepperEls = document.querySelectorAll('.stepper__step');
  const panelEls   = document.querySelectorAll('.booking__panel');

  function goToStep(n, scroll = true) {
    panelEls.forEach((p, i) => p.classList.toggle('active', i + 1 === n));
    stepperEls.forEach((s, i) => {
      s.classList.remove('active', 'done');
      if (i + 1 === n)    s.classList.add('active');
      else if (i + 1 < n) s.classList.add('done');
    });
    if (scroll) {
      const section = document.getElementById('reservar');
      if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // ─── STEP 1: SERVICE ────────────────────────────────────────────────────────
  document.querySelectorAll('.booking__service-btn').forEach(btn => {
    btn.addEventListener('click', () => selectService(btn.dataset.service, btn.dataset.price));
  });

  document.querySelectorAll('[data-prefill]').forEach(btn => {
    btn.addEventListener('click', () => selectService(btn.dataset.prefill));
  });

  function selectService(name, price) {
    state.service = name;
    state.price   = price || getPriceByName(name);
    document.querySelectorAll('.booking__service-btn')
      .forEach(b => b.classList.toggle('selected', b.dataset.service === name));
    setTimeout(() => goToStep(2), 200);
  }

  function getPriceByName(name) {
    return { 'Arreglo de Barba': '23500', 'Corte': '24500', 'Corte Niño': '23500', 'Corte y Barba': '33000' }[name] || '0';
  }

  // ─── STEP 2: BARBER ─────────────────────────────────────────────────────────
  document.getElementById('back-2').addEventListener('click', () => goToStep(1));
  document.getElementById('next-2').addEventListener('click', () => goToStep(3));

  // ─── STEP 3: CALENDAR ───────────────────────────────────────────────────────
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

    const label = new Date(calYear, calMonth, 1)
      .toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    monthEl.textContent = label.charAt(0).toUpperCase() + label.slice(1);

    const firstDow    = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const today       = new Date(); today.setHours(0, 0, 0, 0);

    daysEl.innerHTML = '';

    // Empty cells before first day
    for (let i = 0; i < firstDow; i++) {
      const el = document.createElement('div');
      el.className = 'cal-day empty';
      daysEl.appendChild(el);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date    = new Date(calYear, calMonth, d);
      const dow     = date.getDay();
      const isPast   = date < today;
      const isClosed = dow === 0 || dow === 1; // Sun + Mon

      const isSelected =
        state.date &&
        state.date.getDate()     === d &&
        state.date.getMonth()    === calMonth &&
        state.date.getFullYear() === calYear;

      const isToday = date.getTime() === today.getTime();

      const el = document.createElement('div');
      el.textContent = d;

      let cls = 'cal-day';
      if      (isSelected)              cls += ' selected';
      else if (isPast)                  cls += ' past';
      else if (isClosed)                cls += ' closed';
      else                              cls += ' available';
      if (isToday && !isPast && !isClosed) cls += ' today';

      el.className = cls;

      if (!isPast && !isClosed) {
        el.addEventListener('click', () => onDayClick(new Date(calYear, calMonth, d), dow));
      }

      daysEl.appendChild(el);
    }
  }

  async function onDayClick(date, dow) {
    state.date = date;
    state.time = null;
    document.getElementById('next-3').disabled = true;
    renderCalendar();

    const slotsEl = document.getElementById('timeslots');
    slotsEl.innerHTML = '<p class="timeslots__hint">Cargando horarios...</p>';

    const booked = await fetchBookedSlots(toDateStr(date));
    renderTimeslots(dow, booked);
  }

  async function fetchBookedSlots(dateStr) {
    if (!db) return [];
    try {
      const { data, error } = await db
        .from('slot_availability')
        .select('time')
        .eq('date', dateStr);
      if (error) throw error;
      return (data || []).map(r => r.time);
    } catch (e) {
      console.error('Error consultando disponibilidad:', e);
      return [];
    }
  }

  function renderTimeslots(dow, booked) {
    const slotsEl = document.getElementById('timeslots');
    slotsEl.innerHTML = '';

    const startH = dow === 6 ? 12 : 11;
    const allSlots = [];
    for (let h = startH; h <= 19; h++) {
      allSlots.push(`${pad(h)}:00`);
      allSlots.push(`${pad(h)}:30`);
    }
    const slots = allSlots.filter(s => s <= '19:30');

    const grid = document.createElement('div');
    grid.className = 'timeslots__grid';

    slots.forEach(slot => {
      const isTaken = booked.includes(slot);
      const btn = document.createElement('button');
      btn.textContent = slot;
      btn.className = 'timeslot-btn' + (isTaken ? ' taken' : '');
      btn.disabled = isTaken;
      btn.title = isTaken ? 'Horario ocupado' : '';

      if (!isTaken) {
        btn.addEventListener('click', () => {
          state.time = slot;
          slotsEl.querySelectorAll('.timeslot-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          document.getElementById('next-3').disabled = false;
        });
      }
      grid.appendChild(btn);
    });

    slotsEl.appendChild(grid);
  }

  document.getElementById('calPrev').addEventListener('click', () => {
    if (--calMonth < 0) { calMonth = 11; calYear--; }
    renderCalendar();
  });

  document.getElementById('calNext').addEventListener('click', () => {
    if (++calMonth > 11) { calMonth = 0; calYear++; }
    renderCalendar();
  });

  document.getElementById('back-3').addEventListener('click', () => goToStep(2));
  document.getElementById('next-3').addEventListener('click', () => {
    if (state.date && state.time) { fillSummary(); goToStep(4); }
  });

  // ─── STEP 4: CLIENT INFO + CONFIRM ──────────────────────────────────────────
  function fillSummary() {
    const price = parseInt(state.price || '0');
    document.getElementById('sum-service').textContent = state.service || '—';
    document.getElementById('sum-date').textContent    = state.date
      ? state.date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : '—';
    document.getElementById('sum-time').textContent  = state.time  || '—';
    document.getElementById('sum-price').textContent = price
      ? `$${price.toLocaleString('es-AR')}` : '—';
  }

  document.getElementById('back-4').addEventListener('click', () => goToStep(3));

  document.getElementById('confirmBtn').addEventListener('click', confirmBooking);

  async function confirmBooking() {
    const nameEl  = document.getElementById('clientName');
    const phoneEl = document.getElementById('clientPhone');
    const name    = nameEl.value.trim();
    const phone   = phoneEl.value.trim();

    clearErrors();
    let valid = true;
    if (!name)  { markError(nameEl,  'Ingresá tu nombre'); valid = false; }
    if (!phone) { markError(phoneEl, 'Ingresá tu WhatsApp'); valid = false; }
    if (!valid) return;

    setLoading(true);

    // Fallback when Supabase is not configured: open WhatsApp directly
    if (!db) {
      whatsAppFallback(name, phone);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await db
        .from('bookings')
        .insert({
          service:      state.service,
          price:        parseInt(state.price),
          barber:       state.barber,
          date:         toDateStr(state.date),
          time:         state.time,
          client_name:  name,
          client_phone: phone,
        })
        .select('cancel_token')
        .single();

      if (error) {
        // 23505 = unique_violation (slot already taken)
        if (error.code === '23505') {
          showError('Este horario fue reservado hace un momento. Volvé atrás y elegí otro turno.');
        } else {
          showError('Hubo un problema al reservar. Por favor intentá de nuevo.');
          console.error(error);
        }
        setLoading(false);
        return;
      }

      showSuccess(name, data.cancel_token);

      // Fire-and-forget: notificar por email al admin
      notifyAdmin({ name, phone });

    } catch (e) {
      showError('Sin conexión. Verificá tu internet e intentá de nuevo.');
      console.error(e);
      setLoading(false);
    }
  }

  function showSuccess(name, cancelToken) {
    document.getElementById('step4Form').classList.add('hidden');

    const successEl = document.getElementById('bookingSuccess');
    successEl.classList.remove('hidden');

    const price   = parseInt(state.price || '0');
    const dateStr = state.date.toLocaleDateString('es-AR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });

    document.getElementById('successName').textContent   = name.split(' ')[0];
    document.getElementById('successDetail').textContent =
      `${state.service}  ·  ${dateStr}  ·  ${state.time} hs  ·  $${price.toLocaleString('es-AR')}`;

    const cancelUrl = `${window.location.origin}${window.location.pathname.replace('index.html','').replace(/\/$/, '')}/cancelar.html?token=${cancelToken}`;
    document.getElementById('successCancelLink').href        = cancelUrl;
    document.getElementById('successCancelDisplay').textContent = cancelUrl;

    const waMsg = encodeURIComponent(
      `Hola Cristian! Acabo de reservar un turno 💈\n\n` +
      `📋 Servicio: ${state.service}\n` +
      `📅 Fecha: ${dateStr}\n` +
      `🕐 Horario: ${state.time} hs\n` +
      `💵 Precio: $${price.toLocaleString('es-AR')}\n\n` +
      `¡Nos vemos!`
    );
    document.getElementById('successWhatsApp').href = `https://wa.me/5491155778760?text=${waMsg}`;
  }

  function notifyAdmin({ name, phone }) {
    if (!db) return;
    fetch(`${SUPABASE_URL}/functions/v1/notify-booking`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        service:      state.service,
        price:        parseInt(state.price),
        date:         toDateStr(state.date),
        time:         state.time,
        client_name:  name,
        client_phone: phone,
      }),
    }).catch(() => {}); // silencioso — no afecta al cliente si falla
  }

  function whatsAppFallback(name, phone) {
    const price   = parseInt(state.price || '0');
    const dateStr = state.date.toLocaleDateString('es-AR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
    const msg = encodeURIComponent(
      `Hola Cristian! Quiero reservar un turno 💈\n\n` +
      `📋 Servicio: ${state.service}\n` +
      `📅 Fecha: ${dateStr}\n` +
      `🕐 Horario: ${state.time} hs\n` +
      `💵 Precio: $${price.toLocaleString('es-AR')}\n` +
      `👤 Nombre: ${name}\n` +
      `📱 Tel: ${phone}\n\n` +
      `¿Podés confirmarlo? ¡Gracias!`
    );
    window.open(`https://wa.me/5491155778760?text=${msg}`, '_blank');
  }

  // ─── HELPERS ────────────────────────────────────────────────────────────────
  function setLoading(on) {
    const btn = document.getElementById('confirmBtn');
    btn.disabled    = on;
    btn.textContent = on ? 'Reservando...' : 'Confirmar Turno';
  }

  function showError(msg) {
    const el = document.getElementById('bookingError');
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  function markError(input, msg) {
    input.classList.add('input--error');
    const span = document.createElement('span');
    span.className   = 'field-error';
    span.textContent = msg;
    input.parentNode.appendChild(span);
  }

  function clearErrors() {
    document.querySelectorAll('.input--error').forEach(el => el.classList.remove('input--error'));
    document.querySelectorAll('.field-error').forEach(el => el.remove());
    document.getElementById('bookingError').classList.add('hidden');
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  function toDateStr(d) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  // ─── INIT ───────────────────────────────────────────────────────────────────
  initCalendar();
  goToStep(1, false); // false = no scroll on initial load

})();
