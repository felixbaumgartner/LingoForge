import 'dotenv/config';

const API_KEY = process.env.MINIMAX_API_KEY!;
const BASE_URL = 'https://api.minimax.io/v1';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
}

export async function chatCompletion(
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<string> {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'minimax-m2.5',
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Minimax chat error ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

const VOICE_MAP: Record<string, string> = {
  spanish: 'male-qn-qingse',
  french: 'male-qn-qingse',
  dutch: 'male-qn-qingse',
};

export async function textToSpeech(
  text: string,
  language: string,
  speed: number = 1.0
): Promise<Buffer> {
  const voiceId = VOICE_MAP[language] || 'male-qn-qingse';

  const res = await fetch(`${BASE_URL}/t2a_v2`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'speech-2.8-hd',
      text,
      voice_setting: {
        voice_id: voiceId,
        speed,
        pitch: 0,
      },
      audio_setting: {
        format: 'mp3',
        sample_rate: 32000,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Minimax TTS error ${res.status}: ${errText}`);
  }

  const data = await res.json();

  if (data.audio_file) {
    return Buffer.from(data.audio_file, 'base64');
  }

  if (data.data?.audio) {
    return Buffer.from(data.data.audio, 'base64');
  }

  throw new Error('No audio data in Minimax TTS response');
}
