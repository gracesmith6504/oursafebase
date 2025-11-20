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
        "rt-wrapper border border-input rounded-md bg-background flex flex-col max-h-[60vh] overflow-hidden",
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
