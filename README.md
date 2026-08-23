# Visorseo - Chrome Extension 🚀

Visorseo is a free, lightweight Google Chrome extension that allows SEO professionals and developers to instantly view key metrics for any domain.

## 🎯 Key Features
* **Real-time Metrics:** Get DA, PA, DR, backlinks, and organic traffic with a single click.
* **Anti-bandwidth consumption (Smart Cache):** Retrieved data is stored locally for 24 hours. If you switch between tabs, the extension loads the data instantly without querying the server again.
* **Modern Design:** Clean interface with visual gauges (Spam Score) and color-coded indicators to quickly assess the domain’s health.
* **Separate Architecture:** Lightweight frontend in the extension and a secure backend hosted on Vercel.

## 🏗️ Project Architecture
The project is divided into two main parts:
1. **/extension:** Contains the source code for the Chrome extension (HTML, CSS, pure JS).
2. **/api (Vercel):** An endpoint that acts as a bridge to securely query RapidAPI, hiding access keys from the end user.

## 🛠️ Technologies Used
* **Frontend:** Vanilla JavaScript, HTML5, CSS3, Chrome extension API (`chrome.storage.local`, `chrome.tabs`).
* **Backend:** Serverless Functions (Vercel).
* **Data Providers:** RapidAPI (consolidated metrics from Moz and Ahrefs).

## 📄 License
This project is free to use.
