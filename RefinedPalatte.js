process.stdin.setEncoding("utf8");

const http = require('http');
const path = require("path");
const httpSuccessStatus = 200;
const express = require("express"); /* Accessing express module */
const app = express(); /* app is a request handler function */
const bodyParser = require("body-parser"); /* To handle post parameters */
const axios = require("axios");
const portNumber = process.env.PORT || 3000

require("dotenv").config({ path: path.resolve(__dirname, 'credentialsDontPost/.env') })  
const userName = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;
const dbName = process.env.MONGO_DB_NAME;
const collectionName = process.env.MONGO_COLLECTION;

const databaseAndCollection = {db: process.env.MONGO_DB_NAME, collection: process.env.MONGO_COLLECTION};

//necessary for project, mongoDB
const { MongoClient, ServerApiVersion } = require('mongodb');
async function main() {
    const uri = `mongodb+srv://${userName}:${password}@cluster0.yzl8plb.mongodb.net/?retryWrites=true&w=majority`;
    const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

    try {
        await client.connect();
        app.use(bodyParser.urlencoded({extended:false}));
        app.use(express.static(path.join(__dirname, 'files')));
        //app.use(express.static(style.css));

        const prompt = "Stop to shutdown the server: ";
        let fs = require("fs");

        app.set("views", path.resolve(__dirname, "templates"));
        app.set("view engine", "ejs");

        //index
        app.get("/", async (request, response) => {
            //get random cocktail
            const txt = await getRandDrink();
            const variables = {port: portNumber, myDrink: await getMyDrink(), randDrink: await getRandDrink(), drinkStats: await getDrinkStats()};
            response.render("index", variables);
        });

        app.post("/submittedReviews", async (request, response) => {
            let {name, favLiq, favCocktail, cocktailComments} =  request.body;

            const newReview = { name: name, favLiq: favLiq, favCocktail: favCocktail, cocktailComments: cocktailComments};
            await insertReview(client, databaseAndCollection, newReview);

            const results = await getReviews(client, databaseAndCollection);
            const variables = {dataSet: results}

            response.render("userLists", variables);
        });

        app.get("/submittedReviews", async (request, response) => {
            const results = await getReviews(client, databaseAndCollection);
            const variables = {dataSet: results}

            response.render("userLists", variables);
        });

        app.listen(portNumber); 
        console.log(`Web server is running at http://localhost:${portNumber}`);

        process.stdout.write(prompt);
        process.stdin.on("readable", function () {
        let dataInput = process.stdin.read();
        if (dataInput !== null) {
            let command = dataInput.trim();
            if (command === "stop") {
                console.log("Shutting down the server");
                process.exit(0);  /* exiting */
            } else {
                process.stdout.write(`Invalid command: ${command}\n`);
            }
            process.stdout.write(prompt);
            process.stdin.resume();
        }
        });
    } catch (e) {
        console.error(e);
    } finally {
        //await client.close();
    }
}

async function getMyDrink() {
    const options = {
        method: 'GET',
        url: 'https://the-cocktail-db.p.rapidapi.com/search.php',
        params: {s: 'moscow mule'},
        headers: {
          'X-RapidAPI-Key': 'ec791eee62mshd431cfec10e9542p15333bjsna13dfa6d51e9',
          'X-RapidAPI-Host': 'the-cocktail-db.p.rapidapi.com'
        }
      };
    var txt = "<h2>Most Elegant(and Biased) Choice: ";
  
    try {
      const response = await axios.request(options);
      //console.log(response.data.drinks[0].strDrink);
      txt += `${response.data.drinks[0].strDrink}</h2>`;
      txt += `<img src=${response.data.drinks[0].strDrinkThumb} width=100 height=100 id=sideimage>`
      txt += `<p><strong>Drink Type: </strong>${response.data.drinks[0].strCategory}</p>`
      txt += `<p><strong>Description: </strong>${response.data.drinks[0].strInstructions}</p><br>`
      return txt;
    } catch (error) {
      console.error(error);
    }
}

async function getRandDrink() {
    const options = {
      method: 'GET',
      url: 'https://the-cocktail-db.p.rapidapi.com/random.php',
      headers: {
        'X-RapidAPI-Key': 'ec791eee62mshd431cfec10e9542p15333bjsna13dfa6d51e9',
        'X-RapidAPI-Host': 'the-cocktail-db.p.rapidapi.com'
      }
    };
    var txt = "<h2>Random Choice: ";
  
    try {
      const response = await axios.request(options);
      //console.log(response.data.drinks[0].strDrink);
      txt += `${response.data.drinks[0].strDrink}</h2>`;
      txt += `<img src=${response.data.drinks[0].strDrinkThumb} width=100 height=100 id=sideimage>`
      txt += `<p><strong>Drink Type: </strong>${response.data.drinks[0].strCategory}</p>`
      txt += `<p><strong>Description: </strong>${response.data.drinks[0].strInstructions}</p><br>`
      return txt;
    } catch (error) {
      console.error(error);
    }
}

async function getDrinkStats() {
    const options = {
        method: 'GET',
        url: 'https://the-cocktail-db.p.rapidapi.com/popular.php',
        headers: {
          'X-RapidAPI-Key': 'ec791eee62mshd431cfec10e9542p15333bjsna13dfa6d51e9',
          'X-RapidAPI-Host': 'the-cocktail-db.p.rapidapi.com'
        }
      };

    try {
        const response = await axios.request(options);
        //console.log(response.data.drinks[0].strDrink);

        var txt = `<ol>`;
        for(var i = 0; i < 5; i++){
            //get top 5 results
            txt += `<li>${response.data.drinks[i].strDrink}</li>`;
            //txt += `<p><strong>Drink Type: </strong>${response.data.drinks[i].strCategory}</p>`
            //txt += `<p><strong>Description: </strong>${response.data.drinks[i].strInstructions}</p>`
        }
        txt += `</ol>`
        
        return txt;
    } catch (error) {
        console.error(error);
    }
}

async function insertReview(client, databaseAndCollection, newPerson) {
    const result = await client.db(databaseAndCollection.db).collection(databaseAndCollection.collection).insertOne(newPerson);
}

async function getReviews(client, databaseAndCollection) {
        let filter = {};
        const cursor = await client.db(databaseAndCollection.db)
        .collection(databaseAndCollection.collection)
        .find(filter);
        const result = await cursor.toArray();

        var txt = "";

        result.forEach(function(elem) {
            txt += `<h3>${elem.name}: ${elem.favLiq} Appreciator</h3>`;
            txt += `<p>Nectar of Gods: ${elem.favCocktail}</p>`;
            txt += `<p>${elem.cocktailComments}</p><br>`;
        });
        return txt;
}

main().catch(console.error);