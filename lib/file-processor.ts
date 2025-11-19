import mammoth from 'mammoth'
import * as Papa from 'papaparse'
import PDFParser from 'pdf-parse/lib/pdf-parse'
import * as XLSX from 'xlsx'

export interface ExtractionResult {
  content: string
  success: boolean
  error?: string
  metadata?: {
    pageCount?: number
    wordCount?: number
    csvMetadata?: CSVMetadata
    xlsxMetadata?: XLSXMetadata
    docxMetadata?: DOCXMetadata
    pdfMetadata?: PDFMetadata
    rawRows?: CSVRow[] // For CSV rows storage in database
  }
}

export interface CSVRow {
  [key: string]: string | number | boolean
}

export interface CSVMetadata {
  headers: string[]
  rowCount: number
  columnTypes: { [key: string]: string }
  sampleData: CSVRow[]
}

export interface XLSXMetadata {
  sheets: Array<{
    name: string
    rowCount: number
    columnCount: number
    headers: string[]
    dataTypes: { [key: string]: string }
    hasFormulas: boolean
    hasCharts: boolean
    mergedCells: Array<{ range: string; value: any }>
  }>
  totalSheets: number
  hasFormulas: boolean
  hasCharts: boolean
  hasMacros: boolean
}

export interface PDFMetadata {
  documentInfo: {
    title?: string
    author?: string
    subject?: string
    creator?: string
    producer?: string
    creationDate?: Date
    modificationDate?: Date
    keywords?: string
    pageCount: number
  }
  structure: {
    pages: Array<{
      pageNumber: number
      text: string
      wordCount: number
      hasImages: boolean
      hasTables: boolean
      hasFormFields: boolean
    }>
    headings: Array<{
      level: number
      text: string
      pageNumber: number
      position: number
    }>
    paragraphs: Array<{
      text: string
      pageNumber: number
      position: number
      wordCount: number
    }>
    tables: Array<{
      pageNumber: number
      rows: number
      columns: number
      content: string
      position: number
    }>
    images: Array<{
      pageNumber: number
      description?: string
      position: number
    }>
    formFields: Array<{
      name: string
      type: string
      pageNumber: number
      value?: string
    }>
  }
  contentAnalysis: {
    language: string
    readabilityScore: number
    avgWordsPerPage: number
    totalWordCount: number
    topicKeywords: string[]
    documentType: string
    hasFootnotes: boolean
    hasReferences: boolean
    hasBibliography: boolean
  }
}

export interface DOCXMetadata {
  documentInfo: {
    title?: string
    author?: string
    subject?: string
    keywords?: string
    creator?: string
    created?: string
    modified?: string
    lastModifiedBy?: string
    revision?: number
    pages?: number
    words?: number
    characters?: number
    charactersWithSpaces?: number
    lines?: number
    paragraphs?: number
  }
  structure: {
    headings: Array<{
      level: number
      text: string
      style: string
      position: number
    }>
    paragraphs: Array<{
      text: string
      style: string
      position: number
      wordCount: number
      hasFormatting: boolean
    }>
    tables: Array<{
      rows: number
      columns: number
      content: string
      position: number
      hasHeaders: boolean
    }>
    lists: Array<{
      items: string[]
      type: 'ordered' | 'unordered'
      position: number
      level: number
    }>
    images: Array<{
      altText?: string
      position: number
      size?: { width: number; height: number }
    }>
    hyperlinks: Array<{
      text: string
      url: string
      position: number
    }>
  }
  formatting: {
    hasBold: boolean
    hasItalic: boolean
    hasUnderline: boolean
    hasStrikethrough: boolean
    hasHighlight: boolean
    hasSuperscript: boolean
    hasSubscript: boolean
    fontStyles: string[]
    fontSizeRanges: { min: number; max: number }
  }
  contentAnalysis: {
    language: string
    readabilityScore: number
    complexityLevel: 'simple' | 'moderate' | 'complex'
    topicKeywords: string[]
    documentType: 'report' | 'letter' | 'memo' | 'proposal' | 'manual' | 'other'
  }
}

export class FileProcessor {
  
