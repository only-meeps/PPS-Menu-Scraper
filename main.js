import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import { Readable } from 'stream';
import { finished } from 'stream/promises';
import { PDFParse } from 'pdf-parse';
var fileLinks = [];

const months = ["january", "febuary", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const keywords = ["hs", "breakfast-august-september"];
const menuOptions = [
    "HoneyCheerios", "CreamCheeseFilledBagelBites", "MiniPancakes", "LiegeWaffle", "CinnamonToastCrunch", "VanillaCreamFilledBreadstick",
    "AppleCinnamonMuffin", "FrenchToastSticks", "CinnamonRoll", "Croissant", "NoSchoolforStudents", "OrangeChickenwithBrownRice",
    "CheesyGarlicTwists", "ChickentenderswithOnionRings", "BirriaandCheesePupusaBeanandCheesePupusa", "ChickenFilletSandwich",
    "BuffaloChicken Bites", "Korean-StyleChickenwithBrownRice", "CheeseburgerHamburger", "SpicySichuanChickenwithBrownRice",
    "ChickenDumplings", "LemonChickenwithBrownRice", "OvenFriedRicewithTofu", "BurritoBar", "Pizza"
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
async function parseFile(url) {

    const parser = new PDFParse({ url: url });
    const result = await parser.getText();
    return result.text;

}
function createFlexibleRegex(targetString) {
    const escaped = targetString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = escaped
        .split(/\s+/)
        .map(word => word.split('').join('\\s*'))
        .join('\\s+');

    return new RegExp(pattern, 'i');
}
function cleanFile(txt, year, startMonth) {
    var lunchInOrder = [];
    var daysInOrder = [];
    var cleantxt = txt.replaceAll('Vegetarian option - may contain cheese and/or egg1% plain milk, fat free plain milk, 1/2 cup of fruit and a 1/2 cup of 100% juice are offered daily with each breakfast. Students MUST choose at least ½ cup of fruit.Menu is subject to change. This institution is an equal opportunity provider.', '');

    cleantxt = cleantxt
        .replace(/--.*?--/g, '')
        .replace(/\d+\/\d+\/\d+/g, '')
        .replace(/August\/September\s+\d+/gi, '')
        .replace('-- 1 of 1 --', '')
        .replace(/[cheese, pepperoni, specialty]\s+pizza/gi, '')
        .replace(/burrito\s+bar/gi);
    var dayRegex = /(\d+)/g;
    var match;

    var prev = -1;
    startMonth = months.indexOf(startMonth.toLowerCase()) + 1;
    console.log(year);
    while ((match = dayRegex.exec(cleantxt)) !== null) {
        if (prev == -1) {
            prev = match[0];
        }
        if (parseInt(match[0]) < prev) {
            if (startMonth < months.length) {
                startMonth++;
            }
            else {
                startMonth = 0;
            }
        }
        daysInOrder.push(startMonth + "/" + match[0].toString() + "/" + year);
        prev = match[1];
    }
    console.log(daysInOrder);

    while (true) {
        var lowIDX = Infinity;
        var lowIDXMO = -1;

        for (var i = 0; i < menuOptions.length; i++) {
            var match = createFlexibleRegex(menuOptions[i]).exec(cleantxt);
            if (match !== null && match.index < lowIDX) {
                lowIDX = match.index;
                lowIDXMO = i;
            }
        }
        if (lowIDXMO === -1) {
            break;
        }

        console.log(createFlexibleRegex(menuOptions[lowIDXMO]).toString());
        cleantxt = cleantxt.replace(createFlexibleRegex(menuOptions[lowIDXMO]), '');
        lunchInOrder.push({ day: daysInOrder[lunchInOrder.length], option: menuOptions[lowIDXMO] });
    }
    if (daysInOrder.length != lunchInOrder.length) {
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

    for (var i = 0; i < links.length; i++) {
        if (links[i].label != null && (months.some(month => links[i].label.toLowerCase().includes(month)) && keywords.some(keyword => links[i].label.toLowerCase().includes(keyword)) && !excludes.some(exclude => links[i].label.toLowerCase().includes(exclude)))) {
            console.log(links[i].label);
            const parsedFile = await parseFile("https://www.pps.net" + links[i].href);
            console.log("\n\n----------Parsed File Start----------");
            console.log(parsedFile);
            console.log("-----------Parsed File End-----------");
            var regexYear = /(\d\d\d\d)/i;
            var regexMonth = new RegExp(months.join('|'), 'i');
            var match = links[i].label.match(regexMonth);
            console.log(match[0].toString());
            fs.writeFile(links[i].label.replaceAll('.pdf', '.txt'), cleanFile(parsedFile.replaceAll('\n', '').replaceAll('\r', '').toString(), regexYear.exec(links[i].label)[0], match[0]), 'utf8', (err) => {
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