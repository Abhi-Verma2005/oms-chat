import type { CSVMetadata, XLSXMetadata, DOCXMetadata, PDFMetadata, CSVRow } from './file-processor'

export interface DocumentChunk {
  text: string
  index: number
  metadata: {
    documentId: string
    documentName: string
    userId: string
    chunkIndex: number
    chunkType: string
    totalChunks: number
    [key: string]: any
  }
}

export class DocumentChunking {
  chunkDocument(
    content: string,
    documentId: string,
    documentName: string,
    userId: string,
    chunkSize: number = 1000,
    overlap: number = 200,
    csvMetadata?: CSVMetadata,
    xlsxMetadata?: XLSXMetadata,
    docxMetadata?: DOCXMetadata,
    pdfMetadata?: PDFMetadata
  ): DocumentChunk[] {
    // Check if this is CSV data
    if (csvMetadata && csvMetadata.headers && csvMetadata.headers.length > 0) {
      return this.chunkCSVDocument(content, csvMetadata, documentId, documentName, userId)
    }
    
    // Check if this is XLSX data
    if (xlsxMetadata && xlsxMetadata.sheets && xlsxMetadata.sheets.length > 0) {
      return this.chunkXLSXDocument(content, xlsxMetadata, documentId, documentName, userId)
    }
    
    // Check if this is DOCX data
    if (docxMetadata && docxMetadata.structure && docxMetadata.structure.headings.length > 0) {
      return this.chunkDOCXDocument(content, docxMetadata, documentId, documentName, userId)
    }
    
    // Check if this is PDF data
    if (pdfMetadata && pdfMetadata.structure && pdfMetadata.structure.pages.length > 0) {
      return this.chunkPDFDocument(content, pdfMetadata, documentId, documentName, userId)
    }
    
    // Default paragraph-based chunking for other documents
    return this.chunkDefault(content, documentId, documentName, userId, chunkSize, overlap)
  }

  private chunkDefault(
    content: string,
    documentId: string,
    documentName: string,
    userId: string,
    chunkSize: number,
    overlap: number
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = []
    let chunkIndex = 0
    
    // Split by paragraphs (double newlines)
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim())
    let currentChunk = ''
    
    for (const paragraph of paragraphs) {
      const trimmedPara = paragraph.trim()
      
      // Check if adding this paragraph would exceed chunk size
      if ((currentChunk + '\n\n' + trimmedPara).length > chunkSize && currentChunk.length > 0) {
        // Save current chunk
        chunks.push({
          text: currentChunk.trim(),
          index: chunkIndex,
          metadata: {
            documentId,
            documentName,
            userId,
            chunkIndex,
            chunkType: 'paragraph',
            totalChunks: 0
          }
        })
        
        // Create overlap: take last ~200 chars from current chunk
        const overlapText = currentChunk.slice(-overlap).trim()
        currentChunk = overlapText + '\n\n' + trimmedPara
        chunkIndex++
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + trimmedPara
      }
    }
    
    // Add final chunk
    if (currentChunk.trim()) {
      chunks.push({
        text: currentChunk.trim(),
        index: chunkIndex,
        metadata: {
          documentId,
          documentName,
          userId,
          chunkIndex,
          chunkType: 'paragraph',
          totalChunks: 0
        }
      })
    }
    
    // Update total chunks count
    const totalChunks = chunks.length
    chunks.forEach(chunk => chunk.metadata.totalChunks = totalChunks)
    
