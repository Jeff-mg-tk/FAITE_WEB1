const API_URL = (window.location.protocol === 'file:') ? 'http://127.0.0.1:5001' : window.location.origin;

let prices = {};
let names = {};
let images = {};
let customConfig = {};

const cart = {};
const cartDetails = {};
let currentScreen = 'menu';

let currentCustomizingId = null;
let tempCustomSelection = {};

// Time scheduling state
let orderDeliveryType = 'scheduled';
let scheduledDate = '';
let scheduledTime = '';

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function initApp() {
  try {
    const response = await fetch(`${API_URL}/api/menu`);
    if (!response.ok) {
      throw new Error("No se pudo cargar el menú desde la API");
    }
    const data = await response.json();
    
    // Populate helper objects
    data.products.forEach(p => {
      prices[p.id] = p.price;
      names[p.id] = p.name;
      images[p.id] = p.image;
    });
    customConfig = data.customizations;

    // Render HTML dynamically
    renderMenuHTML(data.products);
    renderOrdersExtrasHTML(data.products);

    // Initial state: start directly on Menu (main landing)
    switchScreen('menu');
    initDateSelect();
    populateTimeSlots();
    checkStoreHours();
    loadPromos();
    
    // Auto-refresh store hours every 2 minutes
    setInterval(checkStoreHours, 120000);
  } catch (e) {
    console.error("Error al inicializar la aplicación:", e);
    alert("Error de conexión con el servidor. Por favor, asegúrese de que el backend esté ejecutándose.");
  }
}

function renderMenuHTML(products) {
  const categories = {
    personales: { title: "PERSONALES (Modo Esencia)", el: document.getElementById('personales') },
    duos: { title: "DÚOS (Doble Dinamismo)", el: document.getElementById('duos') },
    familiares: { title: "PARA 3+ (La Mancha FAITE)", el: document.getElementById('familiares') },
    extras: { title: "EXTRAS QUE SUMAN", el: document.getElementById('extras') }
  };

  // Clear previous contents and set category header
  for (const cat in categories) {
    if (categories[cat].el) {
      categories[cat].el.innerHTML = `<div class="section-title">${categories[cat].title}</div>`;
    }
  }

  products.forEach(p => {
    const container = categories[p.category]?.el;
    if (!container) return;

    const isRecommended = p.recommended ? `<div class="absolute top-3 left-3 bg-black text-white text-[9px] font-bold py-1 px-2.5 rounded-full z-10 tracking-wider">RECOMENDADO</div>` : '';
    const imageHtml = p.image ? `
      <div class="relative w-full h-[160px] overflow-hidden">
        ${isRecommended}
        <img src="${p.image}" alt="${p.name}" loading="lazy" class="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
      </div>
    ` : '';
    const descriptionHtml = p.description ? `<p class="text-gray-500 text-[13px] mb-4 leading-normal pr-10">${p.description}</p>` : '';
    const mbClass = p.description ? 'mb-1' : 'mb-4';

    const cardHtml = `
      <div class="card relative flex flex-col">
        ${imageHtml}
        <div class="p-5 flex-1 flex flex-col justify-between">
          <div>
            <div class="flex justify-between items-start ${mbClass}">
              <h3 class="font-serif font-bold text-[17px] tracking-tight">${p.name}</h3>
              <div class="text-right">
                <span class="font-serif font-bold text-[17px] block">S/ ${p.price.toFixed(2)}</span>
              </div>
            </div>
            ${descriptionHtml}
          </div>
          <div class="flex justify-end items-center gap-4 mt-auto">
            <button class="btn-circle btn-minus" onclick="updateQty('${p.id}', -1)"><span class="material-symbols-outlined text-[20px]">remove</span></button>
            <span id="qty-${p.id}" class="font-bold w-4 text-center text-[15px]">0</span>
            <button class="btn-circle btn-plus" onclick="updateQty('${p.id}', 1)"><span class="material-symbols-outlined text-[20px]">add</span></button>
          </div>
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', cardHtml);
  });
}

function renderOrdersExtrasHTML(products) {
  const container = document.getElementById('orders-extras-container');
  if (!container) return;

  container.innerHTML = `
    <div class="section-title text-center text-[11px] font-bold tracking-wider text-gray-500 uppercase my-6">EXTRAS QUE SUMAN</div>
  `;

  const extras = products.filter(p => p.category === 'extras');
  extras.forEach(p => {
    const imageHtml = p.image ? `
      <div class="relative w-full h-[160px] overflow-hidden">
        <img src="${p.image}" alt="${p.name}" loading="lazy" class="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
      </div>
    ` : '';
    const descriptionHtml = p.description ? `<p class="text-gray-500 text-[13px] mb-4 leading-normal pr-10">${p.description}</p>` : '';
    const mbClass = p.description ? 'mb-1' : 'mb-4';

    const cardHtml = `
      <div class="card relative flex flex-col">
        ${imageHtml}
        <div class="p-5 flex-1 flex flex-col justify-between">
          <div>
            <div class="flex justify-between items-start ${mbClass}">
              <h3 class="font-serif font-bold text-[17px] tracking-tight">${p.name}</h3>
              <div class="text-right">
                <span class="font-serif font-bold text-[17px] block">S/ ${p.price.toFixed(2)}</span>
              </div>
            </div>
            ${descriptionHtml}
          </div>
          <div class="flex justify-end items-center gap-4 mt-auto">
            <button class="btn-circle btn-minus" onclick="updateQty('${p.id}', -1)"><span class="material-symbols-outlined text-[20px]">remove</span></button>
            <span id="qty-orders-${p.id}" class="font-bold w-4 text-center text-[15px]">0</span>
            <button class="btn-circle btn-plus" onclick="updateQty('${p.id}', 1)"><span class="material-symbols-outlined text-[20px]">add</span></button>
          </div>
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', cardHtml);
  });
}

