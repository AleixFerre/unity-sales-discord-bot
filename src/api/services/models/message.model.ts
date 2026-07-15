export type EmbedPayload = {
  title?: string;
  color?: number;
  url?: string;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  footer?: { text: string };
  images?: Array<{ url: string }>;
  thumbnail?: { url: string };
};

export type MessagePayload = {
  embeds?: EmbedPayload[];
};

export type ServiceResult = { ok: true } | { ok: false; status: number; error: string };
