import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, X, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { validateFile, formatFileSize, getFileExtension } from "@/lib/fileUtils";

interface CodeOfConduct {
  id: string;
  content?: string;
  file_url?: string;
  version: number;
  name?: string;
  society_id?: string;
}

interface EditCoCDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coc: CodeOfConduct;
  onSuccess: () => void;
}

export const EditCoCDialog = ({
  open,
  onOpenChange,
  coc,
  onSuccess,
}: EditCoCDialogProps) => {
  const [name, setName] = useState(coc.name || "");
  const [content, setContent] = useState(coc.content || "");
  const [uploadMode, setUploadMode] = useState<'text' | 'file'>(coc.file_url ? 'file' : 'text');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentFileUrl, setCurrentFileUrl] = useState(coc.file_url);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setName(coc.name || "");
    setContent(coc.content || "");
    setUploadMode(coc.file_url ? 'file' : 'text');
    setCurrentFileUrl(coc.file_url);
    setSelectedFile(null);
  }, [coc]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFile(file);
    if (!validation.valid) {
      return;
    }

    setSelectedFile(file);
  };

  const clearFile = () => {
    setSelectedFile(null);
  };

  const handleUpdate = async () => {
    if (!name.trim() || name.trim().length > 150) {
      return;
    }

    if (uploadMode === 'text' && (!content.trim() || content.trim().length > 50000)) {
      return;
    }

    if (uploadMode === 'file' && !currentFileUrl && !selectedFile) {
      return;
    }

    setLoading(true);

    let fileUrl: string | null = currentFileUrl || null;

    // Handle file upload if a new file is selected
    if (uploadMode === 'file' && selectedFile) {
      // Delete old file if exists
      if (currentFileUrl && coc.society_id) {
        const oldFilePath = currentFileUrl.split('/code-of-conduct-files/')[1];
        if (oldFilePath) {
          await supabase.storage
            .from('code-of-conduct-files')
            .remove([oldFilePath]);
        }
      }

      // Upload new file
      const timestamp = Date.now();
      const fileName = `${timestamp}-${selectedFile.name}`;
      const filePath = `${coc.society_id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('code-of-conduct-files')
        .upload(filePath, selectedFile);

      if (uploadError) {
        setLoading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('code-of-conduct-files')
        .getPublicUrl(filePath);

      fileUrl = publicUrl;
    }

    const { error } = await supabase
      .from("code_of_conduct")
      .update({ 
        name: name.trim(),
        content: uploadMode === 'text' ? content.trim() : null,
        file_url: uploadMode === 'file' ? fileUrl : null,
      })
      .eq("id", coc.id);

    setLoading(false);

    if (error) {
      return;
    }

    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Template v{coc.version}</DialogTitle>
          <DialogDescription>
            Update the content of this template.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Template Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Standard Event CoC, Large Event CoC"
              maxLength={100}
            />
          </div>

          <Tabs value={uploadMode} onValueChange={(v) => setUploadMode(v as 'text' | 'file')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="text">Text Content</TabsTrigger>
              <TabsTrigger value="file">Upload File</TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="mt-4">
              <div>
                <Label htmlFor="content">Code of Conduct Content</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter your code of conduct here..."
                  className="min-h-[300px]"
                />
              </div>
            </TabsContent>

            <TabsContent value="file" className="mt-4">
              <div className="space-y-4">
                <Label>Upload Code of Conduct File</Label>
                
                {currentFileUrl && !selectedFile && (
                  <div className="flex items-center gap-2 p-3 bg-accent rounded-lg">
                    <FileText className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Current file: {getFileExtension(currentFileUrl).toUpperCase()}</p>
                      <p className="text-xs text-muted-foreground">Upload a new file to replace</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => window.open(currentFileUrl, '_blank')}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <label className="file-upload-area">
                  <div className="icon">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M10 1C9.73478 1 9.48043 1.10536 9.29289 1.29289L3.29289 7.29289C3.10536 7.48043 3 7.73478 3 8V20C3 21.6569 4.34315 23 6 23H7C7.55228 23 8 22.5523 8 22C8 21.4477 7.55228 21 7 21H6C5.44772 21 5 20.5523 5 20V9H10C10.5523 9 11 8.55228 11 8V3H18C18.5523 3 19 3.44772 19 4V9C19 9.55228 19.4477 10 20 10C20.5523 10 21 9.55228 21 9V4C21 2.34315 19.6569 1 18 1H10ZM9 7H6.41421L9 4.41421V7ZM14 15.5C14 14.1193 15.1193 13 16.5 13C17.8807 13 19 14.1193 19 15.5V16V17H20C21.1046 17 22 17.8954 22 19C22 20.1046 21.1046 21 20 21H13C11.8954 21 11 20.1046 11 19C11 17.8954 11.8954 17 13 17H14V16V15.5ZM16.5 11C14.142 11 12.2076 12.8136 12.0156 15.122C10.2825 15.5606 9 17.1305 9 19C9 21.2091 10.7909 23 13 23H20C22.2091 23 24 21.2091 24 19C24 17.1305 22.7175 15.5606 20.9844 15.122C20.7924 12.8136 18.858 11 16.5 11Z" clipRule="evenodd" fillRule="evenodd" />
                    </svg>
                  </div>
                  <div className="text">
                    <span>{currentFileUrl ? 'Click to upload new file' : 'Click to upload file'} (PDF, DOC, DOCX, TXT, Images)</span>
                  </div>
                  <input 
                    type="file" 
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
                    onChange={handleFileChange}
                  />
                </label>
                
                {selectedFile && (
                  <div className="flex items-center gap-2 p-3 bg-accent rounded-lg">
                    <FileText className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={clearFile}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground">
                  Maximum file size: 10MB. Accepted formats: PDF, DOC, DOCX, TXT, JPG, PNG, GIF
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpdate} disabled={loading}>
            {loading ? "Updating..." : "Update Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
