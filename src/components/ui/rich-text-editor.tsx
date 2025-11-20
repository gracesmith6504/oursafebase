import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Bold, Italic, Heading1, Heading2, List, ListOrdered, Link as LinkIcon } from "lucide-react";

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

  // Sync external value into editor
  useEffect(() => {
    if (editorRef.current && !isUpdatingRef.current) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  const handleInput = () => {
    if (!editorRef.current) return;
    isUpdatingRef.current = true;
    onChange(editorRef.current.innerHTML);
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 0);
  };

  /**
   * PASTE: preserve HTML (including links) where possible
   */
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const html = e.clipboardData.getData("text/html");
    const text = e.clipboardData.getData("text/plain");

    if (html) {
      e.preventDefault();
      editorRef.current?.focus();
      document.execCommand("insertHTML", false, html);
      handleInput();
      return;
    }

    if (text) {
      e.preventDefault();
      editorRef.current?.focus();
      const htmlFromText = text.replace(/\n/g, "<br>");
      document.execCommand("insertHTML", false, htmlFromText);
      handleInput();
    }
  };

  const execCommand = (command: string, value?: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    if (value !== undefined) {
      document.execCommand(command, false, value);
    } else {
      document.execCommand(command, false);
    }
    handleInput();
  };

  const insertLink = () => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    const hasSelection = selection && !selection.isCollapsed && selection.toString().length > 0;

    const url = window.prompt("Enter URL:", "https://");
    if (!url) return;

    editorRef.current.focus();

    if (hasSelection) {
      // Wrap selected text
      document.execCommand("createLink", false, url);
    } else {
      // Insert URL as linked text
      const linkHtml = `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
      document.execCommand("insertHTML", false, linkHtml);
    }

    handleInput();
  };

  return (
    <div className="space-y-2">
      {/* Container with border, toolbar + scrollable editor */}
      <div
        className={cn(
          "w-full rounded-md border border-input bg-background flex flex-col",
          "max-h-[600px]", // overall editor height
          className,
        )}
      >
        {/* Toolbar – sticky within this container */}
        <div className="flex flex-wrap gap-1 p-2 border-b border-input bg-muted/60 sticky top-0 z-10">
          <Button type="button" variant="ghost" size="sm" onClick={() => execCommand("bold")} className="h-8 w-8 p-0">
            <Bold className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => execCommand("italic")} className="h-8 w-8 p-0">
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => execCommand("formatBlock", "H1")}
            className="h-8 w-8 p-0"
          >
            <Heading1 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => execCommand("formatBlock", "H2")}
            className="h-8 w-8 p-0"
          >
            <Heading2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => execCommand("insertUnorderedList")}
            className="h-8 w-8 p-0"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => execCommand("insertOrderedList")}
            className="h-8 w-8 p-0"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={insertLink} className="h-8 w-8 p-0">
            <LinkIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* Scrollable editor area */}
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onPaste={handlePaste}
          className={cn(
            "flex-1 min-h-[320px] max-h-[540px] w-full px-3 py-2",
            "text-sm ring-offset-background placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "overflow-auto",
          )}
          data-placeholder={placeholder}
          suppressContentEditableWarning
        />
      </div>
    </div>
  );
};
