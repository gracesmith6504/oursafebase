import { useMemo } from "react";
import ReactQuill from "react-quill";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const RichTextEditor = ({
  value,
  onChange,
  placeholder = "Enter content...",
  className,
}: RichTextEditorProps) => {
  const modules = useMemo(
    () => ({
      toolbar: [
        ["bold", "italic", "underline"],
        [{ header: [1, 2, false] }],
        [{ list: "ordered" }, { list: "bullet" }],
        ["link"],
        ["clean"],
      ],
    }),
    []
  );

  const formats = [
    "bold",
    "italic",
    "underline",
    "header",
    "list",
    "bullet",
    "link",
  ];

  return (
    <div
      className={cn(
        "border border-input rounded-md bg-background overflow-hidden",
        "[&_.ql-toolbar]:bg-muted/50 [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-input [&_.ql-toolbar]:p-2",
        "[&_.ql-container]:min-h-[300px] [&_.ql-container]:max-h-[600px]",
        "[&_.ql-editor]:min-h-[300px] [&_.ql-editor]:max-h-[600px] [&_.ql-editor]:overflow-auto",
        "[&_.ql-editor]:text-sm [&_.ql-editor]:text-foreground",
        "[&_.ql-editor.ql-blank::before]:text-muted-foreground",
        "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
        className
      )}
    >
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />
    </div>
  );
};
