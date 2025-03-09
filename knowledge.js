const { google } = require('googleapis');
const { searchRandomKnowledge } = require('./search');
require('dotenv').config();

const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
});
const sheets = google.sheets({ version: 'v4', auth });

const KNOWLEDGE_SPREADSHEET_ID = '1zUaSoZEOjfaVIwPCk5i_lmDVQuGgAeZHKm3ypZJ6lag';

async function getKnowledge(category) {
  try {
    // 検索クエリを営業に役立つ具体的な内容に変更
    let searchQuery;
    if (category === '電気') {
      searchQuery = '電力自由化 料金 ルール';
    } else if (category === 'ガス') {
      searchQuery = 'ガス自由化 料金 ルール';
    } else if (category === '節水') {
      searchQuery = 'アクアクルー 価格 仕様';
    } else {
      searchQuery = `${category} 営業に役立つポイント`;
    }

    const searchResult = await searchRandomKnowledge(category, searchQuery);
    if (searchResult && !searchResult.includes('見つかりませんでした')) {
      return { content: searchResult, generatedQuestion: 'この内容について質問してみてね！' };
    }

    // 検索が失敗した場合、スプレッドシートを参照
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: KNOWLEDGE_SPREADSHEET_ID,
      range: `${category}!A:B`,
    });
    const rows = response.data.values || [];
    const headers = rows[0];
    const data = rows.slice(1);
    if (data.length > 0) {
      const content = data.map(row => `${headers[0]}: ${row[0]}\n${headers[1]}: ${row[1]}`).join('\n');
      return { content, generatedQuestion: 'この内容について質問してみてね！' };
    }
    return { content: 'ごめんなさい、このカテゴリの知識がまだ準備できてないよ。別のカテゴリを試してみて！', generatedQuestion: '' };
  } catch (error) {
    console.error(`知識取得エラー (${category}):`, error.message);
    return { content: `申し訳ありません、タブ ${category} のデータ取得に失敗しました。確認をお願いします。`, generatedQuestion: '' };
  }
}

function getRelevantCategory(question) {
  const categories = ['電気', 'ガス', '節水', 'マナー', '売れる営業', 'ロールプレイング'];
  return categories.find(cat => question.toLowerCase().includes(cat.toLowerCase())) || '一般';
}

module.exports = { getRelevantCategory, getKnowledge };