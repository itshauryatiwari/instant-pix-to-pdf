import {
  FileImage,
  Image as ImageIcon,
  Combine,
  Scissors,
  Minimize2,
  RotateCw,
  Crop,
  Trash2,
  FileText,
  Lock,
  Unlock,
  FileSignature,
  Stamp,
  Eye,
  Layers,
  FileCode,
  FileSpreadsheet,
  Presentation,
  ScanText,
  Hash,
  ListOrdered,
  type LucideIcon,
} from "lucide-react";

export type Tool = {
  slug: string;
  title: string;
  description: string;
  icon: LucideIcon;
  available?: boolean;
};

export const TOOLS: Tool[] = [
  {
    slug: "image-to-pdf",
    title: "Image to PDF",
    description: "Turn JPG, PNG or HEIC images into a single PDF.",
    icon: FileImage,
    available: true,
  },
  { slug: "pdf-to-image", title: "PDF to Image", description: "Export every page of a PDF as a high-quality image.", icon: ImageIcon, available: true },
  { slug: "merge-pdf", title: "Merge PDF", description: "Combine several PDFs into one document in seconds.", icon: Combine, available: true },
  { slug: "split-pdf", title: "Split PDF", description: "Split a PDF into individual pages or custom ranges.", icon: Scissors, available: true },
  { slug: "compress-pdf", title: "Compress PDF", description: "Reduce PDF file size while keeping quality intact.", icon: Minimize2, available: true },
  { slug: "rotate-pdf", title: "Rotate PDF", description: "Rotate one or all pages of a PDF document.", icon: RotateCw, available: true },
  { slug: "crop-pdf", title: "Crop PDF", description: "Trim white margins or crop pages to a fixed size.", icon: Crop },
  { slug: "delete-pages", title: "Delete Pages", description: "Remove unwanted pages from a PDF file.", icon: Trash2 },
  { slug: "word-to-pdf", title: "Word to PDF", description: "Convert DOCX documents to a polished PDF.", icon: FileText },
  { slug: "pdf-to-word", title: "PDF to Word", description: "Turn PDFs back into editable Word documents.", icon: FileText },
  { slug: "excel-to-pdf", title: "Excel to PDF", description: "Export spreadsheets to a clean PDF layout.", icon: FileSpreadsheet },
  { slug: "pdf-to-excel", title: "PDF to Excel", description: "Extract tables from PDFs into Excel sheets.", icon: FileSpreadsheet },
  { slug: "powerpoint-to-pdf", title: "PowerPoint to PDF", description: "Convert PPTX decks to a shareable PDF.", icon: Presentation },
  { slug: "pdf-to-powerpoint", title: "PDF to PowerPoint", description: "Turn PDFs into editable PPTX presentations.", icon: Presentation },
  { slug: "protect-pdf", title: "Protect PDF", description: "Add a password to keep your PDF private.", icon: Lock },
  { slug: "unlock-pdf", title: "Unlock PDF", description: "Remove password protection from a PDF.", icon: Unlock },
  { slug: "sign-pdf", title: "Sign PDF", description: "Add a signature to any PDF document.", icon: FileSignature },
  { slug: "watermark-pdf", title: "Watermark PDF", description: "Stamp a watermark across every page.", icon: Stamp },
  { slug: "organize-pdf", title: "Organize PDF", description: "Reorder, rotate and remove PDF pages visually.", icon: Layers },
  { slug: "page-numbers", title: "Page Numbers", description: "Insert page numbers with full styling control.", icon: Hash },
  { slug: "html-to-pdf", title: "HTML to PDF", description: "Save any web page or HTML snippet as a PDF.", icon: FileCode },
  { slug: "ocr-pdf", title: "OCR PDF", description: "Recognize text in scanned PDFs and images.", icon: ScanText },
  { slug: "extract-text", title: "Extract Text", description: "Pull all text out of a PDF as plain text.", icon: ListOrdered },
  { slug: "pdf-viewer", title: "PDF Viewer", description: "Open and read any PDF right in your browser.", icon: Eye },
];

export const HOME_TOOLS = TOOLS.slice(0, 8);
