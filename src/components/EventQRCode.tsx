import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { getAppUrl } from "@/lib/constants";

interface EventQRCodeProps {
  eventId: string;
  eventTitle: string;
  societySlug: string;
  eventSlug: string;
  size?: number;
}

export const EventQRCode = ({ eventId, eventTitle, societySlug, eventSlug, size = 256 }: EventQRCodeProps) => {
  const eventUrl = `${getAppUrl()}/${societySlug}/${eventSlug}`;

  const downloadQRCode = () => {
    const svg = document.getElementById(`qr-${eventId}`);
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    canvas.width = size;
    canvas.height = size;

    img.onload = () => {
      ctx?.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${eventTitle.replace(/\s+/g, "-")}-qr-code.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("QR code downloaded");
      });
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const printQRCode = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const svg = document.getElementById(`qr-${eventId}`);
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${eventTitle}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: system-ui, sans-serif;
            }
            .qr-container {
              text-align: center;
              padding: 2rem;
            }
            h1 {
              margin-bottom: 1rem;
              font-size: 1.5rem;
            }
            .url {
              margin-top: 1rem;
              color: #666;
              font-size: 0.875rem;
            }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <h1>${eventTitle}</h1>
            ${svgData}
            <p class="url">${eventUrl}</p>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(eventUrl);
    toast.success("Event link copied to clipboard");
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="bg-white p-4 rounded-lg">
        <QRCodeSVG
          id={`qr-${eventId}`}
          value={eventUrl}
          size={size}
          level="H"
          includeMargin={true}
        />
      </div>
      <div className="flex gap-2 flex-wrap justify-center">
        <Button variant="outline" size="sm" onClick={downloadQRCode}>
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
        <Button variant="outline" size="sm" onClick={printQRCode}>
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
        <Button variant="outline" size="sm" onClick={copyLink}>
          Copy Link
        </Button>
      </div>
    </div>
  );
};
