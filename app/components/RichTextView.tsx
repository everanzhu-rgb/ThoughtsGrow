"use client";

import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

const schema = { ...defaultSchema, tagNames: [...(defaultSchema.tagNames || []), "u", "mark"], attributes: { ...defaultSchema.attributes, img: ["src", "alt", "title"] } };
export function RichTextView({ children, className = "" }: { children: string; className?: string }) {
  return <article className={`rich-text-view ${className}`}><ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeRaw, [rehypeSanitize, schema], rehypeKatex]}>{children}</ReactMarkdown></article>;
}
