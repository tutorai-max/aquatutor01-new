const { google } = require('googleapis');
require('dotenv').config();

const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});
const sheets = google.sheets({ version: 'v4', auth });

const HISTORY_SPREADSHEET_ID = '1uTko3U491jV3KgfATWH4Cp0pQ6owYAOkgr9fA2SFOrs';

async function saveHistory(question, answer) {
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: HISTORY_SPREADSHEET_ID,
      range: 'Sheet1!A:C',
      valueInputOption: 'RAW',
      resource: {
        values: [[new Date().toISOString(), question, answer]]
      }
    });
    console.log('履歴を保存しました:', question, answer);
  } catch (error) {
    console.error('履歴保存エラー:', error.message);
  }
}

module.exports = { saveHistory };