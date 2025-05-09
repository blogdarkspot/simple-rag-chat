const serverless = require("serverless-http");
const express = require("express");
const multer = require('multer');
const WeaviateService = require('./weaviate_service.js');
const PDFLoaderWrapper = require('./pdf_loader_wrapper.js');
const cors = require('cors');


const app = express();
app.use(cors({
  origin: '*', 
  methods: ['POST'], 
  allowedHeaders: ['Content-Type'] 
}));
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos PDF são permitidos!'), false);
    }
  }
});

app.post('/upload-pdf', upload.single('file'), async (req, res) => {
  const pdfBuffer = req.file?.buffer;
  if (!pdfBuffer) {
    console.error(JSON.stringify({
        level: 'warn',
        message: 'Nenhum PDF enviado ou formato inválido.'
      }));
    return res.status(400).json({error: 'Nenhum PDF enviado ou formato inválido.'});
  }
  try {
    const waviateClient = new WeaviateService();
    const pdfWrapper = new PDFLoaderWrapper(pdfBuffer);
    if(!await waviateClient.initializeClient())
    {
      console.error(JSON.stringify({
        level: 'warn',
        message: 'não foi possível inicializar o waviateClient'
      }));
      return res.status(503).json({error: 'waviate não disponível'});
    }

    const pdfCollectionKey = pdfWrapper.getDocumentName();

    if(!await waviateClient.collectionExists(pdfCollectionKey))
    {
      const chuncks = await pdfWrapper.splitDocument();
      if(chuncks.length == 0)
      {
        console.error(JSON.stringify({
            level: 'warn',
            message: 'não foi possível extrair texto do PDF ' + pdfCollectionKey
          }));
        return res.status(400).json({error: 'não foi possivel extrair o texto do arquivo PDF'});
      }

      await waviateClient.createCollection(pdfCollectionKey);
      const result = await waviateClient.insertDocuments(pdfCollectionKey, chuncks);

      if(result.hasErrors)
      {
        console.error(JSON.stringify({
            level: 'warn',
            message: 'não foi possível inserir o arquivo no banco ' + pdfCollectionKey,
            error: result.errors
          }));
        return res.status(503).json({error: 'waviate não disponível'});
      }
    }
    return res.json({ message: 'PDF processado com sucesso!', collectionKey: pdfCollectionKey});

  }catch(e)
  {
      console.error(JSON.stringify({
        level: 'error',
        message: 'expcetion ao processar o PDF',
        error: e.message || e.toString(),
        stack: e.stack
      }));
      return  res.status(400).json({error: 'Erro inesperado no processamento do PDF'});
  }
});

app.post('/send-question', async (req, res) => {
  const { question, collection } = req.body;
  if (!question || !collection) {
    console.error(JSON.stringify({
      level: 'warn',
      message: 'Requisição inválida',
      details: { question, collection }
    }));
    return res.status(400).json({
      error: 'Requisição inválida. Os campos "question" e "collection" são obrigatórios.'
    });
  }

  try {
    const waviateClient = new WeaviateService();

    const connected = await waviateClient.initializeClient();
    if (!connected) {
      console.error(JSON.stringify({
        level: 'error',
        message: 'Falha ao conectar no Weaviate',
        collection
      }));
      return res.status(500).json({ error: 'Erro ao conectar no serviço Weaviate.' });
    }
    if(!await waviateClient.collectionExists(collection))
    {
        console.error(JSON.stringify({
          level: 'error',
          message: 'collection não existe',
          collection
        }));
      return res.status(500).json({ error: 'Collection não existe', collection });
    }

    const result = await waviateClient.generateAnswer(collection, question, 1);
    if (result.hasErrors) {
      console.error(JSON.stringify({
        level: 'error',
        message: 'Erro ao gerar resposta',
        details: result.errors || 'desconhecido'
      }));
      return res.status(500).json({ error: 'Erro ao gerar a resposta.' });
    }
    return res
      
      .json({
        answer: result.generative.text,
      }); 
  } catch (e) {
    console.error(JSON.stringify({
      level: 'error',
      message: 'Erro inesperado no processamento da pergunta',
      error: e.message || e.toString(),
      stack: e.stack
    }));
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

app.use((req, res, next) => {
  return res.status(404).json({
    error: "Not Found",
  });
});

exports.handler = serverless(app);