    return chunks
  }

  private chunkCSVDocument(
    csvContent: string,
    csvMetadata: CSVMetadata,
    documentId: string,
    documentName: string,
    userId: string
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = []
    let chunkIndex = 0
    
    // Parse the CSV content to get rows
    const lines = csvContent.split('\n').filter(line => line.trim())
    if (lines.length < 2) return []
    
    const headers = csvMetadata.headers
    const rows: CSVRow[] = []
    
    // Parse rows from the content
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      if (line.includes('Row')) {
        const values = line.split('Row')[1].split(':')[1]?.split('|').map(v => v.trim().replace(/"/g, '')) || []
        const row: CSVRow = {}
        headers.forEach((header, index) => {
          row[header] = values[index] || ''
        })
        rows.push(row)
      }
    }
    
    // Strategy 1: Summary chunk (HIGHEST PRIORITY)
    const summaryChunk = this.generateCSVSummary(headers, rows, csvMetadata)
    chunks.push({
      text: summaryChunk,
      index: chunkIndex,
      metadata: {
        documentId,
        documentName,
        userId,
        chunkIndex,
        chunkType: 'csv_summary',
        priority: 'high',
        totalChunks: 0
      }
    })
    chunkIndex++
    
    // Strategy 2: Column-based chunking
    headers.forEach((header, index) => {
      const columnData = rows.map(row => `${header}: ${row[header]}`).join('\n')
      const columnChunk = `Column Analysis: ${header}\n\n${columnData}`
      
      chunks.push({
        text: columnChunk,
        index: chunkIndex,
        metadata: {
          documentId,
          documentName,
          userId,
          chunkIndex,
          chunkType: 'csv_column',
          columnName: header,
          columnIndex: index,
          columnType: csvMetadata.columnTypes[header],
          priority: 'medium',
          totalChunks: 0
        }
      })
      chunkIndex++
    })
    
    // Strategy 3: Row-based chunking
    const rowsPerChunk = 20
    for (let i = 0; i < rows.length; i += rowsPerChunk) {
      const chunkRows = rows.slice(i, i + rowsPerChunk)
      const chunkText = this.formatRowsForChunk(headers, chunkRows, i === 0, csvMetadata)
      
      chunks.push({
        text: chunkText,
        index: chunkIndex,
        metadata: {
          documentId,
          documentName,
          userId,
          chunkIndex,
          chunkType: 'csv_rows',
          rowRange: `${i}-${i + chunkRows.length - 1}`,
          headers: i === 0 ? headers : undefined,
          priority: 'low',
          totalChunks: 0
        }
      })
      chunkIndex++
    }
    
    // Strategy 4: Statistical analysis chunks
    const numericColumns = headers.filter(header => 
      csvMetadata.columnTypes[header] === 'number' || 
      csvMetadata.columnTypes[header] === 'integer'
    )
    
    if (numericColumns.length > 0) {
      const statsChunk = this.generateStatisticalAnalysis(numericColumns, rows, csvMetadata)
      chunks.push({
        text: statsChunk,
        index: chunkIndex,
        metadata: {
          documentId,
          documentName,
          userId,
          chunkIndex,
          chunkType: 'csv_statistics',
          priority: 'medium',
          totalChunks: 0
        }
      })
      chunkIndex++
    }
    
    // Update total chunks count
    const totalChunks = chunks.length
    chunks.forEach(chunk => chunk.metadata.totalChunks = totalChunks)
    
    return chunks
  }

  private formatRowsForChunk(headers: string[], rows: CSVRow[], includeHeaders: boolean, csvMetadata?: CSVMetadata): string {
    let text = ''
    
    if (includeHeaders) {
      text += `CSV Data - Headers: ${headers.join(' | ')}\n\n`
    }
    
    text += `Data Rows:\n`
    rows.forEach((row, index) => {
      const values = headers.map(header => {
        const value = row[header] || ''
        if (csvMetadata?.columnTypes?.[header] === 'number' || csvMetadata?.columnTypes?.[header] === 'integer') {
          return typeof value === 'number' ? value.toString() : value
        } else if (csvMetadata?.columnTypes?.[header] === 'date') {
          return value.toString()
        } else {
          return `"${value}"`
        }
      }).join(' | ')
      text += `Row ${index + 1}: ${values}\n`
    })
    
    return text
  }

  private generateCSVSummary(headers: string[], rows: CSVRow[], csvMetadata: CSVMetadata): string {
    let summary = `CSV Document Summary\n\n`
    summary += `Document: ${csvMetadata.headers.length} columns, ${csvMetadata.rowCount} rows\n\n`
    
    summary += `Columns:\n`
    headers.forEach(header => {
      const type = csvMetadata.columnTypes[header] || 'unknown'
      summary += `- ${header} (${type})\n`
    })
    
    summary += `\nSample Data:\n`
    const sampleRows = rows.slice(0, 3)
    sampleRows.forEach((row, index) => {
      const values = headers.map(header => row[header] || '').join(' | ')
      summary += `Row ${index + 1}: ${values}\n`
    })
    
    if (rows.length > 3) {
      summary += `... and ${rows.length - 3} more rows\n`
    }
    
    return summary
  }

  private generateStatisticalAnalysis(numericColumns: string[], rows: CSVRow[], csvMetadata: CSVMetadata): string {
    let stats = `Statistical Analysis\n\n`
    
    numericColumns.forEach(column => {
      const values = rows.map(row => Number(row[column])).filter(val => !isNaN(val))
      
      if (values.length > 0) {
        const sorted = [...values].sort((a, b) => a - b)
        const min = sorted[0]
        const max = sorted[sorted.length - 1]
        const sum = values.reduce((acc, val) => acc + val, 0)
        const avg = sum / values.length
        const median = sorted.length % 2 === 0 
          ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : sorted[Math.floor(sorted.length / 2)]
        
        const q1Index = Math.floor(sorted.length * 0.25)
        const q3Index = Math.floor(sorted.length * 0.75)
        const q1 = sorted[q1Index]
        const q3 = sorted[q3Index]
        
        stats += `${column}:\n`
        stats += `  Count: ${values.length}\n`
        stats += `  Min: ${min}\n`
        stats += `  Max: ${max}\n`
        stats += `  Average: ${avg.toFixed(2)}\n`
        stats += `  Median: ${median}\n`
        stats += `  Q1: ${q1}\n`
        stats += `  Q3: ${q3}\n`
        stats += `  Range: ${max - min}\n\n`
      }
    })
    
    return stats
  }

  private chunkXLSXDocument(
    xlsxContent: string,
    xlsxMetadata: XLSXMetadata,
    documentId: string,
    documentName: string,
    userId: string
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = []
    let chunkIndex = 0
    
    // Strategy 1: Workbook summary chunk
    const workbookSummary = this.generateXLSXSummary(xlsxMetadata)
    chunks.push({
      text: workbookSummary,
      index: chunkIndex,
      metadata: {
        documentId,
        documentName,
        userId,
        chunkIndex,
        chunkType: 'xlsx_summary',
        priority: 'high',
        totalChunks: 0
      }
    })
    chunkIndex++
    
    // Strategy 2: Sheet-specific chunks
    xlsxMetadata.sheets.forEach((sheet, sheetIndex) => {
      const sheetOverview = this.generateSheetOverview(sheet, sheetIndex)
      chunks.push({
        text: sheetOverview,
        index: chunkIndex,
        metadata: {
          documentId,
          documentName,
          userId,
          chunkIndex,
          chunkType: 'xlsx_sheet_overview',
          sheetName: sheet.name,
          sheetIndex,
          priority: 'high',
          totalChunks: 0
        }
      })
      chunkIndex++
      
      // Column analysis chunks
      sheet.headers.forEach((header, colIndex) => {
        const columnAnalysis = this.generateColumnAnalysis(header, sheet, colIndex)
        chunks.push({
          text: columnAnalysis,
          index: chunkIndex,
          metadata: {
            documentId,
            documentName,
            userId,
            chunkIndex,
            chunkType: 'xlsx_column',
            sheetName: sheet.name,
            columnName: header,
            columnIndex: colIndex,
            columnType: sheet.dataTypes[header],
            priority: 'medium',
            totalChunks: 0
          }
        })
        chunkIndex++
      })
    })
    
    // Update total chunks count
    const totalChunks = chunks.length
    chunks.forEach(chunk => chunk.metadata.totalChunks = totalChunks)
    
    return chunks
  }

  private generateXLSXSummary(xlsxMetadata: XLSXMetadata): string {
    let summary = `Excel Workbook Summary\n\n`
    summary += `Document: ${xlsxMetadata.totalSheets} sheets\n\n`
    
    summary += `Workbook Features:\n`
    if (xlsxMetadata.hasFormulas) summary += `- Contains formulas\n`
    if (xlsxMetadata.hasCharts) summary += `- Contains charts\n`
    if (xlsxMetadata.hasMacros) summary += `- Contains macros\n`
    
    summary += `\nSheets Overview:\n`
    xlsxMetadata.sheets.forEach((sheet, index) => {
      summary += `${index + 1}. ${sheet.name}: ${sheet.rowCount} rows × ${sheet.columnCount} columns\n`
    })
    
    return summary
  }

  private generateSheetOverview(sheet: XLSXMetadata['sheets'][0], sheetIndex: number): string {
    let overview = `Sheet: ${sheet.name}\n\n`
    overview += `Dimensions: ${sheet.rowCount} rows × ${sheet.columnCount} columns\n`
    overview += `Headers: ${sheet.headers.join(' | ')}\n\n`
    
    overview += `Data Types:\n`
    sheet.headers.forEach(header => {
      overview += `- ${header}: ${sheet.dataTypes[header]}\n`
    })
    
    return overview
  }

  private generateColumnAnalysis(header: string, sheet: XLSXMetadata['sheets'][0], colIndex: number): string {
    let analysis = `Column Analysis: ${header}\n\n`
    analysis += `Type: ${sheet.dataTypes[header]}\n`
    analysis += `Position: Column ${colIndex + 1}\n`
    
    if (sheet.dataTypes[header] === 'number' || sheet.dataTypes[header] === 'integer') {
      analysis += `This is a numeric column suitable for calculations and statistical analysis.\n`
    } else if (sheet.dataTypes[header] === 'date') {
      analysis += `This is a date column for temporal analysis.\n`
    } else {
      analysis += `This is a text column for categorical analysis.\n`
    }
    
    return analysis
  }

  private chunkDOCXDocument(
    content: string,
    docxMetadata: DOCXMetadata,
    documentId: string,
    documentName: string,
    userId: string
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = []
    let chunkIndex = 0
    
    // Strategy 1: Document summary
    const docSummary = this.generateDOCXSummary(docxMetadata)
    chunks.push({
      text: docSummary,
      index: chunkIndex,
      metadata: {
        documentId,
        documentName,
        userId,
        chunkIndex,
        chunkType: 'docx_summary',
        priority: 'high',
        totalChunks: 0
      }
    })
    chunkIndex++
    
    // Strategy 2: Document outline
    if (docxMetadata.structure.headings.length > 0) {
      const outline = this.generateDOCXOutline(docxMetadata)
      chunks.push({
        text: outline,
        index: chunkIndex,
        metadata: {
          documentId,
          documentName,
          userId,
          chunkIndex,
          chunkType: 'docx_outline',
          priority: 'high',
          totalChunks: 0
        }
      })
      chunkIndex++
    }
    
    // Strategy 3: Paragraph-based chunking
    const paragraphsPerChunk = 3
    for (let i = 0; i < docxMetadata.structure.paragraphs.length; i += paragraphsPerChunk) {
      const chunkParagraphs = docxMetadata.structure.paragraphs.slice(i, i + paragraphsPerChunk)
      const chunkText = chunkParagraphs.map(p => p.text).join('\n\n')
      
      chunks.push({
        text: chunkText,
        index: chunkIndex,
        metadata: {
          documentId,
          documentName,
          userId,
          chunkIndex,
          chunkType: 'docx_paragraph',
          paragraphRange: `${i}-${i + chunkParagraphs.length - 1}`,
          priority: 'low',
          totalChunks: 0
        }
      })
      chunkIndex++
    }
    
    // Update total chunks count
    const totalChunks = chunks.length
    chunks.forEach(chunk => chunk.metadata.totalChunks = totalChunks)
    
    return chunks
  }

  private generateDOCXSummary(docxMetadata: DOCXMetadata): string {
    let summary = `Word Document Summary\n\n`
    
    if (docxMetadata.documentInfo.title) summary += `Title: ${docxMetadata.documentInfo.title}\n`
    if (docxMetadata.documentInfo.author) summary += `Author: ${docxMetadata.documentInfo.author}\n`
    if (docxMetadata.documentInfo.pages) summary += `Pages: ${docxMetadata.documentInfo.pages}\n`
    if (docxMetadata.documentInfo.words) summary += `Words: ${docxMetadata.documentInfo.words}\n`
    
    summary += `\nDocument Structure:\n`
    summary += `- Headings: ${docxMetadata.structure.headings.length}\n`
    summary += `- Paragraphs: ${docxMetadata.structure.paragraphs.length}\n`
    summary += `- Tables: ${docxMetadata.structure.tables.length}\n`
    summary += `- Lists: ${docxMetadata.structure.lists.length}\n`
    
    summary += `\nContent Analysis:\n`
    summary += `- Language: ${docxMetadata.contentAnalysis.language}\n`
    summary += `- Readability Score: ${docxMetadata.contentAnalysis.readabilityScore.toFixed(1)}\n`
    summary += `- Document Type: ${docxMetadata.contentAnalysis.documentType}\n`
    
    return summary
  }

  private generateDOCXOutline(docxMetadata: DOCXMetadata): string {
    let outline = `Document Outline\n\n`
    
    docxMetadata.structure.headings.forEach(heading => {
      const indent = '  '.repeat(heading.level - 1)
      outline += `${indent}${heading.text} (Level ${heading.level})\n`
    })
    
    return outline
  }

  private chunkPDFDocument(
    content: string,
    pdfMetadata: PDFMetadata,
    documentId: string,
    documentName: string,
    userId: string
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = []
    let chunkIndex = 0
    
    // Strategy 1: PDF summary
    const pdfSummary = this.generatePDFSummary(pdfMetadata)
    chunks.push({
      text: pdfSummary,
      index: chunkIndex,
      metadata: {
        documentId,
        documentName,
        userId,
        chunkIndex,
        chunkType: 'pdf_summary',
        priority: 'high',
        totalChunks: 0
      }
    })
    chunkIndex++
    
    // Strategy 2: Page-based chunking
    pdfMetadata.structure.pages.forEach((page, pageIndex) => {
      if (page.text.trim().length > 0) {
        chunks.push({
          text: `Page ${page.pageNumber}\n\n${page.text}`,
          index: chunkIndex,
          metadata: {
            documentId,
            documentName,
            userId,
            chunkIndex,
            chunkType: 'pdf_page',
            pageNumber: page.pageNumber,
            priority: 'medium',
            totalChunks: 0
          }
        })
        chunkIndex++
      }
    })
    
    // Update total chunks count
    const totalChunks = chunks.length
    chunks.forEach(chunk => chunk.metadata.totalChunks = totalChunks)
    
    return chunks
  }

  private generatePDFSummary(pdfMetadata: PDFMetadata): string {
    let summary = `PDF Document Summary\n\n`
    summary += `Title: ${pdfMetadata.documentInfo.title || 'Untitled'}\n`
    summary += `Author: ${pdfMetadata.documentInfo.author || 'Unknown'}\n`
    summary += `Pages: ${pdfMetadata.documentInfo.pageCount}\n`
    summary += `Total Words: ${pdfMetadata.contentAnalysis.totalWordCount}\n`
    summary += `Document Type: ${pdfMetadata.contentAnalysis.documentType}\n`
    
    summary += `\nDocument Structure:\n`
    summary += `- Headings: ${pdfMetadata.structure.headings.length}\n`
    summary += `- Paragraphs: ${pdfMetadata.structure.paragraphs.length}\n`
    summary += `- Tables: ${pdfMetadata.structure.tables.length}\n`
    
    return summary
  }
}

export const documentChunking = new DocumentChunking()

