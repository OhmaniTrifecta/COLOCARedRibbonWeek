/**
 * Red Ribbon Week — Colorado Connections Academy
 * Backend for the student app hosted on Vercel (Mrs. Pernal, School Counselor)
 *
 * The website posts each submission to this script's Web app URL.
 * Every submission is saved into this Google Sheet:
 *   - "All Responses" tab: every submission
 *   - One tab per activity (Take the Pledge, Slogan Contest, etc.)
 * Photos (Spirit Day Check-In and Share a Photo) show as a thumbnail in the
 * "Photo" column. The full-size photo is saved to a private Google Drive
 * folder named "Red Ribbon Week Photos" and linked in "Photo link".
 *
 * Deploy: Deploy > New deployment > Web app
 *   Execute as: Me    Who has access: Anyone
 */

var ALL_TAB = 'All Responses';
var PHOTO_FOLDER_NAME = 'Red Ribbon Week Photos';
var HEADERS = ['Timestamp', 'Student', 'Grade', 'Activity', 'Response', 'Details', 'Photo', 'Photo link'];
var PHOTO_COL = 7;
var PHOTO_ACTIVITIES = ['Spirit Day Check-In', 'Share a Photo'];
var ACTIVITIES = [
  'Spirit Day Check-In',
  'Take the Pledge',
  'Slogan Contest',
  'What Would You Do?',
  'Healthy Choices Bingo',
  'My Bright Future',
  'Share a Photo'
];
var GRADES = ['K', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
var MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8 MB
var MAX_THUMB_CHARS = 400 * 1024;      // thumbnail shown in the sheet

/** Health check: open the Web app URL in a browser to confirm it's live. */
function doGet() {
  return json_({ ok: true, app: 'Red Ribbon Week backend', status: 'running' });
}

/** Receives a submission from the website. */
function doPost(e) {
  try {
    var body = e && e.postData && e.postData.contents;
    if (!body) throw new Error('Nothing to save.');
    if (body.length > 12 * 1024 * 1024) throw new Error('That upload is too big.');
    var payload;
    try { payload = JSON.parse(body); } catch (err) { throw new Error('Could not read the submission.'); }
    return json_(submitResponse(payload));
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Validates and saves one submission. */
function submitResponse(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Nothing to save.');

  var name = clean_(payload.name, 40);
  var grade = clean_(payload.grade, 5);
  var activity = clean_(payload.activity, 60);
  var response = clean_(payload.response, 1200);
  var details = clean_(payload.details, 1200);

  if (name.length < 2) throw new Error('Please enter your name.');
  if (GRADES.indexOf(grade) === -1) throw new Error('Please pick your grade.');
  if (ACTIVITIES.indexOf(activity) === -1) throw new Error('Unknown activity.');
  if (!response) throw new Error('Your answer is empty.');

  var now = new Date();
  var photoLink = '', thumb = null;

  var hasPhoto = payload.photo && typeof payload.photo === 'object';
  if (activity === 'Share a Photo' && !hasPhoto) throw new Error('Please choose a photo.');
  if (hasPhoto) {
    if (PHOTO_ACTIVITIES.indexOf(activity) === -1) throw new Error('Photos are not allowed for this activity.');
    photoLink = savePhoto_(payload.photo, name, grade, activity, now);
    thumb = validThumb_(payload.photo.thumbUrl);
  }

  var row = [now, name, grade, activity, response, details, '', photoLink];

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    addRow_(getTab_(ss, ALL_TAB), row, thumb, name);
    addRow_(getTab_(ss, activity), row, thumb, name);
  } finally {
    lock.releaseLock();
  }
  return { ok: true };
}

/** Run this once from the editor to create the tabs and photo folder ahead of time (optional). */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  getTab_(ss, ALL_TAB);
  ACTIVITIES.forEach(function (a) { getTab_(ss, a); });
  var folder = getPhotoFolder_();
  Logger.log('Photos will be saved here: ' + folder.getUrl());
}

/* ---------- helpers ---------- */

/** Appends a row, then puts the photo thumbnail inside the Photo cell. */
function addRow_(sh, row, thumb, name) {
  sh.appendRow(row);
  if (!thumb) return;
  var r = sh.getLastRow();
  try {
    var img = SpreadsheetApp.newCellImage()
      .setSourceUrl(thumb)
      .setAltTextTitle('Photo from ' + name)
      .build()
      .toBuilder();
    sh.getRange(r, PHOTO_COL).setValue(img);
    sh.setRowHeight(r, 120);
  } catch (e) {
    // If Sheets can't show the thumbnail, the Photo link column still has the full photo.
    sh.getRange(r, PHOTO_COL).setValue('(open link →)');
  }
}

/** Returns the thumbnail data URL if it looks safe, otherwise null. */
function validThumb_(t) {
  if (typeof t !== 'string' || t.length > MAX_THUMB_CHARS) return null;
  return /^data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/.test(t) ? t : null;
}

/** Saves a student photo to the private Drive folder and returns its link. */
function savePhoto_(photo, name, grade, activity, when) {
  if (!photo || typeof photo.dataUrl !== 'string') throw new Error('Please choose a photo.');
  var m = photo.dataUrl.match(/^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+\/=]+)$/);
  if (!m) throw new Error('That file is not a supported picture.');
  var bytes = Utilities.base64Decode(m[2]);
  if (bytes.length > MAX_PHOTO_BYTES) throw new Error('That photo is too big. Try a smaller one.');

  var ext = m[1] === 'image/png' ? 'png' : 'jpg';
  var stamp = Utilities.formatDate(when, Session.getScriptTimeZone(), 'yyyy-MM-dd HHmm');
  var safeName = name.replace(/[^A-Za-z0-9 .\-]/g, '').trim() || 'Student';
  var label = activity === 'Spirit Day Check-In' ? 'Spirit Day' : 'Photo';
  var blob = Utilities.newBlob(bytes, m[1], stamp + ' - ' + safeName + ' (' + grade + ') - ' + label + '.' + ext);

  var file = getPhotoFolder_().createFile(blob);
  return file.getUrl();
}

