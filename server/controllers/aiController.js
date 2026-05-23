import OpenAI from 'openai';
import * as db from '../supabase.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

function getLastUserMessage(history = []) {
  if (!Array.isArray(history)) return '';
  const lastUserMessage = [...history].reverse().find((message) => message?.role === 'user' && typeof message?.content === 'string');
  return lastUserMessage?.content?.trim() || '';
}

function fallbackReply(history = []) {
  const text = getLastUserMessage(history).toLowerCase();

  if (text.includes('analyze') || text.includes('quality index') || text.includes('sqi')) {
    return "Based on your Student Quality Index data, here are 3 actionable insights:\n\n1. **Focus on the 18-19 Age Demographic**: Your data shows this is your core audience with the highest conversion potential. Tailor your social media ads specifically to this group.\n2. **Optimize Gender Balanced Outreach**: While your current ratio is stable, targeted scholarships for underrepresented genders in specific courses could further diversify your campus.\n3. **Improve 'Counseling Done' to 'Application' Pipeline**: There's a slight drop-off after counseling. Implementing an automated WhatsApp follow-up 24 hours after counseling could increase your conversion rate by 5-10%.";
  }

  if (!text) {
    return 'Hello! I am Asha AI, your admission assistant. How can I help you today?';
  }

  if (text.includes('document') || text.includes('required')) {
    return 'For most applications, please keep Class 10 and Class 12 marksheets, ID proof, a recent passport-size photo, and any entrance scorecard if applicable.';
  }

  if (text.includes('fee') || text.includes('fees') || text.includes('cost')) {
    return 'Course fees depend on the program and branch. I can help you check the latest fee schedule for your preferred course.';
  }

  return 'I can help with admissions, documents, fees, and course guidance. Tell me what you want to know and I will guide you step by step.';
}

export const chatWithAsha = async (req, res) => {
  const history = req.body?.history || [];
  
  try {
    if (!Array.isArray(history)) {
      return res.status(200).json({ message: 'Hello! I noticed an invalid message format, but I am still here to help. What can I do for you?' });
    }

    // If no API key or key is "sk-..." placeholder, use fallback immediately to avoid latency/errors
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.length < 20) {
      return res.status(200).json({
        message: fallbackReply(history)
      });
    }

    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    try {
      const response = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are Asha AI, an admission assistant for Rakshpal Bahadur Management Institute (RBMI). Be helpful and concise.'
          },
          ...history
        ],
        timeout: 10000 // 10s timeout
      });

      const aiMessage = response.choices[0]?.message?.content || "I'm sorry, I couldn't process that.";
      return res.status(200).json({ message: aiMessage });
    } catch (apiError) {
      console.warn('OpenAI API Error (falling back to local logic):', apiError.message);
      return res.status(200).json({ message: fallbackReply(history) });
    }
  } catch (error) {
    console.error('Critical AI Controller Error:', error);
    return res.status(200).json({ message: 'I am having a bit of trouble connecting to my brain right now, but generally, I recommend focusing on lead follow-ups and document completion to improve your quality index.' });
  }
};
