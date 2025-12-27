export type EmbedPayload = {
  title?: string;
  description?: string;
  color?: number;
  url?: string;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  footer?: { text: string };
  image?: { url: string };
  thumbnail?: { url: string };
};

export type MessagePayload = {
  channelId?: string;
  content?: string;
  embed?: EmbedPayload;
};

export type ServiceResult = { ok: true } | { ok: false; status: number; error: string };
