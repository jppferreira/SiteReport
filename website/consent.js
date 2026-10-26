const STORAGE_KEY = 'tradereport-third-party';
const FONT_STYLESHEET =
  'https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700&display=swap';

function allowThirdParties() {
  if (!document.querySelector('link[data-third-party="fonts"]')) {
    const fonts = document.createElement('link');
    fonts.rel = 'stylesheet';
    fonts.href = FONT_STYLESHEET;
    fonts.dataset.thirdParty = 'fonts';
    document.head.appendChild(fonts);
  }

  if (document.querySelector('.hero-phone-canvas') && !document.querySelector('script[data-third-party="hero"]')) {
    const hero = document.createElement('script');
    hero.type = 'module';
    hero.src = 'hero-phone.js';
    hero.dataset.thirdParty = 'hero';
    document.body.appendChild(hero);
  }
}

function remember(choice) {
  localStorage.setItem(STORAGE_KEY, choice);
}

function showBanner() {
  const bar = document.createElement('div');
  bar.id = 'third-party-consent';
  bar.setAttribute('role', 'dialog');
  bar.setAttribute('aria-label', 'Optional site resources');
  bar.style.cssText = [
    'position:fixed',
    'left:16px',
    'right:16px',
    'bottom:16px',
    'z-index:30',
    'max-width:560px',
    'margin:0 auto',
    'padding:16px',
    'background:#ffffff',
    'color:#101310',
    'border:1px solid #d7ddd8',
    'border-radius:16px',
    'font:15px/1.45 Avenir Next,Segoe UI,sans-serif',
  ].join(';');
  bar.innerHTML =
    '<p style="margin:0 0 12px">Allow a typeface from Google' +
    (document.querySelector('.hero-phone-canvas') ? ' and a script from jsDelivr for the phone illustration' : '') +
    '? Nothing is requested until you allow it.</p>' +
    '<div style="display:flex;gap:8px">' +
    '<button type="button" data-choice="accepted" style="font:inherit;padding:8px 14px;border-radius:999px;border:0;background:#101310;color:#ffffff">Allow</button>' +
    '<button type="button" data-choice="declined" style="font:inherit;padding:8px 14px;border-radius:999px;border:1px solid #d7ddd8;background:#ffffff;color:#101310">Decline</button>' +
    '</div>';
  bar.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    const choice = button && button.dataset.choice;
    if (choice !== 'accepted' && choice !== 'declined') return;
    remember(choice);
    bar.remove();
    if (choice === 'accepted') allowThirdParties();
  });
  document.body.appendChild(bar);
}

const saved = localStorage.getItem(STORAGE_KEY);
if (saved === 'accepted') allowThirdParties();
else if (saved !== 'declined') showBanner();
