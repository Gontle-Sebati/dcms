// ==================================================
// DCMS Interactive Tour
// Shows once per user per role
// ==================================================

const TOURS = {
  ADMIN: [
    { icon: '👋', title: 'Welcome, Admin!', text: 'This is your control center. From here you manage the whole clinic.' },
    { icon: '📊', title: 'Reports & Charts', text: 'Click "Reports" to see live statistics — appointments, queue, stock, and staff.' },
    { icon: '👥', title: 'Manage Staff', text: 'Go to "Admin Panel" to add doctors, nurses, receptionists, and pharmacists.' },
    { icon: '💊', title: 'Pharmacy Oversight', text: 'Open "Pharmacy" to see medication stock and low-stock alerts.' }
  ],
  DOCTOR: [
    { icon: '👋', title: 'Welcome, Doctor!', text: 'This is your clinical workspace.' },
    { icon: '⏳', title: 'Approve Appointments', text: 'Pending appointment requests appear on the "Doctor Panel". Click Approve or Decline.' },
    { icon: '📝', title: 'Write Records', text: 'In "Medical Records", search for a patient and add a diagnosis. Full history is shown.' },
    { icon: '🔔', title: 'Auto-Notifications', text: 'When you approve, the patient sees an orange notification banner the next time they log in.' }
  ],
  NURSE: [
    { icon: '👋', title: 'Welcome, Nurse!', text: 'This is your triage workspace.' },
    { icon: '🩺', title: 'Triage Patients', text: 'On "Triage", search a patient, capture vitals, and assign priority: Red, Orange, Yellow, or Green.' },
    { icon: '🚦', title: 'Priority Colours', text: 'Red = Emergency, Orange = Urgent, Yellow = Semi-urgent, Green = Stable. The queue reorders automatically.' },
    { icon: '📋', title: 'Live Queue', text: 'See all waiting patients in "Live Queue". Click "Mark Served" when they are seen.' }
  ],
  PHARMACIST: [
    { icon: '👋', title: 'Welcome, Pharmacist!', text: 'This is your pharmacy dashboard.' },
    { icon: '💊', title: 'Manage Stock', text: 'See all medications with current stock levels. Low-stock items show a red badge.' },
    { icon: '➕', title: 'Add or Deduct', text: 'Use the "+ Add" field to add new stock or enter a negative number (e.g., -10) to dispense.' },
    { icon: '⚠️', title: 'Auto-Alerts', text: 'The system automatically flags medications below their minimum threshold.' }
  ],
  RECEPTIONIST: [
    { icon: '👋', title: 'Welcome, Receptionist!', text: 'This is your front-desk workspace.' },
    { icon: '👤', title: 'Register Patients', text: 'Use "Triage" or the patient form to register walk-in patients on their behalf.' },
    { icon: '📅', title: 'Manage Appointments', text: 'View today\'s appointments and check patients in on arrival.' },
    { icon: '📋', title: 'Live Queue', text: 'See the real-time queue to inform waiting patients about position.' }
  ],
  PATIENT: [
    { icon: '👋', title: 'Welcome to City Clinic!', text: 'This is your personal health portal. Everything is private and secure.' },
    { icon: '📅', title: 'Book Appointments', text: 'Choose a doctor, date, and time. Click "Request Appointment" and you\'re done.' },
    { icon: '🔔', title: 'Get Notified', text: 'When the doctor approves, you\'ll see an orange notification banner at the top of this page.' },
    { icon: '📋', title: 'Track Your Visits', text: 'All your appointments and their statuses appear in "My Appointments" below.' }
  ]
};

function startTour() {
  const user = JSON.parse(localStorage.getItem('dcms_user') || '{}');
  if (!user.role) return;

  // Check if tour already completed
  const tourKey = `dcms_tour_done_${user.role}_${user.id}`;
  if (localStorage.getItem(tourKey) === 'yes') return;

  const tour = TOURS[user.role] || TOURS.PATIENT;
  if (!tour || tour.length === 0) return;

  let index = 0;

  // Create modal
  const modal = document.createElement('div');
  modal.id = 'tourModal';
  modal.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,0.7);
    z-index: 99999; display: flex; align-items: center; justify-content: center;
    padding: 1rem; animation: fadeIn 0.3s ease;
  `;
  modal.innerHTML = `
    <div style="background:#fff;max-width:480px;width:100%;border-radius:20px;padding:2.5rem 2rem;text-align:center;box-shadow:0 30px 80px rgba(0,0,0,0.5);animation:slideUp 0.4s ease">
      <div id="tourIcon" style="font-size:4rem;margin-bottom:1rem">👋</div>
      <h2 id="tourTitle" style="color:#0f2a4a;font-size:1.5rem;margin-bottom:0.8rem;font-weight:800"></h2>
      <p id="tourText" style="color:#4a5568;font-size:1rem;line-height:1.6;margin-bottom:2rem"></p>
      <div id="tourDots" style="display:flex;justify-content:center;gap:0.4rem;margin-bottom:1.8rem"></div>
      <div style="display:flex;gap:0.8rem;justify-content:center">
        <button onclick="tourSkip()" style="background:transparent;border:2px solid #cbd5e0;color:#4a5568;padding:0.8rem 1.5rem;border-radius:10px;font-weight:600;cursor:pointer;font-size:0.9rem">Skip</button>
        <button id="tourNext" onclick="tourNext()" style="background:#0d9488;border:none;color:#fff;padding:0.8rem 2rem;border-radius:10px;font-weight:600;cursor:pointer;font-size:0.9rem">Next →</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
    @keyframes slideUp { from { transform: translateY(30px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
  `;
  document.head.appendChild(style);

  function render() {
    const step = tour[index];
    document.getElementById('tourIcon').textContent = step.icon;
    document.getElementById('tourTitle').textContent = step.title;
    document.getElementById('tourText').textContent = step.text;

    // Dots
    const dots = tour.map((_, i) =>
      `<div style="width:8px;height:8px;border-radius:50%;background:${i === index ? '#0d9488' : '#cbd5e0'}"></div>`
    ).join('');
    document.getElementById('tourDots').innerHTML = dots;

    // Last step button text
    document.getElementById('tourNext').textContent = index === tour.length - 1 ? 'Get Started ✓' : 'Next →';
  }

  window.tourNext = function () {
    if (index < tour.length - 1) {
      index++;
      render();
    } else {
      finishTour(tourKey);
    }
  };

  window.tourSkip = function () {
    finishTour(tourKey);
  };

  function finishTour(key) {
    localStorage.setItem(key, 'yes');
    modal.remove();
  }

  render();
}

// Auto-start on page load
window.addEventListener('load', () => {
  setTimeout(startTour, 800); // slight delay so the page renders first
});