/* get-sweep.js: shared by every sweepbjj.app page (added 2026-09-23).
 *
 * 1. Detects the visitor's phone and marks <html> with is-ios / is-android / is-desktop,
 *    so the CSS in site.css shows just the right store button.
 * 2. Tags every store link with where the visitor came from, so the stores can report
 *    installs by source: Google Play via a UTM "referrer"; the App Store via a campaign
 *    link (only once APPLE_PT below is filled in).
 * 3. Points every link marked data-get-sweep straight at the visitor's store (desktop: unchanged).
 * 4. On phones, adds a sticky "Get Sweep" bar that appears once the first download buttons
 *    ([data-hero-cta]) scroll away and hides again at the final download section ([data-final-cta]).
 * 5. On a page whose <html> has data-autoredirect (the /get smart link), sends phones straight
 *    to their store.
 *
 * No cookies, no pixels, nothing stored: it only reads this page's URL and the referring site.
 * Page options, set on <html>: data-channel="finish" (campaign name when the URL has none).
 * Load it in <head> WITHOUT defer/async: the phone check then runs before the page is drawn,
 * so visitors never see the wrong badge flash; the link work waits for the page to load.
 */
(function () {
  var APP_ID = '6785548631';
  var PLAY_ID = 'com.sweepbjj.app';
  // App Store Connect "provider token" for campaign links (a short number from App Store
  // Connect's campaign link generator). While it's empty, App Store links stay plain: they
  // still work, just without per-campaign install counts in App Analytics.
  var APPLE_PT = '';

  var html = document.documentElement;
  var ua = navigator.userAgent || '';
  var isAndroid = /Android/i.test(ua);
  var isIOS = !isAndroid && (/iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)); // iPadOS reports as a Mac
  var platform = isIOS ? 'ios' : (isAndroid ? 'android' : 'desktop');
  html.classList.add('is-' + platform);

  // ---- Where did this visitor come from? ----
  var q = {};
  try { new URLSearchParams(location.search).forEach(function (v, k) { q[k] = v; }); } catch (e) {}
  var refHost = '';
  try { refHost = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, '') : ''; } catch (e) {}
  if (refHost === location.hostname.replace(/^www\./, '')) refHost = '';
  function clean(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30); }
  var source = clean(q.utm_source || q.src || (/(^|\.)reddit\.com$/.test(refHost) ? 'reddit' : refHost)) || 'website';
  var medium = clean(q.utm_medium) || (q.utm_source || q.src ? 'link' : (refHost ? 'referral' : 'direct'));
  var campaign = clean(q.utm_campaign || html.getAttribute('data-channel')) || 'home';

  var playUrl = 'https://play.google.com/store/apps/details?id=' + PLAY_ID + '&referrer=' +
    encodeURIComponent('utm_source=' + source + '&utm_medium=' + medium + '&utm_campaign=' + campaign);
  var appleUrl = APPLE_PT
    ? 'https://apps.apple.com/app/apple-store/id' + APP_ID + '?pt=' + APPLE_PT +
      '&ct=' + encodeURIComponent((source + '-' + campaign).slice(0, 40)) + '&mt=8'
    : 'https://apps.apple.com/app/id' + APP_ID;
  var storeUrl = platform === 'ios' ? appleUrl : (platform === 'android' ? playUrl : null);

  // The /get smart link: phones go straight to their store.
  if (storeUrl && html.hasAttribute('data-autoredirect')) { location.replace(storeUrl); return; }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onReady);
  else onReady();

  function onReady() {
  // ---- Rewrite store links and "Get Sweep" buttons ----
  var links = document.querySelectorAll('a[href]');
  for (var i = 0; i < links.length; i++) {
    var a = links[i], h = a.getAttribute('href');
    if (h.indexOf('apps.apple.com') !== -1) a.setAttribute('href', appleUrl);
    else if (h.indexOf('play.google.com') !== -1) a.setAttribute('href', playUrl);
    else if (storeUrl && a.hasAttribute('data-get-sweep')) a.setAttribute('href', storeUrl);
  }

  // ---- Sticky download bar (phones only) ----
  var heroCta = document.querySelector('[data-hero-cta]');
  var finalCta = document.querySelector('[data-final-cta]');
  if (!storeUrl || !heroCta) return;
  var bar = document.createElement('div');
  bar.className = 'sticky-get';
  var note = document.createElement('span');
  note.className = 'sticky-get-note';
  var name = document.createElement('b');
  name.textContent = 'Sweep: BJJ training log';
  note.appendChild(name);
  note.appendChild(document.createTextNode('Free. Pay once, no subscription.'));
  var btn = document.createElement('a');
  btn.className = 'sticky-get-btn';
  btn.href = storeUrl;
  btn.textContent = 'Get Sweep';
  bar.appendChild(note);
  bar.appendChild(btn);
  document.body.appendChild(bar);

  var ticking = false;
  function update() {
    ticking = false;
    var pastHero = heroCta.getBoundingClientRect().bottom < 0;
    var atFinal = finalCta ? finalCta.getBoundingClientRect().top < window.innerHeight : false;
    var show = pastHero && !atFinal;
    bar.classList.toggle('on', show);
    bar.setAttribute('aria-hidden', show ? 'false' : 'true');
    btn.tabIndex = show ? 0 : -1;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  window.addEventListener('resize', update);
  update();
  }
})();
