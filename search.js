const axios = require('axios');
require('dotenv').config();

async function searchRandomKnowledge(category, knowledgeSnippet) {
  console.log('ネット検索開始');
  console.log('カテゴリ:', category, 'スニペット:', knowledgeSnippet);
  const query = knowledgeSnippet;
  try {
    console.log('クエリ:', query);
    console.log('CSE ID:', process.env.GOOGLE_CSE_ID);
    console.log('API Key:', process.env.GOOGLE_CSE_API_KEY ? '設定済み' : '未設定');
    const response = await axios.get(
      `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_CSE_API_KEY}&cx=${process.env.GOOGLE_CSE_ID}&q=${encodeURIComponent(query)}`
    );
    console.log('レスポンス受信:', response.data);
    const items = response.data.items || [];
    if (items.length > 0) {
      const randomIndex = Math.floor(Math.random() * items.length);
      const randomItem = items[randomIndex];
      let arrangedContent = '';
      if (category === '電気') {
        arrangedContent = `- 電力自由化: 2016年から顧客が電力会社を選べるように。\n- 料金: 電力使用量に応じたプランがあり、例: 1日10kWhで月500円節約可能。\n- ルール: 切り替え時の契約期間や違約金を確認することが重要。`;
      } else if (category === 'ガス') {
        arrangedContent = `- ガス自由化: 2017年から選択肢が増加。\n- 料金: 電気とのセット割で年間6000円節約の可能性。\n- ルール: 契約内容を明確に説明し、顧客の使用量に応じたプランを提案。`;
      } else if (category === '節水') {
        arrangedContent = `- 商品: アクアプランのアクアクルー。\n- 価格: 約5000円（設置費別）。\n- 仕様: 水道代を20-30%削減、年間5000L節水で2000円お得。`;
      } else {
        arrangedContent = `- タイトル: ${randomItem.title}\n- 概要: ${randomItem.snippet}\n- リンク: ${randomItem.link}`;
      }
      return arrangedContent;
    }
    return '関連する情報が見つかりませんでした。';
  } catch (error) {
    console.error('検索エラー詳細:', error.response ? error.response.data : error.message);
    return '検索に失敗しました。';
  }
}

module.exports = { searchRandomKnowledge };