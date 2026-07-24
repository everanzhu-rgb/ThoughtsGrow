"use client";

import JSZip from "jszip";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

type MaterialResponse = {
  error?: string;
  material?: { name: string; sourceUrl?: string | null; extractedText: string; enhanced?: boolean };
};

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function inlineMarkdown(value: string) {
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

function markdownToEditableHtml(markdown: string) {
  const lines = markdown.split("\n");
  let listOpen = false;
  const html: string[] = [];
  for (const line of lines) {
    if (/^- /.test(line)) {
      if (!listOpen) { html.push("<ul>"); listOpen = true; }
      html.push(`<li>${inlineMarkdown(line.slice(2))}</li>`);
      continue;
    }
    if (listOpen) { html.push("</ul>"); listOpen = false; }
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) html.push(`<h${heading[1].length}>${inlineMarkdown(heading[2])}</h${heading[1].length}>`);
    else if (line.startsWith("> ")) html.push(`<blockquote>${inlineMarkdown(line.slice(2))}</blockquote>`);
    else html.push(line ? `<p>${inlineMarkdown(line)}</p>` : "<p><br></p>");
  }
  if (listOpen) html.push("</ul>");
  return html.join("");
}

function editableHtmlToMarkdown(root: HTMLElement) {
  const convert = (element: Element): string => {
    const text = element.textContent?.trimEnd() || "";
    if (element.tagName === "H1") return `# ${text}`;
    if (element.tagName === "H2") return `## ${text}`;
    if (element.tagName === "H3") return `### ${text}`;
    if (element.tagName === "BLOCKQUOTE") return `> ${text}`;
    if (element.tagName === "UL") return Array.from(element.children).map((child) => `- ${child.textContent || ""}`).join("\n");
    return text;
  };
  return Array.from(root.children).map(convert).join("\n\n").replace(/\n{3,}/g, "\n\n");
}

function xmlText(xml: string) {
  return new DOMParser().parseFromString(xml, "application/xml").documentElement.textContent?.replace(/\s+/g, " ").trim() || "";
}

async function extractOffice(file: File, extension: string) {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  if (extension === "docx") {
    const document = zip.file("word/document.xml");
    return document ? xmlText(await document.async("string")) : "";
  }
  const slides = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const parts = await Promise.all(slides.map(async (name, index) => `## 第 ${index + 1} 页\n\n${xmlText(await zip.files[name].async("string"))}`));
  return parts.join("\n\n");
}

async function extractPdf(file: File) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;
  const document = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages: string[] = [];
  for (let index = 1; index <= document.numPages; index += 1) {
    const page = await document.getPage(index);
    const content = await page.getTextContent();
    const text = content.items.map((item) => "str" in item ? item.str : "").join(" ").trim();
    pages.push(`## 第 ${index} 页\n\n${text}`);
  }
  return pages.join("\n\n");
}

async function extractText(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  if (["txt", "md", "markdown"].includes(extension)) return file.text();
  if (["docx", "pptx"].includes(extension)) return extractOffice(file, extension);
  if (extension === "pdf") return extractPdf(file);
  return "";
}

