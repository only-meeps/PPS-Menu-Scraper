# PPS Menu Scraper

## What is this?
This is a web scraper I created to take the data from the Portland Public Schools nutrition website (https://www.pps.net/departments/nutrition-services/menus) and parse the pdf files cleanly into json files that are easier for computers to interpret. Uses Axios to request the nutrition services webpage, uses cheerio to find the correct PDF files, then parses the PDF files and reads them. This script can get a bit broken when they add new menu options or change the format of the menus, but I will try to stay on top of it.

## Usage
Download a release from the releases tab, then run node main.js from your console.

## AI Usage
AI was not used to write a significant amount of the primary JS file, though it may have been used for research, bug fixing, or repetitive tasks (Like finding new menu options from reading the logs, though most of the time I do this).

