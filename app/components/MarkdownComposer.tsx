"use client";

import JSZip from "jszip";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

type MaterialResponse = { error?: string; material?: { id: string; name: string; sourceUrl?: string | null; extractedText: string; enhanced?: boolean } };
const previewSchema = { ...defaultSchema, tagNames: [...(defaultSchema.tagNames || []), "u", "mark"], attributes: { ...defaultSchema.attributes, img: ["src", "alt", "title"] } };

function escapeHtml(value: string) { return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function inlineMarkdown(value: string) {
  const tokens: string[] = [];
  const hold = (html: string) => { tokens.push(html); return `\u0000${tokens.length - 1}\u0000`; };
  let next = value
    .replace(/<u>([\s\S]*?)<\/u>/gi, (_, body: string) => hold(`<u>${escapeHtml(body)}</u>`))
    .replace(/<mark>([\s\S]*?)<\/mark>/gi, (_, body: string) => hold(`<mark>${escapeHtml(body)}</mark>`))
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt: string, src: string) => hold(`<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}">`));
  next = escapeHtml(next).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/`(.+?)`/g, "<code>$1</code>").replace(/\*(.+?)\*/g, "<em>$1</em>");
  return next.replace(/\u0000(\d+)\u0000/g, (_, index: string) => tokens[Number(index)] || "");
}

function markdownToEditableHtml(markdown: string) {
  const lines = markdown.split("\n"); let listOpen = false; const html: string[] = [];
  for (const line of lines) {
    if (/^- /.test(line)) { if (!listOpen) { html.push("<ul>"); listOpen = true; } html.push(`<li>${inlineMarkdown(line.slice(2))}</li>`); continue; }
    if (listOpen) { html.push("</ul>"); listOpen = false; }
    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) html.push(`<h${heading[1].length}>${inlineMarkdown(heading[2])}</h${heading[1].length}>`);
    else if (line.startsWith("> ")) html.push(`<blockquote>${inlineMarkdown(line.slice(2))}</blockquote>`);
    else html.push(line ? `<p>${inlineMarkdown(line)}</p>` : "<p><br></p>");
  }
  if (listOpen) html.push("</ul>"); return html.join("");
}

function editableHtmlToMarkdown(root: HTMLElement) {
  const inline = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
    if (!(node instanceof HTMLElement)) return "";
    const children = Array.from(node.childNodes).map(inline).join("");
    if (node.tagName === "STRONG" || node.tagName === "B") return `**${children}**`;
    if (node.tagName === "EM" || node.tagName === "I") return `*${children}*`;
    if (node.tagName === "U") return `<u>${children}</u>`;
    if (node.tagName === "MARK" || (node.tagName === "SPAN" && node.style.backgroundColor)) return `<mark>${children}</mark>`;
    if (node.tagName === "CODE") return `\`${children}\``;
    if (node.tagName === "BR") return "\n";
    if (node.tagName === "IMG") return `![${node.getAttribute("alt") || "插图"}](${node.getAttribute("src") || ""})`;
    return children;
  };
  const block = (element: Element): string => {
    const content = Array.from(element.childNodes).map(inline).join("").trimEnd();
    if (element.tagName === "H1") return `# ${content}`; if (element.tagName === "H2") return `## ${content}`; if (element.tagName === "H3") return `### ${content}`;
    if (element.tagName === "BLOCKQUOTE") return `> ${content}`;
    if (element.tagName === "UL") return Array.from(element.children).map((child) => `- ${Array.from(child.childNodes).map(inline).join("")}`).join("\n");
    return content;
  };
  return Array.from(root.children).map(block).join("\n\n").replace(/\n{3,}/g, "\n\n");
}

function xmlText(xml: string) { return new DOMParser().parseFromString(xml, "application/xml").documentElement.textContent?.replace(/\s+/g, " ").trim() || ""; }
async function extractOffice(file: File, extension: string) {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  if (extension === "docx") { const document = zip.file("word/document.xml"); return document ? xmlText(await document.async("string")) : ""; }
  const slides = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return (await Promise.all(slides.map(async (name, index) => `## 第 ${index + 1} 页\n\n${xmlText(await zip.files[name].async("string"))}`))).join("\n\n");
}
async function extractPdf(file: File) {
  const pdfjs = await import("pdfjs-dist"); pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;
  const document = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise; const pages: string[] = [];
  for (let index = 1; index <= document.numPages; index += 1) { const page = await document.getPage(index); const content = await page.getTextContent(); pages.push(`## 第 ${index} 页\n\n${content.items.map((item) => "str" in item ? item.str : "").join(" ").trim()}`); }
  return pages.join("\n\n");
}
async function extractText(file: File) { const extension = file.name.split(".").pop()?.toLowerCase() || ""; if (["txt", "md", "markdown"].includes(extension)) return file.text(); if (["docx", "pptx"].includes(extension)) return extractOffice(file, extension); if (extension === "pdf") return extractPdf(file); return ""; }

