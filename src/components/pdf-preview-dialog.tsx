"use client";

import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PdfPreviewDialogProps {
  src: string;
  filename: string;
}

export function PdfPreviewDialog({ src, filename }: PdfPreviewDialogProps) {
  return (
    <Dialog>
      <DialogTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
        Preview
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="font-mono">{filename}</DialogTitle>
        </DialogHeader>
        <iframe
          src={src}
          sandbox="allow-same-origin allow-downloads allow-popups"
          className="h-[75vh] w-full rounded-md border"
          title={filename}
        />
      </DialogContent>
    </Dialog>
  );
}
