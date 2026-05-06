const axios = require('axios');
const { CATEGORIES } = require('../models/Transaction');

const parseTransaction = async (rawInput) => {
  const systemPrompt = `Bạn là AI phân tích chi tiêu tài chính cá nhân người Việt.
Nhiệm vụ: Đọc câu nhập tự nhiên và trả về JSON chuẩn.

Quy tắc:
- type: "expense" nếu là chi tiêu, "income" nếu là thu nhập/nhận tiền
- amount: số tiền bằng VNĐ (k = 1.000, m = 1.000.000)
- category: chỉ chọn 1 trong các giá trị: ${CATEGORIES.join(', ')}
- description: mô tả ngắn gọn (tối đa 50 ký tự)

Chỉ trả về JSON, không giải thích, không markdown.
Ví dụ output: {"type":"expense","amount":100000,"category":"Đi lại","description":"Tiền xăng"}`;

  const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: process.env.LLM_MODEL || 'claude-haiku-4-20250514',
      max_tokens: 256,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: rawInput },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const content = response.data.choices[0]?.message?.content?.trim();

  try {
    const parsed = JSON.parse(content);

    if (!parsed.type || !parsed.amount || !parsed.category) {
      throw new Error('Missing required fields');
    }

    if (!CATEGORIES.includes(parsed.category)) {
      parsed.category = 'Khác';
    }

    parsed.amount = Math.abs(Number(parsed.amount));

    return {
      success: true,
      data: {
        type: parsed.type,
        amount: parsed.amount,
        category: parsed.category,
        description: parsed.description || rawInput,
        rawInput,
      },
    };
  } catch {
    return {
      success: false,
      error: 'Không thể phân tích nội dung. Vui lòng thử lại.',
      rawInput,
    };
  }
};

module.exports = { parseTransaction };
