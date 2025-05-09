const weaviate = require('weaviate-client');

class WeaviateService {

    constructor() {
        this.weaviateURL = process.env.WEAVIATE_URL;
        this.weaviateApiKey = process.env.WEAVIATE_API_KEY;
        this.openAIApi = process.env.OPENAI_API_KEY;
    }

    async initializeClient() {
        this.client = await weaviate.connectToWeaviateCloud(
            this.weaviateURL,
            {
                authCredentials: new weaviate.ApiKey(this.weaviateApiKey),
                headers: {
                    'X-OpenAI-Api-Key': this.openAIApi,
                }
            });
        return await this.client.isReady();
    }

    async deleteCollection(name) {
        await this.client.collections.delete(name);
    }

    async createCollection(name) {
        await this.client.collections.create({
            name: name,
            vectorizers: weaviate.configure.vectorizer.text2VecOpenAI(),
            generative: weaviate.configure.generative.openAI()
        });
    }

    async collectionExists(name) {
        return await this.client.collections.exists(name);
    }

    async insertDocuments(collectionName, docs) {
        const collection = this.client.collections.get(collectionName);
        const result = await collection.data.insertMany(docs);
        return result;
    }

    async generateAnswer(collectionName, question, limits) {
        const collection = this.client.collections.get(collectionName);
        const response = await collection.generate.nearText(
            question,
            {
                groupedTask: question,
            },
            {
                limit: limits
            }
        );
        return response;
    }

    closeConnection()
    {
        this.client.close();
    }
}

module.exports = WeaviateService;