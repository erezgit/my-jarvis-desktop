import { Download, FileText, FileEdit, FileCode } from 'lucide-react';
import { saveAs } from 'file-saver';
import { pdf, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { Document as DocxDocument, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface FileDownloadButtonProps {
  fileName: string;
  content: string;
}

// Styles for PDF generation
const pdfStyles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 12,
    fontFamily: 'Helvetica',
    lineHeight: 1.6,
  },
  title: {
    fontSize: 18,
    marginBottom: 20,
    fontWeight: 'bold',
  },
  paragraph: {
    marginBottom: 10,
  },
});

export function FileDownloadButton({ fileName, content }: FileDownloadButtonProps) {
  const handleMarkdownDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const mdFileName = fileName.replace(/\.[^/.]+$/, '') + '.md';
    saveAs(blob, mdFileName);
  };

  const handlePdfDownload = async () => {
    try {
      // Split content into paragraphs for better formatting
      const paragraphs = content.split('\n\n').filter(p => p.trim());

      const MyDocument = (
        <Document>
          <Page size="A4" style={pdfStyles.page}>
            <View>
              <Text style={pdfStyles.title}>{fileName}</Text>
              {paragraphs.map((paragraph, index) => (
                <Text key={index} style={pdfStyles.paragraph}>
                  {paragraph.replace(/[#*`_]/g, '')} {/* Remove basic markdown formatting */}
                </Text>
              ))}
            </View>
          </Page>
        </Document>
      );

      const blob = await pdf(MyDocument).toBlob();
      const pdfFileName = fileName.replace(/\.[^/.]+$/, '') + '.pdf';
      saveAs(blob, pdfFileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handleWordDownload = async () => {
    try {
      // Parse content into paragraphs
      const lines = content.split('\n').filter(line => line.trim());
      const children: Paragraph[] = [];

      lines.forEach((line) => {
        // Check if it's a heading
        if (line.startsWith('# ')) {
          children.push(
            new Paragraph({
              text: line.substring(2),
              heading: HeadingLevel.HEADING_1,
              spacing: { after: 200 },
            })
          );
        } else if (line.startsWith('## ')) {
          children.push(
            new Paragraph({
              text: line.substring(3),
              heading: HeadingLevel.HEADING_2,
              spacing: { after: 150 },
            })
          );
        } else if (line.startsWith('### ')) {
          children.push(
            new Paragraph({
              text: line.substring(4),
              heading: HeadingLevel.HEADING_3,
              spacing: { after: 100 },
            })
          );
        } else {
          // Regular paragraph - handle basic formatting
          const runs: TextRun[] = [];
          let currentText = line;

          // Simple bold/italic handling (basic implementation)
          // This is a simplified approach - full markdown parsing would be more complex
          runs.push(new TextRun({ text: currentText.replace(/[*_`]/g, '') }));

          children.push(
            new Paragraph({
              children: runs,
              spacing: { after: 100 },
            })
          );
        }
      });

      const doc = new DocxDocument({
        sections: [{
          properties: {},
          children: children,
        }],
      });

      const blob = await Packer.toBlob(doc);
      const docxFileName = fileName.replace(/\.[^/.]+$/, '') + '.docx';
      saveAs(blob, docxFileName);
    } catch (error) {
      console.error('Error generating Word document:', error);
      alert('Failed to generate Word document. Please try again.');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
          title="Download file"
          aria-label="Download file"
        >
          <Download className="h-4 w-4 text-gray-700 dark:text-gray-300" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handlePdfDownload}>
          <FileText className="mr-2 h-4 w-4" />
          <span>Download as PDF</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleWordDownload}>
          <FileEdit className="mr-2 h-4 w-4" />
          <span>Download as Word</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleMarkdownDownload}>
          <FileCode className="mr-2 h-4 w-4" />
          <span>Download as Markdown</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
