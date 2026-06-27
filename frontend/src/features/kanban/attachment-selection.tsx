import { Paperclip } from "lucide-react";

export function AttachmentSelection({ files }: { files: File[] }) {
  return (
    <div className="grid gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 p-2">
      {files.map((file) => (
        <div
          key={`${file.name}-${file.size}`}
          className="flex min-w-0 items-center gap-2 text-xs text-zinc-600"
        >
          <Paperclip className="size-3.5 shrink-0" />
          <span className="truncate">{file.name}</span>
        </div>
      ))}
    </div>
  );
}
