const express = require('express');
const line = require('@line/bot-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();

// 環境変数の設定
const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const geminiApiKey = process.env.GEMINI_API_KEY;

// LINE BOT SDKの初期化
const client = new line.Client(config);

// Gemini AIの初期化
const genAI = new GoogleGenerativeAI(geminiApiKey);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// Webhookエンドポイント
app.post('/api/webhook', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// イベントハンドラー
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  try {
    // Gemini APIに質問を送信
    const result = await model.generateContent(event.message.text);
    const response = await result.response;
    const text = response.text();

    // LINEに返信
    const echo = { 
      type: 'text', 
      text: text 
    };

    return client.replyMessage(event.replyToken, echo);
  } catch (error) {
    console.error('Error:', error);
    
    // エラー時の返信
    const errorMessage = { 
      type: 'text', 
      text: '申し訳ございません。エラーが発生しました。' 
    };
    
    return client.replyMessage(event.replyToken, errorMessage);
  }
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});

// ヘルスチェック用エンドポイント
app.get('/', (req, res) => {
  res.send('LINE BOT is running!');
});
