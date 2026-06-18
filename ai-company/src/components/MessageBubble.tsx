"use client";

import { Message } from "@/lib/types";

interface Props {
  message: Message;
}

export function MessageBubble({ message }: Props) {
  const isSecretary = message.role === "secretary";

  return (
    <div className={`flex ${isSecretary ? "justify-start" : "justify-end"} animate-slide-up`}>
      {isSecretary && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-1">
          👩‍💼
        </div>
      )}
      <div
        className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isSecretary
            ? "glass text-slate-200 rounded-tl-sm"
            : "bg-sky-600 text-white rounded-tr-sm"
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}