/** Finds (or creates once) the private photo folder in the owner's Drive. */
function getPhotoFolder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('PHOTO_FOLDER_ID');
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) { /* folder was deleted; make a new one */ }
  }
  var folder = DriveApp.createFolder(PHOTO_FOLDER_NAME);
  props.setProperty('PHOTO_FOLDER_ID', folder.getId());
  return folder;
}

function getTab_(ss, title) {
  var sh = ss.getSheetByName(title);
  if (!sh) {
    sh = ss.insertSheet(title);
    sh.appendRow(HEADERS);
    formatHeader_(sh);
  } else if (sh.getRange(1, PHOTO_COL).getValue() !== 'Photo') {
    // Tab made by an older version of this script: add the new Photo columns.
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    formatHeader_(sh);
  }
  return sh;
}

function formatHeader_(sh) {
  sh.getRange(1, 1, 1, HEADERS.length)
    .setFontWeight('bold').setBackground('#D7263D').setFontColor('#FFFFFF');
  sh.setFrozenRows(1);
  sh.setColumnWidth(1, 160);
  sh.setColumnWidth(2, 140);
  sh.setColumnWidth(3, 60);
  sh.setColumnWidth(4, 170);
  sh.setColumnWidth(5, 320);
  sh.setColumnWidth(6, 280);
  sh.setColumnWidth(7, 170);
  sh.setColumnWidth(8, 240);
  sh.getRange('E:F').setWrap(true);
}

/** Trims, limits length, and stops text from being treated as a spreadsheet formula. */
function clean_(value, max) {
  var s = (value == null ? '' : String(value))
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .trim()
    .slice(0, max);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}
