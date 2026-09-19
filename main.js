import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import { Readable } from 'stream';
import { finished } from 'stream/promises';
import { PDFParse } from 'pdf-parse';
var fileLinks = [];

const months = ["january", "febuary", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const excludesFinal = ["--  of  --", "Updated: ", "Breakfast Menu -", "/", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
const monthDays = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31"];
const keywords = ["hs", "breakfast-august-september"];
const menuOptions = [
    "Honey Cheerios", "Cream CheeseFilled Bagel Bites", "Mini Pancakes", "Liege Waffle", "Cinnamon Toast Crunch", "Vanilla CreamFilled Breadstick",
    "Apple Cinnamon Muffin", "French Toast Sticks", "Cinnamon Roll", "Croissant", "No School for Students", "Orange Chicken with Brown Rice",
    "Cheesy Garlic Twists", "Chicken tenders with Onion Rings", "Birria and Cheese Pupusa Bean and Cheese Pupusa", "Chicken Fillet Sandwich",
    "Buffalo Chicken Bites", "Korean-Style Chicken with Brown Rice", "CheeseburgerHamburger", "Spicy Sichuan Chicken with Brown Rice",
    "Chicken Dumplings", "Lemon Chicken with Brown Rice", "Oven Fried Rice with Tofu"
]
const excludes = ["access"];
const downloadedFilePaths = [];

async function downloadFile(url, fileName) {
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.statusText}`);
  }

  const destination = fs.createWriteStream(fileName);
  const bodyStream = Readable.fromWeb(response.body);
  await finished(bodyStream.pipe(destination));
  
  console.log(`Download complete: ${fileName}`);
}

async function parseFile(url){

    const parser = new PDFParse({ url: url });
	const result = await parser.getText();
	return result.text;

}
function cleanFile(txt){
    var lunchInOrder = [];
    var daysInOrder = [];
    var cleantxt = txt.replaceAll('Vegetarian option - may contain cheese and/or egg1% plain milk, fat free plain milk, 1/2 cup of fruit and a 1/2 cup of 100% juice are offered daily with each breakfast. Students MUST choose at least ½ cup of fruit.Menu is subject to change. This institution is an equal opportunity provider.', '');
    cleantxt = cleantxt
    .replace(/--.*?--/g, '') 
    .replace(/\d+\/\d+\/\d+/g, '')
    .replace(/August\/September\s+\d+/gi, '')
    .replace('-- 1 of 1 --', '');
    var dayRegex = /(\d+)/g;
    var match;
    
    while ((match = dayRegex.exec(cleantxt)) !== null) {
        daysInOrder.push(match[1]);
    }
    console.log(daysInOrder);
    
    for(var i = 0; i < excludesFinal.length; i++){
        cleantxt = cleantxt.replaceAll(excludesFinal[i], '');
    }
    for(var i = 0; i < months.length; i++){
        cleantxt = cleantxt.toLowerCase().replaceAll(months[i], '');
    }

    while(1 == 1){
        var lowIDX = Infinity;
        var lowIDXMO = Infinity;
        for(var i = 0; i < menuOptions.length; i++){
            var idxOf = cleantxt.indexOf(menuOptions[i].toLowerCase());
            if(idxOf != -1 && idxOf < lowIDX){
                lowIDX = idxOf;
                lowIDXMO = i;
            }
        }
        if(lowIDX == Infinity){
            break;
        }
        cleantxt = cleantxt.replace(menuOptions[lowIDXMO].toLowerCase(), '');
        lunchInOrder.push({ day: daysInOrder[lunchInOrder.length] , option: menuOptions[lowIDXMO] });

    }
    if(daysInOrder.length != lunchInOrder.length){
        console.warn("Note: Days detected and Food detected lists are not the same length. Expect some issues!");
        console.log("days detected - " + daysInOrder.length);
        console.log("food detected - " + lunchInOrder.length);
        console.log("Recommended: Recheck the current menu options");
    }
    return JSON.stringify(lunchInOrder);
}
const Start = async () => {
    const url = 'https://www.pps.net/departments/nutrition-services/menus';
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const links = $('a').map((i, el) => {
    const $el = $(el);
    
    return {
        href: $el.attr('href') || null,
        label: $el.attr('data-file-name') || null
    };
    }).get();

    for(var i = 0; i < links.length; i++){
        if(links[i].label != null && (months.some(month => links[i].label.toLowerCase().includes(month)) && keywords.some(keyword => links[i].label.toLowerCase().includes(keyword)) && !excludes.some(exclude => links[i].label.toLowerCase().includes(exclude)))){
            console.log(links[i].label);
            const parsedFile = await parseFile("https://www.pps.net" + links[i].href);
            console.log("\n\n----------Parsed File Start----------");
            console.log(parsedFile);
            console.log("-----------Parsed File End-----------");
            fs.writeFile(links[i].label.replaceAll('.pdf', '.txt'), cleanFile(parsedFile.replaceAll('\n', '').replaceAll('\r', '').toString()), 'utf8', (err) => {
                if (err) {
                    console.error('Error writing to file:', err);
                    return;
                }
                console.log('File written successfully!');
            });
        }

    }
    
}
Start();