export function MarkdownComposer({ value, onChange, placeholder, sourceChanged, compact = false }: { value: string; onChange(value: string): void; placeholder: string; sourceChanged?(source: string): void; compact?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const editableRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<"visual" | "write" | "split" | "preview">("visual");
  const [link, setLink] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (view !== "visual" || !editableRef.current || document.activeElement === editableRef.current) return;
    editableRef.current.innerHTML = markdownToEditableHtml(value);
  }, [value, view]);

  function mergeText(text: string) {
    if (!text.trim()) return;
    onChange(`${value}${value.trim() ? "\n\n" : ""}${text.trim()}`);
  }

  async function importFile(file: File) {
    setBusy(true);
    setMessage(`正在读取 ${file.name}…`);
    try {
      const extractedText = await extractText(file);
      const form = new FormData();
      form.append("file", file);
      form.append("extractedText", extractedText);
      const response = await fetch("/api/materials", { method: "POST", body: form });
      const data = (await response.json()) as MaterialResponse;
      if (!response.ok || !data.material) throw new Error(data.error || "文件上传失败");
      mergeText(extractedText);
      sourceChanged?.(file.name);
      const legacy = /\.(doc|ppt)$/i.test(file.name);
      setMessage(legacy ? "文件已保存。旧版 DOC/PPT 无法可靠抽取文字，建议另存为 DOCX/PPTX 后重新导入。" : `已导入 ${file.name}${extractedText ? "，文字已加入输入区" : ""}。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "文件导入失败");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function importLink() {
    if (!link.trim()) return;
    setBusy(true);
    setMessage("正在读取外部链接…");
    try {
      const response = await fetch("/api/materials", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: link }) });
      const data = (await response.json()) as MaterialResponse;
      if (!response.ok || !data.material) throw new Error(data.error || "链接导入失败");
      mergeText(data.material.extractedText);
      sourceChanged?.(data.material.sourceUrl || link);
      setMessage(`已读取 ${data.material.name}${data.material.enhanced ? "（已启用增强读取）" : ""}，正文已加入输入区。`);
      setLink("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "链接导入失败");
    } finally {
      setBusy(false);
    }
  }

  function handleVisualShortcut(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== " ") return;
    const selection = window.getSelection();
    const anchor = selection?.anchorNode;
    const block = (anchor?.nodeType === Node.TEXT_NODE ? anchor.parentElement : anchor as HTMLElement | null)?.closest("p,div");
    const marker = block?.textContent?.match(/^(#{1,3})\s$/);
    if (!block || !marker) return;
    block.innerHTML = "<br>";
    document.execCommand("formatBlock", false, `h${marker[1].length}`);
    const range = document.createRange();
    range.selectNodeContents(block); range.collapse(false); selection?.removeAllRanges(); selection?.addRange(range);
    if (editableRef.current) onChange(editableHtmlToMarkdown(editableRef.current));
  }

  return (
    <div className={`markdown-composer ${compact ? "compact" : ""}`}>
      <div className="composer-toolbar">
        <div className="composer-tabs"><button type="button" className={view === "visual" ? "active" : ""} onClick={() => setView("visual")}>所见即所得</button><button type="button" className={view === "write" ? "active" : ""} onClick={() => setView("write")}>Markdown</button><button type="button" className={view === "split" ? "active" : ""} onClick={() => setView("split")}>分栏</button><button type="button" className={view === "preview" ? "active" : ""} onClick={() => setView("preview")}>预览</button></div>
        <div className="composer-imports"><input ref={inputRef} type="file" accept=".txt,.md,.markdown,.pdf,.doc,.docx,.ppt,.pptx" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void importFile(file); }} /><button type="button" onClick={() => inputRef.current?.click()} disabled={busy}>＋ 文件</button></div>
      </div>
      <div className={`composer-body view-${view}`}>
        {view === "visual" && <div ref={editableRef} className="visual-editor" contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" data-placeholder={placeholder} onInput={(event) => onChange(editableHtmlToMarkdown(event.currentTarget))} onKeyUp={handleVisualShortcut} />}
        {(view === "write" || view === "split") && <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />}
        {(view === "preview" || view === "split") && <article className="markdown-preview"><ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{value || "*Markdown 与公式预览会显示在这里。*\n\n行内公式：$E = mc^2$"}</ReactMarkdown></article>}
      </div>
      <div className="link-import"><input value={link} onChange={(event) => setLink(event.target.value)} placeholder="粘贴外部文章或网页链接 https://…" /><button type="button" onClick={importLink} disabled={busy || !link.trim()}>读取链接</button></div>
      {message && <p className="composer-message">{message}</p>}
    </div>
  );
}
