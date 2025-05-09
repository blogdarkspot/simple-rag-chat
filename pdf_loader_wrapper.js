const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const { PDFLoader } = require('@langchain/community/document_loaders/fs/pdf');
const crypto = require('crypto');


class PDFLoaderWrapper {

  constructor(buffer) {
    this.buffer = buffer;
  }

  getDocumentName() {
    return 'PDF' + crypto.createHash('sha256').update(this.buffer).digest('hex').substring(0, 4);
  }

  async splitDocument() {
    const { Blob } = await import('fetch-blob');
    const blob = new Blob([this.buffer], { type: 'application/pdf' });
    const loader = new PDFLoader(blob, {
      parsedFormat: 'raw',
    });
    const docs = await loader.load();
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const splitDocs = await splitter.splitDocuments(docs);

    return splitDocs.map(doc => ({
      text: doc.pageContent,
    }));
  }

};

module.exports = PDFLoaderWrapper;