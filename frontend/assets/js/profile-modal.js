/**
 * Next Gen University - Institutional Digital Identity & 3D Lanyard Modal
 * Leverages React Bits <Lanyard /> Three.js physics engine to provide
 * realistic interactive 3D ID badge simulation with real-time finishes and textures.
 */

(function () {
  'use strict';

  let lanyardInstance = null;
  let activeFinish = 'holographic';
  let cachedFrontCanvas = null;
  let cachedBackCanvas = null;

  // Retrieve current active user profile
  function getUserData() {
    let user = null;
    try {
      const stored = localStorage.getItem('user');
      if (stored) user = JSON.parse(stored);
    } catch (e) {
      console.warn('Could not parse user from localStorage', e);
    }

    if (!user) {
      // Fallback from DOM or default
      const nameEl = document.querySelector('#studentTopbarName, #staffTopbarName, #sidebar-user-name, #parentTopbarName');
      const metaEl = document.querySelector('#studentTopbarRegNo, #staffTopbarRole, #sidebar-user-role, #parentTopbarMeta');
      user = {
        name: nameEl ? nameEl.textContent.trim() : 'Academic Member',
        role: window.location.pathname.includes('/staff') ? 'staff'
            : window.location.pathname.includes('/admin') ? 'admin'
            : window.location.pathname.includes('/parent') ? 'parent'
            : 'student',
        regNo: metaEl ? metaEl.textContent.trim() : 'NGU-2026-001',
        department: 'Computer Science & Engineering',
        email: 'member@nextgen.edu'
      };
    }

    const name = user.name || user.displayName || user.username || 'Academic Member';
    const role = (user.role || 'student').toLowerCase();
    const regNo = user.registerNumber || user.regNo || user.employeeCode || user.empId || (role === 'student' ? '22BCS108' : role === 'staff' ? 'EMP-CS-409' : 'ADM-SEC-01');
    const department = user.department || (role === 'student' ? 'Computer Science & Engineering' : role === 'staff' ? 'School of Computing' : 'Academic Administration');
    const email = user.email || `${user.username || 'student'}@nextgen.edu`;

    return { name, role, regNo, department, email, username: user.username || 'user' };
  }

  // Generate crisp 1024x1440 institutional ID card texture for Three.js
  function generateIdCardTexture(user, side) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1440;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const W = canvas.width;
    const H = canvas.height;

    // Helper: draw rounded rectangle
    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }

    if (side === 'front') {
      // 1. Sleek Gradient Card Background
      const bgGrad = ctx.createLinearGradient(0, 0, W, H);
      bgGrad.addColorStop(0, '#090d16');
      bgGrad.addColorStop(0.3, '#101726');
      bgGrad.addColorStop(0.7, '#141e33');
      bgGrad.addColorStop(1, '#070a12');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Subtle decorative geometric matrix
      ctx.strokeStyle = 'rgba(20, 184, 166, 0.04)';
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y < H; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      // Outer accent border
      ctx.strokeStyle = 'rgba(45, 212, 191, 0.25)';
      ctx.lineWidth = 6;
      roundRect(16, 16, W - 32, H - 32, 38);
      ctx.stroke();

      // Punch slot guide (top center)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 3;
      roundRect(W / 2 - 95, 42, 190, 36, 18);
      ctx.fill();
      ctx.stroke();

      // Top Header Ribbon Banner
      const headerGrad = ctx.createLinearGradient(40, 100, W - 40, 240);
      headerGrad.addColorStop(0, '#0d9488');
      headerGrad.addColorStop(1, '#2563eb');
      roundRect(40, 96, W - 80, 140, 22);
      ctx.fillStyle = headerGrad;
      ctx.fill();

      // University Crest & Typography
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.font = '900 36px "Inter", "Segoe UI", sans-serif';
      ctx.letterSpacing = '2px';
      ctx.fillText('NEXT GENERATION UNIVERSITY', W / 2, 155);

      ctx.font = '600 19px "Inter", "Segoe UI", sans-serif';
      ctx.fillStyle = '#ccfbf1';
      ctx.letterSpacing = '4px';
      ctx.fillText('ACCREDITED "A++" GRADE  •  ESTD. 2024', W / 2, 195);

      // Gold divider stripe
      const stripeGrad = ctx.createLinearGradient(40, 0, W - 40, 0);
      stripeGrad.addColorStop(0, '#f59e0b');
      stripeGrad.addColorStop(0.5, '#fbbf24');
      stripeGrad.addColorStop(1, '#d97706');
      ctx.fillStyle = stripeGrad;
      ctx.fillRect(40, 236, W - 80, 6);

      // Portrait Photo Frame (Center)
      const photoSize = 340;
      const photoX = (W - photoSize) / 2;
      const photoY = 280;

      // Outer glowing ring
      ctx.save();
      ctx.shadowColor = 'rgba(20, 184, 166, 0.4)';
      ctx.shadowBlur = 25;
      ctx.strokeStyle = '#2dd4bf';
      ctx.lineWidth = 7;
      roundRect(photoX, photoY, photoSize, photoSize, 40);
      ctx.stroke();
      ctx.restore();

      // Photo background fill
      const avatarGrad = ctx.createLinearGradient(photoX, photoY, photoX + photoSize, photoY + photoSize);
      avatarGrad.addColorStop(0, '#1e293b');
      avatarGrad.addColorStop(1, '#0f172a');
      roundRect(photoX + 5, photoY + 5, photoSize - 10, photoSize - 10, 36);
      ctx.fillStyle = avatarGrad;
      ctx.fill();

      // Stylized Initials Monogram
      const initials = (user.name || 'NG')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(w => w[0].toUpperCase())
        .join('');

      ctx.font = '900 130px "Inter", "Segoe UI", sans-serif';
      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(initials || 'NG', W / 2, photoY + photoSize / 2);

      // User Full Name
      ctx.textBaseline = 'alphabetic';
      ctx.font = '900 44px "Inter", "Segoe UI", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      const cleanName = (user.name || 'Academic Member').toUpperCase();
      ctx.fillText(cleanName, W / 2, 690);

      // Role Pill Ribbon
      const roleText = (user.role || 'STUDENT').toUpperCase();
      const roleGrad = ctx.createLinearGradient(W / 2 - 140, 715, W / 2 + 140, 765);
      if (user.role === 'admin') {
        roleGrad.addColorStop(0, '#dc2626');
        roleGrad.addColorStop(1, '#f97316');
      } else if (user.role === 'staff') {
        roleGrad.addColorStop(0, '#7c3aed');
        roleGrad.addColorStop(1, '#a855f7');
      } else if (user.role === 'parent') {
        roleGrad.addColorStop(0, '#059669');
        roleGrad.addColorStop(1, '#10b981');
      } else {
        roleGrad.addColorStop(0, '#0284c7');
        roleGrad.addColorStop(1, '#06b6d4');
      }
      roundRect(W / 2 - 170, 715, 340, 52, 26);
      ctx.fillStyle = roleGrad;
      ctx.fill();
      ctx.font = '800 22px "Inter", "Segoe UI", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.letterSpacing = '3px';
      ctx.fillText(roleText + ' CREDENTIAL', W / 2, 750);

      // Spec Details Box
      const boxY = 800;
      roundRect(60, boxY, W - 120, 360, 24);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();

      // Spec Lines
      const items = [
        { label: 'IDENTIFICATION NO.', value: user.regNo || 'NGU-2026-9041' },
        { label: 'DEPARTMENT / SCHOOL', value: user.department || 'Computer Science' },
        { label: 'INSTITUTIONAL EMAIL', value: user.email || 'member@nextgen.edu' },
        { label: 'VALIDITY TENURE', value: '2024 — 2028  |  SESSION A' }
      ];

      items.forEach((item, idx) => {
        const rowY = boxY + 48 + idx * 78;
        ctx.textAlign = 'left';
        ctx.font = '700 18px "Inter", "Segoe UI", sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.letterSpacing = '1.5px';
        ctx.fillText(item.label, 90, rowY);

        ctx.font = '800 25px "Inter", "Segoe UI", sans-serif';
        ctx.fillStyle = '#f8fafc';
        ctx.letterSpacing = '0.5px';
        ctx.fillText(item.value, 90, rowY + 30);
      });

      // Bottom Security Bar: Smart Chip & Hologram Seal
      const bottomY = 1200;

      // Smart Chip Vector
      roundRect(80, bottomY, 150, 110, 16);
      const chipGrad = ctx.createLinearGradient(80, bottomY, 230, bottomY + 110);
      chipGrad.addColorStop(0, '#f59e0b');
      chipGrad.addColorStop(0.5, '#fde68a');
      chipGrad.addColorStop(1, '#d97706');
      ctx.fillStyle = chipGrad;
      ctx.fill();
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Chip contact traces
      ctx.strokeStyle = 'rgba(146, 64, 14, 0.7)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(80, bottomY + 55); ctx.lineTo(230, bottomY + 55);
      ctx.moveTo(155, bottomY); ctx.lineTo(155, bottomY + 110);
      ctx.moveTo(110, bottomY + 25); ctx.lineTo(200, bottomY + 25);
      ctx.moveTo(110, bottomY + 85); ctx.lineTo(200, bottomY + 85);
      ctx.stroke();

      // Contactless NFC Symbol
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      for (let r = 16; r <= 36; r += 10) {
        ctx.beginPath();
        ctx.arc(280, bottomY + 55, r, -Math.PI / 3, Math.PI / 3);
        ctx.stroke();
      }

      // Security Seal Stamp (Right)
      const sealX = W - 150;
      const sealY = bottomY + 55;
      ctx.save();
      ctx.beginPath();
      ctx.arc(sealX, sealY, 52, 0, Math.PI * 2);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(sealX, sealY, 44, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = '800 13px "Inter", "Segoe UI", sans-serif';
      ctx.fillStyle = '#34d399';
      ctx.textAlign = 'center';
      ctx.fillText('VERIFIED', sealX, sealY - 4);
      ctx.font = '700 11px "Inter", "Segoe UI", sans-serif';
      ctx.fillText('AUTHENTIC', sealX, sealY + 14);
      ctx.restore();

      // Bottom Microtext security line
      ctx.font = '600 13px "Courier New", monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.textAlign = 'center';
      ctx.fillText('NGU • ENCRYPTED ID: ' + btoa(user.regNo + user.role).slice(0, 24) + ' • SECURE BIOMETRIC NFC LINK', W / 2, H - 35);

    } else {
      // BACK OF ID CARD
      const bgGrad = ctx.createLinearGradient(0, 0, W, H);
      bgGrad.addColorStop(0, '#090d16');
      bgGrad.addColorStop(0.5, '#121927');
      bgGrad.addColorStop(1, '#070a12');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Outer accent border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 6;
      roundRect(16, 16, W - 32, H - 32, 38);
      ctx.stroke();

      // Magnetic Stripe across top
      ctx.fillStyle = '#05070a';
      ctx.fillRect(0, 90, W, 140);
      const magGrad = ctx.createLinearGradient(0, 90, W, 90);
      magGrad.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
      magGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.18)');
      magGrad.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
      ctx.fillStyle = magGrad;
      ctx.fillRect(0, 150, W, 20);

      // Punch slot guide (top center)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 3;
      roundRect(W / 2 - 95, 42, 190, 36, 18);
      ctx.fill();
      ctx.stroke();

      // Terms of Institutional ID
      roundRect(60, 260, W - 120, 290, 20);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = '800 20px "Inter", "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('INSTITUTIONAL TERMS & GUIDELINES', 90, 305);

      const terms = [
        '1. This digital credential remains the property of Next Generation University.',
        '2. Cardholder is bound by the university academic code of conduct.',
        '3. If found, please return to: Office of Academic Affairs & Registrar, Building 4.',
        '4. 24/7 Security Helpline: +1 (800) 555-0199  |  security@nextgen.edu',
        '5. Unauthorized duplication or alteration is strictly prohibited and subject to law.'
      ];

      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 17px "Inter", "Segoe UI", sans-serif';
      terms.forEach((term, i) => {
        ctx.fillText(term, 90, 345 + i * 36);
      });

      // Simulated Code 128 Barcode
      const barY = 600;
      roundRect(60, barY, W - 120, 230, 20);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Draw crisp vector barcode bars
      const barStartX = 110;
      const barW = W - 220;
      const barcodeData = [
        2, 1, 3, 1, 1, 4, 2, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 1, 2, 3, 1, 4, 2,
        1, 3, 2, 1, 4, 1, 2, 3, 2, 1, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 4, 1, 3,
        2, 1, 3, 2, 4, 1, 2, 1, 3, 4, 1, 2, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3
      ];
      let curX = barStartX;
      ctx.fillStyle = '#000000';
      const unitW = barW / 180;
      barcodeData.forEach((w, i) => {
        const isBar = i % 2 === 0;
        if (isBar) {
          ctx.fillRect(curX, barY + 30, w * unitW, 110);
        }
        curX += w * unitW;
      });

      // Barcode serial label
      ctx.font = '700 24px "Courier New", monospace';
      ctx.fillStyle = '#1e293b';
      ctx.textAlign = 'center';
      ctx.fillText('* NGU - ' + (user.regNo || '22BCS108') + ' *', W / 2, barY + 185);

      // Official Signatory Section
      const sigY = 900;
      roundRect(60, sigY, W - 120, 230, 20);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();

      // Signature Stamp
      ctx.font = 'italic 700 48px "Brush Script MT", "Caveat", "Segoe Script", cursive';
      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'center';
      ctx.fillText('Dr. Julian Vance, Ph.D.', W / 2, sigY + 110);

      // Signature rule line
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(W / 2 - 200, sigY + 135);
      ctx.lineTo(W / 2 + 200, sigY + 135);
      ctx.stroke();

      ctx.font = '700 18px "Inter", "Segoe UI", sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.letterSpacing = '1px';
      ctx.fillText('REGISTRAR & CONTROLLER OF EXAMINATIONS', W / 2, sigY + 175);

      // Bottom Digital Fingerprint
      ctx.font = '600 14px "Courier New", monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.textAlign = 'center';
      ctx.fillText('SHA-256 DIGITAL CHECKSUM: 9f8a3c8e42d7b1a0e9c8a7b6d5e4f3a2b1c0d9e8', W / 2, H - 45);
    }

    return canvas;
  }

  // Generate repeating fabric strap texture with University branding
  function generateLanyardStrapTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 192;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    // Deep modern navy/teal ribbon strap
    const grad = ctx.createLinearGradient(0, 0, 192, 0);
    grad.addColorStop(0, '#042f2e');
    grad.addColorStop(0.15, '#0f766e');
    grad.addColorStop(0.85, '#0f766e');
    grad.addColorStop(1, '#042f2e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 192, 1024);

    // Stitched edge lines
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 8]);
    ctx.beginPath();
    ctx.moveTo(14, 0); ctx.lineTo(14, 1024);
    ctx.moveTo(178, 0); ctx.lineTo(178, 1024);
    ctx.stroke();
    ctx.setLineDash([]);

    // Vertical repeating text
    ctx.save();
    ctx.translate(96, 512);
    ctx.rotate(-Math.PI / 2);
    ctx.font = '900 32px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.letterSpacing = '6px';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const text = '★ NEXT GEN UNIVERSITY ★ ACADEMIC EXCELLENCE ★';
    ctx.fillText(text, 0, 0);
    ctx.restore();

    return canvas;
  }

  // Create or return existing modal element
  function ensureModalElement() {
    let modalBackdrop = document.getElementById('institutionalProfileModal');
    if (modalBackdrop) return modalBackdrop;

    const modalHtml = `
      <div class="institutional-profile-modal-backdrop" id="institutionalProfileModal" role="dialog" aria-modal="true" aria-labelledby="profileModalTitle">
        <div class="institutional-profile-modal-card">
          <!-- Header -->
          <div class="institutional-profile-modal-header">
            <h2 class="institutional-profile-modal-title" id="profileModalTitle">
              <i class="fa-solid fa-id-card-clip"></i>
              <span>Digital Identity & Lanyard</span>
              <span class="profile-physx-badge">
                <span class="physx-dot"></span> 3D Phys-X Pendulum
              </span>
            </h2>
            <button class="institutional-profile-modal-close" onclick="closeProfileModal()" aria-label="Close Profile Modal">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>

          <!-- Body -->
          <div class="institutional-profile-modal-body">
            <!-- Left: 3D Lanyard Interactive Viewport -->
            <div class="profile-lanyard-stage">
              <div class="profile-lanyard-hint">
                <i class="fa-solid fa-hand-pointer"></i> Drag to sway & swing &bull; Click to flip
              </div>
              <div class="profile-lanyard-viewport" id="profileLanyardContainer">
                <!-- 3D Three.js canvas dynamically injected here -->
              </div>
              <div class="profile-lanyard-toolbar">
                <button class="profile-lanyard-btn" id="lanyardFlipBtn" onclick="flipLanyardCard()" title="Flip between Front and Back sides">
                  <i class="fa-solid fa-rotate"></i> <span>Flip Side</span>
                </button>
                <div class="profile-finish-group">
                  <button class="profile-finish-btn active" data-finish="holographic" onclick="setLanyardFinish('holographic')" title="Holographic Diffraction Foil">
                    <i class="fa-solid fa-wand-magic-sparkles"></i> Holo
                  </button>
                  <button class="profile-finish-btn" data-finish="glossy" onclick="setLanyardFinish('glossy')">
                    Glossy
                  </button>
                  <button class="profile-finish-btn" data-finish="metallic" onclick="setLanyardFinish('metallic')">
                    Metallic
                  </button>
                  <button class="profile-finish-btn" data-finish="matte" onclick="setLanyardFinish('matte')">
                    Matte
                  </button>
                </div>
              </div>
            </div>

            <!-- Right: User Details & Academic Credential -->
            <div class="profile-details-column">
              <!-- Summary Card -->
              <div class="profile-user-summary-card">
                <div class="profile-summary-avatar" id="modalUserAvatar">ST</div>
                <div class="profile-summary-info">
                  <h3 class="profile-summary-name" id="modalUserName">Student Member</h3>
                  <span class="profile-summary-role-tag" id="modalUserRole">
                    <i class="fa-solid fa-circle-check"></i> Verified Student
                  </span>
                </div>
              </div>

              <!-- Metadata Grid -->
              <div class="profile-meta-grid">
                <div class="profile-meta-cell">
                  <div class="profile-meta-label">Registration / Employee Code</div>
                  <div class="profile-meta-value" id="modalUserRegNo">--</div>
                </div>
                <div class="profile-meta-cell">
                  <div class="profile-meta-label">Department / Faculty</div>
                  <div class="profile-meta-value" id="modalUserDept">--</div>
                </div>
                <div class="profile-meta-cell">
                  <div class="profile-meta-label">Institutional Email</div>
                  <div class="profile-meta-value" id="modalUserEmail">--</div>
                </div>
                <div class="profile-meta-cell">
                  <div class="profile-meta-label">Account Security</div>
                  <div class="profile-meta-value text-success">
                    <i class="fa-solid fa-shield-halved"></i> Active & Verified
                  </div>
                </div>
              </div>

              <!-- Security Card -->
              <div class="profile-security-card">
                <div class="profile-security-left">
                  <div class="profile-security-icon">
                    <i class="fa-solid fa-fingerprint"></i>
                  </div>
                  <div class="profile-security-text">
                    <div class="profile-security-title">NFC & RFID Dual Transponder</div>
                    <div class="profile-security-sub">Smart Gateway & Attendance Synced</div>
                  </div>
                </div>
                <span class="profile-security-status">ENCRYPTED</span>
              </div>

              <!-- Action Buttons -->
              <div class="profile-actions-row">
                <button class="profile-action-btn btn-primary-teal" onclick="downloadIdCard('front')">
                  <i class="fa-solid fa-download"></i> Save Front ID
                </button>
                <button class="profile-action-btn btn-subtle" onclick="downloadIdCard('back')">
                  <i class="fa-solid fa-file-image"></i> Save Back ID
                </button>
                <button class="profile-action-btn btn-subtle" onclick="closeProfileModal()">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const div = document.createElement('div');
    div.innerHTML = modalHtml.trim();
    modalBackdrop = div.firstChild;
    document.body.appendChild(modalBackdrop);

    // Close when clicking outside dialog
    modalBackdrop.addEventListener('click', e => {
      if (e.target === modalBackdrop) closeProfileModal();
    });

    return modalBackdrop;
  }

  // Open the 3D Profile Modal
  window.openProfileModal = function () {
    const backdrop = ensureModalElement();
    const user = getUserData();

    // Populate Right Column
    const nameEl = document.getElementById('modalUserName');
    const roleEl = document.getElementById('modalUserRole');
    const regNoEl = document.getElementById('modalUserRegNo');
    const deptEl = document.getElementById('modalUserDept');
    const emailEl = document.getElementById('modalUserEmail');
    const avatarEl = document.getElementById('modalUserAvatar');

    if (nameEl) nameEl.textContent = user.name;
    if (roleEl) {
      const displayRole = user.role === 'admin' ? 'System Administrator'
                        : user.role === 'staff' ? 'Faculty Professor'
                        : user.role === 'parent' ? 'Verified Guardian'
                        : 'Full-time Student';
      roleEl.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${displayRole}`;
    }
    if (regNoEl) regNoEl.textContent = user.regNo;
    if (deptEl) deptEl.textContent = user.department;
    if (emailEl) emailEl.textContent = user.email;
    if (avatarEl) {
      const initials = (user.name || 'NG')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(w => w[0].toUpperCase())
        .join('');
      avatarEl.textContent = initials || 'NG';
    }

    // Generate Card Textures
    cachedFrontCanvas = generateIdCardTexture(user, 'front');
    cachedBackCanvas = generateIdCardTexture(user, 'back');
    const strapCanvas = generateLanyardStrapTexture();

    // Show Modal
    backdrop.classList.add('is-open');

    // Initialize 3D Lanyard
    const container = document.getElementById('profileLanyardContainer');
    if (container && window.initLanyard) {
      if (lanyardInstance) {
        lanyardInstance.destroy();
        lanyardInstance = null;
      }

      // Allow DOM transition to establish geometry
      setTimeout(() => {
        try {
          lanyardInstance = window.initLanyard(container, {
            frontImage: cachedFrontCanvas,
            backImage: cachedBackCanvas,
            strapImage: strapCanvas,
            finish: activeFinish,
            orientation: 'portrait',
            cornerRadius: 0.28,
            strapLength: 0.58,
            interactive: true,
            intro: true,
            cardColor: '#0a0f1d',
            strapColor: '#042f2e'
          });
        } catch (err) {
          console.error('Failed to initialize Lanyard Three.js physics:', err);
        }
      }, 50);
    }
  };

  // Close the Profile Modal
  window.closeProfileModal = function () {
    const backdrop = document.getElementById('institutionalProfileModal');
    if (backdrop) {
      backdrop.classList.remove('is-open');
    }
    if (lanyardInstance) {
      lanyardInstance.destroy();
      lanyardInstance = null;
    }
  };

  // Flip card side
  window.flipLanyardCard = function () {
    if (lanyardInstance && typeof lanyardInstance.flip === 'function') {
      lanyardInstance.flip();
    }
  };

  // Change surface finish
  window.setLanyardFinish = function (finishName) {
    activeFinish = finishName;
    document.querySelectorAll('.profile-finish-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-finish') === finishName);
    });
    if (lanyardInstance && typeof lanyardInstance.update === 'function') {
      lanyardInstance.update({ finish: finishName });
    }
  };

  // Download front or back card as high-res PNG
  window.downloadIdCard = function (side) {
    const canvas = side === 'back' ? cachedBackCanvas : cachedFrontCanvas;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `NextGen_Digital_ID_${side.toUpperCase()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Keyboard shortcut (Escape to close)
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const backdrop = document.getElementById('institutionalProfileModal');
      if (backdrop && backdrop.classList.contains('is-open')) {
        closeProfileModal();
      }
    }
  });

  // Automatically attach click handler to all profile chips on load
  function bindProfileChips() {
    const chips = document.querySelectorAll(
      '#studentProfileChip, #staffProfileChip, #adminProfileChip, #parentProfileChip, .student-user-profile-chip'
    );
    chips.forEach(chip => {
      if (!chip.__lanyardBound) {
        chip.__lanyardBound = true;
        chip.style.cursor = 'pointer';
        chip.setAttribute('title', 'Click to view 3D Interactive Lanyard ID Card');
        chip.addEventListener('click', e => {
          e.preventDefault();
          window.openProfileModal();
        });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindProfileChips);
  } else {
    bindProfileChips();
  }
})();
