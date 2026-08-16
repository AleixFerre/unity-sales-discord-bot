export type EmbedPayload = {
  title?: string;
  color?: number;
  url?: string;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  footer?: { text: string };
  images?: Array<{ url: string }>;
  thumbnail?: { url: string };
  /** Defaults to true: several images are merged into one collage attachment. */
  collage?: boolean;
};

export type MessagePayload = {
  embeds?: EmbedPayload[];
};

export type ServiceResult = { ok: true } | { ok: false; status: number; error: string };
