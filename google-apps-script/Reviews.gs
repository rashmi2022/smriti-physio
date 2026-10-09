/**
 * ------------------------------------------------------------------
 *  WEBSITE REVIEWS → reviews.json on GitHub
 *
 *  When a patient posts a review, this adds it to the top of reviews.json
 *  in your GitHub repo. Your host (GitHub Pages / Netlify / Vercel) then
 *  redeploys and the review is on the site for everyone in ~1-2 minutes.
 *
 *  Setup (Project Settings → Script Properties):
 *    GITHUB_TOKEN   fine-grained token, this repo only, "Contents: Read and write"
 *    GITHUB_REPO    e.g.  pradumnkumar/smriti-physio
 *    GITHUB_BRANCH  optional, default "main"
 *    GITHUB_PATH    optional, default "reviews.json"
 *
 *  To remove a review: delete it from reviews.json (on GitHub or locally).
 * ------------------------------------------------------------------
 */

const REVIEWS_AUTO_PUBLISH = true;  // false = new reviews are saved with "hidden": true until you remove that line
const REVIEWS_NOTIFY_EMAIL = true;  // email you every time a review comes in

/* ---- hooks called from Code.gs --------------------------------- */

/** In doGet(e):  const r = routeReviewGet_(e);  if (r) return r; */
function routeReviewGet_(e) {
  // The website calls this to check that review posting is switched on.
  if (e && e.parameter && e.parameter.action === 'reviews') {
    return reviewsJson_({ ok: githubReady_(), reviews: [] });
  }
  return null;
}

/** In doPost(e): const r = routeReviewPost_(e); if (r) return r; */
function routeReviewPost_(e) {
  let body;
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { return null; }
  if (body && body.action === 'review') return submitReview_(body);
  return null;
}

/* ---- implementation -------------------------------------------- */

function submitReview_(b) {
  const clean = (s, max) => String(s || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
  if (b.website) return reviewsJson_({ ok: true, published: false }); // honeypot: pretend success

  const name = clean(b.name, 60);
  const text = String(b.text || '').replace(/[<>]/g, '').trim().slice(0, 600);
  const concern = clean(b.concern, 60);
  const rating = Math.round(Number(b.rating));
  if (name.length < 2 || text.length < 20 || !(rating >= 1 && rating <= 5) || !b.consent) {
    return reviewsJson_({ ok: false, error: 'invalid', message: 'Please fill in your name, rating and review.' });
  }

  // Block exact duplicates (double taps, resubmits) for 10 minutes
  const cache = CacheService.getScriptCache();
  const key = 'rv_' + Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, name + '|' + text)
  );
  if (cache.get(key)) return reviewsJson_({ ok: false, error: 'duplicate', message: 'This review was already posted.' });

  const review = { name: name, rating: rating };
  if (concern) review.concern = concern;
  review.text = text;
  review.date = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
  if (!REVIEWS_AUTO_PUBLISH) review.hidden = true;

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return reviewsJson_({ ok: false, error: 'busy', message: 'Server busy, please try again.' });
  try {
    addToReviewsFile_(review);
  } catch (err) {
    console.error(err);
    return reviewsJson_({ ok: false, error: 'save_failed', message: "Couldn't save your review right now. Please try again in a moment." });
  } finally {
    lock.releaseLock();
  }
  cache.put(key, '1', 600);

  if (REVIEWS_NOTIFY_EMAIL) {
    try {
      const g = github_();
      MailApp.sendEmail(
        Session.getEffectiveUser().getEmail(),
        'New website review: ' + '★'.repeat(rating) + ' from ' + name,
        text + '\n\n— ' + name + (concern ? ' (' + concern + ')' : '') + '\n\n' +
        (REVIEWS_AUTO_PUBLISH
          ? 'It will be live on the site in a minute or two. To remove it, delete it from reviews.json:'
          : 'It is saved with "hidden": true. Delete that line to publish it:') +
        '\nhttps://github.com/' + g.repo + '/edit/' + g.branch + '/' + g.path
      );
    } catch (err) { /* email is best-effort */ }
  }

  return reviewsJson_({ ok: true, published: REVIEWS_AUTO_PUBLISH, review: review });
}

/** Reads reviews.json from GitHub, puts the new review at the top, commits it back. */
function addToReviewsFile_(review) {
  const g = github_();
  const url = 'https://api.github.com/repos/' + g.repo + '/contents/' + g.path;
  const headers = {
    Authorization: 'Bearer ' + g.token,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  for (let attempt = 0; attempt < 3; attempt++) {
    const get = UrlFetchApp.fetch(url + '?ref=' + encodeURIComponent(g.branch), { headers: headers, muteHttpExceptions: true });
    let list = [], sha;
    if (get.getResponseCode() === 200) {
      const file = JSON.parse(get.getContentText());
      sha = file.sha;
      const raw = Utilities.newBlob(Utilities.base64Decode(file.content.replace(/\n/g, ''))).getDataAsString('UTF-8');
      list = JSON.parse(raw); // if the file has a typo this throws, so nothing gets overwritten
      if (!Array.isArray(list)) throw new Error('reviews.json is not a list');
    } else if (get.getResponseCode() !== 404) {
      throw new Error('GitHub read failed ' + get.getResponseCode() + ': ' + get.getContentText().slice(0, 300));
    }

    list.unshift(review);
    const payload = {
      message: 'Add review from ' + review.name,
      content: Utilities.base64Encode(JSON.stringify(list, null, 2) + '\n', Utilities.Charset.UTF_8),
      branch: g.branch,
    };
    if (sha) payload.sha = sha;

    const put = UrlFetchApp.fetch(url, {
      method: 'put', headers: headers, contentType: 'application/json',
      payload: JSON.stringify(payload), muteHttpExceptions: true,
    });
    const code = put.getResponseCode();
    if (code === 200 || code === 201) return;
    if (code === 409 || code === 422) { Utilities.sleep(800); continue; } // file changed meanwhile → retry
    throw new Error('GitHub write failed ' + code + ': ' + put.getContentText().slice(0, 300));
  }
  throw new Error('GitHub write kept conflicting');
}

function github_() {
  const p = PropertiesService.getScriptProperties();
  return {
    token: p.getProperty('GITHUB_TOKEN'),
    repo: (p.getProperty('GITHUB_REPO') || '').trim(),
    branch: p.getProperty('GITHUB_BRANCH') || 'main',
    path: p.getProperty('GITHUB_PATH') || 'reviews.json',
  };
}
function githubReady_() { const g = github_(); return !!(g.token && g.repo); }

function reviewsJson_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Run once from the editor: checks the token can read reviews.json (writes nothing). */
function testReviews() {
  const g = github_();
  if (!githubReady_()) throw new Error('Set GITHUB_TOKEN and GITHUB_REPO in Script Properties first.');
  const res = UrlFetchApp.fetch(
    'https://api.github.com/repos/' + g.repo + '/contents/' + g.path + '?ref=' + encodeURIComponent(g.branch),
    { headers: { Authorization: 'Bearer ' + g.token, Accept: 'application/vnd.github+json' }, muteHttpExceptions: true }
  );
  console.log('GitHub says ' + res.getResponseCode() + (res.getResponseCode() === 200 ? ' — all good.' : ': ' + res.getContentText().slice(0, 300)));
}