function updateQty(id, delta) {
  if (delta > 0) {
    if (customConfig[id]) {
      openCustomizationModal(id);
    } else {
      if (!cartDetails[id]) {
        cartDetails[id] = {
          parentId: id,
          name: names[id],
          price: prices[id],
          optionsText: ""
        };
      }
      updateCustomQty(id, 1);
    }
  } else {
    if (customConfig[id]) {
      const lastKey = getLastAddedCustomKey(id);
      if (lastKey) {
        updateCustomQty(lastKey, -1);
      }
    } else {
      updateCustomQty(id, -1);
    }
  }
}

function updateCustomQty(cartKey, delta) {
  if (!cart[cartKey]) cart[cartKey] = 0;
  cart[cartKey] += delta;
  if (cart[cartKey] < 0) cart[cartKey] = 0;

  const detail = cartDetails[cartKey] || { parentId: cartKey };
  const parentId = detail.parentId;
  const totalParentQty = getParentTotalQty(parentId);

  // Sync Menu UI
  const elMenu = document.getElementById('qty-' + parentId);
  if (elMenu) elMenu.innerText = totalParentQty;

  // Sync Orders Extras UI
  const elOrders = document.getElementById('qty-orders-' + parentId);
  if (elOrders) elOrders.innerText = totalParentQty;

  updateCartState();

  if (currentScreen === 'orders') {
    renderCartItems();
  }
}

function removeItem(cartKey) {
  cart[cartKey] = 0;

  const detail = cartDetails[cartKey] || { parentId: cartKey };
  const parentId = detail.parentId;
  const totalParentQty = getParentTotalQty(parentId);

  // Sync Menu UI
  const elMenu = document.getElementById('qty-' + parentId);
  if (elMenu) elMenu.innerText = totalParentQty;

  // Sync Orders Extras UI
  const elOrders = document.getElementById('qty-orders-' + parentId);
  if (elOrders) elOrders.innerText = totalParentQty;

  updateCartState();
  renderCartItems();
}

function getParentTotalQty(parentId) {
  let sum = 0;
  for (const k in cart) {
    if (cartDetails[k] && cartDetails[k].parentId === parentId) {
      sum += cart[k];
    } else if (k === parentId) {
      sum += cart[k];
    }
  }
  return sum;
}

function getLastAddedCustomKey(parentId) {
  let matchKeys = Object.keys(cart).filter(k => (cartDetails[k] && cartDetails[k].parentId === parentId && cart[k] > 0));
  return matchKeys.length > 0 ? matchKeys[matchKeys.length - 1] : null;
}

function updateCartState() {
  let total = 0;
  let totalItems = 0;

  for (const key in cart) {
    if (cart[key] > 0) {
      const detail = cartDetails[key] || { price: prices[key] };
      const itemPrice = detail.price || prices[key] || 0;
      total += cart[key] * itemPrice;
      totalItems += cart[key];
    }
  }

  const cartBar = document.getElementById('cart-bar');
  const cartTotal = document.getElementById('cart-total');
  const cartBadge = document.getElementById('cart-badge');
  const cartBadgePromos = document.getElementById('cart-badge-promos');

  if (total > 0) {
    if (cartBadge) {
      cartBadge.innerText = totalItems;
      cartBadge.classList.remove('hidden');
    }
    if (cartBadgePromos) {
      cartBadgePromos.innerText = totalItems;
      cartBadgePromos.classList.remove('hidden');
    }
  } else {
    if (cartBadge) cartBadge.classList.add('hidden');
    if (cartBadgePromos) cartBadgePromos.classList.add('hidden');
  }

  // Show floating cart bar only in Menu screen when total > 0
  if (total > 0 && currentScreen === 'menu') {
    if (cartTotal) cartTotal.innerText = 'S/ ' + total.toFixed(2);
    if (cartBar) cartBar.classList.remove('hidden');
  } else {
    if (cartBar) cartBar.classList.add('hidden');
  }
}

