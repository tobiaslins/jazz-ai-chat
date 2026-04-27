"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

const markdownComponents: Components = {
  p: ({ children }) => <p className="my-1 whitespace-pre-wrap">{children}</p>,
  ul: ({ children }) => (
    <ul className="my-1 list-disc space-y-1 pl-5">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-1 list-decimal space-y-1 pl-5">{children}</ol>
  ),
  h1: ({ children }) => (
    <h1 className="my-2 text-base font-semibold">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="my-2 text-sm font-semibold">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="my-2 text-sm font-semibold">{children}</h3>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-1 border-l-2 border-gray-300 pl-3 text-gray-700">
      {children}
    </blockquote>
  ),
  a: ({ children, ...props }) => (
    <a
      {...props}
      target="_blank"
      rel="noreferrer"
      className="underline underline-offset-2"
    >
      {children}
    </a>
  ),
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className ?? "");
    const text = String(children).replace(/\n$/, "");
    const isInline = !className || !text.includes("\n");

    if (isInline) {
      return (
        <code
          className="rounded bg-black/10 px-1 py-0.5 font-mono text-[0.85em]"
          {...props}
        >
          {children}
        </code>
      );
    }

    return (
      <SyntaxHighlighter
        language={match?.[1] ?? "text"}
        style={oneDark}
        PreTag="div"
        customStyle={{
          margin: "0.5rem 0",
          borderRadius: "0.5rem",
          fontSize: "0.8rem",
        }}
      >
        {text}
      </SyntaxHighlighter>
    );
  },
  pre: ({ children }) => <>{children}</>,
};

export function MessageContent({ content }: { content: string }) {
  return (
    <div className="text-sm leading-relaxed">
      <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
    </div>
  );
}