export function MarkdownComposer({ value, onChange, placeholder, sourceChanged, compact = false }: { value: string; onChange(value: string): void; placeholder: string; sourceChanged?(source: string): void; compact?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null); const imageRef = useRef<HTMLInputElement>(null); const editableRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<"visual" | "write" | "split" | "preview">("visual"); const [link, setLink] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { if (view !== "visual" || !editableRef.current || document.activeElement === editableRef.current) return; editableRef.current.innerHTML = markdownToEditableHtml(value); }, [value, view]);
  function mergeText(text: string) { if (text.trim()) onChange(`${value}${value.trim() ? "\n\n" : ""}${text.trim()}`); }
  function format(command: string, argument?: string) { editableRef.current?.focus(); document.execCommand(command, false, argument); if (editableRef.current) onChange(editableHtmlToMarkdown(editableRef.current)); }

  async function upload(file: File, isImage = false) {
    setBusy(true); setMessage(`正在读取 ${file.name}…`);
    try {
      const extractedText = isImage ? "" : await extractText(file); const form = new FormData(); form.append("file", file); form.append("extractedText", extractedText);
      const response = await fetch("/api/materials", { method: "POST", body: form }); const data = (await response.json()) as MaterialResponse;
      if (!response.ok || !data.material) throw new Error(data.error || "文件上传失败");
      if (isImage) {
        const src = `/api/materials/file?id=${encodeURIComponent(data.material.id)}`;
        if (view === "visual" && editableRef.current) { editableRef.current.focus(); document.execCommand("insertHTML", false, `<img src="${src}" alt="${escapeHtml(file.name)}"><p><br></p>`); onChange(editableHtmlToMarkdown(editableRef.current)); }
        else mergeText(`![${file.name}](${src})`);
        setMessage(`插图 ${file.name} 已加入正文。`);
      } else { mergeText(extractedText); sourceChanged?.(file.name); const legacy = /\.(doc|ppt)$/i.test(file.name); setMessage(legacy ? "文件已保存。旧版 DOC/PPT 建议转为 DOCX/PPTX，以便提取正文。" : `已导入 ${file.name}${extractedText ? "，文字已加入输入区" : ""}。`); }
    } catch (error) { setMessage(error instanceof Error ? error.message : "文件导入失败"); }
    finally { setBusy(false); if (inputRef.current) inputRef.current.value = ""; if (imageRef.current) imageRef.current.value = ""; }
  }

  async function importLink() {
    if (!link.trim()) return; setBusy(true); setMessage("正在读取外部链接…");
    try { const response = await fetch("/api/materials", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: link }) }); const data = (await response.json()) as MaterialResponse; if (!response.ok || !data.material) throw new Error(data.error || "链接导入失败"); mergeText(data.material.extractedText); sourceChanged?.(data.material.sourceUrl || link); setMessage(`已读取 ${data.material.name}${data.material.enhanced ? "（已启用增强读取）" : ""}，正文已加入输入区。`); setLink(""); }
    catch (error) { setMessage(error instanceof Error ? error.message : "链接导入失败"); } finally { setBusy(false); }
  }

  function handleVisualShortcut(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== " ") return; const selection = window.getSelection(); const anchor = selection?.anchorNode; const target = anchor?.nodeType === Node.TEXT_NODE ? anchor.parentElement : anchor as HTMLElement | null; const block = target?.closest("p,div"); const marker = block?.textContent?.match(/^(#{1,3})\s$/); if (!block || !marker) return;
    block.innerHTML = "<br>"; document.execCommand("formatBlock", false, `h${marker[1].length}`); const range = document.createRange(); range.selectNodeContents(block); range.collapse(false); selection?.removeAllRanges(); selection?.addRange(range); if (editableRef.current) onChange(editableHtmlToMarkdown(editableRef.current));
  }

  return <div className={`markdown-composer ${compact ? "compact" : ""}`}>
    <div className="composer-toolbar">
      <div className="composer-tabs"><button type="button" className={view === "visual" ? "active" : ""} onClick={() => setView("visual")}>富文本</button><button type="button" className={view === "write" ? "active" : ""} onClick={() => setView("write")}>纯文本</button><button type="button" className={view === "split" ? "active" : ""} onClick={() => setView("split")}>对照</button><button type="button" className={view === "preview" ? "active" : ""} onClick={() => setView("preview")}>阅读</button></div>
      <div className="composer-imports"><input ref={inputRef} type="file" accept=".txt,.md,.markdown,.pdf,.doc,.docx,.ppt,.pptx" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} /><button type="button" onClick={() => inputRef.current?.click()} disabled={busy}>＋ 文件</button></div>
    </div>
    {view === "visual" && <div className="rich-toolbar" aria-label="富文本工具栏"><button type="button" title="标题" onClick={() => format("formatBlock", "h2")}>H2</button><button type="button" title="加粗" onClick={() => format("bold")}><b>B</b></button><button type="button" title="斜体" onClick={() => format("italic")}><i>I</i></button><button type="button" title="下划线" onClick={() => format("underline")}><u>U</u></button><button type="button" title="高光" onClick={() => format("hiliteColor", "#f1d778")}><mark>A</mark></button><button type="button" title="项目列表" onClick={() => format("insertUnorderedList")}>☷</button><input ref={imageRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file, true); }} /><button type="button" title="插入图片" onClick={() => imageRef.current?.click()} disabled={busy}>▧ 图片</button></div>}
    <div className={`composer-body view-${view}`}>
      {view === "visual" && <div ref={editableRef} className="visual-editor" contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" data-placeholder={placeholder} onInput={(event) => onChange(editableHtmlToMarkdown(event.currentTarget))} onKeyUp={handleVisualShortcut} />}
      {(view === "write" || view === "split") && <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />}
      {(view === "preview" || view === "split") && <article className="markdown-preview"><ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeRaw, [rehypeSanitize, previewSchema], rehypeKatex]}>{value || "*内容与公式预览会显示在这里。*\n\n行内公式：$E = mc^2$"}</ReactMarkdown></article>}
    </div>
    <div className="link-import"><input value={link} onChange={(event) => setLink(event.target.value)} placeholder="粘贴外部文章或网页链接 https://…" /><button type="button" onClick={importLink} disabled={busy || !link.trim()}>读取链接</button></div>
    {message && <p className="composer-message">{message}</p>}
  </div>;
}