function switchScreen(screenName, el) {
  currentScreen = screenName;

  document.querySelectorAll('.main-screen').forEach(screen => {
    screen.classList.add('hidden');
  });

  const targetScreen = document.getElementById('screen-' + screenName);
  if (targetScreen) targetScreen.classList.remove('hidden');

  const bottomNav = document.querySelector('.bottom-nav');
  if (bottomNav) {
    bottomNav.style.display = 'flex';
  }

  let targetEl = el;
  if (!targetEl) {
    targetEl = document.getElementById('nav-btn-' + screenName);
  }

  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    const icon = item.querySelector('.material-symbols-outlined');
    if (icon) {
      icon.style.fontVariationSettings = "'FILL' 0";
    }
  });

  if (targetEl) {
    targetEl.classList.add('active');
    const icon = targetEl.querySelector('.material-symbols-outlined');
    if (icon) {
      icon.style.fontVariationSettings = "'FILL' 1";
    }
    // Re-position light lamp
    setTimeout(() => updateNavLampPosition(targetEl), 10);
  }

  if (screenName === 'orders') {
    renderCartItems();
  }

  updateCartState();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderCartItems() {
  const container = document.getElementById('orders-items-container');
  const emptyState = document.getElementById('orders-empty-state');
  const checkoutCard = document.getElementById('orders-checkout-card');

  if (!container) return;

  let html = '';
  let total = 0;
  let hasItems = false;

  for (const key in cart) {
    if (cart[key] > 0) {
      const detail = cartDetails[key] || { parentId: key, name: names[key], price: prices[key], optionsText: "" };
      const parentId = detail.parentId;
      const imgUrl = detail.image || images[parentId] || images[key] || "https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=120&auto=format&fit=crop&q=60";
      const itemPrice = detail.price;
      const itemName = detail.name;
      const itemOptions = detail.optionsText;

      hasItems = true;
      const itemTotal = cart[key] * itemPrice;
      total += itemTotal;

      html += `
        <div class="flex items-center gap-4 py-4 border-b border-gray-100 last:border-b-0">
            <img src="${imgUrl}" class="w-12 h-12 rounded-xl object-cover bg-gray-100 shadow-sm" />
            <div class="flex-1">
                <h4 class="font-serif font-bold text-[14px] leading-tight">${cart[key]}x ${itemName}</h4>
                ${itemOptions ? `<span class="text-xs text-amber-600 block mt-0.5">${itemOptions}</span>` : ''}
                <span class="text-gray-400 text-[11px]">S/ ${itemPrice.toFixed(2)} c/u</span>
            </div>
            <div class="flex items-center gap-2">
                <button class="btn-circle btn-minus w-7 h-7" onclick="updateCustomQty('${key}', -1)"><span class="material-symbols-outlined text-[15px]">remove</span></button>
                <span class="font-bold text-[14px] w-4 text-center">${cart[key]}</span>
                <button class="btn-circle btn-plus w-7 h-7" onclick="updateCustomQty('${key}', 1)"><span class="material-symbols-outlined text-[15px]">add</span></button>
                <button class="text-red-500 ml-1 active:scale-90 transition-all flex items-center" onclick="removeItem('${key}')">
                    <span class="material-symbols-outlined text-[20px]">delete</span>
                </button>
            </div>
        </div>
      `;
    }
  }

  if (hasItems) {
    container.innerHTML = html;
    if (emptyState) emptyState.classList.add('hidden');
    if (checkoutCard) checkoutCard.classList.remove('hidden');
    const orderTotalEl = document.getElementById('orders-total');
    if (orderTotalEl) orderTotalEl.innerText = 'S/ ' + total.toFixed(2);
  } else {
    container.innerHTML = '';
    if (emptyState) emptyState.classList.remove('hidden');
    if (checkoutCard) checkoutCard.classList.add('hidden');
  }
}

function switchTab(element, sectionId) {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
    tab.classList.add('inactive');
  });
  element.classList.remove('inactive');
  element.classList.add('active');

  document.querySelectorAll('.menu-section').forEach(section => {
    section.classList.add('hidden');
  });
  const targetSection = document.getElementById(sectionId);
  if (targetSection) targetSection.classList.remove('hidden');

  element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
}

function checkoutOrder() {
  let text = "¡Hola! Quisiera realizar el siguiente pedido en FAITE:\n\n";
  let total = 0;
  let hasItems = false;

  for (const key in cart) {
    if (cart[key] > 0) {
      hasItems = true;
      const detail = cartDetails[key] || { name: names[key], price: prices[key], optionsText: "" };
      const itemPrice = detail.price || prices[key] || 0;
      const itemName = detail.name || names[key];
      const itemOptions = detail.optionsText;
      const itemTotal = cart[key] * itemPrice;

      text += `- ${cart[key]}x ${itemName}`;
      if (itemOptions) {
        text += ` (${itemOptions})`;
      }
      text += ` (S/ ${itemPrice.toFixed(2)} c/u) = S/ ${itemTotal.toFixed(2)}\n`;
      total += itemTotal;
    }
  }

  if (!hasItems) {
    alert("Tu carrito está vacío. Por favor agrega productos.");
    return;
  }

  if (orderDeliveryType === 'scheduled') {
    if (!scheduledTime) {
      alert("Por favor selecciona una hora de entrega válida.");
      return;
    }
    text += `\n*Tipo de Entrega:* Programado para *${scheduledDate}* a las *${scheduledTime}*\n`;
  } else {
    text += `\n*Tipo de Entrega:* Entrega Inmediata\n`;
  }

  text += `\n*Total a pagar: S/ ${total.toFixed(2)}*`;

  const encodedText = encodeURIComponent(text);
  const whatsappUrl = `https://wa.me/51913952019?text=${encodedText}`;
  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');

  // Mark first purchase promo as used
  localStorage.setItem('faite_first_promo_used', 'true');
  const fpContainer = document.getElementById('promo-first-purchase-container');
  if (fpContainer) fpContainer.innerHTML = '';
}

