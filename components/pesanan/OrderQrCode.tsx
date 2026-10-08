"use client";

import { QRCodeSVG } from "qrcode.react";

export function OrderQrCode({ code }: { code: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 ring-1 ring-cocoa/10">
      <QRCodeSVG
        value={code}
        size={168}
        level="M"
        fgColor="#6B3A2E"
        bgColor="#FFFFFF"
        title={`QR kode pesanan ${code}`}
      />
    </div>
  );
}
