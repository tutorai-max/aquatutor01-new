const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { getRelevantCategory, getKnowledge } = require('./knowledge');
const { saveHistory } = require('./history');
const { SYSTEM_PROMPT } = require('./prompt');
const { searchRandomKnowledge } = require('./search');
const session = require('express-session');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', './views');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

app.get('/', (req, res) => {
  console.log('ホーム画面にアクセス');
  res.render('home', { answer: null });
});

app.get('/chat', (req, res) => {
  console.log('チャット画面にアクセス');
  req.session.questionCount = 0;
  req.session.selectedCategory = null;
  req.session.selectedSubCategory = null;
  req.session.selectedLevel = null;
  req.session.lastKnowledge = null;
  const initialAnswer = 'こんにちは！AquaTutorAIです\n何を学ぶか選んでください：\n- 1. 商品知識の習得（電気、ガス、節水）\n- 2. 営業マンの基礎マナー\n- 3. 売れる営業マンになるための講座\n- 4. 対面ロールプレイング（B2B）\n数字で選んでね（例: 1）';
  res.render('chat', { question: null, answer: initialAnswer, showNextButton: false });
});

app.post('/ask', async (req, res) => {
  let userQuestion = req.body.question || '';
  console.log('送信する質問:', userQuestion);

  try {
    let answer = '';
    let showNextButton = false;

    if (userQuestion.toLowerCase() === '終了') {
      answer = 'トレーニングを終えます。また一緒に頑張りましょう！<a href="/">ホームに戻る</a>を押してね。';
      req.session.questionCount = 0;
      req.session.selectedCategory = null;
      req.session.selectedSubCategory = null;
      req.session.selectedLevel = null;
      req.session.lastKnowledge = null;
    } else if (userQuestion.toLowerCase() === '続ける') {
      answer = `難易度${req.session.selectedLevel}で続けよう！\n`;
      const categoryMapping = { 1: req.session.selectedSubCategory, 2: 'マナー', 3: '売れる営業', 4: 'ロールプレイング' };
      const category = categoryMapping[req.session.selectedCategory];
      const result = await getKnowledge(category);
      answer += result.content + '\n\n質問: ' + result.generatedQuestion;
      req.session.lastKnowledge = result.content;
      showNextButton = true;
    } else {
      req.session.questionCount = (req.session.questionCount || 0) + 1;
      console.log('現在の質問カウント:', req.session.questionCount);

      if (req.session.questionCount === 1) {
        if (['1', '2', '3', '4'].includes(userQuestion)) {
          req.session.selectedCategory = parseInt(userQuestion);
          const categories = ['商品知識の習得', '営業マンの基礎マナー', '売れる営業マンになるための講座', '対面ロールプレイング（B2B）'];
          answer = `${categories[req.session.selectedCategory - 1]}を選んだね！次は難易度を選んで：\n- 1. 初級\n- 2. 中級\n- 3. 上級\n数字で選んでね（例: 1）`;
        } else {
          answer = 'ごめんなさい、1〜4の数字で選んで！\n何を学びたいか選んでみて：\n- 1. 商品知識の習得（電気、ガス、節水）\n- 2. 営業マンの基礎マナー\n- 3. 売れる営業マンになるための講座\n- 4. 対面ロールプレイング（B2B）\n数字で選んでね（例: 1）';
          req.session.questionCount -= 1;
        }
      } else if (req.session.questionCount === 2) {
        if (['1', '2', '3'].includes(userQuestion)) {
          const levels = ['初級', '中級', '上級'];
          req.session.selectedLevel = levels[parseInt(userQuestion) - 1];
          if (req.session.selectedCategory === 1) {
            answer = `難易度${req.session.selectedLevel}で商品知識を始めよう！\n商品を選んでね：\n- 1. 電気\n- 2. ガス\n- 3. 節水\n数字で選んでね（例: 1）`;
          } else {
            answer = `難易度${req.session.selectedLevel}でスタート！\n`;
            const categoryMapping = { 1: '節水', 2: 'マナー', 3: '売れる営業', 4: 'ロールプレイング' };
            const category = categoryMapping[req.session.selectedCategory];
            const result = await getKnowledge(category);
            answer += result.content + '\n\n質問: ' + result.generatedQuestion;
            req.session.lastKnowledge = result.content;
            showNextButton = true;
          }
        } else {
          answer = 'ごめんなさい、1〜3の数字で選んで！\n難易度を選んで：\n- 1. 初級\n- 2. 中級\n- 3. 上級';
          req.session.questionCount -= 1;
        }
      } else if (req.session.questionCount === 3 && req.session.selectedCategory === 1) {
        if (['1', '2', '3'].includes(userQuestion)) {
          const subCategories = ['電気', 'ガス', '節水'];
          req.session.selectedSubCategory = subCategories[parseInt(userQuestion) - 1];
          const result = await getKnowledge(req.session.selectedSubCategory);
          answer = `${req.session.selectedSubCategory}の知識を難易度${req.session.selectedLevel}で学ぼう！\n`;
          answer += result.content + '\n\n質問: ' + result.generatedQuestion;
          req.session.lastKnowledge = result.content;
          showNextButton = true;
        } else {
          answer = 'ごめんなさい、1〜3の数字で選んで！\n商品を選んでね：\n- 1. 電気\n- 2. ガス\n- 3. 節水';
          req.session.questionCount -= 1;
        }
      } else {
        const categoryMapping = { 1: req.session.selectedSubCategory, 2: 'マナー', 3: '売れる営業', 4: 'ロールプレイング' };
        const category = categoryMapping[req.session.selectedCategory];
        const combinedPrompt = `${SYSTEM_PROMPT}\n\n${req.session.lastKnowledge}\n\n${userQuestion}`;
        console.log('AIにリクエスト送信中...');
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: combinedPrompt }] }]
        });
        console.log('AIから応答受信');
        const response = await result.response;
        answer = response.text();
        if (!answer || answer.trim() === '') {
          throw new Error('AIからの応答が空です。');
        }
        showNextButton = true;
        if (req.session.questionCount % 10 === 0) {
          answer += '\n10問に達したよ！"終了"か"続ける"を選んでください。';
          showNextButton = false;
        }
      }
    }

    const formattedAnswer = answer.split('\n').map(line => line.trim()).filter(line => line.length > 0).join('\n');
    console.log('回答:', formattedAnswer);
    await saveHistory(userQuestion, formattedAnswer);

    console.log('チャット画面にリダイレクト:', { question: userQuestion, answer: formattedAnswer });
    res.render('chat', { question: userQuestion, answer: formattedAnswer, showNextButton: showNextButton });
  } catch (error) {
    console.error('エラー詳細:', error.message);
    let errorMessage = 'ごめんなさい、エラーが発生したよ。設定を確認してね。';
    if (error.message.includes('credentials')) {
      errorMessage = '認証エラー: GOOGLE_APPLICATION_CREDENTIALSを確認してね。';
    } else if (error.message.includes('API key')) {
      errorMessage = 'APIキーエラー: GEMINI_API_KEYを確認してね。';
    } else if (error.message.includes('model')) {
      errorMessage = 'モデルエラー: gemini-2.0-flashが使えるか確認してね。';
    } else if (error.message.includes('network')) {
      errorMessage = 'ネットワークエラー: 接続や制限を確認してね。';
    } else if (error.message.includes('応答が空')) {
      errorMessage = '応答がなくてごめんなさい。ネットワークを確認して質問をもう一度試してね。';
    } else if (error.message.includes('search')) {
      errorMessage = '検索に失敗したよ。CSE設定を確認してね。';
    }
    console.log('エラー発生、ホーム画面にレンダリング:', errorMessage);
    res.render('home', { answer: errorMessage });
  }
});

app.post('/next', async (req, res) => {
  const categoryMapping = { 1: req.session.selectedSubCategory, 2: 'マナー', 3: '売れる営業', 4: 'ロールプレイング' };
  const category = categoryMapping[req.session.selectedCategory];
  const result = await getKnowledge(category);
  const answer = result.content + '\n\n質問: ' + result.generatedQuestion;
  req.session.lastKnowledge = result.content;
  const formattedAnswer = answer.split('\n').map(line => line.trim()).filter(line => line.length > 0).join('\n');
  console.log('次へ回答:', formattedAnswer);
  await saveHistory('次へ', formattedAnswer);
  res.render('chat', { question: '次へ', answer: formattedAnswer, showNextButton: false });
});

app.listen(port, () => {
  console.log(`サーバーがポート${port}で起動しました: http://localhost:${port}`);
});