function navigateToMenuCategory(category) {
  switchScreen('menu');
  const tabElements = document.querySelectorAll('.tabs-container .tab');
  let targetTab = null;
  tabElements.forEach(tab => {
    if (tab.getAttribute('onclick') && tab.getAttribute('onclick').includes(category)) {
      targetTab = tab;
    }
  });
  if (targetTab) {
    switchTab(targetTab, category);
  }
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function closeModalOnOverlay(event, modalId) {
  if (event.target.id === modalId) {
    closeModal(modalId);
  }
}

async function submitComplaint(event) {
  event.preventDefault();

  const name = document.getElementById('complaint-name').value;
  const dni = document.getElementById('complaint-dni').value;
  const phone = document.getElementById('complaint-phone').value;
  const email = document.getElementById('complaint-email').value;
  const type = document.getElementById('complaint-type').value;
  const details = document.getElementById('complaint-details').value;

  try {
    // 1. Submit to Backend first to get code and persist complaint data
    const response = await fetch(`${API_URL}/api/complaints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, dni, phone, email, type, details })
    });

    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(responseData.error || "No se pudo conectar con el servidor.");
    }

    const complaintCode = responseData.code;
    const dateStr = new Date(responseData.timestamp).toLocaleString('es-PE', { timeZone: 'America/Lima' });

    // 2. Generate PDF locally for user download
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // PDF Drawing
    doc.setFillColor(27, 28, 28); // #1b1c1c
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("FAITE - SABOR CON CALLE", 15, 20);
    doc.setFontSize(10);
    doc.text("HOJA DE RECLAMACIÓN VIRTUAL", 15, 30);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");

    // Reference code box
    doc.rect(140, 15, 55, 18);
    doc.setFont("helvetica", "bold");
    doc.text("CÓDIGO DE RECLAMO", 143, 21);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(190, 30, 30); // Red
    doc.text(complaintCode, 143, 27);
    doc.setTextColor(0, 0, 0);

    // Complaint datetime
    doc.setFontSize(9);
    doc.text("Fecha y Hora: " + dateStr, 15, 50);

    // Section 1: Customer Data
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("1. IDENTIFICACIÓN DEL CONSUMIDOR", 15, 65);
    doc.line(15, 67, 195, 67);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Nombre Completo: " + name, 15, 75);
    doc.text("DNI / CE: " + dni, 15, 82);
    doc.text("Teléfono: " + phone, 15, 89);
    doc.text("Correo Electrónico: " + email, 15, 96);

    // Section 2: Complaint details
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("2. DETALLE DE LA RECLAMACIÓN", 15, 110);
    doc.line(15, 112, 195, 112);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Tipo: " + (type === 'reclamo' ? 'RECLAMO (Disconformidad con el producto)' : 'QUEJA (Disconformidad con la atención)'), 15, 120);

    doc.text("Detalle o Sustento:", 15, 128);
    doc.setFont("helvetica", "italic");

    const splitDetails = doc.splitTextToSize(details, 180);
    doc.text(splitDetails, 15, 134);

    // Section 3: Legal
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("3. ACCIONES DEL PROVEEDOR", 15, 175);
    doc.line(15, 177, 195, 177);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const legalText = "Conforme a lo establecido en la Ley N° 29571 (Código de Protección y Defensa del Consumidor), el proveedor deberá dar respuesta a la reclamación en un plazo no mayor a quince (15) días hábiles improrrogables. La firma del consumidor no constituye aceptación del descargo por parte del proveedor.";
    const splitLegal = doc.splitTextToSize(legalText, 180);
    doc.text(splitLegal, 15, 184);

    doc.setFont("helvetica", "bold");
    doc.text("Establecimiento: FAITE - Chiclayo, Perú", 15, 205);

    // Save/Download the PDF file
    doc.save("Reclamacion_" + complaintCode + ".pdf");

    alert("Su reclamación ha sido registrada. Código: " + complaintCode + "\n\nSe ha descargado su copia en formato PDF de manera automática.");
    event.target.reset();
    closeModal('modal-complaints');
  } catch (err) {
    console.error("Error al procesar reclamo:", err);
    alert("Error al procesar la reclamación: " + err.message);
  }
}

// Check if store is open from the Backend (Modified to keep the 1-day advance warning banner always visible)
async function checkStoreHours() {
  try {
    const response = await fetch(`${API_URL}/api/store-status`);
    if (!response.ok) {
      throw new Error("Fallo en API de estado");
    }
    const banner = document.getElementById('hours-banner');
    if (banner) {
      banner.classList.remove('hidden');
    }
  } catch (e) {
    console.warn("No se pudo conectar a la API de horarios.", e);
    const banner = document.getElementById('hours-banner');
    if (banner) {
      banner.classList.remove('hidden');
    }
  }
}

// Sliding navbar light positioning
function updateNavLampPosition(targetEl) {
  const lamp = document.getElementById('nav-lamp');
  if (!lamp || !targetEl) return;

  const parentRect = targetEl.parentElement.getBoundingClientRect();
  const targetRect = targetEl.getBoundingClientRect();

  const relativeLeft = targetRect.left - parentRect.left;

  lamp.style.left = relativeLeft + 'px';
  lamp.style.width = targetRect.width + 'px';
  lamp.style.height = targetRect.height + 'px';
}

// Window resizing
window.addEventListener('resize', () => {
  const activeBtn = document.querySelector('.nav-item.active');
  if (activeBtn) {
    updateNavLampPosition(activeBtn);
  }
});

function setDeliveryType(type) {
  orderDeliveryType = 'scheduled';
}

function initDateSelect() {
  const dateSelect = document.getElementById('scheduled-date-select');
  if (!dateSelect) return;

  dateSelect.innerHTML = '';
  
  // Calculate current date in Peru (GMT-5)
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const peruNow = new Date(utc + (3600000 * -5));
  
  const options = { weekday: 'long', day: 'numeric', month: 'long' };
  
  for (let i = 1; i <= 7; i++) {
    const nextDate = new Date(peruNow);
    nextDate.setDate(peruNow.getDate() + i);
    
    let dayLabel = nextDate.toLocaleDateString('es-PE', options);
    // Capitalize the first letter
    dayLabel = dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1);
    
    let displayValue = dayLabel;
    if (i === 1) {
      displayValue = `Mañana (${dayLabel})`;
    }
    
    const optionValue = dayLabel;
    
    const option = document.createElement('option');
    option.value = optionValue;
    option.textContent = displayValue;
    dateSelect.appendChild(option);
  }

  scheduledDate = dateSelect.value;
}

function onScheduledDateChange() {
  const dateSelect = document.getElementById('scheduled-date-select');
  if (dateSelect) {
    scheduledDate = dateSelect.value;
    populateTimeSlots();
  }
}

// Set initial time selection on load or manual select change
function onScheduledTimeChange() {
  const timeSelect = document.getElementById('scheduled-time-select');
  if (timeSelect) {
    scheduledTime = timeSelect.value;
  }
}

// Generate the 3:00 PM - 11:00 PM time slots (every 30 mins)
function populateTimeSlots() {
  const timeSelect = document.getElementById('scheduled-time-select');
  if (!timeSelect) return;

  const slots = [
    { value: '03:00 PM', hour: 15, min: 0 },
    { value: '03:30 PM', hour: 15, min: 30 },
    { value: '04:00 PM', hour: 16, min: 0 },
    { value: '04:30 PM', hour: 16, min: 30 },
    { value: '05:00 PM', hour: 17, min: 0 },
    { value: '05:30 PM', hour: 17, min: 30 },
    { value: '06:00 PM', hour: 18, min: 0 },
    { value: '06:30 PM', hour: 18, min: 30 },
    { value: '07:00 PM', hour: 19, min: 0 },
    { value: '07:30 PM', hour: 19, min: 30 },
    { value: '08:00 PM', hour: 20, min: 0 },
    { value: '08:30 PM', hour: 20, min: 30 },
    { value: '09:00 PM', hour: 21, min: 0 },
    { value: '09:30 PM', hour: 21, min: 30 },
    { value: '10:00 PM', hour: 22, min: 0 },
    { value: '10:30 PM', hour: 22, min: 30 },
    { value: '11:00 PM', hour: 23, min: 0 }
  ];

  timeSelect.innerHTML = '';

  slots.forEach(slot => {
    const option = document.createElement('option');
    option.value = slot.value;
    option.textContent = slot.value;
    timeSelect.appendChild(option);
  });

  if (slots.length > 0) {
    scheduledTime = slots[0].value;
    timeSelect.value = scheduledTime;
  } else {
    scheduledTime = '';
  }
}

// Customization Modals functions
function openCustomizationModal(parentId) {
  currentCustomizingId = parentId;
  const config = customConfig[parentId];
  if (!config) return;

  document.getElementById('custom-modal-title').innerText = config.title;
  document.getElementById('custom-modal-subtitle').innerText = config.subtitle;

  const container = document.getElementById('custom-modal-options-container');
  if (!container) return;
  container.innerHTML = '';
  tempCustomSelection = {};

  config.options.forEach(opt => {
    tempCustomSelection[opt.key] = 0;
  });

  if (config.type === 'select-sum') {
    config.options.forEach(opt => {
      container.innerHTML += `
        <div class="flex justify-between items-center py-2">
          <span class="font-medium text-[14px] text-gray-800">${opt.label}</span>
          <div class="flex items-center gap-3">
            <button class="btn-circle btn-minus w-8 h-8" onclick="updateTempQty('${opt.key}', -1)"><span class="material-symbols-outlined text-[16px]">remove</span></button>
            <span id="temp-qty-${opt.key}" class="font-bold text-[14px] w-4 text-center">0</span>
            <button class="btn-circle btn-plus w-8 h-8" onclick="updateTempQty('${opt.key}', 1)"><span class="material-symbols-outlined text-[16px]">add</span></button>
          </div>
        </div>
      `;
    });
  } else if (config.type === 'select-one') {
    config.options.forEach((opt, idx) => {
      container.innerHTML += `
        <label class="flex justify-between items-center py-3 px-4 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
          <span class="font-medium text-[14px] text-gray-800">${opt.label}</span>
          <input type="radio" name="custom-radio" value="${opt.key}" ${idx === 0 ? 'checked' : ''} class="w-4 h-4 accent-black" />
        </label>
      `;
    });
  }

  updateCustomModalState();
  openModal('modal-customization');
}

function updateTempQty(key, delta) {
  const config = customConfig[currentCustomizingId];
  const currentSum = Object.values(tempCustomSelection).reduce((a, b) => a + b, 0);

  if (delta > 0 && currentSum >= config.targetSum) {
    return;
  }

  if (!tempCustomSelection[key]) tempCustomSelection[key] = 0;
  tempCustomSelection[key] += delta;
  if (tempCustomSelection[key] < 0) tempCustomSelection[key] = 0;

  const tempQtyEl = document.getElementById('temp-qty-' + key);
  if (tempQtyEl) tempQtyEl.innerText = tempCustomSelection[key];
  updateCustomModalState();
}

function updateCustomModalState() {
  const config = customConfig[currentCustomizingId];
  const confirmBtn = document.getElementById('custom-modal-confirm-btn');
  const statusEl = document.getElementById('custom-modal-status');

  if (!confirmBtn || !statusEl) return;

  if (config.type === 'select-sum') {
    const currentSum = Object.values(tempCustomSelection).reduce((a, b) => a + b, 0);
    statusEl.innerText = `${currentSum} / ${config.targetSum}`;
    statusEl.parentElement.classList.remove('hidden');

    if (currentSum === config.targetSum) {
      confirmBtn.disabled = false;
      confirmBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    } else {
      confirmBtn.disabled = true;
      confirmBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }
  } else if (config.type === 'select-one') {
    statusEl.parentElement.classList.add('hidden');
    confirmBtn.disabled = false;
    confirmBtn.classList.remove('opacity-50', 'cursor-not-allowed');
  }
}

function confirmCustomization() {
  const config = customConfig[currentCustomizingId];
  let selectedOpts = {};
  let optionsText = "";
  let hashParts = [];

  if (config.type === 'select-sum') {
    selectedOpts = { ...tempCustomSelection };
    const textParts = [];
    config.options.forEach(opt => {
      const qty = selectedOpts[opt.key] || 0;
      if (qty > 0) {
        textParts.push(`${qty}x ${opt.label.replace('Salsa ', '')}`);
        hashParts.push(`${opt.key}:${qty}`);
      }
    });
    optionsText = textParts.join(', ');
  } else if (config.type === 'select-one') {
    const checkedRadio = document.querySelector('input[name="custom-radio"]:checked');
    const key = checkedRadio.value;
    const opt = config.options.find(o => o.key === key);
    selectedOpts[key] = 1;
    optionsText = opt.label;
    hashParts.push(`${key}:1`);
  }

  const cartKey = `${currentCustomizingId}_${hashParts.join('_')}`;

  if (!cartDetails[cartKey]) {
    cartDetails[cartKey] = {
      parentId: currentCustomizingId,
      name: names[currentCustomizingId],
      price: prices[currentCustomizingId],
      optionsText: optionsText
    };
  }

  updateCustomQty(cartKey, 1);
  closeModal('modal-customization');
}

// =========================================
// PROMOTIONS SYSTEM
// =========================================

async function loadPromos() {
  try {
    const response = await fetch(`${API_URL}/api/promos`);
    if (!response.ok) throw new Error('Could not load promos');
    const data = await response.json();
    const activePromos = filterPromos(data.promos || []);
    renderPromos(activePromos);
  } catch (e) {
    console.warn('Promos could not be loaded:', e);
    // Show empty state gracefully
    const emptyState = document.getElementById('promos-empty-state');
    if (emptyState) emptyState.classList.remove('hidden');
  }
}

function filterPromos(promos) {
  const now = new Date();
  
  return promos.filter(promo => {
    if (!promo.active) return false;
    
    switch (promo.type) {
      case 'first_purchase':
        return localStorage.getItem('faite_first_promo_used') !== 'true';
      
      case 'time_limited':
        if (promo.startDate && new Date(promo.startDate) > now) return false;
        if (promo.endDate && new Date(promo.endDate + 'T23:59:59') < now) return false;
        return true;
      
      case 'permanent':
      default:
        return true;
    }
  });
}

function renderPromos(promos) {
  const fpContainer = document.getElementById('promo-first-purchase-container');
  const promosContainer = document.getElementById('promos-container');
  const emptyState = document.getElementById('promos-empty-state');
  
  if (!promosContainer) return;
  
  // Separate first_purchase promo from the rest
  const firstPurchasePromo = promos.find(p => p.type === 'first_purchase');
  const regularPromos = promos.filter(p => p.type !== 'first_purchase');
  
  // Render first purchase card (special placement)
  if (fpContainer && firstPurchasePromo) {
    fpContainer.innerHTML = renderFirstPurchaseCard(firstPurchasePromo);
  }
  
  // Render regular promo cards
  if (regularPromos.length > 0) {
    promosContainer.innerHTML = regularPromos.map(promo => {
      if (promo.id === 'fidelidad') return renderLoyaltyCard(promo);
      if (promo.id === 'happy_hour') return renderHappyHourCard(promo);
      return renderPromoCard(promo);
    }).join('');
  }
  
  // Show/hide empty state
  const totalVisible = (firstPurchasePromo ? 1 : 0) + regularPromos.length;
  if (emptyState) {
    if (totalVisible === 0) {
      emptyState.classList.remove('hidden');
    } else {
      emptyState.classList.add('hidden');
    }
  }
}

function renderFirstPurchaseCard(promo) {
  const conditionsHtml = (promo.conditions || []).map(c => `<li>${c}</li>`).join('');
  
  return `
    <div class="promo-first-purchase" id="promo-fp-card">
      <div class="relative z-10">
        <span class="promo-badge" style="background: #B45309;">
          <span class="material-symbols-outlined" style="font-size: 11px;">${promo.icon}</span>
          ${promo.badge}
        </span>
        <h3 class="promo-card-title">${promo.title}</h3>
        <p class="promo-card-subtitle">${promo.subtitle}</p>
        <p class="promo-card-desc">${promo.description}</p>
        ${promo.code ? `
          <div class="promo-code-box">
            <span class="promo-code-label">Código:</span>
            <span>${promo.code}</span>
          </div>
        ` : ''}
        <ul class="promo-conditions">${conditionsHtml}</ul>
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <button class="promo-cta" onclick="switchScreen('menu')">
            <span class="material-symbols-outlined" style="font-size: 15px;">restaurant</span>
            VER MENÚ
          </button>
          <button class="promo-dismiss" onclick="dismissFirstPurchasePromo()">
            Ya no me interesa
          </button>
        </div>
      </div>
    </div>
  `;
}

function getPromoGradient(hex) {
  const map = {
    '#3B82F6': 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
    '#EF4444': 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)',
    '#8B5CF6': 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
    '#F97316': 'linear-gradient(135deg, #F97316 0%, #C2410C 100%)',
    '#EC4899': 'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)',
    '#10B981': 'linear-gradient(135deg, #10B981 0%, #047857 100%)',
    '#E11D48': 'linear-gradient(135deg, #E11D48 0%, #9F1239 100%)',
    '#F59E0B': 'linear-gradient(135deg, #F59E0B 0%, #B45309 100%)'
  };
  return map[hex] || `linear-gradient(135deg, ${hex} 0%, #1b1c1c 100%)`;
}

function togglePromoDetails(promoId) {
  const details = document.getElementById(`promo-details-${promoId}`);
  const btn = document.getElementById(`promo-toggle-${promoId}`);
  if (!details) return;
  
  const isExpanded = details.classList.contains('expanded');
  if (isExpanded) {
    details.classList.remove('expanded');
    if (btn) btn.classList.remove('expanded');
  } else {
    details.classList.add('expanded');
    if (btn) btn.classList.add('expanded');
  }
}

function renderPromoCard(promo) {
  const conditionsHtml = (promo.conditions || []).map(c => `<li>${c}</li>`).join('');
  const priceHtml = promo.promoPrice ? `<div class="promo-price">${promo.promoPrice}</div>` : '';
  const gradient = getPromoGradient(promo.highlight);
  
  let timeBadgeHtml = '';
  if (promo.type === 'time_limited' && promo.endDate) {
    timeBadgeHtml = `
      <div class="promo-time-badge">
        <span class="material-symbols-outlined">timer</span>
        Válido hasta ${formatPromoDate(promo.endDate)}
      </div>
    `;
  }
  
  return `
    <div class="promo-card" style="background: ${gradient};">
      <div class="promo-card-circle"></div>
      <div class="promo-card-circle-sm"></div>
      <div class="promo-card-body">
        <div class="promo-card-top">
          <div class="promo-card-icon">
            <span class="material-symbols-outlined">${promo.icon}</span>
          </div>
          <div class="promo-card-info">
            <span class="promo-badge">${promo.badge}</span>
            ${timeBadgeHtml}
            <h3 class="promo-card-title">${promo.title}</h3>
            <p class="promo-card-subtitle">${promo.subtitle}</p>
          </div>
          ${priceHtml}
        </div>
        <div class="promo-card-actions">
          <button class="promo-cta" onclick="promoOrderWhatsApp('${promo.id}', '${promo.title}')">
            <span class="material-symbols-outlined" style="font-size: 15px;">shopping_bag</span>
            PEDIR PROMO
          </button>
          <button class="promo-details-toggle" id="promo-toggle-${promo.id}" onclick="togglePromoDetails('${promo.id}')">
            <span>Detalles</span>
            <span class="material-symbols-outlined">expand_more</span>
          </button>
        </div>
      </div>
      <div class="promo-card-details" id="promo-details-${promo.id}">
        <p>${promo.description}</p>
        ${promo.code ? `
          <div class="promo-code-box">
            <span class="promo-code-label">Código:</span>
            <span>${promo.code}</span>
          </div>
        ` : ''}
        ${conditionsHtml ? `<ul class="promo-conditions">${conditionsHtml}</ul>` : ''}
      </div>
    </div>
  `;
}

function renderHappyHourCard(promo) {
  const conditionsHtml = (promo.conditions || []).map(c => `<li>${c}</li>`).join('');
  const gradient = getPromoGradient(promo.highlight);
  
  // Check if currently in happy hour (3PM-5PM Peru time)
  const now = new Date();
  const peruOffset = -5;
  const utcHour = now.getUTCHours();
  const peruHour = (utcHour + peruOffset + 24) % 24;
  const isHappyHour = peruHour >= 15 && peruHour < 17;
  
  const statusHtml = isHappyHour 
    ? `<div class="promo-happy-active"><span class="material-symbols-outlined" style="font-size: 12px;">circle</span> ¡ACTIVO AHORA!</div>`
    : `<div class="promo-happy-inactive"><span class="material-symbols-outlined" style="font-size: 12px;">schedule</span> 3PM a 5PM</div>`;
  
  return `
    <div class="promo-card" style="background: ${gradient};">
      <div class="promo-card-circle"></div>
      <div class="promo-card-circle-sm"></div>
      <div class="promo-card-body">
        <div class="promo-card-top">
          <div class="promo-card-icon">
            <span class="material-symbols-outlined">${promo.icon}</span>
          </div>
          <div class="promo-card-info">
            <span class="promo-badge">${promo.badge}</span>
            ${statusHtml}
            <h3 class="promo-card-title">${promo.title}</h3>
            <p class="promo-card-subtitle">${promo.subtitle}</p>
          </div>
        </div>
        <div class="promo-card-actions">
          <button class="promo-cta" onclick="promoOrderWhatsApp('${promo.id}', '${promo.title}')">
            <span class="material-symbols-outlined" style="font-size: 15px;">shopping_bag</span>
            PEDIR PROMO
          </button>
          <button class="promo-details-toggle" id="promo-toggle-${promo.id}" onclick="togglePromoDetails('${promo.id}')">
            <span>Detalles</span>
            <span class="material-symbols-outlined">expand_more</span>
          </button>
        </div>
      </div>
      <div class="promo-card-details" id="promo-details-${promo.id}">
        <p>${promo.description}</p>
        ${conditionsHtml ? `<ul class="promo-conditions">${conditionsHtml}</ul>` : ''}
      </div>
    </div>
  `;
}

function renderLoyaltyCard(promo) {
  const conditionsHtml = (promo.conditions || []).map(c => `<li>${c}</li>`).join('');
  const gradient = getPromoGradient(promo.highlight);
  
  // Build the 5 + 1 loyalty dots visual
  let dotsHtml = '';
  for (let i = 1; i <= 5; i++) {
    dotsHtml += `<div class="promo-loyalty-dot">${i}</div>`;
    if (i < 5) dotsHtml += `<span class="promo-loyalty-arrow">›</span>`;
  }
  dotsHtml += `<span class="promo-loyalty-arrow">›</span>`;
  dotsHtml += `<div class="promo-loyalty-dot gift"><span class="material-symbols-outlined" style="font-size: 16px;">redeem</span></div>`;
  
  return `
    <div class="promo-card" style="background: ${gradient};">
      <div class="promo-card-circle"></div>
      <div class="promo-card-circle-sm"></div>
      <div class="promo-card-body">
        <div class="promo-card-top">
          <div class="promo-card-icon">
            <span class="material-symbols-outlined">${promo.icon}</span>
          </div>
          <div class="promo-card-info">
            <span class="promo-badge">${promo.badge}</span>
            <h3 class="promo-card-title">${promo.title}</h3>
            <p class="promo-card-subtitle">${promo.subtitle}</p>
          </div>
        </div>
        <div class="promo-card-actions">
          <button class="promo-cta" onclick="promoOrderWhatsApp('${promo.id}', '${promo.title}')">
            <span class="material-symbols-outlined" style="font-size: 15px;">chat</span>
            MI PROGRESO
          </button>
          <button class="promo-details-toggle" id="promo-toggle-${promo.id}" onclick="togglePromoDetails('${promo.id}')">
            <span>Detalles</span>
            <span class="material-symbols-outlined">expand_more</span>
          </button>
        </div>
      </div>
      <div class="promo-card-details" id="promo-details-${promo.id}">
        <p>${promo.description}</p>
        <div class="promo-loyalty-dots">${dotsHtml}</div>
        ${conditionsHtml ? `<ul class="promo-conditions">${conditionsHtml}</ul>` : ''}
      </div>
    </div>
  `;
}

function dismissFirstPurchasePromo() {
  localStorage.setItem('faite_first_promo_used', 'true');

  // Close the popup modal if open
  closeModal('modal-first-promo');

  // Also remove the card from promos section if present
  const fpCard = document.getElementById('promo-fp-card');
  if (fpCard) {
    fpCard.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    fpCard.style.opacity = '0';
    fpCard.style.transform = 'translateY(-10px)';
    setTimeout(() => {
      const container = document.getElementById('promo-first-purchase-container');
      if (container) container.innerHTML = '';
      // Check if we still have other promos visible
      const promosContainer = document.getElementById('promos-container');
      const emptyState = document.getElementById('promos-empty-state');
      if (promosContainer && promosContainer.children.length === 0 && emptyState) {
        emptyState.classList.remove('hidden');
      }
    }, 400);
  }
}

function showFirstPurchasePopup() {
  if (localStorage.getItem('faite_first_promo_used') === 'true') return;
  if (window._firstPromoScheduled) return;
  window._firstPromoScheduled = true;

  // Show after 30 seconds of browsing so it's not invasive
  setTimeout(() => {
    // Only show if user hasn't dismissed it in the meantime
    if (localStorage.getItem('faite_first_promo_used') !== 'true') {
      openModal('modal-first-promo');
    }
  }, 30000);
}

// Schedule the popup once the app loads (runs once)
if (localStorage.getItem('faite_first_promo_used') !== 'true') {
  document.addEventListener('DOMContentLoaded', () => {
    showFirstPurchasePopup();
  });
}

function promoOrderWhatsApp(promoId, promoTitle) {
  const text = `¡Hola! Me interesa la promoción *"${promoTitle}"* que vi en su página web. ¿Podrían darme más detalles para pedirla?`;
  const encodedText = encodeURIComponent(text);
  const whatsappUrl = `https://wa.me/51913952019?text=${encodedText}`;
  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
}

function formatPromoDate(dateStr) {
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
