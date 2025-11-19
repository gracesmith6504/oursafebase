import { useRef, useEffect } from "react";
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
  const editorRef = useRef<HTMLDivElement>(null);
  const isUpdatingRef = useRef(false);

  // Initialize content when value changes externally
  useEffect(() => {
    if (editorRef.current && !isUpdatingRef.current) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      isUpdatingRef.current = true;
      onChange(editorRef.current.innerHTML);
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 0);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    
    // Try to get HTML from clipboard first
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    
    // Use HTML if available (preserves Word formatting), otherwise use plain text
    const contentToInsert = html || text.replace(/\n/g, '<br>');
    
    // Insert at cursor position
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = contentToInsert;
      const fragment = document.createDocumentFragment();
      
      while (tempDiv.firstChild) {
        fragment.appendChild(tempDiv.firstChild);
      }
      
      range.insertNode(fragment);
      
      // Move cursor to end of inserted content
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
      
      handleInput();
    }
  };

  return (
    <div
      ref={editorRef}
      contentEditable
      onInput={handleInput}
      onPaste={handlePaste}
      className={cn(
        "min-h-[300px] w-full rounded-md border border-input bg-background px-3 py-2",
        "text-sm ring-offset-background placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "overflow-auto",
        className
      )}
      data-placeholder={placeholder}
      suppressContentEditableWarning
    />
  );
};
