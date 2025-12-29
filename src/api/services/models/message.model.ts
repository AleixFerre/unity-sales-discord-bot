export type MessageType = 'unity' | 'fab' | 'custom';

export type EmbedPayload = {
  messageType?: MessageType;
  title?: string;
  color?: number;
  url?: string;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  footer?: { text: string };
  image?: { url: string };
  thumbnail?: { url: string };
};

export type MessagePayload = {
  content?: string;
  embed?: EmbedPayload;
};

export type ServiceResult = { ok: true } | { ok: false; status: number; error: string };