  async extractContent(file: File): Promise<ExtractionResult> {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      // Determine file type by extension if MIME type is not specific
      const fileExtension = file.name.split('.').pop()?.toLowerCase()
      let fileType = file.type
      
      // Override MIME type based on file extension for better detection
      if (fileType === 'application/octet-stream' || !fileType) {
        switch (fileExtension) {
          case 'txt':
            fileType = 'text/plain'
            break
          case 'csv':
            fileType = 'text/csv'
            break
          case 'json':
            fileType = 'application/json'
            break
          case 'pdf':
            fileType = 'application/pdf'
            break
          case 'docx':
            fileType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            break
          case 'doc':
            fileType = 'application/msword'
            break
          case 'xlsx':
            fileType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            break
          case 'xls':
            fileType = 'application/vnd.ms-excel'
            break
        }
      }
      
      switch (fileType) {
        case 'text/plain':
          return this.extractText(buffer)
        
        case 'application/pdf':
          return await this.extractPDF(buffer)
        
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          return await this.extractDOCX(buffer)
        
        case 'application/msword':
          return await this.extractDOC(buffer)
        
        case 'text/csv':
          return this.extractCSV(buffer)
        
        case 'application/json':
          return this.extractJSON(buffer)
        
        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        case 'application/vnd.ms-excel':
          return this.extractExcel(buffer)
        
        default:
          return {
            content: '',
            success: false,
            error: `Unsupported file type: ${file.type}`
          }
      }
    } catch (error) {
      return {
        content: '',
        success: false,
        error: error instanceof Error ? error.message : 'Extraction failed'
      }
    }
  }

  private extractText(buffer: Buffer): ExtractionResult {
    const content = buffer.toString('utf-8')
    return {
      content,
      success: true,
      metadata: {
        wordCount: content.split(/\s+/).length
      }
    }
  }

  private async extractPDF(buffer: Buffer): Promise<ExtractionResult> {
    try {
      console.log('📄 Starting enhanced PDF extraction...')
      
      const data = await PDFParser(buffer)
      
      const pdfMetadata = await this.analyzePDFStructure(data, buffer)
      const formattedContent = this.formatPDFForRAG(data, pdfMetadata)
      
      return {
        content: formattedContent,
        success: true,
        metadata: {
          pageCount: pdfMetadata.documentInfo.pageCount,
          wordCount: pdfMetadata.contentAnalysis.totalWordCount,
          pdfMetadata
        }
      }
    } catch (error) {
      console.error('❌ PDF extraction error:', error)
      throw new Error(`PDF extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async extractDOCX(buffer: Buffer): Promise<ExtractionResult> {
    try {
      const textResult = await mammoth.extractRawText({ buffer })
      const htmlResult = await mammoth.convertToHtml({ buffer })
      
      if (textResult.value.trim().length === 0) {
        return {
          content: '',
          success: false,
          error: 'DOCX contains no readable text'
        }
      }
      
      const docxMetadata = this.analyzeDOCXStructure(textResult.value, htmlResult.value, textResult.messages)
      const enhancedContent = this.formatDOCXForRAG(textResult.value, docxMetadata)
      
      return {
        content: enhancedContent,
        success: true,
        metadata: {
          wordCount: textResult.value.split(/\s+/).length,
          docxMetadata
        }
      }
    } catch (error) {
      return {
        content: '',
        success: false,
        error: `DOCX extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  private async extractDOC(buffer: Buffer): Promise<ExtractionResult> {
    try {
      const result = await mammoth.extractRawText({ buffer })
      return {
        content: result.value,
        success: true,
        metadata: {
          wordCount: result.value.split(/\s+/).length
        }
      }
    } catch (error) {
      throw new Error(`DOC extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private extractCSV(buffer: Buffer): ExtractionResult {
    try {
      const content = buffer.toString('utf-8')
      
      const parseResult = Papa.parse(content, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.trim(),
        transform: (value: string) => value.trim()
      })
      
      const headers = parseResult.meta.fields || []
      const parsedData = parseResult.data as any[]
      
      const rows: CSVRow[] = parsedData.map((rawRow) => {
        const row: CSVRow = {}
        headers.forEach((header) => {
          const value = rawRow[header]
          if (value === null || value === undefined || value === '') {
            row[header] = ''
          } else {
            const strValue = String(value)
            if (!isNaN(Number(strValue)) && strValue !== '' && strValue.trim() !== '') {
              row[header] = Number(strValue)
            } else if (strValue.toLowerCase() === 'true' || strValue.toLowerCase() === 'false') {
              row[header] = strValue.toLowerCase() === 'true'
            } else {
              row[header] = strValue
            }
          }
        })
        return row
      }).filter(row => Object.keys(row).length > 0)
      
      const metadata: CSVMetadata = {
        headers,
        rowCount: rows.length,
        columnTypes: this.detectColumnTypes(headers, rows),
        sampleData: rows.slice(0, 5)
      }
      
      return {
        content: this.formatCSVForRAG(headers, rows, metadata),
        success: true,
        metadata: {
          csvMetadata: metadata,
          rawRows: rows,
          wordCount: content.split(/\s+/).length
        }
      }
    } catch (error) {
      return {
        content: '',
        success: false,
        error: `CSV parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  private extractJSON(buffer: Buffer): ExtractionResult {
    try {
      const jsonString = buffer.toString('utf-8')
      const jsonObj = JSON.parse(jsonString)
      const content = JSON.stringify(jsonObj, null, 2)
      
      return {
        content,
        success: true
      }
    } catch (error) {
      throw new Error('Invalid JSON format')
    }
  }

  private extractExcel(buffer: Buffer): ExtractionResult {
    try {
      const workbook = XLSX.read(buffer, { 
        type: 'buffer',
        cellDates: true,
        cellNF: false,
        cellText: false,
        sheetStubs: false,
        bookDeps: false,
        bookSheets: false,
        bookProps: false,
        bookVBA: false
      })
      
      let content = ''
      const sheetsMetadata: XLSXMetadata['sheets'] = []
      let hasFormulas = false
      let hasCharts = false
      let hasMacros = false
      
      if (workbook.Workbook && (workbook.Workbook as any).VBAProject) {
        hasMacros = true
      }
      
      workbook.SheetNames.forEach((sheetName, sheetIndex) => {
        const sheet = workbook.Sheets[sheetName]
        const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1')
        const rowCount = range.e.r + 1
        const columnCount = range.e.c + 1
        
        const headers: string[] = []
        const dataTypes: { [key: string]: string } = {}
        const mergedCells: Array<{ range: string; value: any }> = []
        
        if (sheet['!merges']) {
          sheet['!merges'].forEach(merge => {
            const startCell = XLSX.utils.encode_cell({ r: merge.s.r, c: merge.s.c })
            const endCell = XLSX.utils.encode_cell({ r: merge.e.r, c: merge.e.c })
            const value = sheet[startCell]?.v || ''
            mergedCells.push({
              range: `${startCell}:${endCell}`,
              value: value
            })
          })
        }
        
        for (let col = 0; col < columnCount; col++) {
          const headerCell = XLSX.utils.encode_cell({ r: 0, c: col })
          const headerValue = sheet[headerCell]?.v || `Column_${col + 1}`
          headers.push(headerValue.toString())
          
          const sampleValues: any[] = []
          for (let row = 1; row < Math.min(11, rowCount); row++) {
            const cell = XLSX.utils.encode_cell({ r: row, c: col })
            const cellValue = sheet[cell]?.v
            if (cellValue !== undefined && cellValue !== null && cellValue !== '') {
              sampleValues.push(cellValue)
            }
          }
          
          dataTypes[headerValue.toString()] = this.detectExcelColumnType(sampleValues)
        }
        
        let sheetHasFormulas = false
        let sheetHasCharts = false
        
        for (let row = 0; row < rowCount; row++) {
          for (let col = 0; col < columnCount; col++) {
            const cell = XLSX.utils.encode_cell({ r: row, c: col })
            if (sheet[cell] && sheet[cell].f) {
              sheetHasFormulas = true
              break
            }
          }
          if (sheetHasFormulas) break
        }
        
        if (sheet['!charts'] && sheet['!charts'].length > 0) {
          sheetHasCharts = true
        }
        
        if (sheetHasFormulas) hasFormulas = true
        if (sheetHasCharts) hasCharts = true
        
        sheetsMetadata.push({
          name: sheetName,
          rowCount,
          columnCount,
          headers,
          dataTypes,
          hasFormulas: sheetHasFormulas,
          hasCharts: sheetHasCharts,
          mergedCells
        })
        
        content += `\n=== Sheet: ${sheetName} ===\n`
        content += `Dimensions: ${rowCount} rows × ${columnCount} columns\n`
        content += `Headers: ${headers.join(' | ')}\n`
        
        if (sheetHasFormulas) content += `⚠️ Contains formulas\n`
        if (sheetHasCharts) content += `📊 Contains charts\n`
        if (mergedCells.length > 0) content += `🔗 Contains ${mergedCells.length} merged cells\n`
        
        content += `\nData Types:\n`
        headers.forEach(header => {
          content += `- ${header}: ${dataTypes[header]}\n`
        })
        
        content += `\nAll Data Rows:\n`
        for (let row = 1; row < rowCount; row++) {
          const rowData: string[] = []
          for (let col = 0; col < columnCount; col++) {
            const cell = XLSX.utils.encode_cell({ r: row, c: col })
            const cellValue = sheet[cell]?.v || ''
            rowData.push(cellValue.toString())
          }
          content += `Row ${row}: ${rowData.join(' | ')}\n`
        }
        
        content += `\n`
      })
      
      const xlsxMetadata: XLSXMetadata = {
        sheets: sheetsMetadata,
        totalSheets: workbook.SheetNames.length,
        hasFormulas,
        hasCharts,
        hasMacros
      }
      
      return {
        content,
        success: true,
        metadata: {
          xlsxMetadata,
          wordCount: content.split(/\s+/).length
        }
      }
    } catch (error) {
      return {
        content: '',
        success: false,
        error: `Excel extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  private detectColumnTypes(headers: string[], rows: CSVRow[]): { [key: string]: string } {
    const types: { [key: string]: string } = {}
    
    headers.forEach(header => {
      const values = rows.map(row => row[header]).filter(val => val !== '' && val !== null && val !== undefined)
      
      if (values.length === 0) {
        types[header] = 'empty'
        return
      }
      
      const sampleSize = Math.min(values.length, 100)
      const sampleValues = values.slice(0, sampleSize)
      
      const allIntegers = sampleValues.every(val => {
        const num = Number(val)
        return !isNaN(num) && Number.isInteger(num) && num >= -2147483648 && num <= 2147483647
      })
      if (allIntegers) {
        types[header] = 'integer'
        return
      }
      
      const allNumbers = sampleValues.every(val => {
        const num = Number(val)
        return !isNaN(num) && isFinite(num)
      })
      if (allNumbers) {
        types[header] = 'number'
        return
      }
      
      const allBooleans = sampleValues.every(val => {
        const str = val.toString().toLowerCase().trim()
        return str === 'true' || str === 'false' || str === '1' || str === '0' || 
               str === 'yes' || str === 'no' || str === 'y' || str === 'n'
      })
      if (allBooleans) {
        types[header] = 'boolean'
        return
      }
      
      const allDates = sampleValues.every(val => {
        const str = val.toString().trim()
        const dateFormats = [
          /^\d{4}-\d{2}-\d{2}$/,
          /^\d{2}\/\d{2}\/\d{4}$/,
          /^\d{2}-\d{2}-\d{4}$/,
          /^\d{4}\/\d{2}\/\d{2}$/,
          /^\d{1,2}\/\d{1,2}\/\d{4}$/,
          /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/,
        ]
        return dateFormats.some(format => format.test(str)) || !isNaN(Date.parse(str))
      })
      if (allDates) {
        types[header] = 'date'
        return
      }
      
      types[header] = 'string'
    })
    
    return types
  }

  private detectExcelColumnType(values: any[]): string {
    if (values.length === 0) return 'empty'
    
    const allIntegers = values.every(val => 
      typeof val === 'number' && Number.isInteger(val) && val >= -2147483648 && val <= 2147483647
    )
    if (allIntegers) return 'integer'
    
    const allNumbers = values.every(val => 
      typeof val === 'number' && !isNaN(val) && isFinite(val)
    )
    if (allNumbers) return 'number'
    
    const allDates = values.every(val => 
      val instanceof Date || (typeof val === 'string' && !isNaN(Date.parse(val)))
    )
    if (allDates) return 'date'
    
    const allBooleans = values.every(val => 
      typeof val === 'boolean' || 
      val === 1 || val === 0 ||
      val === 'TRUE' || val === 'FALSE' ||
      val === 'true' || val === 'false'
    )
    if (allBooleans) return 'boolean'
    
    return 'string'
  }

  private formatCSVForRAG(headers: string[], rows: CSVRow[], csvMetadata?: CSVMetadata): string {
    let content = `CSV Data Analysis\n\n`
    content += `Document Structure: ${headers.length} columns, ${rows.length} rows\n\n`
    
    if (csvMetadata?.columnTypes) {
      content += `Column Information:\n`
      headers.forEach(header => {
        const type = csvMetadata.columnTypes[header] || 'unknown'
        content += `- ${header}: ${type}\n`
      })
      content += `\n`
    }
    
    content += `All Data Rows:\n`
    content += `Headers: ${headers.join(' | ')}\n\n`
    
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
      content += `Row ${index + 1}: ${values}\n`
    })
    
    return content
  }

  // DOCX Analysis Methods (simplified versions)
  private analyzeDOCXStructure(text: string, html: string, messages: any[]): DOCXMetadata {
    const lines = text.split('\n').filter(line => line.trim())
    
    return {
      documentInfo: this.extractDocumentInfo(messages),
      structure: {
        headings: this.detectDOCXHeadings(lines),
        paragraphs: this.detectDOCXParagraphs(lines),
        tables: this.detectDOCXTables(html),
        lists: this.detectDOCXLists(lines),
        images: this.detectDOCXImages(html),
        hyperlinks: this.detectDOCXHyperlinks(html)
      },
      formatting: this.analyzeDOCXFormatting(html),
      contentAnalysis: this.analyzeDOCXContent(text)
    }
  }

  private extractDocumentInfo(messages: any[]): DOCXMetadata['documentInfo'] {
    const info: DOCXMetadata['documentInfo'] = {}
    messages.forEach(message => {
      if (message.type === 'info' && message.message) {
        const msg = message.message.toLowerCase()
        if (msg.includes('pages')) {
          const match = msg.match(/(\d+)\s*pages/)
          if (match) info.pages = parseInt(match[1])
        }
        if (msg.includes('words')) {
          const match = msg.match(/(\d+)\s*words/)
          if (match) info.words = parseInt(match[1])
        }
      }
    })
    return info
  }

  private detectDOCXHeadings(lines: string[]): DOCXMetadata['structure']['headings'] {
    const headings: DOCXMetadata['structure']['headings'] = []
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (line.length > 0 && line.length < 100) {
        let level = 1
        let style = 'Normal'
        if (line.match(/^\d+\.?\s+[A-Z]/)) {
          level = line.match(/^\d+\.\d+\.\d+/) ? 3 : line.match(/^\d+\.\d+/) ? 2 : 1
          style = 'Heading ' + level
        } else if (line.match(/^[A-Z][A-Z\s]+$/) && line.length < 50) {
          level = 1
          style = 'Heading 1'
        } else if (line.length < 50 && !line.includes('.') && !line.includes(',')) {
          level = 3
          style = 'Heading 3'
        }
        if (level <= 3) {
          headings.push({ level, text: line, style, position: i })
        }
      }
    }
    return headings
  }

  private detectDOCXParagraphs(lines: string[]): DOCXMetadata['structure']['paragraphs'] {
    const paragraphs: DOCXMetadata['structure']['paragraphs'] = []
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (line.length > 0) {
        paragraphs.push({
          text: line,
          style: 'Normal',
          position: i,
          wordCount: line.split(/\s+/).length,
          hasFormatting: false
        })
      }
    }
    return paragraphs
  }

  private detectDOCXTables(html: string): DOCXMetadata['structure']['tables'] {
    const tables: DOCXMetadata['structure']['tables'] = []
    const tableRegex = /<table[^>]*>[\s\S]*?<\/table>/gi
    const matches = html.match(tableRegex) || []
    matches.forEach((tableHtml, index) => {
      const rows = (tableHtml.match(/<tr[^>]*>/g) || []).length
      const cells = (tableHtml.match(/<td[^>]*>/g) || []).length
      const columns = rows > 0 ? Math.floor(cells / rows) : 0
      const content = tableHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
      tables.push({
        rows,
        columns,
        content,
        position: index,
        hasHeaders: tableHtml.includes('<th') || tableHtml.includes('header')
      })
    })
    return tables
  }

  private detectDOCXLists(lines: string[]): DOCXMetadata['structure']['lists'] {
    const lists: DOCXMetadata['structure']['lists'] = []
    let currentList: DOCXMetadata['structure']['lists'][0] | null = null
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (line.match(/^[\-\*•]\s+/) || line.match(/^\d+\.\s+/)) {
        if (!currentList) {
          currentList = {
            items: [],
            type: line.match(/^\d+\.\s+/) ? 'ordered' : 'unordered',
            position: i,
            level: 1
          }
        }
        currentList.items.push(line)
      } else if (currentList && line.length === 0) {
        if (currentList.items.length >= 2) {
          lists.push(currentList)
        }
        currentList = null
      }
    }
    if (currentList && currentList.items.length >= 2) {
      lists.push(currentList)
    }
    return lists
  }

  private detectDOCXImages(html: string): DOCXMetadata['structure']['images'] {
    const images: DOCXMetadata['structure']['images'] = []
    const imgRegex = /<img[^>]*>/g
    const matches = html.match(imgRegex) || []
    matches.forEach((imgTag, index) => {
      const altMatch = imgTag.match(/alt="([^"]*)"/)
      images.push({
        altText: altMatch ? altMatch[1] : undefined,
        position: index
      })
    })
    return images
  }

  private detectDOCXHyperlinks(html: string): DOCXMetadata['structure']['hyperlinks'] {
    const hyperlinks: DOCXMetadata['structure']['hyperlinks'] = []
    const linkRegex = /<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g
    let match
    while ((match = linkRegex.exec(html)) !== null) {
      hyperlinks.push({
        text: match[2].replace(/<[^>]*>/g, '').trim(),
        url: match[1],
        position: hyperlinks.length
      })
    }
    return hyperlinks
  }

  private analyzeDOCXFormatting(html: string): DOCXMetadata['formatting'] {
    return {
      hasBold: html.includes('<b>') || html.includes('<strong>'),
      hasItalic: html.includes('<i>') || html.includes('<em>'),
      hasUnderline: html.includes('<u>'),
      hasStrikethrough: html.includes('<s>') || html.includes('<strike>'),
      hasHighlight: html.includes('background-color'),
      hasSuperscript: html.includes('<sup>'),
      hasSubscript: html.includes('<sub>'),
      fontStyles: [],
      fontSizeRanges: { min: 12, max: 12 }
    }
  }

  private analyzeDOCXContent(text: string): DOCXMetadata['contentAnalysis'] {
    const words = text.toLowerCase().split(/\s+/)
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const avgWordsPerSentence = words.length / sentences.length
    const readabilityScore = 206.835 - (1.015 * avgWordsPerSentence)
    
    return {
      language: 'en',
      readabilityScore: Math.max(0, Math.min(100, readabilityScore)),
      complexityLevel: readabilityScore > 70 ? 'simple' : readabilityScore < 30 ? 'complex' : 'moderate',
      topicKeywords: [],
      documentType: 'other'
    }
  }

  private formatDOCXForRAG(text: string, docxMetadata: DOCXMetadata): string {
    let content = `Word Document Analysis\n\n`
    content += `Document Structure:\n`
    content += `- Headings: ${docxMetadata.structure.headings.length}\n`
    content += `- Paragraphs: ${docxMetadata.structure.paragraphs.length}\n`
    content += `- Tables: ${docxMetadata.structure.tables.length}\n\n`
    content += `Document Content:\n${text}`
    return content
  }

  // PDF Analysis Methods (simplified)
  private async analyzePDFStructure(data: any, buffer: Buffer): Promise<PDFMetadata> {
    const text = data.text || ''
    const pages = data.pageTexts || text.split('\f')
    
    return {
      documentInfo: {
        title: data.info?.Title,
        author: data.info?.Author,
        pageCount: data.numpages || 0
      },
      structure: {
        pages: pages.map((pageText: string, index: number) => ({
          pageNumber: index + 1,
          text: pageText.trim(),
          wordCount: pageText.split(/\s+/).filter(word => word.length > 0).length,
          hasImages: false,
          hasTables: false,
          hasFormFields: false
        })),
        headings: [],
        paragraphs: [],
        tables: [],
        images: [],
        formFields: []
      },
      contentAnalysis: {
        language: 'en',
        readabilityScore: 50,
        avgWordsPerPage: pages.length > 0 ? Math.round(text.split(/\s+/).length / pages.length) : 0,
        totalWordCount: text.split(/\s+/).filter((word: string) => word.length > 0).length,
        topicKeywords: [],
        documentType: 'General Document',
        hasFootnotes: false,
        hasReferences: false,
        hasBibliography: false
      }
    }
  }

  private formatPDFForRAG(data: any, metadata: PDFMetadata): string {
    let content = '**📄 PDF Document Analysis**\n\n'
    content += `**Document Information:**\n`
    content += `- Title: ${metadata.documentInfo.title || 'Untitled'}\n`
    content += `- Author: ${metadata.documentInfo.author || 'Unknown'}\n`
    content += `- Pages: ${metadata.documentInfo.pageCount}\n\n`
    content += `**Full Document Content:**\n${data.text}`
    return content
  }
}

export const fileProcessor = new FileProcessor()

