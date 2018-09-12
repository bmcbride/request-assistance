request-assistance
========
A simple, responsive web application for crowdsourcing requests for assistance. Designed for post-disaster rescue & relief assistance, this project is meant to make it easier for volunteers to collect structured information from those in immediate need.

### Demo:
https://bmcbride.github.io/request-assistance/

### Features:
* Responsive web form with browser geolocation and reverse geocoding capabilities.
* Optimized for mobile and can also be embedded in a website, blog, social media, etc.
* Form responses post to a Google Sheet with photo uploads to Google Drive for immediate collaboration.
* Easy to fork, modify, deploy, and host for free!
* Built on the open source [UIkit](https://getuikit.com/) front-end framework and powered by [Google Maps](https://developers.google.com/maps/).

### How it works:
* Fork this repo and edit the form in `index.html`. Please use your own Google Maps API key.
* Create a new Google Sheet and add a header row to match the fields in your form.
* Copy the ID of the Sheet, which will be used later.
* Copy the code from `Code.gs` into a new [Google Apps Script](https://developers.google.com/apps-script/) file in your Google Drive account.
* Modify the Apps Script code, specifying your Sheet ID from the previous step on line 1 and the ID of a Drive folder to store photos on line 2. Save and deploy as a Web App (Publish -> Deploy as web app...). Execute the app as you and set the "Who has access to the app" setting to Anyone, even anonymous.
* After publishing (and authorizing), copy the web app URL and paste it into the `app.config.url` value on line 3 of the `assets/js/app.js` file.

### Screenshots
![Mobile](https://bmcbride.github.io/request-assistance/screenshots.png)
