import { Button } from "@/components/ui/button";
import { Download, Printer, Copy } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

interface SocietyInviteQRCodeProps {
  societyName: string;
  inviteUrl: string;
  inviteType: "attendee" | "committee";
  size?: number;
}

export const SocietyInviteQRCode = ({
  societyName,
  inviteUrl,
  inviteType,
  size = 256,
}: SocietyInviteQRCodeProps) => {
  const qrCodeId = `qr-society-${inviteType}-${societyName.replace(/\s+/g, "-").toLowerCase()}`;

  const downloadQRCode = () => {
    const svg = document.getElementById(qrCodeId);
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    canvas.width = size + 40;
    canvas.height = size + 40;

    img.onload = () => {
      if (!ctx) return;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 20, 20, size, size);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${societyName}-${inviteType}-invite-qr.png`;
        a.click();
        URL.revokeObjectURL(url);
      });
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const printQRCode = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print QR Code - ${societyName}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: system-ui, -apple-system, sans-serif;
            }
            .container {
              text-align: center;
              padding: 40px;
            }
            h1 {
              font-size: 24px;
              margin-bottom: 10px;
              color: #1a1a1a;
            }
            p {
              font-size: 16px;
              color: #666;
              margin-bottom: 30px;
            }
            .qr-wrapper {
              background: white;
              padding: 20px;
              border-radius: 8px;
              display: inline-block;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            @media print {
              body {
                background: white;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>${societyName}</h1>
            <p>${inviteType.charAt(0).toUpperCase() + inviteType.slice(1)} Invite</p>
            <div class="qr-wrapper">
              ${document.getElementById(qrCodeId)?.outerHTML || ""}
            </div>
          </div>
          <script>
            window.onload = () => {
              window.print();
              window.onafterprint = () => window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="bg-white p-4 rounded-lg">
        <QRCodeSVG
          id={qrCodeId}
          value={inviteUrl}
          size={size}
          level="H"
          includeMargin={false}
        />
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        <Button onClick={downloadQRCode} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
        <Button onClick={printQRCode} variant="outline" size="sm">
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
        <Button onClick={copyLink} variant="outline" size="sm">
          <Copy className="h-4 w-4 mr-2" />
          Copy Link
        </Button>
      </div>
    </div>
  );
};
