import { Message } from '../types';

interface Props {
  message: Message;
}

function formatContent(content: string): string {
  return content
    .replace(/\[READY_TO_PLAN\]/g, '')
    .replace(/\[APPROVED\]/g, '')
    .replace(/\[NEEDS_REVISION:\w+\]/g, '')
    .trim();
}

export function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user';
  const content = formatContent(message.content);

  if (!content) return null;

  return (
    <div className={`flex gap-3 mb-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-sm flex-shrink-0 mt-1">
          橘
        </div>
      )}
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm flex-shrink-0 mt-1">
          👔
        </div>
      )}
      <div
        className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-slate-700 text-white rounded-tr-sm'
            : 'bg-[#1a1a2e] text-slate-200 rounded-tl-sm border border-[#2d2d4e]'
        }`}
      >
        <div className="whitespace-pre-wrap">{content}</div>
        <div className={`text-xs mt-1 ${isUser ? 'text-slate-400' : 'text-slate-500'}`}>
          {message.timestamp.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}
