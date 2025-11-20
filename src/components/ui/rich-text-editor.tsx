import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Bold, Italic, Heading1, Heading2, List, ListOrdered, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

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
    
    try {
      // Try to get HTML from clipboard first (preserves formatting from Word)
      const html = e.clipboardData.getData('text/html');
      const text = e.clipboardData.getData('text/plain');
      
      // Use HTML if available, otherwise use plain text with line breaks
      const contentToInsert = html || text.replace(/\n/g, '<br>');
      
      // Get current selection and cursor position
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      range.deleteContents();
      
      // Parse HTML safely
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = contentToInsert;
      
      // Create document fragment for insertion
      const fragment = document.createDocumentFragment();
      
      // Move all nodes from temp div to fragment (preserves links)
      while (tempDiv.firstChild) {
        fragment.appendChild(tempDiv.firstChild);
      }
      
      // Insert fragment at cursor position
      range.insertNode(fragment);
      
      // Move cursor to end of inserted content
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
      
      // Trigger change event
      handleInput();
    } catch (error) {
      console.error('Paste error:', error);
      // Fallback to plain text paste
      const text = e.clipboardData.getData('text/plain');
      document.execCommand('insertText', false, text);
      handleInput();
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const insertLink = () => {
    const selection = window.getSelection();
    if (!selection) return;
    
    const selectedText = selection.toString() || '';
    const url = prompt('Enter URL:', 'https://');
    
    if (!url || url === 'https://') return;
    
    if (selectedText) {
      // If text is selected, wrap it in a link using execCommand
      execCommand('createLink', url);
    } else {
      // If no text selected, manually insert link element
      try {
        const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
        if (!range) return;
        
        // Create link element
        const link = document.createElement('a');
        link.href = url;
        link.textContent = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        
        // Insert link at cursor
        range.deleteContents();
        range.insertNode(link);
        
        // Add space after link to prevent next character from being part of link
        const space = document.createTextNode(' ');
        range.setStartAfter(link);
        range.insertNode(space);
        
        // Move cursor after the space
        range.setStartAfter(space);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        
        editorRef.current?.focus();
        handleInput();
      } catch (error) {
        console.error('Failed to insert link:', error);
        toast.error('Failed to insert link');
      }
    }
  };

  return (
    <div className={cn(
      "border border-input rounded-md bg-background overflow-hidden",
      className
    )}>
      {/* Sticky Toolbar */}
      <div className="sticky top-0 z-10 flex flex-wrap gap-1 p-2 bg-muted/50 border-b border-input">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand('bold')}
          className="h-8 w-8 p-0"
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand('italic')}
          className="h-8 w-8 p-0"
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand('formatBlock', '<h1>')}
          className="h-8 w-8 p-0"
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand('formatBlock', '<h2>')}
          className="h-8 w-8 p-0"
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand('insertUnorderedList')}
          className="h-8 w-8 p-0"
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand('insertOrderedList')}
          className="h-8 w-8 p-0"
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={insertLink}
          className="h-8 w-8 p-0"
          title="Insert Link"
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* Scrollable Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        className={cn(
          "min-h-[400px] max-h-[600px] w-full overflow-auto px-3 py-2",
          "text-sm ring-offset-background placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
    </div>
  );
};
